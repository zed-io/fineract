-- Migration for recurring deposit installment tracking notification templates
-- Adds notification templates and configurations for tracking installments

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create notification templates for recurring deposit installments
INSERT INTO notification_template (
  id, 
  name, 
  code, 
  subject, 
  message_template, 
  template_type, 
  is_active, 
  created_date
) VALUES 
(
  uuid_generate_v4(), 
  'Recurring Deposit Installment Due Reminder', 
  'recurring_deposit_installment_due', 
  'Reminder: Your Recurring Deposit Installment is Due Soon',
  'Dear {{clientName}},

This is a friendly reminder that your Recurring Deposit installment of {{amount}} {{currency}} for account {{accountNo}} is due on {{dueDate}}.

Please ensure your account has sufficient funds for the deposit or visit any branch to make your payment.

Thank you for your continued business.

Regards,
The Fineract Team',
  'email', 
  true, 
  NOW()
),
(
  uuid_generate_v4(), 
  'Recurring Deposit Installment Overdue Notification', 
  'recurring_deposit_overdue', 
  'IMPORTANT: Your Recurring Deposit Installment is Overdue',
  'Dear {{clientName}},

Your Recurring Deposit installment of {{amount}} {{currency}} for account {{accountNo}} was due on {{dueDate}} and is now overdue.

Please make your payment at your earliest convenience to avoid penalties and maintain the good standing of your account.

Current overdue amount: {{overdueAmount}} {{currency}}
Number of overdue installments: {{overdueCount}}

If you have already made the payment, please disregard this message.

Regards,
The Fineract Team',
  'email', 
  true, 
  NOW()
),
(
  uuid_generate_v4(), 
  'Recurring Deposit Penalty Applied Notification', 
  'recurring_deposit_penalty_applied', 
  'Penalty Applied to Your Recurring Deposit Account',
  'Dear {{clientName}},

A penalty of {{penaltyAmount}} {{currency}} has been applied to your Recurring Deposit account {{accountNo}} due to missed installment(s).

Missed installment due date: {{dueDate}}
Total overdue amount: {{overdueAmount}} {{currency}}
Number of overdue installments: {{overdueCount}}

Please make your payment at your earliest convenience to avoid further penalties.

Regards,
The Fineract Team',
  'email', 
  true, 
  NOW()
);

-- Create SMS notification templates
INSERT INTO notification_template (
  id, 
  name, 
  code, 
  subject, 
  message_template, 
  template_type, 
  is_active, 
  created_date
) VALUES 
(
  uuid_generate_v4(), 
  'Recurring Deposit Installment Due SMS', 
  'recurring_deposit_installment_due_sms', 
  'Deposit Reminder',
  'Reminder: Your Recurring Deposit installment of {{amount}} is due on {{dueDate}}. Acct: {{accountNo}}',
  'sms', 
  true, 
  NOW()
),
(
  uuid_generate_v4(), 
  'Recurring Deposit Installment Overdue SMS', 
  'recurring_deposit_overdue_sms', 
  'Overdue Deposit',
  'ALERT: Your RD installment of {{amount}} was due on {{dueDate}} and is now overdue. Acct: {{accountNo}}',
  'sms', 
  true, 
  NOW()
),
(
  uuid_generate_v4(), 
  'Recurring Deposit Penalty Applied SMS', 
  'recurring_deposit_penalty_applied_sms', 
  'Penalty Applied',
  'NOTICE: A penalty of {{penaltyAmount}} has been applied to your RD account {{accountNo}} due to missed installment(s).',
  'sms', 
  true, 
  NOW()
);

-- Create notification preferences for recurring deposit reminders
INSERT INTO notification_preferences (
  id,
  notification_type,
  entity_type,
  entity_event,
  is_enabled,
  delivery_method,
  delivery_channel_type,
  created_date
) VALUES 
(
  uuid_generate_v4(),
  'recurring_deposit_installment_due',
  'recurring_deposit',
  'installment_due',
  true,
  'both',
  'email',
  NOW()
),
(
  uuid_generate_v4(),
  'recurring_deposit_overdue',
  'recurring_deposit',
  'installment_overdue',
  true,
  'both',
  'email',
  NOW()
),
(
  uuid_generate_v4(),
  'recurring_deposit_penalty_applied',
  'recurring_deposit',
  'penalty_applied',
  true,
  'both',
  'email',
  NOW()
),
(
  uuid_generate_v4(),
  'recurring_deposit_installment_due_sms',
  'recurring_deposit',
  'installment_due',
  true,
  'both',
  'sms',
  NOW()
),
(
  uuid_generate_v4(),
  'recurring_deposit_overdue_sms',
  'recurring_deposit',
  'installment_overdue',
  true,
  'both',
  'sms',
  NOW()
),
(
  uuid_generate_v4(),
  'recurring_deposit_penalty_applied_sms',
  'recurring_deposit',
  'penalty_applied',
  true,
  'both',
  'sms',
  NOW()
);

-- Insert default notification scheduling configuration
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
  'recurring_deposit_installment_reminder', 
  true, 
  '0 8 * * *', 
  'daily', 
  'medium', 
  2, 
  1800, 
  true, 
  1, 
  'Send reminders for upcoming recurring deposit installments',
  jsonb_build_object(
    'days_before_due', 3,
    'include_overdue', true,
    'notification_types', ARRAY['email', 'sms'],
    'max_notifications_per_run', 500
  )
);

-- Update the recurring_deposit_installment_tracking job configuration
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
  'recurring_deposit_installment_tracking', 
  true, 
  '0 3 * * *', 
  'daily', 
  'high', 
  3, 
  3600, 
  true, 
  1, 
  'Track recurring deposit installments and identify overdue accounts',
  jsonb_build_object(
    'apply_penalties', true,
    'send_notifications', true,
    'track_overdue_only', false,
    'batch_size', 500,
    'penalty_grace_period_days', 5
  )
)
ON CONFLICT (job_type) DO UPDATE SET
  parameters = jsonb_build_object(
    'apply_penalties', true,
    'send_notifications', true,
    'track_overdue_only', false,
    'batch_size', 500,
    'penalty_grace_period_days', 5
  ),
  description = 'Track recurring deposit installments and identify overdue accounts';