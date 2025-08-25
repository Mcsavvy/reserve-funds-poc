import { Model, Expense } from './db-schemas';
import { formatCurrency } from './db-utils';

export interface YearProjection {
  year: number;
  openingBalance: number;
  expenses: number;
  collections: number;
  safetyNet: number;
  closingBalance: number;
  expenseDetails: ExpenseOccurrence[];
}

export interface ExpenseOccurrence {
  expense: Expense;
  inflatedCost: number;
}

export interface SimulationParams extends Omit<Model, 'id' | 'createdAt' | 'updatedAt'> {
  // Allow temporary modifications for simulation
}

/**
 * Calculate the inflated cost of an expense for a given year
 */
export function calculateInflatedCost(
  baseCost: number,
  inflationRate: number,
  yearsFromBase: number
): number {
  return baseCost * Math.pow(1 + inflationRate / 100, yearsFromBase);
}

/**
 * Determine if an expense occurs in a given year
 */
export function doesExpenseOccurInYear(
  expense: Expense,
  year: number,
  modelFiscalYear: number
): boolean {
  const yearsFromFiscalYear = year - modelFiscalYear;
  
  // If remaining life is greater than years from fiscal year, expense doesn't occur yet
  if (yearsFromFiscalYear < expense.remainingLife) {
    return false;
  }
  
  // Calculate how many cycles have passed since the first occurrence
  const yearsSinceFirstOccurrence = yearsFromFiscalYear - expense.remainingLife;
  
  // Expense occurs every expectedLife years after the first occurrence
  return yearsSinceFirstOccurrence % expense.expectedLife === 0;
}

/**
 * Calculate expenses for a specific year
 */
export function calculateYearExpenses(
  expenses: Expense[],
  year: number,
  modelFiscalYear: number,
  inflationRate: number
): ExpenseOccurrence[] {
  const yearExpenses: ExpenseOccurrence[] = [];
  
  for (const expense of expenses) {
    if (doesExpenseOccurInYear(expense, year, modelFiscalYear)) {
      const yearsFromBase = year - modelFiscalYear;
      const inflatedCost = calculateInflatedCost(expense.cost, inflationRate, yearsFromBase);
      
      yearExpenses.push({
        expense,
        inflatedCost,
      });
    }
  }
  
  return yearExpenses;
}

/**
 * Generate year-by-year projections for a model
 */
export function generateProjections(
  params: SimulationParams,
  expenses: Expense[]
): YearProjection[] {
  const projections: YearProjection[] = [];
  let currentBalance = params.startingAmount;
  
  for (let year = params.fiscalYear; year < params.fiscalYear + params.period; year++) {
    const expenseDetails = calculateYearExpenses(expenses, year, params.fiscalYear, params.inflationRate);
    const totalExpenses = expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    
    // Calculate collections (monthly fees * 12 months * housing units)
    const yearsFromBase = year - params.fiscalYear;
    const inflatedMonthlyFee = calculateInflatedCost(
      params.monthlyReserveFeesPerHousingUnit,
      params.inflationRate,
      yearsFromBase
    );
    const collections = inflatedMonthlyFee * 12 * (params.housingUnits || 0);
    
    // Calculate safety net (percentage of expenses)
    const safetyNet = totalExpenses * (params.safetyNetPercentage / 100);
    
    // Calculate closing balance
    const closingBalance = currentBalance + collections - totalExpenses - safetyNet;
    
    projections.push({
      year,
      openingBalance: currentBalance,
      expenses: totalExpenses,
      collections,
      safetyNet,
      closingBalance,
      expenseDetails,
    });
    
    // Update current balance for next year
    currentBalance = closingBalance;
  }
  
  return projections;
}

/**
 * Apply year-specific adjustments and recalculate subsequent years
 */
