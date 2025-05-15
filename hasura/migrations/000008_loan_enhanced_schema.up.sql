-- Migration file for Trinidad & Tobago Credit Union Enhanced Loan Management
-- Extends the base loan schema with document handling, decisioning, and credit union specific features

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create additional enum types for loan document management and decisioning
CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE document_verification_method AS ENUM ('manual', 'automated', 'hybrid');
CREATE TYPE decisioning_result AS ENUM ('approved', 'conditionally_approved', 'declined', 'manual_review');
CREATE TYPE decisioning_factor_type AS ENUM ('credit_score', 'income', 'debt_ratio', 'employment', 'collateral', 'savings_history', 'repayment_capacity', 'custom');

-- Add credit union specific fields to loan products
ALTER TABLE loan_product
ADD COLUMN is_credit_union_specific BOOLEAN DEFAULT FALSE,
ADD COLUMN requires_guarantor BOOLEAN DEFAULT FALSE,
ADD COLUMN allows_group_loans BOOLEAN DEFAULT FALSE,
ADD COLUMN requires_savings_account BOOLEAN DEFAULT FALSE,
ADD COLUMN minimum_savings_balance_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN member_years_required INTEGER DEFAULT 0,
ADD COLUMN max_debt_to_income_ratio DECIMAL(5, 2),
ADD COLUMN min_credit_score INTEGER,
ADD COLUMN employment_check_required BOOLEAN DEFAULT FALSE,
ADD COLUMN decisioning_ruleset_id UUID,
ADD COLUMN credit_committee_approval_required BOOLEAN DEFAULT FALSE,
ADD COLUMN approval_levels INTEGER DEFAULT 1,
ADD COLUMN early_repayment_discount_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN custom_fields JSONB;

-- Add credit union specific fields to loan table
ALTER TABLE loan
ADD COLUMN credit_score INTEGER,
ADD COLUMN credit_check_date DATE,
ADD COLUMN monthly_income DECIMAL(19, 6),
ADD COLUMN monthly_expenses DECIMAL(19, 6),
ADD COLUMN debt_to_income_ratio DECIMAL(5, 2),
ADD COLUMN employment_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN employment_verified_by UUID REFERENCES app_user(id),
ADD COLUMN employment_verification_date DATE,
ADD COLUMN credit_committee_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN credit_committee_approval_date DATE,
ADD COLUMN credit_committee_notes TEXT,
ADD COLUMN member_savings_account_id UUID,
ADD COLUMN early_repayment_discount_eligible BOOLEAN DEFAULT FALSE,
ADD COLUMN previous_loans_count INTEGER DEFAULT 0,
ADD COLUMN pre_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN pre_approved_amount DECIMAL(19, 6),
ADD COLUMN decision_source VARCHAR(50), -- 'automated', 'manual', 'hybrid'
ADD COLUMN custom_fields JSONB;

-- Create loan document table
CREATE TABLE loan_document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_location VARCHAR(1000) NOT NULL, -- file path or URL
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    document_number VARCHAR(100),
    expiry_date DATE,
    content_hash VARCHAR(255), -- For file integrity
    status document_status DEFAULT 'pending',
    verification_status document_status DEFAULT 'pending',
    verification_method document_verification_method DEFAULT 'manual',
    verification_date TIMESTAMP,
    verified_by UUID REFERENCES app_user(id),
    rejected_reason VARCHAR(500),
    is_required BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    uploaded_by UUID NOT NULL REFERENCES app_user(id),
    uploaded_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create document type reference table
