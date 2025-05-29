-- Trinidad Mock Data: Accounts and Transactions
-- This file creates sample accounts and transaction history for Trinidad clients

SET search_path TO "default";

BEGIN;

-- Savings Accounts for Trinidad Clients
INSERT INTO m_savings_account (id, account_no, external_id, client_id, group_id, product_id, field_officer_id, status_enum, 
    activation_date, activatedon_userid, currency_code, currency_digits, currency_multiplesof, 
    nominal_annual_interest_rate, interest_compounding_period_enum, interest_posting_period_enum, 
    interest_calculation_type_enum, interest_calculation_days_in_year_type_enum, 
    min_required_opening_balance, lockin_period_frequency, lockin_period_frequency_enum, 
    withdrawal_fee_for_transfer, allow_overdraft, overdraft_limit, nominal_annual_interest_rate_overdraft, 
    min_overdraft_for_interest_calculation, withhold_tax, tax_group_id, version, account_balance_derived,
    total_deposits_derived, total_withdrawals_derived, total_interest_earned_derived, total_interest_posted_derived,
    total_withdrawal_fees_derived, total_fees_charges_derived, total_overdraft_interest_derived,
    deposit_type_enum, account_type, created_date, created_by, last_modified_date, last_modified_by)
SELECT 
    uuid_generate_v4(),
    'SAV' || LPAD(ROW_NUMBER() OVER ()::text, 8, '0'),
    NULL,
    c.id,
    NULL,
    sp.id,
    s.id,
    300, -- Active
    '2024-01-15',
    1,
    'TTD',
    2,
    1,
    sp.nominal_annual_interest_rate,
    1, -- Daily
    4, -- Monthly
    1, -- Daily Balance
    365, -- Actual/365
    sp.min_required_opening_balance,
    NULL,
    NULL,
    FALSE,
    FALSE,
    0,
    0,
    0,
    FALSE,
    NULL,
    1,
    CASE 
        WHEN ROW_NUMBER() OVER () % 4 = 0 THEN 15000.00
        WHEN ROW_NUMBER() OVER () % 4 = 1 THEN 50000.00
        WHEN ROW_NUMBER() OVER () % 4 = 2 THEN 125000.00
        ELSE 8500.00
    END,
    0, 0, 0, 0, 0, 0, 0,
    100, -- Regular savings
    1, -- Individual
    NOW(),
    1,
    NOW(),
    1
FROM m_client c
CROSS JOIN LATERAL (
    SELECT * FROM m_savings_product 
    WHERE name IN ('Regular Savings Account', 'Premium Savings Account', 'Youth Savings Account')
    ORDER BY RANDOM() LIMIT 1
) sp
CROSS JOIN LATERAL (
    SELECT * FROM m_staff WHERE office_id = c.office_id LIMIT 1
) s
WHERE NOT EXISTS (
    SELECT 1 FROM m_savings_account sa WHERE sa.client_id = c.id
)
LIMIT 50;

