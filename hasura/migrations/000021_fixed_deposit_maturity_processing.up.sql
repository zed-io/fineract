-- Migration file for Fineract fixed deposit maturity processing
-- Enhances the schema for handling different maturity instructions and processing

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create a table to track maturity notifications
CREATE TABLE fixed_deposit_maturity_notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixed_deposit_account_id UUID NOT NULL REFERENCES fixed_deposit_account(id) ON DELETE CASCADE,
    notification_date DATE NOT NULL,
    is_notified BOOLEAN NOT NULL DEFAULT FALSE,
    notification_message TEXT,
    notification_channel VARCHAR(50),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create a table to track maturity processing history
CREATE TABLE fixed_deposit_maturity_processing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixed_deposit_account_id UUID NOT NULL REFERENCES fixed_deposit_account(id) ON DELETE CASCADE,
    original_maturity_date DATE NOT NULL,
    processed_date DATE NOT NULL,
    maturity_amount DECIMAL(19, 6) NOT NULL,
    processing_result VARCHAR(50) NOT NULL, -- 'renewed', 'transferred_to_savings', 'withdrawn'
    renewed_fixed_deposit_account_id UUID REFERENCES fixed_deposit_account(id),
    transaction_id UUID,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Add an enum for notification channels if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel_type') THEN
        CREATE TYPE notification_channel_type AS ENUM ('email', 'sms', 'push', 'in_app');
    END IF;
END$$;

-- Create audit triggers
CREATE TRIGGER fixed_deposit_maturity_notification_audit 
BEFORE INSERT OR UPDATE ON fixed_deposit_maturity_notification 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER fixed_deposit_maturity_processing_audit 
BEFORE INSERT OR UPDATE ON fixed_deposit_maturity_processing 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_fd_maturity_notification_account_id ON fixed_deposit_maturity_notification(fixed_deposit_account_id);
CREATE INDEX idx_fd_maturity_notification_date ON fixed_deposit_maturity_notification(notification_date);
CREATE INDEX idx_fd_maturity_processing_account_id ON fixed_deposit_maturity_processing(fixed_deposit_account_id);
CREATE INDEX idx_fd_maturity_processing_renewed_account_id ON fixed_deposit_maturity_processing(renewed_fixed_deposit_account_id);