-- Migration file for Savings Account Beneficiary Notifications
-- Adds notification tables, templates and functionality for beneficiary management

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create a table for notification templates specific to beneficiaries
CREATE TABLE IF NOT EXISTS savings_beneficiary_notification_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) NOT NULL,
    template_code VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(200),
    message_template TEXT NOT NULL,
    template_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    event_type VARCHAR(50) NOT NULL, -- 'verification', 'addition', 'modification', 'removal', etc.
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create a table for storing notification records for beneficiaries
CREATE TABLE IF NOT EXISTS savings_beneficiary_notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID NOT NULL REFERENCES savings_account_beneficiary(id) ON DELETE CASCADE,
    savings_account_id UUID NOT NULL REFERENCES savings_account(id), 
    template_id UUID REFERENCES savings_beneficiary_notification_template(id),
    notification_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    recipient VARCHAR(255) NOT NULL, -- email address or phone number
    subject VARCHAR(200),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pending', 'sent', 'failed', 'delivered'
    error_message TEXT,
    event_type VARCHAR(50) NOT NULL, -- 'verification', 'addition', 'modification', 'removal', etc.
    triggered_by UUID,
    sent_date TIMESTAMP,
    delivery_date TIMESTAMP,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create a table for beneficiary notification preferences
CREATE TABLE IF NOT EXISTS savings_beneficiary_notification_preference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID NOT NULL REFERENCES savings_account_beneficiary(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    event_type VARCHAR(50) NOT NULL, -- 'verification', 'addition', 'modification', 'removal', etc.
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(beneficiary_id, notification_type, event_type)
);

-- Insert default notification templates for common beneficiary events
INSERT INTO savings_beneficiary_notification_template (
    id, 
    template_name, 
    template_code, 
    subject, 
    message_template, 
    template_type, 
    event_type, 
    description,
    is_active, 
    created_date
) VALUES 
-- Email templates
(
    uuid_generate_v4(), 
    'Beneficiary Addition Notification', 
    'BENEFICIARY_ADDITION_EMAIL', 
    'You have been added as a beneficiary',
    'Dear {{beneficiaryName}},

You have been added as a beneficiary to savings account {{accountNo}} by {{accountOwnerName}}.

Your beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%

If you have any questions or concerns, please contact our support team.

Thank you,
The Fineract Team',
    'email', 
    'addition', 
    'Email notification sent to beneficiaries when they are added to an account',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Verification Notification', 
    'BENEFICIARY_VERIFICATION_EMAIL', 
    'Your beneficiary status has been verified',
    'Dear {{beneficiaryName}},

Your beneficiary status for savings account {{accountNo}} has been verified and approved.

Your beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%

If you have any questions or concerns, please contact our support team.

Thank you,
The Fineract Team',
    'email', 
    'verification', 
    'Email notification sent to beneficiaries when their status is verified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Modification Notification', 
    'BENEFICIARY_MODIFICATION_EMAIL', 
    'Your beneficiary details have been updated',
    'Dear {{beneficiaryName}},

Your beneficiary details for savings account {{accountNo}} have been updated.

Updated beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%

If you did not authorize this change or have any concerns, please contact our support team immediately.

Thank you,
The Fineract Team',
    'email', 
    'modification', 
    'Email notification sent to beneficiaries when their details are modified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Removal Notification', 
    'BENEFICIARY_REMOVAL_EMAIL', 
    'You have been removed as a beneficiary',
    'Dear {{beneficiaryName}},

You have been removed as a beneficiary from savings account {{accountNo}}.

If you did not authorize this change or have any concerns, please contact our support team immediately.

Thank you,
The Fineract Team',
    'email', 
    'removal', 
    'Email notification sent to beneficiaries when they are removed from an account',
    true, 
    NOW()
),

