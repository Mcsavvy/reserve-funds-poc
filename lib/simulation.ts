import { Model, Expense, Investment } from './db-schemas';
import { formatCurrency } from './db-utils';

export interface YearProjection {
  year: number;
  openingBalance: number;
  expenses: number;
  collections: number;
  safetyNet: number;
  loansTaken: number;
  loanPayments: number;
  availableToInvest: number;
  investedAmount: number;
  investmentLiquidations: LiquidationRecord[];
  projectedNetEarnings: number;
  closingBalance: number;
  expenseDetails: ExpenseOccurrence[];
  loanDetails: LoanDetail[];
  investmentDetails: InvestmentLiquidation[];
  simulationInvestmentDetails?: {
    ongoingInvestments: Array<{
      investment: any; // SimulationInvestment type
      startYear: number;
      currentValue: number;
      isLiquidated: boolean;
      liquidationYear?: number;
    }>;
    liquidatedInvestments: Array<{
      investment: any; // SimulationInvestment type
      startYear: number;
      currentValue: number;
      isLiquidated: boolean;
      liquidationYear?: number;
    }>;
    totalInterest: number;
  };
}

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

export interface InvestmentLiquidation {
  investment: Investment;
  originalAmount: number;
  liquidatedAmount: number;
  interestEarned: number;
  yearsHeld: number;
}

export interface ActiveInvestment {
  investment: Investment;
  startYear: number;
  currentValue: number;
  annualEarnings: number;
  isLiquidated: boolean;
  liquidationYear?: number;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalLiquidations: number;
  totalEarnings: number;
  activeInvestments: ActiveInvestment[];
  liquidatedInvestments: ActiveInvestment[];
}

export type SimulationParams = Omit<Model, 'id' | 'createdAt' | 'updatedAt'>;

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
 * In normalization mode, loan amounts are adjusted to prevent deficits
 */
