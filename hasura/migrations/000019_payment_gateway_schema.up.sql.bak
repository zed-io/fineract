-- Payment Gateway Integration Schema for Fineract
-- This schema adds payment processing capabilities to the core banking system,
-- supporting multiple payment gateways and various payment methods.

-- Create payment_gateway schema (segregated for security and compliance)
CREATE SCHEMA IF NOT EXISTS payment_gateway;

-- Payment Gateway Provider definition
CREATE TABLE payment_gateway.provider (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    api_key VARCHAR(255) NULL, -- Encrypted in application layer
    api_secret VARCHAR(255) NULL, -- Encrypted in application layer
    base_url VARCHAR(255) NOT NULL,
    webhook_secret VARCHAR(255) NULL, -- For validating incoming webhooks
    checkout_url_template VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    supports_recurring BOOLEAN NOT NULL DEFAULT false,
    supports_refunds BOOLEAN NOT NULL DEFAULT false,
    supports_partial_payments BOOLEAN NOT NULL DEFAULT false,
    transaction_fee_percentage DECIMAL(5,2) NULL,
    transaction_fee_flat DECIMAL(10,2) NULL,
    webhook_url VARCHAR(255) NULL,
    config JSONB NULL, -- Provider-specific configuration
    created_date TIMESTAMP NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    last_modified_date TIMESTAMP NULL,
    last_modified_by UUID NULL,
    CONSTRAINT provider_name_unique UNIQUE (name)
);

-- Payment Method Types (CARD, BANK_TRANSFER, WALLET, etc.)
CREATE TABLE payment_gateway.payment_method_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT payment_method_type_code_unique UNIQUE (code)
);

-- Payment Methods supported by each Provider
CREATE TABLE payment_gateway.provider_payment_method (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    payment_method_type_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    fee_percentage DECIMAL(5,2) NULL, -- Override provider default if needed
    fee_flat DECIMAL(10,2) NULL, -- Override provider default if needed
    config JSONB NULL, -- Method-specific configuration for this provider
    CONSTRAINT provider_payment_method_unique UNIQUE (provider_id, payment_method_type_id),
    CONSTRAINT fk_provider_payment_method_provider FOREIGN KEY (provider_id) 
        REFERENCES payment_gateway.provider(id) ON DELETE CASCADE,
    CONSTRAINT fk_provider_payment_method_type FOREIGN KEY (payment_method_type_id) 
        REFERENCES payment_gateway.payment_method_type(id) ON DELETE CASCADE
);

-- Payment Transaction Types
CREATE TYPE payment_gateway.transaction_type AS ENUM (
    'PAYMENT', 'REFUND', 'AUTHORIZATION', 'CAPTURE', 'VOID', 'VERIFICATION'
);

-- Payment Transaction Statuses
CREATE TYPE payment_gateway.transaction_status AS ENUM (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DECLINED', 'REFUNDED', 
    'PARTIALLY_REFUNDED', 'AUTHORIZED', 'CAPTURED', 'VOIDED', 'EXPIRED'
);

-- Payment Transaction Entity Types
CREATE TYPE payment_gateway.entity_type AS ENUM (
    'LOAN', 'SAVINGS', 'CLIENT', 'SHARE', 'FIXED_DEPOSIT', 'RECURRING_DEPOSIT'
);

