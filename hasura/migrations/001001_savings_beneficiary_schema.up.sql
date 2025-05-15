-- Migration file for Savings Account Beneficiary Management
-- Creates tables and functions for managing beneficiaries of savings accounts

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create enum for beneficiary verification status
CREATE TYPE beneficiary_verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Create table for savings account beneficiaries
CREATE TABLE IF NOT EXISTS savings_account_beneficiary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES client(id),
    relationship_type VARCHAR(100) NOT NULL,
    percentage_share DECIMAL(19, 6) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    verification_status beneficiary_verification_status NOT NULL DEFAULT 'pending',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    document_type VARCHAR(100),
    document_identification_number VARCHAR(100),
    document_description TEXT,
    document_url VARCHAR(500),
    notes TEXT,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    
    -- Ensure percentage shares don't exceed 100% per account
    CONSTRAINT beneficiary_percentage_check CHECK (percentage_share > 0 AND percentage_share <= 100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_beneficiary_savings_account_id ON savings_account_beneficiary(savings_account_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_client_id ON savings_account_beneficiary(client_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_status ON savings_account_beneficiary(verification_status);

-- Create a function to validate total percentage share
CREATE OR REPLACE FUNCTION validate_beneficiary_percentage_share()
RETURNS TRIGGER AS $$
DECLARE
    total_share DECIMAL(19, 6);
BEGIN
    -- Calculate total percentage share for the account, excluding this beneficiary if it's an update
    SELECT COALESCE(SUM(percentage_share), 0)
    INTO total_share
    FROM savings_account_beneficiary
    WHERE 
        savings_account_id = NEW.savings_account_id 
        AND is_active = TRUE
        AND id != NEW.id;
    
    -- Add the current beneficiary's share
    total_share := total_share + NEW.percentage_share;
    
    -- Check if the total exceeds 100%
    IF total_share > 100 THEN
        RAISE EXCEPTION 'Total beneficiary percentage share exceeds 100%%. Current total is %%', total_share;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate percentage share
CREATE TRIGGER trg_validate_beneficiary_percentage_share
BEFORE INSERT OR UPDATE ON savings_account_beneficiary
FOR EACH ROW
EXECUTE FUNCTION validate_beneficiary_percentage_share();

-- Create a trigger function for audit fields
CREATE TRIGGER beneficiary_audit BEFORE INSERT OR UPDATE ON savings_account_beneficiary 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Insert permissions for beneficiary management
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_SAVINGSBENEFICIARY', 'SAVINGSBENEFICIARY', 'CREATE', true),
('portfolio', 'UPDATE_SAVINGSBENEFICIARY', 'SAVINGSBENEFICIARY', 'UPDATE', true),
('portfolio', 'DELETE_SAVINGSBENEFICIARY', 'SAVINGSBENEFICIARY', 'DELETE', true),
('portfolio', 'VERIFY_SAVINGSBENEFICIARY', 'SAVINGSBENEFICIARY', 'VERIFY', true);

-- Comments for clarity
COMMENT ON TABLE savings_account_beneficiary IS 'Stores beneficiaries for savings accounts';
COMMENT ON COLUMN savings_account_beneficiary.relationship_type IS 'Relationship of the beneficiary to the account owner (e.g., spouse, child, parent)';
COMMENT ON COLUMN savings_account_beneficiary.percentage_share IS 'Percentage of the account balance that the beneficiary will receive';
COMMENT ON COLUMN savings_account_beneficiary.verification_status IS 'Status of beneficiary verification (pending, verified, rejected)';
COMMENT ON FUNCTION validate_beneficiary_percentage_share() IS 'Ensures that total beneficiary percentage shares do not exceed 100% for an account';