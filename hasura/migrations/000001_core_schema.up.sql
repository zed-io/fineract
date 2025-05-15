-- Core schema migration (after extensions)
-- This migration creates the core tables and types needed by all other schema objects

-- Set search path to both schemas
SET search_path TO fineract_default, public;

-- Common domain types
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'dormant', 'closed');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'unspecified');
CREATE TYPE client_type AS ENUM ('person', 'entity');
CREATE TYPE user_role AS ENUM ('admin', 'user', 'manager', 'client', 'guest');
CREATE TYPE transaction_type AS ENUM ('debit', 'credit');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE document_type AS ENUM ('id', 'passport', 'drivers_license', 'utility_bill', 'bank_statement', 'other');

-- Common function for calculating ages
CREATE OR REPLACE FUNCTION calculate_age(date_of_birth DATE) 
RETURNS INTEGER AS $$
BEGIN
    RETURN date_part('year', age(CURRENT_DATE, date_of_birth));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Core tables that other domains depend on

-- Office
CREATE TABLE office (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    opening_date DATE NOT NULL,
    parent_id UUID REFERENCES office(id),
    hierarchy VARCHAR(100),
    external_id VARCHAR(100) UNIQUE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT office_name_key UNIQUE (name)
);

-- Create a trigger to maintain the hierarchy
CREATE OR REPLACE FUNCTION set_office_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.hierarchy := '.' || NEW.id::text;
    ELSE
        SELECT hierarchy INTO NEW.hierarchy FROM office WHERE id = NEW.parent_id;
        NEW.hierarchy := NEW.hierarchy || '.' || NEW.id::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_office_hierarchy
BEFORE INSERT OR UPDATE ON office
FOR EACH ROW EXECUTE FUNCTION set_office_hierarchy();

-- Role
CREATE TABLE role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_disabled BOOLEAN DEFAULT FALSE,
    is_self_service BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT role_name_key UNIQUE (name)
);

-- Permission
CREATE TABLE permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grouping VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(100) NOT NULL,
    can_maker_checker BOOLEAN DEFAULT FALSE,
    CONSTRAINT permission_code_key UNIQUE (code)
);

-- Role Permission
CREATE TABLE role_permission (
    role_id UUID NOT NULL REFERENCES role(id),
    permission_id UUID NOT NULL REFERENCES permission(id),
    PRIMARY KEY (role_id, permission_id)
);

-- User
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    office_id UUID REFERENCES office(id),
    staff_id UUID,
    is_system_user BOOLEAN DEFAULT FALSE,
    last_login_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT user_username_key UNIQUE (username),
    CONSTRAINT user_email_key UNIQUE (email)
);

-- User Role
CREATE TABLE app_user_role (
    app_user_id UUID NOT NULL REFERENCES app_user(id),
    role_id UUID NOT NULL REFERENCES role(id),
    PRIMARY KEY (app_user_id, role_id)
);

-- Staff
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL REFERENCES office(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    is_loan_officer BOOLEAN DEFAULT FALSE,
    mobile_no VARCHAR(50),
    external_id VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    joining_date DATE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP
);

-- Add staff foreign key to app_user
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_staff FOREIGN KEY (staff_id) REFERENCES staff(id);

-- Code (for lookups)
CREATE TABLE code (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    is_system_defined BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT code_name_key UNIQUE (name)
);

-- Code Value
CREATE TABLE code_value (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID NOT NULL REFERENCES code(id),
    code_value VARCHAR(100) NOT NULL,
    code_description VARCHAR(500),
    order_position INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT code_value_code_id_value_key UNIQUE (code_id, code_value)
);

-- Currency
CREATE TABLE currency (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    decimal_places INT NOT NULL DEFAULT 2,
    display_symbol VARCHAR(10),
    name_code VARCHAR(50),
    internationalized_name_code VARCHAR(50)
);

-- Working Days
CREATE TABLE working_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurrence VARCHAR(100) DEFAULT 'FREQ=WEEKLY;INTERVAL=1',
    monday BOOLEAN DEFAULT TRUE,
    tuesday BOOLEAN DEFAULT TRUE,
    wednesday BOOLEAN DEFAULT TRUE,
    thursday BOOLEAN DEFAULT TRUE,
    friday BOOLEAN DEFAULT TRUE,
    saturday BOOLEAN DEFAULT FALSE,
    sunday BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP
);

-- Holiday
CREATE TABLE holiday (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP
);