export function applyYearAdjustments(
  projections: YearProjection[],
  adjustments: Record<number, { openingBalance?: number; collections?: number; expenses?: number; safetyNet?: number }>
): YearProjection[] {
  const adjustedProjections = [...projections];
  
  // Sort adjustment years to apply them in chronological order
  const adjustmentYears = Object.keys(adjustments).map(Number).sort();
  
  for (const year of adjustmentYears) {
    const yearIndex = adjustedProjections.findIndex(p => p.year === year);
    if (yearIndex === -1) continue;
    
    const adjustment = adjustments[year];
    const projection = adjustedProjections[yearIndex];
    
    // Apply adjustments to the specific year
    const adjustedProjection = {
      ...projection,
      openingBalance: adjustment.openingBalance ?? projection.openingBalance,
      collections: adjustment.collections ?? projection.collections,
      expenses: adjustment.expenses ?? projection.expenses,
      safetyNet: adjustment.safetyNet ?? projection.safetyNet,
    };
    
    // Recalculate closing balance
    adjustedProjection.closingBalance = 
      adjustedProjection.openingBalance + 
      adjustedProjection.collections - 
      adjustedProjection.expenses - 
      adjustedProjection.safetyNet;
    
    adjustedProjections[yearIndex] = adjustedProjection;
    
    // Update opening balances for subsequent years
    for (let i = yearIndex + 1; i < adjustedProjections.length; i++) {
      const prevClosingBalance = adjustedProjections[i - 1].closingBalance;
      adjustedProjections[i] = {
        ...adjustedProjections[i],
        openingBalance: prevClosingBalance,
        closingBalance: prevClosingBalance + adjustedProjections[i].collections - adjustedProjections[i].expenses - adjustedProjections[i].safetyNet
      };
    }
  }
  
  return adjustedProjections;
}

/**
 * Year-specific fee adjustment
 */
export interface YearFeeAdjustment {
  year: number;
  originalFee: number;
  optimizedFee: number;
  feeIncrease: number;
  feeIncreasePercentage: number;
  reason: string;
}

/**
 * Optimization result type
 */
export interface OptimizationResult {
  optimizedParams: SimulationParams;
  projections: YearProjection[];
  stats: ReturnType<typeof getProjectionStats>;
  changes: {
    originalMonthlyFee: number;
    optimizedMonthlyFee: number;
    feeIncrease: number;
    feeIncreasePercentage: number;
  };
  yearlyAdjustments: YearFeeAdjustment[];
  hasYearlyAdjustments: boolean;
  recommendations: string[];
}

/**
 * Optimize collection fees dynamically per year to clear deficits
 */
export function optimizeCollectionFees(
  params: SimulationParams,
  expenses: Expense[],
  targetMinBalance: number = 50000,
  targetMaxBalance: number = 500000
): OptimizationResult {
  return optimizeDynamicFees(params, expenses, targetMinBalance, targetMaxBalance);
}

/**
 * Dynamic optimization that allows different fees per year to target deficits
 */
