// LTIM (Long-Term Investment Management) calculation utilities
// Implements sophisticated time-bucketed investment strategies

import { LTIMStrategyData, LTIMConfig, LTIMSettings, LTIMBucket } from './db-types';

// Helper function to convert database strategy to strategy data
export function convertDbStrategyToData(dbStrategy: { name: string; start_year: number; buckets: string }): LTIMStrategyData {
  return {
    name: dbStrategy.name,
    start_year: dbStrategy.start_year,
    buckets: JSON.parse(dbStrategy.buckets)
  };
}

/**
 * Calculate weighted average LTIM rate based on spending distribution across time buckets
 */
export function calculateLTIMWeightedRate(
  spendings: number[], // Array of spending amounts by year
  startYear: number, // When LTIM starts (0-based index)
  strategy: LTIMStrategyData
): number {
  if (!spendings || spendings.length === 0 || !strategy.buckets || strategy.buckets.length === 0) {
    return 0;
  }

  let totalSpending = 0;
  let weightedRate = 0;
  let currentYear = startYear;

  // Process each bucket
  for (const bucket of strategy.buckets) {
    let bucketSpending = 0;

    // Sum spending for this bucket's duration
    for (let year = 0; year < bucket.dur; year++) {
      const spendingIndex = currentYear + year;
      if (spendingIndex < spendings.length) {
        bucketSpending += spendings[spendingIndex] || 0;
      }
    }

    totalSpending += bucketSpending;
    currentYear += bucket.dur;

    // If we've covered all years, break
    if (currentYear >= spendings.length) {
      break;
    }
  }

  // If no spending, return first bucket rate as default
  if (totalSpending === 0) {
    return strategy.buckets[0]?.rate || 0;
  }

  // Calculate weighted rate
  currentYear = startYear;
  for (const bucket of strategy.buckets) {
    let bucketSpending = 0;

    // Sum spending for this bucket's duration
    for (let year = 0; year < bucket.dur; year++) {
      const spendingIndex = currentYear + year;
      if (spendingIndex < spendings.length) {
        bucketSpending += spendings[spendingIndex] || 0;
      }
    }

    if (bucketSpending > 0) {
      const weight = bucketSpending / totalSpending;
      weightedRate += weight * bucket.rate;
    }

    currentYear += bucket.dur;

    // If we've covered all years, break
    if (currentYear >= spendings.length) {
      break;
    }
  }

  return weightedRate;
}

/**
 * Calculate LTIM investment amount based on surplus and settings
 */
export function calculateLTIMInvestmentAmount(
  surplusAmount: number,
  ltimSettings: LTIMSettings
): number {
  if (!ltimSettings.enabled || surplusAmount <= 0) {
    return 0;
  }

  return surplusAmount * (ltimSettings.ltim_percentage / 100);
}

/**
 * Calculate LTIM earnings for a given year
 */
export function calculateLTIMEarnings(
  ltimInvestmentAmount: number,
  weightedRate: number,
  year: number,
  ltimSettings: LTIMSettings
): number {
  // Check if LTIM has started yet
  if (year < ltimSettings.start_year || !ltimSettings.enabled) {
    return 0;
  }

  return ltimInvestmentAmount * weightedRate;
}

/**
 * Calculate accumulated LTIM funds with compounding
 */
export function calculateAccumulatedLTIMFunds(
  previousAccumulated: number,
  currentYearEarnings: number,
  weightedRate: number,
  year: number,
  ltimSettings: LTIMSettings
): number {
  if (!ltimSettings.enabled || year < ltimSettings.start_year) {
    return 0;
  }

  if (year === ltimSettings.start_year) {
    return currentYearEarnings;
  }

  // Compound previous accumulated funds and add current year earnings
  const compoundedPrevious = previousAccumulated * (1 + weightedRate);
  return compoundedPrevious + currentYearEarnings;
}

/**
 * Get LTIM strategy by state code (deprecated - use database strategies instead)
 * @deprecated Use database-based strategies instead
 */
