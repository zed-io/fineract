-- Migration file for Recurring Deposit Beneficiary Management
-- Creates tables and functions for managing beneficiaries of recurring deposit accounts

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create table for recurring deposit account beneficiaries
CREATE TABLE IF NOT EXISTS recurring_deposit_beneficiary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurring_deposit_account_id UUID NOT NULL REFERENCES recurring_deposit_account(id) ON DELETE CASCADE,
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
    CONSTRAINT rd_beneficiary_percentage_check CHECK (percentage_share > 0 AND percentage_share <= 100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_account_id ON recurring_deposit_beneficiary(recurring_deposit_account_id);
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_client_id ON recurring_deposit_beneficiary(client_id);
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_status ON recurring_deposit_beneficiary(verification_status);

-- Create a function to validate total percentage share for recurring deposit beneficiaries
CREATE OR REPLACE FUNCTION validate_rd_beneficiary_percentage_share()
RETURNS TRIGGER AS $$
DECLARE
    total_share DECIMAL(19, 6);
BEGIN
    -- Calculate total percentage share for the account, excluding this beneficiary if it's an update
    SELECT COALESCE(SUM(percentage_share), 0)
    INTO total_share
    FROM recurring_deposit_beneficiary
    WHERE 
        recurring_deposit_account_id = NEW.recurring_deposit_account_id 
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
CREATE TRIGGER trg_validate_rd_beneficiary_percentage_share
BEFORE INSERT OR UPDATE ON recurring_deposit_beneficiary
FOR EACH ROW
EXECUTE FUNCTION validate_rd_beneficiary_percentage_share();

-- Create a trigger function for audit fields
CREATE TRIGGER rd_beneficiary_audit BEFORE INSERT OR UPDATE ON recurring_deposit_beneficiary 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create table for recurring deposit beneficiary notifications
CREATE TABLE IF NOT EXISTS recurring_deposit_beneficiary_notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID NOT NULL REFERENCES recurring_deposit_beneficiary(id) ON DELETE CASCADE,
    recurring_deposit_account_id UUID NOT NULL REFERENCES recurring_deposit_account(id),
    template_id UUID REFERENCES notification_template(id),
    notification_type notification_type NOT NULL,
    recipient VARCHAR(255) NOT NULL, -- email address or phone number
    subject VARCHAR(200),
    message TEXT NOT NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    event_type VARCHAR(50) NOT NULL, -- 'verification', 'addition', 'modification', 'removal', 'maturity', 'premature_closure'
    triggered_by UUID,
    sent_date TIMESTAMP,
    delivery_date TIMESTAMP,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create table for recurring deposit beneficiary notification preferences
CREATE TABLE IF NOT EXISTS recurring_deposit_beneficiary_notification_preference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID NOT NULL REFERENCES recurring_deposit_beneficiary(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'verification', 'addition', 'modification', 'removal', 'maturity', 'premature_closure'
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(beneficiary_id, notification_type, event_type)
);

-- Insert notification template entries for recurring deposit events
INSERT INTO notification_template (
    id,
    name,
    code,
    subject,
    message_template,
    applicable_types,
    module,
    event_type,
    description,
    placeholders,
    is_active,
    created_date
) VALUES
-- Email templates
(
    uuid_generate_v4(),
    'Recurring Deposit Beneficiary Addition',
    'RD_BENEFICIARY_ADDITION_EMAIL',
    'You have been added as a beneficiary to a Recurring Deposit',
    'Dear {{beneficiaryName}},

You have been added as a beneficiary to Recurring Deposit account {{accountNo}} by {{accountOwnerName}}.

Your beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%
- Expected Maturity Date: {{maturityDate}}
- Expected Maturity Amount: {{maturityAmount}}

If you have any questions or concerns, please contact our support team.

Thank you,
The Fineract Team',
    ARRAY['email', 'in_app']::notification_type[],
    'recurring_deposit',
    'beneficiary_addition',
    'Email notification sent to beneficiaries when they are added to a recurring deposit account',
    jsonb_build_object(
        'beneficiaryName', 'Name of the beneficiary',
        'accountNo', 'Account number of the recurring deposit',
        'accountOwnerName', 'Name of the account owner',
        'relationshipType', 'Relationship of beneficiary to account owner',
        'percentageShare', 'Percentage share of the beneficiary',
        'maturityDate', 'Expected maturity date of the deposit',
        'maturityAmount', 'Expected maturity amount of the deposit'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Beneficiary Verification',
    'RD_BENEFICIARY_VERIFICATION_EMAIL',
    'Your beneficiary status has been verified',
    'Dear {{beneficiaryName}},

Your beneficiary status for Recurring Deposit account {{accountNo}} has been verified and approved.

Your beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%
- Expected Maturity Date: {{maturityDate}}
- Expected Maturity Amount: {{maturityAmount}}

If you have any questions or concerns, please contact our support team.

Thank you,
The Fineract Team',
    ARRAY['email', 'in_app']::notification_type[],
    'recurring_deposit',
    'beneficiary_verification',
    'Email notification sent to beneficiaries when their status is verified',
    jsonb_build_object(
        'beneficiaryName', 'Name of the beneficiary',
        'accountNo', 'Account number of the recurring deposit',
        'accountOwnerName', 'Name of the account owner',
        'relationshipType', 'Relationship of beneficiary to account owner',
        'percentageShare', 'Percentage share of the beneficiary',
        'maturityDate', 'Expected maturity date of the deposit',
        'maturityAmount', 'Expected maturity amount of the deposit'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Beneficiary Removal',
    'RD_BENEFICIARY_REMOVAL_EMAIL',
    'You have been removed as a beneficiary',
    'Dear {{beneficiaryName}},

You have been removed as a beneficiary from Recurring Deposit account {{accountNo}}.

If you did not expect this change or have any concerns, please contact our support team immediately.

Thank you,
The Fineract Team',
    ARRAY['email', 'in_app']::notification_type[],
    'recurring_deposit',
    'beneficiary_removal',
    'Email notification sent to beneficiaries when they are removed from a recurring deposit account',
    jsonb_build_object(
        'beneficiaryName', 'Name of the beneficiary',
        'accountNo', 'Account number of the recurring deposit'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Maturity Notification for Beneficiary',
    'RD_MATURITY_BENEFICIARY_EMAIL',
    'Recurring Deposit with your beneficiary interest is maturing soon',
    'Dear {{beneficiaryName}},

The Recurring Deposit account {{accountNo}} where you are listed as a beneficiary is maturing on {{maturityDate}}. The expected maturity amount is {{maturityAmount}}, of which your share ({{percentageShare}}%) amounts to {{beneficiaryAmount}}.

Please ensure your contact and payment information is up to date. The account owner may choose to renew the deposit or withdraw the funds at maturity.

If you have any questions, please contact our support team.

Thank you,
The Fineract Team',
    ARRAY['email', 'in_app']::notification_type[],
    'recurring_deposit',
    'maturity_notification',
    'Email notification sent to beneficiaries when the recurring deposit is approaching maturity',
    jsonb_build_object(
        'beneficiaryName', 'Name of the beneficiary',
        'accountNo', 'Account number of the recurring deposit',
        'maturityDate', 'Maturity date of the deposit',
        'maturityAmount', 'Expected total maturity amount',
        'percentageShare', 'Percentage share of the beneficiary',
        'beneficiaryAmount', 'Expected amount for the beneficiary'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Premature Closure for Beneficiary',
    'RD_PREMATURE_CLOSURE_BENEFICIARY_EMAIL',
    'Recurring Deposit with your beneficiary interest has been closed prematurely',
    'Dear {{beneficiaryName}},

The Recurring Deposit account {{accountNo}} where you are listed as a beneficiary has been closed prematurely on {{closureDate}}. The final amount is {{finalAmount}}, of which your share ({{percentageShare}}%) amounts to {{beneficiaryAmount}}.

Original details:
- Expected Maturity Date: {{maturityDate}}
- Expected Maturity Amount: {{maturityAmount}}

The account owner has chosen to close this deposit before its maturity date. If you have any questions or concerns about this action, please contact our support team.

Thank you,
The Fineract Team',
    ARRAY['email', 'in_app']::notification_type[],
    'recurring_deposit',
    'premature_closure',
    'Email notification sent to beneficiaries when the recurring deposit is closed prematurely',
    jsonb_build_object(
        'beneficiaryName', 'Name of the beneficiary',
        'accountNo', 'Account number of the recurring deposit',
        'closureDate', 'Date of premature closure',
        'finalAmount', 'Final amount after premature closure',
        'percentageShare', 'Percentage share of the beneficiary',
        'beneficiaryAmount', 'Amount for the beneficiary',
        'maturityDate', 'Original expected maturity date',
        'maturityAmount', 'Original expected maturity amount'
    ),
    true,
    NOW()
),

-- SMS templates
(
    uuid_generate_v4(),
    'Recurring Deposit Beneficiary Addition SMS',
    'RD_BENEFICIARY_ADDITION_SMS',
    'RD Beneficiary Addition',
    'You have been added as a beneficiary to Recurring Deposit account {{accountNo}} with {{percentageShare}}% share. Expected maturity: {{maturityDate}}.',
    ARRAY['sms']::notification_type[],
    'recurring_deposit',
    'beneficiary_addition',
    'SMS notification sent to beneficiaries when they are added to a recurring deposit account',
    jsonb_build_object(
        'accountNo', 'Account number of the recurring deposit',
        'percentageShare', 'Percentage share of the beneficiary',
        'maturityDate', 'Expected maturity date of the deposit'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Beneficiary Verification SMS',
    'RD_BENEFICIARY_VERIFICATION_SMS',
    'RD Beneficiary Verified',
    'Your beneficiary status for Recurring Deposit account {{accountNo}} has been verified with {{percentageShare}}% share. Expected maturity: {{maturityDate}}.',
    ARRAY['sms']::notification_type[],
    'recurring_deposit',
    'beneficiary_verification',
    'SMS notification sent to beneficiaries when their status is verified',
    jsonb_build_object(
        'accountNo', 'Account number of the recurring deposit',
        'percentageShare', 'Percentage share of the beneficiary',
        'maturityDate', 'Expected maturity date of the deposit'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Beneficiary Removal SMS',
    'RD_BENEFICIARY_REMOVAL_SMS',
    'RD Beneficiary Removed',
    'You have been removed as a beneficiary from Recurring Deposit account {{accountNo}}. For queries, contact support.',
    ARRAY['sms']::notification_type[],
    'recurring_deposit',
    'beneficiary_removal',
    'SMS notification sent to beneficiaries when they are removed from a recurring deposit account',
    jsonb_build_object(
        'accountNo', 'Account number of the recurring deposit'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Maturity SMS for Beneficiary',
    'RD_MATURITY_BENEFICIARY_SMS',
    'RD Maturity Notification',
    'Recurring Deposit {{accountNo}} where you are a beneficiary matures on {{maturityDate}}. Your share ({{percentageShare}}%): {{beneficiaryAmount}}.',
    ARRAY['sms']::notification_type[],
    'recurring_deposit',
    'maturity_notification',
    'SMS notification sent to beneficiaries when the recurring deposit is approaching maturity',
    jsonb_build_object(
        'accountNo', 'Account number of the recurring deposit',
        'maturityDate', 'Maturity date of the deposit',
        'percentageShare', 'Percentage share of the beneficiary',
        'beneficiaryAmount', 'Expected amount for the beneficiary'
    ),
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'Recurring Deposit Premature Closure SMS for Beneficiary',
    'RD_PREMATURE_CLOSURE_BENEFICIARY_SMS',
    'RD Premature Closure',
    'Recurring Deposit {{accountNo}} closed prematurely on {{closureDate}}. Your share ({{percentageShare}}%): {{beneficiaryAmount}}.',
    ARRAY['sms']::notification_type[],
    'recurring_deposit',
    'premature_closure',
    'SMS notification sent to beneficiaries when the recurring deposit is closed prematurely',
    jsonb_build_object(
        'accountNo', 'Account number of the recurring deposit',
        'closureDate', 'Date of premature closure',
        'percentageShare', 'Percentage share of the beneficiary',
        'beneficiaryAmount', 'Amount for the beneficiary'
    ),
    true,
    NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_notification_beneficiary_id 
ON recurring_deposit_beneficiary_notification(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_notification_account_id 
ON recurring_deposit_beneficiary_notification(recurring_deposit_account_id);
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_notification_status 
ON recurring_deposit_beneficiary_notification(status);
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_notification_event_type 
ON recurring_deposit_beneficiary_notification(event_type);
CREATE INDEX IF NOT EXISTS idx_rd_beneficiary_notification_preference_beneficiary_id 
ON recurring_deposit_beneficiary_notification_preference(beneficiary_id);

-- Create a function to notify beneficiaries on status change
CREATE OR REPLACE FUNCTION notify_rd_beneficiary_status_change() 
RETURNS TRIGGER AS $$
DECLARE
    template_id UUID;
    template_code VARCHAR(50);
    notification_type_val notification_type;
    notification_enabled BOOLEAN;
    account_no VARCHAR(20);
    account_owner_name VARCHAR(255);
    client_id UUID;
    maturity_date DATE;
    maturity_amount DECIMAL(19, 6);
BEGIN
    -- Only proceed for status changes
    IF (TG_OP = 'UPDATE' AND (OLD.verification_status <> NEW.verification_status OR OLD.is_active <> NEW.is_active)) THEN
        -- Get account information
        SELECT 
            sa.account_no, 
            c.display_name,
            c.id,
            rda.expected_maturity_date,
            rda.expected_maturity_amount
        INTO 
            account_no, 
            account_owner_name,
            client_id,
            maturity_date,
            maturity_amount
        FROM 
            recurring_deposit_account rda
        JOIN
            savings_account sa ON rda.savings_account_id = sa.id
        LEFT JOIN
            client c ON sa.client_id = c.id
        WHERE 
            rda.id = NEW.recurring_deposit_account_id;
            
        -- Check for email notification
        IF NEW.email IS NOT NULL THEN
            -- Set template based on status change
            IF OLD.is_active = true AND NEW.is_active = false THEN
                -- Beneficiary was removed
                template_code := 'RD_BENEFICIARY_REMOVAL_EMAIL';
                notification_type_val := 'email';
                
            ELSIF NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN
                -- Beneficiary was verified
                template_code := 'RD_BENEFICIARY_VERIFICATION_EMAIL';
                notification_type_val := 'email';
            END IF;
            
            -- Get template ID
            SELECT id INTO template_id
            FROM notification_template
            WHERE code = template_code
            LIMIT 1;
            
            -- Check if notification is enabled
            SELECT is_enabled INTO notification_enabled
            FROM recurring_deposit_beneficiary_notification_preference
            WHERE 
                beneficiary_id = NEW.id 
                AND notification_type = notification_type_val 
                AND event_type = (
                    CASE 
                        WHEN OLD.is_active = true AND NEW.is_active = false THEN 'beneficiary_removal'
                        WHEN NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN 'beneficiary_verification'
                        ELSE 'beneficiary_modification'
                    END
                )
            LIMIT 1;
            
            -- If no preference exists, default to enabled
            IF notification_enabled IS NULL THEN
                notification_enabled := TRUE;
            END IF;
            
            -- Insert notification record if enabled and template exists
            IF notification_enabled AND template_id IS NOT NULL THEN
                INSERT INTO recurring_deposit_beneficiary_notification (
                    beneficiary_id,
                    recurring_deposit_account_id,
                    template_id,
                    notification_type,
                    recipient,
                    subject,
                    message,
                    status,
                    event_type,
                    triggered_by,
                    created_date
                ) VALUES (
                    NEW.id,
                    NEW.recurring_deposit_account_id,
                    template_id,
                    notification_type_val,
                    NEW.email,
                    (SELECT subject FROM notification_template WHERE id = template_id),
                    -- This would normally use a template engine to replace placeholders.
                    -- For simplicity, just getting the message template here.
                    (SELECT message_template FROM notification_template WHERE id = template_id),
                    'pending',
                    CASE 
                        WHEN OLD.is_active = true AND NEW.is_active = false THEN 'beneficiary_removal'
                        WHEN NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN 'beneficiary_verification'
                        ELSE 'beneficiary_modification'
                    END,
                    NEW.last_modified_by,
                    NOW()
                );
            END IF;
        END IF;
        
        -- Check for SMS notification
        IF NEW.contact_number IS NOT NULL THEN
            -- Set template based on status change
            IF OLD.is_active = true AND NEW.is_active = false THEN
                -- Beneficiary was removed
                template_code := 'RD_BENEFICIARY_REMOVAL_SMS';
                notification_type_val := 'sms';
                
            ELSIF NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN
                -- Beneficiary was verified
                template_code := 'RD_BENEFICIARY_VERIFICATION_SMS';
                notification_type_val := 'sms';
            END IF;
            
            -- Get template ID
            SELECT id INTO template_id
            FROM notification_template
            WHERE code = template_code
            LIMIT 1;
            
            -- Check if notification is enabled
            SELECT is_enabled INTO notification_enabled
            FROM recurring_deposit_beneficiary_notification_preference
            WHERE 
                beneficiary_id = NEW.id 
                AND notification_type = notification_type_val 
                AND event_type = (
                    CASE 
                        WHEN OLD.is_active = true AND NEW.is_active = false THEN 'beneficiary_removal'
                        WHEN NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN 'beneficiary_verification'
                        ELSE 'beneficiary_modification'
                    END
                )
            LIMIT 1;
            
            -- If no preference exists, default to enabled
            IF notification_enabled IS NULL THEN
                notification_enabled := TRUE;
            END IF;
            
            -- Insert notification record if enabled and template exists
            IF notification_enabled AND template_id IS NOT NULL THEN
                INSERT INTO recurring_deposit_beneficiary_notification (
                    beneficiary_id,
                    recurring_deposit_account_id,
                    template_id,
                    notification_type,
                    recipient,
                    subject,
                    message,
                    status,
                    event_type,
                    triggered_by,
                    created_date
                ) VALUES (
                    NEW.id,
                    NEW.recurring_deposit_account_id,
                    template_id,
                    notification_type_val,
                    NEW.contact_number,
                    (SELECT subject FROM notification_template WHERE id = template_id),
                    -- This would normally use a template engine to replace placeholders.
                    -- For simplicity, just getting the message template here.
                    (SELECT message_template FROM notification_template WHERE id = template_id),
                    'pending',
                    CASE 
                        WHEN OLD.is_active = true AND NEW.is_active = false THEN 'beneficiary_removal'
                        WHEN NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN 'beneficiary_verification'
                        ELSE 'beneficiary_modification'
                    END,
                    NEW.last_modified_by,
                    NOW()
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for beneficiary status change notifications
CREATE TRIGGER trg_notify_rd_beneficiary_status_change
AFTER UPDATE ON recurring_deposit_beneficiary
FOR EACH ROW
EXECUTE FUNCTION notify_rd_beneficiary_status_change();

-- Create function to notify beneficiaries on recurring deposit maturity or premature closure
CREATE OR REPLACE FUNCTION notify_rd_beneficiaries_on_account_status_change()
RETURNS TRIGGER AS $$
DECLARE
    event_type VARCHAR(50);
    template_code_email VARCHAR(50);
    template_code_sms VARCHAR(50);
    beneficiary_record RECORD;
    beneficiary_amount DECIMAL(19, 6);
    account_no VARCHAR(50);
BEGIN
    -- Get account number
    SELECT sa.account_no 
    INTO account_no
    FROM savings_account sa
    WHERE sa.id = NEW.savings_account_id;
    
    -- Set event type and template codes based on the account status change
    IF NEW.maturity_date IS NOT NULL AND OLD.maturity_date IS NULL THEN
        -- Account has been marked for maturity
        event_type := 'maturity_notification';
        template_code_email := 'RD_MATURITY_BENEFICIARY_EMAIL';
        template_code_sms := 'RD_MATURITY_BENEFICIARY_SMS';
    ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'recurring_deposit_premature_closure_history' THEN
        -- Account has been prematurely closed
        event_type := 'premature_closure';
        template_code_email := 'RD_PREMATURE_CLOSURE_BENEFICIARY_EMAIL';
        template_code_sms := 'RD_PREMATURE_CLOSURE_BENEFICIARY_SMS';
    ELSE
        -- No relevant status change to notify beneficiaries about
        RETURN NEW;
    END IF;
    
    -- Notify each active and verified beneficiary
    FOR beneficiary_record IN 
        SELECT 
            rb.id, 
            rb.name,
            rb.percentage_share,
            rb.email,
            rb.contact_number
        FROM 
            recurring_deposit_beneficiary rb
        WHERE 
            rb.recurring_deposit_account_id = NEW.id
            AND rb.is_active = TRUE
            AND rb.verification_status = 'verified'
    LOOP
        -- Calculate beneficiary's portion of the amount
        IF event_type = 'maturity_notification' THEN
            beneficiary_amount := NEW.expected_maturity_amount * (beneficiary_record.percentage_share / 100);
        ELSIF event_type = 'premature_closure' THEN
            -- For premature closure, use the total amount from premature closure history
            beneficiary_amount := NEW.total_amount * (beneficiary_record.percentage_share / 100);
        END IF;
        
        -- Send email notification if available
        IF beneficiary_record.email IS NOT NULL THEN
            -- Check if notifications are enabled for this beneficiary
            IF NOT EXISTS (
                SELECT 1 
                FROM recurring_deposit_beneficiary_notification_preference
                WHERE 
                    beneficiary_id = beneficiary_record.id
                    AND notification_type = 'email'
                    AND event_type = event_type
                    AND is_enabled = FALSE
            ) THEN
                -- Insert email notification
                INSERT INTO recurring_deposit_beneficiary_notification (
                    beneficiary_id,
                    recurring_deposit_account_id,
                    template_id,
                    notification_type,
                    recipient,
                    subject,
                    message,
                    status,
                    event_type,
                    created_date
                ) VALUES (
                    beneficiary_record.id,
                    NEW.id,
                    (SELECT id FROM notification_template WHERE code = template_code_email),
                    'email',
                    beneficiary_record.email,
                    (SELECT subject FROM notification_template WHERE code = template_code_email),
                    -- This would normally use a template engine to replace placeholders.
                    -- For simplicity, just getting the message template here.
                    (SELECT message_template FROM notification_template WHERE code = template_code_email),
                    'pending',
                    event_type,
                    NOW()
                );
            END IF;
        END IF;
        
        -- Send SMS notification if available
        IF beneficiary_record.contact_number IS NOT NULL THEN
            -- Check if notifications are enabled for this beneficiary
            IF NOT EXISTS (
                SELECT 1 
                FROM recurring_deposit_beneficiary_notification_preference
                WHERE 
                    beneficiary_id = beneficiary_record.id
                    AND notification_type = 'sms'
                    AND event_type = event_type
                    AND is_enabled = FALSE
            ) THEN
                -- Insert SMS notification
                INSERT INTO recurring_deposit_beneficiary_notification (
                    beneficiary_id,
                    recurring_deposit_account_id,
                    template_id,
                    notification_type,
                    recipient,
                    subject,
                    message,
                    status,
                    event_type,
                    created_date
                ) VALUES (
                    beneficiary_record.id,
                    NEW.id,
                    (SELECT id FROM notification_template WHERE code = template_code_sms),
                    'sms',
                    beneficiary_record.contact_number,
                    (SELECT subject FROM notification_template WHERE code = template_code_sms),
                    -- This would normally use a template engine to replace placeholders.
                    -- For simplicity, just getting the message template here.
                    (SELECT message_template FROM notification_template WHERE code = template_code_sms),
                    'pending',
                    event_type,
                    NOW()
                );
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for account status changes that should notify beneficiaries
CREATE TRIGGER trg_notify_rd_beneficiaries_on_maturity
AFTER UPDATE OF maturity_date ON recurring_deposit_account
FOR EACH ROW
WHEN (NEW.maturity_date IS NOT NULL AND OLD.maturity_date IS NULL)
EXECUTE FUNCTION notify_rd_beneficiaries_on_account_status_change();

CREATE TRIGGER trg_notify_rd_beneficiaries_on_premature_closure
AFTER INSERT ON recurring_deposit_premature_closure_history
FOR EACH ROW
EXECUTE FUNCTION notify_rd_beneficiaries_on_account_status_change();

-- Create function to send manual notification to a recurring deposit beneficiary
CREATE OR REPLACE FUNCTION send_rd_beneficiary_notification(
    p_beneficiary_id UUID,
    p_template_code VARCHAR(50),
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    template_id UUID;
    template_type notification_type;
    template_event_type VARCHAR(50);
    account_id UUID;
    account_no VARCHAR(20);
    account_owner_name VARCHAR(255);
    maturity_date DATE;
    maturity_amount DECIMAL(19, 6);
    beneficiary_name VARCHAR(255);
    beneficiary_percentage DECIMAL(19, 6);
    beneficiary_email VARCHAR(255);
    beneficiary_phone VARCHAR(50);
    notification_id UUID;
    notification_enabled BOOLEAN;
BEGIN
    -- Get template details
    SELECT 
        id, 
        applicable_types[1], 
        event_type
    INTO 
        template_id, 
        template_type, 
        template_event_type
    FROM 
        notification_template
    WHERE 
        code = p_template_code
        AND is_active = true
        AND module = 'recurring_deposit';
        
    IF template_id IS NULL THEN
        RAISE EXCEPTION 'Notification template with code % not found or not active', p_template_code;
    END IF;
    
    -- Get beneficiary and account details
    SELECT 
        rdb.recurring_deposit_account_id,
        rdb.name,
        rdb.percentage_share,
        rdb.email,
        rdb.contact_number,
        sa.account_no,
        c.display_name,
        rda.expected_maturity_date,
        rda.expected_maturity_amount
    INTO 
        account_id,
        beneficiary_name,
        beneficiary_percentage,
        beneficiary_email,
        beneficiary_phone,
        account_no,
        account_owner_name,
        maturity_date,
        maturity_amount
    FROM 
        recurring_deposit_beneficiary rdb
    JOIN 
        recurring_deposit_account rda ON rdb.recurring_deposit_account_id = rda.id
    JOIN 
        savings_account sa ON rda.savings_account_id = sa.id
    LEFT JOIN
        client c ON sa.client_id = c.id
    WHERE 
        rdb.id = p_beneficiary_id;
        
    IF account_id IS NULL THEN
        RAISE EXCEPTION 'Beneficiary with ID % not found', p_beneficiary_id;
    END IF;
    
    -- Check if notification is enabled
    SELECT is_enabled INTO notification_enabled
    FROM recurring_deposit_beneficiary_notification_preference
    WHERE beneficiary_id = p_beneficiary_id AND notification_type = template_type AND event_type = template_event_type
    LIMIT 1;
    
    -- If no preference exists, default to enabled
    IF notification_enabled IS NULL THEN
        notification_enabled := TRUE;
    END IF;
    
    IF notification_enabled THEN
        -- Determine recipient based on notification type
        IF template_type = 'email' AND beneficiary_email IS NOT NULL THEN
            -- Insert email notification
            INSERT INTO recurring_deposit_beneficiary_notification (
                id,
                beneficiary_id,
                recurring_deposit_account_id,
                template_id,
                notification_type,
                recipient,
                subject,
                message,
                status,
                event_type,
                triggered_by,
                created_date
            ) VALUES (
                uuid_generate_v4(),
                p_beneficiary_id,
                account_id,
                template_id,
                template_type,
                beneficiary_email,
                (SELECT subject FROM notification_template WHERE id = template_id),
                -- This would normally use a template engine to replace placeholders.
                -- For simplicity, just getting the message template here.
                (SELECT message_template FROM notification_template WHERE id = template_id),
                'pending',
                template_event_type,
                p_user_id,
                NOW()
            ) RETURNING id INTO notification_id;
            
        ELSIF template_type = 'sms' AND beneficiary_phone IS NOT NULL THEN
            -- Insert SMS notification
            INSERT INTO recurring_deposit_beneficiary_notification (
                id,
                beneficiary_id,
                recurring_deposit_account_id,
                template_id,
                notification_type,
                recipient,
                subject,
                message,
                status,
                event_type,
                triggered_by,
                created_date
            ) VALUES (
                uuid_generate_v4(),
                p_beneficiary_id,
                account_id,
                template_id,
                template_type,
                beneficiary_phone,
                (SELECT subject FROM notification_template WHERE id = template_id),
                -- This would normally use a template engine to replace placeholders.
                -- For simplicity, just getting the message template here.
                (SELECT message_template FROM notification_template WHERE id = template_id),
                'pending',
                template_event_type,
                p_user_id,
                NOW()
            ) RETURNING id INTO notification_id;
        ELSE
            RAISE EXCEPTION 'Contact information missing for beneficiary notification type %', template_type;
        END IF;
        
        RETURN notification_id;
    ELSE
        RAISE EXCEPTION 'Notification is disabled for this beneficiary and event type';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert permissions for beneficiary management
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_RDBENEFICIARY', 'RDBENEFICIARY', 'CREATE', true),
('portfolio', 'UPDATE_RDBENEFICIARY', 'RDBENEFICIARY', 'UPDATE', true),
('portfolio', 'DELETE_RDBENEFICIARY', 'RDBENEFICIARY', 'DELETE', true),
('portfolio', 'VERIFY_RDBENEFICIARY', 'RDBENEFICIARY', 'VERIFY', true);

-- Comments for clarity
COMMENT ON TABLE recurring_deposit_beneficiary IS 'Stores beneficiaries for recurring deposit accounts';
COMMENT ON COLUMN recurring_deposit_beneficiary.relationship_type IS 'Relationship of the beneficiary to the account owner (e.g., spouse, child, parent)';
COMMENT ON COLUMN recurring_deposit_beneficiary.percentage_share IS 'Percentage of the account balance that the beneficiary will receive';
COMMENT ON COLUMN recurring_deposit_beneficiary.verification_status IS 'Status of beneficiary verification (pending, verified, rejected)';
COMMENT ON TABLE recurring_deposit_beneficiary_notification IS 'Records of notifications sent to recurring deposit beneficiaries';
COMMENT ON TABLE recurring_deposit_beneficiary_notification_preference IS 'Preferences for recurring deposit beneficiary notifications';
COMMENT ON FUNCTION validate_rd_beneficiary_percentage_share() IS 'Ensures that total beneficiary percentage shares do not exceed 100% for a recurring deposit account';
COMMENT ON FUNCTION notify_rd_beneficiary_status_change() IS 'Trigger function to automatically generate notifications when beneficiary status changes';
COMMENT ON FUNCTION notify_rd_beneficiaries_on_account_status_change() IS 'Trigger function to notify beneficiaries when account status changes (maturity, premature closure)';
COMMENT ON FUNCTION send_rd_beneficiary_notification(UUID, VARCHAR, UUID) IS 'Function to manually send a notification to a recurring deposit beneficiary using a specific template';