-- Payment Transactions
CREATE TABLE payment_gateway.transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(100) NOT NULL, -- Our internal unique reference
    provider_id UUID NOT NULL,
    provider_transaction_id VARCHAR(255) NULL, -- ID from payment provider
    payment_method_type_id UUID NOT NULL,
    amount DECIMAL(19,6) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    transaction_type payment_gateway.transaction_type NOT NULL,
    status payment_gateway.transaction_status NOT NULL DEFAULT 'PENDING',
    entity_type payment_gateway.entity_type NULL,
    entity_id UUID NULL, -- ID of the loan, savings account, etc.
    tenant_id VARCHAR(100) NOT NULL, -- For multi-tenancy
    client_id UUID NULL, -- Can be derived from entity in most cases
    payer_name VARCHAR(255) NULL,
    payer_email VARCHAR(255) NULL,
    payer_phone VARCHAR(50) NULL,
    payment_date TIMESTAMP NULL, -- When payment was completed
    expiration_date TIMESTAMP NULL, -- For pending payments
    checkout_url VARCHAR(1000) NULL, -- Redirect URL for web checkout
    checkout_token VARCHAR(255) NULL, -- Token for checkout session
    receipt_url VARCHAR(1000) NULL, -- URL to receipt/invoice
    description TEXT NULL, -- Payment description
    metadata JSONB NULL, -- Additional payment info
    fee_amount DECIMAL(19,6) NULL, -- Total fees charged
    net_amount DECIMAL(19,6) NULL, -- Amount after fees
    refunded_amount DECIMAL(19,6) NULL DEFAULT 0, -- For partial refunds
    error_code VARCHAR(100) NULL, -- Provider error code if failed
    error_message TEXT NULL, -- Error details if failed
    callback_success_url VARCHAR(1000) NULL, -- Redirect after successful payment
    callback_cancel_url VARCHAR(1000) NULL, -- Redirect after canceled payment
    ip_address VARCHAR(50) NULL, -- Client IP for fraud detection
    user_agent VARCHAR(500) NULL, -- Client browser info
    is_test BOOLEAN NOT NULL DEFAULT false, -- Test mode flag
    created_date TIMESTAMP NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    last_modified_date TIMESTAMP NULL,
    last_modified_by UUID NULL,
    CONSTRAINT transaction_reference_unique UNIQUE (reference_id),
    CONSTRAINT fk_transaction_provider FOREIGN KEY (provider_id) 
        REFERENCES payment_gateway.provider(id),
    CONSTRAINT fk_transaction_payment_method FOREIGN KEY (payment_method_type_id) 
        REFERENCES payment_gateway.payment_method_type(id)
);

-- Create index on common query patterns
CREATE INDEX idx_transaction_provider_id ON payment_gateway.transaction(provider_id);
CREATE INDEX idx_transaction_client_id ON payment_gateway.transaction(client_id);
CREATE INDEX idx_transaction_entity ON payment_gateway.transaction(entity_type, entity_id);
CREATE INDEX idx_transaction_status ON payment_gateway.transaction(status);
CREATE INDEX idx_transaction_created_date ON payment_gateway.transaction(created_date);
CREATE INDEX idx_transaction_payment_date ON payment_gateway.transaction(payment_date);
CREATE INDEX idx_transaction_tenant_id ON payment_gateway.transaction(tenant_id);

-- Payment Transaction Events/Webhooks
CREATE TABLE payment_gateway.transaction_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date TIMESTAMP NOT NULL DEFAULT now(),
    provider_event_id VARCHAR(255) NULL,
    previous_status payment_gateway.transaction_status NULL,
    new_status payment_gateway.transaction_status NULL,
    raw_payload JSONB NOT NULL, -- Raw webhook data
    processed BOOLEAN NOT NULL DEFAULT false,
    processing_errors TEXT NULL,
    CONSTRAINT fk_transaction_event_transaction FOREIGN KEY (transaction_id) 
        REFERENCES payment_gateway.transaction(id) ON DELETE CASCADE
);

-- Create index on transaction events
CREATE INDEX idx_transaction_event_transaction_id ON payment_gateway.transaction_event(transaction_id);
CREATE INDEX idx_transaction_event_event_date ON payment_gateway.transaction_event(event_date);
CREATE INDEX idx_transaction_event_processed ON payment_gateway.transaction_event(processed);

-- Saved Payment Methods (tokenized for repeat payments)
CREATE TABLE payment_gateway.saved_payment_method (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    payment_method_type_id UUID NOT NULL,
    client_id UUID NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL, -- Tokenized payment method
    is_default BOOLEAN NOT NULL DEFAULT false,
    nickname VARCHAR(100) NULL, -- User's name for this method
    last_four VARCHAR(4) NULL, -- Last 4 digits for cards
    expiry_month VARCHAR(2) NULL, -- For cards
    expiry_year VARCHAR(4) NULL, -- For cards
    card_brand VARCHAR(50) NULL, -- For cards (VISA, MASTERCARD, etc.)
    bank_name VARCHAR(100) NULL, -- For bank accounts
    bank_account_last_four VARCHAR(4) NULL, -- For bank accounts
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    last_modified_date TIMESTAMP NULL,
    last_modified_by UUID NULL,
    last_used_date TIMESTAMP NULL,
    metadata JSONB NULL, -- Additional payment method info
    CONSTRAINT fk_saved_payment_method_provider FOREIGN KEY (provider_id) 
        REFERENCES payment_gateway.provider(id),
    CONSTRAINT fk_saved_payment_method_type FOREIGN KEY (payment_method_type_id) 
        REFERENCES payment_gateway.payment_method_type(id)
);

