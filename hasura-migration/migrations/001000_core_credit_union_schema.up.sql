-- Core Credit Union Schema for Hasura-based Fineract replacement
-- Designed for PostgreSQL with normalized tables, constraints, and indexes

-- Set search path
SET search_path TO fineract_default, public;

-- Create tenant management schema
CREATE SCHEMA IF NOT EXISTS tenant_management;

-- ============================================================================
-- TENANT MANAGEMENT
-- ============================================================================

-- Credit Union tenant information
CREATE TABLE tenant_management.tenant (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(20) NOT NULL UNIQUE,
    database_schema VARCHAR(50) NOT NULL UNIQUE,
    domain VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, terminated
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    CONSTRAINT tenant_status_check CHECK (status IN ('active', 'suspended', 'terminated'))
);

-- Tenant database connection details
CREATE TABLE tenant_management.tenant_db_connection (
    tenant_id UUID PRIMARY KEY REFERENCES tenant_management.tenant(id) ON DELETE CASCADE,
    connection_string VARCHAR(500),
    username VARCHAR(100),
    password_hash VARCHAR(255),
    is_encrypted BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP
);

-- Tenant API limits and quotas
CREATE TABLE tenant_management.tenant_api_quota (
    tenant_id UUID PRIMARY KEY REFERENCES tenant_management.tenant(id) ON DELETE CASCADE,
    daily_request_limit INTEGER DEFAULT 50000,
    monthly_request_limit INTEGER DEFAULT 1500000,
    max_concurrent_connections INTEGER DEFAULT 100,
    throttle_rate_per_minute INTEGER DEFAULT 500,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP
);

-- ============================================================================
-- CORE BANKING SCHEMA EXTENSIONS
-- ============================================================================

-- Domain types not already defined in previous migrations
CREATE TYPE transaction_mode AS ENUM ('cash', 'cheque', 'transfer', 'card', 'online', 'mobile', 'atm', 'digital_wallet');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
CREATE TYPE auth_challenge_type AS ENUM ('password', 'otp', 'biometric', 'security_question', 'totp');
CREATE TYPE cron_job_status AS ENUM ('scheduled', 'running', 'completed', 'failed', 'suspended');
CREATE TYPE account_statement_frequency AS ENUM ('daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'annually', 'on_demand');
CREATE TYPE webhook_event_type AS ENUM (
    'account_created', 'account_closed', 'deposit_created', 'withdrawal_created', 
    'loan_application_submitted', 'loan_approved', 'loan_rejected', 'loan_disbursed', 
    'loan_repayment', 'loan_written_off', 'kyc_verified', 'kyc_rejected'
);

-- ===== ENHANCED CUSTOMER MANAGEMENT =====

-- Enhanced CIF (Customer Information File) with credit union specific fields
CREATE TABLE enhanced_cif (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    membership_number VARCHAR(50) UNIQUE,
    membership_date DATE,
    employment_status VARCHAR(50),
    employer_name VARCHAR(100),
    job_title VARCHAR(100),
    work_phone VARCHAR(20),
    work_email VARCHAR(100),
    monthly_income DECIMAL(19,6),
    annual_income DECIMAL(19,6),
    income_verification_date DATE,
    risk_rating VARCHAR(20),
    income_source VARCHAR(100),
    net_worth DECIMAL(19,6),
    fatca_status BOOLEAN DEFAULT FALSE,
    pep_status BOOLEAN DEFAULT FALSE,
    referral_source VARCHAR(100),
    member_status VARCHAR(20) DEFAULT 'active',
    member_category VARCHAR(50),
    last_contact_date DATE,
    credit_score INTEGER,
    total_shares_value DECIMAL(19,6) DEFAULT 0,
    total_loan_value DECIMAL(19,6) DEFAULT 0,
    total_deposit_value DECIMAL(19,6) DEFAULT 0,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT enhanced_cif_member_status_check CHECK (member_status IN ('active', 'dormant', 'suspended', 'closed'))
);

-- Primary and secondary member relationships for joint accounts
CREATE TABLE member_relationship (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_member_id UUID NOT NULL REFERENCES client(id),
    secondary_member_id UUID NOT NULL REFERENCES client(id),
    relationship_type VARCHAR(50) NOT NULL, -- spouse, parent, child, sibling, etc.
    is_joint_account BOOLEAN DEFAULT FALSE,
    is_authorized_signer BOOLEAN DEFAULT FALSE,
    is_beneficiary BOOLEAN DEFAULT FALSE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT member_relationship_unique UNIQUE (primary_member_id, secondary_member_id, relationship_type),
    CONSTRAINT member_relationship_not_self CHECK (primary_member_id != secondary_member_id)
);

-- Enhanced KYC with configurable document requirements
CREATE TABLE kyc_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    member_type VARCHAR(50) NOT NULL, -- 'individual', 'business', 'minor', etc.
    document_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    min_documents INTEGER DEFAULT 1,
    max_documents INTEGER DEFAULT 1,
    verification_level VARCHAR(20) DEFAULT 'standard', -- basic, standard, enhanced
    validity_period INTEGER, -- in months
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    CONSTRAINT kyc_config_unique UNIQUE (tenant_id, member_type, document_type)
);

