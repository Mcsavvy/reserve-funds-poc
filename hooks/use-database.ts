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

  // Copy model with expenses to clipboard
  const copyModelToClipboard = useCallback(async (model: Model) => {
    try {
      const database = db || await getDatabase();
      
      // Get all expenses for this model
      const expenseDocs = await database.expenses.find({ selector: { modelId: model.id } }).exec();
      const expenses = expenseDocs.map(doc => doc.toJSON());
      
      // Create copy data structure
      const copyData = {
        model: {
          ...model,
          // Remove id, createdAt, updatedAt as these will be regenerated
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        },
        expenses: expenses.map(expense => ({
          ...expense,
          // Remove id, modelId, createdAt, updatedAt as these will be regenerated
          id: undefined,
          modelId: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        })),
        type: 'reserve-fund-model-copy',
        timestamp: getCurrentTimestamp(),
      };
      
      const copyText = JSON.stringify(copyData, null, 2);
      
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(copyText);
          return { success: true, method: 'clipboard' };
        } catch (clipboardErr) {
          // Fallback to document.execCommand if clipboard API fails
          console.warn('Clipboard API failed, trying fallback method:', clipboardErr);
        }
      }
      
      // Fallback method using document.execCommand
      const textArea = document.createElement('textarea');
      textArea.value = copyText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          return { success: true, method: 'fallback' };
        } else {
          throw new Error('Fallback copy method failed');
        }
      } catch (fallbackErr) {
        document.body.removeChild(textArea);
        throw new Error('Both clipboard methods failed. Please copy manually.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy model to clipboard';
      throw new Error(errorMessage);
    }
  }, [db]);

  // Paste model from clipboard
  const pasteModelFromClipboard = useCallback(async () => {
    try {
      const database = db || await getDatabase();
      
      let clipboardText: string;
      
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          clipboardText = await navigator.clipboard.readText();
        } catch (clipboardErr) {
          throw new Error('Clipboard access denied. Please paste the model data manually.');
        }
      } else {
        throw new Error('Clipboard API not available. Please paste the model data manually.');
      }
      
      if (!clipboardText || clipboardText.trim() === '') {
        throw new Error('Clipboard is empty or contains no text data.');
      }
      
      let copyData;
      try {
        copyData = JSON.parse(clipboardText);
      } catch (parseErr) {
        throw new Error('Clipboard does not contain valid JSON data.');
      }
      
      // Validate clipboard data
      if (copyData.type !== 'reserve-fund-model-copy' || !copyData.model) {
        throw new Error('Clipboard does not contain valid model data');
      }
      
      // Create the new model
      const timestamp = getCurrentTimestamp();
      const newModel: Model = {
        ...copyData.model,
        id: generateId(),
        name: `${copyData.model.name} (Copy)`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      
      // Validate with Zod
      const validatedModel = ModelSchema.parse(newModel);
      
      // Insert the model
      await database.models.insert(validatedModel);
      
      // Create expenses if any
      if (copyData.expenses && Array.isArray(copyData.expenses)) {
        for (const expenseData of copyData.expenses) {
          const newExpense: Expense = {
            ...expenseData,
            id: generateId(),
            modelId: validatedModel.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          
          // Validate with Zod
          const validatedExpense = ExpenseSchema.parse(newExpense);
          
          // Insert the expense
          await database.expenses.insert(validatedExpense);
        }
      }
      
      await loadModels(); // Refresh the list
      return validatedModel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to paste model from clipboard';
      throw new Error(errorMessage);
    }
  }, [db, loadModels]);

  // Paste model from manual input (for when clipboard is blocked)
  const pasteModelFromData = useCallback(async (data: string) => {
    try {
      const database = db || await getDatabase();
      
      if (!data || data.trim() === '') {
        throw new Error('No data provided to paste.');
      }
      
      let copyData;
      try {
        copyData = JSON.parse(data);
      } catch (parseErr) {
        throw new Error('Invalid JSON data provided.');
      }
      
      // Validate clipboard data
      if (copyData.type !== 'reserve-fund-model-copy' || !copyData.model) {
        throw new Error('Data does not contain valid model information');
      }
      
      // Create the new model
      const timestamp = getCurrentTimestamp();
      const newModel: Model = {
        ...copyData.model,
        id: generateId(),
        name: `${copyData.model.name} (Copy)`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      
      // Validate with Zod
      const validatedModel = ModelSchema.parse(newModel);
      
      // Insert the model
      await database.models.insert(validatedModel);
      
      // Create expenses if any
      if (copyData.expenses && Array.isArray(copyData.expenses)) {
        for (const expenseData of copyData.expenses) {
          const newExpense: Expense = {
            ...expenseData,
            id: generateId(),
            modelId: validatedModel.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          
          // Validate with Zod
          const validatedExpense = ExpenseSchema.parse(newExpense);
          
          // Insert the expense
          await database.expenses.insert(validatedExpense);
        }
      }
      
      await loadModels(); // Refresh the list
      return validatedModel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to paste model from data';
      throw new Error(errorMessage);
    }
  }, [db, loadModels]);

  return {
    models,
    isLoading,
    error,
    createModel,
    updateModel,
    deleteModel,
    getModel,
    loadModels,
    copyModelToClipboard,
    pasteModelFromClipboard,
    pasteModelFromData,
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
