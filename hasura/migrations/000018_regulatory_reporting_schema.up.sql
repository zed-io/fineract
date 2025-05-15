-- Migration file for regulatory reporting functionality
-- Creates tables to store regulatory report definitions, instances, and schedules
-- Specific to Trinidad and Tobago regulatory requirements

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create enum types for regulatory reporting
CREATE TYPE report_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semi_annually', 
  'annually',
  'on_demand'
);

CREATE TYPE report_format AS ENUM (
  'pdf',
  'excel',
  'csv',
  'json',
  'xml'
);

CREATE TYPE report_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'approved',
  'submitted',
  'rejected'
);

CREATE TYPE regulatory_report_type AS ENUM (
  'suspicious_transaction_report',
  'large_cash_transaction_report',
  'terrorist_property_report',
  'quarterly_return',
  'annual_compliance_report',
  'risk_assessment_report',
  'anti_money_laundering_report',
  'credit_union_monthly_statement',
  'financial_condition_report',
  'member_statistics_report',
  'loan_portfolio_report',
  'delinquency_report'
);

-- Create table for report definitions
CREATE TABLE regulatory_report_definition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type regulatory_report_type NOT NULL UNIQUE,
    frequency report_frequency NOT NULL,
    regulator VARCHAR(255) NOT NULL, -- e.g., 'FIU', 'Central Bank', etc.
    format_options report_format[] NOT NULL,
    required_parameters TEXT[] NOT NULL DEFAULT '{}',
    deadline VARCHAR(255), -- e.g., '15 days after quarter end'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    template_url TEXT,
    instructions TEXT,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create table for report instances
CREATE TABLE regulatory_report_instance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    definition_id UUID NOT NULL REFERENCES regulatory_report_definition(id),
    name VARCHAR(255) NOT NULL,
    report_type regulatory_report_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    due_date DATE,
    submission_date DATE,
    status report_status NOT NULL DEFAULT 'pending',
    format report_format NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    file_url TEXT,
    file_size INTEGER,
    generated_by VARCHAR(100) NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    submitted_by VARCHAR(100),
    submitted_at TIMESTAMP,
    notes TEXT,
    metadata JSONB,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create table for report schedules
CREATE TABLE regulatory_report_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    definition_id UUID NOT NULL REFERENCES regulatory_report_definition(id),
    frequency report_frequency NOT NULL,
    day_of_month INTEGER, -- For monthly, quarterly, etc.
    day_of_week INTEGER, -- For weekly
    month INTEGER, -- For annual
    hour INTEGER NOT NULL DEFAULT 0,
    minute INTEGER NOT NULL DEFAULT 0,
    parameters JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create indices for better performance
CREATE INDEX idx_report_definition_type ON regulatory_report_definition(report_type);
CREATE INDEX idx_report_definition_active ON regulatory_report_definition(is_active);
CREATE INDEX idx_report_instance_definition ON regulatory_report_instance(definition_id);
CREATE INDEX idx_report_instance_type ON regulatory_report_instance(report_type);
CREATE INDEX idx_report_instance_dates ON regulatory_report_instance(start_date, end_date);
CREATE INDEX idx_report_instance_status ON regulatory_report_instance(status);
CREATE INDEX idx_report_instance_due_date ON regulatory_report_instance(due_date);
CREATE INDEX idx_report_schedule_definition ON regulatory_report_schedule(definition_id);
CREATE INDEX idx_report_schedule_next_run ON regulatory_report_schedule(next_run);
CREATE INDEX idx_report_schedule_active ON regulatory_report_schedule(is_active);

