// Financial Simulator calculation utilities
// Based on the financial simulator formulas and inputs document

import { Model, ModelItem, LTIMSettings, LtimStrategy, LTIMStrategyData } from './db-types';
import { 
  calculateLTIMWeightedRate, 
  calculateLTIMInvestmentAmount, 
  calculateLTIMEarnings, 
  calculateAccumulatedLTIMFunds
} from './ltim-calculations';

export interface FinancialProjection {
  year: number;
  totalAvailableToInvest: number;
  netEarnings: number;
  compoundValueOfSavings: number;
  projectedLTIMEarnings: number;
  projectedAccumulatedLTIMFunds: number;
  lossInPurchasingPower: number;
  loanPayments: number;
  remainingAmount: number;
  expenses: number; // Changed from 'spending' to 'expenses' and now calculated from model items
  
  // Enhanced LTIM fields
  ltimWeightedRate: number; // Calculated weighted rate for this year
  ltimInvestmentAmount: number; // Amount allocated to LTIM this year
  clientInvestmentAmount: number; // Amount allocated to client strategy this year
  clientInvestmentEarnings: number; // Earnings from client investment strategy
  totalInvestmentEarnings: number; // Combined LTIM + client earnings
  surplusAmount: number; // Available surplus before investment allocation
}

export interface FinancialSummary {
  totalProjectedGains: number;
  totalLTIMAccumulated: number;
  totalPurchasingPowerLoss: number;
  totalLoanPayments: number;
  totalExpenses: number; // Changed from 'totalSpending' to 'totalExpenses'
  finalRemainingAmount: number;
  averageRemainingAmount: number;
  minRemainingAmount: number;
  minRemainingAmountYear: number;
  
  // Enhanced LTIM summary fields
  totalLTIMEarnings: number;
  totalClientEarnings: number;
  totalLTIMInvestment: number;
  totalClientInvestment: number;
  averageLTIMRate: number;
  ltimVsClientAdvantage: number; // How much better LTIM performed vs client-only
}

/**
 * Calculate Total Available To Invest
 * Formula: Starting Amount + Immediate Assessment + Loan + Liquidated Investment Principal + Liquidated Earnings + Yearly Collections
 */
export function calculateTotalAvailableToInvest(model: Model): number {
  return (
    model.starting_amount +
    model.immediate_assessment +
    model.loan_amount +
    model.liquidated_investment_principal +
    model.liquidated_earnings +
    model.yearly_collections
  );
}

/**
 * Calculate Net Earnings from investments
 * Formula: Total Amount Invested × Annual Investment Return Rate
 */
export function calculateNetEarnings(model: Model): number {
  return model.total_amount_invested * (model.annual_investment_return_rate / 100);
}

/**
 * Calculate Compound Value of Savings
 * Formula: Investment Amount Taken for Compound × (1 + Bank Savings Interest Rate)
 */
export function calculateCompoundValueOfSavings(model: Model): number {
  return model.investment_amount_compound * (1 + model.bank_savings_interest_rate / 100);
}

/**
 * Calculate Projected LTIM Earnings
 * Formula: Amount Allocated to LTIM × LTIM Return Rate
 */
export function calculateProjectedLTIMEarnings(model: Model): number {
  // LTIM is now calculated as a percentage of surplus funds, not a fixed amount
  return 0;
}

/**
 * Calculate Projected Accumulated LTIM Funds
 * For first year, this equals projected LTIM earnings
 * For subsequent years, this accumulates with compound interest
 */
export function calculateProjectedAccumulatedLTIMFunds(
  model: Model,
  previousAccumulated: number = 0,
  year: number = 1
): number {
  const currentYearEarnings = calculateProjectedLTIMEarnings(model);
  
  if (year === 1) {
    return currentYearEarnings;
  }
  
  // Compound previous accumulated funds and add current year earnings
  const compoundedPrevious = previousAccumulated * (1 + model.ltim_return_rate / 100);
  return compoundedPrevious + currentYearEarnings;
}

/**
 * Calculate Loss in Purchasing Power due to inflation
 * Formula: Total Available To Invest × Inflation Rate
 */
