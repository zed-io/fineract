-- Trinidad Share Products and Configuration
-- This file creates share products for the Credit Union

SET search_path TO "default";

BEGIN;

-- Create Share Products if they don't exist
INSERT INTO m_share_product (id, name, short_name, description, external_id, currency_code, currency_digits,
    currency_multiplesof, total_shares_issued, totalshares_value, unit_price, share_capital,
    suspense_account_id, equity_account_id, minimum_shares, nominal_shares, maximum_shares,
    minimum_active_period_frequency, minimum_active_period_frequency_enum, lockin_period_frequency,
    lockin_period_frequency_enum, withdrawal_fee_for_transfer, created_date, created_by,
    last_modified_date, last_modified_by, allow_dividends_for_inactive_clients, accounting_type)
SELECT * FROM (
    VALUES (
        uuid_generate_v4(),
        'Regular Share Account',
        'RSA',
        'Standard membership shares for credit union members',
        NULL,
        'TTD', 2, 1,
        10000, -- Total shares that can be issued
        1000000.00, -- Total value
        100.00, -- TTD 100 per share
        1000000.00,
        (SELECT id FROM acc_gl_account WHERE classification_enum = 2 AND name LIKE '%Share Suspense%' LIMIT 1),
        (SELECT id FROM acc_gl_account WHERE classification_enum = 5 AND name LIKE '%Share Capital%' LIMIT 1),
        10, -- Minimum 10 shares
        50, -- Nominal 50 shares
        1000, -- Maximum 1000 shares
        NULL, NULL, NULL, NULL,
        FALSE,
        NOW(), 1, NOW(), 1,
        FALSE,
        1 -- Cash based accounting
    ),
    (
        uuid_generate_v4(),
        'Premium Share Account',
        'PSA',
        'Premium shares with higher dividends for long-term members',
        NULL,
        'TTD', 2, 1,
        5000,
        2500000.00,
        500.00, -- TTD 500 per share
        2500000.00,
        (SELECT id FROM acc_gl_account WHERE classification_enum = 2 AND name LIKE '%Share Suspense%' LIMIT 1),
        (SELECT id FROM acc_gl_account WHERE classification_enum = 5 AND name LIKE '%Share Capital%' LIMIT 1),
        20, -- Minimum 20 shares
        100, -- Nominal 100 shares
        500, -- Maximum 500 shares
        12, -- 12 month minimum holding
        2, -- Months
        NULL, NULL,
        FALSE,
        NOW(), 1, NOW(), 1,
        FALSE,
        1
    ),
    (
        uuid_generate_v4(),
        'Youth Share Account',
        'YSA',
        'Special share account for members under 25 years',
        NULL,
        'TTD', 2, 1,
        8000,
        400000.00,
        50.00, -- TTD 50 per share
        400000.00,
        (SELECT id FROM acc_gl_account WHERE classification_enum = 2 AND name LIKE '%Share Suspense%' LIMIT 1),
        (SELECT id FROM acc_gl_account WHERE classification_enum = 5 AND name LIKE '%Share Capital%' LIMIT 1),
        5, -- Minimum 5 shares
        20, -- Nominal 20 shares
        200, -- Maximum 200 shares
        NULL, NULL, NULL, NULL,
        FALSE,
        NOW(), 1, NOW(), 1,
        FALSE,
        1
    )
) AS share_products(id, name, short_name, description, external_id, currency_code, currency_digits,
    currency_multiplesof, total_shares_issued, totalshares_value, unit_price, share_capital,
    suspense_account_id, equity_account_id, minimum_shares, nominal_shares, maximum_shares,
    minimum_active_period_frequency, minimum_active_period_frequency_enum, lockin_period_frequency,
    lockin_period_frequency_enum, withdrawal_fee_for_transfer, created_date, created_by,
    last_modified_date, last_modified_by, allow_dividends_for_inactive_clients, accounting_type)
