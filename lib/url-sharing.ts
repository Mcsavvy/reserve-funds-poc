import { Model, Expense } from '@/lib/db-schemas';

export interface ShareableModelData {
  model: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>;
  expenses: Omit<Expense, 'id' | 'modelId' | 'createdAt' | 'updatedAt'>[];
  type: 'reserve-fund-model-share';
  timestamp: number;
  version: string;
}

const CURRENT_VERSION = '1.0';

/**
 * Creates a shareable URL for a model
 */
export function createShareableUrl(model: Model, expenses: Expense[]): string {
  const shareData: ShareableModelData = {
    model: {
      name: model.name,
      period: model.period,
      housingUnits: model.housingUnits,
      startingAmount: model.startingAmount,
      fiscalYear: model.fiscalYear,
      monthlyReserveFeesPerHousingUnit: model.monthlyReserveFeesPerHousingUnit,
      minimumCollectionFee: model.minimumCollectionFee,
      inflationRate: model.inflationRate,
      maximumAllowableFeeIncrease: model.maximumAllowableFeeIncrease,
      bankInterestRate: model.bankInterestRate,
      safetyNetPercentage: model.safetyNetPercentage,
      cashReserveThresholdPercentage: model.cashReserveThresholdPercentage,
      largeExpenseBaseline: model.largeExpenseBaseline,
      loanThresholdPercentage: model.loanThresholdPercentage,
      loanTenureYears: model.loanTenureYears,
      loanInterestRate: model.loanInterestRate,
    },
    expenses: expenses.map(expense => ({
      name: expense.name,
      cost: expense.cost,
      expectedLife: expense.expectedLife,
      remainingLife: expense.remainingLife,
      sirs: expense.sirs,
    })),
    type: 'reserve-fund-model-share',
    timestamp: Date.now(),
    version: CURRENT_VERSION,
  };

  // Encode the data as a URL-safe base64 string
  const jsonString = JSON.stringify(shareData);
  const encodedData = btoa(jsonString);
  
  // Create the shareable URL
  const baseUrl = window.location.origin;
  return `${baseUrl}/import?data=${encodeURIComponent(encodedData)}`;
}

/**
 * Extracts model data from a shareable URL
 */
export function extractModelFromUrl(url: string): ShareableModelData | null {
  try {
    const urlObj = new URL(url);
    const dataParam = urlObj.searchParams.get('data');
    
    if (!dataParam) {
      return null;
    }

    // Decode the data
    const decodedData = atob(decodeURIComponent(dataParam));
    const shareData: ShareableModelData = JSON.parse(decodedData);

    // Validate the data structure
    if (shareData.type !== 'reserve-fund-model-share' || !shareData.model) {
      return null;
    }

    return shareData;
  } catch (error) {
    console.error('Failed to extract model from URL:', error);
    return null;
  }
}

/**
 * Checks if the current URL contains shareable model data
 */
export function hasShareableModelData(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const urlObj = new URL(window.location.href);
    const dataParam = urlObj.searchParams.get('data');
    return !!dataParam;
  } catch {
    return false;
  }
}

/**
 * Gets the shareable model data from the current URL
 */
export function getShareableModelFromCurrentUrl(): ShareableModelData | null {
  if (typeof window === 'undefined') return null;
  return extractModelFromUrl(window.location.href);
}

/**
 * Clears the shareable data from the current URL
 */
export function clearShareableDataFromUrl(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('data');
    window.history.replaceState({}, '', url.toString());
  } catch (error) {
    console.error('Failed to clear shareable data from URL:', error);
  }
}
