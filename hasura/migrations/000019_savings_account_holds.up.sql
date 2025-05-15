-- Migration file for Fineract savings account holds/blocks functionality
-- Creates the schema for managing account holds, blocks, and restrictions

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create enum type for hold type
CREATE TYPE savings_hold_type AS ENUM (
    'legal', 'administrative', 'customer_requested', 'fraud_prevention', 
    'debt_recovery', 'tax_lien', 'loan_collateral', 'regulatory', 'system'
);

-- Create enum type for hold status
CREATE TYPE savings_hold_status AS ENUM (
    'active', 'expired', 'released', 'cancelled'
);

-- Create enum type for release mode (automatic/manual)
CREATE TYPE savings_hold_release_mode AS ENUM (
    'automatic', 'manual'
);

-- Create table for savings account holds
CREATE TABLE savings_account_hold (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    amount DECIMAL(19, 6) NOT NULL,
    hold_type savings_hold_type NOT NULL,
    hold_reason_code VARCHAR(50) NOT NULL,
    hold_reason_description TEXT,
    hold_start_date TIMESTAMP NOT NULL,
    hold_end_date TIMESTAMP,
    release_mode savings_hold_release_mode NOT NULL DEFAULT 'manual',
    status savings_hold_status NOT NULL DEFAULT 'active',
    external_reference_id VARCHAR(100),
    enforcing_entity VARCHAR(100),
    enforcing_person VARCHAR(100),
    release_notes TEXT,
    released_by_user_id UUID REFERENCES app_user(id),
    released_on_date TIMESTAMP,
    transaction_reference VARCHAR(100),
    is_full_account_block BOOLEAN NOT NULL DEFAULT FALSE,
    is_credit_block BOOLEAN NOT NULL DEFAULT FALSE,
    is_debit_block BOOLEAN NOT NULL DEFAULT FALSE,
    -- Audit fields
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create indexes for better query performance
CREATE INDEX idx_savings_account_hold_account_id ON savings_account_hold(savings_account_id);
CREATE INDEX idx_savings_account_hold_status ON savings_account_hold(status);
CREATE INDEX idx_savings_account_hold_type ON savings_account_hold(hold_type);
CREATE INDEX idx_savings_account_hold_start_date ON savings_account_hold(hold_start_date);
CREATE INDEX idx_savings_account_hold_end_date ON savings_account_hold(hold_end_date);

-- Create audit trigger for savings_account_hold table
CREATE TRIGGER savings_account_hold_audit 
BEFORE INSERT OR UPDATE ON savings_account_hold 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Add a new field to savings_account to track blocked/available balance 
ALTER TABLE savings_account 
ADD COLUMN on_hold_amount_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
ADD COLUMN available_balance_derived DECIMAL(19, 6) GENERATED ALWAYS AS (account_balance_derived - on_hold_amount_derived) STORED;

-- Automatically update sub_status when blocks are added or removed
CREATE OR REPLACE FUNCTION update_savings_account_sub_status()
RETURNS TRIGGER AS $$
DECLARE
    has_full_block BOOLEAN;
    has_credit_block BOOLEAN;
    has_debit_block BOOLEAN;
    current_account_status VARCHAR;
BEGIN
    -- Get current account status
    SELECT status::TEXT INTO current_account_status FROM savings_account WHERE id = NEW.savings_account_id;
    
    -- If account is not active, don't change sub_status
    IF current_account_status != 'active' THEN
        RETURN NEW;
    END IF;

    -- Check if account has any active blocks
    SELECT 
        BOOL_OR(is_full_account_block AND status = 'active'),
        BOOL_OR(is_credit_block AND status = 'active'),
        BOOL_OR(is_debit_block AND status = 'active')
    INTO 
        has_full_block, has_credit_block, has_debit_block
    FROM 
        savings_account_hold
    WHERE 
        savings_account_id = NEW.savings_account_id
        AND status = 'active'
        AND (hold_end_date IS NULL OR hold_end_date > NOW());

    -- Update sub_status based on block types
    IF has_full_block THEN
        UPDATE savings_account SET sub_status = 'block' WHERE id = NEW.savings_account_id;
    ELSIF has_credit_block AND has_debit_block THEN
        UPDATE savings_account SET sub_status = 'block' WHERE id = NEW.savings_account_id;
    ELSIF has_credit_block THEN
        UPDATE savings_account SET sub_status = 'block_credit' WHERE id = NEW.savings_account_id;
    ELSIF has_debit_block THEN
        UPDATE savings_account SET sub_status = 'block_debit' WHERE id = NEW.savings_account_id;
    ELSE
        -- If no blocks, reset to none only if the current sub_status is a block type
        UPDATE savings_account 
        SET sub_status = 'none' 
        WHERE id = NEW.savings_account_id 
          AND sub_status IN ('block', 'block_credit', 'block_debit');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update account sub_status based on holds/blocks
CREATE TRIGGER update_savings_account_sub_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON savings_account_hold
FOR EACH ROW EXECUTE FUNCTION update_savings_account_sub_status();

-- Function to recalculate on_hold_amount for an account
CREATE OR REPLACE FUNCTION recalculate_savings_account_hold_amount(account_id UUID)
RETURNS VOID AS $$
DECLARE
    total_hold_amount DECIMAL(19, 6);
BEGIN
    -- Sum all active holds
    SELECT COALESCE(SUM(amount), 0)
    INTO total_hold_amount
    FROM savings_account_hold
    WHERE savings_account_id = account_id
      AND status = 'active'
      AND (hold_end_date IS NULL OR hold_end_date > NOW());
    
    -- Update the account with total hold amount
    UPDATE savings_account
    SET on_hold_amount_derived = total_hold_amount
    WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate on_hold_amount when holds change
CREATE TRIGGER recalculate_hold_amount_trigger
AFTER INSERT OR UPDATE OR DELETE ON savings_account_hold
FOR EACH STATEMENT EXECUTE FUNCTION recalculate_savings_account_hold_amount(NEW.savings_account_id);

-- Insert permissions for savings account hold operations
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('transaction_savings', 'CREATE_SAVINGSACCOUNTHOLD', 'SAVINGSACCOUNTHOLD', 'CREATE', true),
('transaction_savings', 'UPDATE_SAVINGSACCOUNTHOLD', 'SAVINGSACCOUNTHOLD', 'UPDATE', true),
('transaction_savings', 'DELETE_SAVINGSACCOUNTHOLD', 'SAVINGSACCOUNTHOLD', 'DELETE', true),
('transaction_savings', 'RELEASE_SAVINGSACCOUNTHOLD', 'SAVINGSACCOUNTHOLD', 'RELEASE', true);

-- Add a batch job to automatically expire holds
INSERT INTO job_definition (name, display_name, cron_expression, job_type, next_run_time, description, is_active)
VALUES (
    'expire_savings_account_holds', 
    'Expire Savings Account Holds', 
    '0 0 * * *', 
    'DATABASE_PROCEDURE', 
    NOW() + INTERVAL '1 day', 
    'Job to automatically expire savings account holds that have reached their end date',
    true
);

-- Create procedure for the batch job
CREATE OR REPLACE PROCEDURE expire_savings_account_holds()
LANGUAGE plpgsql
AS $$
DECLARE
    expired_holds_count INTEGER;
BEGIN
    -- Update status for holds with end_date in the past
    UPDATE savings_account_hold
    SET status = 'expired',
        last_modified_date = NOW()
    WHERE status = 'active'
      AND hold_end_date IS NOT NULL
      AND hold_end_date < NOW();
    
    GET DIAGNOSTICS expired_holds_count = ROW_COUNT;
    
    -- Log the result
    INSERT INTO job_run_history (job_name, start_time, end_time, status, error_message, error_log)
    VALUES (
        'expire_savings_account_holds',
        NOW() - INTERVAL '1 minute',
        NOW(),
        'COMPLETED',
        NULL,
        'Expired ' || expired_holds_count || ' savings account holds'
    );
END;
$$;