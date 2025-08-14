# Database Setup

## Overview

The Reserve Funds POC uses IndexedDB for client-side data storage. This provides persistent storage that works across browser sessions without requiring a backend server.

## Database Configuration

- **Database Name**: `ReserveFundsDB`
- **Version**: `1`
- **Storage**: Browser IndexedDB
- **Initialization**: Automatic on first app load

## Schema Definition

### Core Entities

#### Management Companies (`management_company`)
Property management firms that can manage multiple associations.

```typescript
interface ManagementCompany {
  id: string;                    // Unique identifier
  company: string;               // Company name
  type: 'management_company';    // Entity type
  company_type: 'reserve' | 'property'; // Specialization
  email?: string;                // Contact email
  phone?: string;                // Contact phone
  address?: string;              // Physical address
  address2?: string;             // Address line 2
  city?: string;                 // City
  zip?: string;                  // ZIP code
  state?: string;                // State
  active: boolean;               // Active status
  created_at: number;            // Creation timestamp
}
```

**Indexes:**
- `type` - For filtering by entity type
- `active` - For filtering active companies

#### Associations (`association`)
Homeowners associations that may be managed by management companies.

```typescript
interface Association {
  id: string;                    // Unique identifier
  association: string;           // Association name
  company_id?: string;           // Link to management company (optional)
  type: 'association';           // Entity type
  company_type: 'reserve' | 'property'; // Specialization
  email?: string;                // Contact email
  phone?: string;                // Contact phone
  address?: string;              // Physical address
  address2?: string;             // Address line 2
  city?: string;                 // City
  zip?: string;                  // ZIP code
  state?: string;                // State
  active: boolean;               // Active status
  created_at: number;            // Creation timestamp
}
```

**Indexes:**
- `company_id` - For finding associations by management company
- `type` - For filtering by entity type
- `active` - For filtering active associations

#### Models (`models`)
Reserve fund financial models belonging to associations.

```typescript
interface Model {
  id: string;                    // Unique identifier
  name: string;                  // Model name
  client_id: string;             // Association ID (FK)
  housing: number;               // Number of housing units
  starting_amount: number;       // Initial reserve balance
  inflation_rate: number;        // Annual inflation rate (%)
  monthly_fees: number;          // Monthly assessment fees
  monthly_fees_rate: number;     // Fee increase rate (%)
  cushion_fund: number;          // Emergency cushion amount
  period: number;                // Analysis period (years)
  bank_rate: number;             // Bank savings rate (%)
  bank_int_rate: number;         // Interest earning rate (%)
  loan_years: number;            // Loan term (years)
  fiscal_year: string;           // Fiscal year
  inv_strategy: string;          // Investment strategy description
  active: boolean;               // Active status
  updated_at: number;            // Last update timestamp
  created_at: number;            // Creation timestamp
}
```

**Indexes:**
- `client_id` - For finding models by association
- `active` - For filtering active models
- `created_at` - For sorting by creation date

#### Model Items (`model_items`)
Individual components/items within reserve fund models.

```typescript
interface ModelItem {
  id: string;                    // Unique identifier
  model_id: string;              // Model ID (FK)
  name: string;                  // Item name/description
  redundancy: number;            // Redundancy factor
  remaining_life: number;        // Remaining useful life (years)
  cost: number;                  // Replacement cost
  is_sirs: boolean;              // Is SIRS (Structural/Important) item
}
```

**Indexes:**
- `model_id` - For finding items by model
- `is_sirs` - For filtering SIRS items

### Simulation Data

The schema also includes various simulation-related tables for storing calculation results:

- `simulation_actual` - Actual cost simulations
- `simulation_splits` - Split simulations
- `simulation_splits_ltim` - Long-term split simulations
- `simulation_deficit` - Deficit simulations
- `simulation_deficit_ltim` - Long-term deficit simulations
- `simulation_rules` - Custom simulation rules
- `simulation_versions` - Saved simulation versions

### Configuration

#### Config (`config`)
Application configuration storage.

```typescript
interface Config {
  id: string;                    // Configuration key
  param: string;                 // Parameter name
  value: string;                 // Parameter value
}
```

## Relationships

```
Management Company (1) ←→ (0..n) Association
Association (1) ←→ (0..n) Model
Model (1) ←→ (0..n) Model Item
Model (1) ←→ (0..n) Simulation Data
```

### Key Relationships

1. **Management Company → Association**
   - One management company can manage multiple associations
   - Associations can be independent (no management company)
   - Foreign key: `association.company_id`

2. **Association → Model**
   - One association can have multiple reserve fund models
   - Models must belong to an association (not management company)
   - Foreign key: `model.client_id`

3. **Model → Model Items**
   - One model can have multiple items
   - Items represent individual components to be replaced
   - Foreign key: `model_item.model_id`

## Database Operations

### Initialization

The database is automatically initialized when the app starts:

```typescript
import { initializeDatabase } from '@/lib/db';

// Auto-initializes IndexedDB with schema
await initializeDatabase();
```

### CRUD Operations

Basic operations are available through the database instance:

```typescript
import { db } from '@/lib/db';

// Create
await db.add(DB_STORES.CLIENTS, newClient);

// Read
const client = await db.get(DB_STORES.CLIENTS, clientId);
const allClients = await db.getAll(DB_STORES.CLIENTS);

// Update
await db.update(DB_STORES.CLIENTS, updatedClient);

// Delete
await db.delete(DB_STORES.CLIENTS, clientId);
```

### Specialized Queries

```typescript
// Get models by association
const models = await db.getModelsByClient(associationId);

// Get active models
const activeModels = await db.getActiveModels();

// Get items by model
const items = await db.getItemsByModel(modelId);
```

## Data Integrity

### Business Rules Enforcement

1. **Referential Integrity**: Foreign key relationships are maintained
2. **Type Safety**: TypeScript interfaces ensure data consistency
3. **Validation**: Forms validate required fields and data types
4. **Cascade Rules**: Prevent deletion of entities with dependencies

### Error Handling

All database operations include error handling:

```typescript
try {
  await db.add(DB_STORES.CLIENTS, newClient);
} catch (error) {
  console.error('Failed to add client:', error);
  // Handle error appropriately
}
```

## Performance Considerations

- **Indexes**: Created on frequently queried fields
- **Batch Operations**: Multiple items added in sequence
- **Lazy Loading**: Data loaded on-demand through hooks
- **Optimistic Updates**: UI updates immediately, syncs with DB

## Storage Limits

IndexedDB storage is subject to browser limitations:

- **Chrome**: Up to 20% of disk space
- **Firefox**: Up to 50% of available space  
- **Safari**: Up to 1GB
- **Persistence**: Data persists across browser sessions

## Migration Strategy

For future schema changes:

1. Increment `DB_VERSION` in `lib/db.ts`
2. Add migration logic in `onupgradeneeded` event
3. Handle backward compatibility
4. Test with existing data

## Backup and Export

Since data is stored locally:

- No automatic backups
- Export functionality can be added
- Data is tied to specific browser/device
- Consider cloud sync for production use