export function getLTIMStrategy(strategyType: string, customStrategies?: LTIMConfig): LTIMStrategyData | null {
  console.warn('getLTIMStrategy is deprecated. Use database-based strategies instead.');
  return null;
}

/**
 * Calculate LTIM rate for a specific time horizon
 */
export function getLTIMRateForTimeHorizon(
  timeHorizonYears: number,
  strategy: LTIMStrategyData
): number {
  if (!strategy.buckets || strategy.buckets.length === 0) {
    return 0;
  }

  let currentYear = 0;
  
  // Find which bucket this time horizon falls into
  for (const bucket of strategy.buckets) {
    if (timeHorizonYears <= currentYear + bucket.dur) {
      return bucket.rate;
    }
    currentYear += bucket.dur;
  }

  // If beyond all buckets, return the last bucket's rate
  return strategy.buckets[strategy.buckets.length - 1].rate;
}

/**
 * Calculate total duration covered by LTIM strategy buckets
 */
export function getLTIMStrategyTotalDuration(strategy: LTIMStrategyData): number {
  return strategy.buckets.reduce((total, bucket) => total + bucket.dur, 0);
}

/**
 * Validate LTIM strategy configuration
 */
export function validateLTIMStrategy(strategy: LTIMStrategyData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!strategy.name || strategy.name.trim() === '') {
    errors.push('Strategy name is required');
  }

  if (strategy.start_year < 0) {
    errors.push('Start year must be 0 or greater');
  }

  if (!strategy.buckets || strategy.buckets.length === 0) {
    errors.push('Strategy must have at least one bucket');
  }

  if (strategy.buckets) {
    strategy.buckets.forEach((bucket, index) => {
      if (bucket.dur <= 0) {
        errors.push(`Bucket ${index + 1}: Duration must be greater than 0`);
      }
      if (bucket.rate < 0 || bucket.rate > 1) {
        errors.push(`Bucket ${index + 1}: Rate must be between 0 and 1 (as decimal)`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate LTIM settings
 */
export function validateLTIMSettings(settings: LTIMSettings): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (settings.ltim_percentage < 0 || settings.ltim_percentage > 100) {
    errors.push('LTIM percentage must be between 0 and 100');
  }

  if (settings.start_year < 0) {
    errors.push('Start year must be 0 or greater');
  }

  if (settings.strategy_id && settings.strategy_id.trim() === '') {
    errors.push('Strategy ID cannot be empty when specified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate client vs LTIM investment comparison
 */
export function calculateLTIMVsClientComparison(
  surplusAmount: number,
  ltimSettings: LTIMSettings,
  ltimWeightedRate: number,
  clientInvestmentRate: number
): {
  ltimAmount: number;
  clientAmount: number;
  ltimEarnings: number;
  clientEarnings: number;
  totalEarnings: number;
  ltimAdvantage: number;
} {
  const ltimAmount = calculateLTIMInvestmentAmount(surplusAmount, ltimSettings);
  const clientAmount = surplusAmount - ltimAmount;
  
  const ltimEarnings = ltimAmount * ltimWeightedRate;
  const clientEarnings = clientAmount * (clientInvestmentRate / 100);
  
  const totalEarnings = ltimEarnings + clientEarnings;
  const clientOnlyEarnings = surplusAmount * (clientInvestmentRate / 100);
  const ltimAdvantage = totalEarnings - clientOnlyEarnings;

  return {
    ltimAmount,
    clientAmount,
    ltimEarnings,
    clientEarnings,
    totalEarnings,
    ltimAdvantage
  };
}

/**
 * Format LTIM rate as percentage
 */
export function formatLTIMRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Convert percentage to decimal rate
 */
export function percentageToRate(percentage: number): number {
  return percentage / 100;
}

/**
 * Convert decimal rate to percentage
 */
export function rateToPercentage(rate: number): number {
  return rate * 100;
}
