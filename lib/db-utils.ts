import { Model, Expense } from './db-schemas';

/**
 * Calculate total expenses for a model
 */
export const calculateTotalExpenses = (expenses: Expense[]): number => {
  return expenses.reduce((total, expense) => total + expense.cost, 0);
};

/**
 * Get expenses that need attention (remaining life <= 5 years or <= 25% of expected life)
 */
export const getExpensesNeedingAttention = (expenses: Expense[]): Expense[] => {
  return expenses.filter(expense => {
    const remainingPercentage = (expense.remainingLife / expense.expectedLife) * 100;
    return expense.remainingLife <= 5 || remainingPercentage <= 25;
  });
};

/**
 * Calculate average expected life of expenses
 */
export const calculateAverageExpectedLife = (expenses: Expense[]): number => {
  if (expenses.length === 0) return 0;
  const total = expenses.reduce((sum, expense) => sum + expense.expectedLife, 0);
  return total / expenses.length;
};

/**
 * Get expenses filtered by SIRS status
 */
export const getExpensesBySIRS = (expenses: Expense[], sirs: boolean): Expense[] => {
  return expenses.filter(expense => expense.sirs === sirs);
};


/**
 * Validate model data before saving
 */
export const validateModelData = (model: Partial<Model>): string[] => {
  const errors: string[] = [];
  
  if (!model.name || model.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!model.period || model.period <= 0) {
    errors.push('Period must be greater than 0');
  }
  
  if (model.startingAmount !== undefined && model.startingAmount < 0) {
    errors.push('Starting amount cannot be negative');
  }
  
  if (model.safetyNetPercentage !== undefined && (model.safetyNetPercentage < 0 || model.safetyNetPercentage > 100)) {
    errors.push('Safety net percentage must be between 0 and 100');
  }
  
  if (model.cashReserveThresholdPercentage !== undefined && (model.cashReserveThresholdPercentage < 0 || model.cashReserveThresholdPercentage > 100)) {
    errors.push('Cash reserve threshold percentage must be between 0 and 100');
  }
  
  return errors;
};

/**
 * Validate expense data before saving
 */
export const validateExpenseData = (expense: Partial<Expense>): string[] => {
  const errors: string[] = [];
  
  if (!expense.name || expense.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!expense.modelId || expense.modelId.trim().length === 0) {
    errors.push('Model ID is required');
  }
  
  if (expense.expectedLife !== undefined && expense.expectedLife <= 0) {
    errors.push('Expected life must be greater than 0');
  }
  
  if (expense.remainingLife !== undefined && expense.remainingLife < 0) {
    errors.push('Remaining life cannot be negative');
  }
  
  if (expense.cost !== undefined && expense.cost < 0) {
    errors.push('Cost cannot be negative');
  }
  
  if (expense.expectedLife !== undefined && expense.remainingLife !== undefined && expense.remainingLife > expense.expectedLife) {
    errors.push('Remaining life cannot be greater than expected life');
  }
  
  return errors;
};

/**
 * Format currency values
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
};