-- SMS templates
(
    uuid_generate_v4(), 
    'Beneficiary Addition SMS', 
    'BENEFICIARY_ADDITION_SMS', 
    'Beneficiary Addition',
    'You have been added as a beneficiary to savings account {{accountNo}} with {{percentageShare}}% share. For queries, contact support.',
    'sms', 
    'addition', 
    'SMS notification sent to beneficiaries when they are added to an account',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Verification SMS', 
    'BENEFICIARY_VERIFICATION_SMS', 
    'Beneficiary Verified',
    'Your beneficiary status for savings account {{accountNo}} has been verified and approved with {{percentageShare}}% share.',
    'sms', 
    'verification', 
    'SMS notification sent to beneficiaries when their status is verified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Modification SMS', 
    'BENEFICIARY_MODIFICATION_SMS', 
    'Beneficiary Updated',
    'Your beneficiary details for savings account {{accountNo}} have been updated. New share: {{percentageShare}}%.',
    'sms', 
    'modification', 
    'SMS notification sent to beneficiaries when their details are modified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Removal SMS', 
    'BENEFICIARY_REMOVAL_SMS', 
    'Beneficiary Removed',
    'You have been removed as a beneficiary from savings account {{accountNo}}. For queries, contact support.',
    'sms', 
    'removal', 
    'SMS notification sent to beneficiaries when they are removed from an account',
    true, 
    NOW()
);

-- Add default notification preferences for account owners
INSERT INTO savings_beneficiary_notification_preference (
    id,
    beneficiary_id,
    notification_type,
    event_type,
    is_enabled,
    created_date
)
SELECT 
    uuid_generate_v4(),
    sab.id,
    'email',
    'verification',
    true,
    NOW()
FROM 
    savings_account_beneficiary sab
WHERE 
    sab.email IS NOT NULL AND sab.is_active = true;

INSERT INTO savings_beneficiary_notification_preference (
    id,
    beneficiary_id,
    notification_type,
    event_type,
    is_enabled,
    created_date
)
SELECT 
    uuid_generate_v4(),
    sab.id,
    'sms',
    'verification',
    true,
    NOW()
FROM 
    savings_account_beneficiary sab
