# API Reference

## Overview

This document provides detailed API reference for all hooks, functions, and interfaces in the Reserve Funds POC system.

## Database Hooks

### `useDatabase()`

**Purpose**: Manages database initialization and connection status.

**Returns**:
```typescript
{
  isInitialized: boolean;  // True when database is ready
  error: string | null;    // Error message if initialization failed
}
```

**Example**:
```typescript
const { isInitialized, error } = useDatabase();

if (!isInitialized) {
  return <LoadingScreen />;
}
```

---

### `useEntity<T>(storeName: DBStoreNames)`

**Purpose**: Generic CRUD operations for any entity type.

**Parameters**:
- `storeName`: Database store name from `DB_STORES` enum

**Returns**:
```typescript
{
  items: T[];                           // Array of entities
  loading: boolean;                     // Loading state
  error: string | null;                 // Error message
  addItem: (item: Partial<T>) => Promise<T>;     // Add new entity
  updateItem: (item: T) => Promise<T>;           // Update existing entity
  deleteItem: (id: string) => Promise<void>;    // Delete entity
  getItem: (id: string) => Promise<T | undefined>; // Get single entity
  refresh: () => Promise<void>;                  // Reload data
}
```

**Example**:
```typescript
const { items, addItem, loading } = useEntity<Config>(DB_STORES.CONFIG);
```

## Specialized Entity Hooks

### `useManagementCompanies()`

**Purpose**: Manages property management companies.

**Returns**:
```typescript
{
  items: ManagementCompany[];           // Array of companies
  loading: boolean;                     // Loading state
  error: string | null;                 // Error message
  addItem: (company: Omit<ManagementCompany, 'id' | 'type'> & Partial<Pick<ManagementCompany, 'id'>>) => Promise<ManagementCompany>;
  updateItem: (company: ManagementCompany) => Promise<ManagementCompany>;
  deleteItem: (id: string) => Promise<void>;
  getItem: (id: string) => Promise<ManagementCompany | undefined>;
  refresh: () => Promise<void>;
}
```

**Add Item Parameters**:
```typescript
{
  company: string;                      // Company name (required)
  company_type?: 'reserve' | 'property'; // Default: 'property'
  email?: string;                       // Contact email
  phone?: string;                       // Contact phone
  address?: string;                     // Address
  address2?: string;                    // Address line 2
  city?: string;                        // City
  zip?: string;                         // ZIP code
  state?: string;                       // State
  active: boolean;                      // Active status
  created_at: number;                   // Creation timestamp
}
```

**Example**:
```typescript
const { addItem: addCompany } = useManagementCompanies();

await addCompany({
  company: 'ABC Property Management',
  company_type: 'property',
  email: 'contact@abc.com',
  active: true,
  created_at: Date.now()
});
```

---

### `useAssociations()`

**Purpose**: Manages homeowners associations with relationship methods.

**Returns**:
```typescript
{
  items: Association[];                 // Array of associations
  loading: boolean;                     // Loading state
  error: string | null;                 // Error message
  addItem: (association: Omit<Association, 'id' | 'type'> & Partial<Pick<Association, 'id'>>) => Promise<Association>;
  updateItem: (association: Association) => Promise<Association>;
  deleteItem: (id: string) => Promise<void>;
  getItem: (id: string) => Promise<Association | undefined>;
  refresh: () => Promise<void>;
  getAssociationsByCompany: (companyId: string) => Association[];
  getUnmanagedAssociations: () => Association[];
}
```

**Additional Methods**:
- `getAssociationsByCompany(companyId)`: Returns associations managed by specific company
- `getUnmanagedAssociations()`: Returns independent associations

**Add Item Parameters**:
```typescript
{
  association: string;                  // Association name (required)
  company_id?: string;                  // Management company ID (optional)
  company_type?: 'reserve' | 'property'; // Default: 'reserve'
  email?: string;                       // Contact email
  phone?: string;                       // Contact phone
  address?: string;                     // Address
  address2?: string;                    // Address line 2
  city?: string;                        // City
  zip?: string;                         // ZIP code
  state?: string;                       // State
  active: boolean;                      // Active status
  created_at: number;                   // Creation timestamp
}
```

**Example**:
```typescript
const { addItem: addAssociation, getAssociationsByCompany } = useAssociations();

// Add managed association
await addAssociation({
  association: 'Sunset Gardens HOA',
  company_id: 'company-123',
  active: true,
  created_at: Date.now()
});

// Get associations by company
const managed = getAssociationsByCompany('company-123');
```

