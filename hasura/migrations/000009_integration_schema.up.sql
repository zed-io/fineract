-- Migration file for Fineract integration capabilities
-- This creates the necessary tables for webhooks, API clients, and integration features

-- Create Schema for integration objects
SET search_path TO fineract_default;

-- Create webhook configuration table
CREATE TABLE IF NOT EXISTS integration_webhook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
  content_type VARCHAR(100) NOT NULL DEFAULT 'application/json',
  headers JSONB,
  payload_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  retry_count INTEGER NOT NULL DEFAULT 3,
  retry_interval INTEGER NOT NULL DEFAULT 60,  -- in seconds
  timeout INTEGER NOT NULL DEFAULT 30,  -- in seconds
  secret_key TEXT,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP,
  UNIQUE(name, event_type)
);

-- Create webhook event history table
CREATE TABLE IF NOT EXISTS integration_webhook_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES integration_webhook(id),
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  execution_time_ms INTEGER,
  status VARCHAR(20) NOT NULL,  -- 'success', 'failed', 'pending', 'retrying'
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_time TIMESTAMP,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP
);

-- Create API client registration table
CREATE TABLE IF NOT EXISTS integration_api_client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  client_id VARCHAR(100) NOT NULL UNIQUE,
  client_secret TEXT NOT NULL,
  redirect_uris TEXT[],
  allowed_grant_types TEXT[] NOT NULL,
  access_token_validity INTEGER NOT NULL DEFAULT 3600,  -- in seconds
  refresh_token_validity INTEGER NOT NULL DEFAULT 86400,  -- in seconds
  scope TEXT[],
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create API access token table
CREATE TABLE IF NOT EXISTS integration_access_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES integration_api_client(id),
  user_id UUID REFERENCES m_appuser(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  authentication JSONB,
  refresh_token VARCHAR(255) UNIQUE,
  token_type VARCHAR(50) NOT NULL DEFAULT 'Bearer',
  scope TEXT[],
  expires_at TIMESTAMP NOT NULL,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create data export configuration table
CREATE TABLE IF NOT EXISTS integration_export_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  entity_type VARCHAR(100) NOT NULL,
  export_format VARCHAR(20) NOT NULL,  -- 'csv', 'json', 'xml'
  field_mapping JSONB,
  filter_criteria JSONB,
  schedule VARCHAR(100),
  last_executed_time TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create data import configuration table
CREATE TABLE IF NOT EXISTS integration_import_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  entity_type VARCHAR(100) NOT NULL,
  import_format VARCHAR(20) NOT NULL,  -- 'csv', 'json', 'xml'
  field_mapping JSONB,
  validation_rules JSONB,
  success_handler VARCHAR(100),
  error_handler VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create event stream configuration table
CREATE TABLE IF NOT EXISTS integration_event_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  event_types TEXT[],
  stream_type VARCHAR(50) NOT NULL,  -- 'kafka', 'rabbitmq', 'awssqs', 'custom'
  config JSONB NOT NULL,
  filter_criteria JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_event_type
  ON integration_webhook(event_type);
  
CREATE INDEX IF NOT EXISTS idx_webhook_history_webhook_id
  ON integration_webhook_history(webhook_id);
  
CREATE INDEX IF NOT EXISTS idx_webhook_history_status
  ON integration_webhook_history(status);
  
CREATE INDEX IF NOT EXISTS idx_api_client_client_id
  ON integration_api_client(client_id);
  
CREATE INDEX IF NOT EXISTS idx_access_token_token
  ON integration_access_token(token);
  
CREATE INDEX IF NOT EXISTS idx_access_token_expires_at
  ON integration_access_token(expires_at);

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_update_timestamp
BEFORE UPDATE ON integration_webhook
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

CREATE TRIGGER webhook_history_update_timestamp
BEFORE UPDATE ON integration_webhook_history
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

CREATE TRIGGER api_client_update_timestamp
BEFORE UPDATE ON integration_api_client
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

CREATE TRIGGER export_config_update_timestamp
BEFORE UPDATE ON integration_export_config
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

CREATE TRIGGER import_config_update_timestamp
BEFORE UPDATE ON integration_import_config
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

CREATE TRIGGER event_stream_update_timestamp
BEFORE UPDATE ON integration_event_stream
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();