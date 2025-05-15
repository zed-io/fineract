-- Migration file for Fineract core authentication and authorization entities
-- Creates the base schema for the auth system in a tenant schema

-- Create tenant schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS fineract_default;

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audit columns function
CREATE OR REPLACE FUNCTION audit_fields() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW.created_date := CURRENT_TIMESTAMP;
        NEW.last_modified_date := CURRENT_TIMESTAMP;
    ELSIF (TG_OP = 'UPDATE') THEN
        NEW.last_modified_date := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create core authentication tables

-- Offices table (for organizational hierarchy)
CREATE TABLE office (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES office(id),
    hierarchy VARCHAR(100),
    opening_date DATE NOT NULL,
    external_id VARCHAR(100) UNIQUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Staff table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL REFERENCES office(id),
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    is_loan_officer BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    mobile_no VARCHAR(50),
    email_address VARCHAR(100),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Permissions table
CREATE TABLE permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grouping VARCHAR(45) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    entity_name VARCHAR(100),
    action_name VARCHAR(100),
    can_maker_checker BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(500)
);

-- Roles table
CREATE TABLE role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_self_service_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Role-Permission mapping table
CREATE TABLE role_permission (
    role_id UUID NOT NULL REFERENCES role(id),
    permission_id UUID NOT NULL REFERENCES permission(id),
    PRIMARY KEY (role_id, permission_id)
);

-- App User table
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100),
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    password_never_expires BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    last_time_password_updated TIMESTAMP,
    password_expired BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    account_non_expired BOOLEAN NOT NULL DEFAULT TRUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    requires_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempt_count INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    office_id UUID NOT NULL REFERENCES office(id),
    staff_id UUID REFERENCES staff(id),
    is_self_service_user BOOLEAN NOT NULL DEFAULT FALSE,
    cannot_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- User-Role mapping table
CREATE TABLE app_user_role (
    app_user_id UUID NOT NULL REFERENCES app_user(id),
    role_id UUID NOT NULL REFERENCES role(id),
    PRIMARY KEY (app_user_id, role_id)
);

-- Client table (simplified for now)
CREATE TABLE client (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_no VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL,
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    display_name VARCHAR(200) NOT NULL,
    mobile_no VARCHAR(50),
    email_address VARCHAR(100),
    office_id UUID NOT NULL REFERENCES office(id),
    staff_id UUID REFERENCES staff(id),
    activation_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Self-service user to client mapping
CREATE TABLE app_user_client_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_user_id UUID NOT NULL REFERENCES app_user(id),
    client_id UUID NOT NULL REFERENCES client(id),
    UNIQUE (app_user_id, client_id)
);

-- Add audit triggers
CREATE TRIGGER set_audit_fields_office_trig
BEFORE INSERT OR UPDATE ON office
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER set_audit_fields_staff_trig
BEFORE INSERT OR UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER set_audit_fields_role_trig
BEFORE INSERT OR UPDATE ON role
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER set_audit_fields_app_user_trig
BEFORE INSERT OR UPDATE ON app_user
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER set_audit_fields_client_trig
BEFORE INSERT OR UPDATE ON client
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Insert default data

-- Default office
INSERT INTO office (id, name, hierarchy, opening_date, created_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Head Office', '.', CURRENT_DATE, CURRENT_TIMESTAMP);

-- Default role
INSERT INTO role (id, name, description, is_disabled, created_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Super user', 'This role provides all application permissions.', FALSE, CURRENT_TIMESTAMP);

-- Default permissions (simplified set)
INSERT INTO permission (id, grouping, code, entity_name, action_name, can_maker_checker)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'special', 'ALL_FUNCTIONS', NULL, NULL, FALSE),
    ('00000000-0000-0000-0000-000000000002', 'special', 'ALL_FUNCTIONS_READ', NULL, NULL, FALSE),
    ('00000000-0000-0000-0000-000000000003', 'portfolio', 'CREATE_CLIENT', 'CLIENT', 'CREATE', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'portfolio', 'READ_CLIENT', 'CLIENT', 'READ', FALSE),
    ('00000000-0000-0000-0000-000000000005', 'portfolio', 'UPDATE_CLIENT', 'CLIENT', 'UPDATE', TRUE),
    ('00000000-0000-0000-0000-000000000006', 'portfolio', 'DELETE_CLIENT', 'CLIENT', 'DELETE', TRUE),
    ('00000000-0000-0000-0000-000000000007', 'portfolio', 'CREATE_LOAN', 'LOAN', 'CREATE', TRUE),
    ('00000000-0000-0000-0000-000000000008', 'portfolio', 'READ_LOAN', 'LOAN', 'READ', FALSE),
    ('00000000-0000-0000-0000-000000000009', 'portfolio', 'UPDATE_LOAN', 'LOAN', 'UPDATE', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'portfolio', 'DELETE_LOAN', 'LOAN', 'DELETE', TRUE);

-- Assign all permissions to super user role
INSERT INTO role_permission (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permission;

-- Create admin user
INSERT INTO app_user (
    id, username, email, firstname, lastname, password, 
    office_id, is_enabled, account_non_expired, created_date
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'admin@fineract.org',
    'System',
    'Administrator',
    crypt('password', gen_salt('bf', 10)), -- Using bcrypt for password hashing
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP
);

-- Assign super user role to admin
INSERT INTO app_user_role (app_user_id, role_id)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- Create indexes for performance
CREATE INDEX idx_office_hierarchy ON office(hierarchy);
CREATE INDEX idx_staff_office_id ON staff(office_id);
CREATE INDEX idx_app_user_office_id ON app_user(office_id);
CREATE INDEX idx_app_user_username ON app_user(username);
CREATE INDEX idx_client_office_id ON client(office_id);
CREATE INDEX idx_client_staff_id ON client(staff_id);