WHERE 
    sab.contact_number IS NOT NULL AND sab.is_active = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_beneficiary_notification_beneficiary_id ON savings_beneficiary_notification(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notification_savings_account_id ON savings_beneficiary_notification(savings_account_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notification_status ON savings_beneficiary_notification(status);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notification_event_type ON savings_beneficiary_notification(event_type);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notification_preference_beneficiary_id ON savings_beneficiary_notification_preference(beneficiary_id);

-- Create a function to send notifications when beneficiary status changes
CREATE OR REPLACE FUNCTION notify_beneficiary_status_change() 
RETURNS TRIGGER AS $$
DECLARE
    template_id UUID;
    template_code VARCHAR(50);
    message_template TEXT;
    subject VARCHAR(200);
    notification_type VARCHAR(20);
    notification_enabled BOOLEAN;
    account_no VARCHAR(20);
    account_owner_name VARCHAR(255);
    client_id UUID;
BEGIN
    -- Only proceed for status changes
    IF (TG_OP = 'UPDATE' AND (OLD.verification_status <> NEW.verification_status OR OLD.is_active <> NEW.is_active)) THEN
        -- Get account information
        SELECT 
            sa.account_no, 
            c.display_name,
            c.id
        INTO 
            account_no, 
            account_owner_name,
            client_id
        FROM 
            savings_account sa
        LEFT JOIN
            client c ON sa.client_id = c.id
        WHERE 
            sa.id = NEW.savings_account_id;
            
        -- Check for email notification
        IF NEW.email IS NOT NULL THEN
            -- Set template based on status change
            IF OLD.is_active = true AND NEW.is_active = false THEN
                -- Beneficiary was removed
                SELECT id, subject, message_template INTO template_id, subject, message_template
                FROM savings_beneficiary_notification_template
                WHERE template_code = 'BENEFICIARY_REMOVAL_EMAIL' AND is_active = true;
                
                notification_type := 'email';
                
                -- Check if notification is enabled
                SELECT is_enabled INTO notification_enabled
                FROM savings_beneficiary_notification_preference
                WHERE beneficiary_id = NEW.id AND notification_type = 'email' AND event_type = 'removal'
                LIMIT 1;
                
            ELSIF NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN
                -- Beneficiary was verified
                SELECT id, subject, message_template INTO template_id, subject, message_template
                FROM savings_beneficiary_notification_template
                WHERE template_code = 'BENEFICIARY_VERIFICATION_EMAIL' AND is_active = true;
                
                notification_type := 'email';
                
                -- Check if notification is enabled
                SELECT is_enabled INTO notification_enabled
                FROM savings_beneficiary_notification_preference
                WHERE beneficiary_id = NEW.id AND notification_type = 'email' AND event_type = 'verification'
                LIMIT 1;
            END IF;
            
            -- Insert notification record if enabled and template exists
            IF notification_enabled AND template_id IS NOT NULL THEN
                INSERT INTO savings_beneficiary_notification (
                    beneficiary_id,
                    savings_account_id,
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
                    NEW.savings_account_id,
                    template_id,
                    notification_type,
                    NEW.email,
                    subject,
                    -- Process template placeholders
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    message_template, 
                                    '{{beneficiaryName}}', NEW.name
                                ),
                                '{{accountNo}}', account_no
                            ),
                            '{{accountOwnerName}}', account_owner_name
                        ),
                        '{{percentageShare}}', NEW.percentage_share::text
                    ),
                    'pending',
                    CASE 
                        WHEN OLD.is_active = true AND NEW.is_active = false THEN 'removal'
                        WHEN NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN 'verification'
                        ELSE 'modification'
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
                SELECT id, subject, message_template INTO template_id, subject, message_template
                FROM savings_beneficiary_notification_template
                WHERE template_code = 'BENEFICIARY_REMOVAL_SMS' AND is_active = true;
                
                notification_type := 'sms';
                
                -- Check if notification is enabled
                SELECT is_enabled INTO notification_enabled
                FROM savings_beneficiary_notification_preference
                WHERE beneficiary_id = NEW.id AND notification_type = 'sms' AND event_type = 'removal'
                LIMIT 1;
                
            ELSIF NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN
                -- Beneficiary was verified
                SELECT id, subject, message_template INTO template_id, subject, message_template
                FROM savings_beneficiary_notification_template
                WHERE template_code = 'BENEFICIARY_VERIFICATION_SMS' AND is_active = true;
                
                notification_type := 'sms';
                
                -- Check if notification is enabled
                SELECT is_enabled INTO notification_enabled
                FROM savings_beneficiary_notification_preference
                WHERE beneficiary_id = NEW.id AND notification_type = 'sms' AND event_type = 'verification'
                LIMIT 1;
            END IF;
            
            -- Insert notification record if enabled and template exists
            IF notification_enabled AND template_id IS NOT NULL THEN
                INSERT INTO savings_beneficiary_notification (
                    beneficiary_id,
                    savings_account_id,
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
                    NEW.savings_account_id,
                    template_id,
                    notification_type,
                    NEW.contact_number,
                    subject,
                    -- Process template placeholders
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    message_template, 
                                    '{{beneficiaryName}}', NEW.name
                                ),
                                '{{accountNo}}', account_no
                            ),
                            '{{accountOwnerName}}', account_owner_name
                        ),
                        '{{percentageShare}}', NEW.percentage_share::text
                    ),
                    'pending',
                    CASE 
                        WHEN OLD.is_active = true AND NEW.is_active = false THEN 'removal'
                        WHEN NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN 'verification'
                        ELSE 'modification'
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

-- Create a trigger for beneficiary status change notifications
CREATE TRIGGER trg_notify_beneficiary_status_change
AFTER UPDATE ON savings_account_beneficiary
FOR EACH ROW
EXECUTE FUNCTION notify_beneficiary_status_change();

