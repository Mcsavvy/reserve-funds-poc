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
  targetMinBalance: number = 0,
): OptimizationResult {
  // ------------- PREPARATION -------------
  const originalProjections = generateProjections(params, expenses);
  const originalStats = getProjectionStats(originalProjections);

  // Helper percentage → factor (e.g. 5 => 0.05)
  const maxIncreaseFactor = (params.maximumAllowableFeeIncrease ?? 0) / 100;
  const housingUnits = params.housingUnits ?? 0;
  const minFee = params.minimumCollectionFee;

  // Deep-copy projections so we can mutate safely
  const optimizedProjections: YearProjection[] = JSON.parse(JSON.stringify(originalProjections));

  if (optimizedProjections.length === 0 || housingUnits === 0) {
    // Nothing to optimise – return early with originals
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
      recommendations: [
        'No optimisation performed because there are no projections or housing units.'
      ],
    };
  }

  // ------------- IDENTIFY EXPENSE YEARS -------------
  const expenseIndices: number[] = [];
  optimizedProjections.forEach((p, idx) => {
    if (p.expenses > 0) {
      expenseIndices.push(idx);
    }
  });

  // include a virtual milestone for the final year to handle trailing period
  const milestoneSet = new Set(expenseIndices);
  if (optimizedProjections.length > 0) {
    milestoneSet.add(optimizedProjections.length - 1);
  }
  const milestones = Array.from(milestoneSet).sort((a, b) => a - b);

  let lastProcessedIdx = -1;
  let openingBalance = params.startingAmount;
  let prevYearCollectionFee = 0; // monthly fee per unit for previous year

  const yearlyAdjustments: YearFeeAdjustment[] = [];

  // ------------- PROCESS EACH PERIOD -------------
  for (const milestoneIdx of milestones) {
    if (milestoneIdx <= lastProcessedIdx) continue;

    const periodYears = optimizedProjections.slice(lastProcessedIdx + 1, milestoneIdx + 1);
    const yearsInPeriod = periodYears.length;

    // Financial need at the milestone is to have at least targetMinBalance leftover
    const requiredFundsAtMilestone = targetMinBalance;

    // Solve for base collection fee of first year in period
    let baseFee = solveForBaseFee(
      openingBalance,
      periodYears,
      requiredFundsAtMilestone,
      maxIncreaseFactor,
      housingUnits,
      minFee
    );

    // Constrain by maximum allowable jump from previous year (except first period)
    if (lastProcessedIdx >= 0) {
      const maxAllowedFee = prevYearCollectionFee * (1 + maxIncreaseFactor);
      baseFee = Math.min(baseFee, maxAllowedFee);
    }
    baseFee = Math.max(baseFee, minFee);

    // ------------- APPLY FEES FOR EACH YEAR IN PERIOD -------------
    let feeThisYear = baseFee;
    for (let i = 0; i < yearsInPeriod; i++) {
      const globalYearIdx = lastProcessedIdx + 1 + i;
      const yearProj = optimizedProjections[globalYearIdx];

      yearProj.openingBalance = openingBalance;

      // Collections = monthly fee * 12 * units (no inflation for simplicity)
      yearProj.collections = feeThisYear * 12 * housingUnits;

      // Recalculate closing balance
      yearProj.closingBalance =
        yearProj.openingBalance +
        yearProj.collections -
        yearProj.expenses -
        yearProj.safetyNet;

      // Record adjustment data
      const originalCollections = originalProjections[globalYearIdx].collections;
      const originalMonthlyFee = originalCollections / (12 * housingUnits);
      if (Math.abs(originalMonthlyFee - feeThisYear) > 1e-6) {
        yearlyAdjustments.push({
          year: yearProj.year,
          originalFee: originalMonthlyFee,
          optimizedFee: feeThisYear,
          feeIncrease: feeThisYear - originalMonthlyFee,
          feeIncreasePercentage: originalMonthlyFee === 0 ? 100 : ((feeThisYear - originalMonthlyFee) / originalMonthlyFee) * 100,
          reason: 'Optimised to satisfy upcoming expense period',
        });
      }

      // Prepare for next iteration
      openingBalance = yearProj.closingBalance;
      prevYearCollectionFee = feeThisYear;
      feeThisYear = feeThisYear * (1 + maxIncreaseFactor); // ramp-up for next year
    }

    lastProcessedIdx = milestoneIdx;
  }

  // ------------- FINALISE -------------
  const optimizedStats = getProjectionStats(optimizedProjections);

  const result: OptimizationResult = {
    optimizedParams: params,
    projections: optimizedProjections,
    stats: optimizedStats,
    changes: {
      originalMonthlyFee: params.monthlyReserveFeesPerHousingUnit,
      optimizedMonthlyFee: optimizedProjections[0].collections / (12 * housingUnits),
      feeIncrease: (optimizedProjections[0].collections / (12 * housingUnits)) - params.monthlyReserveFeesPerHousingUnit,
      feeIncreasePercentage:
        params.monthlyReserveFeesPerHousingUnit === 0
          ? 100
          : (((optimizedProjections[0].collections / (12 * housingUnits)) - params.monthlyReserveFeesPerHousingUnit) /
              params.monthlyReserveFeesPerHousingUnit) * 100,
    },
    yearlyAdjustments,
    hasYearlyAdjustments: yearlyAdjustments.length > 0,
    recommendations: yearlyAdjustments.length > 0 ? ['Fee schedule adjusted to meet projected expenses.'] : ['Original fee schedule deemed sufficient.'],
  };

  return result;
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

// ---------------- HELPER FUNCTIONS ----------------

/**
 * Solve for the base monthly collection fee for the first year of a period.
 * We use a simple binary-search goal-seek to hit the required funds constraint.
 */
function solveForBaseFee(
  openingBalance: number,
  periodYears: YearProjection[],
  requiredFundsAtMilestone: number,
  maxIncreaseFactor: number,
  housingUnits: number,
  minFee: number
): number {
  // quick guard
  if (housingUnits === 0) return minFee;

  // upper bound guess – start with a reasonably large number.
  let low = minFee;
  let high = minFee * 100 + 1000; // heuristic upper bound

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const finalBalance = simulatePeriodBalance(
      openingBalance,
      mid,
      periodYears,
      maxIncreaseFactor,
      housingUnits
    );

    if (finalBalance >= requiredFundsAtMilestone) {
      // we collected too much – try lower fee
      high = mid;
    } else {
      low = mid;
    }
  }

  return high; // smallest fee that meets requirement
}

function simulatePeriodBalance(
  openingBalance: number,
  baseFee: number,
  periodYears: YearProjection[],
  maxIncreaseFactor: number,
  housingUnits: number
): number {
  let balance = openingBalance;
  let fee = baseFee;

  for (let i = 0; i < periodYears.length; i++) {
    const yr = periodYears[i];
    const collections = fee * 12 * housingUnits;
    balance = balance + collections - yr.expenses - yr.safetyNet;
    fee = fee * (1 + maxIncreaseFactor);
  }

  return balance;
}