-- Index on saved payment methods
CREATE INDEX idx_saved_payment_method_client_id ON payment_gateway.saved_payment_method(client_id);
CREATE INDEX idx_saved_payment_method_tenant_id ON payment_gateway.saved_payment_method(tenant_id);

-- Recurring Payment Plans
CREATE TABLE payment_gateway.recurring_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    provider_id UUID NOT NULL,
    frequency VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY, etc.
    interval_count INT NOT NULL DEFAULT 1, -- Every X days/weeks/months
    total_cycles INT NULL, -- NULL for unlimited
    amount DECIMAL(19,6) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    CONSTRAINT fk_recurring_plan_provider FOREIGN KEY (provider_id) 
        REFERENCES payment_gateway.provider(id)
);

-- Recurring Payment Subscriptions
CREATE TABLE payment_gateway.subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    client_id UUID NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    saved_payment_method_id UUID NOT NULL,
    provider_subscription_id VARCHAR(255) NULL,
    entity_type payment_gateway.entity_type NULL,
    entity_id UUID NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NULL,
    next_billing_date TIMESTAMP NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    current_cycle INT NOT NULL DEFAULT 0,
    total_cycles INT NULL,
    description TEXT NULL,
    metadata JSONB NULL,
    created_date TIMESTAMP NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    last_modified_date TIMESTAMP NULL,
    last_modified_by UUID NULL,
    CONSTRAINT fk_subscription_plan FOREIGN KEY (plan_id) 
        REFERENCES payment_gateway.recurring_plan(id),
    CONSTRAINT fk_subscription_payment_method FOREIGN KEY (saved_payment_method_id) 
        REFERENCES payment_gateway.saved_payment_method(id)
);

-- Index on subscriptions
CREATE INDEX idx_subscription_client_id ON payment_gateway.subscription(client_id);
CREATE INDEX idx_subscription_plan_id ON payment_gateway.subscription(plan_id);
CREATE INDEX idx_subscription_tenant_id ON payment_gateway.subscription(tenant_id);
CREATE INDEX idx_subscription_entity ON payment_gateway.subscription(entity_type, entity_id);
CREATE INDEX idx_subscription_next_billing ON payment_gateway.subscription(next_billing_date);

-- Subscription Payment History
CREATE TABLE payment_gateway.subscription_payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    cycle_number INT NOT NULL,
    billing_date TIMESTAMP NOT NULL,
    CONSTRAINT fk_subscription_payment_subscription FOREIGN KEY (subscription_id) 
        REFERENCES payment_gateway.subscription(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscription_payment_transaction FOREIGN KEY (transaction_id) 
        REFERENCES payment_gateway.transaction(id)
);

-- Index on subscription payments
CREATE INDEX idx_subscription_payment_subscription_id ON payment_gateway.subscription_payment(subscription_id);
CREATE INDEX idx_subscription_payment_billing_date ON payment_gateway.subscription_payment(billing_date);

-- Payment Gateway Audit Log (for security and compliance)
CREATE TABLE payment_gateway.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    previous_state JSONB NULL,
    new_state JSONB NULL,
    action_date TIMESTAMP NOT NULL DEFAULT now(),
    action_by UUID NOT NULL,
    ip_address VARCHAR(50) NULL,
    tenant_id VARCHAR(100) NOT NULL
);

-- Index on audit log
CREATE INDEX idx_audit_log_entity ON payment_gateway.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action_date ON payment_gateway.audit_log(action_date);
CREATE INDEX idx_audit_log_tenant_id ON payment_gateway.audit_log(tenant_id);