CREATE TABLE document_type (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_identification BOOLEAN NOT NULL DEFAULT FALSE,
    is_address_proof BOOLEAN NOT NULL DEFAULT FALSE,
    is_income_proof BOOLEAN NOT NULL DEFAULT FALSE,
    is_loan_agreement BOOLEAN NOT NULL DEFAULT FALSE,
    is_required_default BOOLEAN NOT NULL DEFAULT FALSE,
    validation_regex VARCHAR(255),
    expiry_check_required BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_file_size INTEGER,
    maximum_file_size INTEGER,
    allowed_file_formats VARCHAR(255), -- comma-separated list: pdf,jpg,png
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Product-document type association table
CREATE TABLE loan_product_document_type (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_product_id UUID NOT NULL REFERENCES loan_product(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_type(id),
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    order_position INTEGER NOT NULL DEFAULT 1,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(loan_product_id, document_type_id)
);

-- Loan decisioning support
CREATE TABLE loan_decision (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    decision_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decision_result decisioning_result NOT NULL,
    decision_source VARCHAR(50) NOT NULL, -- 'automated', 'manual', 'hybrid'
    decision_by UUID REFERENCES app_user(id),
    risk_score DECIMAL(5, 2),
    risk_level VARCHAR(20), -- 'low', 'medium', 'high'
    decision_factors JSONB,
    notes TEXT,
    approval_level INTEGER DEFAULT 1,
    next_approval_level INTEGER,
    is_final BOOLEAN DEFAULT FALSE,
    approval_conditions JSONB,
    expiry_date DATE, -- When the decision expires
    manual_override BOOLEAN DEFAULT FALSE,
    override_reason VARCHAR(500),
    previous_decision_id UUID REFERENCES loan_decision(id), -- For tracking decision history
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan decisioning rules engine
CREATE TABLE decisioning_ruleset (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 1,
    version VARCHAR(50) NOT NULL,
    effective_from_date DATE NOT NULL,
    effective_to_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

CREATE TABLE decisioning_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruleset_id UUID NOT NULL REFERENCES decisioning_ruleset(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'eligibility', 'pricing', 'limit', etc.
    rule_definition JSONB NOT NULL, -- Conditions in JSON format
    rule_logic TEXT, -- SQL or other expression
    action_on_trigger VARCHAR(50) NOT NULL, -- 'approve', 'decline', 'refer', etc.
    risk_score_adjustment DECIMAL(5, 2),
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan application workflow tracking
CREATE TABLE loan_application_workflow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    current_stage VARCHAR(100) NOT NULL, -- 'application', 'verification', 'decisioning', 'approval', etc.
    stage_start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stage_end_date TIMESTAMP,
    stage_status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'completed', 'rejected'
    assigned_to UUID REFERENCES app_user(id),
    assigned_date TIMESTAMP,
    notes TEXT,
    due_date TIMESTAMP,
    is_overdue BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan audit trail
CREATE TABLE loan_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'decision', 'document_upload', etc.
    action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by UUID REFERENCES app_user(id),
    changes JSONB NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500)
);

-- Create audit triggers
CREATE TRIGGER loan_document_audit BEFORE INSERT OR UPDATE ON loan_document FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER document_type_audit BEFORE INSERT OR UPDATE ON document_type FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_product_document_type_audit BEFORE INSERT OR UPDATE ON loan_product_document_type FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_decision_audit BEFORE INSERT OR UPDATE ON loan_decision FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER decisioning_ruleset_audit BEFORE INSERT OR UPDATE ON decisioning_ruleset FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER decisioning_rule_audit BEFORE INSERT OR UPDATE ON decisioning_rule FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_application_workflow_audit BEFORE INSERT OR UPDATE ON loan_application_workflow FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_loan_document_loan_id ON loan_document(loan_id);
CREATE INDEX idx_loan_document_status ON loan_document(status);
CREATE INDEX idx_loan_document_type ON loan_document(document_type);
CREATE INDEX idx_loan_product_document_type_product_id ON loan_product_document_type(loan_product_id);
CREATE INDEX idx_loan_decision_loan_id ON loan_decision(loan_id);
CREATE INDEX idx_loan_decision_result ON loan_decision(decision_result);
CREATE INDEX idx_decisioning_rule_ruleset_id ON decisioning_rule(ruleset_id);
CREATE INDEX idx_loan_application_workflow_loan_id ON loan_application_workflow(loan_id);
CREATE INDEX idx_loan_application_workflow_stage ON loan_application_workflow(current_stage);
CREATE INDEX idx_loan_audit_loan_id ON loan_audit(loan_id);
CREATE INDEX idx_loan_credit_score ON loan(credit_score);
CREATE INDEX idx_loan_debt_to_income_ratio ON loan(debt_to_income_ratio);

-- Insert default document types
INSERT INTO document_type (
    name, description, is_active, is_identification, is_required_default, 
    allowed_file_formats, maximum_file_size
)
VALUES 
('National ID', 'Trinidad and Tobago national identification card', true, true, true, 'jpg,jpeg,png,pdf', 5242880),
('Passport', 'Valid passport document', true, true, true, 'jpg,jpeg,png,pdf', 5242880),
('Driver''s License', 'Trinidad and Tobago driver''s license', true, true, true, 'jpg,jpeg,png,pdf', 5242880),
('Proof of Address', 'Utility bill or bank statement from the last 3 months', true, false, true, 'jpg,jpeg,png,pdf', 5242880),
('Pay Slip', 'Recent pay slip (less than 3 months old)', true, false, true, 'jpg,jpeg,png,pdf', 5242880),
('Bank Statement', 'Bank statements for the last 3 months', true, false, true, 'jpg,jpeg,png,pdf', 10485760),
('Employment Letter', 'Letter from employer confirming employment', true, false, true, 'jpg,jpeg,png,pdf', 5242880),
('Financial Statements', 'Profit and Loss statement for self-employed', true, false, false, 'jpg,jpeg,png,pdf,xlsx,xls', 10485760),
('Loan Agreement', 'Signed loan agreement document', true, false, true, 'pdf', 10485760),
('Collateral Documents', 'Documents related to loan collateral', true, false, false, 'jpg,jpeg,png,pdf', 15728640),
('Tax Returns', 'Recent tax returns documents', true, false, false, 'jpg,jpeg,png,pdf', 10485760),
('Business Registration', 'Business registration documents', true, false, false, 'jpg,jpeg,png,pdf', 5242880);

-- Insert default decisioning ruleset
INSERT INTO decisioning_ruleset (
    name, description, is_active, priority, version, effective_from_date
)
VALUES (
    'Default Credit Union Ruleset', 
    'Standard decisioning rules for credit union loans', 
    true, 
    1, 
    '1.0', 
    CURRENT_DATE
);

-- Get the ruleset ID for the rules
DO $$
DECLARE
    v_ruleset_id UUID;
BEGIN
    SELECT id INTO v_ruleset_id FROM decisioning_ruleset WHERE name = 'Default Credit Union Ruleset';
    
    -- Insert default decisioning rules
    INSERT INTO decisioning_rule (
        ruleset_id, rule_name, rule_type, rule_definition, action_on_trigger, priority, is_active
    )
    VALUES
    (
        v_ruleset_id,
        'Minimum Credit Score',
        'eligibility',
        '{"condition": "credit_score < 550", "outcome": "decline"}',
        'decline',
        1,
        true
    ),
    (
        v_ruleset_id,
        'Low Credit Score',
        'eligibility',
        '{"condition": "credit_score >= 550 AND credit_score < 650", "outcome": "manual_review"}',
        'manual_review',
        2,
        true
    ),
    (
        v_ruleset_id,
        'Maximum Debt-to-Income Ratio',
        'eligibility',
        '{"condition": "debt_to_income_ratio > 0.45", "outcome": "manual_review"}',
        'manual_review',
        3,
        true
    ),
    (
        v_ruleset_id,
        'Good Credit Profile',
        'eligibility',
        '{"condition": "credit_score >= 650 AND debt_to_income_ratio <= 0.45", "outcome": "approve"}',
        'approve',
        4,
        true
    ),
    (
        v_ruleset_id,
        'Loan Amount Threshold',
        'limit',
        '{"condition": "loan_amount > 100000", "outcome": "manual_review"}',
        'manual_review',
        5,
        true
    ),
    (
        v_ruleset_id,
        'Member History Check',
        'eligibility',
        '{"condition": "member_years < 1", "outcome": "manual_review"}',
        'manual_review',
        6,
        true
    );
    
    -- Update loan product with ruleset
    UPDATE loan_product
    SET 
        decisioning_ruleset_id = v_ruleset_id,
        is_credit_union_specific = true,
        requires_guarantor = true,
        min_credit_score = 550,
        max_debt_to_income_ratio = 0.45,
        requires_savings_account = true,
        member_years_required = 1,
        credit_committee_approval_required = true
    WHERE
        short_name = 'STD';
END $$;

-- Create trigger function to create audit trail entries
CREATE OR REPLACE FUNCTION create_loan_audit_entry()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    action_type TEXT;
BEGIN
    -- Determine action type
    IF (TG_OP = 'INSERT') THEN
        action_type := 'create';
        changes_json := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        action_type := 'update';
        changes_json := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'delete';
        changes_json := to_jsonb(OLD);
    END IF;
    
    -- Create audit entry
    INSERT INTO loan_audit (
        loan_id, action_type, action_timestamp, performed_by, changes
    ) VALUES (
        CASE
            WHEN TG_TABLE_NAME = 'loan' THEN NEW.id
            WHEN TG_TABLE_NAME = 'loan_document' THEN NEW.loan_id
            WHEN TG_TABLE_NAME = 'loan_decision' THEN NEW.loan_id
            ELSE NULL -- Handle other tables as needed
        END,
        action_type || '_' || TG_TABLE_NAME,
        CURRENT_TIMESTAMP,
        CASE
            WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN NEW.created_by
            ELSE OLD.created_by
        END,
        changes_json
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trail trigger to key tables
CREATE TRIGGER loan_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON loan
FOR EACH ROW EXECUTE FUNCTION create_loan_audit_entry();

CREATE TRIGGER loan_document_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON loan_document
FOR EACH ROW EXECUTE FUNCTION create_loan_audit_entry();

CREATE TRIGGER loan_decision_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON loan_decision
FOR EACH ROW EXECUTE FUNCTION create_loan_audit_entry();

-- Function to automatically create workflow entry when loan status changes
CREATE OR REPLACE FUNCTION update_loan_workflow_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    prev_workflow_id UUID;
    prev_workflow_stage VARCHAR(100);
BEGIN
    -- Only proceed if the status has changed
    IF (TG_OP = 'INSERT') OR (OLD.loan_status != NEW.loan_status) THEN
        -- Get the most recent workflow stage
        SELECT id, current_stage INTO prev_workflow_id, prev_workflow_stage
        FROM loan_application_workflow
        WHERE loan_id = NEW.id
        ORDER BY stage_start_date DESC
        LIMIT 1;
        
        -- Close previous workflow entry if it exists
        IF prev_workflow_id IS NOT NULL THEN
            UPDATE loan_application_workflow
            SET 
                stage_end_date = CURRENT_TIMESTAMP,
                stage_status = 'completed',
                last_modified_date = CURRENT_TIMESTAMP,
                last_modified_by = NEW.last_modified_by
            WHERE id = prev_workflow_id;
        END IF;
        
        -- Create new workflow entry based on new status
        INSERT INTO loan_application_workflow (
            loan_id, 
            current_stage, 
            stage_start_date,
            stage_status,
            assigned_to,
            created_by,
            created_date
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.loan_status = 'submitted_and_pending_approval' THEN 'application'
                WHEN NEW.loan_status = 'approved' THEN 'approval'
                WHEN NEW.loan_status = 'active' THEN 'disbursement'
                WHEN NEW.loan_status = 'rejected' THEN 'rejected'
                WHEN NEW.loan_status = 'withdrawn_by_client' THEN 'withdrawn'
                WHEN NEW.loan_status LIKE 'closed%' THEN 'closed'
                ELSE NEW.loan_status::VARCHAR
            END,
            CURRENT_TIMESTAMP,
            'in_progress',
            NEW.loan_officer_id,
            NEW.last_modified_by,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply workflow trigger to loan table
CREATE TRIGGER loan_workflow_trigger
AFTER INSERT OR UPDATE ON loan
FOR EACH ROW EXECUTE FUNCTION update_loan_workflow_on_status_change();

-- Insert loan permissions for document management
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_LOAN_DOCUMENT', 'LOANDOCUMENT', 'CREATE', true),
('portfolio', 'READ_LOAN_DOCUMENT', 'LOANDOCUMENT', 'READ', false),
('portfolio', 'UPDATE_LOAN_DOCUMENT', 'LOANDOCUMENT', 'UPDATE', true),
('portfolio', 'DELETE_LOAN_DOCUMENT', 'LOANDOCUMENT', 'DELETE', true),
('portfolio', 'VERIFY_LOAN_DOCUMENT', 'LOANDOCUMENT', 'VERIFY', true),
('portfolio', 'CREATE_LOAN_DECISION', 'LOANDECISION', 'CREATE', true),
('portfolio', 'READ_LOAN_DECISION', 'LOANDECISION', 'READ', false),
('portfolio', 'UPDATE_LOAN_DECISION', 'LOANDECISION', 'UPDATE', true),
('portfolio', 'OVERRIDE_LOAN_DECISION', 'LOANDECISION', 'OVERRIDE', true);

-- Add automatic document verification capability
COMMENT ON TABLE loan_document IS 'Stores documents attached to loan applications with verification workflows';
COMMENT ON TABLE document_type IS 'Document types required for loan processing with validation rules';
COMMENT ON TABLE loan_decision IS 'Decision history for loan applications with risk assessment';
COMMENT ON TABLE decisioning_ruleset IS 'Rule sets for automated loan decisioning';
COMMENT ON TABLE decisioning_rule IS 'Individual rules for loan decisioning with conditions';
COMMENT ON TABLE loan_application_workflow IS 'Tracks the loan application through various workflow stages';
COMMENT ON TABLE loan_audit IS 'Comprehensive audit trail for loan-related activities';