import { Model, Expense } from './db-schemas';

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
