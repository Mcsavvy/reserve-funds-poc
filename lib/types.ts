// Financial model types based on Society Maintenance Model

export interface ModelParameters {
  horizon: number; // Number of years to project
  baseMaintenance: number; // Base maintenance amount in USD
  inflationRate: number; // Annual inflation rate as percentage
  loanThresholdPercentage: number; // Loan threshold as percentage
  loanRate: number; // Loan interest rate as percentage
  loanTerm: number; // Loan term in years
  safetyNetPercentage: number; // Safety net as percentage
  openingBalance: number; // Starting balance
  maxFeeIncreasePercentage: number; // Maximum percentage increase in annual fees
}

export interface Expense {
  id: string;
  year: number;
  amountUsdToday: number;
  type: 'Large' | 'Small';
  description: string;
}

export interface ProjectionRow {
  year: number;
  openingBalance: number;
  baseMaintenanceInflated: number;
  futureExpensesInYear: number;
  reserveContribution: number;
  loanRepayments: number;
  collectionsWithoutSafetyNet: number;
  provisionalEndBalance: number;
  safetyNetTarget: number;
  safetyNetTopUp: number;
  totalMaintenanceCollected: number;
  closingBalance: number;
  // Additional tracking fields
  feeIncreaseCapped: boolean; // Whether the fee increase was limited
  uncappedCollections: number; // What collections would have been without cap
  maxAllowedCollections: number; // Maximum allowed collections for this year
}

export interface ProjectionResults {
  parameters: ModelParameters;
  expenses: Expense[];
  projections: ProjectionRow[];
}

// Default parameters from the Excel model
export const defaultParameters: ModelParameters = {
  horizon: 30,
  baseMaintenance: 120000,
  inflationRate: 5,
  loanThresholdPercentage: 70,
  loanRate: 10,
  loanTerm: 5,
  safetyNetPercentage: 10,
  openingBalance: 0,
  maxFeeIncreasePercentage: 15, // Default: allow up to 15% annual fee increase
};

// Default expenses from the Excel model
export const defaultExpenses: Expense[] = [
  {
    id: '1',
    year: 3,
    amountUsdToday: 50000,
    type: 'Large',
    description: 'Elevator modernisation',
  },
  {
    id: '2',
    year: 5,
    amountUsdToday: 20000,
    type: 'Small',
    description: 'Exterior painting',
  },
  {
    id: '3',
    year: 10,
    amountUsdToday: 120000,
    type: 'Large',
    description: 'Roof replacement',
  },
  {
    id: '4',
    year: 15,
    amountUsdToday: 30000,
    type: 'Small',
    description: 'Generator overhaul',
  },
  {
    id: '5',
    year: 22,
    amountUsdToday: 80000,
    type: 'Large',
    description: 'Plumbing riser replacement',
  },
];
