-- Migration file for credit check functionality
-- Creates table to store credit check information for clients

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create credit check table
CREATE TABLE credit_check (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    credit_score INTEGER NOT NULL,
    check_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    report_reference VARCHAR(100),
    credit_bureau VARCHAR(100) NOT NULL,
    risk_category VARCHAR(50) NOT NULL,
    delinquency_status BOOLEAN NOT NULL DEFAULT FALSE,
    active_loans INTEGER NOT NULL DEFAULT 0,
    total_outstanding DECIMAL(19, 6),
    max_days_arrears INTEGER,
    bankruptcy_flag BOOLEAN NOT NULL DEFAULT FALSE,
    fraud_flag BOOLEAN NOT NULL DEFAULT FALSE,
    inquiry_count INTEGER NOT NULL DEFAULT 0,
    inquiry_last_90_days INTEGER NOT NULL DEFAULT 0,
    report_content JSONB,
    report_summary TEXT,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Add indexes for better performance
CREATE INDEX idx_credit_check_client_id ON credit_check(client_id);
CREATE INDEX idx_credit_check_date ON credit_check(check_date);
CREATE INDEX idx_credit_check_score ON credit_check(credit_score);
CREATE INDEX idx_credit_check_risk ON credit_check(risk_category);

-- Add credit check fields to client table if they don't already exist
DO $$
BEGIN
    -- Add credit_score column if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_attribute 
                  WHERE attrelid = 'fineract_default.client'::regclass
                  AND attname = 'credit_score'
                  AND NOT attisdropped) THEN
        ALTER TABLE client ADD COLUMN credit_score INTEGER;
    END IF;

    -- Add last_credit_check_date column if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_attribute 
                  WHERE attrelid = 'fineract_default.client'::regclass
                  AND attname = 'last_credit_check_date'
                  AND NOT attisdropped) THEN
        ALTER TABLE client ADD COLUMN last_credit_check_date TIMESTAMP;
    END IF;
END
$$;

-- Create audit trigger for credit_check table
CREATE TRIGGER credit_check_audit
BEFORE INSERT OR UPDATE ON credit_check
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Add permission for credit check
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_CREDITCHECK', 'CREDITCHECK', 'CREATE', true),
('portfolio', 'READ_CREDITCHECK', 'CREDITCHECK', 'READ', false),
('portfolio', 'UPDATE_CREDITCHECK', 'CREDITCHECK', 'UPDATE', true),
('portfolio', 'DELETE_CREDITCHECK', 'CREDITCHECK', 'DELETE', true)
ON CONFLICT DO NOTHING;

-- Insert default credit bureau configurations
CREATE TABLE IF NOT EXISTS credit_bureau_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bureau_name VARCHAR(100) NOT NULL UNIQUE,
    api_url VARCHAR(512),
    api_key VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    connection_timeout INTEGER DEFAULT 30000,
    read_timeout INTEGER DEFAULT 30000,
    config_parameters JSONB,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create audit trigger for credit_bureau_configuration table
CREATE TRIGGER credit_bureau_config_audit
BEFORE INSERT OR UPDATE ON credit_bureau_configuration
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Insert default credit bureau configurations
INSERT INTO credit_bureau_configuration (
    bureau_name, 
    api_url, 
    is_active, 
    connection_timeout, 
    read_timeout, 
    config_parameters,
    created_date,
    created_by
)
VALUES
    (
        'TTCB', -- Trinidad & Tobago Credit Bureau
        'https://api.ttcreditbureau.com/v1', 
        true, 
        30000, 
        30000, 
        '{"inquiryTypes": ["CREDIT", "IDENTITY", "ADDRESS"], "reportFormat": "JSON", "maxRetries": 3}',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'CreditInfo', 
        'https://api.creditinfo.com/trinidad/v2', 
        false, 
        30000, 
        45000, 
        '{"inquiryTypes": ["STANDARD", "ENHANCED"], "reportFormat": "JSON", "maxRetries": 2}',
        CURRENT_TIMESTAMP,
        'system'
    )
ON CONFLICT DO NOTHING;

-- Add comment to explain tables
COMMENT ON TABLE credit_check IS 'Stores credit check information for clients with detailed metrics and risk assessments';
COMMENT ON TABLE credit_bureau_configuration IS 'Configurations for connecting to different credit bureaus';

-- Create function to trigger credit check in loan applications
CREATE OR REPLACE FUNCTION trigger_credit_check_for_loan()
RETURNS TRIGGER AS $$
BEGIN
    -- If a loan is being created or status is changing to submitted_and_pending_approval
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.loan_status <> NEW.loan_status)) AND 
       NEW.loan_status = 'submitted_and_pending_approval' THEN
       
        -- Flag the loan for credit check (in real implementation, this would trigger an event)
        INSERT INTO fineract_default.loan_audit (
            loan_id, action_type, action_timestamp, performed_by, changes
        ) VALUES (
            NEW.id, 
            'credit_check_required', 
            CURRENT_TIMESTAMP, 
            NEW.last_modified_by, 
            jsonb_build_object(
                'loan_id', NEW.id,
                'client_id', NEW.client_id,
                'loan_status', NEW.loan_status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to loan table
CREATE TRIGGER loan_credit_check_trigger
AFTER INSERT OR UPDATE ON loan
FOR EACH ROW EXECUTE FUNCTION trigger_credit_check_for_loan();