---

### `useModels()`

**Purpose**: Manages reserve fund models with business rule enforcement.

**Returns**:
```typescript
{
  items: Model[];                       // Array of models
  loading: boolean;                     // Loading state
  error: string | null;                 // Error message
  addItem: (model: Omit<Model, 'id'> & Partial<Pick<Model, 'id'>>) => Promise<Model>;
  updateItem: (model: Model) => Promise<Model>;
  deleteItem: (id: string) => Promise<void>;
  getItem: (id: string) => Promise<Model | undefined>;
  refresh: () => Promise<void>;
  getModelsByClient: (clientId: string) => Promise<Model[]>;
  getModelsByAssociation: (associationId: string) => Model[];
  getActiveModels: () => Promise<Model[]>;
  getAssociationForModel: (modelId: string) => Association | null;
}
```

**Business Rule**: `addItem` only accepts association IDs, throws error for management company IDs.

**Add Item Parameters**:
```typescript
{
  name: string;                         // Model name (required)
  client_id: string;                    // Association ID (required)
  housing: number;                      // Housing units
  starting_amount: number;              // Initial reserve balance
  inflation_rate: number;               // Annual inflation rate (%)
  monthly_fees: number;                 // Monthly assessment fees
  monthly_fees_rate: number;            // Fee increase rate (%)
  cushion_fund: number;                 // Emergency cushion amount
  period: number;                       // Simulation years (1-50, typically 20-30)
  bank_rate: number;                    // Bank savings rate (%)
  bank_int_rate: number;                // Interest earning rate (%)
  loan_years: number;                   // Loan term (years)
  fiscal_year: string;                  // Fiscal year
  inv_strategy: string;                 // Investment strategy description
  active: boolean;                      // Active status
  updated_at: number;                   // Last update timestamp
  created_at: number;                   // Creation timestamp
}
```

**Example**:
```typescript
const { addItem: addModel, getModelsByAssociation } = useModels();

// Add model for association
await addModel({
  name: 'Reserve Study 2024',
  client_id: 'association-123', // Must be association, not management company
  housing: 150,
  starting_amount: 100000,
  inflation_rate: 3.0,
  monthly_fees: 300,
  monthly_fees_rate: 2.0,
  cushion_fund: 10000,
  period: 30,                    // Simulate 30 years into the future
  bank_rate: 2.5,
  bank_int_rate: 1.5,
  loan_years: 30,
  fiscal_year: '2024',
  inv_strategy: 'Conservative portfolio with focus on capital preservation',
  active: true,
  updated_at: Date.now(),
  created_at: Date.now(),
});

// Get models for association
const models = getModelsByAssociation('association-123');
```

---

### `useModelItems()`

**Purpose**: Manages individual components within reserve fund models.

**Returns**:
```typescript
{
  items: ModelItem[];                   // Array of model items
  loading: boolean;                     // Loading state
  error: string | null;                 // Error message
  addItem: (item: Omit<ModelItem, 'id'> & Partial<Pick<ModelItem, 'id'>>) => Promise<ModelItem>;
  updateItem: (item: ModelItem) => Promise<ModelItem>;
  deleteItem: (id: string) => Promise<void>;
  getItem: (id: string) => Promise<ModelItem | undefined>;
  refresh: () => Promise<void>;
  getItemsByModel: (modelId: string) => Promise<ModelItem[]>;
}
```

**Add Item Parameters**:
```typescript
{
  model_id: string;                     // Model ID (required)
  name: string;                         // Item name/description (required)
  redundancy: number;                   // Redundancy factor
  remaining_life: number;               // Remaining useful life (years)
  cost: number;                         // Replacement cost
  is_sirs: boolean;                     // Is SIRS (Structural/Important) item
}
```

---

### `useConfig()`

**Purpose**: Manages application configuration with key-value storage.

**Returns**:
```typescript
{
  items: Config[];                      // Array of config items
  loading: boolean;                     // Loading state
  error: string | null;                 // Error message
  addItem: (config: Omit<Config, 'id'> & Partial<Pick<Config, 'id'>>) => Promise<Config>;
  updateItem: (config: Config) => Promise<Config>;
  deleteItem: (id: string) => Promise<void>;
  getItem: (id: string) => Promise<Config | undefined>;
  refresh: () => Promise<void>;
  getConfigValue: (param: string) => Promise<string | undefined>;
  setConfigValue: (param: string, value: string) => Promise<Config>;
}
```