-- ===== DIGITAL BANKING & SECURITY =====

-- User authentication logs
CREATE TABLE authentication_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(id),
    auth_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_id VARCHAR(255),
    geolocation VARCHAR(100),
    auth_status VARCHAR(20) NOT NULL, -- success, failed, locked
    auth_method VARCHAR(50), -- password, otp, biometric, etc.
    failure_reason VARCHAR(100),
    session_id UUID,
    tenant_id UUID NOT NULL,
    CONSTRAINT auth_log_status_check CHECK (auth_status IN ('success', 'failed', 'locked'))
);

-- Enhanced security and MFA
CREATE TABLE security_challenge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(id),
    challenge_type auth_challenge_type NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,
    secret_hash VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT security_challenge_unique UNIQUE (user_id, challenge_type)
);

-- Security challenge attempts
CREATE TABLE security_challenge_attempt (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    security_challenge_id UUID NOT NULL REFERENCES security_challenge(id) ON DELETE CASCADE,
    attempt_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_id VARCHAR(255),
    success BOOLEAN NOT NULL,
    tenant_id UUID NOT NULL
);

-- ===== TRANSACTION PROCESSING =====

-- Journal entry with enhanced auditing
CREATE TABLE journal_entry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    office_id UUID NOT NULL REFERENCES office(id),
    gl_account_id UUID NOT NULL, -- References accounting account
    transaction_date DATE NOT NULL,
    entry_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type transaction_type NOT NULL, -- debit, credit
    amount DECIMAL(19,6) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50), -- 'loan', 'savings', 'share', etc.
    entity_id UUID,
    reference_number VARCHAR(100),
    is_manual_entry BOOLEAN DEFAULT FALSE,
    is_reversed BOOLEAN DEFAULT FALSE,
    reversal_id UUID REFERENCES journal_entry(id),
    reversal_reason TEXT,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT journal_entry_amount_check CHECK (amount > 0)
);

-- Transaction batch processing
CREATE TABLE transaction_batch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_reference VARCHAR(100) NOT NULL,
    batch_type VARCHAR(50) NOT NULL, -- 'loan_disbursement', 'salary_credit', etc.
    submitted_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    total_records INTEGER NOT NULL,
    processed_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    total_amount DECIMAL(19,6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    error_message TEXT,
    submitted_by UUID REFERENCES app_user(id),
    processed_by UUID REFERENCES app_user(id),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT transaction_batch_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Transaction batch items
CREATE TABLE transaction_batch_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES transaction_batch(id) ON DELETE CASCADE,
    account_no VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(19,6) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processed, failed
    error_message TEXT,
    external_id VARCHAR(100),
    transaction_id UUID, -- References actual transaction after processing
    processing_order INTEGER,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL,
    CONSTRAINT transaction_batch_item_status_check CHECK (status IN ('pending', 'processed', 'failed'))
);

