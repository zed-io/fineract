-- Migration file for Fineract savings management
-- Creates the schema for savings products and savings accounts

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create additional enum types for savings
CREATE TYPE interest_compounding_period_type AS ENUM ('daily', 'monthly', 'quarterly', 'semi_annual', 'annual');
CREATE TYPE interest_posting_period_type AS ENUM ('monthly', 'quarterly', 'biannual', 'annual');
CREATE TYPE savings_interest_calculation_type AS ENUM ('daily_balance', 'average_daily_balance');
CREATE TYPE savings_transaction_type AS ENUM (
    'deposit', 'withdrawal', 'interest_posting', 'fee_charge', 'penalty_charge', 
    'withdrawal_fee', 'annual_fee', 'waive_charges', 'pay_charge', 'dividend_payout'
);
CREATE TYPE savings_account_status_type AS ENUM (
    'submitted_and_pending_approval', 'approved', 'active', 'closed', 'rejected', 
    'withdrawn_by_client', 'dormant', 'escheat'
);
CREATE TYPE savings_account_sub_status_type AS ENUM (
    'none', 'inactive', 'dormant', 'escheat', 'block', 'block_credit', 'block_debit'
);

-- Savings Products
CREATE TABLE savings_product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(4) NOT NULL,
    description VARCHAR(500),
    currency_code VARCHAR(3) NOT NULL REFERENCES currency(code),
    currency_digits INTEGER NOT NULL DEFAULT 2,
    nominal_annual_interest_rate DECIMAL(19, 6) NOT NULL,
    interest_compounding_period_type interest_compounding_period_type NOT NULL,
    interest_posting_period_type interest_posting_period_type NOT NULL,
    interest_calculation_type savings_interest_calculation_type NOT NULL,
    interest_calculation_days_in_year_type INTEGER NOT NULL DEFAULT 365,
    min_required_opening_balance DECIMAL(19, 6),
    deposit_fee_for_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    allow_overdraft BOOLEAN NOT NULL DEFAULT FALSE,
    overdraft_limit DECIMAL(19, 6),
    nominal_annual_interest_rate_overdraft DECIMAL(19, 6),
    min_overdraft_for_interest_calculation DECIMAL(19, 6),
    enforce_min_required_balance BOOLEAN NOT NULL DEFAULT FALSE,
    min_required_balance DECIMAL(19, 6),
    min_balance_for_interest_calculation DECIMAL(19, 6),
    withdrawal_fee_type_enum INTEGER,
    withdrawal_fee_amount DECIMAL(19, 6),
    withdrawal_fee_for_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    annual_fee_amount DECIMAL(19, 6),
    annual_fee_on_month INTEGER,
    annual_fee_on_day INTEGER,
    accounting_type VARCHAR(50) NOT NULL DEFAULT 'none',
    lockin_period_frequency INTEGER,
    lockin_period_frequency_type VARCHAR(20),
    is_dormancy_tracking_active BOOLEAN NOT NULL DEFAULT FALSE,
    days_to_inactive INTEGER,
    days_to_dormancy INTEGER,
    days_to_escheat INTEGER,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Savings Product Charges
CREATE TABLE savings_product_charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_product_id UUID NOT NULL REFERENCES savings_product(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charge(id),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(savings_product_id, charge_id)
);

