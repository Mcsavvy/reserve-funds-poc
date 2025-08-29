import { Model, Expense } from './db-schemas';
import { formatCurrency } from './db-utils';

export interface YearProjection {
  year: number;
  openingBalance: number;
  expenses: number;
  collections: number;
  safetyNet: number;
  loansTaken: number;
  loanPayments: number;
  closingBalance: number;
  expenseDetails: ExpenseOccurrence[];
  loanDetails: LoanDetail[];
}

export interface ExpenseOccurrence {
  expense: Expense;
  inflatedCost: number;
  loanAmount: number;
  outOfPocketAmount: number;
}

export interface LoanDetail {
  year: number;
  originalAmount: number;
  remainingBalance: number;
  payment: number;
  interest: number;
  principal: number;
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
 * Determine if an expense qualifies as a large expense based on inflated baseline
 */
export function isLargeExpense(
  inflatedCost: number,
  largeExpenseBaseline: number,
  inflationRate: number,
  yearsFromBase: number
): boolean {
  const inflatedBaseline = calculateInflatedCost(largeExpenseBaseline, inflationRate, yearsFromBase);
  return inflatedCost >= inflatedBaseline;
}

/**
 * Calculate loan amount for a large expense
 */
export function calculateLoanAmount(
  inflatedCost: number,
  loanThresholdPercentage: number,
  largeExpenseBaseline: number,
  inflationRate: number,
  yearsFromBase: number
): number {
  if (!isLargeExpense(inflatedCost, largeExpenseBaseline, inflationRate, yearsFromBase)) {
    return 0;
  }
  return inflatedCost * (loanThresholdPercentage / 100);
}

/**
 * Calculate annual loan payment using standard amortization formula
 */
export function calculateAnnualLoanPayment(
  principal: number,
  annualInterestRate: number,
  tenureYears: number
): number {
  if (principal <= 0 || tenureYears <= 0) return 0;
  if (annualInterestRate === 0) return principal / tenureYears;
  
  const rate = annualInterestRate / 100;
  const payment = principal * (rate * Math.pow(1 + rate, tenureYears)) / (Math.pow(1 + rate, tenureYears) - 1);
  return payment;
}

/**
 * Calculate loan payment breakdown (interest vs principal)
 */
export function calculateLoanPaymentBreakdown(
  remainingBalance: number,
  annualPayment: number,
  annualInterestRate: number
): { interest: number; principal: number } {
  if (remainingBalance <= 0) return { interest: 0, principal: 0 };
  
  const interest = remainingBalance * (annualInterestRate / 100);
  const principal = Math.min(annualPayment - interest, remainingBalance);
  
  return { interest, principal };
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
  params: SimulationParams
): ExpenseOccurrence[] {
  const yearExpenses: ExpenseOccurrence[] = [];
  
  for (const expense of expenses) {
    if (doesExpenseOccurInYear(expense, year, modelFiscalYear)) {
      const yearsFromBase = year - modelFiscalYear;
      const inflatedCost = calculateInflatedCost(expense.cost, params.inflationRate, yearsFromBase);
      
      const loanAmount = calculateLoanAmount(
        inflatedCost,
        params.loanThresholdPercentage || 0,
        params.largeExpenseBaseline || 0,
        params.inflationRate,
        yearsFromBase
      );
      
      const outOfPocketAmount = inflatedCost - loanAmount;
      
      yearExpenses.push({
        expense,
        inflatedCost,
        loanAmount,
        outOfPocketAmount,
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
  
  // Track active loans across years
  const activeLoans: Map<string, { 
    originalAmount: number; 
    remainingBalance: number; 
    annualPayment: number;
    startYear: number;
  }> = new Map();
  
  for (let year = params.fiscalYear; year < params.fiscalYear + params.period; year++) {
    const expenseDetails = calculateYearExpenses(expenses, year, params.fiscalYear, params);
    
    // Calculate total out-of-pocket expenses (excluding loan portions)
    const totalOutOfPocketExpenses = expenseDetails.reduce((sum, detail) => sum + detail.outOfPocketAmount, 0);
    
    // Calculate total loans taken this year
    const totalLoansTaken = expenseDetails.reduce((sum, detail) => sum + detail.loanAmount, 0);
    
    // Add new loans to active loans tracking
    if (totalLoansTaken > 0) {
      const loanId = `${year}-loan`;
      const annualPayment = calculateAnnualLoanPayment(
        totalLoansTaken,
        params.loanInterestRate || 0,
        params.loanTenureYears || 10
      );
      
      activeLoans.set(loanId, {
        originalAmount: totalLoansTaken,
        remainingBalance: totalLoansTaken,
        annualPayment,
        startYear: year,
      });
    }
    
    // Calculate loan payments for existing loans
    let totalLoanPayments = 0;
    const currentYearLoanDetails: LoanDetail[] = [];
    
    for (const [loanId, loan] of activeLoans.entries()) {
      // Don't start payments until the year after the loan is taken
      if (year <= loan.startYear) continue;
      
      const paymentBreakdown = calculateLoanPaymentBreakdown(
        loan.remainingBalance,
        loan.annualPayment,
        params.loanInterestRate || 0
      );
      
      if (loan.remainingBalance > 0) {
        totalLoanPayments += paymentBreakdown.interest + paymentBreakdown.principal;
        
        currentYearLoanDetails.push({
          year: loan.startYear,
          originalAmount: loan.originalAmount,
          remainingBalance: loan.remainingBalance,
          payment: paymentBreakdown.interest + paymentBreakdown.principal,
          interest: paymentBreakdown.interest,
          principal: paymentBreakdown.principal,
        });
        
        // Update remaining balance
        loan.remainingBalance -= paymentBreakdown.principal;
        
        // Remove loan if fully paid
        if (loan.remainingBalance <= 0.01) {
          activeLoans.delete(loanId);
        }
      }
    }
    
    // Calculate collections (monthly fees * 12 months * housing units)
    const yearsFromBase = year - params.fiscalYear;
    // const inflatedMonthlyFee = calculateInflatedCost(
    //   params.monthlyReserveFeesPerHousingUnit,
    //   params.inflationRate,
    //   yearsFromBase
    // );
    const inflatedMonthlyFee = params.monthlyReserveFeesPerHousingUnit
    const collections = inflatedMonthlyFee * 12 * (params.housingUnits || 0);
    
    // Calculate safety net (percentage of out-of-pocket expenses only)
    const safetyNet = totalOutOfPocketExpenses * (params.safetyNetPercentage / 100);
    
    // Calculate closing balance
    // Balance = Opening + Collections + Loans Taken - Out-of-pocket Expenses - Safety Net - Loan Payments
    const closingBalance = currentBalance + collections + totalLoansTaken - totalOutOfPocketExpenses - safetyNet - totalLoanPayments;
    
    projections.push({
      year,
      openingBalance: currentBalance,
      expenses: totalOutOfPocketExpenses, // Only out-of-pocket portion
      collections,
      safetyNet,
      loansTaken: totalLoansTaken,
      loanPayments: totalLoanPayments,
      closingBalance,
      expenseDetails,
      loanDetails: currentYearLoanDetails,
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
  adjustments: Record<number, { 
    openingBalance?: number; 
    collections?: number; 
    expenses?: number; 
    safetyNet?: number;
    loansTaken?: number;
    loanPayments?: number;
  }>
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
      loansTaken: adjustment.loansTaken ?? projection.loansTaken,
      loanPayments: adjustment.loanPayments ?? projection.loanPayments,
    };
    
    // Recalculate closing balance with loan components
    adjustedProjection.closingBalance = 
      adjustedProjection.openingBalance + 
      adjustedProjection.collections + 
      adjustedProjection.loansTaken - 
      adjustedProjection.expenses - 
      adjustedProjection.safetyNet - 
      adjustedProjection.loanPayments;
    
    adjustedProjections[yearIndex] = adjustedProjection;
    
    // Update opening balances for subsequent years
    for (let i = yearIndex + 1; i < adjustedProjections.length; i++) {
      const prevClosingBalance = adjustedProjections[i - 1].closingBalance;
      adjustedProjections[i] = {
        ...adjustedProjections[i],
        openingBalance: prevClosingBalance,
        closingBalance: prevClosingBalance + 
          adjustedProjections[i].collections + 
          adjustedProjections[i].loansTaken - 
          adjustedProjections[i].expenses - 
          adjustedProjections[i].safetyNet - 
          adjustedProjections[i].loanPayments
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
  let adaptiveMinFee = params.minimumCollectionFee; // This will increase if zero fees cause deficits

  let optimizedProjections: YearProjection[] = JSON.parse(JSON.stringify(originalProjections));

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
  
  // ------------- IDENTIFY EXPENSE YEARS (MILESTONES) -------------
  const expenseIndices: number[] = [];
  optimizedProjections.forEach((p, idx) => {
    if (p.expenses > 0 || (p.loanPayments || 0) > 0) {
      expenseIndices.push(idx);
    }
  });
  const milestoneSet = new Set(expenseIndices);
  if (optimizedProjections.length > 0) {
    milestoneSet.add(optimizedProjections.length - 1);
  }
  const milestones = Array.from(milestoneSet).sort((a, b) => a - b);

  // ------------- ITERATIVELY REFINE PROJECTIONS -------------
  const requiredClosingBalances = new Map<number, number>();

  for (let iter = 0; iter < 10; iter++) { // Iterate to solve for inter-period dependencies
    // CRITICAL: Recalculate projections from scratch for each iteration
    // This ensures loan amounts/payments are consistent with the fee structure being tested
    let projectionsThisIteration = generateProjections(params, expenses);
    let lastProcessedIdx = -1;
    let openingBalance = params.startingAmount;
    let prevYearCollectionFee = 0;

    for (const milestoneIdx of milestones) {
      if (milestoneIdx <= lastProcessedIdx) continue;

      const periodYears = projectionsThisIteration.slice(lastProcessedIdx + 1, milestoneIdx + 1);
      
      // Use the required closing balance from the previous iteration to inform the current one
      const requiredFundsAtMilestone = requiredClosingBalances.get(milestoneIdx) ?? targetMinBalance;

      let baseFee = solveForBaseFee(
        openingBalance,
        periodYears,
        requiredFundsAtMilestone,
        maxIncreaseFactor,
        housingUnits,
        adaptiveMinFee // Use adaptive minimum fee that increases if deficits occur
      );

      if (lastProcessedIdx >= 0) {
        const maxAllowedFee = prevYearCollectionFee * (1 + maxIncreaseFactor);
        baseFee = Math.min(baseFee, maxAllowedFee);
      }
      baseFee = Math.max(baseFee, adaptiveMinFee);

      // Apply fees and update projections for the current period
      let feeThisYear = baseFee;
      for (let i = 0; i < periodYears.length; i++) {
        const globalYearIdx = lastProcessedIdx + 1 + i;
        const yearProj = projectionsThisIteration[globalYearIdx];
        
        yearProj.openingBalance = openingBalance;
        yearProj.collections = feeThisYear * 12 * housingUnits;
        yearProj.closingBalance =
          yearProj.openingBalance +
          yearProj.collections +
          (yearProj.loansTaken || 0) -
          yearProj.expenses -
          yearProj.safetyNet -
          (yearProj.loanPayments || 0);

        openingBalance = yearProj.closingBalance;
        prevYearCollectionFee = feeThisYear;
        
        // Handle fee progression: avoid the "zero trap" where 0 * (1 + increase) = 0 forever
        if (feeThisYear === 0) {
          // If current fee is zero, allow a minimal starting fee for next year if needed
          // This ensures the algorithm can recover from zero fees when cash needs arise
          feeThisYear = Math.max(adaptiveMinFee, 1.0); // Start with at least $1/month
        } else {
          feeThisYear *= (1 + maxIncreaseFactor);
        }
      }
      lastProcessedIdx = milestoneIdx;
    }

    const stats = getProjectionStats(projectionsThisIteration);
    if (stats.minBalance >= targetMinBalance) {
      optimizedProjections = projectionsThisIteration;
      break; // Success: no deficits found
    }

    // Deficit found: diagnose and fix
    const firstDeficitIdx = projectionsThisIteration.findIndex((p: YearProjection) => p.closingBalance < targetMinBalance);
    const deficitAmount = targetMinBalance - projectionsThisIteration[firstDeficitIdx].closingBalance;

    // Check if the deficit might be caused by zero/low fees allowing deficits in later years
    const avgFeeAcrossPeriod = projectionsThisIteration.reduce((sum, p) => 
      sum + (housingUnits > 0 ? p.collections / (12 * housingUnits) : 0), 0
    ) / projectionsThisIteration.length;
    
    if (avgFeeAcrossPeriod < 1.0) {
      // Very low average fee - increase adaptive minimum to prevent zero trap
      adaptiveMinFee = Math.max(adaptiveMinFee + 5.0, 5.0);
    }

    let culpritMilestoneIdx = -1;
    for (const m of milestones) {
      if (m < firstDeficitIdx) {
        culpritMilestoneIdx = m;
      } else {
        break;
      }
    }

    if (culpritMilestoneIdx !== -1) {
      const currentRequirement = requiredClosingBalances.get(culpritMilestoneIdx) ?? targetMinBalance;
      requiredClosingBalances.set(culpritMilestoneIdx, currentRequirement + deficitAmount);
    } else {
      // Deficit is in the first period, cannot be fixed by increasing prior period's closing balance.
      // Try increasing the adaptive minimum fee
      adaptiveMinFee = Math.max(adaptiveMinFee + 10.0, 10.0);
    }
    
    if (iter === 9) { // If we max out iterations, keep the last result
      optimizedProjections = projectionsThisIteration;
    }
  }
  
  // ------------- POST-LOOP SAFEGUARD -------------
  // If we still have deficits after 10 iterations, apply a uniform fee increase
  const finalStats = getProjectionStats(optimizedProjections);
  if (finalStats.negativeBalanceYears > 0) {
    const totalDeficit = Math.abs(finalStats.minBalance - targetMinBalance);
    const uniformFeeIncrease = (totalDeficit / params.period) / (12 * housingUnits);
    
    // Apply uniform increase to all years
    for (let i = 0; i < optimizedProjections.length; i++) {
      const additionalCollections = uniformFeeIncrease * 12 * housingUnits;
      optimizedProjections[i].collections += additionalCollections;
      
      // Recalculate closing balances
      if (i === 0) {
        optimizedProjections[i].closingBalance = 
          params.startingAmount + 
          optimizedProjections[i].collections + 
          (optimizedProjections[i].loansTaken || 0) - 
          optimizedProjections[i].expenses - 
          optimizedProjections[i].safetyNet - 
          (optimizedProjections[i].loanPayments || 0);
      } else {
        optimizedProjections[i].openingBalance = optimizedProjections[i - 1].closingBalance;
        optimizedProjections[i].closingBalance = 
          optimizedProjections[i].openingBalance + 
          optimizedProjections[i].collections + 
          (optimizedProjections[i].loansTaken || 0) - 
          optimizedProjections[i].expenses - 
          optimizedProjections[i].safetyNet - 
          (optimizedProjections[i].loanPayments || 0);
      }
    }
  }

  // ------------- FINALISE -------------
  const optimizedStats = getProjectionStats(optimizedProjections);
  const yearlyAdjustments: YearFeeAdjustment[] = [];

  for (let i = 0; i < optimizedProjections.length; i++) {
    const optimizedCollections = optimizedProjections[i].collections;
    const originalCollections = originalProjections[i].collections;
    const optimizedMonthlyFee = housingUnits > 0 ? optimizedCollections / (12 * housingUnits) : 0;
    const originalMonthlyFee = housingUnits > 0 ? originalCollections / (12 * housingUnits) : 0;

    if (Math.abs(originalMonthlyFee - optimizedMonthlyFee) > 1e-6) {
      yearlyAdjustments.push({
        year: optimizedProjections[i].year,
        originalFee: originalMonthlyFee,
        optimizedFee: optimizedMonthlyFee,
        feeIncrease: optimizedMonthlyFee - originalMonthlyFee,
        feeIncreasePercentage: originalMonthlyFee === 0 ? 100 : ((optimizedMonthlyFee - originalMonthlyFee) / originalMonthlyFee) * 100,
        reason: 'Optimised to satisfy upcoming expense period',
      });
    }
  }

  const optimizedFirstYearFee = optimizedProjections.length > 0 && housingUnits > 0
    ? optimizedProjections[0].collections / (12 * housingUnits)
    : params.monthlyReserveFeesPerHousingUnit;

  const result: OptimizationResult = {
    optimizedParams: params,
    projections: optimizedProjections,
    stats: optimizedStats,
    changes: {
      originalMonthlyFee: params.monthlyReserveFeesPerHousingUnit,
      optimizedMonthlyFee: optimizedFirstYearFee,
      feeIncrease: optimizedFirstYearFee - params.monthlyReserveFeesPerHousingUnit,
      feeIncreasePercentage:
        params.monthlyReserveFeesPerHousingUnit === 0
          ? (optimizedFirstYearFee > 0 ? 100 : 0)
          : ((optimizedFirstYearFee - params.monthlyReserveFeesPerHousingUnit) /
              params.monthlyReserveFeesPerHousingUnit) * 100,
    },
    yearlyAdjustments,
    hasYearlyAdjustments: yearlyAdjustments.length > 0,
    recommendations: yearlyAdjustments.length > 0 ? ['Fee schedule adjusted to meet projected expenses and maintain a positive balance.'] : ['Original fee schedule deemed sufficient.'],
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
  const totalLoansTaken = projections.reduce((sum, p) => sum + (p.loansTaken || 0), 0);
  const totalLoanPayments = projections.reduce((sum, p) => sum + (p.loanPayments || 0), 0);
  const negativeBalanceYears = projections.filter(p => p.closingBalance < 0).length;
  
  return {
    minBalance,
    maxBalance,
    finalBalance,
    totalCollections,
    totalExpenses,
    totalLoansTaken,
    totalLoanPayments,
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

  // Calculate reasonable bounds based on period cash flows
  const totalOutflows = periodYears.reduce((sum, yr) => 
    sum + yr.expenses + yr.safetyNet + (yr.loanPayments || 0), 0
  );
  const totalInflows = periodYears.reduce((sum, yr) => 
    sum + (yr.loansTaken || 0), 0
  );
  
  // Calculate future loan payments that might not be captured in current period
  // This helps avoid the zero-trap by considering ongoing debt service obligations
  const futureLoanPaymentEstimate = periodYears.reduce((sum, yr) => 
    sum + (yr.loansTaken || 0) * 0.1, 0 // Rough estimate: 10% of loans taken as annual payment
  );
  
  const practicalMinFee = Math.max(minFee, 0);
  
  // Calculate net cash need (what collections must cover after loans and opening balance)
  // Include future loan payment estimate to prevent zero-trap scenarios
  const netCashNeed = Math.max(0, 
    totalOutflows + futureLoanPaymentEstimate - totalInflows - openingBalance + requiredFundsAtMilestone
  );
  const estimatedAnnualCollections = netCashNeed / Math.max(periodYears.length, 1);
  const estimatedMonthlyFee = estimatedAnnualCollections / (12 * housingUnits);
  
  // Set more conservative bounds that account for loan-related cash flows
  let low = practicalMinFee;
  let high = Math.max(estimatedMonthlyFee * 1.5, Math.max(practicalMinFee + 10, 50));

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const minBalanceInPeriod = simulatePeriodMinBalance(
      openingBalance,
      mid,
      periodYears,
      maxIncreaseFactor,
      housingUnits
    );

    if (minBalanceInPeriod >= requiredFundsAtMilestone) {
      // we collected too much – try lower fee
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.max(high, practicalMinFee); // ensure we never go below practical minimum
}

function simulatePeriodMinBalance(
  openingBalance: number,
  baseFee: number,
  periodYears: YearProjection[],
  maxIncreaseFactor: number,
  housingUnits: number
): number {
  if (periodYears.length === 0) {
    return openingBalance;
  }
  let balance = openingBalance;
  let fee = baseFee;
  let minBalance = Infinity;

  for (let i = 0; i < periodYears.length; i++) {
    const yr = periodYears[i];
    const collections = fee * 12 * housingUnits;
    balance = balance + collections + (yr.loansTaken || 0) - yr.expenses - yr.safetyNet - (yr.loanPayments || 0);
    minBalance = Math.min(minBalance, balance);
    
    // Handle fee progression: avoid the "zero trap"
    if (fee === 0) {
      fee = Math.max(1.0, baseFee); // Reset to a minimal fee if zero
    } else {
      fee = fee * (1 + maxIncreaseFactor);
    }
  }

  return minBalance;
}
