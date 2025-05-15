-- Seed data for savings account dormancy management
-- This script updates existing savings products with dormancy configurations

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Update savings products with dormancy tracking
UPDATE savings_product
SET 
  is_dormancy_tracking_active = TRUE,
  days_to_inactive = 90,
  days_to_dormancy = 180,
  days_to_escheat = 1825,  -- 5 years
  dormancy_fee_amount = 5.00,
  dormancy_fee_period_frequency = 1,
  dormancy_fee_period_frequency_type = 'monthly',
  dormancy_notification_days = ARRAY[30, 15, 5],
  reactivation_allowed = TRUE,
  auto_reactivate_on_credit = TRUE
WHERE name LIKE '%Basic Savings%';

-- Add historical dormancy transitions for some test accounts
WITH dormant_accounts AS (
  SELECT 
    id, 
    CURRENT_DATE - INTERVAL '60 days' as dormant_date
  FROM 
    savings_account
  WHERE 
    status = 'active'
  LIMIT 5
)
UPDATE savings_account
SET 
  sub_status = 'dormant',
  dormant_on_date = da.dormant_date,
  last_active_transaction_date = da.dormant_date - INTERVAL '180 days',
  dormancy_reason = 'Account inactivity'
FROM 
  dormant_accounts da
WHERE 
  savings_account.id = da.id;

-- Insert dormancy log entries for these accounts
INSERT INTO savings_account_dormancy_log
  (savings_account_id, transition_date, previous_status, new_status, reason, notes, created_date)
SELECT 
  id, 
  dormant_on_date, 
  'none', 
  'dormant', 
  'Account inactivity', 
  'Automatic transition due to inactivity', 
  NOW()
FROM 
  savings_account
WHERE 
  sub_status = 'dormant'
  AND dormant_on_date IS NOT NULL;