-- Migration file for Fineract recurring deposit premature closure management
-- Creates the schema for tracking and managing premature closures of recurring deposit accounts

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create enum type for premature closure reason
CREATE TYPE recurring_deposit_premature_closure_reason AS ENUM (
    'withdrawal', 'transfer', 'refund', 'other'
);

-- Create table for recurring deposit account premature closure history
CREATE TABLE IF NOT EXISTS recurring_deposit_premature_closure_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES recurring_deposit_account(id),
    closure_date DATE NOT NULL,
    maturity_date DATE, -- Original expected maturity date
    closure_principal_amount DECIMAL(19, 6) NOT NULL, -- Principal amount at closure time
    interest_amount DECIMAL(19, 6) NOT NULL, -- Interest amount at closure time
    penalty_amount DECIMAL(19, 6) NOT NULL, -- Penalty amount (if any)
    total_amount DECIMAL(19, 6) NOT NULL, -- Total amount paid out (principal + interest - penalty)
    penalty_interest_rate DECIMAL(19, 6), -- Penalty interest rate applied (if any)
    closure_reason recurring_deposit_premature_closure_reason NOT NULL,
    closure_transaction_id UUID REFERENCES savings_account_transaction(id), -- Link to the closure transaction
    transfer_to_account_id UUID REFERENCES savings_account(id), -- If transferred to another account
    closure_note TEXT,
    days_completed INTEGER, -- Number of days the deposit was held
    percentage_period_complete DECIMAL(5, 2), -- Percentage of the full term completed
    created_by UUID,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by UUID,
    last_modified_date TIMESTAMP
);

-- Create index on account id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_premature_closure_history_account_id
ON recurring_deposit_premature_closure_history(account_id);

-- Create index on closure date for faster queries
CREATE INDEX IF NOT EXISTS idx_rd_premature_closure_history_closure_date
ON recurring_deposit_premature_closure_history(closure_date);

-- Function to calculate penalty amount for premature closure
CREATE OR REPLACE FUNCTION calculate_recurring_deposit_premature_closure_penalty(
    p_principal DECIMAL(19, 6),
    p_interest DECIMAL(19, 6),
    p_penalty_rate DECIMAL(19, 6),
    p_penalty_type VARCHAR -- 'principal' or 'interest' or 'total'
) RETURNS DECIMAL(19, 6) AS $$
DECLARE
    v_penalty_amount DECIMAL(19, 6);
BEGIN
    CASE UPPER(p_penalty_type)
        WHEN 'PRINCIPAL' THEN
            v_penalty_amount := p_principal * (p_penalty_rate / 100);
        WHEN 'INTEREST' THEN
            v_penalty_amount := p_interest * (p_penalty_rate / 100);
        WHEN 'TOTAL' THEN
            v_penalty_amount := (p_principal + p_interest) * (p_penalty_rate / 100);
        ELSE
            v_penalty_amount := p_interest * (p_penalty_rate / 100); -- Default to interest
    END CASE;
    
    RETURN v_penalty_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate percentage of period completed
CREATE OR REPLACE FUNCTION calculate_recurring_deposit_period_completion_percentage(
    p_start_date DATE,
    p_actual_end_date DATE,
    p_expected_end_date DATE
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_expected_days INTEGER;
    v_actual_days INTEGER;
    v_percentage DECIMAL(5, 2);
BEGIN
    v_expected_days := EXTRACT(EPOCH FROM (p_expected_end_date - p_start_date)) / 86400;
    v_actual_days := EXTRACT(EPOCH FROM (p_actual_end_date - p_start_date)) / 86400;
    
    IF v_expected_days <= 0 THEN
        RETURN 0;
    END IF;
    
    v_percentage := (v_actual_days::DECIMAL / v_expected_days::DECIMAL) * 100;
    
    RETURN LEAST(v_percentage, 100);
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers
CREATE TRIGGER recurring_deposit_premature_closure_history_audit
BEFORE INSERT OR UPDATE ON recurring_deposit_premature_closure_history
FOR EACH ROW EXECUTE FUNCTION audit_fields();