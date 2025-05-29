-- Add maturity-related columns to recurring_deposit_account if they don't exist
DO $$
BEGIN
    -- Check for is_renewal_allowed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'is_renewal_allowed') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN is_renewal_allowed BOOLEAN DEFAULT false;
    END IF;

    -- Check for activation_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'activation_date') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN activation_date DATE;
    END IF;

    -- Check for maturity_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'maturity_date') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN maturity_date DATE;
    END IF;
    
    -- Check for maturity_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'maturity_amount') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN maturity_amount DECIMAL(19, 6);
    END IF;
    
    -- Check for expected_maturity_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'expected_maturity_date') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN expected_maturity_date DATE;
    END IF;
    
    -- Check for expected_maturity_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'expected_maturity_amount') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN expected_maturity_amount DECIMAL(19, 6);
    END IF;
    
    -- Check for on_account_closure_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'on_account_closure_type') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN on_account_closure_type VARCHAR(50) DEFAULT 'withdrawal';
    END IF;
    
    -- Check for transfer_to_savings_account_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'recurring_deposit_account' 
                  AND column_name = 'transfer_to_savings_account_id') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN transfer_to_savings_account_id VARCHAR(36) REFERENCES savings_account(id);
    END IF;
END $$;

-- Create table for recurring deposit account maturity history
CREATE TABLE IF NOT EXISTS recurring_deposit_maturity_history (
    id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36) NOT NULL REFERENCES recurring_deposit_account(id),
    maturity_type VARCHAR(20) NOT NULL, -- 'matured', 'renewed', 'prematurely_closed'
    processed_date DATE NOT NULL,
    maturity_amount DECIMAL(19, 6) NOT NULL,
    action_taken VARCHAR(50) NOT NULL, -- 'withdrawal', 'transfer_to_savings', 'renewed'
    transfer_transaction_id VARCHAR(36),
    transferred_to_account_id VARCHAR(36),
    renewed_maturity_date DATE,
    created_by VARCHAR(100),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on account id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_maturity_history_account_id 
ON recurring_deposit_maturity_history(account_id);

-- Create index on processed date for faster queries
CREATE INDEX IF NOT EXISTS idx_rd_maturity_history_processed_date
ON recurring_deposit_maturity_history(processed_date);

-- Function to calculate expected maturity date
CREATE OR REPLACE FUNCTION calculate_recurring_deposit_maturity_date(
    p_activation_date DATE,
    p_deposit_period INTEGER,
    p_deposit_period_frequency_type VARCHAR
) RETURNS DATE AS $$
DECLARE
    v_maturity_date DATE;
BEGIN
    CASE UPPER(p_deposit_period_frequency_type)
        WHEN 'DAYS' THEN
            v_maturity_date := p_activation_date + (p_deposit_period * INTERVAL '1 day');
        WHEN 'WEEKS' THEN
            v_maturity_date := p_activation_date + (p_deposit_period * INTERVAL '1 week');
        WHEN 'MONTHS' THEN
            v_maturity_date := p_activation_date + (p_deposit_period * INTERVAL '1 month');
        WHEN 'YEARS' THEN
            v_maturity_date := p_activation_date + (p_deposit_period * INTERVAL '1 year');
        ELSE
            v_maturity_date := p_activation_date + (p_deposit_period * INTERVAL '1 day');
    END CASE;
    
    RETURN v_maturity_date;
END;
$$ LANGUAGE plpgsql;

-- Update existing accounts with expected maturity dates if not set
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            rda.id, 
            sa.approved_on_date AS activation_date,
            rda.deposit_period,
            rda.deposit_period_frequency_type_enum AS deposit_period_frequency_type
        FROM recurring_deposit_account rda
        JOIN savings_account sa ON rda.savings_account_id = sa.id
        WHERE sa.status = 'active' 
        AND (rda.expected_maturity_date IS NULL OR rda.activation_date IS NULL)
    LOOP
        UPDATE recurring_deposit_account
        SET 
            activation_date = COALESCE(r.activation_date, CURRENT_DATE),
            expected_maturity_date = calculate_recurring_deposit_maturity_date(
                COALESCE(r.activation_date, CURRENT_DATE),
                r.deposit_period,
                r.deposit_period_frequency_type
            )
        WHERE id = r.id;
    END LOOP;
END $$;