export function calculateLossInPurchasingPower(model: Model): number {
  const totalAvailable = calculateTotalAvailableToInvest(model);
  return totalAvailable * (model.inflation_rate / 100);
}

/**
 * Calculate Monthly Loan Payment using standard amortization formula
 * Formula: P × (r/12) × (1 + r/12)^(n×12) / [(1 + r/12)^(n×12) - 1]
 * Where P = Principal, r = Annual interest rate, n = Loan term in years
 */
export function calculateMonthlyLoanPayment(model: Model): number {
  const P = model.loan_amount; // Principal loan amount
  const r = model.annual_loan_interest_rate / 100; // Annual interest rate as decimal
  const n = model.loan_term_years; // Loan term in years
  
  if (P === 0 || r === 0) {
    return 0;
  }
  
  const monthlyRate = r / 12;
  const numberOfPayments = n * 12;
  
  const numerator = P * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
  const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
  
  return numerator / denominator;
}

/**
 * Calculate Annual Loan Payments
 * Formula: Monthly Loan Payment × 12
 */
export function calculateAnnualLoanPayments(model: Model): number {
  return calculateMonthlyLoanPayment(model) * 12;
}

/**
 * Calculate annual expenses from model items based on replacement schedules
 * This determines which items need replacement in each year and applies inflation
 */
export function calculateAnnualExpensesFromItems(
  modelItems: ModelItem[],
  projectionYear: number,
  inflationRate: number
): number {
  let annualExpenses = 0;
  
  for (const item of modelItems) {
    const itemStartingYear = parseInt(item.starting_year);
    const firstReplacementYear = itemStartingYear + item.remaining_life;
    
    // Check if this item needs replacement in the current projection year
    if (projectionYear < firstReplacementYear) {
      // Item doesn't need replacement yet
      continue;
    }
    
    // If redundancy is 0 or 1, it's a one-time replacement
    if (item.redundancy <= 1) {
      if (projectionYear === firstReplacementYear) {
        // Apply inflation from item's starting year to replacement year
        const yearsOfInflation = projectionYear - itemStartingYear;
        const inflatedCost = item.cost * Math.pow(1 + inflationRate / 100, yearsOfInflation);
        annualExpenses += inflatedCost;
      }
    } else {
      // Item has a recurring replacement cycle
      const yearsSinceFirstReplacement = projectionYear - firstReplacementYear;
      
      if (yearsSinceFirstReplacement >= 0 && yearsSinceFirstReplacement % item.redundancy === 0) {
        // This is a replacement year - apply inflation from item's starting year
        const yearsOfInflation = projectionYear - itemStartingYear;
        const inflatedCost = item.cost * Math.pow(1 + inflationRate / 100, yearsOfInflation);
        annualExpenses += inflatedCost;
      }
    }
  }
  
  return annualExpenses;
}

/**
 * Calculate Remaining Amount for a single year
 * Formula: Total Available To Invest + Net Earnings + Compound Value of Savings + Projected LTIM Earnings 
 *          - Loss in Purchasing Power - Expenses - Loan Payments
 */
export function calculateRemainingAmount(
  model: Model,
  projectedLTIMEarnings: number,
  expenses: number,
  year: number = 1
): number {
  const totalAvailable = calculateTotalAvailableToInvest(model);
  const netEarnings = calculateNetEarnings(model);
  const compoundValue = calculateCompoundValueOfSavings(model);
  const lossInPurchasingPower = calculateLossInPurchasingPower(model);
  const loanPayments = calculateAnnualLoanPayments(model);
  
  return (
    totalAvailable +
    netEarnings +
    compoundValue +
    projectedLTIMEarnings -
    lossInPurchasingPower -
    expenses -
    loanPayments
  );
}

/**
 * Calculate financial projections over multiple years with enhanced LTIM support
 */
