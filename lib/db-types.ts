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
  starting_amount: number;
  inflation_rate: number;
  monthly_fees: number;
  monthly_fees_rate: number;
  cushion_fund: number;
  period: number;
  bank_rate: number;
  bank_int_rate: number;
  loan_years: number;
  fiscal_year: string;
  inv_strategy: string;
  active: boolean;
  updated_at: number;
  created_at: number;
  
  // New Financial Simulator Fields
  immediate_assessment: number;
  loan_amount: number;
  liquidated_investment_principal: number;
  liquidated_earnings: number;
  yearly_collections: number;
  total_amount_invested: number;
  annual_investment_return_rate: number;
  investment_amount_compound: number;
  bank_savings_interest_rate: number;

  ltim_return_rate: number;
  loan_term_years: number;
  annual_loan_interest_rate: number;  
  // LTIM Strategy Settings
  ltim_enabled: boolean;
  ltim_strategy_id?: string; // ID of the selected LTIM strategy from database
  ltim_percentage: number; // Percentage of surplus allocated to LTIM (0-100)
  ltim_start_year: number; // When to start LTIM calculations relative to fiscal year
}

export interface ModelItem {
  row?: number;
  id: string;
  model_id: string;
  name: string;
  redundancy: number;
  remaining_life: number;
  cost: number;
  is_sirs: boolean;
  starting_year: string; // Year when this item tracking begins (defaults to model's fiscal year)
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

// Database entity for LTIM strategies
export interface LtimStrategy {
  row?: number;
  id: string;
  name: string; // Human-readable name for the strategy
  description?: string; // Optional description
  state: string; // US state code this strategy is for
  start_year: number; // Year when LTIM strategy begins
  buckets: string; // JSON stringified LTIMBucket array
  active: boolean;
  created_at: number;
  updated_at: number;
}

// LTIM Strategy Types for sophisticated bucket-based investments
export interface LTIMBucket {
  dur: number; // Duration in years for this bucket
  rate: number; // Investment return rate for this bucket (as decimal, e.g., 0.055 = 5.5%)
}

export interface LTIMStrategyData {
  name: string; // Human-readable name for the strategy
  start_year: number; // Year when LTIM strategy begins
  buckets: LTIMBucket[]; // Array of time buckets with rates
}

export interface LTIMConfig {
  [state: string]: LTIMStrategyData; // State code -> LTIM Strategy mapping
}

// LTIM Settings for models
export interface LTIMSettings {
  enabled: boolean; // Whether LTIM is enabled for this model
  strategy_id?: string; // ID of the selected LTIM strategy from database
  ltim_percentage: number; // Percentage of surplus allocated to LTIM (0-100)
  start_year: number; // When to start LTIM calculations relative to fiscal year
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
  LTIM_STRATEGIES: 'ltim_strategies',
} as const;

export type DBStoreNames = typeof DB_STORES[keyof typeof DB_STORES];
