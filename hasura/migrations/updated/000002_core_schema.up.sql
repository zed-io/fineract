-- Core schema creation for the default tenant
-- Previously used "default" schema, now uses the "default" schema

-- Set search path
SET search_path TO "default";

-- Create basic domain enums that are used across multiple tables
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'unspecified');
CREATE TYPE marital_status AS ENUM ('single', 'married', 'divorced', 'widowed', 'separated', 'other');
CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'pending', 'closed', 'rejected', 'withdrawn');
CREATE TYPE transaction_type AS ENUM (
  'disbursement', 'repayment', 'waiver', 'adjustment',
  'deposit', 'withdrawal', 'interest_posting', 'fee', 'charge',
  'dividend', 'share_purchase', 'share_redeem', 'transfer',
  'reversal', 'accrual', 'down_payment'
);

-- m_appuser table for authentication and authorization
CREATE TABLE m_appuser (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  firstname VARCHAR(100),
  lastname VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  mobile_no VARCHAR(50),
  status entity_status NOT NULL DEFAULT 'active',
  staff_id UUID,
  office_id UUID,
  is_passwordencoded BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  password_expire_date DATE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- m_role for role-based authorization
CREATE TABLE m_role (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  is_system_defined BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Map users to roles
CREATE TABLE m_appuser_role (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES m_appuser(id),
  role_id UUID NOT NULL REFERENCES m_role(id),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- Permissions for fine-grained access control
CREATE TABLE m_permission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  action_name VARCHAR(100) NOT NULL,
  entity_name VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  is_system_defined BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Map roles to permissions
CREATE TABLE m_role_permission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES m_role(id),
  permission_id UUID NOT NULL REFERENCES m_permission(id),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

-- Office table for organizational hierarchy
CREATE TABLE m_office (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES m_office(id),
  hierarchy VARCHAR(100),
  opening_date DATE NOT NULL,
  external_id VARCHAR(100),
  status entity_status NOT NULL DEFAULT 'active',
  address_line1 VARCHAR(100),
  address_line2 VARCHAR(100),
  address_line3 VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(50),
  phone_number VARCHAR(50),
  email VARCHAR(100),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Staff table for employees
CREATE TABLE m_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id UUID NOT NULL REFERENCES m_office(id),
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  mobile_no VARCHAR(50),
  email VARCHAR(100),
  external_id VARCHAR(100),
  is_loan_officer BOOLEAN DEFAULT FALSE,
  organizational_role VARCHAR(100),
  status entity_status NOT NULL DEFAULT 'active',
  joining_date DATE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Code table for lookup/reference data
CREATE TABLE m_code (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  is_system_defined BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Code value table for lookup/reference data values
CREATE TABLE m_code_value (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id UUID NOT NULL REFERENCES m_code(id),
  value VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  order_position INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID,
  UNIQUE(code_id, value)
);

-- Holiday table for business calendar
CREATE TABLE m_holiday (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Working days configuration
CREATE TABLE m_working_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monday BOOLEAN DEFAULT TRUE,
  tuesday BOOLEAN DEFAULT TRUE,
  wednesday BOOLEAN DEFAULT TRUE,
  thursday BOOLEAN DEFAULT TRUE,
  friday BOOLEAN DEFAULT TRUE,
  saturday BOOLEAN DEFAULT FALSE,
  sunday BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Currency table
CREATE TABLE m_currency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  display_symbol VARCHAR(10),
  is_base_currency BOOLEAN DEFAULT FALSE,
  exchange_rate DECIMAL(19,6) DEFAULT 1.0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified_date TIMESTAMP,
  created_by UUID,
  last_modified_by UUID
);

-- Add audit triggers for all core tables
CREATE TRIGGER m_appuser_update_timestamp
BEFORE UPDATE ON m_appuser
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_role_update_timestamp
BEFORE UPDATE ON m_role
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_permission_update_timestamp
BEFORE UPDATE ON m_permission
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_office_update_timestamp
BEFORE UPDATE ON m_office
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_staff_update_timestamp
BEFORE UPDATE ON m_staff
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_code_update_timestamp
BEFORE UPDATE ON m_code
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_code_value_update_timestamp
BEFORE UPDATE ON m_code_value
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_holiday_update_timestamp
BEFORE UPDATE ON m_holiday
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_working_days_update_timestamp
BEFORE UPDATE ON m_working_days
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER m_currency_update_timestamp
BEFORE UPDATE ON m_currency
FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

-- Add necessary indices for performance
CREATE INDEX idx_m_appuser_username ON m_appuser(username);
CREATE INDEX idx_m_appuser_office_id ON m_appuser(office_id);
CREATE INDEX idx_m_appuser_staff_id ON m_appuser(staff_id);
CREATE INDEX idx_m_staff_office_id ON m_staff(office_id);
CREATE INDEX idx_m_office_parent_id ON m_office(parent_id);
CREATE INDEX idx_m_office_hierarchy ON m_office(hierarchy);
CREATE INDEX idx_m_code_value_code_id ON m_code_value(code_id);

-- Insert default admin user and role
INSERT INTO m_role (id, name, description, is_system_defined)
VALUES (uuid_generate_v4(), 'Super Administrator', 'Super administrative role with all permissions', TRUE);

-- This would be replaced with proper password hashing in a production environment
INSERT INTO m_appuser (
  id, username, firstname, lastname, password, email, 
  status, is_passwordencoded, created_date
)
VALUES (
  uuid_generate_v4(), 'admin', 'System', 'Administrator', 
  -- This is a placeholder and should be properly hashed in production
  'password', 'admin@example.com', 
  'active', TRUE, CURRENT_TIMESTAMP
);

-- Base USD currency
INSERT INTO m_currency (code, name, decimal_places, display_symbol, is_base_currency)
VALUES ('USD', 'US Dollar', 2, '$', TRUE);

-- Default head office
INSERT INTO m_office (
  id, name, opening_date, status, created_date
)
VALUES (
  uuid_generate_v4(), 'Head Office', CURRENT_DATE, 'active', CURRENT_TIMESTAMP
);