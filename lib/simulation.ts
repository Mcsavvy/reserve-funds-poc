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
 * Smart loan logic: Only take loans when absolutely necessary to prevent deficits
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
  // Debug loan calculation parameters
  const inflatedBaseline = calculateInflatedCost(largeExpenseBaseline, inflationRate, yearsFromBase);
  const isLarge = isLargeExpense(inflatedCost, largeExpenseBaseline, inflationRate, yearsFromBase);
  
  // DISABLED: Individual expense loan calculation is now handled at year level
  // All loans are calculated collectively per year for better optimization
  return 0;
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
 * Analyze deficit root causes by examining historical data and trends
 */
function analyzeDeficitRootCauses(
  projections: YearProjection[],
  deficitYear: number,
  params: SimulationParams,
  expenses: Expense[]
): {
  rootCauses: Array<{
    cause: string;
    impact: number;
    yearContributed: number;
    suggestedAction: string;
  }>;
  recommendedFeeAdjustment: number;
  adjustmentStartYear: number;
} {
  const rootCauses: Array<{
    cause: string;
    impact: number;
    yearContributed: number;
    suggestedAction: string;
  }> = [];
  
  let totalDeficitImpact = 0;
  const deficitProjection = projections.find(p => p.year === deficitYear);
  
  if (!deficitProjection) {
    return { rootCauses: [], recommendedFeeAdjustment: 0, adjustmentStartYear: params.fiscalYear };
  }
  
  const deficitAmount = Math.abs(deficitProjection.closingBalance);
  
  // Analyze historical trends leading to deficit
  const yearsToAnalyze = Math.min(5, deficitYear - params.fiscalYear);
  
  for (let lookbackYear = deficitYear - yearsToAnalyze; lookbackYear < deficitYear; lookbackYear++) {
    const yearProjection = projections.find(p => p.year === lookbackYear);
    if (!yearProjection) continue;
    
    // Check if inadequate fee collection contributed to deficit
    const inflationAdjustedBaseFee = params.monthlyReserveFeesPerHousingUnit * 
      Math.pow(1 + (params.inflationRate / 100), lookbackYear - params.fiscalYear);
    const actualMonthlyFee = yearProjection.collections / (12 * (params.housingUnits || 1));
    
    if (actualMonthlyFee < inflationAdjustedBaseFee * 0.95) { // 5% tolerance
      const feeShortfall = (inflationAdjustedBaseFee - actualMonthlyFee) * 12 * (params.housingUnits || 1);
      const compoundedImpact = feeShortfall * Math.pow(1.02, deficitYear - lookbackYear); // 2% growth factor
      
      rootCauses.push({
        cause: 'Inadequate fee collection relative to inflation',
        impact: compoundedImpact,
        yearContributed: lookbackYear,
        suggestedAction: `Increase fees by $${(inflationAdjustedBaseFee - actualMonthlyFee).toFixed(2)} per unit`
      });
      totalDeficitImpact += compoundedImpact;
    }
    
    // Check if missed investment opportunities contributed
    if (yearProjection.availableToInvest > yearProjection.investedAmount) {
      const missedInvestment = yearProjection.availableToInvest - yearProjection.investedAmount;
      if (missedInvestment > 1000) { // Only significant amounts
        const potentialEarnings = missedInvestment * 0.05 * (deficitYear - lookbackYear); // 5% annual return
        
        rootCauses.push({
          cause: 'Missed investment opportunity',
          impact: potentialEarnings,
          yearContributed: lookbackYear,
          suggestedAction: `Should have invested $${missedInvestment.toLocaleString()}`
        });
        totalDeficitImpact += potentialEarnings;
      }
    }
    
    // Check if excessive expenses without corresponding fee increases
    const yearExpenses = calculateYearExpenses(expenses, lookbackYear, params.fiscalYear, params, false, 0, 0);
    const totalYearExpenses = yearExpenses.reduce((sum, exp) => sum + exp.inflatedCost, 0);
    
    if (totalYearExpenses > yearProjection.collections * 0.8) { // Expenses > 80% of collections
      const excessiveExpenseImpact = totalYearExpenses - (yearProjection.collections * 0.5); // Assume 50% is reasonable
      
      rootCauses.push({
        cause: 'High expenses without corresponding fee adjustment',
        impact: excessiveExpenseImpact,
        yearContributed: lookbackYear,
        suggestedAction: `Should have increased fees by $${(excessiveExpenseImpact / (12 * (params.housingUnits || 1))).toFixed(2)} per unit`
      });
      totalDeficitImpact += excessiveExpenseImpact;
    }
  }
  
  // Enhanced fee adjustment calculation that considers starting balance impact
  const yearsRemainingInStudy = (params.fiscalYear + params.period) - deficitYear;
  const yearsFromStart = deficitYear - params.fiscalYear;
  
  // Calculate base adjustment - more aggressive for earlier deficits regardless of starting balance
  let baseAdjustmentMultiplier = 1.2;
  
  // Higher starting balance scenarios need more aggressive early intervention
  if (params.startingAmount > 200000) { // High starting balance
    if (yearsFromStart <= 5) {
      baseAdjustmentMultiplier = 1.8; // Much more aggressive for early deficits with high starting balance
    } else {
      baseAdjustmentMultiplier = 1.4; // Still more aggressive than normal
    }
  } else if (yearsFromStart <= 3) {
    baseAdjustmentMultiplier = 1.5; // Early deficits always need stronger intervention
  }
  
  // Calculate total shortfall including buffer
  const totalShortfall = deficitAmount + (deficitAmount * 0.3); // 30% safety buffer
  
  // Distribute adjustment across available years, with minimum thresholds
  const yearsToDistribute = Math.max(yearsRemainingInStudy, 2); // At least 2 years
  const recommendedFeeAdjustment = Math.max(
    totalShortfall / (yearsToDistribute * 12 * (params.housingUnits || 1)) * baseAdjustmentMultiplier,
    1.0 // Minimum $1 increase
  );
  
  // Start adjustment earlier for high starting balance scenarios
  let adjustmentStartYear: number;
  if (params.startingAmount > 200000) {
    // High starting balance: start adjustments much earlier
    adjustmentStartYear = Math.max(
      params.fiscalYear,
      deficitYear - Math.min(5, Math.floor(yearsFromStart * 0.7))
    );
  } else {
    // Normal scenarios
    adjustmentStartYear = Math.max(
      params.fiscalYear, 
      deficitYear - Math.min(3, Math.floor(yearsRemainingInStudy / 2))
    );
  }
  
  return {
    rootCauses,
    recommendedFeeAdjustment,
    adjustmentStartYear
  };
}

