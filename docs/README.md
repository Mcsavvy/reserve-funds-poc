# Reserve Funds POC Documentation

This documentation covers the database setup and hook system for the Reserve Funds Proof of Concept application.

## Overview

The Reserve Funds POC is a browser-based application that manages reserve fund simulations for property management companies and homeowners associations. It uses IndexedDB for client-side storage and React hooks for data management.

## Architecture

The application follows a clear separation of concerns:

- **Database Layer**: IndexedDB with structured schemas
- **Data Access Layer**: Custom React hooks for CRUD operations
- **Business Logic**: Specialized hooks enforcing business rules
- **UI Layer**: React components with form validation

## Key Concepts

### Entities

1. **Management Companies**: Property management firms that can manage multiple associations
2. **Associations**: Homeowners associations (HOAs) that may be managed by management companies
3. **Models**: Reserve fund financial models that belong to associations
4. **Model Items**: Individual components/items within reserve fund models

### Business Rules

- Models can only be created for associations (not management companies)
- Associations can be independent or managed by a management company
- Management companies cannot be deleted if they have managed associations
- Associations cannot be deleted if they have active models

## Documentation Sections

- [Database Setup](./database-setup.md) - IndexedDB schema, entities, and relationships
- [Hook System](./hook-system.md) - Custom React hooks for data management
- [Business Logic](./business-logic.md) - Rules and constraints
- [API Reference](./api-reference.md) - Detailed hook and function documentation

## Quick Start

1. The database auto-initializes on first load
2. Use `useDatabase()` hook to check initialization status
3. Use entity-specific hooks (`useManagementCompanies()`, `useAssociations()`, `useModels()`)
4. Sample data can be generated via `useSampleData().seedSampleData()`

## Data Flow

```
IndexedDB ← → Custom Hooks ← → React Components
    ↑              ↑                ↑
 Storage      Data Access       User Interface
```

The system maintains referential integrity and enforces business rules at the hook level, ensuring data consistency across the application.
