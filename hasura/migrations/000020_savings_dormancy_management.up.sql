-- Migration file for Enhanced Savings Dormancy Management
-- Adds dormancy fees, notifications, and additional tracking capabilities

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Add dormancy fee configuration to savings_product
ALTER TABLE savings_product
ADD COLUMN dormancy_fee_amount DECIMAL(19, 6),
ADD COLUMN dormancy_fee_period_frequency INTEGER,
ADD COLUMN dormancy_fee_period_frequency_type VARCHAR(20), -- monthly, yearly
ADD COLUMN dormancy_notification_days INTEGER[],
ADD COLUMN reactivation_allowed BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN auto_reactivate_on_credit BOOLEAN NOT NULL DEFAULT FALSE;

-- Add dormancy tracking to savings_account
ALTER TABLE savings_account
ADD COLUMN last_dormancy_fee_date DATE,
ADD COLUMN next_dormancy_fee_date DATE,
ADD COLUMN dormancy_notification_sent BOOLEAN[] DEFAULT '{}',
ADD COLUMN dormancy_reason VARCHAR(255),
ADD COLUMN reactivation_date DATE;

-- Add new transaction type for dormancy fees
ALTER TYPE savings_transaction_type ADD VALUE IF NOT EXISTS 'dormancy_fee';

-- Create table to track dormancy transitions
CREATE TABLE IF NOT EXISTS savings_account_dormancy_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    transition_date DATE NOT NULL,
    previous_status savings_account_sub_status_type NOT NULL,
    new_status savings_account_sub_status_type NOT NULL,
    triggered_by UUID REFERENCES app_user(id),
    reason VARCHAR(500),
    notes TEXT,
    created_date TIMESTAMP DEFAULT now(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create index on dormancy log
CREATE INDEX IF NOT EXISTS idx_savings_dormancy_log_account_id 
ON savings_account_dormancy_log(savings_account_id);

-- Create a view for dormancy reports
CREATE OR REPLACE VIEW view_dormant_savings_accounts AS
SELECT 
    s.id,
    s.account_no,
    s.external_id,
    CASE 
        WHEN s.client_id IS NOT NULL THEN c.display_name
        WHEN s.group_id IS NOT NULL THEN g.name
    END AS account_owner_name,
    s.client_id,
    s.group_id,
    s.product_id,
    p.name AS product_name,
    s.status,
    s.sub_status,
    s.currency_code,
    s.account_balance_derived,
    s.last_active_transaction_date,
    s.dormant_on_date,
    s.is_dormancy_tracking_active,
    s.days_to_inactive,
    s.days_to_dormancy,
    s.days_to_escheat,
    s.field_officer_id,
    st.name AS staff_name,
    o.name AS office_name,
    CASE 
        WHEN s.dormant_on_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (CURRENT_DATE - s.dormant_on_date))
        ELSE NULL
    END AS days_dormant,
    s.last_dormancy_fee_date,
    s.next_dormancy_fee_date
FROM 
    savings_account s
LEFT JOIN 
    client c ON s.client_id = c.id
LEFT JOIN 
    client_group g ON s.group_id = g.id
LEFT JOIN 
    savings_product p ON s.product_id = p.id
LEFT JOIN 
    staff st ON s.field_officer_id = st.id
LEFT JOIN 
    office o ON st.office_id = o.id
WHERE 
    s.sub_status = 'dormant';

-- Create function to automatically update next_dormancy_fee_date when dormancy fees are applied
CREATE OR REPLACE FUNCTION update_next_dormancy_fee_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'dormancy_fee' THEN
        -- Get fee period details from the product
        WITH product_details AS (
            SELECT 
                sp.dormancy_fee_period_frequency,
                sp.dormancy_fee_period_frequency_type
            FROM 
                savings_product sp
            JOIN
                savings_account sa ON sa.product_id = sp.id
            WHERE
                sa.id = NEW.savings_account_id
        )
        
        -- Update the last and next fee dates
        UPDATE savings_account
        SET 
            last_dormancy_fee_date = NEW.transaction_date,
            next_dormancy_fee_date = CASE 
                WHEN pd.dormancy_fee_period_frequency_type = 'monthly' THEN
                    NEW.transaction_date + (pd.dormancy_fee_period_frequency * INTERVAL '1 month')
                WHEN pd.dormancy_fee_period_frequency_type = 'yearly' THEN
                    NEW.transaction_date + (pd.dormancy_fee_period_frequency * INTERVAL '1 year')
                ELSE
                    NEW.transaction_date + INTERVAL '1 month'
                END
        FROM product_details pd
        WHERE id = NEW.savings_account_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for dormancy fee updates
CREATE TRIGGER trg_update_dormancy_fee_dates
AFTER INSERT ON savings_account_transaction
FOR EACH ROW
WHEN (NEW.transaction_type = 'dormancy_fee')
EXECUTE FUNCTION update_next_dormancy_fee_date();

-- Create function to automatically update account status when a transaction occurs on a dormant account
CREATE OR REPLACE FUNCTION check_dormant_account_activity()
RETURNS TRIGGER AS $$
DECLARE
    current_status savings_account_sub_status_type;
    auto_reactivate BOOLEAN;
BEGIN
    -- Only proceed for credit transactions (deposits)
    IF NEW.transaction_type = 'deposit' AND NOT NEW.is_reversed THEN
        
        -- Get current account status and auto-reactivate setting
        SELECT 
            sa.sub_status, 
            sp.auto_reactivate_on_credit
        INTO 
            current_status, 
            auto_reactivate
        FROM 
            savings_account sa
        JOIN 
            savings_product sp ON sa.product_id = sp.id
        WHERE 
            sa.id = NEW.savings_account_id;
            
        -- If account is dormant and auto-reactivate is enabled, reactivate it
        IF current_status = 'dormant' AND auto_reactivate = TRUE THEN
            UPDATE savings_account
            SET 
                sub_status = 'none',
                reactivation_date = NEW.transaction_date,
                last_active_transaction_date = NEW.transaction_date,
                dormant_on_date = NULL
            WHERE 
                id = NEW.savings_account_id;
                
            -- Add log entry for reactivation
            INSERT INTO savings_account_dormancy_log
                (savings_account_id, transition_date, previous_status, new_status, 
                 reason, notes, created_date)
            VALUES
                (NEW.savings_account_id, NEW.transaction_date, 'dormant', 'none', 
                 'Auto-reactivation due to deposit', 'Account automatically reactivated due to new deposit', now());
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for checking activity on dormant accounts
CREATE TRIGGER trg_check_dormant_account_activity
AFTER INSERT ON savings_account_transaction
FOR EACH ROW
EXECUTE FUNCTION check_dormant_account_activity();