/**
 * Enhanced conservative surplus management for fee decreases
 */
function calculateConservativeFeeDecrease(
  projections: YearProjection[],
  currentYear: number,
  currentFee: number,
  params: SimulationParams,
  expenses: Expense[],
  activeLoans: Map<string, { 
    originalAmount: number; 
    remainingBalance: number; 
    annualPayment: number;
    startYear: number;
  }>
): {
  canDecreaseFee: boolean;
  suggestedDecrease: number;
  reasoning: string;
  canGoToZero?: boolean;
} {
  const currentProjection = projections.find(p => p.year === currentYear);
  if (!currentProjection) {
    return { canDecreaseFee: false, suggestedDecrease: 0, reasoning: 'No projection data available' };
  }
  
  const currentBalance = currentProjection.closingBalance;
  const minimumFee = params.minimumCollectionFee || 0;
  
  // NEW LOGIC: Allow fees to go to $0 if no minimum is set and sufficient funds exist
  // If minimumCollectionFee is 0, we can reduce fees all the way to 0
  // If minimumCollectionFee > 0, we respect that constraint
  
  const effectiveMinimumFee = minimumFee; // No tolerance - respect exact minimum
  
  // Check if current fee is already at the effective minimum
  if (currentFee <= effectiveMinimumFee) {
    const atMinimumReason = minimumFee > 0 
      ? `Already at minimum collection fee ($${minimumFee.toFixed(2)})`
      : 'Already at zero fee';
    return { canDecreaseFee: false, suggestedDecrease: 0, reasoning: atMinimumReason };
  }
  
  // Check if this is the "no more expenses for rest of simulation" scenario FIRST
  const remainingYears = (params.fiscalYear + params.period) - currentYear;
  let hasAnyRemainingExpenses = false;
  let remainingSimulationExpenses = 0;
  for (let futureYear = currentYear + 1; futureYear < params.fiscalYear + params.period; futureYear++) {
    const futureExpenseDetails = calculateYearExpenses(expenses, futureYear, params.fiscalYear, params, false, 0, 0);
    const futureYearExpenses = futureExpenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    
    // Also check for loan payments in future years
    let futureLoanPayments = 0;
    for (const [loanId, loan] of activeLoans) {
      if (futureYear >= loan.startYear && loan.remainingBalance > 0) {
        futureLoanPayments += loan.annualPayment;
      }
    }
    
    const totalFutureCosts = futureYearExpenses + futureLoanPayments;
    remainingSimulationExpenses += totalFutureCosts;
    if (totalFutureCosts > 0) {
      hasAnyRemainingExpenses = true;
    }
  }

  // Calculate total upcoming expenses using SAME logic as main surplus detection (remaining simulation years, not 10-year lookahead)
  let totalUpcomingExpenses = 0;
  let hasSignificantUpcomingExpenses = false;
  
  // Use SAME calculation as main logic - remaining years in simulation only
  for (let futureYear = currentYear + 1; futureYear < params.fiscalYear + params.period; futureYear++) {
    const futureExpenseDetails = calculateYearExpenses(expenses, futureYear, params.fiscalYear, params, false, 0, 0);
    const futureExpenses = futureExpenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    
    // Also check for loan payments in future years
    let futureLoanPayments = 0;
    for (const [loanId, loan] of activeLoans) {
      if (futureYear >= loan.startYear && loan.remainingBalance > 0) {
        futureLoanPayments += loan.annualPayment;
      }
    }
    
    const totalFutureCosts = futureExpenses + futureLoanPayments;
    totalUpcomingExpenses += totalFutureCosts;
    
    if (totalFutureCosts > currentBalance * 0.1) {
      hasSignificantUpcomingExpenses = true;
    }
  }
  
  // 🌊 CONSERVATIVE FEE SMOOTHING APPROACH
  // Instead of aggressive reductions, use gradual, planned decreases that maintain financial stability
  
  const canGoToZero = minimumFee === 0;
  
  // More aggressive safety multipliers to prevent excessive balance accumulation
  let safetyMultiplier: number = hasSignificantUpcomingExpenses ? 2.0 : 1.4;
  
  // For long-term simulations (>25 years), still be reasonable but not excessive
  const isLongTermSimulation = params.period > 25;
  if (isLongTermSimulation) {
    safetyMultiplier = hasSignificantUpcomingExpenses ? 2.5 : 1.6;
  }
  
  const targetReserve = totalUpcomingExpenses * safetyMultiplier;
  
  // Only allow reductions when we have SUBSTANTIAL surplus
  const isEndOfSimulationWithNoExpenses = !hasAnyRemainingExpenses && remainingYears <= 5;
  
  if (!isEndOfSimulationWithNoExpenses && currentBalance <= targetReserve) {
    return { 
      canDecreaseFee: false, 
      suggestedDecrease: 0, 
      reasoning: `Current balance ($${currentBalance.toLocaleString()}) needed for upcoming expenses (target reserve: $${targetReserve.toLocaleString()})` 
    };
  }
  
  const effectiveUpcomingExpenses = isEndOfSimulationWithNoExpenses ? remainingSimulationExpenses : totalUpcomingExpenses;
  
  // Calculate safe decrease amount - much more conservative
  const excessAmount = currentBalance - targetReserve;
  
  let monthlyReduction: number;
  
  // 🎯 BALANCED REDUCTION STRATEGY
  // More aggressive when no expenses, conservative with upcoming expenses
  
  if (isEndOfSimulationWithNoExpenses && currentBalance > 15000) {
    // NO MORE EXPENSES FOR REST OF SIMULATION: Can reduce to minimum fee
    monthlyReduction = currentFee - effectiveMinimumFee;
    console.log(`   🎯 END-OF-SIM: No expenses for remaining ${remainingYears} years - reducing to ${effectiveMinimumFee > 0 ? '$' + effectiveMinimumFee + ' minimum' : '$0'}`);
  } else if (effectiveUpcomingExpenses === 0 && currentBalance > 30000) {
    // NO UPCOMING EXPENSES: Very aggressive reduction (60% of current fee)
    monthlyReduction = Math.min(currentFee * 0.6, currentFee - effectiveMinimumFee);
    console.log(`   🚀 ZERO EXPENSES DETECTED - Very aggressive 60% fee reduction`);
  } else if (effectiveUpcomingExpenses < 25000 && currentBalance > targetReserve * 1.5) {
    // MINIMAL EXPENSES + SURPLUS: Aggressive reduction (40% of current fee)
    monthlyReduction = Math.min(currentFee * 0.4, currentFee - effectiveMinimumFee);
    console.log(`   💰 MINIMAL EXPENSES + SURPLUS - Aggressive 40% fee reduction`);
  } else if (currentBalance > targetReserve * 2.0) {
    // HIGH SURPLUS: Standard reduction (25% of current fee)
    monthlyReduction = Math.min(currentFee * 0.25, currentFee - effectiveMinimumFee);
    console.log(`   ✅ HIGH SURPLUS - Standard 25% fee reduction`);
  } else if (currentBalance > targetReserve * 1.6) {
    // MODERATE SURPLUS: Good reduction (15% of current fee)
    monthlyReduction = Math.min(currentFee * 0.15, currentFee - effectiveMinimumFee);
    console.log(`   📊 MODERATE SURPLUS - Good 15% fee reduction`);
  } else if (currentBalance > targetReserve * 1.3) {
    // SOME SURPLUS: Modest reduction (8% of current fee)
    monthlyReduction = Math.min(currentFee * 0.08, currentFee - effectiveMinimumFee);
    console.log(`   🔻 SOME SURPLUS - Modest 8% fee reduction`);
  } else if (currentBalance > targetReserve * 1.1) {
    // SMALL SURPLUS: Minimal reduction (3% of current fee)
    monthlyReduction = Math.min(currentFee * 0.03, currentFee - effectiveMinimumFee);
    console.log(`   📉 SMALL SURPLUS - Minimal 3% fee reduction`);
  } else {
    // Not enough surplus for safe reduction
    monthlyReduction = 0;
    console.log(`   ✋ INSUFFICIENT SURPLUS - No fee reduction recommended`);
  }
  
  // Calculate suggested new fee respecting minimum constraint
  const suggestedNewFee = Math.max(effectiveMinimumFee, currentFee - monthlyReduction);
  const actualDecrease = currentFee - suggestedNewFee;
  
  if (actualDecrease < 0.01) { // Less than 1 cent decrease
    return { 
      canDecreaseFee: false, 
      suggestedDecrease: 0, 
      reasoning: 'Calculated decrease too small to be meaningful',
      canGoToZero 
    };
  }
  
  // Enhanced reasoning with zero-fee possibility
  let reasoning = `Safe to reduce by $${actualDecrease.toFixed(2)} per unit. Excess: $${excessAmount.toLocaleString()}, Future expenses: $${effectiveUpcomingExpenses.toLocaleString()}`;
  
  if (canGoToZero && suggestedNewFee === 0) {
    reasoning += `. Fee can go to $0 (no minimum set)`;
  } else if (minimumFee > 0 && suggestedNewFee === minimumFee) {
    reasoning += `. Limited by minimum fee ($${minimumFee.toFixed(2)})`;
  }
  
  return {
    canDecreaseFee: true,
    suggestedDecrease: actualDecrease,
    reasoning,
    canGoToZero
  };
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
  console.log('🎯 FEE SMOOTHING VERSION - STARTING SIMULATION');
  
  // 🌊 FEE SMOOTHING ALGORITHM
  // This replaces the aggressive fee spike approach with a balanced, long-term strategy
  // that distributes costs more evenly across the entire simulation period.
  
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
  
  // Track fee adjustment history for intelligent decision making
  const feeAdjustmentHistory: Array<{
    year: number;
    oldFee: number;
    newFee: number;
    reason: string;
    impact: number;
  }> = [];
  
  // High starting balance flag for zero-deficit strategy
  const isHighStartingBalance = params.startingAmount >= 400000;
  
  
  // First pass: Generate initial projections to identify potential deficits
  const initialProjections: YearProjection[] = [];
  let initialBalance = params.startingAmount;
  let initialFee = params.monthlyReserveFeesPerHousingUnit;
  
  // Run initial projection to identify deficit years
  console.log(`🔍 INITIAL SCAN: Starting balance $${params.startingAmount.toLocaleString()}, Base fee $${params.monthlyReserveFeesPerHousingUnit}/unit`);
  
  for (let year = params.fiscalYear; year < params.fiscalYear + params.period; year++) {
    const expenseDetails = calculateYearExpenses(expenses, year, params.fiscalYear, params, false, 0, 0);
    const totalExpenses = expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    // Start with monthly fees collection for first year, then apply inflation
    const collections = (year === params.fiscalYear) 
      ? params.monthlyReserveFeesPerHousingUnit * 12 * (params.housingUnits || 0)
      : initialFee * 12 * (params.housingUnits || 0);
    const safetyNet = totalExpenses * (params.safetyNetPercentage / 100);
    const lossInPurchasePower = initialBalance > 0 ? initialBalance * (params.inflationRate / 100) : 0;
    
    const closingBalance = initialBalance + collections - totalExpenses - safetyNet - lossInPurchasePower;
    
    // Debug major expense years and deficit years
    if (totalExpenses > 50000 || closingBalance < 0) {
      console.log(`  Year ${year}: Expenses $${totalExpenses.toLocaleString()}, Collections $${collections.toLocaleString()}, Balance $${closingBalance.toLocaleString()}`);
    }
    
    initialProjections.push({
      year,
      openingBalance: initialBalance,
      collections,
      expenses: totalExpenses,
      safetyNet,
      loansTaken: 0,
      loanPayments: 0,
      availableToInvest: Math.max(0, closingBalance),
      investedAmount: 0,
      investmentLiquidations: [],
      projectedNetEarnings: 0,
      closingBalance,
      expenseDetails,
      loanDetails: [],
      investmentDetails: []
    });
    
    initialBalance = closingBalance;
    
    // Apply basic inflation to fee
    initialFee = initialFee * (1 + params.inflationRate / 100);
  }
  
  // 🌊 COMPREHENSIVE FEE SMOOTHING ALGORITHM
  // Replaces aggressive fee spikes with balanced, long-term fee planning
  
  if (!isNormalized) {
    console.log(`🌊 FEE SMOOTHING ALGORITHM ACTIVATED`);
    
    // Step 1: Analyze the entire simulation period for total financial needs
    const deficitYears = initialProjections.filter(p => p.closingBalance < 0);
    const lowBalanceYears = initialProjections.filter(p => p.closingBalance >= 0 && p.closingBalance < 50000);
    const allExpenseYears = initialProjections.filter(p => p.expenses > 0);
    
    // Calculate total financial obligations across the entire period
    const totalDeficitAmount = deficitYears.reduce((sum, p) => sum + Math.abs(p.closingBalance), 0);
    const totalExpenseAmount = allExpenseYears.reduce((sum, p) => sum + p.expenses, 0);
    const totalCollectionsNeeded = Math.max(totalDeficitAmount, totalExpenseAmount * 0.8); // Need 80% of expenses covered by fees
    
    console.log(`   Analysis: ${deficitYears.length} deficit years, total deficit: $${totalDeficitAmount.toLocaleString()}`);
    console.log(`   Total expenses: $${totalExpenseAmount.toLocaleString()} over ${params.period} years`);
    console.log(`   Starting balance: $${params.startingAmount.toLocaleString()}`);
    
    // Step 2: Calculate target fee progression with constraints
    const baseFee = params.monthlyReserveFeesPerHousingUnit;
    const maxFeeIncreaseRate = (params.maximumAllowableFeeIncrease || 10) / 100; // Convert % to decimal
    const minimumFee = params.minimumCollectionFee || 0;
    
    // Calculate a reasonable fee progression that avoids extreme spikes
    const feeAdjustments: Map<number, number> = new Map();
    
    // STRATEGY: If we have deficit years, increase fees gradually over time
    // but cap the increase to reasonable annual limits (10-15% max per year)
    
    if (deficitYears.length > 0) {
      console.log(`   🎯 Implementing gradual fee increases to address ${deficitYears.length} deficit years`);
      
      // Calculate target additional annual collections needed
      const safetyBuffer = 1.2; // 20% safety buffer
      const additionalCollectionsNeeded = totalDeficitAmount * safetyBuffer;
      const yearsToDistribute = Math.min(params.period, Math.max(15, params.period * 0.7)); // Use 70% of period, min 15 years
      const targetAdditionalAnnualCollections = additionalCollectionsNeeded / yearsToDistribute;
      const targetAdditionalMonthlyFee = targetAdditionalAnnualCollections / (12 * (params.housingUnits || 1));
      
      console.log(`   Target additional monthly fee: $${targetAdditionalMonthlyFee.toFixed(2)} over ${yearsToDistribute} years`);
      
      // Apply gradual increases with annual caps
      let cumulativeFeeIncrease = 0;
      const maxYearlyIncrease = baseFee * maxFeeIncreaseRate; // Respect user's max increase percentage
      
      for (let yearIndex = 0; yearIndex < yearsToDistribute; yearIndex++) {
        const year = params.fiscalYear + yearIndex;
        
        // Calculate how much more we need to add
        const remainingIncreaseNeeded = targetAdditionalMonthlyFee - cumulativeFeeIncrease;
        const remainingYears = yearsToDistribute - yearIndex;
        
        // Spread the remaining increase over remaining years, but respect annual limits
        let yearlyIncrease = remainingIncreaseNeeded / remainingYears;
        
        // Cap the yearly increase to reasonable limits
        yearlyIncrease = Math.min(yearlyIncrease, maxYearlyIncrease);
        yearlyIncrease = Math.min(yearlyIncrease, targetAdditionalMonthlyFee * 0.3); // Never more than 30% of target in one year
        
        if (yearlyIncrease > 0.5) { // Only apply meaningful increases
          feeAdjustments.set(year, yearlyIncrease);
          cumulativeFeeIncrease += yearlyIncrease;
          
          if (yearIndex < 5) { // Log first 5 years
            const projectedNewFee = baseFee + cumulativeFeeIncrease;
            console.log(`     Year ${year}: +$${yearlyIncrease.toFixed(2)} (total: $${projectedNewFee.toFixed(2)})`);
          }
        }
      }
      
      console.log(`   Applied gradual fee increases over ${yearsToDistribute} years (cumulative: +$${cumulativeFeeIncrease.toFixed(2)})`);
    } else {
      console.log(`   ✅ No deficits detected - no fee increases needed`);
    }
  } else {
    // For normalized projections, use existing logic but less aggressive
    const deficitYears = initialProjections.filter(p => p.closingBalance < 0);
  }
  
  // Common feeAdjustments map for both normalized and non-normalized modes
  const feeAdjustments: Map<number, number> = new Map();
  
  if (isNormalized) {
    const deficitYears = initialProjections.filter(p => p.closingBalance < 0);
    
    if (deficitYears.length > 0) {
      console.log(`🔧 NORMALIZED MODE: Addressing ${deficitYears.length} deficit years`);
      const totalDeficitAmount = deficitYears.reduce((sum, p) => sum + Math.abs(p.closingBalance), 0);
      const additionalAnnualCollections = totalDeficitAmount * 1.1 / params.period; // Spread over entire period with 10% buffer
      const additionalMonthlyFee = additionalAnnualCollections / (12 * (params.housingUnits || 1));
      
      // Apply consistent increase across all years for normalized mode
      for (let yearIndex = 0; yearIndex < params.period; yearIndex++) {
        const year = params.fiscalYear + yearIndex;
        feeAdjustments.set(year, additionalMonthlyFee);
      }
      
      console.log(`   Applied consistent increase of $${additionalMonthlyFee.toFixed(2)} per unit across all years`);
    }
  }

  for (let year = params.fiscalYear; year < params.fiscalYear + params.period; year++) {
    // Apply intelligent fee adjustments FIRST, before calculating expenses and collections
    if (!isNormalized) {
      const minimumFee = params.minimumCollectionFee || 0;
      
      // 🎯 GLOBAL FEE INCREASE LIMITER: Track starting fee to ensure total increase never exceeds max%
      const yearStartingFee = currentMonthlyFee;
      
      // 📈 SPECIAL SECOND YEAR LOGIC: Use base fee + max allowed increase for year 2
      if (year === params.fiscalYear + 1 && params.maximumAllowableFeeIncrease > 0) {
        const baseFee = params.monthlyReserveFeesPerHousingUnit;
        const maxSecondYearFee = baseFee * (1 + params.maximumAllowableFeeIncrease / 100);
        
        // Only apply if we haven't already increased beyond this
        if (currentMonthlyFee < maxSecondYearFee) {
          const oldFee = currentMonthlyFee;
          currentMonthlyFee = maxSecondYearFee;
          console.log(`📈 YEAR ${year}: Special second year adjustment from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (base + ${params.maximumAllowableFeeIncrease}%)`);
        }
      }
      
      // Apply any pre-calculated fee adjustments from deficit analysis
      const preCalculatedAdjustment = feeAdjustments.get(year) || 0;
      if (preCalculatedAdjustment > 0) {
        const oldFee = currentMonthlyFee;
        
        // 🌊 FEE SMOOTHING: Apply gradual increases that respect annual change limits
        const maxAnnualIncreaseRate = (params.maximumAllowableFeeIncrease || 15) / 100; // ALWAYS use user's setting
        
        const maxAllowedFee = oldFee * (1 + maxAnnualIncreaseRate);
        const targetFee = oldFee + preCalculatedAdjustment;
        
        // Apply the increase but cap it to reasonable annual limits
        currentMonthlyFee = Math.min(targetFee, maxAllowedFee);
        
        // If we hit the annual limit, spread the remaining increase to future years
        const appliedIncrease = currentMonthlyFee - oldFee;
        const remainingIncrease = preCalculatedAdjustment - appliedIncrease;
        
        if (remainingIncrease > 0.5) { // If significant amount remains
          // Spread remaining increase to next 3 years
          for (let futureYear = year + 1; futureYear <= year + 3 && futureYear < params.fiscalYear + params.period; futureYear++) {
            const existingAdjustment = feeAdjustments.get(futureYear) || 0;
            feeAdjustments.set(futureYear, existingAdjustment + (remainingIncrease / 3));
          }
          console.log(`📈 YEAR ${year}: Gradual fee increase from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (spread $${remainingIncrease.toFixed(2)} to future years)`);
        } else {
          console.log(`📈 YEAR ${year}: Gradual fee increase from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (${(appliedIncrease/oldFee*100).toFixed(1)}% increase)`);
        }
        
        feeAdjustmentHistory.push({
          year,
          oldFee,
          newFee: currentMonthlyFee,
          reason: 'Gradual fee smoothing for long-term stability',
          impact: currentMonthlyFee - oldFee
        });
      } else if (isHighStartingBalance && year <= params.fiscalYear + 5) {
        // Debug: Log when no adjustment is found for high balance scenario
        console.log(`🔍 YEAR ${year}: No fee adjustment found (high starting balance scenario)`);
      }
      
      // 🔍 5-YEAR LOOK-AHEAD EXPENSE ANALYSIS - Dynamic fee adjustment based on upcoming needs
      if (year > params.fiscalYear && projections.length > 0) { // Not in first year and we have projections
        const previousYear = projections[projections.length - 1];
        const currentBalance = previousYear.closingBalance;
        
        // Calculate upcoming expenses AND loan payments for next 5 years
        let upcoming5YearExpenses = 0;
        let upcoming5YearLoanPayments = 0;
        let hasMajorExpensesIn5Years = false;
        const lookAheadYears = Math.min(5, params.fiscalYear + params.period - year);
        
        for (let futureYear = year; futureYear < year + lookAheadYears; futureYear++) {
          // Calculate expenses
          const futureExpenseDetails = calculateYearExpenses(
            expenses, 
            futureYear, 
            params.fiscalYear, 
            params, 
            false, 
            0, 
            currentMonthlyFee
          );
          const futureYearExpenses = futureExpenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
          
          // Calculate loan payments
          let futureYearLoanPayments = 0;
          for (const [loanId, loan] of activeLoans) {
            if (futureYear > loan.startYear && loan.remainingBalance > 0) {
              futureYearLoanPayments += loan.annualPayment;
            }
          }
          
          upcoming5YearExpenses += futureYearExpenses;
          upcoming5YearLoanPayments += futureYearLoanPayments;
          
          // Check if any single year has a major expense or loan payment (>$50K or >20% of current balance)
          const totalYearCosts = futureYearExpenses + futureYearLoanPayments;
          if (totalYearCosts > 50000 || totalYearCosts > currentBalance * 0.2) {
            hasMajorExpensesIn5Years = true;
          }
        }
        
        // Calculate what fee is actually needed for next 5 years (expenses + loan payments)
        const safetyBuffer = 1.2; // 20% safety buffer
        const totalUpcoming5YearCosts = upcoming5YearExpenses + upcoming5YearLoanPayments;
        const totalNeededFor5Years = totalUpcoming5YearCosts * safetyBuffer;
        const annualCollectionsNeeded = totalNeededFor5Years / lookAheadYears;
        const monthlyFeeNeeded = annualCollectionsNeeded / (12 * (params.housingUnits || 1));
        
        console.log(`🔍 YEAR ${year} - 5-YEAR LOOK-AHEAD ANALYSIS:`);
        console.log(`   Current balance: $${currentBalance.toLocaleString()}`);
        console.log(`   Upcoming 5yr expenses: $${upcoming5YearExpenses.toLocaleString()}`);
        console.log(`   Upcoming 5yr loan payments: $${upcoming5YearLoanPayments.toLocaleString()}`);
        console.log(`   Total upcoming costs: $${totalUpcoming5YearCosts.toLocaleString()}`);
        console.log(`   Total needed (with buffer): $${totalNeededFor5Years.toLocaleString()}`);
        console.log(`   Monthly fee needed: $${monthlyFeeNeeded.toFixed(2)}`);
        console.log(`   Current fee: $${currentMonthlyFee.toFixed(2)}`);
        
        // 🎯 SPECIAL CASE: No upcoming costs (expenses + loan payments) = reduce to minimum/zero fee
        if (totalUpcoming5YearCosts === 0 && currentBalance > 10000) {
          const oldFee = currentMonthlyFee;
          const minimumFeeTarget = params.minimumCollectionFee || 0;
          
          if (currentMonthlyFee > minimumFeeTarget) {
            currentMonthlyFee = minimumFeeTarget;
            
            feeAdjustmentHistory.push({
              year,
              oldFee,
              newFee: currentMonthlyFee,
              reason: 'No costs: Reduce to minimum/zero fee',
              impact: -(oldFee - currentMonthlyFee)
            });
            
            const zeroNote = minimumFeeTarget === 0 ? ' (reached $0 fee)' : ` (minimum fee: $${minimumFeeTarget})`;
            console.log(`🎯 YEAR ${year}: NO UPCOMING COSTS - Fee reduced from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)}${zeroNote}`);
            console.log(`   Reason: No expenses or loan payments for next 5 years, sufficient balance exists`);
          }
        } else {
          // Determine if we need to adjust fees (normal logic)
          const feeDifference = currentMonthlyFee - monthlyFeeNeeded;
          const hasExcessiveFee = feeDifference > 2.0; // More than $2/month excess
          const hasInsufficientFee = feeDifference < -2.0; // More than $2/month shortfall
          
          if (hasExcessiveFee && currentBalance > totalNeededFor5Years) {
          // We have enough money AND we're charging too much - reduce fees
          const oldFee = currentMonthlyFee;
          
          // Calculate appropriate reduction
          let reductionAmount = Math.min(
            feeDifference * 0.7, // Reduce by 70% of excess
            currentMonthlyFee * 0.25 // But never more than 25% of current fee
          );
          
          // Special case: If we have WAY more than needed, be more aggressive
          if (currentBalance > totalNeededFor5Years * 2) {
            reductionAmount = Math.max(reductionAmount, currentMonthlyFee * 0.3); // At least 30% reduction
            console.log(`   🚀 EXCESSIVE SURPLUS: Aggressive reduction (30%+)`);
          }
          
          currentMonthlyFee = Math.max(
            params.minimumCollectionFee || 0,
            currentMonthlyFee - reductionAmount
          );
          
          feeAdjustmentHistory.push({
            year,
            oldFee,
            newFee: currentMonthlyFee,
            reason: '5-year look-ahead: Excessive fee reduction',
            impact: -(oldFee - currentMonthlyFee)
          });
          
          console.log(`📉 YEAR ${year}: 5-year analysis fee reduction from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)}`);
          console.log(`   Reason: Sufficient funds for 5 years, reducing overcharge`);
          
        } else if (hasInsufficientFee && currentBalance < totalNeededFor5Years * 0.8) {
          // We don't have enough money AND we're not charging enough - increase fees
          const oldFee = currentMonthlyFee;
          
          // Calculate appropriate increase (but ALWAYS respect max increase limits)
          const maxIncreaseRate = (params.maximumAllowableFeeIncrease || 15) / 100;
          const maxAllowedFee = oldFee * (1 + maxIncreaseRate);
          
          // Calculate what fee we actually need
          const targetFee = monthlyFeeNeeded;
          
          // Apply the increase but NEVER exceed max allowed percentage
          currentMonthlyFee = Math.min(targetFee, maxAllowedFee);
          
          // If we hit the max limit, spread remaining increase to future years
          const appliedIncrease = currentMonthlyFee - oldFee;
          const remainingIncrease = targetFee - currentMonthlyFee;
          
          if (remainingIncrease > 0.5) { // If significant amount remains
            console.log(`   ⚠️ MAX INCREASE LIMIT HIT: Can only increase by ${(appliedIncrease/oldFee*100).toFixed(1)}% (max: ${(maxIncreaseRate*100).toFixed(1)}%)`);
            console.log(`   📅 Spreading remaining $${remainingIncrease.toFixed(2)} increase to future years`);
          }
          
          feeAdjustmentHistory.push({
            year,
            oldFee,
            newFee: currentMonthlyFee,
            reason: '5-year look-ahead: Insufficient fee increase',
            impact: currentMonthlyFee - oldFee
          });
          
          console.log(`📈 YEAR ${year}: 5-year analysis fee increase from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (${(appliedIncrease/oldFee*100).toFixed(1)}% increase)`);
          console.log(`   Reason: Insufficient funds for upcoming expenses`);
          if (remainingIncrease > 0.5) {
            console.log(`   Note: Limited by max increase ${(maxIncreaseRate*100).toFixed(1)}% - remaining $${remainingIncrease.toFixed(2)} needed`);
          }
          
          } else {
            console.log(`✅ YEAR ${year}: Fee appropriate for 5-year outlook (difference: $${feeDifference.toFixed(2)})`);
          }
        }
      }
      
      // Enhanced cash flow protection logic
      const lookAheadYears = 5;
      let requiresFlowProtection = false;
      let cashFlowRisk = 0;
      
      // Calculate rolling cash flow projection
      let projectedBalance = currentBalance;
      for (let futureYear = year + 1; futureYear <= year + lookAheadYears && futureYear < params.fiscalYear + params.period; futureYear++) {
        const futureExpenseDetails = calculateYearExpenses(expenses, futureYear, params.fiscalYear, params, false, 0, 0);
        const futureExpenses = futureExpenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
        const futureCollections = currentMonthlyFee * 12 * (params.housingUnits || 0);
        
        projectedBalance = projectedBalance + futureCollections - futureExpenses;
        
        // Multiple risk factors
        if (futureExpenses > currentBalance * 0.8) { // Major expense vs current balance
          cashFlowRisk += 0.3;
        }
        if (projectedBalance < 10000) { // Projected low balance
          cashFlowRisk += 0.4;
        }
        if (futureExpenses > futureCollections * 3) { // Expense much larger than annual collections
          cashFlowRisk += 0.3;
        }
      }
      
      // Apply cash flow protection if significant risk detected
      if (cashFlowRisk >= 0.5 && !feeAdjustments.has(year)) {
        requiresFlowProtection = true;
        const oldFee = currentMonthlyFee;
        
        // Calculate protection increase based on risk level
        const protectionIncrease = Math.max(
          oldFee * (0.05 + cashFlowRisk * 0.1), // 5-15% based on risk
          1.0 // Minimum $1 increase
        );
        
        currentMonthlyFee = Math.min(
          currentMonthlyFee + protectionIncrease,
          params.maximumAllowableFeeIncrease > 0 
            ? oldFee * (1 + params.maximumAllowableFeeIncrease / 100)
            : currentMonthlyFee + protectionIncrease
        );
        
        console.log(`🛡️ YEAR ${year}: Cash flow protection increase from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (Risk: ${(cashFlowRisk * 100).toFixed(0)}%)`);
      }
      
      // ZERO-DEFICIT ENFORCEMENT: Additional check for high starting balance scenarios
      if (isHighStartingBalance && currentBalance < 25000) { // If balance drops too low despite high starting amount
        const oldFee = currentMonthlyFee;
        const emergencyIncrease = Math.max(5.0, oldFee * 0.2); // At least $5 or 20% increase
        
        currentMonthlyFee = Math.min(
          currentMonthlyFee + emergencyIncrease,
          params.maximumAllowableFeeIncrease > 0 
            ? oldFee * (1 + params.maximumAllowableFeeIncrease / 100)
            : currentMonthlyFee + emergencyIncrease
        );
        
        console.log(`⚡ YEAR ${year}: Zero-deficit enforcement increase from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (Balance: $${currentBalance.toLocaleString()})`);
      }
      
      // 🎯 GLOBAL FEE INCREASE LIMITER: Ensure total increase never exceeds max percentage
      if (params.maximumAllowableFeeIncrease > 0) {
        const maxAllowedFeeForYear = yearStartingFee * (1 + params.maximumAllowableFeeIncrease / 100);
        
        if (currentMonthlyFee > maxAllowedFeeForYear) {
          const originalFee = currentMonthlyFee;
          currentMonthlyFee = maxAllowedFeeForYear;
          
          console.log(`🚨 YEAR ${year}: GLOBAL FEE LIMIT ENFORCED - Reduced from $${originalFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (max ${params.maximumAllowableFeeIncrease}% increase)`);
          console.log(`   Multiple adjustments attempted to exceed annual limit - enforcing user setting`);
        }
      }
    }

    // Calculate loan payments for existing loans FIRST
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

    // Calculate available cash (collections + balance, loan payments are separate outflows)
    const currentYearCollections = currentMonthlyFee * 12 * (params.housingUnits || 0);
    const availableCash = currentBalance + currentYearCollections;
    
    
    // Calculate expenses without loans first to see total burden
    const preliminaryExpenseDetails = calculateYearExpenses(
      expenses, 
      year, 
      params.fiscalYear, 
      params, 
      false, // No normalization for preliminary calculation
      0, // No available cash consideration for preliminary
      currentMonthlyFee
    );
    
    // Calculate total cash needed for all expenses INCLUDING loan payments
    let totalExpenseCost = preliminaryExpenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    const totalSafetyNet = totalExpenseCost * (params.safetyNetPercentage / 100);
    const totalCashNeeded = totalExpenseCost + totalSafetyNet + totalLoanPayments;
    
    // Debug logging for cash flow calculation
    if (totalExpenseCost > 0) {
      console.log(`🔍 YEAR ${year} CASH FLOW ANALYSIS:`);
      console.log(`   Opening balance: $${availableCash.toLocaleString()}`);
      console.log(`   Total expenses: $${totalExpenseCost.toLocaleString()}`);
      console.log(`   Safety net (${params.safetyNetPercentage}%): $${totalSafetyNet.toLocaleString()}`);
      console.log(`   Existing loan payments: $${totalLoanPayments.toLocaleString()}`);
      console.log(`   Total cash needed: $${totalCashNeeded.toLocaleString()}`);
    }
    
    
    // Smart loan calculation for the entire year
    let yearLoanAmount = 0;
    
    
    if (totalCashNeeded > availableCash) {
      const shortfall = totalCashNeeded - availableCash;
      const maxYearLoanAmount = totalExpenseCost * (params.loanThresholdPercentage / 100);
      
      // AGGRESSIVE LOAN LOGIC: Take maximum loan when there's a shortfall to minimize deficit
      // The threshold is the MAXIMUM allowed, and we should use it when needed
      yearLoanAmount = maxYearLoanAmount;
      
      // Debug logging for loan calculation
      console.log(`🔍 YEAR ${year} LOAN CALCULATION:`);
      console.log(`   Total cash needed: $${totalCashNeeded.toLocaleString()}`);
      console.log(`   Available cash: $${availableCash.toLocaleString()}`);
      console.log(`   Shortfall: $${shortfall.toLocaleString()}`);
      console.log(`   Max loan (${params.loanThresholdPercentage}% of $${totalExpenseCost.toLocaleString()}): $${maxYearLoanAmount.toLocaleString()}`);
      console.log(`   Loan taken: $${yearLoanAmount.toLocaleString()} (MAXIMUM to minimize deficit)`);
      
      // Calculate percentage based on TOTAL expenses (not out-of-pocket)
      const actualPercentage = totalExpenseCost > 0 ? (yearLoanAmount / totalExpenseCost) * 100 : 0;
      
      // Warn if shortfall exceeds what can be covered by maximum loan
      if (shortfall > maxYearLoanAmount) {
        const remainingShortfall = shortfall - maxYearLoanAmount;
        console.log(`   ⚠️  WARNING: Shortfall ($${shortfall.toLocaleString()}) exceeds max loan ($${maxYearLoanAmount.toLocaleString()})`);
        console.log(`   ⚠️  Remaining shortfall after max loan: $${remainingShortfall.toLocaleString()}`);
      }
          }
    
    // Now recalculate expenses with the year loan amount available
    const adjustedAvailableCash = availableCash + yearLoanAmount;
    const expenseDetails = calculateYearExpenses(
      expenses, 
      year, 
      params.fiscalYear, 
      params, 
      false, // Always use non-normalized to preserve year-level loan logic
      adjustedAvailableCash, 
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
    
    // Loan payments already calculated above

    // Use the smart year-level loan calculation instead of individual expense loans
    const totalLoansTaken = yearLoanAmount;
    
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
    
    // Update total expense cost with actual expense details (may differ from preliminary)
    totalExpenseCost = expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    
    // Calculate total out-of-pocket expenses (total expenses minus year loan)  
    const totalOutOfPocketExpenses = Math.max(0, totalExpenseCost - yearLoanAmount);
    
    
    // Calculate collections with the base fee - start with monthly fees collection for first year
    let collections = (year === params.fiscalYear) 
      ? params.monthlyReserveFeesPerHousingUnit * 12 * (params.housingUnits || 0)
      : currentMonthlyFee * 12 * (params.housingUnits || 0);
    
    // In normalized mode, we may need to adjust fees to eliminate deficits
    if (isNormalized) {
      // Calculate total cash needed including safety net and loan payments
      const normalizedSafetyNet = totalOutOfPocketExpenses * (params.safetyNetPercentage / 100);
      const totalCashNeeded = totalOutOfPocketExpenses + normalizedSafetyNet + totalLoanPayments;
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
        
        // Note: Normalized mode increased collections to eliminate deficit
      }
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
  
  // Basic deficit monitoring
  if (!isNormalized) {
    const deficitYears = projections.filter(p => p.closingBalance < 0);
    if (deficitYears.length > 0) {
      console.log(`Deficit years: ${deficitYears.map(y => y.year).join(', ')}`);
    }
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
    
    // Apply enhanced conservative surplus management if final balance is excessive
    const finalProjection = projections[projections.length - 1];
    if (finalProjection) {
      const lastYearFee = finalProjection.collections / (12 * (params.housingUnits || 1));
      const finalSurplusAnalysis = calculateConservativeFeeDecrease(
        projections,
        finalProjection.year,
        lastYearFee,
        params,
        expenses,
        activeLoans
      );
      
      // Only apply reduction if the analysis strongly recommends it
      // Enhanced threshold: Allow more aggressive reduction when we can go to zero
      const reductionThreshold = finalSurplusAnalysis.canGoToZero ? lastYearFee * 0.02 : lastYearFee * 0.05;
      
      if (finalSurplusAnalysis.canDecreaseFee && finalSurplusAnalysis.suggestedDecrease > reductionThreshold) {
        console.log(`💰 FINAL SURPLUS ANALYSIS: ${finalSurplusAnalysis.reasoning}`);
        console.log(`   Suggested reduction: $${finalSurplusAnalysis.suggestedDecrease.toFixed(2)} per unit`);
        
        // Apply conservative reduction to last few years only
        const yearsToAdjust = Math.min(3, projections.length);
        
        // Enhanced reduction factor based on zero-fee capability
        const reductionFactor = finalSurplusAnalysis.canGoToZero ? 0.8 : 0.5; // More aggressive when no minimum fee
        
        // Recalculate only the affected years
        for (let i = projections.length - yearsToAdjust; i < projections.length; i++) {
          if (i < 0) continue;
          
          const projection = projections[i];
          if (i > 0) {
            projection.openingBalance = projections[i - 1].closingBalance;
          }
          
          const currentFee = projection.collections / (12 * (params.housingUnits || 1));
          const adjustedFee = Math.max(
            params.minimumCollectionFee || 0,
            currentFee - (finalSurplusAnalysis.suggestedDecrease * reductionFactor)
          );
          
          projection.collections = adjustedFee * 12 * (params.housingUnits || 0);
          
          // Recalculate derived values
          const lossInPurchasePower = projection.openingBalance > 0 ? projection.openingBalance * (params.inflationRate / 100) : 0;
          const liquidationsTotal = Array.isArray(projection.investmentLiquidations) 
            ? projection.investmentLiquidations.reduce((sum: number, liquidation: any) => sum + (liquidation.liquidatedAmount || 0), 0)
            : (projection.investmentLiquidations || 0);
          
          projection.availableToInvest = Math.max(0, 
            projection.openingBalance + projection.collections + liquidationsTotal - 
            projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower
          );
          
          projection.closingBalance = projection.openingBalance + projection.collections + liquidationsTotal - 
            projection.expenses - projection.safetyNet - projection.loanPayments - lossInPurchasePower;
        }
        
        const zeroFeeAchieved = finalSurplusAnalysis.canGoToZero && 
          projections.some(p => (p.collections / (12 * (params.housingUnits || 1))) === 0);
        
        const resultMessage = zeroFeeAchieved 
          ? `✅ Applied conservative fee reduction to final ${yearsToAdjust} years (achieved $0 fee)`
          : `✅ Applied conservative fee reduction to final ${yearsToAdjust} years`;
        
        console.log(resultMessage);
      } else {
        console.log(`✋ Conservative analysis: No fee reduction recommended`);
        if (!finalSurplusAnalysis.canDecreaseFee) {
          console.log(`   Reason: ${finalSurplusAnalysis.reasoning}`);
        } else {
          console.log(`   Reduction too small: $${finalSurplusAnalysis.suggestedDecrease.toFixed(2)} < threshold $${reductionThreshold.toFixed(2)}`);
        }
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