-- Create audit triggers
CREATE TRIGGER regulatory_report_definition_audit
BEFORE INSERT OR UPDATE ON regulatory_report_definition
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER regulatory_report_instance_audit
BEFORE INSERT OR UPDATE ON regulatory_report_instance
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER regulatory_report_schedule_audit
BEFORE INSERT OR UPDATE ON regulatory_report_schedule
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Add permission for regulatory reporting
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('reporting', 'CREATE_REGULATORYREPORT', 'REGULATORYREPORT', 'CREATE', false),
('reporting', 'READ_REGULATORYREPORT', 'REGULATORYREPORT', 'READ', false),
('reporting', 'UPDATE_REGULATORYREPORT', 'REGULATORYREPORT', 'UPDATE', false),
('reporting', 'DELETE_REGULATORYREPORT', 'REGULATORYREPORT', 'DELETE', false),
('reporting', 'APPROVE_REGULATORYREPORT', 'REGULATORYREPORT', 'APPROVE', true),
('reporting', 'SUBMIT_REGULATORYREPORT', 'REGULATORYREPORT', 'SUBMIT', true),
('reporting', 'SCHEDULE_REGULATORYREPORT', 'REGULATORYREPORT', 'SCHEDULE', true)
ON CONFLICT DO NOTHING;

-- Insert default report definitions for Trinidad and Tobago
INSERT INTO regulatory_report_definition (
    name,
    description,
    report_type,
    frequency,
    regulator,
    format_options,
    required_parameters,
    deadline,
    is_active,
    instructions,
    created_date,
    created_by
)
VALUES
    (
        'Suspicious Transaction Report',
        'Report of suspicious transactions required by the Trinidad and Tobago Financial Intelligence Unit (FIUTT) under the Proceeds of Crime Act',
        'suspicious_transaction_report',
        'on_demand',
        'Financial Intelligence Unit of Trinidad and Tobago',
        ARRAY['pdf', 'excel']::report_format[],
        ARRAY[]::TEXT[],
        'Within 14 days of suspicion',
        true,
        'This report must be submitted to the FIU within 14 days of forming a suspicion regarding any transaction. Ensure all client details are accurate and supporting documentation is attached.',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'Large Cash Transaction Report',
        'Report of cash transactions exceeding TT$10,000 required by the Trinidad and Tobago Financial Intelligence Unit',
        'large_cash_transaction_report',
        'monthly',
        'Financial Intelligence Unit of Trinidad and Tobago',
        ARRAY['pdf', 'excel', 'xml']::report_format[],
        ARRAY['threshold']::TEXT[],
        '15 days after month end',
        true,
        'This report must be submitted by the 15th day of each month for the previous calendar month. All cash transactions exceeding TT$10,000 or equivalent must be reported.',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'Quarterly Return',
        'Quarterly financial return required by the Central Bank of Trinidad and Tobago',
        'quarterly_return',
        'quarterly',
        'Central Bank of Trinidad and Tobago',
        ARRAY['pdf', 'excel']::report_format[],
        ARRAY[]::TEXT[],
        '21 days after quarter end',
        true,
        'This quarterly return must be submitted within 21 days after the end of each calendar quarter. It should include comprehensive financial statements and compliance metrics.',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'Credit Union Monthly Statement',
        'Monthly statement required by the Commissioner for Co-operative Development',
        'credit_union_monthly_statement',
        'monthly',
        'Commissioner for Co-operative Development',
        ARRAY['pdf', 'excel']::report_format[],
        ARRAY[]::TEXT[],
        '15 days after month end',
        true,
        'This statement must be submitted within 15 days after the end of each calendar month. It should include member statistics, loan portfolio summary, and financial highlights.',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'Annual Compliance Report',
        'Annual report on AML/CFT compliance required by the Financial Intelligence Unit',
        'annual_compliance_report',
        'annually',
        'Financial Intelligence Unit of Trinidad and Tobago',
        ARRAY['pdf', 'excel']::report_format[],
        ARRAY[]::TEXT[],
        '90 days after year end',
        true,
        'This annual report must be submitted within 90 days after the end of each calendar year. It should include a comprehensive assessment of AML/CFT compliance activities, training, and suspicious transaction reporting.',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'Loan Portfolio Report',
        'Detailed report on loan portfolio composition and performance',
        'loan_portfolio_report',
        'monthly',
        'Internal Management',
        ARRAY['pdf', 'excel', 'csv']::report_format[],
        ARRAY[]::TEXT[],
        NULL,
        true,
        'This internal report provides a comprehensive breakdown of the loan portfolio by product, status, and performance metrics.',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'Delinquency Report',
        'Detailed report on delinquent loans and aging analysis',
        'delinquency_report',
        'weekly',
        'Internal Management',
        ARRAY['pdf', 'excel', 'csv']::report_format[],
        ARRAY[]::TEXT[],
        NULL,
        true,
        'This internal report provides a detailed list of delinquent loans, aging analysis, and collection efforts.',
        CURRENT_TIMESTAMP,
        'system'
    );

