# Business Logic

## Overview

The Reserve Funds POC implements specific business rules and constraints that reflect real-world property management and reserve fund operations. These rules are enforced at the hook level to ensure data integrity and realistic workflows.

## Entity Hierarchy

```
Management Company
    ↓ (manages 0..n)
Association (HOA)
    ↓ (owns 0..n)
Reserve Fund Model
    ↓ (contains 0..n)
Model Items
```

## Core Business Rules

### 1. Entity Type Constraints

#### Management Companies vs Associations

**Rule**: The system distinguishes between management companies and associations as separate entity types.

**Implementation**:
```typescript
type ClientType = 'management_company' | 'association';

// Type guards ensure proper classification
function isManagementCompany(client: Client): client is ManagementCompany {
  return client.type === 'management_company';
}

function isAssociation(client: Client): client is Association {
  return client.type === 'association';
}
```

**Business Logic**:
- Management companies provide services to associations
- Associations are the actual property owners/communities
- Each entity has different capabilities and restrictions

### 2. Model Ownership Restrictions

#### Models Belong Only to Associations

**Rule**: Reserve fund models can only be created for associations, never for management companies.

**Rationale**: Management companies don't own reserve funds; they manage them for associations.

**Implementation**:
```typescript
const addModelForAssociation = useCallback(async (modelData) => {
  const client = clients.find(c => c.id === modelData.client_id);
  if (!client || !isAssociation(client)) {
    throw new Error('Models can only be created for associations, not management companies');
  }
  return await entityHook.addItem(modelData);
}, [entityHook.addItem, clients]);
```

**UI Enforcement**:
- Model creation form only shows associations in dropdown
- Create Model button disabled when no associations exist
- Error messages guide users to correct workflow

### 3. Management Relationships

#### Optional Management Company Assignment

**Rule**: Associations can be independent or managed by a management company.

**Implementation**:
```typescript
interface Association {
  company_id?: string; // Optional - links to management company
  // ... other fields
}

// Helper methods
const getAssociationsByCompany = (companyId: string) => 
  associations.filter(assoc => assoc.company_id === companyId);

const getUnmanagedAssociations = () => 
  associations.filter(assoc => !assoc.company_id);
```

**Business Scenarios**:
- **Managed Associations**: Associations that contract with management companies
- **Independent Associations**: Self-managed associations (board-run)
- **Transition**: Associations can change management companies

### 4. Referential Integrity

#### Cascade Deletion Protection

**Rule**: Entities with dependencies cannot be deleted until dependencies are resolved.

**Management Company Deletion**:
```typescript
const handleDeleteManagementCompany = async (company) => {
  const managedAssociations = getAssociationsByCompany(company.id);
  if (managedAssociations.length > 0) {
    alert(`Cannot delete "${company.company}" because it manages ${managedAssociations.length} association(s). Please reassign or delete the associations first.`);
    return;
  }
  // Proceed with deletion
};
```

**Association Deletion**:
```typescript
const handleDeleteAssociation = async (association) => {
  const associationModels = models.filter(m => m.client_id === association.id);
  if (associationModels.length > 0) {
    alert(`Cannot delete "${association.association}" because it has ${associationModels.length} model(s). Please delete the models first.`);
    return;
  }
  // Proceed with deletion
};
```

### 5. Data Validation Rules

#### Required Fields

**Management Companies**:
- Company name (required)
- Company type (default: 'property')
- Entity type (automatically set to 'management_company')

**Associations**:
- Association name (required)
- Entity type (automatically set to 'association')
- Management company (optional)

**Models**:
- Model name (required)
- Association ID (required, must be valid association)
- Financial parameters (with sensible defaults)

#### Field Validation

```typescript
// Form validation example
const validateModelForm = (formData) => {
  const errors = {};
  
  if (!formData.name.trim()) {
    errors.name = 'Model name is required';
  }
  
  if (!formData.client_id) {
    errors.client_id = 'Association is required';
  }
  
  if (formData.starting_amount < 0) {
    errors.starting_amount = 'Starting amount cannot be negative';
  }
  
  return errors;
};
```

## Workflow Constraints

### 1. Proper Entity Creation Order

**Recommended Workflow**:
1. Create management companies (if applicable)
2. Create associations (optionally assign management company)
3. Create reserve fund models for associations
4. Add model items to models

**System Guidance**:
- Create Model button disabled until associations exist
- Form dropdowns show only valid options
- Error messages guide users to correct sequence

### 2. Management Company Assignment

**Assignment Rules**:
- Associations can be created without management company (independent)
- Management companies can be assigned during association creation
- Management companies can be changed later via edit
- Multiple associations can share same management company