export function calculateFinancialProjections(
  model: Model,
  modelItems: ModelItem[],
  projectionYears: number = 30,
  ltimStrategyData?: LTIMStrategyData // Optional strategy data from database
): FinancialProjection[] {
  const projections: FinancialProjection[] = [];
  const currentYear = parseInt(model.fiscal_year);
  
  // Create LTIM settings from model
  const ltimSettings: LTIMSettings = {
    enabled: model.ltim_enabled || false,
    strategy_id: model.ltim_strategy_id,
    ltim_percentage: model.ltim_percentage || 0,
    start_year: model.ltim_start_year || 0
  };
  
  // Use provided strategy data or null if none available
  const ltimStrategy = ltimStrategyData || null;
  
  let accumulatedLTIMFunds = 0;
  
  // Pre-calculate all expenses for weighted rate calculation
  const allExpenses: number[] = [];
  for (let year = 1; year <= projectionYears; year++) {
    const projectionYear = currentYear + year - 1;
    const expenses = calculateAnnualExpensesFromItems(modelItems, projectionYear, model.inflation_rate);
    allExpenses.push(expenses);
  }
  
  // Calculate LTIM weighted rate if strategy exists
  const ltimWeightedRate = ltimStrategy && ltimSettings.enabled 
    ? calculateLTIMWeightedRate(allExpenses, ltimSettings.start_year, ltimStrategy)
    : 0;
  
  for (let year = 1; year <= projectionYears; year++) {
    const projectionYear = currentYear + year - 1;
    
    // Calculate basic components
    const totalAvailableToInvest = calculateTotalAvailableToInvest(model);
    const netEarnings = calculateNetEarnings(model);
    const compoundValueOfSavings = calculateCompoundValueOfSavings(model);
    const lossInPurchasingPower = calculateLossInPurchasingPower(model);
    const loanPayments = calculateAnnualLoanPayments(model);
    const expenses = allExpenses[year - 1];
    
    // Calculate surplus amount (available for investment strategies)
    const surplusAmount = Math.max(0, 
      totalAvailableToInvest + 
      netEarnings + 
      compoundValueOfSavings - 
      lossInPurchasingPower - 
      expenses - 
      loanPayments
    );
    
    // Calculate LTIM investment allocation
    const ltimInvestmentAmount = ltimSettings.enabled 
      ? calculateLTIMInvestmentAmount(surplusAmount, ltimSettings)
      : 0;
    
    const clientInvestmentAmount = surplusAmount - ltimInvestmentAmount;
    
    // Calculate LTIM earnings using weighted rate
    const projectedLTIMEarnings = ltimSettings.enabled && ltimStrategy
      ? calculateLTIMEarnings(ltimInvestmentAmount, ltimWeightedRate, year, ltimSettings)
      : 0;
    
    // Calculate client investment earnings
    const clientInvestmentEarnings = clientInvestmentAmount * (model.annual_investment_return_rate / 100);
    
    // Total investment earnings
    const totalInvestmentEarnings = projectedLTIMEarnings + clientInvestmentEarnings;
    
    // Calculate accumulated LTIM funds (compounding)
    accumulatedLTIMFunds = ltimSettings.enabled && ltimStrategy
      ? calculateAccumulatedLTIMFunds(
          accumulatedLTIMFunds, 
          projectedLTIMEarnings, 
          ltimWeightedRate, 
          year, 
          ltimSettings
        )
      : 0;
    
    // Calculate remaining amount
    const remainingAmount = 
      totalAvailableToInvest +
      netEarnings +
      compoundValueOfSavings +
      totalInvestmentEarnings -
      lossInPurchasingPower -
      expenses -
      loanPayments;
    
    projections.push({
      year: projectionYear,
      totalAvailableToInvest,
      netEarnings,
      compoundValueOfSavings,
      projectedLTIMEarnings,
      projectedAccumulatedLTIMFunds: accumulatedLTIMFunds,
      lossInPurchasingPower,
      loanPayments,
      remainingAmount,
      expenses,
      
      // Enhanced LTIM fields
      ltimWeightedRate,
      ltimInvestmentAmount,
      clientInvestmentAmount,
      clientInvestmentEarnings,
      totalInvestmentEarnings,
      surplusAmount
    });
  }
  
  return projections;
}

/**
 * Generate enhanced summary statistics from financial projections
 */