-- Add comment to explain tables
COMMENT ON TABLE regulatory_report_definition IS 'Defines regulatory reports required by Trinidad and Tobago authorities';
COMMENT ON TABLE regulatory_report_instance IS 'Stores generated regulatory report instances with their status and metadata';
COMMENT ON TABLE regulatory_report_schedule IS 'Manages schedules for automatic report generation';

-- Create function to check for reports due soon
CREATE OR REPLACE FUNCTION check_reports_due_soon()
RETURNS TABLE (
    report_id UUID,
    report_name TEXT,
    report_type regulatory_report_type,
    due_date DATE,
    days_until_due INTEGER,
    status report_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ri.id as report_id,
        ri.name as report_name,
        ri.report_type,
        ri.due_date,
        (ri.due_date - CURRENT_DATE) as days_until_due,
        ri.status
    FROM 
        fineract_default.regulatory_report_instance ri
    WHERE 
        ri.due_date IS NOT NULL
        AND ri.due_date > CURRENT_DATE
        AND ri.due_date <= (CURRENT_DATE + 14)  -- Due within next 14 days
        AND ri.status NOT IN ('submitted', 'approved')
    ORDER BY 
        ri.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function for scheduled report generation
CREATE OR REPLACE FUNCTION schedule_reports()
RETURNS INTEGER AS $$
DECLARE
    scheduled_count INTEGER := 0;
    report_def RECORD;
    next_period_start DATE;
    next_period_end DATE;
    report_due_date DATE;
    new_instance_id UUID;
BEGIN
    -- For each active report definition that has a frequency
    FOR report_def IN 
        SELECT 
            rd.id, rd.name, rd.report_type, rd.frequency, rd.deadline
        FROM 
            fineract_default.regulatory_report_definition rd
        WHERE 
            rd.is_active = true
            AND rd.frequency != 'on_demand'
    LOOP
        -- Calculate next period based on frequency
        CASE report_def.frequency
            WHEN 'monthly' THEN
                next_period_start := date_trunc('month', CURRENT_DATE)::DATE;
                next_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            WHEN 'quarterly' THEN
                next_period_start := date_trunc('quarter', CURRENT_DATE)::DATE;
                next_period_end := (date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
            WHEN 'annually' THEN
                next_period_start := date_trunc('year', CURRENT_DATE)::DATE;
                next_period_end := (date_trunc('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
            ELSE
                -- Skip other frequencies for now
                CONTINUE;
        END CASE;
        
        -- Calculate due date if deadline is specified
        IF report_def.deadline IS NOT NULL THEN
            -- Simple deadline parsing for demo
            IF report_def.deadline LIKE '%days after%' THEN
                report_due_date := next_period_end + INTERVAL '15 days'; -- Simplified
            ELSE
                report_due_date := next_period_end + INTERVAL '30 days'; -- Default
            END IF;
        ELSE
            report_due_date := NULL;
        END IF;
        
        -- Check if a report instance already exists for this period
        IF NOT EXISTS (
            SELECT 1 
            FROM fineract_default.regulatory_report_instance 
            WHERE definition_id = report_def.id
            AND start_date = next_period_start
            AND end_date = next_period_end
        ) THEN
            -- Create a pending report instance
            INSERT INTO fineract_default.regulatory_report_instance (
                id, definition_id, name, report_type, start_date, end_date, due_date,
                status, format, generated_by, generated_at, created_date, created_by
            ) VALUES (
                uuid_generate_v4(),
                report_def.id,
                report_def.name,
                report_def.report_type,
                next_period_start,
                next_period_end,
                report_due_date,
                'pending',
                'pdf', -- Default format
                'system',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                'system'
            )
            RETURNING id INTO new_instance_id;
            
            scheduled_count := scheduled_count + 1;
        END IF;
    END LOOP;
    
    RETURN scheduled_count;
END;
$$ LANGUAGE plpgsql;