-- Savings Accounts
CREATE TABLE savings_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_no VARCHAR(100) NOT NULL UNIQUE,
    external_id VARCHAR(100) UNIQUE,
    client_id UUID REFERENCES client(id),
    group_id UUID REFERENCES client_group(id),
    product_id UUID NOT NULL REFERENCES savings_product(id),
    field_officer_id UUID REFERENCES staff(id),
    status savings_account_status_type NOT NULL DEFAULT 'submitted_and_pending_approval',
    sub_status savings_account_sub_status_type DEFAULT 'none',
    account_type VARCHAR(50) NOT NULL DEFAULT 'individual', -- 'individual', 'group', 'jlg'
    currency_code VARCHAR(3) NOT NULL,
    currency_digits INTEGER NOT NULL DEFAULT 2,
    nominal_annual_interest_rate DECIMAL(19, 6) NOT NULL,
    interest_compounding_period_type interest_compounding_period_type NOT NULL,
    interest_posting_period_type interest_posting_period_type NOT NULL,
    interest_calculation_type savings_interest_calculation_type NOT NULL,
    interest_calculation_days_in_year_type INTEGER NOT NULL DEFAULT 365,
    min_required_opening_balance DECIMAL(19, 6),
    deposit_fee_for_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    allow_overdraft BOOLEAN NOT NULL DEFAULT FALSE,
    overdraft_limit DECIMAL(19, 6),
    nominal_annual_interest_rate_overdraft DECIMAL(19, 6),
    min_overdraft_for_interest_calculation DECIMAL(19, 6),
    enforce_min_required_balance BOOLEAN NOT NULL DEFAULT FALSE,
    min_required_balance DECIMAL(19, 6),
    min_balance_for_interest_calculation DECIMAL(19, 6),
    withdrawal_fee_type_enum INTEGER,
    withdrawal_fee_amount DECIMAL(19, 6),
    withdrawal_fee_for_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    annual_fee_amount DECIMAL(19, 6),
    annual_fee_on_month INTEGER,
    annual_fee_on_day INTEGER,
    lockin_period_frequency INTEGER,
    lockin_period_frequency_type VARCHAR(20),
    is_dormancy_tracking_active BOOLEAN NOT NULL DEFAULT FALSE,
    days_to_inactive INTEGER,
    days_to_dormancy INTEGER,
    days_to_escheat INTEGER,
    
    -- Account balances
    account_balance_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_deposits_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_withdrawals_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_interest_earned_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_interest_posted_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_fee_charge_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_penalty_charge_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_withdrawals_fees_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_annual_fees_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_overdraft_interest_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    
    -- Important dates
    submitted_on_date DATE NOT NULL,
    submitted_by_user_id UUID REFERENCES app_user(id),
    approved_on_date DATE,
    approved_by_user_id UUID REFERENCES app_user(id),
    activated_on_date DATE,
    activated_by_user_id UUID REFERENCES app_user(id),
    closed_on_date DATE,
    closed_by_user_id UUID REFERENCES app_user(id),
    last_interest_calculation_date DATE,
    dormant_on_date DATE,
    escheat_on_date DATE,
    last_active_transaction_date DATE,
    
    -- Audit fields
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    
    CONSTRAINT savings_account_client_or_group_check CHECK (
        (client_id IS NOT NULL AND group_id IS NULL) OR
        (group_id IS NOT NULL AND client_id IS NULL)
    )
);

-- Savings Account Charges
CREATE TABLE savings_account_charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charge(id),
    amount DECIMAL(19, 6) NOT NULL,
    amount_paid_derived DECIMAL(19, 6),
    amount_waived_derived DECIMAL(19, 6),
    amount_outstanding_derived DECIMAL(19, 6),
    calculation_percentage DECIMAL(19, 6),
    calculation_on_amount DECIMAL(19, 6),
    charge_time_enum INTEGER,
    due_date DATE,
    fee_on_month INTEGER,
    fee_on_day INTEGER,
    fee_interval INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_penalty BOOLEAN NOT NULL DEFAULT FALSE,
    charge_calculation_enum INTEGER,
    is_paid_derived BOOLEAN NOT NULL DEFAULT FALSE,
    waived BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Savings Account Transactions
CREATE TABLE savings_account_transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    payment_detail_id UUID,
    transaction_type savings_transaction_type NOT NULL,
    transaction_date DATE NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    running_balance_derived DECIMAL(19, 6),
    balance_end_date_derived DATE,
    balance_number_of_days_derived INTEGER,
    overdraft_amount_derived DECIMAL(19, 6),
    created_date TIMESTAMP,
    submitted_on_date DATE NOT NULL,
    submitted_by_user_id UUID REFERENCES app_user(id),
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    reversed_on_date DATE,
    reversed_by_user_id UUID REFERENCES app_user(id),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Savings Officer Assignments
