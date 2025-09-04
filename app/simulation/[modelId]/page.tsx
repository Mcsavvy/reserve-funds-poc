'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useModels, useExpenses, useInvestments } from '@/hooks/use-database';
import { useSimulationVersions } from '@/hooks/use-simulation-versions';
import { SimulationEditSidebar } from '@/components/simulation-edit-sidebar';
import { YearDetailSidebar } from '@/components/year-detail-sidebar';
import { OptimizationResultsDialog } from '@/components/optimization-results-dialog';
import { VersionManagementDialog } from '@/components/version-management-dialog';
import { 
  generateProjections, getProjectionStats,
  applyYearAdjustments, optimizeCollectionFees,
  SimulationParams, YearProjection, OptimizationResult
} from '@/lib/simulation';
import { SimulationInvestment } from '@/components/add-simulation-investment-dialog';
import { Model, SimulationVersion } from '@/lib/db-schemas';
import { calculateCompoundInterestEarned } from '@/lib/utils';
import {
  SimulationHeader,
  SimulationStats,
  SimulationTabs,
} from '@/components/simulation';

export interface LiquidationRecord {
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
  const [currentVersionId, setCurrentVersionId] = useState<string | undefined>();
  const [isVersionManagementOpen, setIsVersionManagementOpen] = useState(false);
  const { 
    versions, 
    createVersion, 
    deleteVersion 
  } = useSimulationVersions(modelId);

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


