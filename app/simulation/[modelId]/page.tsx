'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useModels, useExpenses, useInvestments } from '@/hooks/use-database';
import { ModelEditSidebar } from '@/components/model-edit-sidebar';
import { YearDetailSidebar } from '@/components/year-detail-sidebar';
import { OptimizationResultsDialog } from '@/components/optimization-results-dialog';
import { generateProjections, getProjectionStats, applyYearAdjustments, optimizeCollectionFees, SimulationParams, YearProjection, OptimizationResult } from '@/lib/simulation';
import { SimulationInvestment } from '@/components/add-simulation-investment-dialog';
import { Model } from '@/lib/db-schemas';
import { calculateCompoundInterestEarned } from '@/lib/utils';
import {
  SimulationHeader,
  SimulationStats,
  SimulationTabs,
} from '@/components/simulation';

interface LiquidationRecord {
  investmentId: string;
  investmentName: string;
  startYear: number;
  liquidationYear: number;
  originalAmount: number;
  liquidatedAmount: number;
  yearsHeld: number;
  interestEarned: number;
  penaltyApplied: number;
  isEarlyLiquidation: boolean;
}

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.modelId as string;

  const { getModel, updateModel } = useModels();
  const { expenses } = useExpenses(modelId);
  const { investments } = useInvestments(modelId);

  const [model, setModel] = useState<Model | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams | null>(null);
  const [isModelEditOpen, setIsModelEditOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<YearProjection | null>(null);
  const [yearAdjustments, setYearAdjustments] = useState<Record<number, any>>({});
  const [simulationInvestments, setSimulationInvestments] = useState<Record<number, SimulationInvestment[]>>({});
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load model data
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const modelData = await getModel(modelId);
        if (modelData) {
          setModel(modelData);
          // Initialize simulation params with model data
          const { id, createdAt, updatedAt, ...simParams } = modelData;
          setSimulationParams(simParams);
        }
      } catch (error) {
        console.error('Failed to load model:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, [modelId, getModel]);


  // Function to apply simulation investments to projections
  const applySimulationInvestments = (projections: YearProjection[], simulationInvestments: Record<number, SimulationInvestment[]>) => {
    const updatedProjections = [...projections];

    // Track ongoing investments and their compound interest
    const ongoingInvestments: Array<{
      investment: SimulationInvestment;
      startYear: number;
      currentValue: number;
      isLiquidated: boolean;
      liquidationYear?: number;
    }> = [];

    // Initialize ongoing investments
    Object.entries(simulationInvestments).forEach(([yearStr, investments]) => {
      const year = parseInt(yearStr);
      investments.forEach(investment => {
        ongoingInvestments.push({
          investment,
          startYear: year,
          currentValue: investment.amountInvested,
          isLiquidated: investment.isLiquidated || false,
          liquidationYear: investment.liquidationYear
        });
      });
    });

          // Calculate compound interest and liquidations for each year
      updatedProjections.forEach((projection, index) => {
        const year = projection.year;
        let yearInvestmentLiquidations: LiquidationRecord[] = [];
        let yearInvestmentInterest = 0;
        let yearInvestmentOutflow = 0;

        // Initialize liquidations from existing projection
        if (Array.isArray(projection.investmentLiquidations)) {
          yearInvestmentLiquidations = [...projection.investmentLiquidations];
        }

              // Process ongoing investments for this year
        ongoingInvestments.forEach(ongoing => {
          if (ongoing.startYear <= year) {
            // Calculate compound interest for this year (only for non-liquidated investments)
            if (!ongoing.isLiquidated) {
              const yearsHeld = year - ongoing.startYear;
              if (yearsHeld > 0) {
                const compoundInterest = calculateCompoundInterestEarned(
                  ongoing.investment.amountInvested,
                  ongoing.investment.annualInterestRate,
                  yearsHeld
                );
                yearInvestmentInterest += compoundInterest;
                ongoing.currentValue = ongoing.investment.amountInvested + compoundInterest;
              }

              // Check if investment matures this year (automatic liquidation)
              if (year === ongoing.startYear + ongoing.investment.terms) {
                ongoing.isLiquidated = true;
                ongoing.liquidationYear = year;
                // Use the calculated current value for this year
                const maturityValue = ongoing.investment.amountInvested *
                  Math.pow(1 + ongoing.investment.annualInterestRate / 100, ongoing.investment.terms);
                
                // Add automatic maturity liquidation record
                yearInvestmentLiquidations.push({
                  investmentId: `auto-${ongoing.investment.id}-${year}`,
                  investmentName: ongoing.investment.strategyName || `${ongoing.investment.investmentType} Investment`,
                  startYear: ongoing.startYear,
                  liquidationYear: year,
                  originalAmount: ongoing.investment.amountInvested,
                  liquidatedAmount: maturityValue,
                  yearsHeld: ongoing.investment.terms,
                  interestEarned: maturityValue - ongoing.investment.amountInvested,
                  penaltyApplied: 0,
                  isEarlyLiquidation: false
                });
              }
            } else if (ongoing.liquidationYear === year) {
              // This investment was liquidated this year - add to liquidations
              const liquidationAmount = ongoing.investment.liquidatedAmount || ongoing.currentValue;
              
              // Add manual liquidation record
              yearInvestmentLiquidations.push({
                investmentId: ongoing.investment.id,
                investmentName: ongoing.investment.strategyName || `${ongoing.investment.investmentType} Investment`,
                startYear: ongoing.startYear,
                liquidationYear: year,
                originalAmount: ongoing.investment.amountInvested,
                liquidatedAmount: liquidationAmount,
                yearsHeld: year - ongoing.startYear,
                interestEarned: ongoing.investment.liquidatedAmount ? ongoing.investment.liquidatedAmount - ongoing.investment.amountInvested : 0,
                penaltyApplied: 0,
                isEarlyLiquidation: year - ongoing.startYear < ongoing.investment.terms
              });
            }
          }
        });

        // Add manual liquidations from year adjustments
        const yearAdjustment = yearAdjustments[year];
        if (yearAdjustment?.investmentLiquidations) {
          // Handle array of liquidation objects
          yearAdjustment.investmentLiquidations.forEach((liquidation: LiquidationRecord) => {
            yearInvestmentLiquidations.push(liquidation);
          });
        }

      // Calculate investment outflow for this year (new investments made)
      const yearInvestments = simulationInvestments[year] || [];
      yearInvestmentOutflow = yearInvestments.reduce((sum, inv) => sum + inv.amountInvested, 0);

              // Update the projection with investment details
        updatedProjections[index] = {
          ...projection,
          investmentLiquidations: yearInvestmentLiquidations,
          simulationInvestmentDetails: {
            ongoingInvestments: ongoingInvestments.filter(o => !o.isLiquidated && o.startYear <= year),
            liquidatedInvestments: ongoingInvestments.filter(o => o.isLiquidated && o.liquidationYear === year),
            totalInterest: yearInvestmentInterest
          }
        };

              // Calculate total liquidations for closing balance
        const totalLiquidations = yearInvestmentLiquidations.reduce((sum, liquidation) => sum + liquidation.liquidatedAmount, 0);
        
        // Update closing balance (subtract investment outflow, add liquidations)
        updatedProjections[index].closingBalance =
          projection.openingBalance +
          projection.collections +
          (projection.loansTaken || 0) +
          totalLiquidations -
          yearInvestmentOutflow -
          projection.expenses -
          projection.safetyNet -
          (projection.loanPayments || 0);
    });

    // Update opening balances for subsequent years
    for (let i = 1; i < updatedProjections.length; i++) {
      updatedProjections[i] = {
        ...updatedProjections[i],
        openingBalance: updatedProjections[i - 1].closingBalance
      };
    }

    return updatedProjections;
  };

  // Generate projections when params, expenses, investments, or simulation investments change
  const projections = useMemo(() => {
    if (!simulationParams || !expenses) return [];
    let baseProjections = generateProjections(simulationParams, expenses, investments);

    // Apply year adjustments and recalculate subsequent years
    if (Object.keys(yearAdjustments).length > 0) {
      baseProjections = applyYearAdjustments(baseProjections, yearAdjustments);
    }

    // Apply simulation investments to projections
    if (Object.keys(simulationInvestments).length > 0) {
      baseProjections = applySimulationInvestments(baseProjections, simulationInvestments);
    }

    return baseProjections;
  }, [simulationParams, expenses, investments, yearAdjustments, simulationInvestments]);

  // Calculate stats
  const stats = useMemo(() => {
    if (projections.length === 0) return null;
    return getProjectionStats(projections);
  }, [projections]);

  // Update selectedYear when projections change to ensure sidebar shows current data
  useEffect(() => {
    if (selectedYear && projections.length > 0) {
      const updatedProjection = projections.find(p => p.year === selectedYear.year);
      if (updatedProjection && updatedProjection !== selectedYear) {
        setSelectedYear(updatedProjection);
      }
    }
  }, [projections, selectedYear]);

  // Calculate large expense, loan, and investment stats
  const extendedStats = useMemo(() => {
    if (projections.length === 0 || !simulationParams) return null;

    let totalLargeExpenses = 0;
    let largeExpenseCount = 0;
    let totalLoanAmount = 0;
    let totalLoanPayments = 0;
    let yearsWithLoans = 0;
    let yearsWithLoanPayments = 0;
    let totalInvestmentLiquidations = 0;
    let yearsWithInvestmentLiquidations = 0;

    projections.forEach(projection => {
      // Count large expenses
      projection.expenseDetails.forEach(detail => {
        if (detail.loanAmount > 0) {
          totalLargeExpenses += detail.inflatedCost;
          largeExpenseCount++;
        }
      });

      // Count loan activity
      if ((projection.loansTaken || 0) > 0) {
        totalLoanAmount += projection.loansTaken || 0;
        yearsWithLoans++;
      }

      if ((projection.loanPayments || 0) > 0) {
        totalLoanPayments += projection.loanPayments || 0;
        yearsWithLoanPayments++;
      }

      // Count investment liquidations
      if (Array.isArray(projection.investmentLiquidations)) {
        const yearLiquidations = projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0);
        if (yearLiquidations > 0) {
          totalInvestmentLiquidations += yearLiquidations;
          yearsWithInvestmentLiquidations++;
        }
      } else if ((projection.investmentLiquidations || 0) > 0) {
        totalInvestmentLiquidations += projection.investmentLiquidations || 0;
        yearsWithInvestmentLiquidations++;
      }
    });

    return {
      totalLargeExpenses,
      largeExpenseCount,
      totalLoanAmount,
      totalLoanPayments,
      yearsWithLoans,
      yearsWithLoanPayments,
      averageLoanPerYear: yearsWithLoans > 0 ? totalLoanAmount / yearsWithLoans : 0,
      netLoanImpact: totalLoanAmount - totalLoanPayments,
      totalInvestmentLiquidations,
      yearsWithInvestmentLiquidations
    };
  }, [projections, simulationParams]);

  const handleModelEdit = (updatedParams: SimulationParams) => {
    setSimulationParams(updatedParams);
  };

  const handleYearAdjustment = (year: number, adjustments: any) => {
    setYearAdjustments(prev => ({
      ...prev,
      [year]: adjustments
    }));
  };

  const handleAddInvestment = (investment: SimulationInvestment) => {
    setSimulationInvestments(prev => ({
      ...prev,
      [investment.year]: [...(prev[investment.year] || []), investment]
    }));

    // Subtract the investment amount from the year's available funds
    // This will be reflected in the projections when they recalculate
    setYearAdjustments(prev => ({
      ...prev,
      [investment.year]: {
        ...prev[investment.year],
        // Note: The actual subtraction happens in the projection calculation
        // This is just to track that an adjustment was made
      }
    }));
  };

  const handleRemoveInvestment = (year: number, investmentIndex: number) => {
    setSimulationInvestments(prev => {
      const yearInvestments = prev[year] || [];
      const updatedInvestments = yearInvestments.filter((_, index) => index !== investmentIndex);

      if (updatedInvestments.length === 0) {
        const { [year]: removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [year]: updatedInvestments
      };
    });
  };

  const handleLiquidateInvestment = (investment: SimulationInvestment, startYear: number, currentYear: number) => {
    const yearsHeld = currentYear - startYear;

    // Check liquidation restrictions
    if (yearsHeld === 0) {
      alert('Cannot liquidate an investment in the year it was made.');
      return;
    }

    if (yearsHeld === investment.terms) {
      alert('Investment will mature automatically this year. No need to liquidate early.');
      return;
    }

    // Calculate liquidation amount with compound interest
    let liquidationAmount = investment.amountInvested;
    // return 
    // Calculate compound interest earned up to the liquidation year
    const compoundInterest = calculateCompoundInterestEarned(
      investment.amountInvested,
      investment.annualInterestRate,
      yearsHeld
    );
    liquidationAmount = investment.amountInvested + compoundInterest;
    console.log(`liquidationAmount: ${liquidationAmount}`);

    // Apply early withdrawal penalty if applicable
    if (yearsHeld < investment.terms) {
      const daysHeld = yearsHeld * 365;
      const penaltyRate = compoundInterest / daysHeld;
      const penalty = Math.max(
        investment.earlyWithdrawalMinPenalty || 0,
        penaltyRate * (investment.earlyWithdrawalPenaltyDays || 0)
      )
      liquidationAmount = liquidationAmount - penalty;
      console.log(`liquidationAmount after penalty: ${liquidationAmount}`);
    }

    // Add liquidation to the current year's adjustments
    setYearAdjustments(prev => {
      const currentYearAdjustments = prev[currentYear] || {};
      const existingLiquidations: LiquidationRecord[] = currentYearAdjustments.investmentLiquidations || [];

      // Create liquidation object
      const liquidationRecord: LiquidationRecord = {
        investmentId: investment.id,
        investmentName: investment.strategyName || `${investment.investmentType} Investment`,
        startYear: startYear,
        liquidationYear: currentYear,
        originalAmount: investment.amountInvested,
        liquidatedAmount: liquidationAmount,
        yearsHeld: yearsHeld,
        interestEarned: compoundInterest,
        penaltyApplied: yearsHeld < investment.terms ? liquidationAmount - (investment.amountInvested + compoundInterest) : 0,
        isEarlyLiquidation: yearsHeld < investment.terms
      };

      return {
        ...prev,
        [currentYear]: {
          ...currentYearAdjustments,
          investmentLiquidations: [...existingLiquidations.filter(l => l.investmentId !== investment.id), liquidationRecord]
        }
      }
    });

    // Mark the investment as liquidated instead of removing it
    setSimulationInvestments(prev => {
      const yearInvestments = prev[startYear] || [];
      const updatedInvestments = yearInvestments.map(inv =>
        inv.id === investment.id
          ? { ...inv, isLiquidated: true, liquidationYear: currentYear, liquidatedAmount: liquidationAmount }
          : inv
      );

      return {
        ...prev,
        [startYear]: updatedInvestments
      };
    });
  };

  const handleUnliquidateInvestment = (investment: SimulationInvestment, startYear: number) => {
    // Remove the liquidation from the year's adjustments
    if (investment.liquidationYear !== undefined) {
      const liquidationYear = investment.liquidationYear;

      setYearAdjustments(prev => {
        const currentYearAdjustments = prev[liquidationYear] || {};
        const existingLiquidations = currentYearAdjustments.investmentLiquidations || [];

        // Remove the specific liquidation record for this investment
        const updatedLiquidations = existingLiquidations.filter(
          (liquidation: any) => liquidation.investmentId !== investment.id
        );

        return {
          ...prev,
          [liquidationYear]: {
            ...currentYearAdjustments,
            investmentLiquidations: updatedLiquidations
          }
        };
      });
    }

    // Mark the investment as not liquidated
    setSimulationInvestments(prev => {
      const yearInvestments = prev[startYear] || [];
      const updatedInvestments = yearInvestments.map(inv =>
        inv === investment
          ? {
            ...inv,
            isLiquidated: false,
            liquidationYear: undefined,
            liquidatedAmount: undefined
          }
          : inv
      );

      return {
        ...prev,
        [startYear]: updatedInvestments
      };
    });
  };

  const handleOptimizeFees = async () => {
    if (!simulationParams || !expenses) return;

    setIsOptimizing(true);
    try {
      const result = optimizeCollectionFees(simulationParams, expenses);
      setOptimizationResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = (optimizedParams: SimulationParams) => {
    if (!optimizationResult) return;

    // If there are yearly adjustments, convert them to year adjustments format
    if (optimizationResult.hasYearlyAdjustments) {
      const newYearAdjustments: Record<number, any> = {};

      optimizationResult.yearlyAdjustments.forEach(adjustment => {
        // Calculate the collections for this year based on the optimized fee
        const annualCollections = adjustment.optimizedFee * 12 * (simulationParams?.housingUnits || 1);
        newYearAdjustments[adjustment.year] = {
          collections: annualCollections
        };
      });

      setYearAdjustments(newYearAdjustments);
    } else {
      // For flat fee optimization, update the simulation params
      setSimulationParams(optimizedParams);
      setYearAdjustments({}); // Clear year adjustments
    }

    setOptimizationResult(null);
  };

  const handleSaveModel = async () => {
    if (!model || !simulationParams) return;

    try {
      await updateModel(model.id, simulationParams);
      // Update local model state
      setModel({ ...model, ...simulationParams });
    } catch (error) {
      console.error('Failed to save model:', error);
      alert('Failed to save model changes. Please try again.');
    }
  };

  const handleResetChanges = () => {
    if (!model) return;
    const { id, createdAt, updatedAt, ...simParams } = model;
    setSimulationParams(simParams);
    setYearAdjustments({}); // Clear any year-specific adjustments
    setSimulationInvestments({}); // Clear simulation investments
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!model || !simulationParams) return false;

    // Compare simulation params with original model
    const { id, createdAt, updatedAt, ...originalParams } = model;
    const hasModelChanges = JSON.stringify(originalParams) !== JSON.stringify(simulationParams);
    const hasYearAdjustments = Object.keys(yearAdjustments).length > 0;
    const hasSimulationInvestments = Object.keys(simulationInvestments).length > 0;

    return hasModelChanges || hasYearAdjustments || hasSimulationInvestments;
  }, [model, simulationParams, yearAdjustments, simulationInvestments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading simulation...</div>
      </div>
    );
  }

  if (!model || !simulationParams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Model not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimulationHeader
        model={model}
        hasUnsavedChanges={hasUnsavedChanges}
        isOptimizing={isOptimizing}
        onBack={() => router.back()}
        onResetChanges={handleResetChanges}
        onSaveModel={handleSaveModel}
        onOptimizeFees={handleOptimizeFees}
        onEditModel={() => setIsModelEditOpen(true)}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SimulationStats
          stats={stats}
          extendedStats={extendedStats}
          simulationParams={simulationParams}
        />

        <SimulationTabs
          projections={projections}
          stats={stats}
          simulationParams={simulationParams}
          simulationInvestments={simulationInvestments}
          onYearClick={setSelectedYear}
          onRemoveInvestment={handleRemoveInvestment}
          onLiquidateInvestment={handleLiquidateInvestment}
          onUnliquidateInvestment={handleUnliquidateInvestment}
        />
      </main>

      {/* Sidebars */}
      <ModelEditSidebar
        open={isModelEditOpen}
        onOpenChange={setIsModelEditOpen}
        model={simulationParams}
        onSave={handleModelEdit}
      />

      {selectedYear && (
        <YearDetailSidebar
          open={!!selectedYear}
          onOpenChange={(open: boolean) => !open && setSelectedYear(null)}
          yearProjection={selectedYear}
          model={simulationParams}
          onYearAdjustment={handleYearAdjustment}
          onAddInvestment={handleAddInvestment}
          onLiquidateInvestment={handleLiquidateInvestment}
          availableYears={projections.map(p => p.year)}
          onYearChange={(year) => {
            const newYearProjection = projections.find(p => p.year === year);
            if (newYearProjection) {
              setSelectedYear(newYearProjection);
            }
          }}
        />
      )}

      <OptimizationResultsDialog
        open={!!optimizationResult}
        onOpenChange={(open) => !open && setOptimizationResult(null)}
        result={optimizationResult}
        onApply={handleApplyOptimization}
      />
    </div>
  );
}
