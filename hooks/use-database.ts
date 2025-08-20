import { useState, useEffect, useCallback, useRef } from 'react';
import { db, initializeDatabase } from '@/lib/db';
import { 
  Client, 
  Model, 
  ModelItem, 
  SimulationVersion,
  Config,
  LtimInvestmentRate,
  LtimStrategy,
  DB_STORES,
  DBStoreNames,
  ManagementCompany,
  Association,
  isManagementCompany,
  isAssociation
} from '@/lib/db-types';

// Centralized database state management
class DatabaseStateManager {
  private subscribers: Set<(state: DatabaseState) => void> = new Set();
  private state: DatabaseState = {
    isInitialized: false,
    isInitializing: false,
    error: null,
  };
  private dbInstance: any = null;

  constructor() {
    // Store reference to check for reset
    this.dbInstance = db;
  }

  getState() {
    return this.state;
  }

  subscribe(callback: (state: DatabaseState) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private setState(newState: Partial<DatabaseState>) {
    this.state = { ...this.state, ...newState };
    this.subscribers.forEach(callback => callback(this.state));
  }

  private checkForReset() {
    // If db instance changed (like during hot reload), mark as not initialized
    if (this.dbInstance !== db) {
      this.dbInstance = db;
      if (this.state.isInitialized) {
        this.setState({ 
          isInitialized: false, 
          isInitializing: false,
          error: null 
        });
      }
    }
  }

  async initialize() {
    this.checkForReset();
    
    if (this.state.isInitialized || this.state.isInitializing) {
      return;
    }

    this.setState({ isInitializing: true, error: null });

    try {
      await initializeDatabase();
      this.setState({ 
        isInitialized: true, 
        isInitializing: false, 
        error: null 
      });
    } catch (err) {
      this.setState({ 
        isInitialized: false, 
        isInitializing: false, 
        error: err instanceof Error ? err.message : 'Failed to initialize database' 
      });
      throw err;
    }
  }

  isReady() {
    this.checkForReset();
    return this.state.isInitialized && !this.state.isInitializing;
  }
}

interface DatabaseState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
}

// Singleton instance
const databaseStateManager = new DatabaseStateManager();

// Database initialization hook
export function useDatabase() {
  const [state, setState] = useState<DatabaseState>(databaseStateManager.getState());
  const initializeRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const unsubscribe = databaseStateManager.subscribe(setState);
    
    // Check state immediately in case it changed
    setState(databaseStateManager.getState());
    
    return () => {
      unsubscribe();
    };
  }, []);

  const initialize = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (!initializeRef.current) {
      initializeRef.current = databaseStateManager.initialize()
        .finally(() => {
          initializeRef.current = null;
        });
    }
    return initializeRef.current;
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    if (!state.isInitialized && !state.isInitializing) {
      initialize().catch(console.error);
    }
  }, [state.isInitialized, state.isInitializing, initialize]);

  return { 
    isInitialized: state.isInitialized, 
    error: state.error,
    initialize 
  };
}

