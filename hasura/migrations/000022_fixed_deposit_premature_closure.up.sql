-- Migration file for Fineract fixed deposit premature closure functionality
-- Enhances the schema for handling premature closure scenarios with different penalty calculations

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create a type for penalty calculation method if not exists
CREATE TYPE penalty_calculation_method AS ENUM (
    'flat_amount', 
    'percentage_of_interest', 
    'percentage_of_principal', 
    'percentage_of_total_amount'
);

-- Enhancing fixed_deposit_product table to add more detailed premature closure settings
ALTER TABLE fixed_deposit_product
ADD COLUMN pre_closure_penal_calculation_method penalty_calculation_method,
ADD COLUMN pre_closure_min_tenure_days INTEGER,
ADD COLUMN pre_closure_min_balance_percentage DECIMAL(19, 6),
ADD COLUMN pre_closure_interest_recalculation BOOLEAN DEFAULT FALSE;

-- Create a table to track premature closure details
CREATE TABLE fixed_deposit_premature_closure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixed_deposit_account_id UUID NOT NULL REFERENCES fixed_deposit_account(id) ON DELETE CASCADE,
    closure_date DATE NOT NULL,
    closure_amount DECIMAL(19, 6) NOT NULL,
    penalty_amount DECIMAL(19, 6),
    interest_adjusted DECIMAL(19, 6),
    total_amount_paid DECIMAL(19, 6) NOT NULL,
    closed_by_user_id UUID,
    transfer_to_account_id UUID,
    transfer_transaction_id UUID,
    reason TEXT,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER fixed_deposit_premature_closure_audit 
BEFORE INSERT OR UPDATE ON fixed_deposit_premature_closure 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_fd_premature_closure_account_id ON fixed_deposit_premature_closure(fixed_deposit_account_id);
CREATE INDEX idx_fd_premature_closure_date ON fixed_deposit_premature_closure(closure_date);
CREATE INDEX idx_fd_premature_closure_transfer_account ON fixed_deposit_premature_closure(transfer_to_account_id);