export function calculateLoanAmount(
  inflatedCost: number,
  loanThresholdPercentage: number,
  largeExpenseBaseline: number,
  inflationRate: number,
  yearsFromBase: number,
  isNormalized: boolean = false,
  availableCash: number = 0,
  maxFeeIncrease: number = 0,
  currentFee: number = 0,
  housingUnits: number = 0
): number {
  if (!isLargeExpense(inflatedCost, largeExpenseBaseline, inflationRate, yearsFromBase)) {
    return 0;
  }
  
  if (!isNormalized) {
    // Original logic: fixed percentage of large expenses
  return inflatedCost * (loanThresholdPercentage / 100);
  }
  
  // Normalized logic: take strategic loans to prevent deficits
  // In normalized mode, we calculate loan amount to ensure we don't create deficits
  // but still prefer fee increases when possible
  
  // Calculate the safety net needed for this expense
  const safetyNetForExpense = inflatedCost * 0.10; // 10% safety net
  const totalCashNeeded = inflatedCost + safetyNetForExpense;
  
  // If available cash can cover the expense + safety net, no loan needed
  if (availableCash >= totalCashNeeded) {
    return 0;
  }
  
  // Calculate shortfall
  const shortfall = totalCashNeeded - availableCash;
  
  // Check if fee increase can cover part of the shortfall
  const maxPossibleFee = currentFee * (1 + maxFeeIncrease / 100);
  const currentAnnualCollections = currentFee * 12 * housingUnits;
  const maxPossibleCollections = maxPossibleFee * 12 * housingUnits;
  const additionalCollectionCapacity = maxPossibleCollections - currentAnnualCollections;
  
  // If fee increase can cover the shortfall, no loan needed
  if (additionalCollectionCapacity >= shortfall) {
    return 0;
  }
  
  // Calculate loan amount for the remaining shortfall after maximum fee increase
  const remainingShortfall = shortfall - additionalCollectionCapacity;
  const maxLoanAmount = inflatedCost * (loanThresholdPercentage / 100);
  
  // Take the minimum of what we need and what we're allowed to borrow
  return Math.min(remainingShortfall, maxLoanAmount);
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
 * Determine if an investment is liquidated in a given year
 */
export function isInvestmentLiquidatedInYear(
  investment: Investment,
  year: number
): boolean {
  // Investment is liquidated when it reaches maturity (year started + terms)
  return year === investment.yearStarted + investment.terms;
}

/**
 * Calculate the liquidated amount for an investment
 */
export function calculateInvestmentLiquidation(
  investment: Investment,
  year: number
): InvestmentLiquidation {
  const yearsHeld = year - investment.yearStarted;
  
  // Calculate compound interest for CD and T-Bonds
  let interestEarned: number;
  if (investment.investmentType === 'CD' || investment.investmentType === 'T-Bonds') {
    // Compound interest: Principal * (1 + rate)^years - Principal
    const compoundAmount = investment.amountInvested * Math.pow(1 + (investment.annualInterestRate / 100), yearsHeld);
    interestEarned = compoundAmount - investment.amountInvested;
  } else {
    // Simple interest for other types
    interestEarned = investment.amountInvested * (investment.annualInterestRate / 100) * yearsHeld;
  }
  
  const liquidatedAmount = investment.amountInvested + interestEarned;
  
  return {
    investment,
    originalAmount: investment.amountInvested,
    liquidatedAmount,
    interestEarned,
    yearsHeld,
  };
}

/**
 * Calculate annual earnings for an active investment
 */
export function calculateAnnualInvestmentEarnings(
  investment: Investment,
  currentValue: number
): number {
  return currentValue * (investment.annualInterestRate / 100);
}

/**
 * Calculate current value of an investment with compound interest
 */
export function calculateInvestmentCurrentValue(
  investment: Investment,
  year: number
): number {
  const yearsHeld = year - investment.yearStarted;
  
  if (investment.investmentType === 'CD' || investment.investmentType === 'T-Bonds') {
    // Compound interest
    return investment.amountInvested * Math.pow(1 + (investment.annualInterestRate / 100), yearsHeld);
  } else {
    // Simple interest
    return investment.amountInvested * (1 + (investment.annualInterestRate / 100) * yearsHeld);
  }
}

/**
 * Track active investments and calculate their performance
 */
export function trackActiveInvestments(
  investments: Investment[],
  year: number
): InvestmentSummary {
  const activeInvestments: ActiveInvestment[] = [];
  const liquidatedInvestments: ActiveInvestment[] = [];
  let totalInvested = 0;
  let totalLiquidations = 0;
  let totalEarnings = 0;
  
  for (const investment of investments) {
    if (investment.yearStarted <= year) {
      const currentValue = calculateInvestmentCurrentValue(investment, year);
      const annualEarnings = calculateAnnualInvestmentEarnings(investment, currentValue);
      const isLiquidated = year >= investment.yearStarted + investment.terms;
      
      const activeInvestment: ActiveInvestment = {
        investment,
        startYear: investment.yearStarted,
        currentValue,
        annualEarnings,
        isLiquidated,
        liquidationYear: isLiquidated ? investment.yearStarted + investment.terms : undefined,
      };
      
      if (isLiquidated) {
        liquidatedInvestments.push(activeInvestment);
        totalLiquidations += currentValue;
        totalEarnings += currentValue - investment.amountInvested;
      } else {
        activeInvestments.push(activeInvestment);
        totalInvested += investment.amountInvested;
        totalEarnings += annualEarnings;
      }
    }
  }
  
  return {
    totalInvested,
    totalLiquidations,
    totalEarnings,
    activeInvestments,
    liquidatedInvestments,
  };
}

/**
 * Calculate expenses for a specific year
 */
export function calculateYearExpenses(
  expenses: Expense[],
  year: number,
  modelFiscalYear: number,
  params: SimulationParams,
  isNormalized: boolean = false,
  availableCash: number = 0,
  currentFee: number = 0
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
        yearsFromBase,
        isNormalized,
        availableCash,
        params.maximumAllowableFeeIncrease || 0,
        currentFee,
        params.housingUnits || 0
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
 * Calculate investment liquidations for a specific year
 */
export function calculateYearInvestmentLiquidations(
  investments: Investment[],
  year: number
): InvestmentLiquidation[] {
  const yearLiquidations: InvestmentLiquidation[] = [];
  
  for (const investment of investments) {
    if (isInvestmentLiquidatedInYear(investment, year)) {
      const liquidation = calculateInvestmentLiquidation(investment, year);
      yearLiquidations.push(liquidation);
    }
  }
  
  return yearLiquidations;
}

/**
 * Generate year-by-year projections for a model
 */
export function generateProjections(
  params: SimulationParams,
  expenses: Expense[],
  investments: Investment[] = [],
  isNormalized: boolean = false
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
  
  // Track current fee for normalized calculations
  let currentMonthlyFee = params.monthlyReserveFeesPerHousingUnit;
  
  // Track investments across years
  const activeInvestments: Map<string, ActiveInvestment> = new Map();
  
  for (let year = params.fiscalYear; year < params.fiscalYear + params.period; year++) {
    // Calculate available cash before expenses
    const availableCash = currentBalance;
    
    const expenseDetails = calculateYearExpenses(
      expenses, 
      year, 
      params.fiscalYear, 
      params, 
      isNormalized, 
      availableCash, 
      currentMonthlyFee
    );

    const investmentDetails = calculateYearInvestmentLiquidations(investments, year);
    
    // Track investments for this year
    const investmentSummary = trackActiveInvestments(investments, year);
    
    // Add new investments that start this year
    for (const investment of investments) {
      if (investment.yearStarted === year) {
        const activeInvestment: ActiveInvestment = {
          investment,
          startYear: investment.yearStarted,
          currentValue: investment.amountInvested,
          annualEarnings: calculateAnnualInvestmentEarnings(investment, investment.amountInvested),
          isLiquidated: false,
        };
        activeInvestments.set(investment.id, activeInvestment);
      }
    }
    
    // Update existing investments and check for liquidations
    for (const [investmentId, activeInvestment] of activeInvestments.entries()) {
      if (year > activeInvestment.startYear) {
        const currentValue = calculateInvestmentCurrentValue(activeInvestment.investment, year);
        const annualEarnings = calculateAnnualInvestmentEarnings(activeInvestment.investment, currentValue);
        const isLiquidated = year >= activeInvestment.startYear + activeInvestment.investment.terms;
        
        activeInvestment.currentValue = currentValue;
        activeInvestment.annualEarnings = annualEarnings;
        activeInvestment.isLiquidated = isLiquidated;
        
        if (isLiquidated) {
          activeInvestment.liquidationYear = year;
        }
      }
    }
    
    // Calculate total out-of-pocket expenses (excluding loan portions)
    let totalOutOfPocketExpenses = expenseDetails.reduce((sum, detail) => sum + detail.outOfPocketAmount, 0);
    
    // Calculate total loans taken this year
    let totalLoansTaken = expenseDetails.reduce((sum, detail) => sum + detail.loanAmount, 0);
    
    // Calculate total investment liquidations this year
    const totalInvestmentLiquidations = investmentDetails.reduce((sum, detail) => sum + detail.liquidatedAmount, 0);
    
    // Convert to LiquidationRecord format
    const liquidationRecords: LiquidationRecord[] = investmentDetails.map(detail => ({
      investmentId: detail.investment.id,
      investmentName: `${detail.investment.investmentType} Investment`,
      startYear: detail.investment.yearStarted,
      liquidationYear: year,
      originalAmount: detail.originalAmount,
      liquidatedAmount: detail.liquidatedAmount,
      yearsHeld: detail.yearsHeld,
      interestEarned: detail.interestEarned,
      penaltyApplied: 0,
      isEarlyLiquidation: false
    }));
    
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
    
    // Calculate collections
    let collections = currentMonthlyFee * 12 * (params.housingUnits || 0);
    
    // In normalized mode, we need to recalculate expenses and loans with adjusted fees
    if (isNormalized) {
      // In optimization mode: don't consider max fee increase % in any year
      // Can set fees to any level to match deficit
      
      // Recalculate expense details with current fee and available cash
      const recalculatedExpenseDetails = calculateYearExpenses(
        expenses, 
        year, 
        params.fiscalYear, 
        params, 
        isNormalized, 
        currentBalance + collections, // Available cash including current collections
        currentMonthlyFee
      );
      
      // Update calculations with recalculated expenses
      const recalculatedOutOfPocket = recalculatedExpenseDetails.reduce((sum, detail) => sum + detail.outOfPocketAmount, 0);
      const recalculatedLoansTaken = recalculatedExpenseDetails.reduce((sum, detail) => sum + detail.loanAmount, 0);
      
      // Calculate total cash needed including safety net
      const totalCashNeeded = recalculatedOutOfPocket + (recalculatedOutOfPocket * (params.safetyNetPercentage / 100)) + totalLoanPayments;
      const totalAvailable = currentBalance + collections; // Loans do NOT add to available cash
      
      // If there's still a shortfall, increase fees without any percentage limit
      if (totalAvailable < totalCashNeeded) {
        const shortfall = totalCashNeeded - totalAvailable;
        const additionalCollectionsNeeded = shortfall;
        const newCollections = collections + additionalCollectionsNeeded;
        
        // Apply minimum collection fee constraint
        const minCollections = (params.minimumCollectionFee || 0) * 12 * (params.housingUnits || 0);
        collections = Math.max(newCollections, minCollections);
        currentMonthlyFee = collections / (12 * (params.housingUnits || 1));
        
        // Recalculate with updated fees one more time
        const finalExpenseDetails = calculateYearExpenses(
          expenses, 
          year, 
          params.fiscalYear, 
          params, 
          isNormalized, 
          currentBalance + collections,
          currentMonthlyFee
        );
        
        // Update final values for this year
        expenseDetails.length = 0; // Clear array
        expenseDetails.push(...finalExpenseDetails); // Add recalculated values
        
        // Recalculate totals with updated expense details
        totalOutOfPocketExpenses = expenseDetails.reduce((sum, detail) => sum + detail.outOfPocketAmount, 0);
        totalLoansTaken = expenseDetails.reduce((sum, detail) => sum + detail.loanAmount, 0);
        
        // Update active loans if loan amounts changed
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
      }
    }
    
    // Update fee for next year (apply intelligent fee adjustments)
    if (!isNormalized) {
      const minimumFee = params.minimumCollectionFee || 0;
      
      // Check for upcoming major expenses in the next 5 years
      let hasUpcomingMajorExpenses = false;
      let totalUpcomingExpenses = 0;
      const lookAheadYears = 5; // Look ahead 5 years for fee planning
      
      for (let futureYear = year + 1; futureYear <= year + lookAheadYears && futureYear < params.fiscalYear + params.period; futureYear++) {
        const futureExpenseDetails = calculateYearExpenses(
          expenses, 
          futureYear, 
          params.fiscalYear, 
          params, 
          false, // Not normalized for this check
          currentBalance, 
          currentMonthlyFee
        );
        const futureExpenses = futureExpenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
        totalUpcomingExpenses += futureExpenses;
        
        if (futureExpenses > currentBalance * 0.1) { // If future expense > 10% of current balance
          hasUpcomingMajorExpenses = true;
        }
      }
      
      // Calculate current financial situation with current fee
      const currentCollections = currentMonthlyFee * 12 * (params.housingUnits || 0);
      const currentSafetyNet = totalOutOfPocketExpenses * (params.safetyNetPercentage / 100);
      const currentLossInPurchasePower = currentBalance > 0 ? currentBalance * (params.inflationRate / 100) : 0;
      const currentClosingBalance = currentBalance + currentCollections + totalInvestmentLiquidations - 
        totalOutOfPocketExpenses - currentSafetyNet - totalLoanPayments - currentLossInPurchasePower;
      
      // Calculate maximum allowed fee increase
      let maxAllowedFee = currentMonthlyFee;
      if (params.maximumAllowableFeeIncrease > 0) {
        maxAllowedFee = currentMonthlyFee * (1 + params.maximumAllowableFeeIncrease / 100);
      }
      
      // Intelligent fee adjustment decision
      if (currentClosingBalance < 0) {
        // DEFICIT: Increase fees up to maximum allowed
        const deficitAmount = Math.abs(currentClosingBalance);
        const additionalCollectionsNeeded = deficitAmount * 1.1; // 10% buffer
        const additionalMonthlyFeeNeeded = additionalCollectionsNeeded / (12 * (params.housingUnits || 1));
        const targetFee = currentMonthlyFee + additionalMonthlyFeeNeeded;
        
        currentMonthlyFee = Math.min(targetFee, maxAllowedFee);
      }
      else if (hasUpcomingMajorExpenses && currentClosingBalance < totalUpcomingExpenses * 0.5) {
        // UPCOMING EXPENSES: Prepare by increasing fees gradually
        const preparationNeeded = (totalUpcomingExpenses * 0.5) - currentClosingBalance;
        const preparationFeeIncrease = (preparationNeeded / lookAheadYears) / (12 * (params.housingUnits || 1));
        const targetFee = currentMonthlyFee + preparationFeeIncrease;
        
        currentMonthlyFee = Math.min(targetFee, maxAllowedFee);
      }
      else if (currentClosingBalance > (totalOutOfPocketExpenses + currentSafetyNet) * 3) {
        // LARGE SURPLUS: Only reduce if very large surplus and no major upcoming expenses
        if (!hasUpcomingMajorExpenses) {
          const surplusAmount = currentClosingBalance;
          const maxCollectionReduction = surplusAmount * 0.3; // Only reduce 30% of surplus
          const maxFeeReduction = maxCollectionReduction / (12 * (params.housingUnits || 1));
          const targetFee = Math.max(minimumFee, currentMonthlyFee - maxFeeReduction);
          
          if (targetFee < currentMonthlyFee) {
            currentMonthlyFee = targetFee;
          }
        }
      }
      else {
        // STABLE SITUATION: Apply minimal inflation adjustment only if allowed
        if (params.maximumAllowableFeeIncrease > 0) {
          // Very conservative inflation adjustment - only 50% of inflation rate
          const conservativeInflationIncrease = currentMonthlyFee * (params.inflationRate / 100) * 0.5;
          const targetFee = currentMonthlyFee + conservativeInflationIncrease;
          
          currentMonthlyFee = Math.min(targetFee, maxAllowedFee);
        }
        // If Max Fee Increase % is 0, keep current fee unchanged
      }
      
      // Update collections with the adjusted fee
      collections = currentMonthlyFee * 12 * (params.housingUnits || 0);
    } else {
      // Normalized logic: no fee increase constraints - fees are set to match deficit
      // Keep current fee as is (already optimized in the normalization logic above)
    }
    
    // Calculate safety net (percentage of total expenses including loans in normalized mode)
    let safetyNet;
    if (isNormalized) {
      // In normalized mode, safety net is based on total expenses (including loan portions)
      const totalExpenses = expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
      safetyNet = totalExpenses * (params.safetyNetPercentage / 100);
    } else {
      // Original logic: safety net based on out-of-pocket only
      safetyNet = totalOutOfPocketExpenses * (params.safetyNetPercentage / 100);
    }
    
    // Calculate loss in purchase power (inflation effect on opening balance)
    const lossInPurchasePower = currentBalance > 0 ? currentBalance * (params.inflationRate / 100) : 0;
    
    // Calculate investment amounts for this year
    const yearInvestments = investments.filter(inv => inv.yearStarted === year);
    const investedAmount = yearInvestments.reduce((sum, inv) => sum + inv.amountInvested, 0);
    
    // Calculate projected net earnings from active investments
    const projectedNetEarnings = Array.from(activeInvestments.values())
      .filter(inv => !inv.isLiquidated)
      .reduce((sum, inv) => sum + inv.annualEarnings, 0);
    
    // Calculate available to invest (cannot be negative)
    const availableToInvest = Math.max(0, currentBalance + collections + totalInvestmentLiquidations - totalOutOfPocketExpenses - safetyNet - totalLoanPayments - lossInPurchasePower);
    
    // Calculate closing balance
    // Balance = Opening + Collections + Investment Liquidations - Out-of-pocket Expenses - Safety Net - Loan Payments - Loss in Purchase Power
    // Note: Loans are NOT added to balance - they directly pay part of expenses
    const closingBalance = currentBalance + collections + totalInvestmentLiquidations - totalOutOfPocketExpenses - safetyNet - totalLoanPayments - lossInPurchasePower;
    
    projections.push({
      year,
      openingBalance: currentBalance,
      expenses: totalOutOfPocketExpenses, // Only out-of-pocket portion
      collections,
      safetyNet,
      loansTaken: totalLoansTaken,
      loanPayments: totalLoanPayments,
      availableToInvest,
      investedAmount,
      investmentLiquidations: liquidationRecords,
      projectedNetEarnings,
      closingBalance,
      expenseDetails,
      loanDetails: currentYearLoanDetails,
      investmentDetails,
    });
    
    // Update current balance for next year
    currentBalance = closingBalance;
  }
  
  // Apply normalization optimization for normalized projections
  if (isNormalized && projections.length > 0) {
    // Find the total deficit across all years
    let totalDeficit = 0;
    let yearsWithDeficit = 0;
    
    for (const projection of projections) {
      if (projection.closingBalance < 0) {
        totalDeficit += Math.abs(projection.closingBalance);
        yearsWithDeficit++;
      }
    }
    
    // If there are deficits, we need to increase fees uniformly across all years
    if (totalDeficit > 0) {
      // Calculate required additional collections per year to eliminate all deficits
      const additionalCollectionsPerYear = (totalDeficit * 1.2) / projections.length; // Add 20% buffer for safety
      
      // Apply iterative optimization to ensure all deficits are eliminated
      const maxIterations = 5;
      let iteration = 0;
      
      while (iteration < maxIterations) {
        iteration++;
        let currentBalance = params.startingAmount;
        let hasDeficit = false;
        
        for (let i = 0; i < projections.length; i++) {
          const projection = projections[i];
          
          // Update opening balance
          projection.openingBalance = currentBalance;
          
          // If this is the first iteration or we still have deficits, increase collections
          if (iteration === 0) {
            const originalCollections = projection.collections;
            const newCollections = originalCollections + additionalCollectionsPerYear;
            projection.collections = newCollections;
          }
          
          // Recalculate available to invest
          const lossInPurchasePower = projection.openingBalance > 0 ? projection.openingBalance * (params.inflationRate / 100) : 0;
          const liquidationsTotal = Array.isArray(projection.investmentLiquidations) 
            ? projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
            : (projection.investmentLiquidations || 0);
          projection.availableToInvest = Math.max(0, projection.openingBalance + projection.collections + liquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower);
          
          // Recalculate closing balance
          projection.closingBalance = projection.openingBalance + projection.collections + liquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower;
          
          // Check if this year still has a deficit
          if (projection.closingBalance < 0) {
            hasDeficit = true;
            // Add extra collections to this specific year to eliminate its deficit
            const extraCollections = Math.abs(projection.closingBalance) * 1.1; // 10% buffer
            projection.collections += extraCollections;
            
            // Recalculate with extra collections
            const newLiquidationsTotal = Array.isArray(projection.investmentLiquidations) 
              ? projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
              : (projection.investmentLiquidations || 0);
            projection.availableToInvest = Math.max(0, projection.openingBalance + projection.collections + newLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower);
            projection.closingBalance = projection.openingBalance + projection.collections + newLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower;
          }
          
          // Update current balance for next iteration
          currentBalance = projection.closingBalance;
        }
        
        // If no deficits remain, break out of the loop
        if (!hasDeficit) {
          break;
        }
        
        iteration++;
      }
    }
    
    // Apply cash reserve threshold management if closing balance is too high
    const finalProjection = projections[projections.length - 1];
    const targetCashReserve = finalProjection.closingBalance * (params.cashReserveThresholdPercentage / 100);
    
    if (finalProjection.closingBalance > targetCashReserve * 3) {
      // Reduce fees across all years to bring balance closer to target
      const excessAmount = finalProjection.closingBalance - targetCashReserve;
      const totalCollections = projections.reduce((sum, p) => sum + p.collections, 0);
      const reductionFactor = Math.max(0.3, 1 - (excessAmount / totalCollections));
      
      let currentBalance = params.startingAmount;
      
      // Apply reduction to all years
      for (let i = 0; i < projections.length; i++) {
        const projection = projections[i];
        projection.openingBalance = currentBalance;
        
        const newCollections = projection.collections * reductionFactor;
        const minCollections = (params.minimumCollectionFee || 0) * 12 * (params.housingUnits || 0);
        
        if (newCollections >= minCollections) {
          projection.collections = newCollections;
          
          // Recalculate derived values
          const lossInPurchasePower = projection.openingBalance > 0 ? projection.openingBalance * (params.inflationRate / 100) : 0;
          const reducedLiquidationsTotal = Array.isArray(projection.investmentLiquidations) 
            ? projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
            : (projection.investmentLiquidations || 0);
          projection.availableToInvest = Math.max(0, projection.openingBalance + projection.collections + reducedLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower);
          projection.closingBalance = projection.openingBalance + projection.collections + reducedLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower;
        }
        
        currentBalance = projection.closingBalance;
      }
    }
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
    availableToInvest?: number;
    investedAmount?: number;
    investmentLiquidations?: LiquidationRecord[];
    projectedNetEarnings?: number;
  }>,
  params: SimulationParams
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
      availableToInvest: adjustment.availableToInvest ?? projection.availableToInvest,
      investedAmount: adjustment.investedAmount ?? projection.investedAmount,
      investmentLiquidations: adjustment.investmentLiquidations ?? projection.investmentLiquidations,
      projectedNetEarnings: adjustment.projectedNetEarnings ?? projection.projectedNetEarnings,
    };
    
    // Calculate total investment liquidations for closing balance
    let totalInvestmentLiquidations = 0;
    if (Array.isArray(adjustedProjection.investmentLiquidations)) {
      // Handle array of liquidation objects
      totalInvestmentLiquidations = adjustedProjection.investmentLiquidations.reduce((sum: number, liquidation: any) => {
        return sum + (liquidation.liquidatedAmount || 0);
      }, 0);
    } else {
      // Handle legacy number format
      totalInvestmentLiquidations = adjustedProjection.investmentLiquidations as any || 0;
    }
    
    // Recalculate closing balance with all components (loans do NOT add to balance)
    const lossInPurchasePower = adjustedProjection.openingBalance > 0 ? 
      adjustedProjection.openingBalance * (params.inflationRate / 100) : 0;
    adjustedProjection.closingBalance = 
      adjustedProjection.openingBalance + 
      adjustedProjection.collections + 
      totalInvestmentLiquidations - 
      adjustedProjection.expenses - 
      adjustedProjection.safetyNet - 
      adjustedProjection.loanPayments - 
      lossInPurchasePower;
    
    adjustedProjections[yearIndex] = adjustedProjection;
    
    // Update opening balances for subsequent years
    for (let i = yearIndex + 1; i < adjustedProjections.length; i++) {
      const prevClosingBalance = adjustedProjections[i - 1].closingBalance;
      const lossInPurchasePower = prevClosingBalance > 0 ? 
        prevClosingBalance * (params.inflationRate / 100) : 0;
      
      // Calculate investment liquidations for this year
      let yearInvestmentLiquidations = 0;
      const yearLiquidations = adjustedProjections[i].investmentLiquidations;
      if (Array.isArray(yearLiquidations)) {
        yearInvestmentLiquidations = yearLiquidations.reduce((sum: number, liquidation: any) => {
          return sum + (liquidation.liquidatedAmount || 0);
        }, 0);
      } else {
        yearInvestmentLiquidations = yearLiquidations as any || 0;
      }
      
      adjustedProjections[i] = {
        ...adjustedProjections[i],
        openingBalance: prevClosingBalance,
        closingBalance: prevClosingBalance + 
          adjustedProjections[i].collections + 
          yearInvestmentLiquidations - 
          adjustedProjections[i].expenses - 
          adjustedProjections[i].safetyNet - 
          adjustedProjections[i].loanPayments - 
          lossInPurchasePower
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
 * Apply normalization to existing projections
 */
function applyNormalizationToProjections(projections: YearProjection[], params: SimulationParams): void {
  const minimumFee = params.minimumCollectionFee || 0;
  const minimumCollections = minimumFee * 12 * (params.housingUnits || 1);
  
  // Find the total deficit across all years
  let totalDeficit = 0;
  let yearsWithDeficit = 0;
  
  for (const projection of projections) {
    if (projection.closingBalance < 0) {
      totalDeficit += Math.abs(projection.closingBalance);
      yearsWithDeficit++;
    }
  }
  
  if (totalDeficit > 0) {
    // Calculate required additional collections per year to eliminate all deficits
    const additionalCollectionsPerYear = (totalDeficit * 1.2) / projections.length; // Add 20% buffer for safety
    
    // Apply iterative optimization to ensure all deficits are eliminated
    const maxIterations = 5;
    let iteration = 0;
    
    while (iteration < maxIterations) {
      iteration++;
      let currentBalance = params.startingAmount;
      let hasDeficit = false;
      
      for (let i = 0; i < projections.length; i++) {
        const projection = projections[i];
        
        // Update opening balance
        projection.openingBalance = currentBalance;
        
        // If this is the first iteration, increase collections uniformly
        if (iteration === 1) {
          projection.collections = projection.collections + additionalCollectionsPerYear;
        }
        
        // Ensure collections meet minimum requirement
        projection.collections = Math.max(projection.collections, minimumCollections);
        
        // Recalculate available to invest
        const lossInPurchasePower = projection.openingBalance > 0 ? projection.openingBalance * (params.inflationRate / 100) : 0;
        const projLiquidationsTotal = Array.isArray(projection.investmentLiquidations) 
          ? projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
          : (projection.investmentLiquidations || 0);
        projection.availableToInvest = Math.max(0, projection.openingBalance + projection.collections + projLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower);
        
        // Recalculate closing balance
        projection.closingBalance = projection.openingBalance + projection.collections + projLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower;
        
        // Check if this year still has a deficit
        if (projection.closingBalance < 0) {
          hasDeficit = true;
          // Add extra collections to this specific year to eliminate its deficit
          const extraCollections = Math.abs(projection.closingBalance) * 1.1; // 10% buffer
          projection.collections += extraCollections;
          
          // Recalculate with extra collections
          const finalLiquidationsTotal = Array.isArray(projection.investmentLiquidations) 
            ? projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
            : (projection.investmentLiquidations || 0);
          projection.availableToInvest = Math.max(0, projection.openingBalance + projection.collections + finalLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower);
          projection.closingBalance = projection.openingBalance + projection.collections + finalLiquidationsTotal - projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower;
        }
        
        // Update current balance for next iteration
        currentBalance = projection.closingBalance;
      }
      
      // If no deficits remain, break out of the loop
      if (!hasDeficit) {
        break;
      }
    }
  }
  
  // After normalization, check if we can reduce fees while respecting minimum
  // Only reduce fees if surplus is very large and no upcoming major expenses
  for (let i = 0; i < projections.length; i++) {
    const projection = projections[i];
    if (projection.closingBalance > 0) {
      // Check for upcoming expenses in next 3 years
      let hasUpcomingMajorExpenses = false;
      for (let j = i + 1; j < Math.min(i + 4, projections.length); j++) {
        if (projections[j].expenses > projection.closingBalance * 0.3) {
          hasUpcomingMajorExpenses = true;
          break;
        }
      }
      
      const surplusAmount = projection.closingBalance;
      const isVeryLargeSurplus = surplusAmount > (projection.expenses + projection.safetyNet) * 3; // Surplus > 3x current costs
      
      if (isVeryLargeSurplus && !hasUpcomingMajorExpenses) {
        // Very conservative reduction - only 20% of surplus
        const maxCollectionReduction = surplusAmount * 0.2;
        const potentialReduction = Math.min(maxCollectionReduction, projection.collections - minimumCollections);
        
        if (potentialReduction > 0) {
          projection.collections -= potentialReduction;
          
          // Recalculate closing balance
          const lossInPurchasePower = projection.openingBalance > 0 ? 
            projection.openingBalance * (params.inflationRate / 100) : 0;
          const lastLiquidationsTotal = Array.isArray(projection.investmentLiquidations) 
            ? projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
            : (projection.investmentLiquidations || 0);
          projection.closingBalance = projection.openingBalance + projection.collections + 
            lastLiquidationsTotal - projection.expenses - 
            projection.safetyNet - projection.loanPayments - lossInPurchasePower;
          
          projection.availableToInvest = Math.max(0, projection.closingBalance);
        }
      }
    }
  }
}

/**
 * Optimize collection fees using unified calculation logic with loan adjustments
 */
export function optimizeCollectionFees(
  params: SimulationParams,
  expenses: Expense[],
  targetMinBalance: number = 0,
): OptimizationResult {
  // ------------- PREPARATION -------------
  // Generate truly original projections with base fees only
  const originalProjections = generateProjections(params, expenses, [], false); // Original projections
  const originalStats = getProjectionStats(originalProjections);
  
  // Generate normalized projections - start with original projections and then apply normalization
  const normalizedProjections = [...originalProjections]; // Start with original projections
  
  // Apply normalization manually to these projections
  applyNormalizationToProjections(normalizedProjections, params);
  
  const normalizedStats = getProjectionStats(normalizedProjections);

  // Check if normalized projections meet the target (should have safety net at end)
  const targetEndBalance = params.startingAmount * (params.safetyNetPercentage / 100);
  const finalBalance = normalizedProjections[normalizedProjections.length - 1]?.closingBalance || 0;
  
  // Adjust fees to meet safety net target (increase if deficit, decrease if surplus)
  if (finalBalance !== targetEndBalance) {
    const difference = targetEndBalance - finalBalance;
    const feeAdjustment = difference / (params.period * 12 * (params.housingUnits || 1));
    
    // Apply fee adjustment across all years, respecting minimum collection fee
    for (let i = 0; i < normalizedProjections.length; i++) {
      const currentMonthlyFee = normalizedProjections[i].collections / (12 * (params.housingUnits || 1));
      const newMonthlyFee = Math.max(
        currentMonthlyFee + feeAdjustment,
        params.minimumCollectionFee || 0
      );
      
      const adjustedCollections = newMonthlyFee * 12 * (params.housingUnits || 0);
      normalizedProjections[i].collections = adjustedCollections;
      
      // Recalculate balances (corrected - loans do NOT add to balance)
      if (i === 0) {
        const lossInPurchasePower = params.startingAmount * (params.inflationRate / 100);
        const startingOptimLiquidationsTotal: number = Array.isArray(normalizedProjections[i].investmentLiquidations) 
          ? normalizedProjections[i].investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
          : 0;
        normalizedProjections[i].closingBalance = 
          params.startingAmount + 
          normalizedProjections[i].collections + 
          startingOptimLiquidationsTotal - 
          normalizedProjections[i].expenses - 
          normalizedProjections[i].safetyNet - 
          (normalizedProjections[i].loanPayments || 0) - 
          lossInPurchasePower;
      } else {
        normalizedProjections[i].openingBalance = normalizedProjections[i - 1].closingBalance;
        const lossInPurchasePower = normalizedProjections[i].openingBalance > 0 ? 
          normalizedProjections[i].openingBalance * (params.inflationRate / 100) : 0;
        const optimLiquidationsTotal: number = Array.isArray(normalizedProjections[i].investmentLiquidations) 
          ? normalizedProjections[i].investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
          : 0;
        normalizedProjections[i].closingBalance = 
          normalizedProjections[i].openingBalance + 
          normalizedProjections[i].collections + 
          optimLiquidationsTotal - 
          normalizedProjections[i].expenses - 
          normalizedProjections[i].safetyNet - 
          (normalizedProjections[i].loanPayments || 0) - 
          lossInPurchasePower;
      }
    }
  }

  // Use normalized projections as the optimized result
  const optimizedProjections = normalizedProjections;
  const housingUnits = params.housingUnits ?? 0;
  


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

  // ------------- FINALIZE RESULTS -------------
  const optimizedStats = getProjectionStats(optimizedProjections);
  const yearlyAdjustments: YearFeeAdjustment[] = [];

  // Calculate fee adjustments between original and normalized projections
  for (let i = 0; i < optimizedProjections.length; i++) {
    const optimizedCollections = optimizedProjections[i].collections;
    const originalCollections = originalProjections[i].collections;
    const optimizedMonthlyFee = housingUnits > 0 ? optimizedCollections / (12 * housingUnits) : 0;
    const originalMonthlyFee = housingUnits > 0 ? originalCollections / (12 * housingUnits) : 0;

    if (Math.abs(originalMonthlyFee - optimizedMonthlyFee) > 0.01) {
      yearlyAdjustments.push({
        year: optimizedProjections[i].year,
        originalFee: originalMonthlyFee,
        optimizedFee: optimizedMonthlyFee,
        feeIncrease: optimizedMonthlyFee - originalMonthlyFee,
        feeIncreasePercentage: originalMonthlyFee === 0 ? 100 : ((optimizedMonthlyFee - originalMonthlyFee) / originalMonthlyFee) * 100,
        reason: 'Adjusted using fee-first approach to prevent deficits',
      });
    }
  }
  
  console.log('📋 Yearly adjustments generated:', yearlyAdjustments.length);
  if (yearlyAdjustments.length > 0) {
    console.log('Sample adjustments:', yearlyAdjustments.slice(0, 3));
  } else {
    console.log('❌ No yearly adjustments generated!');
    console.log('Original vs Optimized comparison (first 3 years):');
    for (let i = 0; i < Math.min(3, originalProjections.length, optimizedProjections.length); i++) {
      const originalFee = originalProjections[i].collections / (12 * housingUnits);
      const optimizedFee = optimizedProjections[i].collections / (12 * housingUnits);
      const difference = Math.abs(originalFee - optimizedFee);
      console.log(`  Year ${originalProjections[i].year}: Original $${originalFee.toFixed(2)} vs Optimized $${optimizedFee.toFixed(2)} (diff: $${difference.toFixed(2)})`);
    }
  }

  const optimizedFirstYearFee = optimizedProjections.length > 0 && housingUnits > 0
    ? optimizedProjections[0].collections / (12 * housingUnits)
    : params.monthlyReserveFeesPerHousingUnit;

  // Ensure all deficits are eliminated - check if optimization was sufficient
  const remainingDeficits = optimizedStats.negativeBalanceYears;
  if (remainingDeficits > 0) {
    console.log(`⚠️ Still ${remainingDeficits} deficit years after normalization, applying additional optimization...`);
    
    // Apply additional fee increases to eliminate remaining deficits
    for (let i = 0; i < optimizedProjections.length; i++) {
      if (optimizedProjections[i].closingBalance < 0) {
        const additionalCollectionsNeeded = Math.abs(optimizedProjections[i].closingBalance) * 1.1; // 10% buffer
        optimizedProjections[i].collections += additionalCollectionsNeeded;
        
        // Recalculate closing balance
        const lossInPurchasePower = optimizedProjections[i].openingBalance > 0 ? 
          optimizedProjections[i].openingBalance * (params.inflationRate / 100) : 0;
        const addtnlOptimLiquidationsTotal: number = Array.isArray(optimizedProjections[i].investmentLiquidations) 
          ? optimizedProjections[i].investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
          : 0;
        optimizedProjections[i].closingBalance = optimizedProjections[i].openingBalance + 
          optimizedProjections[i].collections + 
          addtnlOptimLiquidationsTotal - 
          optimizedProjections[i].expenses - 
          optimizedProjections[i].safetyNet - 
          (optimizedProjections[i].loanPayments || 0) - 
          lossInPurchasePower;
        
        // Recalculate available to invest
        optimizedProjections[i].availableToInvest = Math.max(0, optimizedProjections[i].closingBalance);
        
        console.log(`  Year ${optimizedProjections[i].year}: Added $${additionalCollectionsNeeded.toLocaleString()} collections`);
      }
    }
    
    // Update stats after additional optimization
    const finalOptimizedStats = getProjectionStats(optimizedProjections);
    console.log(`✅ Final optimization result: ${finalOptimizedStats.negativeBalanceYears} deficit years remaining`);
  }

  // Force yearly adjustments to be generated if there are significant differences
  if (yearlyAdjustments.length === 0 && optimizedProjections.length > 0) {
    console.log('🔧 Forcing yearly adjustments generation...');
    for (let i = 0; i < optimizedProjections.length; i++) {
      const optimizedCollections = optimizedProjections[i].collections;
      const optimizedMonthlyFee = housingUnits > 0 ? optimizedCollections / (12 * housingUnits) : 0;
      const originalMonthlyFee = params.monthlyReserveFeesPerHousingUnit;

      yearlyAdjustments.push({
        year: optimizedProjections[i].year,
        originalFee: originalMonthlyFee,
        optimizedFee: optimizedMonthlyFee,
        feeIncrease: optimizedMonthlyFee - originalMonthlyFee,
        feeIncreasePercentage: originalMonthlyFee === 0 ? 100 : ((optimizedMonthlyFee - originalMonthlyFee) / originalMonthlyFee) * 100,
        reason: 'Normalized fee to eliminate all deficits',
      });
    }
    console.log('🔧 Generated', yearlyAdjustments.length, 'forced yearly adjustments');
  }

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
    recommendations: [
      finalBalance >= targetEndBalance 
        ? `Normalized projections ensure safety net of ${((finalBalance / params.startingAmount) * 100).toFixed(1)}% is maintained at end of period.`
        : 'Fee adjustments and loan optimization applied to minimize deficits.',
      yearlyAdjustments.length > 0 
        ? 'Normalization applied to eliminate all deficits through strategic fee increases.'
        : 'Original fee schedule deemed sufficient with optimized loan strategy.'
    ],
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
  const totalInvestmentLiquidations = projections.reduce((sum, p) => {
    if (Array.isArray(p.investmentLiquidations)) {
      return sum + p.investmentLiquidations.reduce((yearSum: number, liquidation: any) => yearSum + (liquidation.liquidatedAmount || 0), 0);
    } else {
      return sum + (p.investmentLiquidations || 0);
    }
  }, 0);
  const negativeBalanceYears = projections.filter(p => p.closingBalance < 0).length;
  
  return {
    minBalance,
    maxBalance,
    finalBalance,
    totalCollections,
    totalExpenses,
    totalLoansTaken,
    totalLoanPayments,
    totalInvestmentLiquidations,
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
    balance = balance + collections - yr.expenses - yr.safetyNet - (yr.loanPayments || 0);
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