CREATE TABLE savings_officer_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    savings_officer_id UUID REFERENCES staff(id),
    start_date DATE NOT NULL,
    end_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER savings_product_audit BEFORE INSERT OR UPDATE ON savings_product FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER savings_product_charge_audit BEFORE INSERT OR UPDATE ON savings_product_charge FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER savings_account_audit BEFORE INSERT OR UPDATE ON savings_account FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER savings_account_charge_audit BEFORE INSERT OR UPDATE ON savings_account_charge FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER savings_account_transaction_audit BEFORE INSERT OR UPDATE ON savings_account_transaction FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER savings_officer_assignment_audit BEFORE INSERT OR UPDATE ON savings_officer_assignment FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_savings_account_client_id ON savings_account(client_id);
CREATE INDEX idx_savings_account_group_id ON savings_account(group_id);
CREATE INDEX idx_savings_account_product_id ON savings_account(product_id);
CREATE INDEX idx_savings_account_status ON savings_account(status);
CREATE INDEX idx_savings_account_field_officer_id ON savings_account(field_officer_id);
CREATE INDEX idx_savings_account_external_id ON savings_account(external_id);
CREATE INDEX idx_savings_account_submitted_on_date ON savings_account(submitted_on_date);
CREATE INDEX idx_savings_account_transaction_savings_account_id ON savings_account_transaction(savings_account_id);
CREATE INDEX idx_savings_account_transaction_type ON savings_account_transaction(transaction_type);
CREATE INDEX idx_savings_account_transaction_date ON savings_account_transaction(transaction_date);

-- Function to generate savings account number
CREATE OR REPLACE FUNCTION generate_savings_account_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a unique account number based on savings ID with a 'SA' prefix and timestamp
    NEW.account_no := 'SA' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || substring(md5(random()::text), 1, 4);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply account generation trigger to savings_account table
CREATE TRIGGER savings_account_number_trigger
BEFORE INSERT ON savings_account
FOR EACH ROW
WHEN (NEW.account_no IS NULL)
EXECUTE FUNCTION generate_savings_account_number();

-- Insert permissions for savings module
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'CREATE', true),
('portfolio', 'UPDATE_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'UPDATE', true),
('portfolio', 'DELETE_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'DELETE', true),
('portfolio', 'APPROVE_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'APPROVE', true),
('portfolio', 'REJECT_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'REJECT', true),
('portfolio', 'WITHDRAW_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'WITHDRAW', true),
('portfolio', 'ACTIVATE_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'ACTIVATE', true),
('portfolio', 'CLOSE_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'CLOSE', true),
('portfolio', 'CREATE_SAVINGSACCOUNTCHARGE', 'SAVINGSACCOUNTCHARGE', 'CREATE', true),
('portfolio', 'UPDATE_SAVINGSACCOUNTCHARGE', 'SAVINGSACCOUNTCHARGE', 'UPDATE', true),
('portfolio', 'DELETE_SAVINGSACCOUNTCHARGE', 'SAVINGSACCOUNTCHARGE', 'DELETE', true),
('portfolio', 'WAIVE_SAVINGSACCOUNTCHARGE', 'SAVINGSACCOUNTCHARGE', 'WAIVE', true),
('portfolio', 'PAY_SAVINGSACCOUNTCHARGE', 'SAVINGSACCOUNTCHARGE', 'PAY', true),
('transaction_savings', 'DEPOSIT_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'DEPOSIT', true),
('transaction_savings', 'WITHDRAWAL_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'WITHDRAWAL', true),
('transaction_savings', 'POSTINTEREST_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'POSTINTEREST', true),
('transaction_savings', 'APPLYHOLDAMOUNT_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'APPLYHOLDAMOUNT', true),
('transaction_savings', 'REMOVEHOLDAMOUNT_SAVINGSACCOUNT', 'SAVINGSACCOUNT', 'REMOVEHOLDAMOUNT', true);

-- Create savings charge for savings products
UPDATE charge SET is_savings_charge = true WHERE name = 'Processing Fee';

-- Insert a default savings product
INSERT INTO savings_product (
    name, short_name, description, currency_code, currency_digits,
    nominal_annual_interest_rate, interest_compounding_period_type,
    interest_posting_period_type, interest_calculation_type,
    interest_calculation_days_in_year_type, min_required_opening_balance,
    accounting_type, active
)
VALUES (
    'Standard Savings', 'STD', 'Basic savings account with standard interest rate',
    'USD', 2, 4.0, 'daily', 'monthly', 'daily_balance', 365, 0.00, 'none', true
);