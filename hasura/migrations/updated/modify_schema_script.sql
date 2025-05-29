-- Script to rename schemas from fineract_* to new names
-- This should be run directly on the database

-- Create new schemas first
CREATE SCHEMA IF NOT EXISTS tenants;
CREATE SCHEMA IF NOT EXISTS "default";

-- Copy schema contents from fineract_tenants to tenants
DO $$
DECLARE
    obj record;
BEGIN
    -- Copy tables
    FOR obj IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'fineract_tenants'
    LOOP
        EXECUTE 'CREATE TABLE tenants.' || obj.tablename || ' AS TABLE fineract_tenants.' || obj.tablename;
    END LOOP;

    -- Copy views
    FOR obj IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'fineract_tenants'
    LOOP
        EXECUTE 'CREATE VIEW tenants.' || obj.viewname || ' AS SELECT * FROM fineract_tenants.' || obj.viewname;
    END LOOP;

    -- Copy functions
    FOR obj IN 
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE pronamespace = 'fineract_tenants'::regnamespace
    LOOP
        -- Note: Function copying is complex and may require additional handling
        -- This is a simplified approach
        EXECUTE 'CREATE OR REPLACE FUNCTION tenants.' || obj.proname || '() RETURNS VOID AS $$ ' || obj.prosrc || ' $$ LANGUAGE plpgsql';
    END LOOP;
END $$;

-- Copy schema contents from fineract_default to default
DO $$
DECLARE
    obj record;
BEGIN
    -- Copy tables
    FOR obj IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'fineract_default'
    LOOP
        EXECUTE 'CREATE TABLE "default".' || obj.tablename || ' AS TABLE fineract_default.' || obj.tablename;
    END LOOP;

    -- Copy views
    FOR obj IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'fineract_default'
    LOOP
        EXECUTE 'CREATE VIEW "default".' || obj.viewname || ' AS SELECT * FROM fineract_default.' || obj.viewname;
    END LOOP;

    -- Copy functions
    FOR obj IN 
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE pronamespace = 'fineract_default'::regnamespace
    LOOP
        -- Note: Function copying is complex and may require additional handling
        -- This is a simplified approach
        EXECUTE 'CREATE OR REPLACE FUNCTION "default".' || obj.proname || '() RETURNS VOID AS $$ ' || obj.prosrc || ' $$ LANGUAGE plpgsql';
    END LOOP;
END $$;

-- Update search_path to use new schemas
ALTER DATABASE fineract SET search_path TO tenants, "default", public;

-- Note: After running this script, you'll need to:
-- 1. Recreate constraints (foreign keys, primary keys, etc.)
-- 2. Recreate indices
-- 3. Recreate triggers
-- 4. Update the Hasura metadata to point to the new schemas

-- Optionally, drop old schemas when confirmed everything works
-- DROP SCHEMA fineract_tenants CASCADE;
-- DROP SCHEMA fineract_default CASCADE;