**UI Implementation**:
```typescript
<Select value={formData.company_id} onValueChange={setValue}>
  <SelectItem value="none">Independent (No Management Company)</SelectItem>
  {managementCompanies.map(company => (
    <SelectItem key={company.id} value={company.id}>
      {company.company}
    </SelectItem>
  ))}
</Select>
```

### 3. Model Management

**Model Creation Rules**:
- Must select an association (not management company)
- All financial parameters have reasonable defaults
- Simulation years can be specified (1-50 years, typically 20-30)
- Model can be activated/deactivated
- Multiple models allowed per association

**Model Lifecycle**:
```
Created → Active → [Simulation Data] → Archive/Delete
```

## Financial Business Rules

### 1. Reserve Fund Calculations

**Default Parameters**:
```typescript
const defaultModelParams = {
  housing: 100,              // Housing units
  starting_amount: 50000,    // Initial reserve balance
  inflation_rate: 3.0,       // Annual inflation (%)
  monthly_fees: 250,         // Monthly assessment
  monthly_fees_rate: 2.0,    // Fee increase rate (%)
  cushion_fund: 10000,       // Emergency fund
  period: 30,                // Simulation years (projection period)
  bank_rate: 2.5,           // Savings rate (%)
  bank_int_rate: 1.5,       // Interest earning rate (%)
  loan_years: 30            // Loan term (years)
};
```

**Calculation Rules**:
- Inflation applied to future costs
- Interest earned on reserve balances
- Monthly fees adjusted annually
- Component replacement scheduled by remaining life
- Projections calculated for the specified simulation period

**Simulation Years Business Logic**:
- **Purpose**: Determines how many years into the future to project reserve fund needs
- **Range**: 1-50 years (form validation enforced)
- **Industry Standard**: Typically 20-30 years for most reserve studies
- **Impact**: Longer periods show more replacement cycles but with higher uncertainty
- **Usage**: Helps associations plan long-term financial requirements and assess adequacy of current funding levels

### 2. Model Item Rules

**Item Properties**:
```typescript
interface ModelItem {
  name: string;           // Component description
  redundancy: number;     // Replacement frequency
  remaining_life: number; // Years until replacement
  cost: number;          // Current replacement cost
  is_sirs: boolean;      // Structural/Important item flag
}
```

**Calculation Rules**:
- Replacement costs inflated to future value
- SIRS items prioritized in funding
- Redundancy factor affects scheduling
- Items grouped by replacement year

## Access Control & Permissions

### 1. Entity-Level Permissions

**Current Implementation**: Single-user, all permissions

**Future Considerations**:
- Management company users see only their associations
- Association users see only their models
- Read-only access for certain user types

### 2. Data Isolation

**Management Company Isolation**:
```typescript
// Future implementation concept
const getAssociationsForCurrentUser = () => {
  if (user.type === 'management_company') {
    return associations.filter(a => a.company_id === user.company_id);
  }
  return associations; // Admin sees all
};
```

## Error Handling & User Guidance

### 1. Constraint Violation Messages

**Clear Error Messages**:
- "Models can only be created for associations, not management companies"
- "Cannot delete management company with active associations"
- "Please select an association to create a model"

### 2. Preventive UI Design

**Disabled States**:
- Create Model button disabled when no associations
- Delete actions disabled when dependencies exist
- Invalid options filtered from dropdowns

**Visual Indicators**:
- Badge showing entity type (Association vs Management Company)
- Relationship indicators ("Managed by: XYZ Company")
- Dependency counts ("Manages 3 associations")

## Data Consistency Rules

### 1. Relationship Maintenance

**Orphan Prevention**:
- Models cannot exist without valid association
- Associations track their management company relationship
- Broken references handled gracefully

**Update Cascading**:
- Association name changes reflected in model displays
- Management company changes update association displays
- Entity status changes (active/inactive) propagate

### 2. State Synchronization

**Real-time Updates**:
- Hook system ensures UI consistency
- Local state synced with IndexedDB
- Cross-component data sharing

**Conflict Resolution**:
- Last-write-wins for concurrent edits
- Optimistic updates with rollback on error
- User feedback for operation results

## Performance & Scalability Rules

### 1. Data Loading

**Lazy Loading**:
- Entity data loaded only when hook is used
- Related data fetched on-demand
- Efficient filtering and indexing

**Caching Strategy**:
- In-memory state caching
- IndexedDB as persistent cache
- No external API calls required

### 2. Relationship Queries

**Efficient Lookups**:
```typescript
// Optimized relationship queries
const getAssociationsByCompany = useMemo(() => 
  (companyId) => associations.filter(a => a.company_id === companyId),
  [associations]
);
```

**Index Usage**:
- Foreign key indexes for relationships
- Type indexes for entity filtering
- Status indexes for active/inactive filtering
