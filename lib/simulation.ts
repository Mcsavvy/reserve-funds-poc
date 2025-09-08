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
  expenses: Expense[]
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
    remainingSimulationExpenses += futureYearExpenses;
    if (futureYearExpenses > 0) {
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
    totalUpcomingExpenses += futureExpenses;
    
    if (futureExpenses > currentBalance * 0.1) {
      hasSignificantUpcomingExpenses = true;
    }
  }
  
  // Enhanced approach: Different safety multipliers based on fee flexibility
  // If we can go to zero (no minimum fee), we can be more aggressive with surplus
  // If there's a minimum fee, we need to be more conservative
  const canGoToZero = minimumFee === 0;
  let safetyMultiplier: number;
  
  if (canGoToZero) {
    // ULTRA aggressive reduction when no minimum fee constraint
    safetyMultiplier = hasSignificantUpcomingExpenses ? 1.5 : 1.2;
  } else {
    // Moderate when minimum fee exists
    safetyMultiplier = hasSignificantUpcomingExpenses ? 2.0 : 1.5;
  }
  
  const targetReserve = totalUpcomingExpenses * safetyMultiplier;
  
  // OVERRIDE SAFETY CHECK for end-of-simulation scenarios with no remaining expenses
  const isEndOfSimulationWithNoExpenses = !hasAnyRemainingExpenses && remainingYears <= 5;
  
  if (!isEndOfSimulationWithNoExpenses && currentBalance <= targetReserve) {
    return { 
      canDecreaseFee: false, 
      suggestedDecrease: 0, 
      reasoning: `Current balance ($${currentBalance.toLocaleString()}) needed for upcoming expenses ($${totalUpcomingExpenses.toLocaleString()})` 
    };
  }
  
  // For end-of-simulation with no expenses, use remaining simulation expenses instead
  const effectiveUpcomingExpenses = isEndOfSimulationWithNoExpenses ? remainingSimulationExpenses : totalUpcomingExpenses;
  
  // DEBUG: Log the expense calculations to see why they differ from main logic
  console.log(`   💡 FEE DECREASE CALC: totalUpcoming=$${totalUpcomingExpenses.toLocaleString()}, effective=$${effectiveUpcomingExpenses.toLocaleString()}, endOfSim=${isEndOfSimulationWithNoExpenses}`);
  
  // Calculate safe decrease amount
  const excessAmount = currentBalance - targetReserve;
  
  // Enhanced reduction calculation based on excess amount and fee flexibility
  let reductionPercentage: number;
  
  // For very high surpluses, be much more aggressive
  // MUCH MORE AGGRESSIVE REDUCTION LOGIC
  const isVeryHighSurplus = currentBalance > totalUpcomingExpenses * 3; // Reduced from 8x to 3x
  const hasMinimalExpenses = totalUpcomingExpenses < 50000; // Very low upcoming expenses
  
  let monthlyReduction: number;
  
  // SIMPLIFIED ULTRA-AGGRESSIVE LOGIC: Focus only on expenses, ignore starting balance completely
  
  
  if (isEndOfSimulationWithNoExpenses && currentBalance > 20000) {
    // NO MORE EXPENSES FOR REST OF SIMULATION: Immediate reduction to minimum fee
    monthlyReduction = currentFee - effectiveMinimumFee;
    reductionPercentage = 1.0; // For logging
    console.log(`   🎯 END-OF-SIM: No expenses for remaining ${remainingYears} years - IMMEDIATE reduction to ${effectiveMinimumFee > 0 ? '$' + effectiveMinimumFee + ' minimum' : '$0'}`);
  } else if (effectiveUpcomingExpenses === 0 && currentBalance > 15000) {
    // NO EXPENSES: Ultra aggressive - reduce by 60% of current fee per year
    monthlyReduction = Math.min(currentFee * 0.6, currentFee - effectiveMinimumFee);
    reductionPercentage = 0.9; // For logging
    console.log(`   🚀 ZERO EXPENSES DETECTED - Ultra aggressive 60% fee reduction`);
  } else if (effectiveUpcomingExpenses < 25000 && currentBalance > 25000) {
    // MINIMAL EXPENSES: Very aggressive - reduce by 25% of current fee per year  
    monthlyReduction = Math.min(currentFee * 0.25, currentFee - effectiveMinimumFee);
    reductionPercentage = 0.7; // For logging
    console.log(`   ⚡ MINIMAL EXPENSES - Aggressive 25% fee reduction`);
  } else if (currentBalance > effectiveUpcomingExpenses * 1.5) {
    // HIGH SURPLUS: Aggressive - reduce by 30% of current fee per year
    monthlyReduction = Math.min(currentFee * 0.3, currentFee - effectiveMinimumFee);
    reductionPercentage = 0.5; // For logging
    console.log(`   💰 HIGH SURPLUS - Aggressive 30% fee reduction`);
  } else if (currentBalance > effectiveUpcomingExpenses * 1.1) {
    // GOOD SURPLUS: Standard - reduce by 20% of current fee per year
    monthlyReduction = Math.min(currentFee * 0.2, currentFee - effectiveMinimumFee);
    reductionPercentage = 0.3; // For logging
    console.log(`   ✅ GOOD SURPLUS - Standard 20% fee reduction`);
  } else {
    // MINIMAL SURPLUS: Conservative - reduce by 10% of current fee per year
    monthlyReduction = Math.min(currentFee * 0.1, currentFee - effectiveMinimumFee);
    reductionPercentage = 0.1; // For logging
    console.log(`   📊 MINIMAL SURPLUS - Conservative 10% fee reduction`);
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
  console.log('🚀 ULTRA-AGGRESSIVE FEE DECREASE VERSION - STARTING SIMULATION');
  // ENHANCED RETROSPECTIVE FEE ADJUSTMENT APPROACH
  // Step 1: Generate initial projections to identify deficits
  // Step 2: Analyze root causes of deficits by looking back at past years
  // Step 3: Implement multi-year fee adjustment strategy to prevent future deficits
  // Step 4: Apply conservative surplus management for fee decreases
  
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
    const collections = initialFee * 12 * (params.housingUnits || 0);
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
  
  // ZERO-DEFICIT STRATEGY for high starting balances
  const deficitYears = initialProjections.filter(p => p.closingBalance < 0);
  const lowBalanceYears = initialProjections.filter(p => p.closingBalance >= 0 && p.closingBalance < 50000);
  const feeAdjustments: Map<number, number> = new Map();
  
  if (isHighStartingBalance && deficitYears.length > 0) {
    console.log(`🎯 ZERO-DEFICIT STRATEGY ACTIVATED: Starting balance $${params.startingAmount.toLocaleString()} should prevent ALL deficits`);
    
    // Calculate total deficit amount across all years
    const totalDeficitAmount = deficitYears.reduce((sum, p) => sum + Math.abs(p.closingBalance), 0);
    console.log(`   Total deficit to prevent: $${totalDeficitAmount.toLocaleString()} across ${deficitYears.length} years`);
    
    // SIMPLIFIED APPROACH: Calculate what additional fee is needed to eliminate ALL deficits
    // Based on your data: with $500K starting, still getting 5 deficit years
    // This means we need much more aggressive fee increases
    
    // Strategy: Add enough monthly fee to generate sufficient cash flow
    // to cover all deficit amounts plus a safety buffer
    const totalCashShortfall = totalDeficitAmount + (totalDeficitAmount * 0.5); // 50% safety buffer
    const yearsToSpread = Math.max(params.period - 5, 15); // Spread over most years, but not the last 5
    const additionalAnnualCollections = totalCashShortfall / yearsToSpread;
    const additionalMonthlyFee = additionalAnnualCollections / (12 * (params.housingUnits || 1));
    
    console.log(`   Cash shortfall: $${totalCashShortfall.toLocaleString()}`);
    console.log(`   Additional monthly fee needed: $${additionalMonthlyFee.toFixed(2)} per unit`);
    console.log(`   Spreading over ${yearsToSpread} years`);
    
    // Apply the additional fee to all years (except the last few)
    for (let yearIndex = 0; yearIndex < yearsToSpread; yearIndex++) {
      const year = params.fiscalYear + yearIndex;
      
      // Start with base increase, then add progressive scaling
      let yearlyIncrease = additionalMonthlyFee;
      
      // Add progressive scaling for later years when major expenses occur
      if (yearIndex >= 15) { // Years 2035 onwards need more
        yearlyIncrease = additionalMonthlyFee * 1.5;
      } else if (yearIndex >= 10) { // Years 2030 onwards need moderate increase
        yearlyIncrease = additionalMonthlyFee * 1.2;
      }
      
      feeAdjustments.set(year, yearlyIncrease);
      
      if (yearIndex < 5) { // Log first 5 years for debugging
        console.log(`     Year ${year}: Adding $${yearlyIncrease.toFixed(2)} per unit`);
      }
    }
    
    console.log(`   Applied progressive fee increases to ${yearsToSpread} years to ensure zero deficits`);
  }
  
  // FALLBACK: If high starting balance but no deficits detected in initial scan,
  // still apply preventive increases to handle cash flow better
  else if (isHighStartingBalance) {
    // Check if balance drops below 25% of starting amount at any point
    const criticalThreshold = params.startingAmount * 0.25;
    const lowBalanceYearsExtended = initialProjections.filter(p => p.closingBalance < criticalThreshold);
    
    if (lowBalanceYearsExtended.length > 0) {
      console.log(`🛡️ HIGH BALANCE PROTECTION: Preventing balance from dropping too low (below $${criticalThreshold.toLocaleString()})`);
      
      // Apply moderate increases to maintain healthy balance
      const protectionFee = 2.0; // $2 per unit per month protection
      for (let yearIndex = 0; yearIndex < Math.min(params.period, 20); yearIndex++) {
        const year = params.fiscalYear + yearIndex;
        const currentAdjustment = feeAdjustments.get(year) || 0;
        feeAdjustments.set(year, Math.max(currentAdjustment, protectionFee));
      }
      
      console.log(`   Applied $${protectionFee} protection fee to first 20 years`);
    }
  }
  
  // Enhanced analysis for lower starting balances - more aggressive approach
  else {
    console.log(`🔧 STANDARD DEFICIT PREVENTION: Starting balance $${params.startingAmount.toLocaleString()}`);
    
    // For low starting balances, be much more aggressive
    const isLowStartingBalance = params.startingAmount < 200000;
    
    if (isLowStartingBalance && deficitYears.length > 0) {
      console.log(`⚡ LOW BALANCE AGGRESSIVE MODE: ${deficitYears.length} deficit years detected`);
      
      // Calculate total deficit and apply aggressive strategy similar to high balance
      const totalDeficitAmount = deficitYears.reduce((sum, p) => sum + Math.abs(p.closingBalance), 0);
      const totalCashShortfall = totalDeficitAmount * 2.0; // Double buffer for low starting balance
      const yearsToSpread = Math.max(Math.floor(params.period * 0.8), 10); // Spread over 80% of period
      const additionalAnnualCollections = totalCashShortfall / yearsToSpread;
      const additionalMonthlyFee = additionalAnnualCollections / (12 * (params.housingUnits || 1));
      
      console.log(`   Total deficit: $${totalDeficitAmount.toLocaleString()}`);
      console.log(`   Cash shortfall (2x buffer): $${totalCashShortfall.toLocaleString()}`);
      console.log(`   Additional monthly fee needed: $${additionalMonthlyFee.toFixed(2)} per unit`);
      
      // Apply the additional fee with progressive scaling
      for (let yearIndex = 0; yearIndex < yearsToSpread; yearIndex++) {
        const year = params.fiscalYear + yearIndex;
        
        // Progressive scaling for low balance scenarios
        let yearlyIncrease = additionalMonthlyFee;
        if (yearIndex >= 5) { // After year 5, increase more
          yearlyIncrease = additionalMonthlyFee * 1.3;
        }
        
        feeAdjustments.set(year, yearlyIncrease);
        
        if (yearIndex < 5) {
          console.log(`     Year ${year}: Adding $${yearlyIncrease.toFixed(2)} per unit`);
        }
      }
    } else {
      // Standard analysis for normal starting balances
      const problematicYears = [...deficitYears, ...lowBalanceYears.filter(p => !deficitYears.includes(p))];
      
      for (const problemProjection of problematicYears) {
        const isDeficit = problemProjection.closingBalance < 0;
        const analysis = analyzeDeficitRootCauses(initialProjections, problemProjection.year, params, expenses);
        
        if (analysis.recommendedFeeAdjustment > 0) {
          const statusLabel = isDeficit ? 'DEFICIT' : 'LOW BALANCE';
          console.log(`🔍 ${statusLabel} ANALYSIS for year ${problemProjection.year}:`);
          console.log(`   Balance: $${problemProjection.closingBalance.toLocaleString()}`);
          console.log(`   Recommended fee adjustment: $${analysis.recommendedFeeAdjustment.toFixed(2)} starting year ${analysis.adjustmentStartYear}`);
          
          // Apply more aggressive adjustment for deficit years
          const adjustmentMultiplier = isDeficit ? 1.2 : 0.8;
          const effectiveAdjustment = analysis.recommendedFeeAdjustment * adjustmentMultiplier;
          
          // Apply the recommended adjustment starting from the calculated year
          for (let adjustYear = analysis.adjustmentStartYear; adjustYear <= problemProjection.year; adjustYear++) {
            const currentAdjustment = feeAdjustments.get(adjustYear) || 0;
            feeAdjustments.set(adjustYear, Math.max(currentAdjustment, effectiveAdjustment));
          }
        }
      }
    }
    
    // Enhanced early deficit prevention
    if (deficitYears.length > 0) {
      const firstDeficitYear = Math.min(...deficitYears.map(p => p.year));
      const earlyYearsNeedingBoost = params.fiscalYear + 5; // Extend to 5 years
      
      if (firstDeficitYear <= earlyYearsNeedingBoost) {
        // More aggressive base increases based on starting balance
        let baseIncrease = 2.0;
        if (isLowStartingBalance) baseIncrease = 4.0;
        else if (isHighStartingBalance) baseIncrease = 3.0;
        
        for (let year = params.fiscalYear; year <= earlyYearsNeedingBoost; year++) {
          const currentAdjustment = feeAdjustments.get(year) || 0;
          feeAdjustments.set(year, Math.max(currentAdjustment, baseIncrease));
        }
        console.log(`🚨 EARLY DEFICIT PREVENTION: Applied $${baseIncrease} base increase to years ${params.fiscalYear}-${earlyYearsNeedingBoost}`);
      }
    }
  }

  for (let year = params.fiscalYear; year < params.fiscalYear + params.period; year++) {
    // Apply intelligent fee adjustments FIRST, before calculating expenses and collections
    if (!isNormalized) {
      const minimumFee = params.minimumCollectionFee || 0;
      
      // Apply any pre-calculated fee adjustments from deficit analysis
      const preCalculatedAdjustment = feeAdjustments.get(year) || 0;
      if (preCalculatedAdjustment > 0) {
        const oldFee = currentMonthlyFee;
        
        // For high starting balance scenarios, be more aggressive and ignore max increase limits if necessary
        if (isHighStartingBalance) {
          currentMonthlyFee = currentMonthlyFee + preCalculatedAdjustment;
          console.log(`📈 YEAR ${year}: ZERO-DEFICIT fee increase from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} (added $${preCalculatedAdjustment.toFixed(2)})`);
        } else {
          currentMonthlyFee = Math.min(
            currentMonthlyFee + preCalculatedAdjustment,
            params.maximumAllowableFeeIncrease > 0 
              ? currentMonthlyFee * (1 + params.maximumAllowableFeeIncrease / 100)
              : currentMonthlyFee + preCalculatedAdjustment
          );
          console.log(`📈 YEAR ${year}: Preventive fee increase from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)} based on deficit analysis`);
        }
        
        feeAdjustmentHistory.push({
          year,
          oldFee,
          newFee: currentMonthlyFee,
          reason: isHighStartingBalance ? 'Zero-deficit strategy for high starting balance' : 'Deficit prevention based on root cause analysis',
          impact: preCalculatedAdjustment
        });
      } else if (isHighStartingBalance && year <= params.fiscalYear + 5) {
        // Debug: Log when no adjustment is found for high balance scenario
        console.log(`🔍 YEAR ${year}: No fee adjustment found (high starting balance scenario)`);
      }
      
      // Enhanced fee decrease logic for surplus scenarios - ALWAYS CHECK, regardless of starting balance
      if (year > params.fiscalYear) { // Not in first year
        const currentProjection = projections.find(p => p.year === year - 1);
        if (currentProjection && currentProjection.closingBalance > 0) {
          
          // ENHANCED SURPLUS DETECTION: More intelligent thresholds based on starting balance and expenses
          let surplusThreshold: number;
          let veryHighSurplusThreshold: number;
          
          // Calculate upcoming expenses for better threshold setting
          let upcomingExpenses = 0;
          const remainingYears = (params.fiscalYear + params.period) - year;
          let hasAnyRemainingExpenses = false;
          
          // Check ALL remaining years in the simulation, not just next 5
          for (let futureYear = year; futureYear < params.fiscalYear + params.period; futureYear++) {
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
            if (futureYearExpenses > 0) {
              hasAnyRemainingExpenses = true;
            }
            upcomingExpenses += futureYearExpenses;
          }
          
          // SPECIAL CASE: No more expenses for the rest of the simulation
          const noMoreExpenses = !hasAnyRemainingExpenses;
          
          // ULTRA-AGGRESSIVE EXPENSE-ONLY BASED DETECTION: Ignore starting amount completely
          // Focus ONLY on upcoming expenses for fee decrease decisions
          
          if (noMoreExpenses && remainingYears <= 5) {
            // SPECIAL CASE: No more expenses for rest of simulation - IMMEDIATE reduction to minimum
            surplusThreshold = 10000;  // Just $10K - almost any balance triggers reduction
            veryHighSurplusThreshold = 20000; // Just $20K for immediate zero fee
            console.log(`🎯 NO MORE EXPENSES for remaining ${remainingYears} years - IMMEDIATE fee reduction mode`);
          } else if (upcomingExpenses > 0) {
            // Base thresholds ONLY on upcoming expenses - ultra responsive
            surplusThreshold = upcomingExpenses * 1.2;  // Just 1.2x upcoming expenses
            veryHighSurplusThreshold = upcomingExpenses * 2.0; // Just 2x upcoming expenses
          } else {
            // No upcoming expenses - EXTREMELY aggressive since zero risk
            surplusThreshold = 5000;   // Just $5K minimum buffer - ULTRA AGGRESSIVE
            veryHighSurplusThreshold = 15000; // Just $15K for very aggressive reduction
          }
          
          const isSubstantialSurplus = currentProjection.closingBalance > surplusThreshold;
          const isVeryHighSurplus = currentProjection.closingBalance > veryHighSurplusThreshold;
          
          // Debug logging for surplus detection - LOG ALL YEARS TO DEBUG
          if (true) { // Log ALL years to debug the issue
            console.log(`🔍 YEAR ${year - 1} EXPENSE-BASED SURPLUS CHECK: Balance $${currentProjection.closingBalance.toLocaleString()}`);
            console.log(`   Upcoming 5yr expenses: $${upcomingExpenses.toLocaleString()}`);
            const thresholdDescription = noMoreExpenses && remainingYears <= 5 ? 'END-OF-SIM' : 
                                       upcomingExpenses > 0 ? '1.2x expenses' : '$25K min';
            const veryHighDescription = noMoreExpenses && remainingYears <= 5 ? 'END-OF-SIM' : 
                                      upcomingExpenses > 0 ? '2x expenses' : '$50K min';
            console.log(`   Surplus threshold: $${surplusThreshold.toLocaleString()} (${thresholdDescription})`);
            console.log(`   Very high threshold: $${veryHighSurplusThreshold.toLocaleString()} (${veryHighDescription})`);
            console.log(`   Surplus detected: ${isSubstantialSurplus ? '✅ YES' : '❌ NO'} | Very high: ${isVeryHighSurplus ? '✅ YES' : '❌ NO'}`);
            if (noMoreExpenses) {
              console.log(`   🎯 NO MORE EXPENSES for remaining ${remainingYears} years!`);
            }
          }
          
          if (isSubstantialSurplus) {
            console.log(`💰 SURPLUS DETECTED in year ${year - 1}: Balance $${currentProjection.closingBalance.toLocaleString()}`);
            
            const decreaseAnalysis = calculateConservativeFeeDecrease(
              projections,
              year - 1,
              currentMonthlyFee,
              params,
              expenses
            );
            
            // For very high surplus, be more aggressive with reductions
            let actualDecrease = decreaseAnalysis.suggestedDecrease;
            if (isVeryHighSurplus && decreaseAnalysis.canDecreaseFee) {
              actualDecrease = Math.max(actualDecrease, currentMonthlyFee * 0.1); // At least 10% reduction
              console.log(`   Very high surplus detected - applying aggressive reduction`);
            }
            
            if (decreaseAnalysis.canDecreaseFee && actualDecrease > 0) {
              const oldFee = currentMonthlyFee;
              currentMonthlyFee = Math.max(minimumFee, currentMonthlyFee - actualDecrease);
              
              feeAdjustmentHistory.push({
                year,
                oldFee,
                newFee: currentMonthlyFee,
                reason: isVeryHighSurplus ? 'Aggressive surplus management' : 'Conservative surplus management',
                impact: -actualDecrease
              });
              
              const zeroFeeNote = decreaseAnalysis.canGoToZero && currentMonthlyFee === 0 ? ' (reached $0 fee)' : '';
              const minFeeNote = currentMonthlyFee === minimumFee && minimumFee > 0 ? ` (limited by minimum $${minimumFee})` : '';
              console.log(`📉 YEAR ${year}: Fee decrease from $${oldFee.toFixed(2)} to $${currentMonthlyFee.toFixed(2)}${zeroFeeNote}${minFeeNote}`);
              console.log(`   Reasoning: ${decreaseAnalysis.reasoning}`);
            } else {
              console.log(`   No fee reduction applied: ${decreaseAnalysis.reasoning}`);
            }
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

    // Calculate available cash AFTER accounting for loan payments
    const currentYearCollections = currentMonthlyFee * 12 * (params.housingUnits || 0);
    const availableCash = currentBalance + currentYearCollections - totalLoanPayments;
    
    
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
      
      // SIMPLE LOAN LOGIC: Take loan based on actual need, up to the threshold limit
      // The threshold is the MAXIMUM allowed, not a requirement to take that amount
      yearLoanAmount = Math.min(shortfall, maxYearLoanAmount);
      
      // Debug logging for loan calculation
      console.log(`🔍 YEAR ${year} LOAN CALCULATION:`);
      console.log(`   Total cash needed: $${totalCashNeeded.toLocaleString()}`);
      console.log(`   Available cash: $${availableCash.toLocaleString()}`);
      console.log(`   Shortfall: $${shortfall.toLocaleString()}`);
      console.log(`   Max loan (${params.loanThresholdPercentage}% of $${totalExpenseCost.toLocaleString()}): $${maxYearLoanAmount.toLocaleString()}`);
      console.log(`   Loan taken: $${yearLoanAmount.toLocaleString()}`);
      
      // Calculate percentage based on TOTAL expenses (not out-of-pocket)
      const actualPercentage = totalExpenseCost > 0 ? (yearLoanAmount / totalExpenseCost) * 100 : 0;
      
      // CRITICAL: Ensure loan never exceeds threshold
      if (actualPercentage > params.loanThresholdPercentage) {
        yearLoanAmount = maxYearLoanAmount;
      }
      
      // Warn if shortfall exceeds what can be covered by maximum loan
      if (shortfall > maxYearLoanAmount) {
        const remainingShortfall = shortfall - maxYearLoanAmount;
        // Note: Remaining shortfall will result in deficit, but loan is capped at threshold
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
    
    
    // Calculate collections with the base fee
    let collections = currentMonthlyFee * 12 * (params.housingUnits || 0);
    
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
        expenses
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