-- Holiday Office
CREATE TABLE holiday_office (
    holiday_id UUID NOT NULL REFERENCES holiday(id),
    office_id UUID NOT NULL REFERENCES office(id),
    PRIMARY KEY (holiday_id, office_id)
);

-- System Configuration
CREATE TABLE configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    value TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT configuration_name_key UNIQUE (name)
);

-- Fund (used by products)
CREATE TABLE fund (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    external_id VARCHAR(100) UNIQUE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT fund_name_key UNIQUE (name)
);

-- Tenant configuration
CREATE TABLE tenant_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    value TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT tenant_configuration_tenant_name_key UNIQUE (tenant_id, name)
);

-- Seed essential data
INSERT INTO currency (code, name, decimal_places, display_symbol) VALUES
('USD', 'US Dollar', 2, '$'),
('EUR', 'Euro', 2, '€'),
('GBP', 'British Pound', 2, '£'),
('TTD', 'Trinidad and Tobago Dollar', 2, 'TT$');

-- Insert default office
INSERT INTO office (name, opening_date) VALUES ('Head Office', CURRENT_DATE);

-- Insert default working days
INSERT INTO working_days (
    recurrence, monday, tuesday, wednesday, thursday, friday, saturday, sunday
) VALUES (
    'FREQ=WEEKLY;INTERVAL=1', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE
);

-- Insert default roles
INSERT INTO role (name, description, is_disabled, is_self_service) VALUES 
('Super User', 'This role provides all system permissions', FALSE, FALSE),
('Admin', 'This role provides most system permissions', FALSE, FALSE),
('User', 'This role provides limited permissions for daily operations', FALSE, FALSE),
('Client', 'This role provides self-service access for clients', FALSE, TRUE);

-- Insert default configurations
INSERT INTO configuration (name, value, enabled, description) VALUES
('max-failed-logins', '3', TRUE, 'Maximum number of failed login attempts before account is locked'),
('password-expiry-days', '90', TRUE, 'Number of days before password expires'),
('default-currency', 'TTD', TRUE, 'Default currency for new accounts'),
('allow-transactions-on-holidays', 'false', TRUE, 'Whether to allow transactions on holidays'),
('allow-transactions-on-non-working-days', 'false', TRUE, 'Whether to allow transactions on non-working days');

-- Insert default codes
INSERT INTO code (name, is_system_defined) VALUES
('CustomerIdentifierType', TRUE),
('ClientClassification', TRUE),
('ClientType', TRUE),
('LoanPurpose', TRUE),
('Gender', TRUE),
('YesNo', TRUE);

-- Insert code values
INSERT INTO code_value (code_id, code_value, code_description, order_position) 
SELECT id, 'National ID', 'National Identity Card', 1 FROM code WHERE name = 'CustomerIdentifierType';

INSERT INTO code_value (code_id, code_value, code_description, order_position) 
SELECT id, 'Driver License', 'Driver''s License', 2 FROM code WHERE name = 'CustomerIdentifierType';

INSERT INTO code_value (code_id, code_value, code_description, order_position) 
SELECT id, 'Passport', 'Passport', 3 FROM code WHERE name = 'CustomerIdentifierType';

-- Add basic permissions
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker) VALUES
('user_management', 'CREATE_USER', 'user', 'CREATE', TRUE),
('user_management', 'READ_USER', 'user', 'READ', FALSE),
('user_management', 'UPDATE_USER', 'user', 'UPDATE', TRUE),
('user_management', 'DELETE_USER', 'user', 'DELETE', TRUE);

-- Link permissions to Super User role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p WHERE r.name = 'Super User';

-- Audit trail table
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    action_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES app_user(id),
    office_id UUID REFERENCES office(id),
    details JSONB,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_name, entity_id);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_date ON audit_trail(action_date);

-- Create a default super user
INSERT INTO app_user (
    username, email, password_hash, first_name, last_name, is_active, 
    is_system_user, office_id
)
VALUES (
    'admin', 'admin@example.com', 
    '$2a$10$VPU2W5e/TzugWbEwAB7Aoe0bECdpxGTQW0r7pqm1OQGOVPDq5xoEW', -- hashed 'password'
    'System', 'Administrator', TRUE,
    TRUE, (SELECT id FROM office WHERE name = 'Head Office')
);

-- Assign super user role
INSERT INTO app_user_role (app_user_id, role_id)
SELECT u.id, r.id FROM app_user u, role r 
WHERE u.username = 'admin' AND r.name = 'Super User';