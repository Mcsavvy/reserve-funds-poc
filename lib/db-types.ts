// Database entity types based on the reserve funds schema

export interface Client {
  row?: number;
  id: string;
  association?: string;
  company?: string;
  company_id?: string; // Links association to management company
  type: 'association' | 'management_company';
  company_type?: 'reserve' | 'property';
  email?: string;
  phone?: string;
  address?: string;
  address2?: string;
  city?: string;
  zip?: string;
  state?: string;
  active: boolean;
  created_at: number;
}

// Type guards and helper types
export type ManagementCompany = Client & { type: 'management_company' };
export type Association = Client & { type: 'association'; company_id?: string };

export function isManagementCompany(client: Client): client is ManagementCompany {
  return client.type === 'management_company';
}

export function isAssociation(client: Client): client is Association {
  return client.type === 'association';
}

export interface ClientPosition {
  row?: number;
  id: string;
  value: string;
  client_id: string;
}

export interface Model {
  row?: number;
  id: string;
  name: string;
  client_id: string;
  housing: number;
  starting_amount: number; // Opening Balance
  inflation_rate: number; // Inflation% (stored as decimal, e.g., 5% = 0.05)
  base_maintenance: number; // Base maintenance amount (annual)
  period: number; // Horizon - analysis period in years
  loan_threshold: number; // Loan Threshold% (stored as decimal, e.g., 70% = 0.70)
  loan_rate: number; // Loan Rate% (stored as decimal, e.g., 10% = 0.10)
  loan_years: number; // Loan Term in years
  safety_net_percentage: number; // Safety Net% (stored as decimal, e.g., 10% = 0.10)
  fiscal_year: string;
  inv_strategy: string;
  active: boolean;
  updated_at: number;
  created_at: number;
}

export interface ModelItem {
  row?: number;
  id: string;
  model_id: string;
  name: string; // Description of the expense item
  year: number; // Year when the expense will be incurred
  cost: number; // Amount_USD_Today - cost in today's dollars
  type: 'Large' | 'Small'; // Type of expense (determines loan eligibility)
}

export interface ModelClientRate {
  row?: number;
  id: string;
  model_id: string;
  rate: number;
  perc_wallet: number;
  active: boolean;
  created_at: number;
}

export interface SimulationActual {
  row?: number;
  id: string;
  model_id: string;
  item_id: string;
  redundancy_at: number;
  actual_cost: number;
}

export interface SimulationSplit {
  row?: number;
  id: string;
  model_id: string;
  parent_id: string;
  split_of: string;
  redundancy_at: number;
  year: number;
  cost: number;
}

export interface SimulationSplitLtim {
  row?: number;
  id: string;
  model_id: string;
  parent_id: string;
  split_of: string;
  redundancy_at: number;
  year: number;
  cost: number;
}

export interface SimulationDeficit {
  row?: number;
  id: string;
  model_id: string;
  year: number;
  to: number;
  data: string;
}

export interface SimulationDeficitLtim {
  row?: number;
  id: string;
  model_id: string;
  year: number;
  to: number;
  data: string;
}

export interface SimulationRules {
  row?: number;
  id: string;
  model_id: string;
  rules: string;
}

export interface SimulationVersion {
  row?: number;
  id: string;
  model_id: string;
  name: string;
  note: string;
  can_view: boolean;
  can_load: boolean;
  data: string;
  created_at: number;
}

export interface Config {
  row?: number;
  id: string;
  param: string;
  value: string;
}

export interface LtimInvestmentRate {
  row?: number;
  id: string;
  state: string; // US state code (e.g., 'CA', 'NY', 'TX')
  bucket_name: string; // Name of the rate bucket (e.g., 'Conservative', 'Moderate', 'Aggressive')
  bucket_description?: string; // Optional description
  rate: number; // The investment rate as a percentage
  effective_date?: number; // When this rate becomes effective
  active: boolean;
  created_at: number;
  updated_at: number;
}

// Global app configuration
export interface AppConfig {
  user?: {
    id: string;
    name: string;
    email: string;
    currentClientId?: string;
  };
  settings?: {
    theme: 'light' | 'dark';
    currency: string;
    locale: string;
  };
  preferences?: {
    defaultFiscalYear: string;
    defaultInflationRate: number;
    defaultBankRate: number;
  };
}

// Database store names
export const DB_STORES = {
  CLIENTS: 'clients',
  CLIENT_POSITIONS: 'client_positions',
  MODELS: 'models',
  MODEL_ITEMS: 'model_items',
  MODEL_CLIENT_RATES: 'model_client_rates',
  SIMULATION_ACTUAL: 'simulation_actual',
  SIMULATION_SPLITS: 'simulation_splits',
  SIMULATION_SPLITS_LTIM: 'simulation_splits_ltim',
  SIMULATION_DEFICIT: 'simulation_deficit',
  SIMULATION_DEFICIT_LTIM: 'simulation_deficit_ltim',
  SIMULATION_RULES: 'simulation_rules',
  SIMULATION_VERSIONS: 'simulation_versions',
  CONFIG: 'config',
  LTIM_INVESTMENT_RATES: 'ltim_investment_rates',
} as const;

export type DBStoreNames = typeof DB_STORES[keyof typeof DB_STORES];
