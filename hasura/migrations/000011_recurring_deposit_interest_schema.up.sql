-- Create table for tracking interest posting history
CREATE TABLE IF NOT EXISTS recurring_deposit_interest_posting_history (
    id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36) NOT NULL REFERENCES recurring_deposit_account(id),
    transaction_id VARCHAR(36) NOT NULL,
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

-- Create index on account id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_interest_posting_account_id 
ON recurring_deposit_interest_posting_history(account_id);

-- Create index on posting date for faster queries
CREATE INDEX IF NOT EXISTS idx_rd_interest_posting_date 
ON recurring_deposit_interest_posting_history(posting_date);

-- Add columns to recurring_deposit_account if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_deposit_account' 
                   AND column_name = 'interest_earned') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN interest_earned DECIMAL(19, 6) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_deposit_account' 
                   AND column_name = 'interest_posted_amount') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN interest_posted_amount DECIMAL(19, 6) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_deposit_account' 
                   AND column_name = 'last_interest_posted_date') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN last_interest_posted_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_deposit_account' 
                   AND column_name = 'last_interest_calculation_date') THEN
        ALTER TABLE recurring_deposit_account 
        ADD COLUMN last_interest_calculation_date DATE;
    END IF;
END $$;