// Reserve fund calculation utilities

import { Model, ModelItem } from './db-types';

export interface ReserveProjection {
  year: number;
  startingBalance: number;
  income: number;
  expenses: number;
  endingBalance: number;
  cumulativeExpenses: number;
  items: {
    id: string;
    name: string;
    cost: number;
    replacementYear: number;
  }[];
}

export interface ReserveSummary {
  totalIncome: number;
  totalExpenses: number;
  finalBalance: number;
  minBalance: number;
  minBalanceYear: number;
  averageBalance: number;
  needsLoan: boolean;
  maxLoanAmount: number;
}

/**
 * Calculate reserve fund projections over time
 */
export function calculateReserveProjections(
  model: Model,
  items: ModelItem[],
  projectionYears: number = 30
): ReserveProjection[] {
  const projections: ReserveProjection[] = [];
  const currentYear = parseInt(model.fiscal_year);
  
  let runningBalance = model.starting_amount;
  let cumulativeExpenses = 0;

  for (let year = 0; year < projectionYears; year++) {
    const projectionYear = currentYear + year;
    const startingBalance = runningBalance;
    
    // Calculate income (monthly fees * 12 months, adjusted for inflation)
    const inflationMultiplier = Math.pow(1 + model.inflation_rate / 100, year);
    const annualIncome = (model.monthly_fees * 12) * inflationMultiplier;
    
    // Add interest from bank
    const interestIncome = startingBalance * (model.bank_int_rate / 100);
    const totalIncome = annualIncome + interestIncome;
    
    // Calculate expenses for this year
    const yearlyExpenses: { id: string; name: string; cost: number; replacementYear: number }[] = [];
    let totalExpenses = 0;

    items.forEach(item => {
      const replacementYear = currentYear + item.remaining_life;
      
      // Check if this item needs replacement in this year
      if (replacementYear === projectionYear) {
        const inflatedCost = item.cost * inflationMultiplier;
        yearlyExpenses.push({
          id: item.id,
          name: item.name,
          cost: inflatedCost,
          replacementYear: projectionYear,
        });
        totalExpenses += inflatedCost;
      }
      
      // Check for recurring expenses (redundancy > 1)
      if (item.redundancy > 1) {
        const intervalYears = Math.floor(item.remaining_life / item.redundancy);
        for (let i = 1; i <= item.redundancy; i++) {
          const nextReplacementYear = replacementYear + (intervalYears * i);
          if (nextReplacementYear === projectionYear) {
            const inflatedCost = item.cost * Math.pow(1 + model.inflation_rate / 100, year + (intervalYears * i));
            yearlyExpenses.push({
              id: `${item.id}_${i}`,
              name: `${item.name} (Cycle ${i + 1})`,
              cost: inflatedCost,
              replacementYear: nextReplacementYear,
            });
            totalExpenses += inflatedCost;
          }
        }
      }
    });

    cumulativeExpenses += totalExpenses;
    const endingBalance = startingBalance + totalIncome - totalExpenses;

    projections.push({
      year: projectionYear,
      startingBalance,
      income: totalIncome,
      expenses: totalExpenses,
      endingBalance,
      cumulativeExpenses,
      items: yearlyExpenses,
    });

    runningBalance = endingBalance;
  }

  return projections;
}

/**
 * Generate summary statistics from projections
 */
export function generateReserveSummary(projections: ReserveProjection[]): ReserveSummary {
  const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
  const totalExpenses = projections.reduce((sum, p) => sum + p.expenses, 0);
  const finalBalance = projections[projections.length - 1]?.endingBalance ?? 0;
  
  // Find minimum balance and year
  let minBalance = Number.MAX_VALUE;
  let minBalanceYear = 0;
  
  projections.forEach(p => {
    if (p.endingBalance < minBalance) {
      minBalance = p.endingBalance;
      minBalanceYear = p.year;
    }
  });

  // Calculate average balance
  const averageBalance = projections.reduce((sum, p) => sum + p.endingBalance, 0) / projections.length;

  // Check if loan is needed (any negative balance)
  const needsLoan = minBalance < 0;
  const maxLoanAmount = needsLoan ? Math.abs(minBalance) : 0;

  return {
    totalIncome,
    totalExpenses,
    finalBalance,
    minBalance,
    minBalanceYear,
    averageBalance,
    needsLoan,
    maxLoanAmount,
  };
}

/**
 * Calculate required monthly contribution to maintain positive balance
 */
export function calculateRequiredContribution(
  model: Model,
  items: ModelItem[],
  targetMinBalance: number = 0,
  projectionYears: number = 30
): number {
  let lowGuess = 0;
  let highGuess = model.monthly_fees * 5; // Start with 5x current fees as upper bound
  let bestGuess = model.monthly_fees;
  
  const tolerance = 10; // $10 tolerance
  const maxIterations = 20;
  
  for (let i = 0; i < maxIterations; i++) {
    const testModel = { ...model, monthly_fees: bestGuess };
    const projections = calculateReserveProjections(testModel, items, projectionYears);
    const summary = generateReserveSummary(projections);
    
    if (Math.abs(summary.minBalance - targetMinBalance) < tolerance) {
      break;
    }
    
    if (summary.minBalance < targetMinBalance) {
      lowGuess = bestGuess;
      bestGuess = (bestGuess + highGuess) / 2;
    } else {
      highGuess = bestGuess;
      bestGuess = (lowGuess + bestGuess) / 2;
    }
  }
  
  return Math.round(bestGuess);
}

/**
 * Calculate inflation-adjusted cost for a future year
 */
export function calculateInflatedCost(
  baseCost: number,
  inflationRate: number,
  years: number
): number {
  return baseCost * Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate present value of future cost
 */
export function calculatePresentValue(
  futureCost: number,
  discountRate: number,
  years: number
): number {
  return futureCost / Math.pow(1 + discountRate / 100, years);
}

/**
 * Calculate contribution adequacy percentage
 */
export function calculateContributionAdequacy(
  model: Model,
  items: ModelItem[],
  projectionYears: number = 30
): number {
  const projections = calculateReserveProjections(model, items, projectionYears);
  const summary = generateReserveSummary(projections);
  
  // If there's a deficit, calculate how much additional contribution is needed
  if (summary.needsLoan) {
    const requiredContribution = calculateRequiredContribution(model, items, 0, projectionYears);
    return (model.monthly_fees / requiredContribution) * 100;
  }
  
  // If there's no deficit, we're at 100% or higher adequacy
  return 100;
}

/**
 * Format currency values
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