-- Payment Reconciliation Records (for accounting reconciliation)
CREATE TABLE payment_gateway.reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    reconciliation_date TIMESTAMP NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    total_transactions INT NOT NULL,
    total_amount DECIMAL(19,6) NOT NULL,
    total_fees DECIMAL(19,6) NOT NULL,
    total_refunds DECIMAL(19,6) NOT NULL,
    reconciled_amount DECIMAL(19,6) NOT NULL,
    is_balanced BOOLEAN NOT NULL DEFAULT false,
    discrepancy_amount DECIMAL(19,6) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes TEXT NULL,
    created_by UUID NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT now(),
    last_modified_date TIMESTAMP NULL,
    last_modified_by UUID NULL,
    CONSTRAINT fk_reconciliation_provider FOREIGN KEY (provider_id) 
        REFERENCES payment_gateway.provider(id)
);

-- Index on reconciliation
CREATE INDEX idx_reconciliation_provider_id ON payment_gateway.reconciliation(provider_id);
CREATE INDEX idx_reconciliation_date ON payment_gateway.reconciliation(reconciliation_date);
CREATE INDEX idx_reconciliation_status ON payment_gateway.reconciliation(status);

-- Payment Gateway Features Configuration (for enabling/disabling features per tenant)
CREATE TABLE payment_gateway.tenant_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    enabled_features JSONB NOT NULL DEFAULT '{}',
    default_provider_id UUID NULL,
    default_currency VARCHAR(3) NOT NULL DEFAULT 'TTD',
    checkout_settings JSONB NULL,
    notification_settings JSONB NULL,
    created_date TIMESTAMP NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    last_modified_date TIMESTAMP NULL,
    last_modified_by UUID NULL,
    CONSTRAINT tenant_config_tenant_unique UNIQUE (tenant_id),
    CONSTRAINT fk_tenant_config_provider FOREIGN KEY (default_provider_id) 
        REFERENCES payment_gateway.provider(id)
);

-- Views for reporting and dashboard
CREATE OR REPLACE VIEW payment_gateway.transaction_summary AS
SELECT 
    t.tenant_id,
    date_trunc('day', t.created_date) AS day,
    t.provider_id,
    p.name AS provider_name,
    t.payment_method_type_id,
    pm.name AS payment_method_name,
    t.status,
    t.entity_type,
    COUNT(*) AS transaction_count,
    SUM(t.amount) AS total_amount,
    SUM(t.fee_amount) AS total_fees,
    SUM(t.refunded_amount) AS total_refunds,
    AVG(CASE WHEN t.status = 'COMPLETED' THEN 
        EXTRACT(EPOCH FROM (t.payment_date - t.created_date)) 
        ELSE NULL END) AS avg_completion_time_seconds
FROM payment_gateway.transaction t
JOIN payment_gateway.provider p ON t.provider_id = p.id
JOIN payment_gateway.payment_method_type pm ON t.payment_method_type_id = pm.id
GROUP BY 
    t.tenant_id,
    date_trunc('day', t.created_date),
    t.provider_id,
    p.name,
    t.payment_method_type_id,
    pm.name,
    t.status,
    t.entity_type;

-- Create a view for transaction data that needs to be accessible from other schemas
CREATE OR REPLACE VIEW payment_gateway.transaction_data AS
SELECT 
    t.id,
    t.reference_id,
    t.provider_id,
    p.name AS provider_name,
    t.provider_transaction_id,
    t.payment_method_type_id,
    pm.name AS payment_method_name,
    t.amount,
    t.currency_code,
    t.transaction_type,
    t.status,
    t.entity_type,
    t.entity_id,
    t.tenant_id,
    t.client_id,
    t.payer_name,
    t.payer_email,
    t.payer_phone,
    t.payment_date,
    t.expiration_date,
    t.description,
    t.fee_amount,
    t.net_amount,
    t.refunded_amount,
    t.error_code,
    t.error_message,
    t.is_test,
    t.created_date,
    t.created_by,
    t.last_modified_date,
    t.last_modified_by
FROM payment_gateway.transaction t
JOIN payment_gateway.provider p ON t.provider_id = p.id
JOIN payment_gateway.payment_method_type pm ON t.payment_method_type_id = pm.id;

-- Seed default data for payment method types
INSERT INTO payment_gateway.payment_method_type (code, name, description, is_active)
VALUES 
    ('CARD', 'Credit/Debit Card', 'Payment using credit or debit card', true),
    ('BANK_TRANSFER', 'Bank Transfer', 'Direct bank transfer or wire transfer', true),
    ('WALLET', 'Digital Wallet', 'Payment using digital wallet services', true),
    ('CASH', 'Cash Payment', 'Cash payment at branch or agent', true),
    ('MOBILE_MONEY', 'Mobile Money', 'Payment using mobile money services', true);

