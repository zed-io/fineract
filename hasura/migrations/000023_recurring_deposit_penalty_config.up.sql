-- Migration for recurring deposit penalties
-- Adds penalty configurations and penalty history tracking

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create enum for penalty types
CREATE TYPE deposit_penalty_type AS ENUM ('fixed', 'percentage');

-- Create table for recurring deposit penalty configuration
CREATE TABLE recurring_deposit_penalty_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES recurring_deposit_product(id) ON DELETE CASCADE,
    is_penalty_enabled BOOLEAN NOT NULL DEFAULT true,
    penalty_type deposit_penalty_type NOT NULL DEFAULT 'fixed',
    penalty_amount DECIMAL(19, 6) NOT NULL,
    grace_period_days INTEGER NOT NULL DEFAULT 5,
    max_penalty_occurrences INTEGER DEFAULT 3,
    advanced_penalty_config JSONB,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create table for recurring deposit tiered penalty configuration
CREATE TABLE recurring_deposit_tiered_penalty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES recurring_deposit_penalty_config(id) ON DELETE CASCADE,
    tier_number INTEGER NOT NULL,
    days_overdue_start INTEGER NOT NULL,
    days_overdue_end INTEGER,
    occurrences_start INTEGER NOT NULL DEFAULT 1,
    occurrences_end INTEGER,
    penalty_type deposit_penalty_type NOT NULL DEFAULT 'fixed',
    penalty_amount DECIMAL(19, 6) NOT NULL,
    max_penalty_amount DECIMAL(19, 6),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create table for recurring deposit penalty history
CREATE TABLE recurring_deposit_penalty_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES recurring_deposit_account(id) ON DELETE CASCADE,
    savings_account_charge_id UUID NOT NULL REFERENCES savings_account_charge(id),
    installment_id UUID NOT NULL REFERENCES recurring_deposit_schedule_installment(id),
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    penalty_date DATE NOT NULL,
    days_overdue INTEGER NOT NULL,
    missed_occurrences INTEGER NOT NULL DEFAULT 1,
    penalty_type deposit_penalty_type NOT NULL,
    penalty_amount DECIMAL(19, 6) NOT NULL,
    is_waived BOOLEAN NOT NULL DEFAULT FALSE,
    waived_date DATE,
    waived_by UUID,
    waiver_reason VARCHAR(500),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Add system configuration for default penalty settings (if product-specific settings are not available)
INSERT INTO system_configuration (
    id,
    name,
    value,
    enabled,
    description,
    created_date
) VALUES (
    uuid_generate_v4(),
    'recurring_deposit_penalty_config',
    '{"enableAutoPenalty": true, "penaltyType": "fixed", "penaltyAmount": 10, "gracePeriodDays": 5, "maxPenaltiesPerInstallment": 3, "advancedConfig": {"tiers": [{"daysOverdueStart": 1, "daysOverdueEnd": 10, "penaltyType": "fixed", "penaltyAmount": 10}, {"daysOverdueStart": 11, "daysOverdueEnd": 30, "penaltyType": "fixed", "penaltyAmount": 20}, {"daysOverdueStart": 31, "daysOverdueEnd": null, "penaltyType": "percentage", "penaltyAmount": 5, "maxPenaltyAmount": 50}]}}',
    true,
    'Default configuration for recurring deposit missed installment penalties',
    NOW()
)
ON CONFLICT (name) DO UPDATE SET
    value = '{"enableAutoPenalty": true, "penaltyType": "fixed", "penaltyAmount": 10, "gracePeriodDays": 5, "maxPenaltiesPerInstallment": 3, "advancedConfig": {"tiers": [{"daysOverdueStart": 1, "daysOverdueEnd": 10, "penaltyType": "fixed", "penaltyAmount": 10}, {"daysOverdueStart": 11, "daysOverdueEnd": 30, "penaltyType": "fixed", "penaltyAmount": 20}, {"daysOverdueStart": 31, "daysOverdueEnd": null, "penaltyType": "percentage", "penaltyAmount": 5, "maxPenaltyAmount": 50}]}}',
    description = 'Default configuration for recurring deposit missed installment penalties',
    enabled = true;

-- Add a charge time type for recurring deposit missed installments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM enum_value WHERE enum_name = 'charge_time_type' AND enum_value = 'missed_installment') THEN
        INSERT INTO enum_value (enum_name, enum_id, enum_value, enum_message)
        VALUES ('charge_time_type', (SELECT MAX(enum_id) + 1 FROM enum_value WHERE enum_name = 'charge_time_type'), 'missed_installment', 'Missed Installment');
    END IF;
END $$;

-- Create predefined charge for missed installment penalties
INSERT INTO charge (
    id,
    name,
    currency_code,
    charge_applies_to_enum,
    charge_time_type,
    charge_calculation_type,
    amount,
    is_penalty,
    is_active,
    is_savings_charge,
    created_date
) 
SELECT 
    uuid_generate_v4(),
    'Missed Installment Penalty',
    code,
    'savings',
    'missed_installment',
    'flat',
    10.00,
    true,
    true,
    true,
    NOW()
FROM currency
WHERE code = 'USD'
ON CONFLICT DO NOTHING;

-- Create audit triggers
CREATE TRIGGER recurring_deposit_penalty_config_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_penalty_config 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_tiered_penalty_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_tiered_penalty 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_penalty_history_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_penalty_history 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_rd_penalty_config_product_id ON recurring_deposit_penalty_config(product_id);
CREATE INDEX idx_rd_tiered_penalty_config_id ON recurring_deposit_tiered_penalty(config_id);
CREATE INDEX idx_rd_penalty_history_account_id ON recurring_deposit_penalty_history(account_id);
CREATE INDEX idx_rd_penalty_history_installment_id ON recurring_deposit_penalty_history(installment_id);
CREATE INDEX idx_rd_penalty_history_due_date ON recurring_deposit_penalty_history(due_date);
CREATE INDEX idx_rd_penalty_history_penalty_date ON recurring_deposit_penalty_history(penalty_date);