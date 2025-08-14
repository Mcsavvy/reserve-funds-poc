# Hook System

## Overview

The Reserve Funds POC uses a custom React hook system for data management. This provides a clean separation between data access logic and UI components, with built-in state management and error handling.

## Architecture

```
React Components
      ↓
Specialized Hooks (useManagementCompanies, useAssociations, etc.)
      ↓
Generic Hook (useEntity)
      ↓
Database Layer (db instance)
      ↓
IndexedDB
```

## Core Hooks

### Database Initialization

#### `useDatabase()`

Manages database initialization and provides connection status.

```typescript
const { isInitialized, error } = useDatabase();

// Returns:
// - isInitialized: boolean - Database ready status
// - error: string | null - Initialization error if any
```

**Usage:**
```typescript
function App() {
  const { isInitialized, error } = useDatabase();
  
  if (!isInitialized) {
    return <div>Loading database...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return <Dashboard />;
}
```

### Generic Entity Management

#### `useEntity<T>(storeName)`

Generic hook for CRUD operations on any entity type. Used internally by specialized hooks.

```typescript
const {
  items,           // T[] - Array of entities
  loading,         // boolean - Loading state
  error,           // string | null - Error message
  addItem,         // Function to add new item
  updateItem,      // Function to update existing item
  deleteItem,      // Function to delete item
  getItem,         // Function to get single item
  refresh          // Function to reload data
} = useEntity<EntityType>(DB_STORES.ENTITY_NAME);
```

## Specialized Hooks

### Management Companies

#### `useManagementCompanies()`

Manages property management companies with specialized methods.

```typescript
const {
  items: companies,        // ManagementCompany[]
  loading,                 // boolean
  error,                   // string | null
  addItem: addCompany,     // (company) => Promise<ManagementCompany>
  updateItem: updateCompany, // (company) => Promise<ManagementCompany>
  deleteItem: deleteCompany, // (id) => Promise<void>
  getItem,                 // (id) => Promise<ManagementCompany>
  refresh                  // () => Promise<void>
} = useManagementCompanies();
```

**Example:**
```typescript
function ManagementCompanyForm() {
  const { addCompany, loading, error } = useManagementCompanies();
  
  const handleSubmit = async (formData) => {
    try {
      await addCompany({
        company: 'ABC Property Management',
        type: 'management_company',
        company_type: 'property',
        email: 'contact@abc.com',
        active: true,
        created_at: Date.now()
      });
    } catch (err) {
      console.error('Failed to add company:', err);
    }
  };
}
```

### Associations

#### `useAssociations()`

Manages homeowners associations with relationship methods.

```typescript
const {
  items: associations,           // Association[]
  loading,                       // boolean
  error,                         // string | null
  addItem: addAssociation,       // (association) => Promise<Association>
  updateItem: updateAssociation, // (association) => Promise<Association>
  deleteItem: deleteAssociation, // (id) => Promise<void>
  getAssociationsByCompany,      // (companyId) => Association[]
  getUnmanagedAssociations       // () => Association[]
} = useAssociations();
```

**Specialized Methods:**

- `getAssociationsByCompany(companyId)`: Returns associations managed by a specific company
- `getUnmanagedAssociations()`: Returns independent associations (no management company)

**Example:**
```typescript
function AssociationsList() {
  const { associations, getAssociationsByCompany } = useAssociations();
  const companyId = 'company-123';
  
  const managedAssociations = getAssociationsByCompany(companyId);
  
  return (
    <div>
      <h3>Managed Associations: {managedAssociations.length}</h3>
      {managedAssociations.map(assoc => (
        <div key={assoc.id}>{assoc.association}</div>
      ))}
    </div>
  );
}
```

### Models

#### `useModels()`

Manages reserve fund models with business rule enforcement.

```typescript
const {
  items: models,              // Model[]
  loading,                    // boolean
  error,                      // string | null
  addItem: addModel,          // (model) => Promise<Model> - Only for associations!
  updateItem: updateModel,    // (model) => Promise<Model>
  deleteItem: deleteModel,    // (id) => Promise<void>
  getModelsByClient,          // (clientId) => Promise<Model[]>
  getModelsByAssociation,     // (associationId) => Model[]
  getActiveModels,            // () => Promise<Model[]>
  getAssociationForModel      // (modelId) => Association | null
} = useModels();
```

**Business Rule Enforcement:**

The `addModel` function automatically validates that models are only created for associations:

```typescript
const addModel = async (modelData) => {
  const client = clients.find(c => c.id === modelData.client_id);
  if (!client || !isAssociation(client)) {
    throw new Error('Models can only be created for associations, not management companies');
  }
  return await entityHook.addItem(modelData);
};
```

**Example:**
```typescript
function CreateModelForm() {
  const { addModel } = useModels();
  const { items: associations } = useAssociations();
  
  const handleSubmit = async (formData) => {
    try {
      await addModel({
        name: 'Reserve Study 2024',
        client_id: 'association-123', // Must be association ID
        housing: 150,
        starting_amount: 100000,
        // ... other model data
      });
    } catch (err) {
      // Will throw error if client_id is not an association
      console.error(err.message);
    }
  };
}
```