-- Create a function to process manual notification sending
CREATE OR REPLACE FUNCTION send_manual_beneficiary_notification(
    p_beneficiary_id UUID,
    p_template_code VARCHAR(50),
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    template_id UUID;
    template_subject VARCHAR(200);
    template_message TEXT;
    template_type VARCHAR(20);
    template_event_type VARCHAR(50);
    account_id UUID;
    account_no VARCHAR(20);
    account_owner_name VARCHAR(255);
    beneficiary_name VARCHAR(255);
    beneficiary_percentage DECIMAL(19, 6);
    beneficiary_email VARCHAR(255);
    beneficiary_phone VARCHAR(50);
    notification_id UUID;
    processed_message TEXT;
    notification_enabled BOOLEAN;
BEGIN
    -- Get template details
    SELECT 
        id, subject, message_template, template_type, event_type
    INTO 
        template_id, template_subject, template_message, template_type, template_event_type
    FROM 
        savings_beneficiary_notification_template
    WHERE 
        template_code = p_template_code
        AND is_active = true;
        
    IF template_id IS NULL THEN
        RAISE EXCEPTION 'Notification template with code % not found or not active', p_template_code;
    END IF;
    
    -- Get beneficiary and account details
    SELECT 
        sab.savings_account_id,
        sab.name,
        sab.percentage_share,
        sab.email,
        sab.contact_number,
        sa.account_no,
        c.display_name
    INTO 
        account_id,
        beneficiary_name,
        beneficiary_percentage,
        beneficiary_email,
        beneficiary_phone,
        account_no,
        account_owner_name
    FROM 
        savings_account_beneficiary sab
    JOIN 
        savings_account sa ON sab.savings_account_id = sa.id
    LEFT JOIN
        client c ON sa.client_id = c.id
    WHERE 
        sab.id = p_beneficiary_id;
        
    IF account_id IS NULL THEN
        RAISE EXCEPTION 'Beneficiary with ID % not found', p_beneficiary_id;
    END IF;
    
    -- Check if notification is enabled
    SELECT is_enabled INTO notification_enabled
    FROM savings_beneficiary_notification_preference
    WHERE beneficiary_id = p_beneficiary_id AND notification_type = template_type AND event_type = template_event_type
    LIMIT 1;
    
    IF notification_enabled IS NULL OR notification_enabled = true THEN
        -- Process message template
        processed_message := REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        template_message, 
                        '{{beneficiaryName}}', beneficiary_name
                    ),
                    '{{accountNo}}', account_no
                ),
                '{{accountOwnerName}}', account_owner_name
            ),
            '{{percentageShare}}', beneficiary_percentage::text
        );
        
        -- Create notification record based on template type
        IF template_type = 'email' AND beneficiary_email IS NOT NULL THEN
            -- Insert email notification
            INSERT INTO savings_beneficiary_notification (
                id,
                beneficiary_id,
                savings_account_id,
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
                'email',
                beneficiary_email,
                template_subject,
                processed_message,
                'pending',
                template_event_type,
                p_user_id,
                NOW()
            ) RETURNING id INTO notification_id;
            
        ELSIF template_type = 'sms' AND beneficiary_phone IS NOT NULL THEN
            -- Insert SMS notification
            INSERT INTO savings_beneficiary_notification (
                id,
                beneficiary_id,
                savings_account_id,
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
                'sms',
                beneficiary_phone,
                template_subject,
                processed_message,
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

-- Job configuration for processing beneficiary notifications
INSERT INTO job_config (
    job_type, 
    enabled, 
    cron_expression, 
    execution_interval, 
    priority, 
    max_retries, 
    timeout_seconds, 
    is_system_job, 
    concurrency_limit, 
    description,
    parameters
) VALUES (
    'beneficiary_notification_processing', 
    true, 
    '*/5 * * * *', 
    'custom', 
    'medium', 
    3, 
    300, 
    true, 
    1, 
    'Process pending beneficiary notifications (email and SMS)',
    jsonb_build_object(
        'batch_size', 100,
        'max_retries', 3,
        'retry_interval_minutes', 15,
        'notification_types', ARRAY['email', 'sms']
    )
);

-- Comments for clarity
COMMENT ON TABLE savings_beneficiary_notification_template IS 'Stores template definitions for beneficiary notifications';
COMMENT ON TABLE savings_beneficiary_notification IS 'Records of notifications sent to beneficiaries';
COMMENT ON TABLE savings_beneficiary_notification_preference IS 'Preferences for beneficiary notifications';
COMMENT ON FUNCTION notify_beneficiary_status_change() IS 'Trigger function to automatically generate notifications when beneficiary status changes';
COMMENT ON FUNCTION send_manual_beneficiary_notification(UUID, VARCHAR, UUID) IS 'Function to manually send a notification to a beneficiary using a specific template';