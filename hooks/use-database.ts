import { useEffect, useState, useCallback } from 'react';
import { 
  getDatabase, 
  ReserveFundsDatabase, 
  generateId, 
  getCurrentTimestamp 
} from '@/lib/database';
import { Model, Expense, ModelSchema, ExpenseSchema } from '@/lib/db-schemas';

/**
 * Hook to get the database instance
 */
export const useDatabase = () => {
  const [db, setDb] = useState<ReserveFundsDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDb = async () => {
      try {
        setIsLoading(true);
        const database = await getDatabase();
        setDb(database);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      } finally {
        setIsLoading(false);
      }
    };

    initDb();
  }, []);

  return { db, isLoading, error };
};

/**
 * Hook for Model collection operations
 */
export const useModels = () => {
  const { db } = useDatabase();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all models
  const loadModels = useCallback(async () => {
    if (!db) return;
    
    try {
      setIsLoading(true);
      const result = await db.models.find().exec();
      setModels(result.map(doc => doc.toJSON()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Create a new model
  const createModel = useCallback(async (modelData: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>) => {
    const database = db || await getDatabase();

    try {
      const timestamp = getCurrentTimestamp();
      const newModel: Model = {
        ...modelData,
        id: generateId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Validate with Zod
      const validated = ModelSchema.parse(newModel);
      
      await database.models.insert(validated);
      await loadModels(); // Refresh the list
      return validated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create model';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [db, loadModels]);

  // Update a model
  const updateModel = useCallback(async (id: string, updates: Partial<Omit<Model, 'id' | 'createdAt'>>) => {
    const database = db || await getDatabase();

    try {
      const doc = await database.models.findOne(id).exec();
      if (!doc) throw new Error('Model not found');

      const updatedModel: Model = {
        ...doc.toJSON(),
        ...updates,
        updatedAt: getCurrentTimestamp(),
      };

      // Validate with Zod
      const validated = ModelSchema.parse(updatedModel);
      
      await doc.update({
        $set: validated
      });
      
      await loadModels(); // Refresh the list
      return validated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update model';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [db, loadModels]);

  // Delete a model
  const deleteModel = useCallback(async (id: string) => {
    const database = db || await getDatabase();

    try {
      const doc = await database.models.findOne(id).exec();
      if (!doc) throw new Error('Model not found');

      // Also delete associated expenses
      await database.expenses.find({ selector: { modelId: id } }).remove();
      
      await doc.remove();
      await loadModels(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete model';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [db, loadModels]);

  // Get a single model by ID
  const getModel = useCallback(async (id: string): Promise<Model | null> => {
    const database = db || await getDatabase();

    try {
      const doc = await database.models.findOne(id).exec();
      return doc ? doc.toJSON() : null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get model');
      return null;
    }
  }, [db]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return {
    models,
    isLoading,
    error,
    createModel,
    updateModel,
    deleteModel,
    getModel,
    loadModels,
  };
};

/**
 * Hook for Expense collection operations
 */
export const useExpenses = (modelId?: string) => {
  const { db } = useDatabase();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load expenses (all or by model)
  const loadExpenses = useCallback(async () => {
    if (!db) return;
    
    try {
      setIsLoading(true);
      const query = modelId 
        ? db.expenses.find({ selector: { modelId } })
        : db.expenses.find();
      
      const result = await query.exec();
      setExpenses(result.map(doc => doc.toJSON()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [db, modelId]);

  // Create a new expense
  const createExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const database = db || await getDatabase();

    try {
      const timestamp = getCurrentTimestamp();
      const newExpense: Expense = {
        ...expenseData,
        id: generateId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Validate with Zod
      const validated = ExpenseSchema.parse(newExpense);
      
      await database.expenses.insert(validated);
      await loadExpenses(); // Refresh the list
      return validated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create expense';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [db, loadExpenses]);

  // Update an expense
  const updateExpense = useCallback(async (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
    const database = db || await getDatabase();

    try {
      const doc = await database.expenses.findOne(id).exec();
      if (!doc) throw new Error('Expense not found');

      const updatedExpense: Expense = {
        ...doc.toJSON(),
        ...updates,
        updatedAt: getCurrentTimestamp(),
      };

      // Validate with Zod
      const validated = ExpenseSchema.parse(updatedExpense);
      
      await doc.update({
        $set: validated
      });
      
      await loadExpenses(); // Refresh the list
      return validated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update expense';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [db, loadExpenses]);

  // Delete an expense
  const deleteExpense = useCallback(async (id: string) => {
    const database = db || await getDatabase();

    try {
      const doc = await database.expenses.findOne(id).exec();
      if (!doc) throw new Error('Expense not found');
      
      await doc.remove();
      await loadExpenses(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete expense';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [db, loadExpenses]);

  // Get a single expense by ID
  const getExpense = useCallback(async (id: string): Promise<Expense | null> => {
    const database = db || await getDatabase();

    try {
      const doc = await database.expenses.findOne(id).exec();
      return doc ? doc.toJSON() : null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get expense');
      return null;
    }
  }, [db]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return {
    expenses,
    isLoading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpense,
    loadExpenses,
  };
};
