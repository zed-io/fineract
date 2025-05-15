#!/bin/bash
set -e

echo "Ensuring PostgreSQL extensions are properly loaded in all schemas..."

# Database connection parameters - use the same as in load_seeds.sh
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-fineract}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgrespassword}

# Execute SQL to ensure extensions are available in all schemas
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- Create the required schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS fineract_tenants;
CREATE SCHEMA IF NOT EXISTS fineract_default;

-- Enable required PostgreSQL extensions in public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA public;

-- Create wrapper functions in fineract_tenants schema
CREATE OR REPLACE FUNCTION fineract_tenants.uuid_generate_v4()
RETURNS uuid
AS 'uuid-ossp', 'uuid_generate_v4'
LANGUAGE C IMMUTABLE PARALLEL SAFE;

-- Create wrapper functions in fineract_default schema
CREATE OR REPLACE FUNCTION fineract_default.uuid_generate_v4()
RETURNS uuid
AS 'uuid-ossp', 'uuid_generate_v4'
LANGUAGE C IMMUTABLE PARALLEL SAFE;

-- Grant usage on the extensions to the postgres user
GRANT USAGE ON SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA fineract_default TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA fineract_tenants TO postgres;

EOF

echo "Extensions check completed."