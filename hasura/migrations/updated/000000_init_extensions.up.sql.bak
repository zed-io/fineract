-- Initialize extensions and shared schemas for Fineract
-- This migration creates the base schemas and initializes PostgreSQL extensions

-- Create core schemas
CREATE SCHEMA IF NOT EXISTS tenants;
CREATE SCHEMA IF NOT EXISTS "default";
CREATE SCHEMA IF NOT EXISTS public;

-- Add schema descriptions
COMMENT ON SCHEMA tenants IS 'Tenant management schema for multi-tenancy';
COMMENT ON SCHEMA "default" IS 'Default tenant schema for core banking';

-- Set search path to include all required schemas
SET search_path TO tenants, "default", public;

-- Initialize extensions in public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- Create UUID generation functions in tenant schemas
CREATE OR REPLACE FUNCTION tenants.uuid_generate_v4()
RETURNS uuid AS
$$
    SELECT public.uuid_generate_v4();
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION "default".uuid_generate_v4()
RETURNS uuid AS
$$
    SELECT public.uuid_generate_v4();
$$ LANGUAGE SQL;

-- Create random UUID generation functions in tenant schemas
CREATE OR REPLACE FUNCTION tenants.gen_random_uuid()
RETURNS uuid AS
$$
    SELECT public.gen_random_uuid();
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION "default".gen_random_uuid()
RETURNS uuid AS
$$
    SELECT public.gen_random_uuid();
$$ LANGUAGE SQL;

-- Create shared audit timestamp function
CREATE OR REPLACE FUNCTION public.update_modified_timestamp()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;