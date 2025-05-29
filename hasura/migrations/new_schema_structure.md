# New Schema Structure for Hasura Implementation

## Overview

This document outlines the new standardized schema structure for the Hasura implementation of Apache Fineract, removing the `fineract_` prefixes and following database best practices.

## Schema Structure

### Core Schemas

1. **`tenants`** (previously `fineract_tenants`)
   - Purpose: Management of tenants in the multi-tenant architecture
   - Content: Tenant metadata, configuration, connection details

2. **`default`** (previously `fineract_default`)
   - Purpose: Default tenant implementation
   - Content: Core banking functionality for the default tenant

3. **`public`**
   - Purpose: Shared resources and extensions
   - Content: Commonly used functions, extensions, shared types

### Dynamic Tenant Schemas

For each tenant, a separate schema is dynamically created following the naming convention:

```
tenant_<tenant_identifier>
```

This approach provides clean separation between tenants while maintaining structural consistency.

## Object Naming Conventions

1. **Tables**
   - Use singular names (e.g., `loan` not `loans`)
   - Use snake_case for names
   - Include schema qualification in references

2. **Functions**
   - Use verb_noun format (e.g., `calculate_interest`)
   - Place in appropriate schema based on scope

3. **Types and Enums**
   - Use singular descriptive names
   - Use snake_case

## Schema Migration Strategy

1. Update initialization script to create new schema structure
2. Update tenant management script to support new schema names
3. Create migration scripts to relocate objects to proper schemas
4. Update all references to use new schema names
5. Update Hasura metadata to reflect new schema structure

## Advantages of New Structure

1. **Cleaner Namespace**: Removes unnecessary prefixes for cleaner object names
2. **Logical Separation**: Proper use of schemas for functional separation
3. **Standards Alignment**: Follows PostgreSQL and Hasura best practices
4. **Improved Maintainability**: Clearer structure for ongoing development
5. **Better IDE Support**: Standard naming improves tooling support