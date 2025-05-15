-- Migration for scheduled payment reminder notifications
-- This creates DB functions to automatically send repayment reminders

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create a table for storing configured payment reminder settings
CREATE TABLE IF NOT EXISTS payment_reminder_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_name VARCHAR(100) NOT NULL,
    days_in_advance INTEGER NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'loan', 'savings_recurring_deposit', etc.
    notification_types notification_type[] NOT NULL DEFAULT ARRAY['in_app']::"notification_type"[],
    notification_priority notification_priority NOT NULL DEFAULT 'medium',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE (reminder_name, entity_type)
);

-- Create a table for tracking which reminders have been sent to avoid duplicates
CREATE TABLE IF NOT EXISTS payment_reminder_sent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    reminder_configuration_id UUID NOT NULL REFERENCES payment_reminder_configuration(id),
    recipient_id UUID NOT NULL,
    notification_id UUID,
    sent_date TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, entity_type, due_date, reminder_configuration_id)
);

-- Insert default reminder configurations
INSERT INTO payment_reminder_configuration (
    reminder_name,
    days_in_advance,
    entity_type,
    notification_types,
    notification_priority,
    is_active
) VALUES 
    ('Loan repayment due in 7 days', 7, 'loan', ARRAY['in_app', 'email']::"notification_type"[], 'medium', true),
    ('Loan repayment due in 3 days', 3, 'loan', ARRAY['in_app', 'email', 'sms']::"notification_type"[], 'high', true),
    ('Loan repayment due in 1 day', 1, 'loan', ARRAY['in_app', 'email', 'sms']::"notification_type"[], 'critical', true),
    ('Recurring deposit due in 5 days', 5, 'savings_recurring_deposit', ARRAY['in_app', 'email']::"notification_type"[], 'medium', true),
    ('Recurring deposit due in 1 day', 1, 'savings_recurring_deposit', ARRAY['in_app', 'email', 'sms']::"notification_type"[], 'high', true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_reminder_sent_entity ON payment_reminder_sent(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_sent_due_date ON payment_reminder_sent(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_config_entity_type ON payment_reminder_configuration(entity_type);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_config_is_active ON payment_reminder_configuration(is_active);

-- Create function to send loan payment reminders
CREATE OR REPLACE FUNCTION send_loan_payment_reminders()
RETURNS INTEGER AS $$
DECLARE
    v_reminders_sent INTEGER := 0;
    v_reminder RECORD;
    v_loan RECORD;
    v_due_date DATE;
    v_reminder_date DATE;
    v_notification_id UUID;
    v_client_email VARCHAR(255);
    v_client_phone VARCHAR(100);
    v_template_code VARCHAR(100);
BEGIN
    -- Loop through active reminder configurations for loans
    FOR v_reminder IN 
        SELECT * FROM payment_reminder_configuration 
        WHERE entity_type = 'loan' AND is_active = true
    LOOP
        -- Set reminder date based on days_in_advance
        v_reminder_date := CURRENT_DATE + v_reminder.days_in_advance;
        
        -- Find loans with repayments due on the reminder date
        FOR v_loan IN
            SELECT 
                l.id,
                l.account_no,
                l.client_id,
                c.display_name AS client_name,
                c.email AS client_email,
                c.mobile_no AS client_phone,
                lr.due_date,
                lr.principal_amount,
                lr.interest_amount,
                lr.fee_charges_amount,
                lr.penalty_charges_amount,
                lr.total_amount,
                l.currency_code
            FROM 
                loan l
            JOIN 
                loan_repayment_schedule lr ON l.id = lr.loan_id
            JOIN 
                client c ON l.client_id = c.id
            WHERE 
                l.loan_status = 'Active'
                AND lr.due_date = v_reminder_date
                AND lr.completed = false
                AND NOT EXISTS (
                    SELECT 1 FROM payment_reminder_sent prs
                    WHERE 
                        prs.entity_id = l.id
                        AND prs.entity_type = 'loan'
                        AND prs.due_date = lr.due_date
                        AND prs.reminder_configuration_id = v_reminder.id
                )
        LOOP
            -- Determine template code based on days in advance
            CASE v_reminder.days_in_advance
                WHEN 7 THEN v_template_code := 'LOAN_REPAYMENT_DUE_7_DAYS';
                WHEN 3 THEN v_template_code := 'LOAN_REPAYMENT_DUE_3_DAYS';
                WHEN 1 THEN v_template_code := 'LOAN_REPAYMENT_DUE_1_DAY';
                ELSE v_template_code := 'LOAN_REPAYMENT_DUE_REMINDER';
            END CASE;
            
            -- Process each notification type
            IF 'in_app' = ANY(v_reminder.notification_types) THEN
                -- Send in-app notification
                SELECT send_notification(
                    v_loan.client_id,
                    'client',
                    'in_app',
                    v_template_code,
                    jsonb_build_object(
                        'loanId', v_loan.id,
                        'loanAccountNo', v_loan.account_no,
                        'clientName', v_loan.client_name,
                        'dueDate', v_loan.due_date,
                        'totalAmount', v_loan.total_amount,
                        'currency', v_loan.currency_code,
                        'daysInAdvance', v_reminder.days_in_advance
                    ),
                    'loan',
                    'loan_repayment',
                    v_loan.id,
                    v_reminder.notification_priority,
                    NULL,
                    NULL
                ) INTO v_notification_id;
            END IF;
            
            -- Record that reminder was sent
            INSERT INTO payment_reminder_sent (
                entity_id,
                entity_type,
                due_date,
                reminder_configuration_id,
                recipient_id,
                notification_id
            ) VALUES (
                v_loan.id,
                'loan',
                v_loan.due_date,
                v_reminder.id,
                v_loan.client_id,
                v_notification_id
            );
            
            v_reminders_sent := v_reminders_sent + 1;
        END LOOP;
    END LOOP;
    
    RETURN v_reminders_sent;
END;
$$ LANGUAGE plpgsql;

-- Create function to send recurring deposit payment reminders
CREATE OR REPLACE FUNCTION send_recurring_deposit_reminders()
RETURNS INTEGER AS $$
DECLARE
    v_reminders_sent INTEGER := 0;
    v_reminder RECORD;
    v_deposit RECORD;
    v_due_date DATE;
    v_reminder_date DATE;
    v_notification_id UUID;
    v_template_code VARCHAR(100);
BEGIN
    -- Loop through active reminder configurations for recurring deposits
    FOR v_reminder IN 
        SELECT * FROM payment_reminder_configuration 
        WHERE entity_type = 'savings_recurring_deposit' AND is_active = true
    LOOP
        -- Set reminder date based on days_in_advance
        v_reminder_date := CURRENT_DATE + v_reminder.days_in_advance;
        
        -- Find recurring deposits with installments due on the reminder date
        FOR v_deposit IN
            SELECT 
                rd.id,
                rd.account_no,
                sa.client_id,
                c.display_name AS client_name,
                c.email AS client_email,
                c.mobile_no AS client_phone,
                rd.next_installment_date AS due_date,
                rd.deposit_amount,
                sa.currency_code
            FROM 
                recurring_deposit rd
            JOIN 
                savings_account sa ON rd.savings_account_id = sa.id
            JOIN 
                client c ON sa.client_id = c.id
            WHERE 
                sa.status = 'Active'
                AND rd.next_installment_date = v_reminder_date
                AND NOT EXISTS (
                    SELECT 1 FROM payment_reminder_sent prs
                    WHERE 
                        prs.entity_id = rd.id
                        AND prs.entity_type = 'savings_recurring_deposit'
                        AND prs.due_date = rd.next_installment_date
                        AND prs.reminder_configuration_id = v_reminder.id
                )
        LOOP
            -- Determine template code based on days in advance
            CASE v_reminder.days_in_advance
                WHEN 5 THEN v_template_code := 'RECURRING_DEPOSIT_DUE_5_DAYS';
                WHEN 1 THEN v_template_code := 'RECURRING_DEPOSIT_DUE_1_DAY';
                ELSE v_template_code := 'RECURRING_DEPOSIT_DUE_REMINDER';
            END CASE;
            
            -- Process each notification type
            IF 'in_app' = ANY(v_reminder.notification_types) THEN
                -- Send in-app notification
                SELECT send_notification(
                    v_deposit.client_id,
                    'client',
                    'in_app',
                    v_template_code,
                    jsonb_build_object(
                        'depositId', v_deposit.id,
                        'accountNo', v_deposit.account_no,
                        'clientName', v_deposit.client_name,
                        'dueDate', v_deposit.due_date,
                        'amount', v_deposit.deposit_amount,
                        'currency', v_deposit.currency_code,
                        'daysInAdvance', v_reminder.days_in_advance
                    ),
                    'savings',
                    'recurring_deposit',
                    v_deposit.id,
                    v_reminder.notification_priority,
                    NULL,
                    NULL
                ) INTO v_notification_id;
            END IF;
            
            -- Record that reminder was sent
            INSERT INTO payment_reminder_sent (
                entity_id,
                entity_type,
                due_date,
                reminder_configuration_id,
                recipient_id,
                notification_id
            ) VALUES (
                v_deposit.id,
                'savings_recurring_deposit',
                v_deposit.due_date,
                v_reminder.id,
                v_deposit.client_id,
                v_notification_id
            );
            
            v_reminders_sent := v_reminders_sent + 1;
        END LOOP;
    END LOOP;
    
    RETURN v_reminders_sent;
END;
$$ LANGUAGE plpgsql;

-- Add scheduled job configuration for payment reminders
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
    'payment_reminder_processing', 
    true, 
    '0 9 * * *',  -- Run daily at 9 AM
    'daily', 
    'high', 
    3, 
    600, 
    true, 
    1, 
    'Process payment reminders for loans and recurring deposits',
    jsonb_build_object(
        'reminder_types', ARRAY['loan', 'savings_recurring_deposit']::text[]
    )
);

-- Create notification templates for payment reminders
INSERT INTO notification_template (
    name,
    code,
    subject,
    message_template,
    applicable_types,
    module,
    event_type,
    description,
    placeholders,
    is_active
) VALUES 
    (
        'Loan Repayment Due in 7 Days',
        'LOAN_REPAYMENT_DUE_7_DAYS',
        'Upcoming Loan Payment Reminder',
        'Dear {{clientName}},\n\nThis is a friendly reminder that your loan payment of {{currency}} {{totalAmount}} for account {{loanAccountNo}} is due in 7 days, on {{dueDate}}.\n\nPlease make your payment on time to avoid any late fees or penalties.\n\nThank you for your business.',
        ARRAY['email', 'in_app', 'sms']::"notification_type"[],
        'loan',
        'repayment_reminder',
        'Notification template for loan repayments due in 7 days',
        jsonb_build_object(
            'clientName', 'Client name',
            'loanAccountNo', 'Loan account number',
            'dueDate', 'Due date of the repayment',
            'totalAmount', 'Total amount due',
            'currency', 'Currency code'
        ),
        true
    ),
    (
        'Loan Repayment Due in 3 Days',
        'LOAN_REPAYMENT_DUE_3_DAYS',
        'Upcoming Loan Payment - 3 Days Left',
        'Dear {{clientName}},\n\nYour loan payment of {{currency}} {{totalAmount}} for account {{loanAccountNo}} is due in 3 days, on {{dueDate}}.\n\nPlease ensure your account has sufficient funds for the payment.\n\nThank you for your business.',
        ARRAY['email', 'in_app', 'sms']::"notification_type"[],
        'loan',
        'repayment_reminder',
        'Notification template for loan repayments due in 3 days',
        jsonb_build_object(
            'clientName', 'Client name',
            'loanAccountNo', 'Loan account number',
            'dueDate', 'Due date of the repayment',
            'totalAmount', 'Total amount due',
            'currency', 'Currency code'
        ),
        true
    ),
    (
        'Loan Repayment Due Tomorrow',
        'LOAN_REPAYMENT_DUE_1_DAY',
        'URGENT: Loan Payment Due Tomorrow',
        'Dear {{clientName}},\n\nThis is an urgent reminder that your loan payment of {{currency}} {{totalAmount}} for account {{loanAccountNo}} is due TOMORROW, on {{dueDate}}.\n\nPlease make your payment immediately to avoid late fees and negative credit reporting.\n\nThank you for your business.',
        ARRAY['email', 'in_app', 'sms']::"notification_type"[],
        'loan',
        'repayment_reminder',
        'Notification template for loan repayments due tomorrow',
        jsonb_build_object(
            'clientName', 'Client name',
            'loanAccountNo', 'Loan account number',
            'dueDate', 'Due date of the repayment',
            'totalAmount', 'Total amount due',
            'currency', 'Currency code'
        ),
        true
    ),
    (
        'Recurring Deposit Due in 5 Days',
        'RECURRING_DEPOSIT_DUE_5_DAYS',
        'Upcoming Deposit Reminder',
        'Dear {{clientName}},\n\nThis is a friendly reminder that your recurring deposit installment of {{currency}} {{amount}} for account {{accountNo}} is due in 5 days, on {{dueDate}}.\n\nPlease ensure you have the funds ready for this deposit to continue building your savings.\n\nThank you for your business.',
        ARRAY['email', 'in_app', 'sms']::"notification_type"[],
        'savings',
        'deposit_reminder',
        'Notification template for recurring deposits due in 5 days',
        jsonb_build_object(
            'clientName', 'Client name',
            'accountNo', 'Account number',
            'dueDate', 'Due date of the deposit',
            'amount', 'Deposit amount',
            'currency', 'Currency code'
        ),
        true
    ),
    (
        'Recurring Deposit Due Tomorrow',
        'RECURRING_DEPOSIT_DUE_1_DAY',
        'Recurring Deposit Due Tomorrow',
        'Dear {{clientName}},\n\nYour recurring deposit installment of {{currency}} {{amount}} for account {{accountNo}} is due TOMORROW, on {{dueDate}}.\n\nPlease ensure you have the funds ready to make this deposit to maintain your savings plan and earn maximum interest.\n\nThank you for your business.',
        ARRAY['email', 'in_app', 'sms']::"notification_type"[],
        'savings',
        'deposit_reminder',
        'Notification template for recurring deposits due tomorrow',
        jsonb_build_object(
            'clientName', 'Client name',
            'accountNo', 'Account number',
            'dueDate', 'Due date of the deposit',
            'amount', 'Deposit amount',
            'currency', 'Currency code'
        ),
        true
    );

-- Comments for clarity
COMMENT ON TABLE payment_reminder_configuration IS 'Stores configurations for payment reminders';
COMMENT ON TABLE payment_reminder_sent IS 'Tracks sent payment reminders to avoid duplicates';
COMMENT ON FUNCTION send_loan_payment_reminders() IS 'Sends notifications for upcoming loan repayments';
COMMENT ON FUNCTION send_recurring_deposit_reminders() IS 'Sends notifications for upcoming recurring deposit installments';