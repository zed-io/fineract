-- Simple script to create new schemas
CREATE SCHEMA IF NOT EXISTS tenants;
CREATE SCHEMA IF NOT EXISTS "default";

-- Update search_path to use new schemas
ALTER DATABASE fineract SET search_path TO tenants, "default", public;