export function generateFinancialSummary(projections: FinancialProjection[]): FinancialSummary {
  const totalProjectedGains = projections.reduce(
    (sum, p) => sum + p.netEarnings + p.compoundValueOfSavings + p.totalInvestmentEarnings, 
    0
  );
  
  const totalLTIMAccumulated = projections[projections.length - 1]?.projectedAccumulatedLTIMFunds ?? 0;
  
  const totalPurchasingPowerLoss = projections.reduce((sum, p) => sum + p.lossInPurchasingPower, 0);
  const totalLoanPayments = projections.reduce((sum, p) => sum + p.loanPayments, 0);
  const totalExpenses = projections.reduce((sum, p) => sum + p.expenses, 0);
  
  const finalRemainingAmount = projections[projections.length - 1]?.remainingAmount ?? 0;
  
  // Calculate average remaining amount
  const averageRemainingAmount = projections.reduce((sum, p) => sum + p.remainingAmount, 0) / projections.length;
  
  // Find minimum remaining amount and year
  let minRemainingAmount = Number.MAX_VALUE;
  let minRemainingAmountYear = 0;
  
  projections.forEach(p => {
    if (p.remainingAmount < minRemainingAmount) {
      minRemainingAmount = p.remainingAmount;
      minRemainingAmountYear = p.year;
    }
  });
  
  // Enhanced LTIM calculations
  const totalLTIMEarnings = projections.reduce((sum, p) => sum + p.projectedLTIMEarnings, 0);
  const totalClientEarnings = projections.reduce((sum, p) => sum + p.clientInvestmentEarnings, 0);
  const totalLTIMInvestment = projections.reduce((sum, p) => sum + p.ltimInvestmentAmount, 0);
  const totalClientInvestment = projections.reduce((sum, p) => sum + p.clientInvestmentAmount, 0);
  
  // Calculate average LTIM rate (weighted by investment amounts)
  const averageLTIMRate = totalLTIMInvestment > 0 
    ? projections.reduce((sum, p) => sum + (p.ltimWeightedRate * p.ltimInvestmentAmount), 0) / totalLTIMInvestment
    : 0;
  
  // Calculate LTIM vs Client advantage
  // This compares total investment earnings vs what would have been earned with client strategy only
  const totalSurplus = projections.reduce((sum, p) => sum + p.surplusAmount, 0);
  const clientOnlyEarnings = projections.reduce((sum, p) => 
    sum + (p.surplusAmount * (p.netEarnings / Math.max(1, p.totalAvailableToInvest))), 0
  );
  const actualTotalEarnings = totalLTIMEarnings + totalClientEarnings;
  const ltimVsClientAdvantage = actualTotalEarnings - clientOnlyEarnings;
  
  return {
    totalProjectedGains,
    totalLTIMAccumulated,
    totalPurchasingPowerLoss,
    totalLoanPayments,
    totalExpenses,
    finalRemainingAmount,
    averageRemainingAmount,
    minRemainingAmount,
    minRemainingAmountYear,
    
    // Enhanced LTIM summary fields
    totalLTIMEarnings,
    totalClientEarnings,
    totalLTIMInvestment,
    totalClientInvestment,
    averageLTIMRate,
    ltimVsClientAdvantage
  };
}

/**
 * Validate that investment allocations don't exceed available funds
 */
export function validateInvestmentAllocations(model: Model): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const totalAvailable = calculateTotalAvailableToInvest(model);
  
  // Check if Total Amount Invested is within limits
  if (model.total_amount_invested > totalAvailable) {
    errors.push(`Total Amount Invested (${model.total_amount_invested}) cannot exceed Total Available To Invest (${totalAvailable})`);
  }
  
  // Check if Investment Amount for Compound is within limits
  const remainingAfterInvestment = totalAvailable - model.total_amount_invested;
  if (model.investment_amount_compound > remainingAfterInvestment) {
    errors.push(`Investment Amount for Compound (${model.investment_amount_compound}) cannot exceed remaining available funds (${remainingAfterInvestment})`);
  }
  
  // Check if Amount Allocated to LTIM is within limits
  const remainingAfterCompound = remainingAfterInvestment - model.investment_amount_compound;
  // LTIM validation is now percentage-based, handled elsewhere
  
  return {
    isValid: errors.length === 0,
    errors,
  };
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
