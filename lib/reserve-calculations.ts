// Reserve fund calculation utilities using financial model formulas

import { Model, ModelItem } from './db-types';

export interface ReserveProjection {
  year: number;
  openingBalance: number;
  baseMaintenance: number;
  futureExpenses: number;
  reserveContribution: number;
  loanRepayments: number;
  collectionsWithoutSafetyNet: number;
  provisionalEndBalance: number;
  safetyNetTarget: number;
  safetyNetTopUp: number;
  totalMaintenanceCollected: number;
  closingBalance: number;
  items: {
    id: string;
    name: string;
    cost: number;
    type: 'Large' | 'Small';
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
 * Calculate reserve fund projections using financial model formulas
 */
export function calculateReserveProjections(
  model: Model,
  items: ModelItem[],
  projectionYears: number = 30
): ReserveProjection[] {
  const projections: ReserveProjection[] = [];
  const currentYear = parseInt(model.fiscal_year);
  
  let openingBalance = model.starting_amount;

  for (let year = 1; year <= projectionYears; year++) {
    const projectionYear = currentYear + year - 1;
    
    // 1. Base Maintenance (inflated) = Base * POWER(1+inflation%, year-1)
    const baseMaintenance = model.base_maintenance * Math.pow(1 + model.inflation_rate / 100, year - 1);
    
    // 2. Future Expenses in Year (inflated) - get expenses for this specific year
    const yearExpenses = items.filter(item => item.year === year);
    const futureExpenses = yearExpenses.reduce((sum, item) => {
      return sum + (item.cost * Math.pow(1 + model.inflation_rate / 100, year - 1));
    }, 0);
    
    // 3. Reserve Contribution calculation (simplified for now)
    // This involves complex logic for future expenses distribution
    const futureExpensesTotal = items
      .filter(item => item.year > year)
      .reduce((sum, item) => {
        return sum + (item.cost * Math.pow(1 + model.inflation_rate / 100, item.year - 1) * 
          (item.type === 'Large' ? model.loan_threshold / 100 : 1));
      }, 0);
    
    const remainingYears = Math.max(projectionYears - year, 1);
    const reserveContribution = futureExpensesTotal / remainingYears;
    
    // 4. Loan Repayments (simplified - assumes loans for large expenses)
    const largeExpenses = yearExpenses.filter(item => item.type === 'Large');
    const loanAmount = largeExpenses.reduce((sum, item) => {
      const inflatedCost = item.cost * Math.pow(1 + model.inflation_rate / 100, year - 1);
      return sum + (inflatedCost * (1 - model.loan_threshold / 100));
    }, 0);
    
    // PMT calculation for loan repayments (if there were loans in previous years)
    const loanRepayments = loanAmount > 0 ? 
      calculatePMT(model.loan_rate / 100, model.loan_years, loanAmount) : 0;
    
    // 5. Collections w/o Safety Net
    const collectionsWithoutSafetyNet = baseMaintenance + reserveContribution + loanRepayments;
    
    // 6. Provisional End Balance
    const provisionalEndBalance = openingBalance + collectionsWithoutSafetyNet - baseMaintenance - futureExpenses - loanRepayments;
    
    // 7. Safety Net Target = Safety Net % * (Base Maintenance + Future Expenses + Loan Repayments)
    const safetyNetTarget = (model.safety_net_percentage / 100) * (baseMaintenance + futureExpenses + loanRepayments);
    
    // 8. Safety Net Top-Up = MAX(0, Safety Net Target - Provisional End Balance)
    const safetyNetTopUp = Math.max(0, safetyNetTarget - provisionalEndBalance);
    
    // 9. Total Maintenance Collected = Collections w/o Safety Net + Safety Net Top-Up
    const totalMaintenanceCollected = collectionsWithoutSafetyNet + safetyNetTopUp;
    
    // 10. Closing Balance = Opening Balance + Total Maintenance Collected - Base Maintenance - Future Expenses - Loan Repayments
    const closingBalance = openingBalance + totalMaintenanceCollected - baseMaintenance - futureExpenses - loanRepayments;
    
    projections.push({
      year: projectionYear,
      openingBalance,
      baseMaintenance,
      futureExpenses,
      reserveContribution,
      loanRepayments,
      collectionsWithoutSafetyNet,
      provisionalEndBalance,
      safetyNetTarget,
      safetyNetTopUp,
      totalMaintenanceCollected,
      closingBalance,
      items: yearExpenses.map(item => ({
        id: item.id,
        name: item.name,
        cost: item.cost * Math.pow(1 + model.inflation_rate / 100, year - 1),
        type: item.type,
      })),
    });

    // Set opening balance for next year
    openingBalance = closingBalance;
  }

  return projections;
}

/**
 * Calculate PMT (loan payment) using the standard financial formula
 */
function calculatePMT(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  return (pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

/**
 * Generate summary statistics from projections
 */
export function generateReserveSummary(projections: ReserveProjection[]): ReserveSummary {
  const totalIncome = projections.reduce((sum, p) => sum + p.totalMaintenanceCollected, 0);
  const totalExpenses = projections.reduce((sum, p) => sum + p.baseMaintenance + p.futureExpenses, 0);
  const finalBalance = projections[projections.length - 1]?.closingBalance ?? 0;
  
  // Find minimum balance and year
  let minBalance = Number.MAX_VALUE;
  let minBalanceYear = 0;
  
  projections.forEach(p => {
    if (p.closingBalance < minBalance) {
      minBalance = p.closingBalance;
      minBalanceYear = p.year;
    }
  });

  // Calculate average balance
  const averageBalance = projections.reduce((sum, p) => sum + p.closingBalance, 0) / projections.length;

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
 * Calculate required contribution to maintain positive balance
 */
export function calculateRequiredContribution(
  model: Model,
  items: ModelItem[],
  targetMinBalance: number = 0,
  projectionYears: number = 30
): number {
  // Simplified implementation - would need more complex logic for full financial model
  const projections = calculateReserveProjections(model, items, projectionYears);
  const summary = generateReserveSummary(projections);
  
  if (summary.minBalance >= targetMinBalance) {
    return model.base_maintenance;
  }
  
  // Calculate additional contribution needed
  const deficit = targetMinBalance - summary.minBalance;
  return model.base_maintenance + (deficit / projectionYears);
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
  
  if (summary.minBalance >= 0) {
    return 100; // Fully adequate
  }
  
  // Calculate adequacy as percentage
  const totalRequired = summary.totalExpenses;
  const totalAvailable = summary.totalIncome;
  return Math.max(0, (totalAvailable / totalRequired) * 100);
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
 * Format currency values
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}