-- ===== NOTIFICATIONS & MESSAGING =====

-- Notification templates
CREATE TABLE notification_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(100) NOT NULL,
    tenant_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- transaction, marketing, reminder, alert
    channel notification_channel NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    CONSTRAINT notification_template_unique UNIQUE (tenant_id, template_key, channel)
);

-- Notification messages
CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES notification_template(id),
    client_id UUID REFERENCES client(id),
    user_id UUID REFERENCES app_user(id),
    channel notification_channel NOT NULL,
    recipient VARCHAR(255) NOT NULL, -- email, phone, device token
    subject TEXT,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
    error_message TEXT,
    send_after TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    reference_type VARCHAR(50), -- 'loan', 'savings', 'share', etc.
    reference_id UUID,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL,
    CONSTRAINT notification_status_check CHECK (status IN ('pending', 'sent', 'delivered', 'failed'))
);

-- ===== WEBHOOKS & INTEGRATIONS =====

-- Webhook configuration
CREATE TABLE webhook_subscription (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    event_types webhook_event_type[] NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    headers JSONB,
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    CONSTRAINT webhook_subscription_unique UNIQUE (tenant_id, name)
);

-- Webhook delivery log
CREATE TABLE webhook_delivery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscription(id) ON DELETE CASCADE,
    event_type webhook_event_type NOT NULL,
    payload JSONB NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_attempt_at TIMESTAMP,
    last_attempt_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, failed, retrying
    response_status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL,
    CONSTRAINT webhook_delivery_status_check CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

-- ===== SCHEDULED JOBS =====

-- CRON job definitions
CREATE TABLE cron_job_definition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_key VARCHAR(100) NOT NULL,
    tenant_id UUID,
    job_name VARCHAR(100) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    handler_name VARCHAR(100) NOT NULL,
    parameters JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    CONSTRAINT cron_job_definition_unique UNIQUE (job_key, tenant_id)
);

-- CRON job execution log
CREATE TABLE cron_job_execution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_definition_id UUID NOT NULL REFERENCES cron_job_definition(id),
    tenant_id UUID,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status cron_job_status NOT NULL DEFAULT 'running',
    node_id VARCHAR(100),
    error_message TEXT,
    items_processed INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    execution_log TEXT,
    next_scheduled_run TIMESTAMP,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== DOCUMENT MANAGEMENT =====

-- Document management with version control
CREATE TABLE document_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'client', 'loan', 'savings', etc.
    entity_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    storage_path VARCHAR(500),
    file_size BIGINT,
    checksum VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,
    previous_version_id UUID REFERENCES document_store(id),
    description TEXT,
    tags VARCHAR[],
    metadata JSONB,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id)
);

-- Document-based workflow tracking
CREATE TABLE document_workflow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES document_store(id),
    workflow_type VARCHAR(50) NOT NULL, -- 'approval', 'review', 'signature', etc.
    current_stage VARCHAR(50) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    assigned_to UUID REFERENCES app_user(id),
    due_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT document_workflow_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled'))
);

-- ===== AUDIT & COMPLIANCE =====

-- Advanced audit trail
CREATE TABLE enhanced_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'read', 'approve'
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES app_user(id),
    action_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    change_reason VARCHAR(255),
    is_system_generated BOOLEAN DEFAULT FALSE,
    session_id UUID,
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    requires_review BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES app_user(id),
    reviewed_at TIMESTAMP
);