-- Fixed Deposit Accounts
INSERT INTO m_fixed_deposit_account (id, savings_account_id, deposit_amount, deposit_period, deposit_period_frequency_enum,
    maturity_date, maturity_amount, interest_rate, created_date, created_by, last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    sa.id,
    CASE 
        WHEN ROW_NUMBER() OVER () % 3 = 0 THEN 100000.00
        WHEN ROW_NUMBER() OVER () % 3 = 1 THEN 250000.00
        ELSE 500000.00
    END,
    CASE 
        WHEN ROW_NUMBER() OVER () % 3 = 0 THEN 6
        WHEN ROW_NUMBER() OVER () % 3 = 1 THEN 12
        ELSE 24
    END,
    2, -- Months
    CASE 
        WHEN ROW_NUMBER() OVER () % 3 = 0 THEN sa.activation_date + INTERVAL '6 months'
        WHEN ROW_NUMBER() OVER () % 3 = 1 THEN sa.activation_date + INTERVAL '12 months'
        ELSE sa.activation_date + INTERVAL '24 months'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER () % 3 = 0 THEN 100000.00 * 1.025
        WHEN ROW_NUMBER() OVER () % 3 = 1 THEN 250000.00 * 1.06
        ELSE 500000.00 * 1.14
    END,
    CASE 
        WHEN ROW_NUMBER() OVER () % 3 = 0 THEN 5.0
        WHEN ROW_NUMBER() OVER () % 3 = 1 THEN 6.0
        ELSE 7.0
    END,
    NOW(),
    1,
    NOW(),
    1
FROM m_savings_account sa
WHERE sa.status_enum = 300
ORDER BY RANDOM()
LIMIT 20;

-- Recurring Deposit Accounts
INSERT INTO m_recurring_deposit_account (id, savings_account_id, recurring_deposit_amount, deposit_period, 
    deposit_period_frequency_enum, total_deposits_derived, maturity_date, maturity_amount, interest_rate,
    is_calendar_inherited, recurring_frequency, recurring_frequency_type, recurring_interval,
    created_date, created_by, last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    sa.id,
    CASE 
        WHEN ROW_NUMBER() OVER () % 4 = 0 THEN 500.00  -- Carnival Saver
        WHEN ROW_NUMBER() OVER () % 4 = 1 THEN 1000.00
        WHEN ROW_NUMBER() OVER () % 4 = 2 THEN 2500.00
        ELSE 5000.00
    END,
    12, -- 12 months
    2, -- Monthly
    0,
    sa.activation_date + INTERVAL '12 months',
    CASE 
        WHEN ROW_NUMBER() OVER () % 4 = 0 THEN 500.00 * 12 * 1.04
        WHEN ROW_NUMBER() OVER () % 4 = 1 THEN 1000.00 * 12 * 1.04
        WHEN ROW_NUMBER() OVER () % 4 = 2 THEN 2500.00 * 12 * 1.04
        ELSE 5000.00 * 12 * 1.04
    END,
    4.0, -- 4% interest
    FALSE,
    1, -- Monthly
    2, -- Month frequency type
    1, -- Every 1 month
    NOW(),
    1,
    NOW(),
    1
FROM m_savings_account sa
WHERE sa.status_enum = 300
ORDER BY RANDOM()
LIMIT 25;

-- Loan Accounts
INSERT INTO m_loan (id, account_no, external_id, client_id, group_id, product_id, fund_id, loan_officer_id,
    loan_type_enum, currency_code, currency_digits, currency_multiplesof, principal_amount, principal_amount_proposed,
    approved_principal, nominal_interest_rate_per_period, interest_period_frequency_enum, 
    annual_nominal_interest_rate, interest_method_enum, interest_calculated_in_period_enum,
    term_frequency, term_period_frequency_enum, repay_every, repayment_period_frequency_enum,
    number_of_repayments, amortization_method_enum, total_overpaid_derived, loan_status_id,
    loan_sub_status_id, is_npa, days_in_month_enum, days_in_year_enum, interest_recalculation_enabled,
    create_standing_instruction_at_disbursement, loan_transaction_strategy_code, loan_transaction_strategy_name,
    principal_disbursed_derived, principal_repaid_derived, principal_writtenoff_derived,
    principal_outstanding_derived, interest_charged_derived, interest_repaid_derived,
    interest_waived_derived, interest_writtenoff_derived, interest_outstanding_derived,
    fee_charges_charged_derived, fee_charges_repaid_derived, fee_charges_waived_derived,
    fee_charges_writtenoff_derived, fee_charges_outstanding_derived, penalty_charges_charged_derived,
    penalty_charges_repaid_derived, penalty_charges_waived_derived, penalty_charges_writtenoff_derived,
    penalty_charges_outstanding_derived, total_expected_repayment_derived, total_repayment_derived,
    total_expected_costofloan_derived, total_costofloan_derived, total_waived_derived,
    total_writtenoff_derived, total_outstanding_derived, total_overpaid_derived_2,
    rejectedon_date, rejectedon_userid, rescheduledon_date, rescheduledon_userid,
    withdrawnon_date, withdrawnon_userid, disbursedon_date, disbursedon_userid,
    closedon_date, closedon_userid, writtenoffon_date, expected_disbursedon_date,
    expected_firstrepaymenton_date, interest_calculated_from_date, expected_maturedon_date,
    version, created_date, created_by, last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    'LN' || LPAD(ROW_NUMBER() OVER ()::text, 8, '0'),
    NULL,
    c.id,
    NULL,
    lp.id,
    NULL,
    s.id,
    1, -- Individual loan
    'TTD',
    2,
    1,
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 1500000.00
        WHEN lp.name LIKE '%Business%' THEN 500000.00
        WHEN lp.name LIKE '%Education%' THEN 150000.00
        WHEN lp.name LIKE '%Agricultural%' THEN 300000.00
        WHEN lp.name LIKE '%Carnival%' THEN 25000.00
        ELSE 100000.00
    END,
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 1500000.00
        WHEN lp.name LIKE '%Business%' THEN 500000.00
        WHEN lp.name LIKE '%Education%' THEN 150000.00
        WHEN lp.name LIKE '%Agricultural%' THEN 300000.00
        WHEN lp.name LIKE '%Carnival%' THEN 25000.00
        ELSE 100000.00
    END,
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 1500000.00
        WHEN lp.name LIKE '%Business%' THEN 500000.00
        WHEN lp.name LIKE '%Education%' THEN 150000.00
        WHEN lp.name LIKE '%Agricultural%' THEN 300000.00
        WHEN lp.name LIKE '%Carnival%' THEN 25000.00
        ELSE 100000.00
    END,
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 0.625  -- 7.5% annually
        WHEN lp.name LIKE '%Business%' THEN 0.833  -- 10% annually
        WHEN lp.name LIKE '%Education%' THEN 0.5  -- 6% annually
        WHEN lp.name LIKE '%Agricultural%' THEN 0.75  -- 9% annually
        WHEN lp.name LIKE '%Carnival%' THEN 1.0  -- 12% annually
        ELSE 0.75
    END,
    2, -- Monthly
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 7.5
        WHEN lp.name LIKE '%Business%' THEN 10.0
        WHEN lp.name LIKE '%Education%' THEN 6.0
        WHEN lp.name LIKE '%Agricultural%' THEN 9.0
        WHEN lp.name LIKE '%Carnival%' THEN 12.0
        ELSE 9.0
    END,
    1, -- Declining balance
    1, -- Same as repayment
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 240  -- 20 years
        WHEN lp.name LIKE '%Business%' THEN 60  -- 5 years
        WHEN lp.name LIKE '%Education%' THEN 48  -- 4 years
        WHEN lp.name LIKE '%Agricultural%' THEN 36  -- 3 years
        WHEN lp.name LIKE '%Carnival%' THEN 12  -- 1 year
        ELSE 24
    END,
    2, -- Months
    1, -- Monthly repayment
    2, -- Monthly
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 240
        WHEN lp.name LIKE '%Business%' THEN 60
        WHEN lp.name LIKE '%Education%' THEN 48
        WHEN lp.name LIKE '%Agricultural%' THEN 36
        WHEN lp.name LIKE '%Carnival%' THEN 12
        ELSE 24
    END,
    1, -- Equal installments
    0,
    300, -- Active
    NULL,
    FALSE,
    30, -- 30 days in month
    365, -- 365 days in year
    FALSE,
    FALSE,
    'mifos-standard-strategy',
    'Mifos style',
    -- All derived fields
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 1500000.00
        WHEN lp.name LIKE '%Business%' THEN 500000.00
        WHEN lp.name LIKE '%Education%' THEN 150000.00
        WHEN lp.name LIKE '%Agricultural%' THEN 300000.00
        WHEN lp.name LIKE '%Carnival%' THEN 25000.00
        ELSE 100000.00
    END,
    0, 0,
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 1500000.00
        WHEN lp.name LIKE '%Business%' THEN 500000.00
        WHEN lp.name LIKE '%Education%' THEN 150000.00
        WHEN lp.name LIKE '%Agricultural%' THEN 300000.00
        WHEN lp.name LIKE '%Carnival%' THEN 25000.00
        ELSE 100000.00
    END,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    CASE 
        WHEN lp.name LIKE '%Home%' THEN 1500000.00
        WHEN lp.name LIKE '%Business%' THEN 500000.00
        WHEN lp.name LIKE '%Education%' THEN 150000.00
        WHEN lp.name LIKE '%Agricultural%' THEN 300000.00
        WHEN lp.name LIKE '%Carnival%' THEN 25000.00
        ELSE 100000.00
    END,
    0,
    NULL, NULL, NULL, NULL, NULL, NULL,
    '2024-02-01', 1, -- Disbursed date
    NULL, NULL, NULL,
    '2024-02-01', -- Expected disbursement
    '2024-03-01', -- First repayment
    '2024-02-01', -- Interest from
    CASE 
        WHEN lp.name LIKE '%Home%' THEN '2044-02-01'::date
        WHEN lp.name LIKE '%Business%' THEN '2029-02-01'::date
        WHEN lp.name LIKE '%Education%' THEN '2028-02-01'::date
        WHEN lp.name LIKE '%Agricultural%' THEN '2027-02-01'::date
        WHEN lp.name LIKE '%Carnival%' THEN '2025-02-01'::date
        ELSE '2026-02-01'::date
    END,
    1,
    NOW(), 1, NOW(), 1
FROM m_client c
CROSS JOIN LATERAL (
    SELECT * FROM m_loan_product 
    WHERE name IN ('Home Improvement Loan', 'Small Business Loan', 'Education Loan', 'Agricultural Loan', 'Carnival Loan')
    ORDER BY RANDOM() LIMIT 1
) lp
CROSS JOIN LATERAL (
    SELECT * FROM m_staff WHERE office_id = c.office_id LIMIT 1
) s
WHERE NOT EXISTS (
    SELECT 1 FROM m_loan l WHERE l.client_id = c.id
)
LIMIT 40;

-- Savings Account Transactions
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account)
SELECT
    uuid_generate_v4(),
    sa.id,
    1, -- Deposit
    sa.activation_date + (ROW_NUMBER() OVER (PARTITION BY sa.id ORDER BY RANDOM()) * INTERVAL '7 days'),
    CASE 
        WHEN RANDOM() < 0.3 THEN 5000.00
        WHEN RANDOM() < 0.6 THEN 10000.00
        WHEN RANDOM() < 0.8 THEN 15000.00
        ELSE 25000.00
    END,
    sa.account_balance_derived,
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    sa.activation_date + (ROW_NUMBER() OVER (PARTITION BY sa.id ORDER BY RANDOM()) * INTERVAL '7 days'),
    sa.account_balance_derived, sa.account_balance_derived,
    sa.activation_date + (ROW_NUMBER() OVER (PARTITION BY sa.id ORDER BY RANDOM()) * INTERVAL '7 days'),
    FALSE, FALSE
FROM m_savings_account sa
CROSS JOIN generate_series(1, 5) AS gs
WHERE sa.status_enum = 300
LIMIT 200;

-- Loan Repayment Transactions
INSERT INTO m_loan_transaction (id, loan_id, transaction_type_enum, transaction_date, submitted_on_date,
    amount, principal_portion_derived, interest_portion_derived, fee_charges_portion_derived,
    penalty_charges_portion_derived, overpayment_portion_derived, unrecognized_income_portion,
    outstanding_loan_balance_derived, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, loan_transaction_relation_id)
SELECT
    uuid_generate_v4(),
    l.id,
    2, -- Repayment
    l.disbursedon_date + (ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY RANDOM()) * INTERVAL '30 days'),
    l.disbursedon_date + (ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY RANDOM()) * INTERVAL '30 days'),
    (l.principal_amount / l.number_of_repayments) + (l.principal_amount * l.nominal_interest_rate_per_period / 100),
    l.principal_amount / l.number_of_repayments,
    l.principal_amount * l.nominal_interest_rate_per_period / 100,
    0, 0, 0, 0,
    l.principal_outstanding_derived - (l.principal_amount / l.number_of_repayments),
    NOW(), 1, NOW(), 1,
    FALSE, FALSE, NULL
