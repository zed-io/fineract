-- Migration file for Fineract share account management
-- Creates the schema for share products and accounts

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create additional enum types for share accounts
CREATE TYPE share_account_status_type AS ENUM (
    'submitted_and_pending_approval',
    'approved',
    'active',
    'rejected',
    'closed'
);

CREATE TYPE share_value_calculation_type AS ENUM (
    'nominal',
    'market'
);

CREATE TYPE share_capital_type AS ENUM (
    'paid_up',
    'authorized'
);

CREATE TYPE share_transaction_type AS ENUM (
    'purchase',
    'redeem',
    'approve',
    'reject',
    'charge_payment',
    'dividend_payment',
    'interest_payment'
);

-- Share Products
CREATE TABLE share_product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    currency_code VARCHAR(3) NOT NULL,
    currency_digits INTEGER NOT NULL DEFAULT 2,
    currency_multiplesof INTEGER,
    external_id VARCHAR(100),
    
    total_shares BIGINT NOT NULL,
    issued_shares BIGINT NOT NULL DEFAULT 0,
    total_shares_to_be_issued BIGINT NOT NULL,
    nominal_price DECIMAL(19, 6) NOT NULL,
    market_price DECIMAL(19, 6),
    
    share_capital_type share_capital_type NOT NULL DEFAULT 'paid_up',
    share_value_calculation_type share_value_calculation_type NOT NULL DEFAULT 'nominal',
    
    allow_dividends_for_inactive_clients BOOLEAN NOT NULL DEFAULT FALSE,
    lockin_period INTEGER,
    lockin_period_type_enum deposit_term_frequency_type,
    
    minimum_shares BIGINT,
    nominal_shares_default BIGINT,
    maximum_shares BIGINT,
    
    accounting_rule VARCHAR(100) NOT NULL,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Product Charge Mapping
CREATE TABLE share_product_charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES share_product(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charge(id),
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    
    UNIQUE(product_id, charge_id)
);