WHERE NOT EXISTS (
    SELECT 1 FROM m_share_product WHERE name = share_products.name
);

-- Create Share Product Charges
INSERT INTO m_share_product_charge (share_product_id, charge_id)
SELECT 
    sp.id,
    c.id
FROM m_share_product sp
CROSS JOIN m_charge c
WHERE c.name IN ('Share Purchase Fee', 'Share Account Maintenance', 'Dividend Processing Fee')
AND NOT EXISTS (
    SELECT 1 FROM m_share_product_charge spc 
    WHERE spc.share_product_id = sp.id AND spc.charge_id = c.id
);

-- Create Dividend Periods for Share Products
INSERT INTO m_share_product_dividend_pay_out (id, product_id, dividend_period_start_date,
    dividend_period_end_date, dividend_percent, status, created_date, created_by,
    last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    sp.id,
    '2023-01-01'::date,
    '2023-12-31'::date,
    CASE 
        WHEN sp.name LIKE '%Premium%' THEN 7.5
        WHEN sp.name LIKE '%Youth%' THEN 5.0
        ELSE 6.0
    END,
    300, -- Approved
    NOW(), 1, NOW(), 1
FROM m_share_product sp
WHERE NOT EXISTS (
    SELECT 1 FROM m_share_product_dividend_pay_out d 
    WHERE d.product_id = sp.id 
    AND d.dividend_period_start_date = '2023-01-01'
);

-- Create 2024 Dividend Period
INSERT INTO m_share_product_dividend_pay_out (id, product_id, dividend_period_start_date,
    dividend_period_end_date, dividend_percent, status, created_date, created_by,
    last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    sp.id,
    '2024-01-01'::date,
    '2024-12-31'::date,
    CASE 
        WHEN sp.name LIKE '%Premium%' THEN 8.0
        WHEN sp.name LIKE '%Youth%' THEN 5.5
        ELSE 6.5
    END,
    200, -- Pending approval
    NOW(), 1, NOW(), 1
FROM m_share_product sp
WHERE NOT EXISTS (
    SELECT 1 FROM m_share_product_dividend_pay_out d 
    WHERE d.product_id = sp.id 
    AND d.dividend_period_start_date = '2024-01-01'
);

COMMIT;

-- Create Share Purchase Transactions
BEGIN;

INSERT INTO m_share_account_transactions (id, account_id, transaction_date, transaction_type_enum,
    amount, charge_amount, status_enum, type_enum, is_active, created_date, created_by,
    last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    sa.id,
    sa.activated_date + (ROW_NUMBER() OVER (PARTITION BY sa.id ORDER BY RANDOM()) * INTERVAL '30 days'),
    1, -- Purchase
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 1 THEN 5000.00  -- 50 shares
        WHEN ROW_NUMBER() OVER (PARTITION BY sa.id) = 2 THEN 2000.00  -- 20 shares
        ELSE 1000.00  -- 10 shares
    END,
    50.00, -- Purchase fee
    300, -- Approved
    1, -- Purchase type
    TRUE,
    NOW(), 1, NOW(), 1
FROM m_share_account sa
CROSS JOIN generate_series(1, 3) AS gs
WHERE sa.status_enum = 300
LIMIT 90;

-- Create Dividend Payment Transactions
INSERT INTO m_share_account_transactions (id, account_id, transaction_date, transaction_type_enum,
    amount, charge_amount, status_enum, type_enum, is_active, created_date, created_by,
    last_modified_date, last_modified_by)
SELECT
    uuid_generate_v4(),
    sa.id,
    '2024-01-15'::date, -- Annual dividend payment
    3, -- Dividend
    sa.share_capital_amount * 0.065, -- 6.5% dividend
    0,
    300, -- Approved
    3, -- Dividend type
    TRUE,
    NOW(), 1, NOW(), 1
FROM m_share_account sa
WHERE sa.status_enum = 300
AND sa.activated_date < '2024-01-01';

COMMIT;