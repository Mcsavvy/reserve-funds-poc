import { 
  createRxDatabase, 
  RxDatabase, 
  RxCollection,
  addRxPlugin
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { wrappedValidateZSchemaStorage } from 'rxdb/plugins/validate-z-schema';

import { 
  Model, 
  Expense, 
  modelRxSchema, 
  expenseRxSchema 
} from './db-schemas';

// Add RxDB plugins
addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);

// Collection types
export type ModelCollection = RxCollection<Model>;
export type ExpenseCollection = RxCollection<Expense>;

// Database collections interface
export interface DatabaseCollections {
  models: ModelCollection;
  expenses: ExpenseCollection;
}

// Database type
export type ReserveFundsDatabase = RxDatabase<DatabaseCollections>;

let dbPromise: Promise<ReserveFundsDatabase> | null = null;

/**
 * Create and initialize the RxDB database
 */
export const createDatabase = async (): Promise<ReserveFundsDatabase> => {
  console.log('Creating database...');

  // Add dev mode plugin in development
  if (process.env.NODE_ENV !== "production") {
    await import('rxdb/plugins/dev-mode').then(
      module => addRxPlugin(module.RxDBDevModePlugin)
    );
  }

  const storage = wrappedValidateZSchemaStorage({
    storage: getRxStorageDexie(),
  });
  
  // Create database
  const db = await createRxDatabase<DatabaseCollections>({
    name: 'reserve_funds_db',
    storage,
    eventReduce: true,
    cleanupPolicy: {},
    closeDuplicates: process.env.NODE_ENV !== "production",
  });

  console.log('Database created. Adding collections...');

  // Add collections with migration strategies
  await db.addCollections({
    models: {
      schema: modelRxSchema,
      migrationStrategies: {
        // Migration from version 0 to 1: add minimumCollectionFee field
        1: function(oldDoc: any) {
          return {
            ...oldDoc,
            minimumCollectionFee: 0 // Default value for new field
          };
        }
      }
    },
    expenses: {
      schema: expenseRxSchema,
    },
  });

  console.log('Collections added successfully');

  return db;
};

/**
 * Get the database instance (singleton pattern)
 */
export const getDatabase = async (): Promise<ReserveFundsDatabase> => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};

/**
 * Destroy the database (for cleanup/testing)
 */
export const destroyDatabase = async (): Promise<void> => {
  if (dbPromise) {
    const db = await dbPromise;
    await db.remove();
    dbPromise = null;
  }
};

/**
 * Generate a unique ID for documents
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get current timestamp for created/updated fields
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
