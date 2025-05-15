-- Migration file for Interest Calculation Engine
-- Creates the schema for interest calculation history and daily accrual tracking

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create additional enum types for interest calculation
CREATE TYPE interest_calculation_strategy_type AS ENUM ('daily_balance', 'average_daily_balance', 'minimum_balance', 'tiered');

-- Interest Calculation History
-- This table stores historical interest calculation results
CREATE TABLE interest_calculation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'savings', 'fixed_deposit', 'recurring_deposit', etc.
    calculation_date DATE NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    interest_calculated DECIMAL(19, 6) NOT NULL,
    balance_used DECIMAL(19, 6) NOT NULL,
    annual_interest_rate DECIMAL(19, 6) NOT NULL,
    strategy interest_calculation_strategy_type NOT NULL,
    days_in_year INTEGER NOT NULL,
    is_posted BOOLEAN NOT NULL DEFAULT FALSE,
    posted_on_date DATE,
    posted_transaction_id UUID,
    calculation_data JSONB, -- Stores additional calculation details in a flexible manner
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Interest Daily Accrual
-- This table tracks daily interest accrual for accounts
CREATE TABLE interest_daily_accrual (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'savings', 'fixed_deposit', 'recurring_deposit', etc.
    accrual_date DATE NOT NULL,
    balance_amount DECIMAL(19, 6) NOT NULL,
    accrued_interest DECIMAL(19, 6) NOT NULL,
    annual_interest_rate DECIMAL(19, 6) NOT NULL,
    days_in_year INTEGER NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(account_id, account_type, accrual_date)
);

-- Balance History
-- This table tracks daily balances for interest calculation
CREATE TABLE balance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'savings', 'fixed_deposit', 'recurring_deposit', etc.
    balance_date DATE NOT NULL,
    opening_balance DECIMAL(19, 6) NOT NULL,
    closing_balance DECIMAL(19, 6) NOT NULL,
    minimum_balance DECIMAL(19, 6) NOT NULL,
    average_balance DECIMAL(19, 6) NOT NULL,
    number_of_transactions INTEGER NOT NULL DEFAULT 0,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(account_id, account_type, balance_date)
);

-- Create indexes for better query performance
CREATE INDEX idx_interest_calc_history_account ON interest_calculation_history(account_id, account_type);
CREATE INDEX idx_interest_calc_history_date ON interest_calculation_history(calculation_date);
CREATE INDEX idx_interest_calc_history_period ON interest_calculation_history(from_date, to_date);
CREATE INDEX idx_interest_calc_history_posted ON interest_calculation_history(is_posted);

CREATE INDEX idx_interest_daily_accrual_account ON interest_daily_accrual(account_id, account_type);
CREATE INDEX idx_interest_daily_accrual_date ON interest_daily_accrual(accrual_date);
CREATE INDEX idx_interest_daily_accrual_processed ON interest_daily_accrual(is_processed);

CREATE INDEX idx_balance_history_account ON balance_history(account_id, account_type);
CREATE INDEX idx_balance_history_date ON balance_history(balance_date);

-- Create audit triggers
CREATE TRIGGER interest_calc_history_audit BEFORE INSERT OR UPDATE ON interest_calculation_history FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER interest_daily_accrual_audit BEFORE INSERT OR UPDATE ON interest_daily_accrual FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER balance_history_audit BEFORE INSERT OR UPDATE ON balance_history FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Insert permissions for interest calculation module
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'VIEW_INTERESTCALCULATION', 'INTERESTCALCULATION', 'VIEW', false),
('portfolio', 'PROCESS_INTEREST_ACCRUAL', 'INTERESTCALCULATION', 'PROCESS', true),
('portfolio', 'POST_INTEREST', 'INTERESTCALCULATION', 'POST', true);