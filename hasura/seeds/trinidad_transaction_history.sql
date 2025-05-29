-- Trinidad Comprehensive Transaction History
-- This file creates realistic transaction patterns for various account types

SET search_path TO "default";

BEGIN;

-- Utility Bills Payment Transactions (common in Trinidad)
WITH utility_providers AS (
    SELECT unnest(ARRAY[
        'T&TEC (Electricity)',
        'WASA (Water)',
        'TSTT (Telecommunications)',
        'Flow (Cable/Internet)',
        'Digicel (Mobile)'
    ]) AS provider
)
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    2, -- Withdrawal
    DATE '2024-01-01' + (INTERVAL '1 month' * generate_series(0, 11)) + 
        (CASE provider 
            WHEN 'T&TEC (Electricity)' THEN INTERVAL '5 days'
            WHEN 'WASA (Water)' THEN INTERVAL '10 days'
            WHEN 'TSTT (Telecommunications)' THEN INTERVAL '15 days'
            WHEN 'Flow (Cable/Internet)' THEN INTERVAL '20 days'
            ELSE INTERVAL '25 days'
        END),
    CASE provider
        WHEN 'T&TEC (Electricity)' THEN 350.00 + (RANDOM() * 150)
        WHEN 'WASA (Water)' THEN 150.00 + (RANDOM() * 50)
        WHEN 'TSTT (Telecommunications)' THEN 250.00 + (RANDOM() * 100)
        WHEN 'Flow (Cable/Internet)' THEN 400.00 + (RANDOM() * 100)
        ELSE 200.00 + (RANDOM() * 50)
    END,
    sa.account_balance_derived - (350.00 + (RANDOM() * 150)),
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived - (350.00 + (RANDOM() * 150)),
    sa.account_balance_derived - (350.00 + (RANDOM() * 150)),
    NOW()::date,
    FALSE, FALSE,
    'Bill Payment - ' || provider
FROM m_savings_account sa
CROSS JOIN utility_providers
CROSS JOIN generate_series(0, 2) AS month_offset
WHERE sa.status_enum = 300
AND sa.account_balance_derived > 5000
ORDER BY RANDOM()
LIMIT 500;

-- Salary Deposits (Monthly)
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    1, -- Deposit
    DATE '2024-01-25' + (INTERVAL '1 month' * generate_series(0, 11)),
    CASE 
        WHEN c.display_name LIKE '%Manager%' THEN 25000.00 + (RANDOM() * 10000)
        WHEN c.display_name LIKE '%Engineer%' THEN 20000.00 + (RANDOM() * 8000)
        WHEN c.display_name LIKE '%Teacher%' THEN 15000.00 + (RANDOM() * 5000)
        WHEN c.display_name LIKE '%Clerk%' THEN 12000.00 + (RANDOM() * 3000)
        ELSE 10000.00 + (RANDOM() * 5000)
    END,
    sa.account_balance_derived + 15000.00,
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived + 15000.00,
    sa.account_balance_derived + 15000.00,
    NOW()::date,
    FALSE, FALSE,
    'Salary Deposit - ' || 
    CASE 
        WHEN RANDOM() < 0.2 THEN 'Ministry of Finance'
        WHEN RANDOM() < 0.4 THEN 'Petrotrin'
        WHEN RANDOM() < 0.6 THEN 'Republic Bank'
        WHEN RANDOM() < 0.8 THEN 'First Citizens Bank'
        ELSE 'Private Employer'
    END
FROM m_savings_account sa
JOIN m_client c ON sa.client_id = c.id
WHERE sa.status_enum = 300
ORDER BY RANDOM()
LIMIT 300;

-- Grocery Shopping Transactions (Weekly)
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    2, -- Withdrawal
    DATE '2024-01-01' + (INTERVAL '1 week' * generate_series(0, 51)),
    800.00 + (RANDOM() * 400), -- TTD 800-1200 weekly groceries
    sa.account_balance_derived - 1000.00,
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived - 1000.00,
    sa.account_balance_derived - 1000.00,
    NOW()::date,
    FALSE, FALSE,
    'POS Purchase - ' || 
    CASE FLOOR(RANDOM() * 5)::int
        WHEN 0 THEN 'Massy Stores'
        WHEN 1 THEN 'PriceSmart'
        WHEN 2 THEN 'JTA Supermarkets'
        WHEN 3 THEN 'Xtra Foods'
        ELSE 'Hi-Lo Food Stores'
    END
