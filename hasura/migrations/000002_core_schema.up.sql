-- Migration file for Fineract core domain entities
-- Creates the base schema for the core domain entities in a tenant schema

-- Create tenant schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS fineract_default;

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types for better type safety
CREATE TYPE gender_type AS ENUM ('male', 'female', 'non_binary', 'other');
CREATE TYPE marital_status_type AS ENUM ('single', 'married', 'divorced', 'widowed', 'other');
CREATE TYPE education_level_type AS ENUM ('none', 'primary', 'secondary', 'tertiary', 'post_graduate');
CREATE TYPE client_type AS ENUM ('person', 'entity', 'group');
CREATE TYPE address_type AS ENUM ('permanent', 'temporary', 'business', 'office');
CREATE TYPE document_type AS ENUM ('identity', 'address', 'income', 'business', 'image', 'other');
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'pending', 'approved', 'rejected', 'withdrawn', 'closed');

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

-- Create core tables

-- Users, Roles and Permissions
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
    office_id UUID,
    staff_id UUID,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

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

CREATE TABLE permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grouping VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(100) NOT NULL,
    can_maker_checker BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(500),
    is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(code)
);

CREATE TABLE role_permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(role_id, permission_id)
);

CREATE TABLE app_user_role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(user_id, role_id)
);

-- Organization
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

CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL REFERENCES office(id),
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    mobile_no VARCHAR(50),
    external_id VARCHAR(100) UNIQUE,
    is_loan_officer BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joining_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Code Values