-- AML/CFT transaction monitoring
CREATE TABLE aml_transaction_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    client_id UUID REFERENCES client(id),
    account_id UUID,
    detection_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    alert_type VARCHAR(100) NOT NULL, -- 'large_transaction', 'unusual_activity', etc.
    risk_score INTEGER,
    alert_status VARCHAR(20) NOT NULL DEFAULT 'new', -- new, investigating, closed, reported
    description TEXT,
    assigned_to UUID REFERENCES app_user(id),
    resolution VARCHAR(50),
    resolution_notes TEXT,
    resolution_time TIMESTAMP,
    resolved_by UUID REFERENCES app_user(id),
    is_sar_filed BOOLEAN DEFAULT FALSE,
    sar_reference VARCHAR(100),
    sar_filed_date DATE,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT aml_alert_status_check CHECK (alert_status IN ('new', 'investigating', 'closed', 'reported'))
);

-- ===== ENHANCED ACCOUNT STATEMENTS =====

-- Account statement configuration
CREATE TABLE account_statement_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'savings', 'loan', 'share', etc.
    statement_frequency account_statement_frequency NOT NULL,
    delivery_mode VARCHAR(20)[] NOT NULL, -- array of 'email', 'print', 'online', etc.
    include_zero_balance_accounts BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    next_generation_date DATE,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    CONSTRAINT account_statement_config_unique UNIQUE (tenant_id, account_type, statement_frequency)
);