FROM m_savings_account sa
WHERE sa.status_enum = 300
AND sa.account_balance_derived > 5000
ORDER BY RANDOM()
LIMIT 800;

-- Carnival Related Transactions (January-March)
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    2, -- Withdrawal
    DATE '2024-01-15' + (INTERVAL '1 day' * FLOOR(RANDOM() * 45)),
    CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN 3500.00 -- Costume
        WHEN 1 THEN 800.00  -- Fete ticket
        WHEN 2 THEN 500.00  -- Accessories
        ELSE 1200.00        -- Band registration
    END,
    sa.account_balance_derived - 1500.00,
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived - 1500.00,
    sa.account_balance_derived - 1500.00,
    NOW()::date,
    FALSE, FALSE,
    CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN 'Carnival Costume - Tribe Band'
        WHEN 1 THEN 'Carnival Fete - Soca Monarch'
        WHEN 2 THEN 'Carnival Accessories Purchase'
        ELSE 'Band Registration - Lost Tribe'
    END
FROM m_savings_account sa
WHERE sa.status_enum = 300
AND sa.account_balance_derived > 10000
ORDER BY RANDOM()
LIMIT 200;

-- School Fee Payments (Term-based)
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    2, -- Withdrawal
    term_date,
    CASE FLOOR(RANDOM() * 3)::int
        WHEN 0 THEN 2500.00  -- Primary school
        WHEN 1 THEN 3500.00  -- Secondary school
        ELSE 5000.00         -- Prestige school
    END,
    sa.account_balance_derived - 3500.00,
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived - 3500.00,
    sa.account_balance_derived - 3500.00,
    NOW()::date,
    FALSE, FALSE,
    'School Fees - ' || 
    CASE FLOOR(RANDOM() * 5)::int
        WHEN 0 THEN 'St. Mary''s College'
        WHEN 1 THEN 'Queen''s Royal College'
        WHEN 2 THEN 'Presentation College'
        WHEN 3 THEN 'Holy Name Convent'
        ELSE 'Naparima College'
    END
FROM m_savings_account sa
CROSS JOIN (
    SELECT unnest(ARRAY[
        '2024-01-08'::date,  -- Term 1
        '2024-04-15'::date,  -- Term 2
        '2024-09-02'::date   -- Term 3
    ]) AS term_date
) terms
WHERE sa.status_enum = 300
AND sa.account_balance_derived > 10000
ORDER BY RANDOM()
LIMIT 150;

-- ATM Withdrawals
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    2, -- Withdrawal
    DATE '2024-01-01' + (INTERVAL '1 day' * FLOOR(RANDOM() * 365)),
    CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN 500.00
        WHEN 1 THEN 1000.00
        WHEN 2 THEN 1500.00
        ELSE 2000.00
    END,
    sa.account_balance_derived - 1000.00,
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived - 1000.00,
    sa.account_balance_derived - 1000.00,
    NOW()::date,
    FALSE, FALSE,
    'ATM Withdrawal - ' || 
    CASE FLOOR(RANDOM() * 6)::int
        WHEN 0 THEN 'Republic Bank ATM - Port of Spain'
        WHEN 1 THEN 'First Citizens ATM - San Fernando'
        WHEN 2 THEN 'Scotiabank ATM - Chaguanas'
        WHEN 3 THEN 'RBC ATM - Arima'
        WHEN 4 THEN 'JMMB ATM - Diego Martin'
        ELSE 'Republic Bank ATM - Scarborough'
    END
FROM m_savings_account sa
CROSS JOIN generate_series(1, 10) AS tx
WHERE sa.status_enum = 300
AND sa.account_balance_derived > 5000
ORDER BY RANDOM()
LIMIT 1000;

-- Insurance Premium Payments
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    2, -- Withdrawal
    DATE '2024-01-15' + (INTERVAL '1 month' * generate_series(0, 11)),
    CASE FLOOR(RANDOM() * 3)::int
        WHEN 0 THEN 800.00   -- Car insurance
        WHEN 1 THEN 500.00   -- Health insurance
        ELSE 1200.00         -- Life insurance
    END,
    sa.account_balance_derived - 800.00,
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived - 800.00,
    sa.account_balance_derived - 800.00,
    NOW()::date,
    FALSE, FALSE,
    'Insurance Premium - ' || 
    CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN 'Guardian Life'
        WHEN 1 THEN 'Sagicor'
        WHEN 2 THEN 'Maritime Insurance'
        ELSE 'Tatil Life'
    END
