-- Interest Batch Processing Module for Automated Interest Calculation and Posting
-- This migration adds tables for tracking interest batch jobs and their execution results

-- Batch job configuration - holds settings for interest calculation and posting jobs
CREATE TABLE interest_batch_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL, -- 'daily_interest_accrual', 'interest_posting'
    batch_size INTEGER NOT NULL DEFAULT 1000,
    max_retries INTEGER NOT NULL DEFAULT 3,
    retry_interval_minutes INTEGER NOT NULL DEFAULT 15,
    timeout_seconds INTEGER NOT NULL DEFAULT 3600,
    parallel_threads INTEGER NOT NULL DEFAULT 4,
    enabled BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    description TEXT,
    account_types TEXT[] DEFAULT ARRAY['SAVINGS', 'FIXED_DEPOSIT', 'RECURRING_DEPOSIT'],
    parameters JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE (job_type, tenant_id)
);

-- Table for interest calculation processing status per account
CREATE TABLE interest_batch_account_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_number VARCHAR(100),
    last_accrual_date TIMESTAMP,
    last_posting_date TIMESTAMP,
    next_posting_date TIMESTAMP,
    current_batch_id UUID,
    accrual_frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY', -- DAILY, MONTHLY, etc.
    posting_frequency VARCHAR(20), -- MONTHLY, QUARTERLY, ANNUAL, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, DORMANT, CLOSED
    error_count INTEGER NOT NULL DEFAULT 0,
    last_error_message TEXT,
    last_successful_run TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID,
    UNIQUE (account_id, tenant_id)
);

-- Table for recording batch interest processing runs
CREATE TABLE interest_batch_execution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL, -- 'daily_interest_accrual', 'interest_posting'
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, CANCELLED
    total_accounts INTEGER NOT NULL DEFAULT 0,
    processed_accounts INTEGER NOT NULL DEFAULT 0,
    successful_accounts INTEGER NOT NULL DEFAULT 0,
    failed_accounts INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER,
    batch_parameters JSONB,
    error_details JSONB,
    tenant_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- Table for detailed batch processing results per account
CREATE TABLE interest_batch_account_result (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_execution_id UUID NOT NULL REFERENCES interest_batch_execution(id),
    account_id UUID NOT NULL,
    account_number VARCHAR(100),
    account_type VARCHAR(50) NOT NULL,
    interest_calculated NUMERIC(19,6),
    interest_posted NUMERIC(19,6),
    tax_amount NUMERIC(19,6),
    processing_time_ms INTEGER,
    status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'SKIPPED'
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id UUID
);

-- Indexes for performance optimization
CREATE INDEX idx_interest_batch_account_status_account_id ON interest_batch_account_status(account_id);
CREATE INDEX idx_interest_batch_account_status_next_posting_date ON interest_batch_account_status(next_posting_date);
CREATE INDEX idx_interest_batch_account_status_status ON interest_batch_account_status(status);
CREATE INDEX idx_interest_batch_execution_job_type ON interest_batch_execution(job_type);
CREATE INDEX idx_interest_batch_execution_status ON interest_batch_execution(status);
CREATE INDEX idx_interest_batch_account_result_execution_id ON interest_batch_account_result(batch_execution_id);
CREATE INDEX idx_interest_batch_account_result_account_id ON interest_batch_account_result(account_id);
CREATE INDEX idx_interest_batch_account_result_status ON interest_batch_account_result(status);

-- Default configuration for interest calculation and posting jobs
INSERT INTO interest_batch_config (
    job_type, batch_size, parallel_threads, max_retries, retry_interval_minutes, 
    timeout_seconds, description, enabled, parameters
) VALUES
(
    'daily_interest_accrual', 1000, 4, 3, 15, 3600, 
    'Daily interest accrual calculation job for all savings accounts', 
    true,
    jsonb_build_object(
        'include_dormant_accounts', false,
        'process_failed_accounts_first', true,
        'retry_failed_accounts', true,
        'logging_level', 'INFO'
    )
),
(
    'interest_posting', 500, 4, 3, 30, 7200, 
    'Interest posting job for savings accounts based on account posting period configurations', 
    true,
    jsonb_build_object(
        'include_dormant_accounts', false,
        'process_failed_accounts_first', true,
        'retry_failed_accounts', true,
        'date_override', null,
        'logging_level', 'INFO'
    )
);

-- Register with job_config table
INSERT INTO job_config (
    job_type, enabled, cron_expression, execution_interval, 
    priority, max_retries, timeout_seconds, is_system_job, 
    concurrency_limit, description, parameters
) VALUES
(
    'interest_accrual', true, '0 0 * * *', 'daily', 
    'high', 3, 3600, true, 1, 
    'Daily interest accrual calculation for all accounts',
    jsonb_build_object(
        'job_handler', 'InterestAccrualBatchHandler',
        'batch_size', 1000,
        'parallel_threads', 4
    )
),
(
    'interest_posting', true, '0 1 * * *', 'daily', 
    'high', 3, 7200, true, 1, 
    'Interest posting based on account posting schedules',
    jsonb_build_object(
        'job_handler', 'InterestPostingBatchHandler',
        'batch_size', 500,
        'parallel_threads', 4
    )
);

-- Create GraphQL types through Hasura metadata
COMMENT ON TABLE interest_batch_config IS 'Configuration for interest calculation and posting batch jobs';
COMMENT ON TABLE interest_batch_account_status IS 'Tracks interest calculation and posting status for each account';
COMMENT ON TABLE interest_batch_execution IS 'Records execution history of interest batch jobs';
COMMENT ON TABLE interest_batch_account_result IS 'Detailed results of batch processing for each account';