// Generic hook for managing database entities
function useEntity<T extends { id: string }>(storeName: DBStoreNames) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isInitialized } = useDatabase();

  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      setLoading(true);
      await ensureDbReady();
      const data = await db.getAll<T>(storeName);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [storeName, isInitialized, ensureDbReady]);

  const addItem = useCallback(async (item: Omit<T, 'id'> & Partial<Pick<T, 'id'>>) => {
    try {
      await ensureDbReady();
      
      const newItem = {
        ...item,
        id: item.id || db.generateId(),
      } as T;

      await db.add(storeName, newItem);
      setItems(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [storeName, ensureDbReady]);

  const updateItem = useCallback(async (item: T) => {
    try {
      await ensureDbReady();
      await db.update(storeName, item);
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
      return item;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [storeName, ensureDbReady]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await ensureDbReady();
      await db.delete(storeName, id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [storeName, ensureDbReady]);

  const getItem = useCallback(async (id: string): Promise<T | undefined> => {
    try {
      await ensureDbReady();
      return await db.get<T>(storeName, id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [storeName, ensureDbReady]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    getItem,
    refresh: loadItems,
  };
}

// Specific hooks for each entity type
export function useClients() {
  return useEntity<Client>(DB_STORES.CLIENTS);
}

// Specialized hooks for management companies and associations
export function useManagementCompanies() {
  const clientsHook = useEntity<Client>(DB_STORES.CLIENTS);
  
  const managementCompanies = clientsHook.items.filter(isManagementCompany);
  
  const addManagementCompany = useCallback(async (companyData: Omit<ManagementCompany, 'id' | 'type'> & Partial<Pick<ManagementCompany, 'id'>>) => {
    return await clientsHook.addItem({
      ...companyData,
      type: 'management_company' as const,
    });
  }, [clientsHook.addItem]);

  return {
    ...clientsHook,
    items: managementCompanies,
    addItem: addManagementCompany,
  };
}

export function useAssociations() {
  const clientsHook = useEntity<Client>(DB_STORES.CLIENTS);
  
  const associations = clientsHook.items.filter(isAssociation);
  
  const addAssociation = useCallback(async (associationData: Omit<Association, 'id' | 'type'> & Partial<Pick<Association, 'id'>>) => {
    return await clientsHook.addItem({
      ...associationData,
      type: 'association' as const,
    });
  }, [clientsHook.addItem]);

  const getAssociationsByCompany = useCallback((companyId: string) => {
    return associations.filter(assoc => assoc.company_id === companyId);
  }, [associations]);

  const getUnmanagedAssociations = useCallback(() => {
    return associations.filter(assoc => !assoc.company_id);
  }, [associations]);

  return {
    ...clientsHook,
    items: associations,
    addItem: addAssociation,
    getAssociationsByCompany,
    getUnmanagedAssociations,
  };
}

export function useModels() {
  const entityHook = useEntity<Model>(DB_STORES.MODELS);
  const { items: clients } = useClients();
  
  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);
  
  const getModelsByClient = useCallback(async (clientId: string) => {
    try {
      await ensureDbReady();
      return await db.getModelsByClient(clientId);
    } catch (err) {
      console.error('Failed to get models by client:', err);
      return [];
    }
  }, [ensureDbReady]);

  const getModelsByAssociation = useCallback((associationId: string) => {
    return entityHook.items.filter(model => model.client_id === associationId);
  }, [entityHook.items]);

  const getActiveModels = useCallback(async () => {
    try {
      await ensureDbReady();
      return await db.getActiveModels();
    } catch (err) {
      console.error('Failed to get active models:', err);
      return [];
    }
  }, [ensureDbReady]);

  // Only allow models to be created for associations
  const addModelForAssociation = useCallback(async (modelData: Omit<Model, 'id'> & Partial<Pick<Model, 'id'>>) => {
    try {
      await ensureDbReady();
      // Get fresh client data from database instead of relying on potentially stale hook state
      const client = await db.get<Client>(DB_STORES.CLIENTS, modelData.client_id);
      if (!client) {
        throw new Error('Client not found');
      }
      if (!isAssociation(client)) {
        throw new Error('Models can only be created for associations, not ' + client.type);
      }
      return await entityHook.addItem(modelData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add model';
      throw new Error(errorMessage);
    }
  }, [entityHook.addItem, ensureDbReady]);

  const getAssociationForModel = useCallback((modelId: string) => {
    const model = entityHook.items.find(m => m.id === modelId);
    if (!model) return null;
    
    const association = clients.find(c => c.id === model.client_id);
    return association && isAssociation(association) ? association : null;
  }, [entityHook.items, clients]);

  return {
    ...entityHook,
    addItem: addModelForAssociation, // Override to enforce association-only rule
    getModelsByClient,
    getModelsByAssociation,
    getActiveModels,
    getAssociationForModel,
  };
}

export function useModelItems() {
  const entityHook = useEntity<ModelItem>(DB_STORES.MODEL_ITEMS);
  
  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);
  
  const getItemsByModel = useCallback(async (modelId: string) => {
    try {
      await ensureDbReady();
      return await db.getItemsByModel(modelId);
    } catch (err) {
      console.error('Failed to get items by model:', err);
      return [];
    }
  }, [ensureDbReady]);

  return {
    ...entityHook,
    getItemsByModel,
  };
}

export function useSimulationVersions() {
  const entityHook = useEntity<SimulationVersion>(DB_STORES.SIMULATION_VERSIONS);
  
  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);
  
  const getVersionsByModel = useCallback(async (modelId: string) => {
    try {
      await ensureDbReady();
      return await db.getSimulationVersionsByModel(modelId);
    } catch (err) {
      console.error('Failed to get versions by model:', err);
      return [];
    }
  }, [ensureDbReady]);

  return {
    ...entityHook,
    getVersionsByModel,
  };
}

export function useConfig() {
  const entityHook = useEntity<Config>(DB_STORES.CONFIG);
  
  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);
  
  const getConfigValue = useCallback(async (param: string): Promise<string | undefined> => {
    try {
      await ensureDbReady();
      const config = await db.get<Config>(DB_STORES.CONFIG, param);
      return config?.value;
    } catch (err) {
      console.error('Failed to get config value:', err);
      return undefined;
    }
  }, [ensureDbReady]);

  const setConfigValue = useCallback(async (param: string, value: string) => {
    try {
      const config: Config = {
        id: param,
        param,
        value,
      };
      return await entityHook.updateItem(config);
    } catch (err) {
      console.error('Failed to set config value:', err);
      throw err;
    }
  }, [entityHook]);

  return {
    ...entityHook,
    getConfigValue,
    setConfigValue,
  };
}

export function useLtimInvestmentRates() {
  const entityHook = useEntity<LtimInvestmentRate>(DB_STORES.LTIM_INVESTMENT_RATES);
  
  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);
  
  const getRatesByState = useCallback(async (state: string) => {
    try {
      await ensureDbReady();
      return await db.getLtimRatesByState(state);
    } catch (err) {
      console.error('Failed to get LTIM rates by state:', err);
      return [];
    }
  }, [ensureDbReady]);

  const getActiveLtimRates = useCallback(async () => {
    try {
      await ensureDbReady();
      return await db.getActiveLtimRates();
    } catch (err) {
      console.error('Failed to get active LTIM rates:', err);
      return [];
    }
  }, [ensureDbReady]);

  const getRateByStateBucket = useCallback(async (state: string, bucketName: string) => {
    try {
      await ensureDbReady();
      return await db.getLtimRateByStateBucket(state, bucketName);
    } catch (err) {
      console.error('Failed to get LTIM rate by state and bucket:', err);
      return [];
    }
  }, [ensureDbReady]);

  const addLtimRate = useCallback(async (rateData: Omit<LtimInvestmentRate, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<LtimInvestmentRate, 'id'>>) => {
    const timestamp = Date.now();
    const newRate = {
      ...rateData,
      created_at: timestamp,
      updated_at: timestamp,
    };
    return await entityHook.addItem(newRate);
  }, [entityHook]);

  const updateLtimRate = useCallback(async (rate: LtimInvestmentRate) => {
    const updatedRate = {
      ...rate,
      updated_at: Date.now(),
    };
    return await entityHook.updateItem(updatedRate);
  }, [entityHook]);

  // Get all states that have LTIM rates configured
  const getStatesWithRates = useCallback(() => {
    const states = new Set<string>();
    entityHook.items.forEach(rate => {
      if (rate.active) {
        states.add(rate.state);
      }
    });
    return Array.from(states).sort();
  }, [entityHook.items]);

  // Get all bucket names for a specific state
  const getBucketsForState = useCallback((state: string) => {
    return entityHook.items
      .filter(rate => rate.state === state && rate.active)
      .map(rate => ({
        name: rate.bucket_name,
        description: rate.bucket_description,
        rate: rate.rate
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entityHook.items]);

  return {
    ...entityHook,
    addItem: addLtimRate,
    updateItem: updateLtimRate,
    getRatesByState,
    getActiveLtimRates,
    getRateByStateBucket,
    getStatesWithRates,
    getBucketsForState,
  };
}

// Sample data interface
interface SampleData {
  managementCompanies: Array<{
    company: string;
    company_type: 'property' | 'reserve';
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    state: string;
    active: boolean;
  }>;
  associations: Array<{
    association: string;
    company_type: 'property' | 'reserve';
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    state: string;
    active: boolean;
    managedBy: string | null;
  }>;
  models: Array<{
    name: string;
    associationName: string;
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
  }>;
  ltimStrategies: Array<{
    name: string;
    description?: string;
    state: string;
    start_year: number;
    buckets: Array<{
      dur: number;
      rate: number;
    }>;
    active: boolean;
  }>;
  modelItems: Array<{
    modelName: string;
    items: Array<{
      name: string;
      redundancy: number;
      remaining_life: number;
      cost: number;
      is_sirs: boolean;
      starting_year: string;
    }>;
  }>;
}

// Utility hook for seeding sample data
export function useSampleData() {
  const { addItem: addManagementCompany } = useManagementCompanies();
  const { addItem: addAssociation } = useAssociations();
  const { addItem: addModel } = useModels();
  const { addItem: addModelItem } = useModelItems();
  const { addItem: addLtimStrategy } = useLtimStrategies();

  const loadSampleData = useCallback(async (): Promise<SampleData> => {
    try {
      const response = await fetch('/sample-data.json');
      if (!response.ok) {
        throw new Error(`Failed to load sample data: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Failed to load sample data from JSON:', err);
      throw err;
    }
  }, []);

  const seedSampleData = useCallback(async () => {
    try {
      const sampleData = await loadSampleData();
      const currentYear = new Date().getFullYear().toString();
      const timestamp = Date.now();

      // Create LTIM strategies first
      const createdStrategies = new Map<string, any>();
      for (const strategyData of sampleData.ltimStrategies) {
        const strategy = await addLtimStrategy({
          name: strategyData.name,
          description: strategyData.description,
          state: strategyData.state,
          start_year: strategyData.start_year,
          buckets: JSON.stringify(strategyData.buckets),
          active: strategyData.active,
        });
        createdStrategies.set(`${strategyData.state}-${strategyData.name}`, strategy);
      }

      // Create management companies
      const createdCompanies = new Map<string, any>();
      for (const companyData of sampleData.managementCompanies) {
        const managementCompany = await addManagementCompany({
          ...companyData,
          created_at: timestamp,
        });
        createdCompanies.set(companyData.company, managementCompany);
      }

      // Create associations
      const createdAssociations = new Map<string, any>();
      for (const associationData of sampleData.associations) {
        const managementCompany = associationData.managedBy 
          ? createdCompanies.get(associationData.managedBy)
          : null;

        const association = await addAssociation({
          association: associationData.association,
          company_id: managementCompany?.id,
          company_type: associationData.company_type,
          email: associationData.email,
          phone: associationData.phone,
          address: associationData.address,
          city: associationData.city,
          zip: associationData.zip,
          state: associationData.state,
          active: associationData.active,
          created_at: timestamp,
        });
        createdAssociations.set(associationData.association, association);
      }

      // Create models
      const createdModels = new Map<string, any>();
      for (const modelData of sampleData.models) {
        const association = createdAssociations.get(modelData.associationName);
        if (!association) {
          console.warn(`Association "${modelData.associationName}" not found for model "${modelData.name}"`);
          continue;
        }

        const model = await addModel({
          name: modelData.name,
          client_id: association.id,
          housing: modelData.housing,
          starting_amount: modelData.starting_amount,
          inflation_rate: modelData.inflation_rate,
          monthly_fees: modelData.monthly_fees,
          monthly_fees_rate: modelData.monthly_fees_rate,
          cushion_fund: modelData.cushion_fund,
          period: modelData.period,
          bank_rate: modelData.bank_rate,
          bank_int_rate: modelData.bank_int_rate,
          loan_years: modelData.loan_years,
          fiscal_year: modelData.fiscal_year === 'current' ? currentYear : modelData.fiscal_year,
          inv_strategy: modelData.inv_strategy,
          active: modelData.active,
          immediate_assessment: modelData.immediate_assessment,
          loan_amount: modelData.loan_amount,
          liquidated_investment_principal: modelData.liquidated_investment_principal,
          liquidated_earnings: modelData.liquidated_earnings,
          yearly_collections: modelData.yearly_collections,
          total_amount_invested: modelData.total_amount_invested,
          annual_investment_return_rate: modelData.annual_investment_return_rate,
          investment_amount_compound: modelData.investment_amount_compound,
          bank_savings_interest_rate: modelData.bank_savings_interest_rate,

          ltim_return_rate: modelData.ltim_return_rate,
          loan_term_years: modelData.loan_term_years,
          annual_loan_interest_rate: modelData.annual_loan_interest_rate,
          // LTIM Strategy Settings - add defaults
          ltim_enabled: false,
          ltim_percentage: 0,
          ltim_start_year: 0,
          updated_at: timestamp,
          created_at: timestamp,
        });
        createdModels.set(modelData.name, model);
      }

      // Create model items
      for (const modelItemGroup of sampleData.modelItems) {
        const model = createdModels.get(modelItemGroup.modelName);
        if (!model) {
          console.warn(`Model "${modelItemGroup.modelName}" not found for model items`);
          continue;
        }

        for (const itemData of modelItemGroup.items) {
          await addModelItem({
            model_id: model.id,
            name: itemData.name,
            redundancy: itemData.redundancy,
            remaining_life: itemData.remaining_life,
            cost: itemData.cost,
            is_sirs: itemData.is_sirs,
            starting_year: itemData.starting_year || model.fiscal_year,
          });
        }
      }

      return { 
        managementCompany: Array.from(createdCompanies.values())[0], 
        associations: Array.from(createdAssociations.values()),
        models: Array.from(createdModels.values())
      };
    } catch (err) {
      console.error('Failed to seed sample data:', err);
      throw err;
    }
  }, [addManagementCompany, addAssociation, addModel, addModelItem, loadSampleData]);

  return { seedSampleData, loadSampleData };
}

export function useLtimStrategies() {
  const entityHook = useEntity<LtimStrategy>(DB_STORES.LTIM_STRATEGIES);
  
  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);
  
  const getStrategiesByState = useCallback((state: string) => {
    return entityHook.items.filter(strategy => strategy.state === state);
  }, [entityHook.items]);

  const getActiveStrategies = useCallback(() => {
    return entityHook.items.filter(strategy => strategy.active);
  }, [entityHook.items]);

  const addLtimStrategy = useCallback(async (strategyData: Omit<LtimStrategy, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<LtimStrategy, 'id'>>) => {
    const timestamp = Date.now();
    const newStrategy = {
      ...strategyData,
      created_at: timestamp,
      updated_at: timestamp,
    };
    return await entityHook.addItem(newStrategy);
  }, [entityHook]);

  const updateLtimStrategy = useCallback(async (strategy: LtimStrategy) => {
    const updatedStrategy = {
      ...strategy,
      updated_at: Date.now(),
    };
    return await entityHook.updateItem(updatedStrategy);
  }, [entityHook]);

  // Get all states that have LTIM strategies configured
  const getStatesWithStrategies = useCallback(() => {
    const states = new Set<string>();
    entityHook.items.forEach(strategy => {
      if (strategy.active) {
        states.add(strategy.state);
      }
    });
    return Array.from(states).sort();
  }, [entityHook.items]);

  // Get strategies for a specific state
  const getStrategiesForState = useCallback((state: string) => {
    return entityHook.items
      .filter(strategy => strategy.state === state && strategy.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entityHook.items]);

  return {
    ...entityHook,
    addItem: addLtimStrategy,
    updateItem: updateLtimStrategy,
    getStrategiesByState,
    getActiveStrategies,
    getStatesWithStrategies,
    getStrategiesForState,
  };
}

// Utility hook for clearing all data
export function useClearData() {
  const { refresh: refreshClients } = useClients();
  const { refresh: refreshModels } = useModels();
  const { refresh: refreshModelItems } = useModelItems();
  const { refresh: refreshLtimRates } = useLtimInvestmentRates();
  const { refresh: refreshLtimStrategies } = useLtimStrategies();

  const ensureDbReady = useCallback(async () => {
    if (!databaseStateManager.isReady()) {
      await databaseStateManager.initialize();
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      await ensureDbReady();
      
      // Clear all relevant stores
      await Promise.all([
        db.clear(DB_STORES.CLIENTS), // This clears both management companies and associations
        db.clear(DB_STORES.MODELS),
        db.clear(DB_STORES.MODEL_ITEMS),
        db.clear(DB_STORES.LTIM_INVESTMENT_RATES),
        db.clear(DB_STORES.LTIM_STRATEGIES),
        // Also clear related data to maintain database consistency
        db.clear(DB_STORES.SIMULATION_VERSIONS),
        db.clear(DB_STORES.SIMULATION_ACTUAL),
        db.clear(DB_STORES.SIMULATION_SPLITS),
        db.clear(DB_STORES.SIMULATION_SPLITS_LTIM),
        db.clear(DB_STORES.SIMULATION_DEFICIT),
        db.clear(DB_STORES.SIMULATION_DEFICIT_LTIM),
        db.clear(DB_STORES.SIMULATION_RULES),
        db.clear(DB_STORES.MODEL_CLIENT_RATES),
      ]);

      // Refresh all hook states to reflect the cleared data
      await Promise.all([
        refreshClients(),
        refreshModels(),
        refreshModelItems(), 
        refreshLtimRates(),
        refreshLtimStrategies(),
      ]);

      console.log('All data cleared successfully');
    } catch (err) {
      console.error('Failed to clear all data:', err);
      throw err;
    }
  }, [ensureDbReady, refreshClients, refreshModels, refreshModelItems, refreshLtimRates, refreshLtimStrategies]);

  return { clearAllData };
}
