import { ModelParameters, Expense, ProjectionRow, ProjectionResults, FeeSchedule, OptimizationResult } from './types';

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
  condition: 'equal' | 'greater'
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
    }
    
    if (matches) {
      const inflatedAmount = expense.amountUsdToday * Math.pow(1 + parameters.inflationRate / 100, expense.year - 1);
      
      if (condition === 'greater') {
        // For reserve contribution calculation
        const loanFactor = expense.type.toUpperCase() === 'LARGE' ? parameters.loanThresholdPercentage / 100 : 1;
        const yearsUntilExpense = Math.max(expense.year - year, 1);
        return sum + (inflatedAmount * loanFactor / yearsUntilExpense);
      } else {
        // For future expenses in year
        return sum + inflatedAmount;
      }
    }
    
    return sum;
  }, 0);
}

/**
 * Calculate loan repayments for a given year based on actual loans taken
 */
function calculateLoanRepayments(
  loansTaken: { year: number; amount: number }[],
  currentYear: number,
  parameters: ModelParameters
): number {
  return loansTaken.reduce((sum, loan) => {
    // Check if this loan should have repayments in the current year
    const loanStartYear = loan.year;
    const loanEndYear = loanStartYear + parameters.loanTerm - 1;
    
    if (currentYear >= loanStartYear && currentYear <= loanEndYear) {
      return sum + calculatePMT(parameters.loanRate / 100, parameters.loanTerm, loan.amount);
    }
    
    return sum;
  }, 0);
}

/**
 * Calculate loan amount needed for an expense
 */
function calculateLoanNeeded(
  expense: Expense,
  availableBalance: number,
  parameters: ModelParameters
): number {
  const inflatedAmount = expense.amountUsdToday * Math.pow(1 + parameters.inflationRate / 100, expense.year - 1);
  
  // For large expenses, we can finance a percentage. For small expenses, we pay in full unless insufficient funds
  if (expense.type.toUpperCase() === 'LARGE') {
    const financedPortion = (1 - parameters.loanThresholdPercentage / 100) * inflatedAmount;
    const cashPortion = (parameters.loanThresholdPercentage / 100) * inflatedAmount;
    
    // Check if we have enough cash for the cash portion
    if (availableBalance >= cashPortion) {
      return financedPortion;
    } else {
      // Need to finance more than the standard amount
      return inflatedAmount - Math.max(0, availableBalance);
    }
  } else {
    // Small expense - only take loan if insufficient funds
    return Math.max(0, inflatedAmount - availableBalance);
  }
}

/**
 * Calculate financial projections with a custom fee schedule
 */