FROM m_loan l
CROSS JOIN generate_series(1, 3) AS gs
WHERE l.loan_status_id = 300
LIMIT 120;

-- Share Accounts (for Credit Union functionality)
INSERT INTO m_share_account (id, account_no, external_id, client_id, product_id, status_enum,
    timeline_enum, currency_code, currency_digits, currency_multiplesof, total_shares_pending,
    total_shares_approved, total_shares_issued, share_capital_amount, submitted_date, submitted_userid,
    approved_date, approved_userid, activated_date, activated_userid, created_date, created_by,
    last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    'SH' || LPAD(ROW_NUMBER() OVER ()::text, 8, '0'),
    NULL,
    c.id,
    (SELECT id FROM m_share_product LIMIT 1),
    300, -- Active
    300, -- Active
    'TTD', 2, 1,
    0,
    100, -- 100 shares approved
    100, -- 100 shares issued
    10000.00, -- TTD 100 per share
    '2024-01-01', 1,
    '2024-01-02', 1,
    '2024-01-05', 1,
    NOW(), 1, NOW(), 1
FROM m_client c
WHERE NOT EXISTS (
    SELECT 1 FROM m_share_account sha WHERE sha.client_id = c.id
)
LIMIT 30;

COMMIT;

-- Create some group loan data for village banking
BEGIN;

-- Create groups
INSERT INTO m_group (id, external_id, status_enum, activation_date, activatedon_userid, office_id,
    staff_id, display_name, hierarchy, created_date, created_by, last_modified_date, last_modified_by,
    closure_reason_cv_id, closedon_date, closedon_userid, submittedon_date, submittedon_userid)
SELECT
    uuid_generate_v4(),
    NULL,
    300, -- Active
    '2024-01-01',
    1,
    o.id,
    (SELECT id FROM m_staff WHERE office_id = o.id LIMIT 1),
    group_names.name,
    '.',
    NOW(), 1, NOW(), 1,
    NULL, NULL, NULL, '2024-01-01', 1
FROM m_office o
CROSS JOIN (
    VALUES 
        ('Arima Women''s Cooperative'),
        ('San Fernando Farmers Group'),
        ('Chaguanas Small Business Alliance'),
        ('Port of Spain Vendors Association'),
        ('Tobago Fishermen''s Cooperative')
) AS group_names(name)
WHERE o.name != 'Head Office'
LIMIT 5;

-- Add clients to groups
INSERT INTO m_group_client (group_id, client_id)
SELECT 
    g.id,
    c.id
FROM m_group g
CROSS JOIN LATERAL (
    SELECT id FROM m_client WHERE office_id = g.office_id ORDER BY RANDOM() LIMIT 10
) c;

-- Create beneficiaries for savings accounts
INSERT INTO m_savings_beneficiary (id, savings_account_id, beneficiary_name, relationship_type_cv_id,
    contact_number, address, percentage_allocation, is_active, created_date, created_by,
    last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    sa.id,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 1 THEN 'Maria Rodriguez'
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 2 THEN 'John Mohammed'
        ELSE 'Priya Singh'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 1 THEN 1 -- Spouse
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 2 THEN 2 -- Child
        ELSE 3 -- Parent
    END,
    '+1 868 ' || LPAD(FLOOR(RANDOM() * 9000000 + 1000000)::text, 7, '0'),
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 1 THEN 'Port of Spain, Trinidad'
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 2 THEN 'San Fernando, Trinidad'
        ELSE 'Chaguanas, Trinidad'
    END,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 1 THEN 50.00
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 2 THEN 30.00
        ELSE 20.00
    END,
    TRUE,
    NOW(), 1, NOW(), 1
FROM m_savings_account sa
CROSS JOIN generate_series(1, 2) AS gs
WHERE sa.status_enum = 300
LIMIT 100;

COMMIT;