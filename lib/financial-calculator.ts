import { ModelParameters, Expense, ProjectionRow, ProjectionResults } from './types';

/**
 * Calculate PMT (Payment) function - equivalent to Excel's PMT function
 * @param rate - Interest rate per period
 * @param nper - Number of periods
 * @param pv - Present value (loan amount)
 * @returns Payment amount per period
 */
function calculatePMT(rate: number, nper: number, pv: number): number {
  if (rate === 0) {
    return -pv / nper;
  }
  
  const pvif = Math.pow(1 + rate, nper);
  return -pv * rate * pvif / (pvif - 1);
}

/**
 * Calculate SUMPRODUCT equivalent for expenses
 */
function sumProductExpenses(
  expenses: Expense[],
  year: number,
  parameters: ModelParameters,
  condition: 'equal' | 'greater' | 'range'
): number {
  return expenses.reduce((sum, expense) => {
    let matches = false;
    
    switch (condition) {
      case 'equal':
        matches = expense.year === year;
        break;
      case 'greater':
        matches = expense.year > year;
        break;
      case 'range':
        matches = year >= expense.year && year <= (expense.year + parameters.loanTerm - 1);
        break;
    }
    
    if (matches) {
      const inflatedAmount = expense.amountUsdToday * Math.pow(1 + parameters.inflationRate / 100, expense.year - 1);
      
      if (condition === 'greater') {
        // For reserve contribution calculation
        const loanFactor = expense.type.toUpperCase() === 'LARGE' ? parameters.loanThresholdPercentage / 100 : 1;
        const yearsUntilExpense = Math.max(expense.year - year, 1);
        return sum + (inflatedAmount * loanFactor / yearsUntilExpense);
      } else if (condition === 'range') {
        // For loan repayment calculation
        const loanFactor = expense.type.toUpperCase() === 'LARGE' ? parameters.loanThresholdPercentage / 100 : 1;
        const loanAmount = (1 - loanFactor) * inflatedAmount;
        return sum + calculatePMT(parameters.loanRate / 100, parameters.loanTerm, loanAmount);
      } else {
        // For future expenses in year
        return sum + inflatedAmount;
      }
    }
    
    return sum;
  }, 0);
}

/**
 * Calculate financial projections based on parameters and expenses
 */
export function calculateProjections(
  parameters: ModelParameters,
  expenses: Expense[]
): ProjectionResults {
  const projections: ProjectionRow[] = [];
  
  for (let year = 1; year <= parameters.horizon; year++) {
    const previousRow = projections[year - 2]; // Get previous year's data
    
    // Opening Balance (B column)
    const openingBalance = year === 1 ? parameters.openingBalance : (previousRow?.closingBalance || 0);
    
    // Base Maintenance Inflated (C column)
    const baseMaintenanceInflated = parameters.baseMaintenance * Math.pow(1 + parameters.inflationRate / 100, year - 1);
    
    // Future Expenses in Year (D column)
    const futureExpensesInYear = sumProductExpenses(expenses, year, parameters, 'equal');
    
    // Reserve Contribution (E column)
    const reserveContribution = sumProductExpenses(expenses, year, parameters, 'greater');
    
    // Loan Repayments (F column)
    const loanRepayments = sumProductExpenses(expenses, year, parameters, 'range');
    
    // Collections without Safety Net (G column) - but capped by max fee increase
    const uncappedCollections = baseMaintenanceInflated + reserveContribution + loanRepayments;
    
    // Calculate maximum allowed collections based on previous year's collections
    let maxAllowedCollections = uncappedCollections; // Default: no cap
    if (year > 1 && previousRow) {
      const previousCollections = previousRow.totalMaintenanceCollected;
      maxAllowedCollections = previousCollections * (1 + parameters.maxFeeIncreasePercentage / 100);
    }
    
    // Apply the cap
    const collectionsWithoutSafetyNet = Math.min(uncappedCollections, maxAllowedCollections);
    
    // Calculate shortfall if collections were capped
    const collectionShortfall = uncappedCollections - collectionsWithoutSafetyNet;
    
    // Provisional End Balance (H column) - affected by any collection shortfall
    const provisionalEndBalance = openingBalance + collectionsWithoutSafetyNet - baseMaintenanceInflated - futureExpensesInYear - loanRepayments;
    
    // Safety Net Target (I column)
    const safetyNetTarget = (parameters.safetyNetPercentage / 100) * (baseMaintenanceInflated + futureExpensesInYear + loanRepayments);
    
    // Safety Net Top-Up (J column) - but also capped by max fee increase
    const uncappedSafetyNetTopUp = Math.max(0, safetyNetTarget - provisionalEndBalance);
    
    // Calculate remaining capacity for fee increases after applying the collection cap
    const remainingFeeCapacity = maxAllowedCollections - collectionsWithoutSafetyNet;
    
    // Safety net top-up cannot exceed the remaining fee increase capacity
    const safetyNetTopUp = Math.min(uncappedSafetyNetTopUp, remainingFeeCapacity);
    
    // Total Maintenance Collected (K column) - final amount after all caps
    const totalMaintenanceCollected = collectionsWithoutSafetyNet + safetyNetTopUp;
    
    // Closing Balance (L column)
    const closingBalance = openingBalance + totalMaintenanceCollected - baseMaintenanceInflated - futureExpensesInYear - loanRepayments;
    
    projections.push({
      year,
      openingBalance,
      baseMaintenanceInflated,
      futureExpensesInYear,
      reserveContribution,
      loanRepayments,
      collectionsWithoutSafetyNet,
      provisionalEndBalance,
      safetyNetTarget,
      safetyNetTopUp,
      totalMaintenanceCollected,
      closingBalance,
      // Tracking fields
      feeIncreaseCapped: uncappedCollections > maxAllowedCollections,
      uncappedCollections,
      maxAllowedCollections,
    });
  }
  
  return {
    parameters,
    expenses,
    projections,
  };
}

/**
 * Format currency values for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage values for display
 */
export function formatPercentage(value: number): string {
  return `${value}%`;
}
