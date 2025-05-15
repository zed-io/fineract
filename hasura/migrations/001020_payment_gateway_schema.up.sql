-- Migration file for Fineract Payment Gateway Integration
-- This creates the necessary tables for external payment gateway integration

-- Set search path to fineract_default schema
SET search_path TO fineract_default;

-- Create payment gateway provider table
CREATE TABLE IF NOT EXISTS payment_gateway_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  provider_type VARCHAR(50) NOT NULL, -- 'paypal', 'stripe', 'authorize_net', 'mpesa', 'paytm', etc.
  configuration JSONB NOT NULL,
  webhook_url VARCHAR(500),
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  supports_refunds BOOLEAN NOT NULL DEFAULT TRUE,
  supports_partial_payments BOOLEAN NOT NULL DEFAULT TRUE,
  supports_recurring_payments BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create payment gateway transaction table
CREATE TABLE IF NOT EXISTS payment_gateway_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES payment_gateway_provider(id),
  transaction_type VARCHAR(50) NOT NULL, -- 'payment', 'refund', 'authorization', 'capture', 'void'
  external_id VARCHAR(255), -- ID in the external payment system
  amount DECIMAL(19, 6) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded', 'authorized', 'cancelled'
  error_message TEXT,
  payment_method VARCHAR(50), -- 'credit_card', 'debit_card', 'bank_transfer', 'mobile_money', etc.
  payment_details JSONB,
  reference_number VARCHAR(100),
  client_id UUID REFERENCES m_client(id),
  loan_id UUID REFERENCES m_loan(id),
  savings_account_id UUID REFERENCES m_savings_account(id),
  callback_url VARCHAR(500),
  metadata JSONB,
  request_payload JSONB,
  response_payload JSONB,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP
);

-- Create payment gateway webhook events table
CREATE TABLE IF NOT EXISTS payment_gateway_webhook_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES payment_gateway_provider(id),
  event_type VARCHAR(100) NOT NULL,
  external_id VARCHAR(255),
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'received', 'processed', 'failed'
  related_transaction_id UUID REFERENCES payment_gateway_transaction(id),
  error_message TEXT,
  processing_attempts INT NOT NULL DEFAULT 0,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP
);

-- Create recurring payment configuration table
CREATE TABLE IF NOT EXISTS payment_gateway_recurring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES payment_gateway_provider(id),
  client_id UUID REFERENCES m_client(id),
  external_subscription_id VARCHAR(255),
  payment_method_token VARCHAR(255),
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', etc.
  amount DECIMAL(19, 6) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  status VARCHAR(50) NOT NULL, -- 'active', 'paused', 'cancelled', 'completed'
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create payment method tokens table (for saved payment methods)
CREATE TABLE IF NOT EXISTS payment_gateway_payment_method (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES payment_gateway_provider(id),
  client_id UUID NOT NULL REFERENCES m_client(id),
  payment_method_type VARCHAR(50) NOT NULL, -- 'credit_card', 'bank_account', 'mobile_money'
  token VARCHAR(255) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  masked_number VARCHAR(50), -- Last 4 digits of card, or masked account
  expiry_date VARCHAR(7), -- MM/YYYY format for cards
  card_type VARCHAR(50), -- For card payments
  holder_name VARCHAR(100),
  billing_address JSONB,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP,
  UNIQUE(provider_id, client_id, token)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transaction_provider_id
  ON payment_gateway_transaction(provider_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transaction_external_id
  ON payment_gateway_transaction(external_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transaction_client_id
  ON payment_gateway_transaction(client_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transaction_loan_id
  ON payment_gateway_transaction(loan_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transaction_savings_account_id
  ON payment_gateway_transaction(savings_account_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transaction_status
  ON payment_gateway_transaction(status);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_webhook_provider_id
  ON payment_gateway_webhook_event(provider_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_webhook_external_id
  ON payment_gateway_webhook_event(external_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_webhook_status
  ON payment_gateway_webhook_event(status);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_recurring_provider_id
  ON payment_gateway_recurring_config(provider_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_recurring_client_id
  ON payment_gateway_recurring_config(client_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_gateway_payment_method_client_id
  ON payment_gateway_payment_method(client_id);

-- Add trigger for updating timestamps
CREATE TRIGGER payment_gateway_provider_update_timestamp
BEFORE UPDATE ON payment_gateway_provider
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

CREATE TRIGGER payment_gateway_transaction_update_timestamp
BEFORE UPDATE ON payment_gateway_transaction
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER payment_gateway_webhook_update_timestamp
BEFORE UPDATE ON payment_gateway_webhook_event
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER payment_gateway_recurring_update_timestamp
BEFORE UPDATE ON payment_gateway_recurring_config
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

CREATE TRIGGER payment_gateway_payment_method_update_timestamp
BEFORE UPDATE ON payment_gateway_payment_method
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create update_timestamp function if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp') THEN
    CREATE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END
$$;