### Configuration

#### `useConfig()`

Manages application configuration with key-value storage.

```typescript
const {
  items: configs,               // Config[]
  getConfigValue,               // (param) => Promise<string | undefined>
  setConfigValue                // (param, value) => Promise<Config>
} = useConfig();
```

**Example:**
```typescript
function SettingsForm() {
  const { getConfigValue, setConfigValue } = useConfig();
  
  const loadSetting = async () => {
    const theme = await getConfigValue('theme');
    return theme || 'light';
  };
  
  const saveSetting = async (theme) => {
    await setConfigValue('theme', theme);
  };
}
```

## Utility Hooks

### Local Storage

#### `useLocalStorage(key, defaultValue)`

Manages localStorage with React state synchronization and cross-tab updates.

```typescript
const [value, setValue, removeValue] = useLocalStorage('key', defaultValue);
```

**Specialized localStorage hooks:**

```typescript
// App configuration
const [config, setConfig] = useAppConfig();

// Current user
const [user, setUser] = useCurrentUser();

// App settings
const [settings, setSettings] = useAppSettings();

// User preferences
const [preferences, setPreferences] = useAppPreferences();
```

### Sample Data

#### `useSampleData()`

Provides sample data generation for testing and demonstration.

```typescript
const { seedSampleData } = useSampleData();

// Generates realistic demo data
await seedSampleData();
```

**Generated Data:**
- 1 Management company
- 2 Associations (1 managed, 1 independent)
- 2 Reserve fund models
- Multiple model items per model

## Hook Patterns

### Loading States

All entity hooks provide loading states:

```typescript
function EntityList() {
  const { items, loading, error } = useEntity(STORE_NAME);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {items.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}
```

### Error Handling

Hooks provide error states and throw errors for invalid operations:

```typescript
function AddItemForm() {
  const { addItem, error } = useEntity(STORE_NAME);
  const [formError, setFormError] = useState(null);
  
  const handleSubmit = async (data) => {
    try {
      setFormError(null);
      await addItem(data);
    } catch (err) {
      setFormError(err.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {(error || formError) && <ErrorAlert message={error || formError} />}
      {/* form fields */}
    </form>
  );
}
```

### Optimistic Updates

Entity hooks update local state immediately for better UX:

```typescript
const addItem = async (item) => {
  const newItem = { ...item, id: generateId() };
  
  // Update UI immediately
  setItems(prev => [...prev, newItem]);
  
  try {
    // Sync with database
    await db.add(storeName, newItem);
  } catch (err) {
    // Rollback on error
    setItems(prev => prev.filter(i => i.id !== newItem.id));
    throw err;
  }
};
```

### Data Relationships

Hooks provide methods to work with related data:

```typescript
function ModelCard({ model }) {
  const { getAssociationForModel } = useModels();
  const association = getAssociationForModel(model.id);
  
  return (
    <div>
      <h3>{model.name}</h3>
      <p>Association: {association?.association}</p>
    </div>
  );
}
```

## Best Practices

### 1. Use Specialized Hooks

Prefer specialized hooks over the generic `useEntity`:

```typescript
// ✅ Good
const { companies } = useManagementCompanies();

// ❌ Avoid
const { items: companies } = useEntity<ManagementCompany>(DB_STORES.CLIENTS);
```

### 2. Handle Loading States

Always handle loading and error states:

```typescript
function ComponentWithData() {
  const { items, loading, error } = useAssociations();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (items.length === 0) return <EmptyState />;
  
  return <DataView items={items} />;
}
```

### 3. Destructure Appropriately

Rename generic returns for clarity:

```typescript
const { 
  items: companies, 
  addItem: addCompany,
  loading: companiesLoading 
} = useManagementCompanies();
```

### 4. Use Relationship Methods

Leverage built-in relationship methods:

```typescript
// ✅ Good
const { getAssociationsByCompany } = useAssociations();
const managed = getAssociationsByCompany(companyId);

// ❌ Avoid manual filtering
const { items: associations } = useAssociations();
const managed = associations.filter(a => a.company_id === companyId);
```

### 5. Error Boundaries

Wrap hook usage in error boundaries for production apps:

```typescript
function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

## Performance Considerations

### Memoization

Hooks use `useCallback` and `useMemo` internally for performance:

```typescript
const getAssociationsByCompany = useCallback((companyId: string) => {
  return associations.filter(assoc => assoc.company_id === companyId);
}, [associations]);
```

### Lazy Loading

Data is loaded on-demand when hooks are used:

```typescript
// Data only loads when component mounts
function LazyComponent() {
  const { items } = useModels(); // Triggers data load
  return <div>{items.length}</div>;
}
```

### State Updates

State updates are batched and optimized:

```typescript
// Multiple updates batched together
const updateMultiple = async () => {
  await updateItem(item1);
  await updateItem(item2);
  // UI updates once, not twice
};
```