function optimizeDynamicFees(
  params: SimulationParams,
  expenses: Expense[],
  targetMinBalance: number,
  targetMaxBalance: number
): OptimizationResult {
  const originalProjections = generateProjections(params, expenses);
  const originalStats = getProjectionStats(originalProjections);
  
  // Find years with deficits or low balances, and years with no expenses (can reduce fees)
  const problematicYears = originalProjections.filter(p => 
    p.closingBalance < targetMinBalance
  );
  
  const optimizableYears = originalProjections.filter(p => 
    p.expenseDetails.length === 0 && // No expenses this year
    p.closingBalance > targetMaxBalance // High balance that can be reduced
  );
  
  // If no problematic or optimizable years, return as-is
  if (problematicYears.length === 0 && optimizableYears.length === 0) {
    return {
      optimizedParams: params,
      projections: originalProjections,
      stats: originalStats,
      changes: {
        originalMonthlyFee: params.monthlyReserveFeesPerHousingUnit,
        optimizedMonthlyFee: params.monthlyReserveFeesPerHousingUnit,
        feeIncrease: 0,
        feeIncreasePercentage: 0,
      },
      yearlyAdjustments: [],
      hasYearlyAdjustments: false,
      recommendations: ['Current fee structure is already optimal'],
    };
  }
  
  // Calculate year-specific adjustments to address deficits
  const yearAdjustments: Record<number, { collections?: number }> = {};
  const yearlyFeeAdjustments: YearFeeAdjustment[] = [];
  let optimizedProjections = [...originalProjections];
  
  // Track the actual fee for each year (starts with inflation-adjusted base, gets updated with optimizations)
  const actualFeeByYear: Record<number, number> = {};
  
  // Initialize actual fees for each year with inflation-adjusted base fee
  for (let i = 0; i < optimizedProjections.length; i++) {
    const projection = optimizedProjections[i];
    const yearsSinceStart = projection.year - params.fiscalYear;
    actualFeeByYear[projection.year] = params.monthlyReserveFeesPerHousingUnit * Math.pow(1 + params.inflationRate / 100, yearsSinceStart);
  }
  
  // Strategy: For each problematic year, calculate how much additional collection is needed
  // Also look ahead to prevent deficits before they occur
  for (let i = 0; i < optimizedProjections.length; i++) {
    const projection = optimizedProjections[i];
    
    // Check if this year has a deficit OR if continuing with current fees would cause deficits in upcoming years
    const hasCurrentDeficit = projection.closingBalance < targetMinBalance;
    
    // Look ahead to see if current fee trajectory would cause future deficits
    let wouldCauseFutureDeficit = false;
    let futureDeficitAmount = 0;
    const lookAheadYears = 3; // Look 3 years ahead
    
    if (!hasCurrentDeficit) {
      let projectedBalance = projection.closingBalance;
      
      for (let j = i + 1; j < Math.min(i + lookAheadYears + 1, optimizedProjections.length); j++) {
        const futureProjection = optimizedProjections[j];
        
        // Use current fee trajectory (inflation-adjusted base fee)
        const futureYearsSinceStart = futureProjection.year - params.fiscalYear;
        const futureBaseFee = params.monthlyReserveFeesPerHousingUnit * Math.pow(1 + params.inflationRate / 100, futureYearsSinceStart);
        const futureCollections = futureBaseFee * 12 * (params.housingUnits || 1);
        
        projectedBalance = projectedBalance + futureCollections - futureProjection.expenses - futureProjection.safetyNet;
        
        if (projectedBalance < targetMinBalance) {
          wouldCauseFutureDeficit = true;
          futureDeficitAmount = targetMinBalance - projectedBalance;
          break;
        }
      }
    }
    
    // If this year has a deficit OR would cause future deficits, calculate needed adjustment
    if (hasCurrentDeficit || wouldCauseFutureDeficit) {
      let deficitToAddress;
      let reasonText;
      
      if (hasCurrentDeficit) {
        deficitToAddress = targetMinBalance - projection.closingBalance;
        reasonText = `Address ${projection.closingBalance < 0 ? 'deficit' : 'low balance'} of ${formatCurrency(Math.abs(deficitToAddress))}`;
      } else {
        // For future deficit prevention, we need extra collections now to build reserves
        deficitToAddress = futureDeficitAmount * 0.5; // Collect 50% of the projected deficit now
        reasonText = `Prevent future deficit by building reserves (projected deficit: ${formatCurrency(futureDeficitAmount)})`;
      }
      
      const currentYearCollections = projection.collections;
      
      // Calculate what the collections should be to meet target
      const neededCollections = currentYearCollections + deficitToAddress;
      
      // Calculate the required monthly fee to achieve these collections
      const currentAnnualCollections = actualFeeByYear[projection.year] * 12 * (params.housingUnits || 1);
      const feeMultiplier = neededCollections / currentAnnualCollections;
      const neededMonthlyFee = actualFeeByYear[projection.year] * feeMultiplier;
      
      // Calculate maximum allowable fee for this year based on previous year's actual fee
      let maxAllowableFeeForYear: number;
      if (projection.year === params.fiscalYear) {
        // First year: max allowable is base fee * (1 + max increase)
        maxAllowableFeeForYear = params.monthlyReserveFeesPerHousingUnit * (1 + params.maximumAllowableFeeIncrease / 100);
      } else {
        // Subsequent years: max allowable is previous year's actual fee * (1 + inflation) * (1 + max increase)
        const prevYear = projection.year - 1;
        // Check if previous year had an optimization adjustment, otherwise use the inflation-adjusted base
        const prevYearBaseFee = params.monthlyReserveFeesPerHousingUnit * Math.pow(1 + params.inflationRate / 100, prevYear - params.fiscalYear);
        const prevYearActualFee = actualFeeByYear[prevYear] || prevYearBaseFee;
        const inflationAdjustedPrevFee = prevYearActualFee * (1 + params.inflationRate / 100);
        maxAllowableFeeForYear = inflationAdjustedPrevFee * (1 + params.maximumAllowableFeeIncrease / 100);
      }
      
      let actualFee = neededMonthlyFee;
      let reason = reasonText;
      
      // Cap the fee if it exceeds maximum allowable increase
      if (neededMonthlyFee > maxAllowableFeeForYear) {
        actualFee = maxAllowableFeeForYear;
        reason += ` (capped at max allowable year-over-year increase)`;
      }
      
      // Update the actual fee for this year only
      actualFeeByYear[projection.year] = actualFee;
      
      // Calculate actual collections with the adjusted fee
      const actualAnnualCollections = actualFee * 12 * (params.housingUnits || 1);
      
      // Apply the adjustment
      yearAdjustments[projection.year] = {
        collections: actualAnnualCollections
      };
      
      // Record the fee adjustment (comparing to original inflation-adjusted base)
      const originalInflationAdjustedFee = params.monthlyReserveFeesPerHousingUnit * Math.pow(1 + params.inflationRate / 100, projection.year - params.fiscalYear);
      yearlyFeeAdjustments.push({
        year: projection.year,
        originalFee: originalInflationAdjustedFee,
        optimizedFee: actualFee,
        feeIncrease: actualFee - originalInflationAdjustedFee,
        feeIncreasePercentage: ((actualFee - originalInflationAdjustedFee) / originalInflationAdjustedFee) * 100,
        reason
      });
    }
  }
  
  // Handle years with no expenses AND no deficit - reduce fees to minimum collection fee
  for (let i = 0; i < optimizedProjections.length; i++) {
    const projection = optimizedProjections[i];
    
    // Only reduce fees if:
    // 1. This year has no expenses, AND
    // 2. This year doesn't have a deficit that needs to be addressed, AND
    // 3. No major expenses are coming up in the next few years
    if (projection.expenseDetails.length === 0 && projection.closingBalance >= targetMinBalance) {
      const yearsRemaining = optimizedProjections.length - i - 1;
      const isNearEndOfPeriod = yearsRemaining <= 1; // final year only
      // For the **final year** we can be more aggressive: only collect what we still need.
      if (isNearEndOfPeriod) {
        const minimumFee = Math.max(params.minimumCollectionFee, 0);
        const currentFee = actualFeeByYear[projection.year];
        // Remaining obligations (expenses+safetynet) for this very last year are already accounted,
        // so anything above targetMinBalance is surplus. Aim to finish around targetMinBalance.
        const surplus = projection.closingBalance - targetMinBalance;
        if (surplus > 0) {
          // We can reduce collections by (surplus) next year (but we are in final year, so adjust this year fee).
          const reducibleAnnual = Math.min(surplus, projection.collections);
          const optimizedFee = Math.max(minimumFee, (projection.collections - reducibleAnnual) / (12 * (params.housingUnits || 1)));
          if (optimizedFee < currentFee - 0.01) {
            actualFeeByYear[projection.year] = optimizedFee;
            yearAdjustments[projection.year] = { collections: optimizedFee * 12 * (params.housingUnits || 1) };
            const originalInflationAdjustedFee = params.monthlyReserveFeesPerHousingUnit * Math.pow(1 + params.inflationRate / 100, projection.year - params.fiscalYear);
            yearlyFeeAdjustments.push({
              year: projection.year,
              originalFee: originalInflationAdjustedFee,
              optimizedFee,
              feeIncrease: optimizedFee - originalInflationAdjustedFee,
              feeIncreasePercentage: ((optimizedFee - originalInflationAdjustedFee) / originalInflationAdjustedFee) * 100,
              reason: `Final‐year surplus trimming`,
            });
          }
        }
      }
      
      // Look ahead for upcoming expenses in the next 3-5 years
      const lookAheadYears = 3;
      let upcomingExpenses = 0;
      let hasUpcomingMajorExpenses = false;
      
      for (let j = i + 1; j < Math.min(i + lookAheadYears + 1, optimizedProjections.length); j++) {
        const futureProjection = optimizedProjections[j];
        upcomingExpenses += futureProjection.expenses;
        
        // Consider it a "major expense" if any single year has expenses > 50% of current balance
        if (futureProjection.expenses > projection.closingBalance * 0.5) {
          hasUpcomingMajorExpenses = true;
        }
      }
      
      // Calculate if upcoming expenses would cause future deficits with reduced collections
      const currentFee = actualFeeByYear[projection.year];
      const minimumFee = Math.max(params.minimumCollectionFee, 0);
      
      // Only reduce if current fee is above minimum AND no major upcoming expenses
      if (currentFee > minimumFee && !hasUpcomingMajorExpenses) {
        
        // Simulate what would happen with reduced collections
        let projectedBalance = projection.closingBalance;
        let wouldCauseDeficit = false;
        
        for (let j = i + 1; j < Math.min(i + lookAheadYears + 1, optimizedProjections.length); j++) {
          const futureProjection = optimizedProjections[j];
          
          // Simulate reduced collections for future years
          const futureYearsSinceStart = futureProjection.year - params.fiscalYear;
          const futureInflationAdjustedMinFee = minimumFee * Math.pow(1 + params.inflationRate / 100, futureYearsSinceStart - (projection.year - params.fiscalYear));
          const reducedCollections = futureInflationAdjustedMinFee * 12 * (params.housingUnits || 1);
          
          // Calculate projected balance with reduced collections
          projectedBalance = projectedBalance + reducedCollections - futureProjection.expenses - futureProjection.safetyNet;
          
          if (projectedBalance < targetMinBalance) {
            wouldCauseDeficit = true;
            break;
          }
        }
        
        // Only reduce fee if it won't cause future deficits
        if (!wouldCauseDeficit) {
          // For fee reductions due to no expenses, we can drop directly to minimum fee
          // No year-over-year percentage constraints apply to reductions
          const optimizedFee = minimumFee;
          
          // Only apply if it's actually a reduction
          if (optimizedFee < currentFee) {
            // Update the actual fee for this year only
            actualFeeByYear[projection.year] = optimizedFee;
            
            // Calculate actual collections with the reduced fee
            const actualAnnualCollections = optimizedFee * 12 * (params.housingUnits || 1);
            
            // Apply the adjustment
            yearAdjustments[projection.year] = {
              collections: actualAnnualCollections
            };
            
            // Record the fee adjustment (comparing to original inflation-adjusted base)
            const originalInflationAdjustedFee = params.monthlyReserveFeesPerHousingUnit * Math.pow(1 + params.inflationRate / 100, projection.year - params.fiscalYear);
            yearlyFeeAdjustments.push({
              year: projection.year,
              originalFee: originalInflationAdjustedFee,
              optimizedFee: optimizedFee,
              feeIncrease: optimizedFee - originalInflationAdjustedFee,
              feeIncreasePercentage: ((optimizedFee - originalInflationAdjustedFee) / originalInflationAdjustedFee) * 100,
              reason: `Instant reduction to minimum fee - no expenses this year, balance is healthy, and no major upcoming expenses`
            });
          }
        }
      }
    }
  }
  
  // Apply all adjustments at once
  if (Object.keys(yearAdjustments).length > 0) {
    optimizedProjections = applyYearAdjustments(originalProjections, yearAdjustments);
  }
  
  const optimizedStats = getProjectionStats(optimizedProjections);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (yearlyFeeAdjustments.length > 0) {
    const increases = yearlyFeeAdjustments.filter(adj => adj.feeIncrease > 0);
    const decreases = yearlyFeeAdjustments.filter(adj => adj.feeIncrease < 0);
    
    if (increases.length > 0 && decreases.length > 0) {
      recommendations.push(`💡 Applying targeted fee adjustments to ${yearlyFeeAdjustments.length} year(s): ${increases.length} increases for deficits, ${decreases.length} decreases for high balances`);
    } else if (increases.length > 0) {
      recommendations.push(`💡 Applying targeted fee increases to ${increases.length} year(s) to address deficits`);
    } else if (decreases.length > 0) {
      recommendations.push(`💡 Applying targeted fee reductions to ${decreases.length} year(s) with no expenses and high balances`);
    }
    
    const avgChange = yearlyFeeAdjustments.reduce((sum, adj) => sum + adj.feeIncreasePercentage, 0) / yearlyFeeAdjustments.length;
    if (increases.length > 0 && decreases.length > 0) {
      recommendations.push(`📊 Average net change: ${avgChange.toFixed(1)}% across all adjusted years`);
    } else if (increases.length > 0) {
      recommendations.push(`📊 Average fee increase: ${avgChange.toFixed(1)}% in affected years`);
    } else {
      recommendations.push(`📊 Average fee reduction: ${Math.abs(avgChange).toFixed(1)}% in affected years`);
    }
    
    // Check if any adjustments were capped
    const cappedIncreases = yearlyFeeAdjustments.filter(adj => 
      adj.reason.includes('capped at max allowable')
    );
    
    if (cappedIncreases.length > 0) {
      recommendations.push(`⚠️ ${cappedIncreases.length} year(s) capped at maximum allowable change - may still have suboptimal balances`);
    }
    
    // Check for years reduced to minimum fee
    const minimumFeeYears = yearlyFeeAdjustments.filter(adj => 
      adj.reason.includes('Reduce to minimum fee')
    );
    
    if (minimumFeeYears.length > 0) {
      recommendations.push(`📉 ${minimumFeeYears.length} year(s) reduced to minimum collection fee due to no expenses`);
    }
  }
  
  if (optimizedStats.negativeBalanceYears > 0) {
    recommendations.push('⚠️ Some deficits remain even after optimization. Consider additional measures or higher fee limits.');
  } else {
    recommendations.push('✅ All deficit years have been addressed with targeted fee adjustments');
  }
  
  if (optimizedStats.maxBalance > targetMaxBalance) {
    recommendations.push('💡 Some years may have high balances. Consider reducing fees in non-deficit years.');
  }
  
  // Calculate average fee change for summary
  const totalFeeIncrease = yearlyFeeAdjustments.reduce((sum, adj) => sum + adj.feeIncrease, 0);
  const avgFeeIncrease = yearlyFeeAdjustments.length > 0 ? totalFeeIncrease / yearlyFeeAdjustments.length : 0;
  const avgFeeIncreasePercentage = yearlyFeeAdjustments.length > 0 
    ? yearlyFeeAdjustments.reduce((sum, adj) => sum + adj.feeIncreasePercentage, 0) / yearlyFeeAdjustments.length 
    : 0;
  
  return {
    optimizedParams: params, // Base params unchanged - adjustments are per-year
    projections: optimizedProjections,
    stats: optimizedStats,
    changes: {
      originalMonthlyFee: params.monthlyReserveFeesPerHousingUnit,
      optimizedMonthlyFee: params.monthlyReserveFeesPerHousingUnit + avgFeeIncrease,
      feeIncrease: avgFeeIncrease,
      feeIncreasePercentage: avgFeeIncreasePercentage,
    },
    yearlyAdjustments: yearlyFeeAdjustments,
    hasYearlyAdjustments: yearlyFeeAdjustments.length > 0,
    recommendations,
  };
}

/**
 * Get projection statistics
 */
export function getProjectionStats(projections: YearProjection[]) {
  const minBalance = Math.min(...projections.map(p => p.closingBalance));
  const maxBalance = Math.max(...projections.map(p => p.closingBalance));
  const finalBalance = projections[projections.length - 1]?.closingBalance || 0;
  const totalCollections = projections.reduce((sum, p) => sum + p.collections, 0);
  const totalExpenses = projections.reduce((sum, p) => sum + p.expenses, 0);
  const negativeBalanceYears = projections.filter(p => p.closingBalance < 0).length;
  
  return {
    minBalance,
    maxBalance,
    finalBalance,
    totalCollections,
    totalExpenses,
    negativeBalanceYears,
    averageBalance: projections.reduce((sum, p) => sum + p.closingBalance, 0) / projections.length,
  };
}