FROM m_savings_account sa
WHERE sa.status_enum = 300
AND sa.account_balance_derived > 5000
ORDER BY RANDOM()
LIMIT 300;

-- Interest Postings (Monthly)
INSERT INTO m_savings_account_transaction (id, savings_account_id, transaction_type_enum, transaction_date,
    amount, balance_after_transaction, created_date, created_by, last_modified_date, last_modified_by,
    is_reversed, manually_adjusted_or_reversed, balance_end_date_derived, running_balance_derived,
    cumulative_balance_derived, transaction_on_date_derived, is_manual, created_from_linked_account,
    transaction_details)
SELECT
    uuid_generate_v4(),
    sa.id,
    3, -- Interest posting
    DATE_TRUNC('month', DATE '2024-01-01' + (INTERVAL '1 month' * generate_series(0, 11))) + INTERVAL '1 month' - INTERVAL '1 day',
    (sa.account_balance_derived * sa.nominal_annual_interest_rate / 100 / 12),
    sa.account_balance_derived + (sa.account_balance_derived * sa.nominal_annual_interest_rate / 100 / 12),
    NOW(), 1, NOW(), 1,
    FALSE, FALSE,
    NOW()::date,
    sa.account_balance_derived + (sa.account_balance_derived * sa.nominal_annual_interest_rate / 100 / 12),
    sa.account_balance_derived + (sa.account_balance_derived * sa.nominal_annual_interest_rate / 100 / 12),
    NOW()::date,
    FALSE, FALSE,
    'Monthly Interest Credit'
FROM m_savings_account sa
WHERE sa.status_enum = 300
AND sa.nominal_annual_interest_rate > 0;

-- Update account balances based on transactions
UPDATE m_savings_account sa
SET account_balance_derived = COALESCE(
    (SELECT SUM(
        CASE 
            WHEN sat.transaction_type_enum IN (1, 3) THEN sat.amount -- Deposits and interest
            WHEN sat.transaction_type_enum = 2 THEN -sat.amount -- Withdrawals
            ELSE 0
        END
    )
    FROM m_savings_account_transaction sat
    WHERE sat.savings_account_id = sa.id
    AND sat.is_reversed = FALSE), 0)
WHERE sa.status_enum = 300;

COMMIT;

-- Create Audit Trail Data
BEGIN;

INSERT INTO m_portfolio_command_source (id, action_name, entity_name, office_id, group_id, client_id,
    loan_id, savings_account_id, api_get_url, resource_id, subresource_id, command_as_json,
    maker_id, made_on_date, checker_id, checked_on_date, status, product_id, transaction_id,
    creditbureau_id, organisation_creditbureau_id)
SELECT
    uuid_generate_v4(),
    CASE FLOOR(RANDOM() * 5)::int
        WHEN 0 THEN 'CREATE'
        WHEN 1 THEN 'UPDATE'
        WHEN 2 THEN 'APPROVE'
        WHEN 3 THEN 'ACTIVATE'
        ELSE 'DISBURSE'
    END,
    CASE FLOOR(RANDOM() * 4)::int
        WHEN 0 THEN 'CLIENT'
        WHEN 1 THEN 'LOAN'
        WHEN 2 THEN 'SAVINGS'
        ELSE 'SHARE'
    END,
    o.id,
    NULL,
    c.id,
    NULL,
    NULL,
    '/clients/' || c.id,
    c.id,
    NULL,
    '{"firstname":"' || split_part(c.display_name, ' ', 1) || '","lastname":"' || split_part(c.display_name, ' ', 2) || '"}',
    s.id,
    NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 365)),
    CASE WHEN RANDOM() < 0.7 THEN s2.id ELSE NULL END,
    CASE WHEN RANDOM() < 0.7 THEN NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 364)) ELSE NULL END,
    CASE WHEN RANDOM() < 0.7 THEN 2 ELSE 1 END, -- Processed or Pending
    NULL,
    NULL,
    NULL,
    NULL
FROM m_client c
JOIN m_office o ON c.office_id = o.id
JOIN m_staff s ON s.office_id = o.id
LEFT JOIN m_staff s2 ON s2.office_id = o.id AND s2.id != s.id
ORDER BY RANDOM()
LIMIT 500;

COMMIT;