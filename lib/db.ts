// IndexedDB setup and operations for Reserve Funds POC

import { 
  Client,
  ClientPosition, 
  Model,
  ModelItem,
  ModelClientRate,
  SimulationActual,
  SimulationSplit,
  SimulationSplitLtim,
  SimulationDeficit,
  SimulationDeficitLtim,
  SimulationRules,
  SimulationVersion,
  Config,
  LtimInvestmentRate,
  DB_STORES,
  DBStoreNames
} from './db-types';

const DB_NAME = 'ReserveFundsDB';
const DB_VERSION = 2;

class ReserveFundsDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Version 1: Create initial stores
        if (oldVersion < 1) {
          // Create clients store
          const clientStore = db.createObjectStore(DB_STORES.CLIENTS, { keyPath: 'id' });
          clientStore.createIndex('company_id', 'company_id', { unique: false });
          clientStore.createIndex('type', 'type', { unique: false });
          clientStore.createIndex('active', 'active', { unique: false });

          // Create client_positions store
          const positionStore = db.createObjectStore(DB_STORES.CLIENT_POSITIONS, { keyPath: 'id' });
          positionStore.createIndex('client_id', 'client_id', { unique: false });

          // Create models store
          const modelStore = db.createObjectStore(DB_STORES.MODELS, { keyPath: 'id' });
          modelStore.createIndex('client_id', 'client_id', { unique: false });
          modelStore.createIndex('active', 'active', { unique: false });
          modelStore.createIndex('created_at', 'created_at', { unique: false });

          // Create model_items store
          const itemStore = db.createObjectStore(DB_STORES.MODEL_ITEMS, { keyPath: 'id' });
          itemStore.createIndex('model_id', 'model_id', { unique: false });
          itemStore.createIndex('is_sirs', 'is_sirs', { unique: false });

          // Create model_client_rates store
          const rateStore = db.createObjectStore(DB_STORES.MODEL_CLIENT_RATES, { keyPath: 'id' });
          rateStore.createIndex('model_id', 'model_id', { unique: false });
          rateStore.createIndex('active', 'active', { unique: false });

          // Create simulation stores
          const actualStore = db.createObjectStore(DB_STORES.SIMULATION_ACTUAL, { keyPath: 'id' });
          actualStore.createIndex('model_id', 'model_id', { unique: false });
          actualStore.createIndex('item_id', 'item_id', { unique: false });

          const splitStore = db.createObjectStore(DB_STORES.SIMULATION_SPLITS, { keyPath: 'id' });
          splitStore.createIndex('model_id', 'model_id', { unique: false });
          splitStore.createIndex('parent_id', 'parent_id', { unique: false });

          const splitLtimStore = db.createObjectStore(DB_STORES.SIMULATION_SPLITS_LTIM, { keyPath: 'id' });
          splitLtimStore.createIndex('model_id', 'model_id', { unique: false });
          splitLtimStore.createIndex('parent_id', 'parent_id', { unique: false });

          const deficitStore = db.createObjectStore(DB_STORES.SIMULATION_DEFICIT, { keyPath: 'id' });
          deficitStore.createIndex('model_id', 'model_id', { unique: false });

          const deficitLtimStore = db.createObjectStore(DB_STORES.SIMULATION_DEFICIT_LTIM, { keyPath: 'id' });
          deficitLtimStore.createIndex('model_id', 'model_id', { unique: false });

          const rulesStore = db.createObjectStore(DB_STORES.SIMULATION_RULES, { keyPath: 'id' });
          rulesStore.createIndex('model_id', 'model_id', { unique: false });

          const versionStore = db.createObjectStore(DB_STORES.SIMULATION_VERSIONS, { keyPath: 'id' });
          versionStore.createIndex('model_id', 'model_id', { unique: false });
          versionStore.createIndex('created_at', 'created_at', { unique: false });

          // Create config store
          db.createObjectStore(DB_STORES.CONFIG, { keyPath: 'id' });
        }

        // Version 2: Add LTIM Investment Rates
        if (oldVersion < 2) {
          // Create LTIM investment rates store
          const ltimRatesStore = db.createObjectStore(DB_STORES.LTIM_INVESTMENT_RATES, { keyPath: 'id' });
          ltimRatesStore.createIndex('state', 'state', { unique: false });
          ltimRatesStore.createIndex('bucket_name', 'bucket_name', { unique: false });
          ltimRatesStore.createIndex('active', 'active', { unique: false });
          ltimRatesStore.createIndex('state_bucket', ['state', 'bucket_name'], { unique: false });
        }
      };
    });
  }

  private getStore(storeName: DBStoreNames, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // Generic CRUD operations
  async add<T extends { id: string }>(storeName: DBStoreNames, item: T): Promise<T> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(item);
      
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async update<T extends { id: string }>(storeName: DBStoreNames, item: T): Promise<T> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: DBStoreNames, id: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: DBStoreNames): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: DBStoreNames, indexName: string, value: any): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: DBStoreNames, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: DBStoreNames): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specialized methods for common operations
  async getModelsByClient(clientId: string): Promise<Model[]> {
    return this.getByIndex<Model>(DB_STORES.MODELS, 'client_id', clientId);
  }

  async getItemsByModel(modelId: string): Promise<ModelItem[]> {
    return this.getByIndex<ModelItem>(DB_STORES.MODEL_ITEMS, 'model_id', modelId);
  }

  async getActiveModels(): Promise<Model[]> {
    return this.getByIndex<Model>(DB_STORES.MODELS, 'active', true);
  }

  async getSimulationVersionsByModel(modelId: string): Promise<SimulationVersion[]> {
    return this.getByIndex<SimulationVersion>(DB_STORES.SIMULATION_VERSIONS, 'model_id', modelId);
  }

  // LTIM Investment Rates methods
  async getLtimRatesByState(state: string): Promise<LtimInvestmentRate[]> {
    return this.getByIndex<LtimInvestmentRate>(DB_STORES.LTIM_INVESTMENT_RATES, 'state', state);
  }

  async getActiveLtimRates(): Promise<LtimInvestmentRate[]> {
    return this.getByIndex<LtimInvestmentRate>(DB_STORES.LTIM_INVESTMENT_RATES, 'active', true);
  }

  async getLtimRateByStateBucket(state: string, bucketName: string): Promise<LtimInvestmentRate[]> {
    return this.getByIndex<LtimInvestmentRate>(DB_STORES.LTIM_INVESTMENT_RATES, 'state_bucket', [state, bucketName]);
  }

  // Utility method to generate IDs
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Singleton instance
export const db = new ReserveFundsDB();

// Initialize the database
export const initializeDatabase = async (): Promise<void> => {
  await db.init();
};

// Export the database instance and types
export { ReserveFundsDB };
export type {
  Client,
  ClientPosition,
  Model,
  ModelItem,
  ModelClientRate,
  SimulationActual,
  SimulationSplit,
  SimulationSplitLtim,
  SimulationDeficit,
  SimulationDeficitLtim,
  SimulationRules,
  SimulationVersion,
  Config,
  LtimInvestmentRate
};
