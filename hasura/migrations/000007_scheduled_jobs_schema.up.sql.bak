-- Schema for scheduled jobs management
-- This script creates the necessary tables for the scheduled jobs framework

-- Job configuration table
CREATE TABLE job_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    cron_expression VARCHAR(100),
    execution_interval VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    max_retries INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 3600, -- Default 1 hour
    parameters JSONB,
    tenant_id UUID,
    description TEXT,
    is_system_job BOOLEAN NOT NULL DEFAULT false,
    concurrency_limit INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE (job_type, tenant_id)
);

-- Jobs table
CREATE TABLE job (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    job_type VARCHAR(100) NOT NULL,
    cron_expression VARCHAR(100),
    execution_interval VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    parameters JSONB,
    next_run_time TIMESTAMP,
    last_run_time TIMESTAMP,
    last_completion_time TIMESTAMP,
    last_failure_time TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    tenant_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 3600, -- Default 1 hour
    lock_id VARCHAR(255),
    lock_expires_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Job execution history table
CREATE TABLE job_execution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES job(id),
    job_name VARCHAR(255) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    error_stack TEXT,
    parameters JSONB,
    result JSONB,
    tenant_id UUID,
    executed_by VARCHAR(255),
    processing_time_ms INTEGER,
    node_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Job lock table
CREATE TABLE job_lock (
    job_id UUID PRIMARY KEY REFERENCES job(id),
    node_id VARCHAR(100) NOT NULL,
    locked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_job_next_run_time ON job(next_run_time);
CREATE INDEX idx_job_status ON job(status);
CREATE INDEX idx_job_tenant_id ON job(tenant_id);
CREATE INDEX idx_job_job_type ON job(job_type);
CREATE INDEX idx_job_execution_job_id ON job_execution(job_id);
CREATE INDEX idx_job_execution_status ON job_execution(status);
CREATE INDEX idx_job_execution_tenant_id ON job_execution(tenant_id);
CREATE INDEX idx_job_execution_start_time ON job_execution(start_time);

-- Initial job configurations
INSERT INTO job_config (
    job_type, enabled, cron_expression, execution_interval, 
    priority, max_retries, timeout_seconds, is_system_job, 
    concurrency_limit, description
) VALUES
    ('system_health_check', true, '0 */1 * * *', 'hourly', 'medium', 2, 300, true, 1, 'System health check job'),
    ('database_maintenance', true, '0 2 * * 0', 'weekly', 'low', 1, 7200, true, 1, 'Database maintenance job running weekly'),
    ('end_of_day', true, '0 0 * * *', 'daily', 'critical', 3, 3600, true, 1, 'End of day processing'),
    ('end_of_month', true, '0 0 1 * *', 'monthly', 'critical', 3, 7200, true, 1, 'End of month processing'),
    ('loan_cob', true, '0 1 * * *', 'daily', 'high', 3, 3600, true, 2, 'Loan close of business processing'),
    ('loan_interest_posting', true, '0 2 * * *', 'daily', 'high', 3, 3600, true, 2, 'Post interest to loan accounts'),
    ('loan_due_notification', true, '0 8 * * *', 'daily', 'medium', 2, 1800, true, 2, 'Send loan payment due notifications'),
    ('savings_interest_calculation', true, '0 3 * * *', 'daily', 'high', 3, 3600, true, 2, 'Calculate interest for savings accounts'),
    ('savings_interest_posting', true, '0 4 * * *', 'daily', 'high', 3, 3600, true, 2, 'Post interest to savings accounts'),
    ('email_notification', true, '*/30 * * * *', 'custom', 'low', 3, 900, true, 2, 'Process email notifications queue'),
    ('sms_notification', true, '*/15 * * * *', 'custom', 'low', 3, 600, true, 2, 'Process SMS notifications queue');

-- Create a function to prevent concurrent job executions beyond the limit
CREATE OR REPLACE FUNCTION check_job_concurrency() RETURNS TRIGGER AS $$
DECLARE
    concurrency_limit INTEGER;
    current_count INTEGER;
BEGIN
    -- Get concurrency limit for this job type
    SELECT jc.concurrency_limit INTO concurrency_limit
    FROM job_config jc
    WHERE jc.job_type = NEW.job_type
    AND (jc.tenant_id = NEW.tenant_id OR jc.tenant_id IS NULL)
    LIMIT 1;
    
    IF concurrency_limit IS NULL THEN
        concurrency_limit := 1; -- Default if no config found
    END IF;
    
    -- Count currently running jobs of this type
    SELECT COUNT(*) INTO current_count
    FROM job j
    WHERE j.job_type = NEW.job_type
    AND j.status = 'running'
    AND (j.tenant_id = NEW.tenant_id OR (j.tenant_id IS NULL AND NEW.tenant_id IS NULL))
    AND j.id <> NEW.id; -- Exclude this job
    
    -- If we're at or over the limit, raise an exception
    IF current_count >= concurrency_limit THEN
        RAISE EXCEPTION 'Concurrency limit reached for job type %', NEW.job_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to enforce concurrency limits
CREATE TRIGGER enforce_job_concurrency
BEFORE UPDATE OF status ON job
FOR EACH ROW
WHEN (NEW.status = 'running' AND OLD.status <> 'running')
EXECUTE FUNCTION check_job_concurrency();

-- Create job maintenance function to clean up old job executions
CREATE OR REPLACE FUNCTION cleanup_job_executions(retention_days INTEGER) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM job_execution
    WHERE created_at < NOW() - (retention_days * INTERVAL '1 day')
    AND status IN ('completed', 'failed')
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;