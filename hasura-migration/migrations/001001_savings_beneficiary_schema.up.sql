-- Savings Account Beneficiary Management Schema
-- Designed for PostgreSQL with normalized tables, constraints, and indexes

-- Set search path
SET search_path TO fineract_default, public;

-- Create beneficiary management table if not exists
CREATE TABLE IF NOT EXISTS savings_account_beneficiary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL, -- 'spouse', 'child', 'parent', 'sibling', 'other'
    is_active BOOLEAN DEFAULT TRUE,
    percentage_share DECIMAL(5,2) NOT NULL, -- Stored as percentage, e.g. 25.50 for 25.5%
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(100),
    identification_type VARCHAR(50), -- 'national_id', 'passport', 'driving_license', etc.
    identification_number VARCHAR(50),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES app_user(id),
    last_modified_date TIMESTAMP,
    last_modified_by UUID REFERENCES app_user(id),
    tenant_id UUID NOT NULL,
    CONSTRAINT savings_account_beneficiary_percentage_check CHECK (percentage_share > 0 AND percentage_share <= 100)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_savings_account_beneficiary_account_id ON savings_account_beneficiary(savings_account_id);
CREATE INDEX IF NOT EXISTS idx_savings_account_beneficiary_is_active ON savings_account_beneficiary(is_active);
CREATE INDEX IF NOT EXISTS idx_savings_account_beneficiary_tenant_id ON savings_account_beneficiary(tenant_id);

-- Function to check total percentage share does not exceed 100%
CREATE OR REPLACE FUNCTION validate_beneficiary_percentage_share()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    -- Calculate total percentage share for the savings account, excluding the current beneficiary if it's an update
    SELECT COALESCE(SUM(percentage_share), 0)
    INTO total_percentage
    FROM savings_account_beneficiary
    WHERE savings_account_id = NEW.savings_account_id
      AND is_active = TRUE
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    -- Add the new percentage
    total_percentage := total_percentage + NEW.percentage_share;
    
    -- Validate the total does not exceed 100%
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Total beneficiary percentage share cannot exceed 100%%. Current total: %%', total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for beneficiary percentage validation
DROP TRIGGER IF EXISTS validate_beneficiary_percentage_trigger ON savings_account_beneficiary;
CREATE TRIGGER validate_beneficiary_percentage_trigger
BEFORE INSERT OR UPDATE ON savings_account_beneficiary
FOR EACH ROW EXECUTE FUNCTION validate_beneficiary_percentage_share();

-- Apply last_modified_date update trigger
DROP TRIGGER IF EXISTS update_savings_account_beneficiary_timestamp ON savings_account_beneficiary;
CREATE TRIGGER update_savings_account_beneficiary_timestamp
BEFORE UPDATE ON savings_account_beneficiary
FOR EACH ROW EXECUTE FUNCTION update_last_modified_date();

-- Apply audit trail trigger
DROP TRIGGER IF EXISTS audit_savings_account_beneficiary ON savings_account_beneficiary;
CREATE TRIGGER audit_savings_account_beneficiary
AFTER INSERT OR UPDATE OR DELETE ON savings_account_beneficiary
FOR EACH ROW EXECUTE FUNCTION record_audit_trail();

-- Apply tenant_id assignment trigger
DROP TRIGGER IF EXISTS set_savings_account_beneficiary_tenant_id ON savings_account_beneficiary;
CREATE TRIGGER set_savings_account_beneficiary_tenant_id
BEFORE INSERT ON savings_account_beneficiary
FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

COMMENT ON TABLE savings_account_beneficiary IS 'Stores beneficiary information for savings accounts, including inheritance percentages';