-- Share Product Market Price
CREATE TABLE share_product_market_price (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES share_product(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    price DECIMAL(19, 6) NOT NULL,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Product Dividend
CREATE TABLE share_product_dividend (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES share_product(id) ON DELETE CASCADE,
    dividend_period_start_date DATE NOT NULL,
    dividend_period_end_date DATE NOT NULL,
    dividend_amount DECIMAL(19, 6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Accounts
CREATE TABLE share_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_no VARCHAR(50) NOT NULL UNIQUE,
    external_id VARCHAR(100),
    client_id UUID REFERENCES client(id),
    group_id UUID REFERENCES groups(id),
    product_id UUID NOT NULL REFERENCES share_product(id),
    field_officer_id UUID REFERENCES staff(id),
    office_id UUID NOT NULL REFERENCES office(id),
    
    status share_account_status_type NOT NULL DEFAULT 'submitted_and_pending_approval',
    
    submitted_date DATE NOT NULL,
    submitted_by UUID,
    approved_date DATE,
    approved_by UUID,
    rejected_date DATE,
    rejected_by UUID,
    activated_date DATE,
    activated_by UUID,
    closed_date DATE,
    closed_by UUID,
    
    total_approved_shares BIGINT NOT NULL DEFAULT 0,
    total_pending_shares BIGINT NOT NULL DEFAULT 0,
    
    lockin_period INTEGER,
    lockin_period_type_enum deposit_term_frequency_type,
    
    is_dividend_posted BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Account Charge
CREATE TABLE share_account_charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES share_account(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charge(id),
    
    amount DECIMAL(19, 6) NOT NULL,
    amount_paid DECIMAL(19, 6) DEFAULT 0,
    amount_waived DECIMAL(19, 6) DEFAULT 0,
    amount_outstanding DECIMAL(19, 6) NOT NULL,
    
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_waived BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_penalty BOOLEAN NOT NULL DEFAULT FALSE,
    
    due_date DATE,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Purchase Requests
CREATE TABLE share_purchase_request (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES share_account(id) ON DELETE CASCADE,
    request_date DATE NOT NULL,
    requested_shares BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    
    requested_date DATE NOT NULL,
    requested_by UUID,
    processed_date DATE,
    processed_by UUID,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Account Transactions
CREATE TABLE share_account_transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES share_account(id),
    purchase_request_id UUID REFERENCES share_purchase_request(id),
    
    transaction_date DATE NOT NULL,
    transaction_type share_transaction_type NOT NULL,
    shares_quantity BIGINT NOT NULL,
    unit_price DECIMAL(19, 6) NOT NULL,
    total_amount DECIMAL(19, 6) NOT NULL,
    
    charged_amount DECIMAL(19, 6) DEFAULT 0,
    
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Account Dividend
CREATE TABLE share_account_dividend (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES share_account(id) ON DELETE CASCADE,
    dividend_pay_out_id UUID NOT NULL REFERENCES share_product_dividend(id),
    
    amount DECIMAL(19, 6) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'rejected'
    
    processed_date DATE,
    
    savings_transaction_id UUID REFERENCES savings_account_transaction(id),
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER share_product_audit 
BEFORE INSERT OR UPDATE ON share_product 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_product_charge_audit 
BEFORE INSERT OR UPDATE ON share_product_charge 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_product_market_price_audit 
BEFORE INSERT OR UPDATE ON share_product_market_price 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_product_dividend_audit 
BEFORE INSERT OR UPDATE ON share_product_dividend 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_account_audit 
BEFORE INSERT OR UPDATE ON share_account 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_account_charge_audit 
BEFORE INSERT OR UPDATE ON share_account_charge 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_purchase_request_audit 
BEFORE INSERT OR UPDATE ON share_purchase_request 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_account_transaction_audit 
BEFORE INSERT OR UPDATE ON share_account_transaction 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_account_dividend_audit 
BEFORE INSERT OR UPDATE ON share_account_dividend 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_share_product_name ON share_product(name);
CREATE INDEX idx_share_product_short_name ON share_product(short_name);
CREATE INDEX idx_share_product_charge_product_id ON share_product_charge(product_id);
CREATE INDEX idx_share_product_charge_charge_id ON share_product_charge(charge_id);
CREATE INDEX idx_share_product_market_price_product_id ON share_product_market_price(product_id);
CREATE INDEX idx_share_product_market_price_from_date ON share_product_market_price(from_date);
CREATE INDEX idx_share_product_dividend_product_id ON share_product_dividend(product_id);
CREATE INDEX idx_share_product_dividend_period_dates ON share_product_dividend(dividend_period_start_date, dividend_period_end_date);

CREATE INDEX idx_share_account_no ON share_account(account_no);
CREATE INDEX idx_share_account_client_id ON share_account(client_id);
CREATE INDEX idx_share_account_group_id ON share_account(group_id);
CREATE INDEX idx_share_account_product_id ON share_account(product_id);
CREATE INDEX idx_share_account_office_id ON share_account(office_id);
CREATE INDEX idx_share_account_status ON share_account(status);

CREATE INDEX idx_share_account_charge_account_id ON share_account_charge(account_id);
CREATE INDEX idx_share_account_charge_charge_id ON share_account_charge(charge_id);

CREATE INDEX idx_share_purchase_request_account_id ON share_purchase_request(account_id);
CREATE INDEX idx_share_purchase_request_status ON share_purchase_request(status);

CREATE INDEX idx_share_account_transaction_account_id ON share_account_transaction(account_id);
CREATE INDEX idx_share_account_transaction_purchase_request_id ON share_account_transaction(purchase_request_id);
CREATE INDEX idx_share_account_transaction_type ON share_account_transaction(transaction_type);
CREATE INDEX idx_share_account_transaction_date ON share_account_transaction(transaction_date);

CREATE INDEX idx_share_account_dividend_account_id ON share_account_dividend(account_id);
CREATE INDEX idx_share_account_dividend_payout_id ON share_account_dividend(dividend_pay_out_id);
CREATE INDEX idx_share_account_dividend_savings_transaction_id ON share_account_dividend(savings_transaction_id);