# Migration Guide: Removing `fineract_` Prefixes

This guide outlines the process of migrating from the old schema structure with `fineract_` prefixes to the new standardized schema structure.

## Overview of Changes

1. Schema renaming:
   - `fineract_tenants` → `tenants`
   - `fineract_default` → `default`
   - Dynamic tenant schemas: `fineract_tenant_X` → `tenant_X`

2. Database object references updated to use proper schema qualification
3. Function namespaces reorganized for better separation of concerns

## Migration Steps

### 1. Preparation

Before running the migration, ensure you have:

- Full database backup of your current system
- Downtime window scheduled (this migration cannot be performed live)
- Sufficient disk space for the migration

### 2. Manual Migration Process

Execute these steps in order:

1. Create new schemas:
   ```sql
   CREATE SCHEMA IF NOT EXISTS tenants;
   CREATE SCHEMA IF NOT EXISTS "default";
   ```

2. Copy data from old schemas to new schemas:
   ```sql
   -- Copy tenant management data
   CREATE TABLE tenants.tenant AS 
   SELECT * FROM fineract_tenants.tenants;
   
   -- Copy tenant configs
   CREATE TABLE tenants.tenant_config AS 
   SELECT * FROM fineract_tenants.tenant_configs;
   
   -- Copy schema version data
   CREATE TABLE tenants.schema_version AS 
   SELECT * FROM fineract_tenants.schema_version;
   
   -- Copy all default tenant tables
   -- This will be done by individual table migrations
   ```

3. Apply constraints, indices, and triggers to new schemas
4. Validate data integrity in new schemas
5. Update Hasura metadata to point to new schemas
6. Drop old schemas once validation is complete

### 3. Using Updated Migration Scripts

Alternatively, for new deployments or complete rebuilds:

1. Delete all existing schemas and tables (after backup)
2. Apply the updated migration scripts in sequence:
   ```bash
   psql -U postgres -d fineract -f hasura/migrations/updated/000000_init_extensions.up.sql
   psql -U postgres -d fineract -f hasura/migrations/updated/000001_tenant_management.up.sql
   psql -U postgres -d fineract -f hasura/migrations/updated/000002_core_schema.up.sql
   # Apply remaining migration scripts
   ```

3. Apply updated Hasura metadata

### 4. Updating Hasura Configuration

After schema migration, you must update Hasura metadata:

1. Update `hasura/metadata/tables/` JSON files to use new schema names
2. Update `hasura/metadata/actions/` files to reference new schemas
3. Update any custom SQL functions in actions to use new schema names
4. Apply updated metadata:
   ```bash
   hasura metadata apply
   ```

## Potential Issues and Solutions

### Foreign Key Constraints

When copying data between schemas, foreign key constraints may cause issues. Handle this by:

1. Creating tables without constraints
2. Copying data
3. Adding constraints after data migration

### Permissions and Grants

Ensure proper grants are applied to the new schemas:

```sql
GRANT USAGE ON SCHEMA tenants TO hasura_user;
GRANT USAGE ON SCHEMA "default" TO hasura_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenants TO hasura_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "default" TO hasura_user;
```

### Sequence Resets

For any SERIAL columns, ensure sequences are properly reset after data migration:

```sql
SELECT setval('tenants.schema_version_id_seq', (SELECT MAX(id) FROM tenants.schema_version));
```

## Validation Steps

After migration, perform these validation checks:

1. Count records in all tables to ensure nothing was lost
2. Test key workflows through GraphQL API
3. Verify permissions are working correctly
4. Confirm reports and calculations produce identical results

## Rollback Plan

If issues are encountered:

1. Restore the database backup
2. Revert Hasura metadata changes
3. Restart Hasura services

Note: Hasura metadata cannot be easily rolled back, so maintain a backup of metadata JSON files before migration.