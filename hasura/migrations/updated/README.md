# Schema Standardization for Hasura Implementation

This directory contains updated migration scripts that remove the `fineract_` prefix from schema names and implement best practices for PostgreSQL schema organization.

## Overview

The original Hasura implementation used schemas with `fineract_` prefixes:
- `fineract_tenants` for tenant management
- `fineract_default` for the default tenant data

The updated structure simplifies this to:
- `tenants` for tenant management
- `default` for the default tenant data
- `tenant_<identifier>` for dynamic tenant schemas

## Key Files

- **`000000_init_extensions.up.sql`**: Creates the foundational schemas and extensions
- **`000001_tenant_management.up.sql`**: Sets up the tenant management schema
- **`000002_core_schema.up.sql`**: Creates the core schema for the default tenant
- **`schema_reference_update_script.sh`**: Helper script to update references in existing files
- **`migration_guide.md`**: Detailed instructions for migrating existing deployments

## Benefits of the New Structure

1. **Cleaner Namespace**: Removes redundant prefixes for cleaner object names
2. **Standard Naming**: Follows PostgreSQL best practices for schema naming
3. **Better Organization**: Proper schema separation improves maintainability
4. **Improved Tooling Support**: Standard naming improves IDE and tool integration

## How to Apply These Changes

For new deployments:
1. Use these updated migration scripts instead of the original ones
2. Run migrations in sequence using Hasura migrations or direct PostgreSQL commands

For existing deployments:
1. Follow the detailed steps in `migration_guide.md`
2. Use `schema_reference_update_script.sh` to assist with bulk updates

## Schema Structure

### Tenants Schema
Contains tables for tenant management:
- `tenant`: Core tenant information
- `tenant_config`: Tenant-specific configuration
- `schema_version`: Migration tracking
- Supporting tables and functions

### Default Schema
Contains core banking functionality:
- Authentication and authorization
- Organizational structure
- Reference data
- Core domain entities

### Dynamic Tenant Schemas
Each tenant gets its own schema with an identical structure to the default schema, following the naming convention `tenant_<identifier>`.