**Additional Methods**:
- `getConfigValue(param)`: Get configuration value by parameter name
- `setConfigValue(param, value)`: Set configuration value

**Example**:
```typescript
const { getConfigValue, setConfigValue } = useConfig();

// Get setting
const theme = await getConfigValue('theme') || 'light';

// Set setting
await setConfigValue('theme', 'dark');
```

## Utility Hooks

### `useLocalStorage<T>(key: string, defaultValue: T)`

**Purpose**: Manages localStorage with React state synchronization and cross-tab updates.

**Parameters**:
- `key`: localStorage key
- `defaultValue`: Default value if key doesn't exist

**Returns**:
```typescript
[
  T,                                    // Current value
  (value: T | ((prev: T) => T)) => void, // Setter function
  () => void                            // Remove function
]
```

**Example**:
```typescript
const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');

setTheme('dark');                       // Set value
setTheme(prev => prev === 'light' ? 'dark' : 'light'); // Function setter
removeTheme();                          // Remove from localStorage
```

### Specialized localStorage Hooks

#### `useAppConfig()`
```typescript
const [config, setConfig] = useAppConfig();
// Returns complete app configuration object
```

#### `useCurrentUser()`
```typescript
const [user, setUser] = useCurrentUser();
// Returns current user data
```

#### `useAppSettings()`
```typescript
const [settings, setSettings] = useAppSettings();
// Returns app settings (theme, currency, locale)
```

#### `useAppPreferences()`
```typescript
const [preferences, setPreferences] = useAppPreferences();
// Returns user preferences (default rates, fiscal year)
```

---

### `useSampleData()`

**Purpose**: Provides sample data generation for testing and demonstration.

**Returns**:
```typescript
{
  seedSampleData: () => Promise<{
    managementCompany: ManagementCompany;
    associations: Association[];
    models: Model[];
  }>;
}
```

**Generated Data**:
- 1 Management company ("Premier Property Management")
- 2 Associations (1 managed, 1 independent)
- 2 Reserve fund models with financial parameters
- Multiple model items per model

**Example**:
```typescript
const { seedSampleData } = useSampleData();

const sampleData = await seedSampleData();
console.log(`Created ${sampleData.associations.length} associations`);
```

## Type Definitions

### Core Interfaces

#### `ManagementCompany`
```typescript
interface ManagementCompany extends Client {
  type: 'management_company';
  company: string;                      // Company name
}
```

#### `Association`
```typescript
interface Association extends Client {
  type: 'association';
  association: string;                  // Association name
  company_id?: string;                  // Optional management company link
}
```

#### `Model`
```typescript
interface Model {
  id: string;
  name: string;
  client_id: string;                    // Association ID
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
}
```

#### `ModelItem`
```typescript
interface ModelItem {
  id: string;
  model_id: string;
  name: string;
  redundancy: number;
  remaining_life: number;
  cost: number;
  is_sirs: boolean;
}
```

### Type Guards

#### `isManagementCompany(client: Client): client is ManagementCompany`
```typescript
if (isManagementCompany(client)) {
  // client is typed as ManagementCompany
  console.log(client.company);
}
```

#### `isAssociation(client: Client): client is Association`
```typescript
if (isAssociation(client)) {
  // client is typed as Association
  console.log(client.association);
}
```

## Database Constants

### `DB_STORES`
```typescript
const DB_STORES = {
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
} as const;
```

## Error Handling

### Common Error Types

**Business Rule Violations**:
```typescript
// Thrown by useModels().addItem() when client_id is not an association
throw new Error('Models can only be created for associations, not management companies');
```

**Database Errors**:
```typescript
// Network/storage errors
'Failed to add item'
'Failed to update item'
'Failed to delete item'
'Failed to load items'
'Database not initialized'
```

### Error Handling Pattern

```typescript
try {
  await addItem(data);
} catch (error) {
  if (error.message.includes('associations')) {
    // Handle business rule violation
    showBusinessRuleError(error.message);
  } else {
    // Handle technical error
    showTechnicalError('Operation failed. Please try again.');
  }
}
```

## Performance Notes

### Memoization

Relationship methods are memoized for performance:
```typescript
const getAssociationsByCompany = useCallback((companyId: string) => {
  return associations.filter(assoc => assoc.company_id === companyId);
}, [associations]);
```

### Lazy Loading

- Entity data loaded only when hook is first used
- Database initialization happens automatically
- No eager loading of unused data

### State Updates

- Optimistic UI updates for better UX
- Automatic rollback on database errors
- Batched state updates for performance