export function runWithFeeSchedule(
  parameters: ModelParameters,
  expenses: Expense[],
  feeSchedule: FeeSchedule
): ProjectionResults {
  const projections: ProjectionRow[] = [];
  const loansTaken: { year: number; amount: number }[] = [];
  
  for (let year = 1; year <= parameters.horizon; year++) {
    const previousRow = projections[year - 2]; // Get previous year's data
    
    // Opening Balance (B column)
    const openingBalance = year === 1 ? parameters.openingBalance : (previousRow?.closingBalance || 0);
    
    // Base Maintenance - use custom fee schedule instead of inflation
    const baseMaintenanceInflated = feeSchedule[year - 1] || parameters.baseMaintenance;
    
    // Future Expenses in Year (D column)
    const futureExpensesInYear = sumProductExpenses(expenses, year, parameters, 'equal');
    
    // Reserve Contribution (E column)
    const reserveContribution = sumProductExpenses(expenses, year, parameters, 'greater');
    
    // Calculate loan needed for expenses in this year
    let loanTaken = 0;
    const expensesThisYear = expenses.filter(e => e.year === year);
    
    if (expensesThisYear.length > 0) {
      // Calculate available balance before expenses
      const preliminaryLoanRepayments = calculateLoanRepayments(loansTaken, year, parameters);
      const preliminaryUncappedCollections = baseMaintenanceInflated + reserveContribution + preliminaryLoanRepayments;
      
      // Calculate maximum allowed collections based on previous year's collections
      let maxAllowedCollections = preliminaryUncappedCollections; // Default: no cap
      if (year > 1 && previousRow) {
        const previousCollections = previousRow.totalMaintenanceCollected;
        maxAllowedCollections = previousCollections * (1 + parameters.maxFeeIncreasePercentage / 100);
      }
      
      const preliminaryCollections = Math.min(preliminaryUncappedCollections, maxAllowedCollections);
      const availableBalance = openingBalance + preliminaryCollections - baseMaintenanceInflated - preliminaryLoanRepayments;
      
      // Calculate total loan needed for all expenses this year
      for (const expense of expensesThisYear) {
        const loanNeeded = calculateLoanNeeded(expense, availableBalance, parameters);
        if (loanNeeded > 0) {
          loanTaken += loanNeeded;
        }
      }
      
      // Record the loan taken
      if (loanTaken > 0) {
        loansTaken.push({ year, amount: loanTaken });
      }
    }
    
    // Loan Repayments (F column) - based on actual loans taken
    const loanRepayments = calculateLoanRepayments(loansTaken, year, parameters);
    
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
    
    // Provisional End Balance (H column) - includes loan proceeds
    const provisionalEndBalance = openingBalance + collectionsWithoutSafetyNet + loanTaken - baseMaintenanceInflated - futureExpensesInYear - loanRepayments;
    
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
    
    // Closing Balance (L column) - includes loan proceeds
    const closingBalance = openingBalance + totalMaintenanceCollected + loanTaken - baseMaintenanceInflated - futureExpensesInYear - loanRepayments;
    
    projections.push({
      year,
      fiscalYear: parameters.fiscalYear + year - 1,
      openingBalance,
      baseMaintenanceInflated,
      futureExpensesInYear,
      reserveContribution,
      loanRepayments,
      loanTaken,
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
 * Calculate financial projections based on parameters and expenses
 */
export function calculateProjections(
  parameters: ModelParameters,
  expenses: Expense[]
): ProjectionResults {
  const projections: ProjectionRow[] = [];
  const loansTaken: { year: number; amount: number }[] = [];
  
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
    
    // Calculate loan needed for expenses in this year
    let loanTaken = 0;
    const expensesThisYear = expenses.filter(e => e.year === year);
    
    if (expensesThisYear.length > 0) {
      // Calculate available balance before expenses (opening balance + collections without safety net - base maintenance)
      // We need to do a preliminary calculation to see what balance would be available
      const preliminaryLoanRepayments = calculateLoanRepayments(loansTaken, year, parameters);
      const preliminaryUncappedCollections = baseMaintenanceInflated + reserveContribution + preliminaryLoanRepayments;
      
      // Calculate maximum allowed collections based on previous year's collections
      let maxAllowedCollections = preliminaryUncappedCollections; // Default: no cap
      if (year > 1 && previousRow) {
        const previousCollections = previousRow.totalMaintenanceCollected;
        maxAllowedCollections = previousCollections * (1 + parameters.maxFeeIncreasePercentage / 100);
      }
      
      const preliminaryCollections = Math.min(preliminaryUncappedCollections, maxAllowedCollections);
      const availableBalance = openingBalance + preliminaryCollections - baseMaintenanceInflated - preliminaryLoanRepayments;
      
      // Calculate total loan needed for all expenses this year
      for (const expense of expensesThisYear) {
        const loanNeeded = calculateLoanNeeded(expense, availableBalance, parameters);
        if (loanNeeded > 0) {
          loanTaken += loanNeeded;
        }
      }
      
      // Record the loan taken
      if (loanTaken > 0) {
        loansTaken.push({ year, amount: loanTaken });
      }
    }
    
    // Loan Repayments (F column) - based on actual loans taken
    const loanRepayments = calculateLoanRepayments(loansTaken, year, parameters);
    
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
    
    // Provisional End Balance (H column) - includes loan proceeds and accounts for expenses and loan repayments
    const provisionalEndBalance = openingBalance + collectionsWithoutSafetyNet + loanTaken - baseMaintenanceInflated - futureExpensesInYear - loanRepayments;
    
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
    
    // Closing Balance (L column) - includes loan proceeds
    const closingBalance = openingBalance + totalMaintenanceCollected + loanTaken - baseMaintenanceInflated - futureExpensesInYear - loanRepayments;
    
    projections.push({
      year,
      fiscalYear: parameters.fiscalYear + year - 1,
      openingBalance,
      baseMaintenanceInflated,
      futureExpensesInYear,
      reserveContribution,
      loanRepayments,
      loanTaken,
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

/**
 * Optimize monthly fees to minimize costs while keeping balances positive
 */
export function optimizeFees(
  parameters: ModelParameters,
  expenses: Expense[]
): OptimizationResult {
  const feeSchedule: FeeSchedule = [];
  let lastFee = parameters.baseMaintenance;
  
  // Calculate original total cost for comparison
  const originalProjections = calculateProjections(parameters, expenses);
  const originalTotalCost = originalProjections.projections.reduce(
    (sum, row) => sum + row.baseMaintenanceInflated, 0
  );
  
  for (let year = 1; year <= parameters.horizon; year++) {
    // Calculate minimum fee needed to keep balance positive
    const minFee = findMinimumFeeForYear(parameters, expenses, feeSchedule, year, lastFee);
    
    feeSchedule.push(minFee);
    lastFee = minFee;
  }
  
  // Run final projections with optimized schedule
  const optimizedProjections = runWithFeeSchedule(parameters, expenses, feeSchedule);
  const optimizedTotalCost = feeSchedule.reduce((sum, fee) => sum + fee, 0);
  const totalSavings = originalTotalCost - optimizedTotalCost;
  
  return {
    schedule: feeSchedule,
    projections: optimizedProjections.projections,
    totalSavings,
  };
}

/**
 * Find the minimum fee needed for a specific year to keep balance positive
 */
function findMinimumFeeForYear(
  parameters: ModelParameters,
  expenses: Expense[],
  currentSchedule: FeeSchedule,
  targetYear: number,
  lastFee: number
): number {
  const maxIncrease = parameters.maxFeeIncreasePercentage / 100;
  const minFee = Math.max(0, lastFee * (1 - maxIncrease)); // Allow decrease
  const maxFee = lastFee * (1 + maxIncrease);
  
  // Binary search for the optimal fee
  let low = minFee;
  let high = maxFee * 2; // Allow going higher if absolutely necessary
  let bestFee = high;
  
  for (let iteration = 0; iteration < 20; iteration++) {
    const midFee = (low + high) / 2;
    
    // Create temporary schedule with this fee
    const tempSchedule = [...currentSchedule];
    tempSchedule[targetYear - 1] = midFee;
    
    // Fill remaining years with inflation-based estimates for lookahead
    for (let y = targetYear + 1; y <= parameters.horizon; y++) {
      if (!tempSchedule[y - 1]) {
        const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, y - targetYear);
        tempSchedule[y - 1] = midFee * inflationFactor;
      }
    }
    
    // Run projection up to current year and check if balance stays positive
    const testProjections = runWithFeeSchedule(parameters, expenses, tempSchedule);
    const targetYearBalance = testProjections.projections[targetYear - 1]?.closingBalance || 0;
    
    if (targetYearBalance >= 0) {
      bestFee = midFee;
      high = midFee;
    } else {
      low = midFee;
    }
    
    // Convergence check
    if (Math.abs(high - low) < 1) {
      break;
    }
  }
  
  // Ensure we respect the max increase constraint (with small tolerance for rounding)
  return Math.min(bestFee, maxFee * 1.001);
}
