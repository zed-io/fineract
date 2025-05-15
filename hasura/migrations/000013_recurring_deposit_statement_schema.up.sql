-- Create table for recurring deposit statement history
CREATE TABLE IF NOT EXISTS recurring_deposit_statement_history (
    id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36) NOT NULL REFERENCES recurring_deposit_account(id),
    generated_date TIMESTAMP NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    format VARCHAR(10) NOT NULL,
    file_path VARCHAR(255),
    created_by VARCHAR(100),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on account id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_statement_history_account_id
ON recurring_deposit_statement_history(account_id);

-- Create index on generated date for faster queries
CREATE INDEX IF NOT EXISTS idx_rd_statement_history_generated_date
ON recurring_deposit_statement_history(generated_date);

-- Create table for scheduled statement generation
CREATE TABLE IF NOT EXISTS recurring_deposit_scheduled_statement (
    id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36) NOT NULL REFERENCES recurring_deposit_account(id),
    frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    day_of_month INTEGER NOT NULL, -- Day of month to generate (1-31)
    month_of_year INTEGER, -- Month for annual statements (1-12)
    format VARCHAR(10) NOT NULL, -- 'pdf', 'csv', 'json'
    email_recipients TEXT, -- Comma-separated list of email recipients
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100),
    last_modified_date TIMESTAMP
);

-- Create index on account id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_scheduled_statement_account_id
ON recurring_deposit_scheduled_statement(account_id);

-- Add a unique constraint to prevent duplicate schedules for an account and frequency
CREATE UNIQUE INDEX IF NOT EXISTS idx_rd_scheduled_statement_unique
ON recurring_deposit_scheduled_statement(account_id, frequency);

-- Create table for statement generation logs
CREATE TABLE IF NOT EXISTS recurring_deposit_statement_log (
    id VARCHAR(36) PRIMARY KEY,
    scheduled_statement_id VARCHAR(36) REFERENCES recurring_deposit_scheduled_statement(id),
    account_id VARCHAR(36) NOT NULL REFERENCES recurring_deposit_account(id),
    statement_id VARCHAR(36) REFERENCES recurring_deposit_statement_history(id),
    status VARCHAR(20) NOT NULL, -- 'success', 'failed'
    error_message TEXT,
    processed_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on account id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_statement_log_account_id
ON recurring_deposit_statement_log(account_id);

-- Create index on scheduled statement id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_statement_log_scheduled_id
ON recurring_deposit_statement_log(scheduled_statement_id);