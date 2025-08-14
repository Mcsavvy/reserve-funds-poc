import { useState, useEffect, useCallback } from 'react';

// Type for the hook return value
type UseLocalStorageReturn<T> = [T, (value: T | ((prev: T) => T)) => void, () => void];

// Storage event listeners for cross-tab synchronization
const storageListeners = new Map<string, Set<(value: any) => void>>();

// Dispatch storage event to all listeners
const dispatchStorageEvent = (key: string, newValue: any) => {
  const listeners = storageListeners.get(key);
  if (listeners) {
    listeners.forEach(listener => listener(newValue));
  }
};

// Add storage event listener
const addStorageListener = (key: string, listener: (value: any) => void) => {
  if (!storageListeners.has(key)) {
    storageListeners.set(key, new Set());
  }
  storageListeners.get(key)!.add(listener);
};

// Remove storage event listener
const removeStorageListener = (key: string, listener: (value: any) => void) => {
  const listeners = storageListeners.get(key);
  if (listeners) {
    listeners.delete(listener);
    if (listeners.size === 0) {
      storageListeners.delete(key);
    }
  }
};

/**
 * Custom hook for managing localStorage with React state synchronization
 * Provides automatic state updates when localStorage changes (including cross-tab)
 * 
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): UseLocalStorageReturn<T> {
  // Helper function to read from localStorage
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  }, [key, defaultValue]);

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          
          // Dispatch to other listeners
          dispatchStorageEvent(key, valueToStore);
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Function to remove the value from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(defaultValue);
        
        // Dispatch to other listeners
        dispatchStorageEvent(key, defaultValue);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    // Listen for changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.warn(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };

    // Listen for changes from other parts of the same app
    const handleLocalChange = (newValue: T) => {
      setStoredValue(newValue);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      addStorageListener(key, handleLocalChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        removeStorageListener(key, handleLocalChange);
      }
    };
  }, [key]);

  return [storedValue, setValue, removeValue];
}

// Convenience hook for app configuration
export function useAppConfig() {
  return useLocalStorage('reserve-funds-config', {
    user: {
      id: 'default-user',
      name: 'Reserve Fund Manager',
      email: 'manager@example.com',
      currentClientId: undefined
    },
    settings: {
      theme: 'light' as const,
      currency: 'USD',
      locale: 'en-US'
    },
    preferences: {
      defaultFiscalYear: new Date().getFullYear().toString(),
      defaultInflationRate: 3.0,
      defaultBankRate: 2.5
    }
  });
}

// Hook for the current user data
export function useCurrentUser() {
  const [config, setConfig] = useAppConfig();
  
  const setUser = useCallback((userData: Partial<typeof config.user>) => {
    setConfig(prev => ({
      ...prev,
      user: { ...prev.user, ...userData }
    }));
  }, [setConfig]);

  return [config.user, setUser] as const;
}

// Hook for app settings
export function useAppSettings() {
  const [config, setConfig] = useAppConfig();
  
  const setSettings = useCallback((settings: Partial<typeof config.settings>) => {
    setConfig(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings }
    }));
  }, [setConfig]);

  return [config.settings, setSettings] as const;
}

// Hook for app preferences
export function useAppPreferences() {
  const [config, setConfig] = useAppConfig();
  
  const setPreferences = useCallback((preferences: Partial<typeof config.preferences>) => {
    setConfig(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...preferences }
    }));
  }, [setConfig]);

  return [config.preferences, setPreferences] as const;
}
