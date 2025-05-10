-- Migration file for Fineract tenant management
-- This creates the base schema for tenant management, equivalent to the original fineract_tenants database

-- Create Schema for tenant management
CREATE SCHEMA IF NOT EXISTS fineract_tenants;

-- Set search path
SET search_path TO fineract_tenants;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better type safety
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE environment_type AS ENUM ('production', 'sandbox', 'development', 'test');

-- Schema version tracking
CREATE TABLE schema_version (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  description VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL,
  script VARCHAR(1000) NOT NULL,
  checksum INTEGER,
  installed_by VARCHAR(100) NOT NULL,
  installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_time INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  UNIQUE(version)
);

CREATE INDEX schema_version_version_idx ON schema_version(version);
CREATE INDEX schema_version_success_idx ON schema_version(success);

-- Tenants table - core of multi-tenancy
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  schema_name VARCHAR(100) NOT NULL UNIQUE,
  timezone_id VARCHAR(100) NOT NULL,
  country_id INTEGER,
  status tenant_status NOT NULL DEFAULT 'active',
  environment environment_type NOT NULL DEFAULT 'production',
  joined_date DATE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID,
  
  -- Database connection information
  db_host VARCHAR(100) NOT NULL DEFAULT 'localhost',
  db_port INTEGER NOT NULL DEFAULT 5432,
  db_connection_parameters TEXT,
  db_username VARCHAR(100) NOT NULL,
  db_password VARCHAR(100) NOT NULL,
  db_encryption_key TEXT,
  
  -- Read-only replica connection information (optional)
  readonly_db_host VARCHAR(100),
  readonly_db_port INTEGER,
  readonly_db_connection_parameters TEXT,
  readonly_db_username VARCHAR(100),
  readonly_db_password VARCHAR(100),
  
  -- Configuration
  auto_update BOOLEAN NOT NULL DEFAULT TRUE,
  rounding_mode INTEGER DEFAULT 6,
  
  -- Connection pool settings
  pool_initial_size INTEGER DEFAULT 5,
  pool_validation_interval INTEGER DEFAULT 30000,
  pool_remove_abandoned BOOLEAN DEFAULT TRUE,
  pool_remove_abandoned_timeout INTEGER DEFAULT 60,
  pool_log_abandoned BOOLEAN DEFAULT TRUE,
  pool_abandon_when_percentage_full INTEGER DEFAULT 50,
  pool_test_on_borrow BOOLEAN DEFAULT TRUE,
  pool_max_active INTEGER DEFAULT 40,
  pool_min_idle INTEGER DEFAULT 20,
  pool_max_idle INTEGER DEFAULT 10,
  pool_suspect_timeout INTEGER DEFAULT 60,
  pool_time_between_eviction_runs_millis INTEGER DEFAULT 34000,
  pool_min_evictable_idle_time_millis INTEGER DEFAULT 60000
);

-- Timezones table
CREATE TABLE timezones (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  timezone_name VARCHAR(100) NOT NULL,
  comments VARCHAR(150)
);

-- Countries table
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  currency_code VARCHAR(3)
);

-- Tenant configurations table for dynamic and flexible configuration
CREATE TABLE tenant_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  config_name VARCHAR(100) NOT NULL,
  config_value TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID,
  UNIQUE(tenant_id, config_name)
);

-- Tenant server status for health monitoring
CREATE TABLE tenant_server_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  server_id VARCHAR(100) NOT NULL,
  last_connection TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  connection_status VARCHAR(20) NOT NULL DEFAULT 'active',
  connection_info JSONB
);

-- Function to create a new tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(schema_name TEXT) 
RETURNS VOID AS $$
BEGIN
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(schema_name);
END;
$$ LANGUAGE plpgsql;

-- Function to drop a tenant schema
CREATE OR REPLACE FUNCTION drop_tenant_schema(schema_name TEXT) 
RETURNS VOID AS $$
BEGIN
  EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(schema_name) || ' CASCADE';
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create a schema when a new tenant is created
CREATE OR REPLACE FUNCTION create_tenant_schema_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_tenant_schema(NEW.schema_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_create_schema
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION create_tenant_schema_trigger();

-- Trigger to update last_modified_date
CREATE OR REPLACE FUNCTION update_last_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.last_modified_date = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_update_timestamp
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION update_last_modified_column();

CREATE TRIGGER tenant_configs_update_timestamp
BEFORE UPDATE ON tenant_configs
FOR EACH ROW
EXECUTE FUNCTION update_last_modified_column();

-- Insert default timezone data
INSERT INTO timezones (country_code, timezone_name, comments) VALUES
('US', 'America/New_York', 'Eastern Time'),
('IN', 'Asia/Kolkata', 'Indian Standard Time'),
('GB', 'Europe/London', 'Greenwich Mean Time');

-- Insert default tenant if needed
INSERT INTO tenants (
  identifier, 
  name, 
  schema_name, 
  timezone_id, 
  db_host, 
  db_port, 
  db_username, 
  db_password
) VALUES (
  'default', 
  'Default Tenant', 
  'fineract_default', 
  'Asia/Kolkata',
  'localhost', 
  5432, 
  'fineract', 
  'fineract'
);

-- Insert schema version record for this migration
INSERT INTO schema_version (
  version,
  description,
  type,
  script,
  checksum,
  installed_by,
  installed_on,
  execution_time,
  success
) VALUES (
  '000001',
  'Initial tenant management setup',
  'SQL',
  '000001_tenant_management.up.sql',
  0,
  'system',
  CURRENT_TIMESTAMP,
  0,
  TRUE
);