CREATE TABLE code (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_system_defined BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

CREATE TABLE code_value (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID NOT NULL REFERENCES code(id) ON DELETE CASCADE,
    code_value VARCHAR(100) NOT NULL,
    code_description VARCHAR(500),
    order_position INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(code_id, code_value)
);

-- Working days and holidays
CREATE TABLE working_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurrence VARCHAR(100) NOT NULL DEFAULT 'REPEAT',
    repayment_rescheduling_enum INTEGER,
    extend_term_daily_repayments BOOLEAN NOT NULL DEFAULT FALSE,
    monday BOOLEAN NOT NULL DEFAULT TRUE,
    tuesday BOOLEAN NOT NULL DEFAULT TRUE,
    wednesday BOOLEAN NOT NULL DEFAULT TRUE,
    thursday BOOLEAN NOT NULL DEFAULT TRUE,
    friday BOOLEAN NOT NULL DEFAULT TRUE,
    saturday BOOLEAN NOT NULL DEFAULT FALSE,
    sunday BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

CREATE TABLE holiday (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    description VARCHAR(500),
    rescheduling_type INTEGER,
    status_type status_type NOT NULL DEFAULT 'pending',
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

CREATE TABLE holiday_office (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holiday_id UUID NOT NULL REFERENCES holiday(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES office(id) ON DELETE CASCADE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(holiday_id, office_id)
);

-- Calendars and Schedule
CREATE TABLE calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    location VARCHAR(500),
    start_date DATE NOT NULL,
    end_date DATE,
    duration INTEGER,
    calendar_type_enum INTEGER NOT NULL,
    repeating BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence VARCHAR(100),
    remind_by_enum INTEGER,
    first_reminder INTEGER,
    second_reminder INTEGER,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Currency
CREATE TABLE currency (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    decimal_places INTEGER NOT NULL DEFAULT 2,
    display_symbol VARCHAR(10),
    internationally_recognized BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Fund
CREATE TABLE fund (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    external_id VARCHAR(100) UNIQUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Configuration
CREATE TABLE configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    date_value DATE,
    string_value VARCHAR(255),
    bool_value BOOLEAN,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_trapped_door BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(500),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers for all tables
CREATE TRIGGER app_user_audit BEFORE INSERT OR UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER role_audit BEFORE INSERT OR UPDATE ON role FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER permission_audit BEFORE INSERT OR UPDATE ON permission FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER role_permission_audit BEFORE INSERT OR UPDATE ON role_permission FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER app_user_role_audit BEFORE INSERT OR UPDATE ON app_user_role FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER office_audit BEFORE INSERT OR UPDATE ON office FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER staff_audit BEFORE INSERT OR UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER code_audit BEFORE INSERT OR UPDATE ON code FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER code_value_audit BEFORE INSERT OR UPDATE ON code_value FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER working_days_audit BEFORE INSERT OR UPDATE ON working_days FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER holiday_audit BEFORE INSERT OR UPDATE ON holiday FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER holiday_office_audit BEFORE INSERT OR UPDATE ON holiday_office FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER calendar_audit BEFORE INSERT OR UPDATE ON calendar FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER currency_audit BEFORE INSERT OR UPDATE ON currency FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER fund_audit BEFORE INSERT OR UPDATE ON fund FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER configuration_audit BEFORE INSERT OR UPDATE ON configuration FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Add foreign key reference updates to app_user table
ALTER TABLE app_user 
ADD CONSTRAINT fk_app_user_office FOREIGN KEY (office_id) REFERENCES office(id),
ADD CONSTRAINT fk_app_user_staff FOREIGN KEY (staff_id) REFERENCES staff(id);

-- Insert default roles
INSERT INTO role (name, description, is_disabled, is_self_service_role)
VALUES 
('Super user', 'This role provides all application permissions.', false, false),
('Administrator', 'This role provides administration permissions.', false, false),
('User', 'This role provides basic user permissions.', false, false),
('Self Service User', 'Self service user role.', false, true);

-- Insert core system configurations
INSERT INTO configuration (name, value, enabled, description)
VALUES 
('maker-checker', 'false', true, 'If this is enabled, then maker-checker is turned on for the system.'),
('amazon-S3', 'false', true, 'If this is enabled, documents will be stored in Amazon S3.'),
('reschedule-future-repayments', 'false', true, 'If this is enabled, repayments dates will be rescheduled.'),
('allow-backdated-transaction', 'false', true, 'If this is enabled, backdated transactions are allowed.'),
('penalty-wait-period', '2', true, 'Number of days to wait before applying penalties.');

-- Create currencies
INSERT INTO currency (code, name, decimal_places, display_symbol, internationally_recognized)
VALUES 
('USD', 'US Dollar', 2, '$', true),
('EUR', 'Euro', 2, '€', true),
('GBP', 'British Pound', 2, '£', true),
('INR', 'Indian Rupee', 2, '₹', true),
('KES', 'Kenyan Shilling', 2, 'KSh', true);

-- Create default working days
INSERT INTO working_days (recurrence, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
VALUES ('REPEAT', true, true, true, true, true, false, false);

-- Create basic code/code_values for reference data
INSERT INTO code (name, is_system_defined)
VALUES 
('Gender', true),
('MaritalStatus', true),
('Education', true),
('ClientType', true),
('AddressType', true),
('IdentificationType', true);

-- Insert code values for Gender
INSERT INTO code_value (code_id, code_value, code_description, order_position, is_active)
SELECT id, 'Male', 'Male gender', 1, true FROM code WHERE name = 'Gender'
UNION ALL
SELECT id, 'Female', 'Female gender', 2, true FROM code WHERE name = 'Gender'
UNION ALL
SELECT id, 'Other', 'Other gender', 3, true FROM code WHERE name = 'Gender';

-- Insert code values for MaritalStatus
INSERT INTO code_value (code_id, code_value, code_description, order_position, is_active)
SELECT id, 'Single', 'Never married', 1, true FROM code WHERE name = 'MaritalStatus'
UNION ALL
SELECT id, 'Married', 'Currently married', 2, true FROM code WHERE name = 'MaritalStatus'
UNION ALL
SELECT id, 'Divorced', 'Legally divorced', 3, true FROM code WHERE name = 'MaritalStatus'
UNION ALL
SELECT id, 'Widowed', 'Spouse deceased', 4, true FROM code WHERE name = 'MaritalStatus'
UNION ALL
SELECT id, 'Other', 'Other marital status', 5, true FROM code WHERE name = 'MaritalStatus';

-- Create head office
INSERT INTO office (name, hierarchy, opening_date)
VALUES ('Head Office', '.', CURRENT_DATE);

-- Create permissions
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('special', 'ALL_FUNCTIONS', 'SPECIAL', 'ALL', false),
('configuration', 'READ_CONFIGURATION', 'CONFIGURATION', 'READ', false),
('configuration', 'UPDATE_CONFIGURATION', 'CONFIGURATION', 'UPDATE', true),
('user', 'CREATE_USER', 'USER', 'CREATE', true),
('user', 'READ_USER', 'USER', 'READ', false),
('user', 'UPDATE_USER', 'USER', 'UPDATE', true),
('user', 'DELETE_USER', 'USER', 'DELETE', true),
('role', 'CREATE_ROLE', 'ROLE', 'CREATE', true),
('role', 'READ_ROLE', 'ROLE', 'READ', false),
('role', 'UPDATE_ROLE', 'ROLE', 'UPDATE', true),
('role', 'DELETE_ROLE', 'ROLE', 'DELETE', true);

-- Assign all permissions to Super user role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p 
WHERE r.name = 'Super user';