-- Account statement generation log
CREATE TABLE account_statement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    client_id UUID REFERENCES client(id),
    account_id UUID NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    statement_date DATE NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    opening_balance DECIMAL(19,6) NOT NULL,
    closing_balance DECIMAL(19,6) NOT NULL,
    total_deposits DECIMAL(19,6) NOT NULL DEFAULT 0,
    total_withdrawals DECIMAL(19,6) NOT NULL DEFAULT 0,
    total_fees DECIMAL(19,6) NOT NULL DEFAULT 0,
    total_interest DECIMAL(19,6) NOT NULL DEFAULT 0,
    document_id UUID REFERENCES document_store(id),
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, delivered, failed
    delivery_date TIMESTAMP,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    CONSTRAINT account_statement_unique UNIQUE (account_id, period_start_date, period_end_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tenant management indexes
CREATE INDEX idx_tenant_status ON tenant_management.tenant(status);
CREATE INDEX idx_tenant_short_name ON tenant_management.tenant(short_name);

-- Customer management indexes
CREATE INDEX idx_enhanced_cif_client_id ON enhanced_cif(client_id);
CREATE INDEX idx_enhanced_cif_membership_number ON enhanced_cif(membership_number);
CREATE INDEX idx_enhanced_cif_member_status ON enhanced_cif(member_status);
CREATE INDEX idx_enhanced_cif_tenant_id ON enhanced_cif(tenant_id);

CREATE INDEX idx_member_relationship_primary ON member_relationship(primary_member_id);
CREATE INDEX idx_member_relationship_secondary ON member_relationship(secondary_member_id);
CREATE INDEX idx_member_relationship_tenant_id ON member_relationship(tenant_id);

-- KYC
CREATE INDEX idx_kyc_config_tenant_member_type ON kyc_configuration(tenant_id, member_type);

-- Security
CREATE INDEX idx_auth_log_user_id ON authentication_log(user_id);
CREATE INDEX idx_auth_log_auth_time ON authentication_log(auth_time);
CREATE INDEX idx_auth_log_auth_status ON authentication_log(auth_status);
CREATE INDEX idx_auth_log_tenant_id ON authentication_log(tenant_id);

CREATE INDEX idx_security_challenge_user_id ON security_challenge(user_id);
CREATE INDEX idx_security_challenge_tenant_id ON security_challenge(tenant_id);

-- Transaction indexes
CREATE INDEX idx_journal_entry_transaction_id ON journal_entry(transaction_id);
CREATE INDEX idx_journal_entry_account_id ON journal_entry(gl_account_id);
CREATE INDEX idx_journal_entry_transaction_date ON journal_entry(transaction_date);
CREATE INDEX idx_journal_entry_entity ON journal_entry(entity_type, entity_id);
CREATE INDEX idx_journal_entry_tenant_id ON journal_entry(tenant_id);

CREATE INDEX idx_transaction_batch_reference ON transaction_batch(batch_reference);
CREATE INDEX idx_transaction_batch_status ON transaction_batch(status);
CREATE INDEX idx_transaction_batch_tenant_id ON transaction_batch(tenant_id);

CREATE INDEX idx_transaction_batch_item_batch_id ON transaction_batch_item(batch_id);
CREATE INDEX idx_transaction_batch_item_account_no ON transaction_batch_item(account_no);
CREATE INDEX idx_transaction_batch_item_status ON transaction_batch_item(status);
CREATE INDEX idx_transaction_batch_item_tenant_id ON transaction_batch_item(tenant_id);

-- Notification indexes
CREATE INDEX idx_notification_template_key ON notification_template(template_key);
CREATE INDEX idx_notification_template_tenant_id ON notification_template(tenant_id);

CREATE INDEX idx_notification_client_id ON notification(client_id);
CREATE INDEX idx_notification_status ON notification(status);
CREATE INDEX idx_notification_channel ON notification(channel);
CREATE INDEX idx_notification_reference ON notification(reference_type, reference_id);
CREATE INDEX idx_notification_tenant_id ON notification(tenant_id);

-- Webhook indexes
CREATE INDEX idx_webhook_subscription_tenant_id ON webhook_subscription(tenant_id);
CREATE INDEX idx_webhook_subscription_is_active ON webhook_subscription(is_active);

CREATE INDEX idx_webhook_delivery_subscription_id ON webhook_delivery(subscription_id);
CREATE INDEX idx_webhook_delivery_status ON webhook_delivery(status);
CREATE INDEX idx_webhook_delivery_event_type ON webhook_delivery(event_type);
CREATE INDEX idx_webhook_delivery_tenant_id ON webhook_delivery(tenant_id);

-- CRON job indexes
CREATE INDEX idx_cron_job_definition_tenant_id ON cron_job_definition(tenant_id);
CREATE INDEX idx_cron_job_definition_is_active ON cron_job_definition(is_active);

CREATE INDEX idx_cron_job_execution_job_id ON cron_job_execution(job_definition_id);
CREATE INDEX idx_cron_job_execution_status ON cron_job_execution(status);
CREATE INDEX idx_cron_job_execution_tenant_id ON cron_job_execution(tenant_id);

-- Document management indexes
CREATE INDEX idx_document_store_entity ON document_store(entity_type, entity_id);
CREATE INDEX idx_document_store_tenant_id ON document_store(tenant_id);
CREATE INDEX idx_document_store_document_type ON document_store(document_type);
CREATE INDEX idx_document_store_is_current ON document_store(is_current_version);

CREATE INDEX idx_document_workflow_document_id ON document_workflow(document_id);
CREATE INDEX idx_document_workflow_status ON document_workflow(status);
CREATE INDEX idx_document_workflow_assigned_to ON document_workflow(assigned_to);
CREATE INDEX idx_document_workflow_tenant_id ON document_workflow(tenant_id);

-- Audit and compliance indexes
CREATE INDEX idx_enhanced_audit_log_entity ON enhanced_audit_log(entity_type, entity_id);
CREATE INDEX idx_enhanced_audit_log_action_time ON enhanced_audit_log(action_time);
CREATE INDEX idx_enhanced_audit_log_user_id ON enhanced_audit_log(user_id);
CREATE INDEX idx_enhanced_audit_log_tenant_id ON enhanced_audit_log(tenant_id);
CREATE INDEX idx_enhanced_audit_log_requires_review ON enhanced_audit_log(requires_review) WHERE requires_review = TRUE;

CREATE INDEX idx_aml_transaction_monitoring_client_id ON aml_transaction_monitoring(client_id);
CREATE INDEX idx_aml_transaction_monitoring_status ON aml_transaction_monitoring(alert_status);
CREATE INDEX idx_aml_transaction_monitoring_transaction_id ON aml_transaction_monitoring(transaction_id);
CREATE INDEX idx_aml_transaction_monitoring_tenant_id ON aml_transaction_monitoring(tenant_id);

-- Account statement indexes
CREATE INDEX idx_account_statement_config_tenant_id ON account_statement_config(tenant_id);
CREATE INDEX idx_account_statement_config_account_type ON account_statement_config(account_type);

CREATE INDEX idx_account_statement_client_id ON account_statement(client_id);
CREATE INDEX idx_account_statement_account_id ON account_statement(account_id);
CREATE INDEX idx_account_statement_period ON account_statement(period_start_date, period_end_date);
CREATE INDEX idx_account_statement_tenant_id ON account_statement(tenant_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update last_modified_date automatically
CREATE OR REPLACE FUNCTION update_last_modified_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_last_modified_date trigger to all tables with last_modified_date field
-- Note: In production, you would create these triggers for each table

-- Function to record audit trail
CREATE OR REPLACE FUNCTION record_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_entity_type VARCHAR(50);
    v_tenant_id UUID;
BEGIN
    -- Get current user ID from session variables (set by Hasura)
    BEGIN
        v_user_id := current_setting('hasura.user.id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Get tenant ID from session variables (set by Hasura)
    BEGIN
        v_tenant_id := current_setting('hasura.user.tenant_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_tenant_id := NULL;
    END;
    
    -- Set entity type based on table name
    v_entity_type := TG_TABLE_NAME;
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO enhanced_audit_log (
            tenant_id, action_type, entity_type, entity_id, user_id, 
            new_values, is_system_generated, severity
        ) VALUES (
            v_tenant_id, 'create', v_entity_type, NEW.id, v_user_id, 
            row_to_json(NEW), v_user_id IS NULL, 'info'
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only audit if there are actual changes
        IF NEW != OLD THEN
            INSERT INTO enhanced_audit_log (
                tenant_id, action_type, entity_type, entity_id, user_id, 
                old_values, new_values, is_system_generated, severity
            ) VALUES (
                v_tenant_id, 'update', v_entity_type, NEW.id, v_user_id, 
                row_to_json(OLD), row_to_json(NEW), v_user_id IS NULL, 'info'
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO enhanced_audit_log (
            tenant_id, action_type, entity_type, entity_id, user_id, 
            old_values, is_system_generated, severity
        ) VALUES (
            v_tenant_id, 'delete', v_entity_type, OLD.id, v_user_id, 
            row_to_json(OLD), v_user_id IS NULL, 'warning'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: In production, you would apply the record_audit_trail trigger to all important tables

-- Function to automatically assign tenant_id to new records
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if tenant_id is already set
    IF NEW.tenant_id IS NULL THEN
        -- Get tenant_id from session variables (set by Hasura)
        BEGIN
            NEW.tenant_id := current_setting('hasura.user.tenant_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'tenant_id is required but not set in session';
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: In production, you would apply the set_tenant_id trigger to all tables with tenant_id

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default tenant for development
INSERT INTO tenant_management.tenant (
    id, name, short_name, database_schema, domain, status
) VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'Default Credit Union', 
    'default', 
    'fineract_default', 
    'default.creditunion.tt', 
    'active'
)
ON CONFLICT DO NOTHING;

-- Insert system API quota for default tenant
INSERT INTO tenant_management.tenant_api_quota (
    tenant_id, daily_request_limit, monthly_request_limit, max_concurrent_connections, throttle_rate_per_minute
) VALUES (
    '11111111-1111-1111-1111-111111111111', 100000, 3000000, 200, 1000
)
ON CONFLICT DO NOTHING;

-- Insert default KYC requirements for Trinidad Credit Unions
INSERT INTO kyc_configuration (
    tenant_id, member_type, document_type, is_required, min_documents, verification_level, validity_period
) VALUES
    ('11111111-1111-1111-1111-111111111111', 'individual', 'national_id', TRUE, 1, 'standard', 60),
    ('11111111-1111-1111-1111-111111111111', 'individual', 'proof_of_address', TRUE, 1, 'standard', 6),
    ('11111111-1111-1111-1111-111111111111', 'individual', 'profile_photo', TRUE, 1, 'standard', 24),
    ('11111111-1111-1111-1111-111111111111', 'business', 'certificate_of_incorporation', TRUE, 1, 'enhanced', 120),
    ('11111111-1111-1111-1111-111111111111', 'business', 'business_license', TRUE, 1, 'enhanced', 12)
ON CONFLICT DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_template (
    tenant_id, template_key, notification_type, channel, subject_template, body_template
) VALUES
    ('11111111-1111-1111-1111-111111111111', 'account_created', 'account', 'email', 
     'Welcome to {{credit_union_name}} - Account Created', 
     'Dear {{member_name}},\n\nWelcome to {{credit_union_name}}! Your new account has been created successfully.\n\nAccount Number: {{account_number}}\n\nThank you for choosing us!\n\nRegards,\n{{credit_union_name}} Team'),
    
    ('11111111-1111-1111-1111-111111111111', 'loan_approved', 'loan', 'email', 
     'Your Loan Application has been Approved', 
     'Dear {{member_name}},\n\nCongratulations! Your loan application (Ref: {{loan_reference}}) has been approved for {{currency}} {{loan_amount}}.\n\nPlease log in to your account for further details.\n\nRegards,\n{{credit_union_name}} Team'),
     
    ('11111111-1111-1111-1111-111111111111', 'transaction_alert', 'transaction', 'sms', 
     NULL, 
     '{{credit_union_name}} alert: {{transaction_type}} of {{currency}} {{amount}} on account ending {{account_last_4}} at {{transaction_time}}. Balance: {{currency}} {{new_balance}}.')
ON CONFLICT DO NOTHING;

-- Insert default scheduled jobs
INSERT INTO cron_job_definition (
    tenant_id, job_key, job_name, cron_expression, handler_name, is_active
) VALUES
    ('11111111-1111-1111-1111-111111111111', 'EOD_PROCESSING', 'End of Day Processing', '0 0 * * *', 'EndOfDayProcessor', TRUE),
    ('11111111-1111-1111-1111-111111111111', 'INTEREST_POSTING', 'Interest Posting', '0 1 * * *', 'InterestPostingProcessor', TRUE),
    ('11111111-1111-1111-1111-111111111111', 'LOAN_OVERDUE_CHECKER', 'Loan Overdue Checker', '0 6 * * *', 'LoanOverdueProcessor', TRUE),
    ('11111111-1111-1111-1111-111111111111', 'MONTHLY_REPORTS', 'Monthly Reports Generation', '0 2 1 * *', 'MonthlyReportProcessor', TRUE)
ON CONFLICT DO NOTHING;

-- Insert default account statement configurations
INSERT INTO account_statement_config (
    tenant_id, account_type, statement_frequency, delivery_mode, include_zero_balance_accounts, is_active
) VALUES
    ('11111111-1111-1111-1111-111111111111', 'savings', 'monthly', ARRAY['email', 'online'], FALSE, TRUE),
    ('11111111-1111-1111-1111-111111111111', 'loan', 'monthly', ARRAY['email', 'online'], TRUE, TRUE),
    ('11111111-1111-1111-1111-111111111111', 'share', 'quarterly', ARRAY['email', 'print', 'online'], TRUE, TRUE)
ON CONFLICT DO NOTHING;