-- Create functions for payment processing

-- Function to create a new payment transaction
CREATE OR REPLACE FUNCTION payment_gateway.create_transaction(
    p_provider_id UUID,
    p_payment_method_type_id UUID,
    p_amount DECIMAL,
    p_currency_code VARCHAR,
    p_transaction_type payment_gateway.transaction_type,
    p_entity_type payment_gateway.entity_type,
    p_entity_id UUID,
    p_tenant_id VARCHAR,
    p_client_id UUID,
    p_payer_name VARCHAR,
    p_payer_email VARCHAR,
    p_payer_phone VARCHAR,
    p_description TEXT,
    p_metadata JSONB,
    p_callback_success_url VARCHAR,
    p_callback_cancel_url VARCHAR,
    p_created_by UUID,
    p_is_test BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
    v_reference_id VARCHAR;
    v_transaction_id UUID;
BEGIN
    -- Generate a unique reference ID (simple implementation)
    v_reference_id := CONCAT(
        'PAY', 
        to_char(now(), 'YYYYMMDD'),
        '-',
        FLOOR(random() * 1000000)::VARCHAR
    );
    
    -- Create the transaction
    INSERT INTO payment_gateway.transaction (
        reference_id,
        provider_id,
        payment_method_type_id,
        amount,
        currency_code,
        transaction_type,
        status,
        entity_type,
        entity_id,
        tenant_id,
        client_id,
        payer_name,
        payer_email,
        payer_phone,
        description,
        metadata,
        callback_success_url,
        callback_cancel_url,
        created_by,
        is_test
    ) VALUES (
        v_reference_id,
        p_provider_id,
        p_payment_method_type_id,
        p_amount,
        p_currency_code,
        p_transaction_type,
        'PENDING',
        p_entity_type,
        p_entity_id,
        p_tenant_id,
        p_client_id,
        p_payer_name,
        p_payer_email,
        p_payer_phone,
        p_description,
        p_metadata,
        p_callback_success_url,
        p_callback_cancel_url,
        p_created_by,
        p_is_test
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update transaction status
CREATE OR REPLACE FUNCTION payment_gateway.update_transaction_status(
    p_transaction_id UUID,
    p_status payment_gateway.transaction_status,
    p_provider_transaction_id VARCHAR DEFAULT NULL,
    p_payment_date TIMESTAMP DEFAULT NULL,
    p_fee_amount DECIMAL DEFAULT NULL,
    p_error_code VARCHAR DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_modified_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_previous_status payment_gateway.transaction_status;
BEGIN
    -- Get current status for event logging
    SELECT status INTO v_previous_status 
    FROM payment_gateway.transaction 
    WHERE id = p_transaction_id;
    
    -- Update transaction
    UPDATE payment_gateway.transaction SET
        status = p_status,
        provider_transaction_id = COALESCE(p_provider_transaction_id, provider_transaction_id),
        payment_date = CASE 
            WHEN p_status = 'COMPLETED' AND payment_date IS NULL THEN COALESCE(p_payment_date, now())
            ELSE COALESCE(p_payment_date, payment_date)
        END,
        fee_amount = COALESCE(p_fee_amount, fee_amount),
        net_amount = CASE 
            WHEN p_fee_amount IS NOT NULL THEN amount - p_fee_amount
            WHEN fee_amount IS NOT NULL THEN amount - fee_amount
            ELSE NULL
        END,
        error_code = COALESCE(p_error_code, error_code),
        error_message = COALESCE(p_error_message, error_message),
        last_modified_date = now(),
        last_modified_by = p_modified_by
    WHERE id = p_transaction_id;
    
    -- Log the status change
    IF v_previous_status IS DISTINCT FROM p_status THEN
        INSERT INTO payment_gateway.transaction_event (
            transaction_id,
            event_type,
            previous_status,
            new_status,
            raw_payload,
            processed
        ) VALUES (
            p_transaction_id,
            'STATUS_CHANGE',
            v_previous_status,
            p_status,
            jsonb_build_object(
                'modified_by', p_modified_by,
                'provider_transaction_id', p_provider_transaction_id,
                'payment_date', p_payment_date,
                'fee_amount', p_fee_amount,
                'error_code', p_error_code,
                'error_message', p_error_message
            ),
            true
        );
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to process a webhook/event
CREATE OR REPLACE FUNCTION payment_gateway.process_webhook_event(
    p_provider_id UUID,
    p_event_type VARCHAR,
    p_provider_event_id VARCHAR,
    p_provider_transaction_id VARCHAR,
    p_transaction_status VARCHAR,
    p_raw_payload JSONB
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_event_id UUID;
    v_status payment_gateway.transaction_status;
    v_previous_status payment_gateway.transaction_status;
BEGIN
    -- Find the transaction by provider transaction ID
    SELECT id, status INTO v_transaction_id, v_previous_status
    FROM payment_gateway.transaction
    WHERE provider_id = p_provider_id AND provider_transaction_id = p_provider_transaction_id;
    
    -- If transaction not found, create an event for reconciliation
    IF v_transaction_id IS NULL THEN
        INSERT INTO payment_gateway.transaction_event (
            transaction_id,
            event_type,
            provider_event_id,
            raw_payload,
            processed,
            processing_errors
        ) VALUES (
            NULL, -- Will be linked later
            p_event_type,
            p_provider_event_id,
            p_raw_payload,
            false,
            'Transaction not found'
        ) RETURNING id INTO v_event_id;
        
        RETURN v_event_id;
    END IF;
    
    -- Map the provider status to our status enum
    CASE p_transaction_status
        WHEN 'succeeded', 'success', 'completed', 'approved' THEN v_status := 'COMPLETED'::payment_gateway.transaction_status;
        WHEN 'pending', 'in_progress', 'processing' THEN v_status := 'PROCESSING'::payment_gateway.transaction_status;
        WHEN 'failed', 'failure', 'error' THEN v_status := 'FAILED'::payment_gateway.transaction_status;
        WHEN 'declined', 'rejected' THEN v_status := 'DECLINED'::payment_gateway.transaction_status;
        WHEN 'refunded' THEN v_status := 'REFUNDED'::payment_gateway.transaction_status;
        WHEN 'partially_refunded' THEN v_status := 'PARTIALLY_REFUNDED'::payment_gateway.transaction_status;
        WHEN 'canceled', 'cancelled' THEN v_status := 'FAILED'::payment_gateway.transaction_status;
        WHEN 'expired' THEN v_status := 'EXPIRED'::payment_gateway.transaction_status;
        ELSE v_status := v_previous_status; -- Keep existing status if mapping not found
    END CASE;
    
    -- Log the event
    INSERT INTO payment_gateway.transaction_event (
        transaction_id,
        event_type,
        provider_event_id,
        previous_status,
        new_status,
        raw_payload,
        processed
    ) VALUES (
        v_transaction_id,
        p_event_type,
        p_provider_event_id,
        v_previous_status,
        v_status,
        p_raw_payload,
        true
    ) RETURNING id INTO v_event_id;
    
    -- Update transaction status if changed
    IF v_previous_status IS DISTINCT FROM v_status THEN
        UPDATE payment_gateway.transaction SET
            status = v_status,
            payment_date = CASE WHEN v_status = 'COMPLETED' AND payment_date IS NULL THEN now() ELSE payment_date END,
            last_modified_date = now()
        WHERE id = v_transaction_id;
    END IF;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a recurring subscription
CREATE OR REPLACE FUNCTION payment_gateway.create_subscription(
    p_plan_id UUID,
    p_client_id UUID,
    p_tenant_id VARCHAR,
    p_saved_payment_method_id UUID,
    p_entity_type payment_gateway.entity_type,
    p_entity_id UUID,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_description TEXT,
    p_metadata JSONB,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
    v_plan_interval VARCHAR;
    v_plan_interval_count INT;
    v_next_billing_date TIMESTAMP;
BEGIN
    -- Get plan details
    SELECT frequency, interval_count INTO v_plan_interval, v_plan_interval_count
    FROM payment_gateway.recurring_plan
    WHERE id = p_plan_id;
    
    -- Calculate next billing date
    CASE v_plan_interval
        WHEN 'DAILY' THEN v_next_billing_date := p_start_date + (v_plan_interval_count || ' days')::INTERVAL;
        WHEN 'WEEKLY' THEN v_next_billing_date := p_start_date + (v_plan_interval_count || ' weeks')::INTERVAL;
        WHEN 'MONTHLY' THEN v_next_billing_date := p_start_date + (v_plan_interval_count || ' months')::INTERVAL;
        WHEN 'YEARLY' THEN v_next_billing_date := p_start_date + (v_plan_interval_count || ' years')::INTERVAL;
        ELSE v_next_billing_date := p_start_date + '1 month'::INTERVAL; -- Default to monthly
    END CASE;
    
    -- Create the subscription
    INSERT INTO payment_gateway.subscription (
        plan_id,
        client_id,
        tenant_id,
        saved_payment_method_id,
        entity_type,
        entity_id,
        start_date,
        end_date,
        next_billing_date,
        status,
        description,
        metadata,
        created_by
    ) VALUES (
        p_plan_id,
        p_client_id,
        p_tenant_id,
        p_saved_payment_method_id,
        p_entity_type,
        p_entity_id,
        p_start_date,
        p_end_date,
        v_next_billing_date,
        'ACTIVE',
        p_description,
        p_metadata,
        p_created_by
    ) RETURNING id INTO v_subscription_id;
    
    RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Create database triggers for audit logging

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION payment_gateway.audit_log_trigger() RETURNS TRIGGER AS $$
DECLARE
    v_action_type VARCHAR(50);
    v_entity_type VARCHAR(50);
    v_tenant_id VARCHAR(100);
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'CREATE';
        v_tenant_id := NEW.tenant_id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action_type := 'UPDATE';
        v_tenant_id := NEW.tenant_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'DELETE';
        v_tenant_id := OLD.tenant_id;
    END IF;
    
    v_entity_type := TG_TABLE_NAME;
    
    INSERT INTO payment_gateway.audit_log (
        action_type,
        entity_type,
        entity_id,
        previous_state,
        new_state,
        action_date,
        action_by,
        tenant_id
    ) VALUES (
        v_action_type,
        v_entity_type,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN NULL
            ELSE to_jsonb(OLD)
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN NULL
            ELSE to_jsonb(NEW)
        END,
        now(),
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.last_modified_by
            ELSE COALESCE(NEW.last_modified_by, NEW.created_by)
        END,
        v_tenant_id
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for main tables
CREATE TRIGGER transaction_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON payment_gateway.transaction
FOR EACH ROW EXECUTE FUNCTION payment_gateway.audit_log_trigger();

CREATE TRIGGER saved_payment_method_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON payment_gateway.saved_payment_method
FOR EACH ROW EXECUTE FUNCTION payment_gateway.audit_log_trigger();

CREATE TRIGGER subscription_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON payment_gateway.subscription
FOR EACH ROW EXECUTE FUNCTION payment_gateway.audit_log_trigger();

-- Add RBAC function
CREATE OR REPLACE FUNCTION payment_gateway.check_tenant_access() RETURNS TRIGGER AS $$
BEGIN
    -- Check if the current user has access to the tenant
    IF current_setting('hasura.user.x-hasura-tenant-id', TRUE) IS NULL THEN
        -- Super admin or system process, allow access
        RETURN NEW;
    ELSIF NEW.tenant_id != current_setting('hasura.user.x-hasura-tenant-id', TRUE) THEN
        RAISE EXCEPTION 'Access denied to tenant: %', NEW.tenant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply RBAC triggers
CREATE TRIGGER transaction_tenant_check_trigger
BEFORE INSERT OR UPDATE ON payment_gateway.transaction
FOR EACH ROW EXECUTE FUNCTION payment_gateway.check_tenant_access();

CREATE TRIGGER saved_payment_method_tenant_check_trigger
BEFORE INSERT OR UPDATE ON payment_gateway.saved_payment_method
FOR EACH ROW EXECUTE FUNCTION payment_gateway.check_tenant_access();

CREATE TRIGGER subscription_tenant_check_trigger
BEFORE INSERT OR UPDATE ON payment_gateway.subscription
FOR EACH ROW EXECUTE FUNCTION payment_gateway.check_tenant_access();