  const applySimulationInvestments = useCallback((projections: YearProjection[], simulationInvestments: Record<number, SimulationInvestment[]>) => {
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
            const yearsHeld = year - ongoing.startYear;
            const isEarlyLiquidation = yearsHeld < ongoing.investment.terms;
            const interestEarned = ongoing.investment.liquidatedAmount ? ongoing.investment.liquidatedAmount - ongoing.investment.amountInvested : 0;
            // Calculate penalty based on liquidated amount vs expected amount
            const expectedAmount = ongoing.investment.amountInvested + interestEarned;
            const penaltyApplied = ongoing.investment.liquidatedAmount ? Math.max(0, expectedAmount - ongoing.investment.liquidatedAmount) : 0;
            
            yearInvestmentLiquidations.push({
              investmentId: ongoing.investment.id,
              investmentName: ongoing.investment.strategyName || `${ongoing.investment.investmentType} Investment`,
              startYear: ongoing.startYear,
              liquidationYear: year,
              originalAmount: ongoing.investment.amountInvested,
              liquidatedAmount: liquidationAmount,
              yearsHeld: yearsHeld,
              interestEarned: interestEarned,
              penaltyApplied: penaltyApplied,
              isEarlyLiquidation: isEarlyLiquidation
            });
          }
        }
      });

      // Add manual liquidations from year adjustments (but avoid duplicates)
      const yearAdjustment = yearAdjustments[year];
      if (yearAdjustment?.investmentLiquidations) {
        // Handle array of liquidation objects, but filter out those already processed above
        yearAdjustment.investmentLiquidations.forEach((liquidation: LiquidationRecord) => {
          // Check if this liquidation is already handled by the ongoing investment processing
          const alreadyProcessed = yearInvestmentLiquidations.some(existing => 
            existing.investmentId === liquidation.investmentId && 
            existing.liquidationYear === liquidation.liquidationYear
          );
          
          if (!alreadyProcessed) {
            yearInvestmentLiquidations.push(liquidation);
          } else {
            console.log(`Skipping duplicate liquidation for investment ${liquidation.investmentId} in year ${year}`);
          }
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
          ongoingInvestments: ongoingInvestments.filter(o => 
            o.startYear <= year && 
            (!o.isLiquidated || (o.liquidationYear && o.liquidationYear > year))
          ),
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
  }, [simulationInvestments, yearAdjustments]);

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

  const handleModelEdit = useCallback((updatedParams: SimulationParams) => {
    setSimulationParams(updatedParams);
  }, [setSimulationParams]);

  const handleYearAdjustment = useCallback((year: number, adjustments: any) => {
    setYearAdjustments(prev => ({
      ...prev,
      [year]: adjustments
    }));
  }, [setYearAdjustments]);

  const handleAddInvestment = useCallback((investment: SimulationInvestment) => {
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
  }, [setSimulationInvestments]);

  const handleRemoveInvestment = useCallback((year: number, investmentIndex: number) => {
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
  }, [setSimulationInvestments]);

  const handleLiquidateInvestment = useCallback((investment: SimulationInvestment, startYear: number, currentYear: number) => {
    // Check if investment is already liquidated
    if (investment.isLiquidated) {
      console.log(`Investment ${investment.id} is already liquidated. Skipping duplicate liquidation.`);
      return;
    }

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

    // Mark the investment as liquidated in simulationInvestments state
    // The applySimulationInvestments function will handle creating the liquidation record
    setSimulationInvestments(prev => {
      const yearInvestments = prev[startYear] || [];
      const updatedInvestments = yearInvestments.map(inv =>
        inv === investment
          ? {
            ...inv,
            isLiquidated: true,
            liquidationYear: currentYear,
            liquidatedAmount: liquidationAmount,
            penaltyApplied: yearsHeld < investment.terms ? liquidationAmount - (investment.amountInvested + compoundInterest) : 0
          }
          : inv
      );

      return {
        ...prev,
        [startYear]: updatedInvestments
      };
    });
  }, [setSimulationInvestments]);

  const handleUnliquidateInvestment = useCallback((investment: SimulationInvestment, startYear: number) => {
    // Check if investment is actually liquidated
    if (!investment.isLiquidated) {
      console.log(`Investment ${investment.id} is not liquidated. Skipping unliquidation.`);
      return;
    }

    // Mark the investment as not liquidated
    // The applySimulationInvestments function will handle removing the liquidation record
    setSimulationInvestments(prev => {
      const yearInvestments = prev[startYear] || [];
      const updatedInvestments = yearInvestments.map(inv =>
        inv === investment
          ? {
            ...inv,
            isLiquidated: false,
            liquidationYear: undefined,
            liquidatedAmount: undefined,
            penaltyApplied: undefined
          }
          : inv
      );

      return {
        ...prev,
        [startYear]: updatedInvestments
      };
    });
  }, [setSimulationInvestments]);

  const handleOptimizeFees = useCallback(async () => {
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
  }, [setIsOptimizing, setOptimizationResult]);

  const handleApplyOptimization = useCallback((optimizedParams: SimulationParams) => {
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
  }, [setSimulationParams, setYearAdjustments, setOptimizationResult]);

  // Removed handleSaveModel - models cannot be updated from simulation

  const handleResetChanges = useCallback(() => {
    if (!model) return;
    const { id, createdAt, updatedAt, ...simParams } = model;
    setSimulationParams(simParams);
    setYearAdjustments({}); // Clear any year-specific adjustments
    setSimulationInvestments({}); // Clear simulation investments
    setCurrentVersionId(undefined); // Clear current version
  }, [setSimulationParams, setYearAdjustments, setSimulationInvestments]);

  // Version management handlers
  const handleSaveVersion = useCallback(async (name: string, description?: string) => {
    if (!simulationParams) return;
    
    try {
      const versionData = {
        name,
        description,
        modelSnapshot: simulationParams,
        yearAdjustments,
        simulationInvestments,
      };
      
      const newVersion = await createVersion(versionData);
      if (newVersion) {
        setCurrentVersionId(newVersion.id);
        alert(`Version "${name}" saved successfully!`);
      }
    } catch (error) {
      console.error('Failed to save version:', error);
      alert('Failed to save version. Please try again.');
    }
  }, [simulationParams, yearAdjustments, simulationInvestments, createVersion]);

  const handleLoadVersion = useCallback((version: SimulationVersion) => {
    try {
      // Load the version data
      setSimulationParams(version.modelSnapshot);
      setYearAdjustments(version.yearAdjustments || {});
      setSimulationInvestments(version.simulationInvestments || {});
      setCurrentVersionId(version.id);
      
      alert(`Version "${version.name}" loaded successfully!`);
    } catch (error) {
      console.error('Failed to load version:', error);
      alert('Failed to load version. Please try again.');
    }
  }, []);

  const handleDeleteVersion = useCallback(async (versionId: string) => {
    try {
      const success = await deleteVersion(versionId);
      if (success) {
        if (versionId === currentVersionId) {
          setCurrentVersionId(undefined);
        }
        alert('Version deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Failed to delete version. Please try again.');
    }
  }, [deleteVersion, currentVersionId]);

  const hasUnsavedChanges = useMemo(() => {
    if (!model || !simulationParams) return false;

    // If we're viewing a saved version, there are no unsaved changes
    if (currentVersionId) return false;

    // Check if there are any modifications that could be saved as a version
    const { id, createdAt, updatedAt, ...originalParams } = model;
    const hasModelChanges = JSON.stringify(originalParams) !== JSON.stringify(simulationParams);
    const hasYearAdjustments = Object.keys(yearAdjustments).length > 0;
    const hasSimulationInvestments = Object.keys(simulationInvestments).length > 0;

    return hasModelChanges || hasYearAdjustments || hasSimulationInvestments;
  }, [model, simulationParams, yearAdjustments, simulationInvestments, currentVersionId]);

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
        versions={versions}
        currentVersionId={currentVersionId}
        onLoadVersion={handleLoadVersion}
        onOpenVersionManagement={() => setIsVersionManagementOpen(true)}
        onResetChanges={handleResetChanges}
        onOptimizeFees={handleOptimizeFees}
        onEditSimulation={() => setIsModelEditOpen(true)}
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
      <SimulationEditSidebar
        open={isModelEditOpen}
        onOpenChange={setIsModelEditOpen}
        model={simulationParams}
        onSave={handleModelEdit}
        currentVersionName={currentVersionId ? versions.find(v => v.id === currentVersionId)?.name : undefined}
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
          onUnliquidateInvestment={handleUnliquidateInvestment}
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

      <VersionManagementDialog
        open={isVersionManagementOpen}
        onOpenChange={setIsVersionManagementOpen}
        versions={versions}
        currentVersionId={currentVersionId}
        onSaveVersion={handleSaveVersion}
        onLoadVersion={handleLoadVersion}
        onDeleteVersion={handleDeleteVersion}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  );
}
