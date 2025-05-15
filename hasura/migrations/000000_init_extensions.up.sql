-- Initial migration to set up extensions and core schemas
-- This must run first before all other migrations

-- Create tenant management schema
CREATE SCHEMA IF NOT EXISTS fineract_tenants;

-- Create default tenant schema
CREATE SCHEMA IF NOT EXISTS fineract_default;

-- Set search path to include both schemas
SET search_path TO fineract_tenants, fineract_default, public;

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA public;

-- Ensure the uuid functions are accessible in all schemas
CREATE OR REPLACE FUNCTION fineract_tenants.uuid_generate_v4()
RETURNS uuid
AS 'uuid-ossp', 'uuid_generate_v4'
LANGUAGE C IMMUTABLE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION fineract_default.uuid_generate_v4()
RETURNS uuid
AS 'uuid-ossp', 'uuid_generate_v4'
LANGUAGE C IMMUTABLE PARALLEL SAFE;

-- Ensure gen_random_uuid is available too (used by some migrations)
CREATE OR REPLACE FUNCTION fineract_tenants.gen_random_uuid()
RETURNS uuid
AS 'pgcrypto', 'gen_random_uuid'
LANGUAGE C VOLATILE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION fineract_default.gen_random_uuid()
RETURNS uuid
AS 'pgcrypto', 'gen_random_uuid'
LANGUAGE C VOLATILE PARALLEL SAFE;

-- Add comment to ensure this runs first
COMMENT ON SCHEMA public IS 'Extensions schema for Fineract Hasura implementation';
COMMENT ON SCHEMA fineract_tenants IS 'Tenant management schema for Fineract multi-tenancy';
COMMENT ON SCHEMA fineract_default IS 'Default tenant schema for Fineract';