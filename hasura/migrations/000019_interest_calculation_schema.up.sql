-- Interest calculation/accrual schema for Fineract
-- This migration creates tables for tracking daily interest accruals
-- and interest posting history for various account types

-- Table for storing daily interest accruals
CREATE TABLE IF NOT EXISTS interest_accrual (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  accrual_date DATE NOT NULL,
  amount DECIMAL(19, 6) NOT NULL,
  balance DECIMAL(19, 6) NOT NULL,
  interest_rate DECIMAL(19, 6) NOT NULL,
  is_posted BOOLEAN NOT NULL DEFAULT FALSE,
  posted_date DATE,
  posted_transaction_id UUID,
  created_by VARCHAR(100),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_by VARCHAR(100),
  last_modified_date TIMESTAMP
);

-- Create index on account_id and account_type
CREATE INDEX IF NOT EXISTS idx_interest_accrual_account 
ON interest_accrual(account_id, account_type);

-- Create index on accrual_date
CREATE INDEX IF NOT EXISTS idx_interest_accrual_date 
ON interest_accrual(accrual_date);

-- Create index on is_posted
CREATE INDEX IF NOT EXISTS idx_interest_accrual_posted 
ON interest_accrual(is_posted);

-- Table for storing interest posting history
CREATE TABLE IF NOT EXISTS interest_posting_history (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  transaction_id UUID NOT NULL,
  posting_date DATE NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  interest_amount DECIMAL(19, 6) NOT NULL,
  balance_after_posting DECIMAL(19, 6) NOT NULL,
  created_by VARCHAR(100),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_by VARCHAR(100),
  last_modified_date TIMESTAMP
);

-- Create index on account_id and account_type
CREATE INDEX IF NOT EXISTS idx_interest_posting_account 
ON interest_posting_history(account_id, account_type);

-- Create index on posting_date
CREATE INDEX IF NOT EXISTS idx_interest_posting_date 
ON interest_posting_history(posting_date);

-- Table for interest calculation configuration per account
CREATE TABLE IF NOT EXISTS interest_calculation_config (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  calculation_method VARCHAR(50) NOT NULL,
  accrual_frequency VARCHAR(50) NOT NULL,
  posting_frequency VARCHAR(50) NOT NULL,
  days_in_year INT NOT NULL,
  min_balance_for_interest DECIMAL(19, 6) NOT NULL DEFAULT 0,
  is_accrual_accounting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(100),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_by VARCHAR(100),
  last_modified_date TIMESTAMP,
  CONSTRAINT uk_interest_config UNIQUE(account_id, account_type)
);

-- Create index on account_id and account_type
CREATE INDEX IF NOT EXISTS idx_interest_config_account 
ON interest_calculation_config(account_id, account_type);

-- Add unique constraint for posting history on transaction_id
ALTER TABLE interest_posting_history 
ADD CONSTRAINT uk_interest_posting_transaction UNIQUE(transaction_id);

-- Add check constraints to ensure valid values
ALTER TABLE interest_accrual
ADD CONSTRAINT chk_account_type CHECK (
  account_type IN ('savings', 'loan', 'recurring_deposit', 'fixed_deposit')
);

ALTER TABLE interest_posting_history
ADD CONSTRAINT chk_posting_account_type CHECK (
  account_type IN ('savings', 'loan', 'recurring_deposit', 'fixed_deposit')
);

-- Comment on tables and columns
COMMENT ON TABLE interest_accrual IS 'Stores daily interest accrual records for various account types';
COMMENT ON TABLE interest_posting_history IS 'Records interest posting transactions for various account types';
COMMENT ON TABLE interest_calculation_config IS 'Configuration for interest calculation per account';