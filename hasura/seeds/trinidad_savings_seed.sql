-- Trinidad and Tobago savings accounts mock data
-- This seed file creates savings products and accounts specific to Trinidad and Tobago

-- Set search path to the appropriate schema
SET search_path TO fineract_default;

-- ================================================
-- Savings Products for Trinidad and Tobago
-- ================================================

-- Regular Savings Account
INSERT INTO savings_product (
    name, short_name, description,
    currency_code, currency_digits,
    nominal_annual_interest_rate,
    interest_compounding_period_type,
    interest_posting_period_type,
    interest_calculation_type,
    interest_calculation_days_in_year_type,
    min_required_opening_balance,
    lockin_period_frequency,
    lockin_period_frequency_type,
    accounting_type,
    active
)
SELECT 
    'Regular Savings Account', 'RSAV',
    'Standard savings account for everyday banking needs in Trinidad and Tobago',
    'TTD', 2,
    2.00, -- 2% interest rate
    'daily', -- interest compounding period
    'monthly', -- interest posting period
    'daily_balance', -- interest calculation type
    365,
    100.00, -- minimum opening balance
    1, -- 1 month lockin period
    'months',
    'none',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM savings_product WHERE name = 'Regular Savings Account' AND currency_code = 'TTD');

-- Premium Savings Account
INSERT INTO savings_product (
    name, short_name, description,
    currency_code, currency_digits,
    nominal_annual_interest_rate,
    interest_compounding_period_type,
    interest_posting_period_type,
    interest_calculation_type,
    interest_calculation_days_in_year_type,
    min_required_opening_balance,
    lockin_period_frequency,
    lockin_period_frequency_type,
    accounting_type,
    active
)
SELECT 
    'Premium Savings Account', 'PSAV',
    'High-interest savings account for larger balances in Trinidad and Tobago',
    'TTD', 2,
    3.50, -- 3.5% interest rate
    'daily', -- interest compounding period
    'monthly', -- interest posting period
    'daily_balance', -- interest calculation type
    365,
    5000.00, -- minimum opening balance
    3, -- 3 month lockin period
    'months',
    'none',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM savings_product WHERE name = 'Premium Savings Account' AND currency_code = 'TTD');

-- Youth Savings Account
INSERT INTO savings_product (
    name, short_name, description,
    currency_code, currency_digits,
    nominal_annual_interest_rate,
    interest_compounding_period_type,
    interest_posting_period_type,
    interest_calculation_type,
    interest_calculation_days_in_year_type,
    min_required_opening_balance,
    lockin_period_frequency,
    lockin_period_frequency_type,
    accounting_type,
    active
)
SELECT 
    'Youth Savings Account', 'YSAV',
    'Savings account designed for young savers under 18 in Trinidad and Tobago',
    'TTD', 2,
    3.00, -- 3% interest rate
    'daily', -- interest compounding period
    'monthly', -- interest posting period
    'daily_balance', -- interest calculation type
    365,
    50.00, -- minimum opening balance
    0, -- no lockin period
    NULL,
    'none',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM savings_product WHERE name = 'Youth Savings Account' AND currency_code = 'TTD');

-- Business Savings Account
INSERT INTO savings_product (
    name, short_name, description,
    currency_code, currency_digits,
    nominal_annual_interest_rate,
    interest_compounding_period_type,
    interest_posting_period_type,
    interest_calculation_type,
    interest_calculation_days_in_year_type,
    min_required_opening_balance,
    lockin_period_frequency,
    lockin_period_frequency_type,
    accounting_type,
    active
)
SELECT 
    'Business Savings Account', 'BSAV',
    'Savings account for businesses and organizations in Trinidad and Tobago',
    'TTD', 2,
    2.75, -- 2.75% interest rate
    'daily', -- interest compounding period
    'monthly', -- interest posting period
    'daily_balance', -- interest calculation type
    365,
    1000.00, -- minimum opening balance
    1, -- 1 month lockin period
    'months',
    'none',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM savings_product WHERE name = 'Business Savings Account' AND currency_code = 'TTD');

-- Christmas Club Account (common in Trinidad and Tobago)
INSERT INTO savings_product (
    name, short_name, description,
    currency_code, currency_digits,
    nominal_annual_interest_rate,
    interest_compounding_period_type,
    interest_posting_period_type,
    interest_calculation_type,
    interest_calculation_days_in_year_type,
    min_required_opening_balance,
    lockin_period_frequency,
    lockin_period_frequency_type,
    accounting_type,
    active
)
SELECT 
    'Christmas Club Account', 'XSAV',
    'Special savings account for holiday expenses that matures in December',
    'TTD', 2,
    4.00, -- 4% interest rate
    'daily', -- interest compounding period
    'monthly', -- interest posting period
    'daily_balance', -- interest calculation type
    365,
    200.00, -- minimum opening balance
    10, -- 10 month lockin period until Christmas
    'months',
    'none',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM savings_product WHERE name = 'Christmas Club Account' AND currency_code = 'TTD');

-- ================================================
-- Create Savings Accounts for Clients
-- ================================================

-- Helper function to get admin user ID
DO $$
DECLARE
    admin_user_id UUID;
    regular_savings_id UUID;
    premium_savings_id UUID;
    youth_savings_id UUID;
    business_savings_id UUID;
    christmas_club_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Get product IDs
    SELECT id INTO regular_savings_id FROM savings_product WHERE name = 'Regular Savings Account' AND currency_code = 'TTD';
    SELECT id INTO premium_savings_id FROM savings_product WHERE name = 'Premium Savings Account' AND currency_code = 'TTD';
    SELECT id INTO youth_savings_id FROM savings_product WHERE name = 'Youth Savings Account' AND currency_code = 'TTD';
    SELECT id INTO business_savings_id FROM savings_product WHERE name = 'Business Savings Account' AND currency_code = 'TTD';
    SELECT id INTO christmas_club_id FROM savings_product WHERE name = 'Christmas Club Account' AND currency_code = 'TTD';
    
    -- Create savings accounts for clients if they don't exist already
    
    -- Regular Savings for Rajiv Persad
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad') AND 
       NOT EXISTS (SELECT 1 FROM savings_account sa 
                  JOIN client c ON sa.client_id = c.id 
                  WHERE c.firstname = 'Rajiv' AND c.lastname = 'Persad' AND sa.product_id = regular_savings_id) THEN
        
        INSERT INTO savings_account (
            account_no, client_id, product_id, field_officer_id,
            status, sub_status, account_type,
            currency_code, currency_digits,
            nominal_annual_interest_rate,
            interest_compounding_period_type,
            interest_posting_period_type,
            interest_calculation_type,
            interest_calculation_days_in_year_type,
            min_required_opening_balance,
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id
        )
        VALUES (
            'SA' || to_char(now(), 'YYYYMMDD') || '0001',
            (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad'),
            regular_savings_id,
            (SELECT id FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj'),
            'active', 'none', 'individual',
            'TTD', 2,
            2.00,
            'daily', 'monthly', 'daily_balance', 365,
            100.00,
            CURRENT_DATE - INTERVAL '6 months', admin_user_id,
            CURRENT_DATE - INTERVAL '6 months', admin_user_id,
            CURRENT_DATE - INTERVAL '6 months', admin_user_id
        );
    END IF;
    
    -- Premium Savings for Michelle Garcia
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Michelle' AND lastname = 'Garcia') AND 
       NOT EXISTS (SELECT 1 FROM savings_account sa 
                  JOIN client c ON sa.client_id = c.id 
                  WHERE c.firstname = 'Michelle' AND c.lastname = 'Garcia' AND sa.product_id = premium_savings_id) THEN
        
        INSERT INTO savings_account (
            account_no, client_id, product_id, field_officer_id,
            status, sub_status, account_type,
            currency_code, currency_digits,
            nominal_annual_interest_rate,
            interest_compounding_period_type,
            interest_posting_period_type,
            interest_calculation_type,
            interest_calculation_days_in_year_type,
            min_required_opening_balance,
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id
        )
        VALUES (
            'SA' || to_char(now(), 'YYYYMMDD') || '0002',
            (SELECT id FROM client WHERE firstname = 'Michelle' AND lastname = 'Garcia'),
            premium_savings_id,
            (SELECT id FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj'),
            'active', 'none', 'individual',
            'TTD', 2,
            3.50,
            'daily', 'monthly', 'daily_balance', 365,
            5000.00,
            CURRENT_DATE - INTERVAL '4 months', admin_user_id,
            CURRENT_DATE - INTERVAL '4 months', admin_user_id,
            CURRENT_DATE - INTERVAL '4 months', admin_user_id
        );
    END IF;
    
    -- Business Savings for Trini Fresh Produce Ltd
    IF EXISTS (SELECT 1 FROM client WHERE company_name = 'Trini Fresh Produce Ltd') AND 
       NOT EXISTS (SELECT 1 FROM savings_account sa 
                  JOIN client c ON sa.client_id = c.id 
                  WHERE c.company_name = 'Trini Fresh Produce Ltd' AND sa.product_id = business_savings_id) THEN
        
        INSERT INTO savings_account (
            account_no, client_id, product_id, field_officer_id,
            status, sub_status, account_type,
            currency_code, currency_digits,
            nominal_annual_interest_rate,
            interest_compounding_period_type,
            interest_posting_period_type,
            interest_calculation_type,
            interest_calculation_days_in_year_type,
            min_required_opening_balance,
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id
        )
        VALUES (
            'SA' || to_char(now(), 'YYYYMMDD') || '0003',
            (SELECT id FROM client WHERE company_name = 'Trini Fresh Produce Ltd'),
            business_savings_id,
            (SELECT id FROM staff WHERE first_name = 'Kamla' AND last_name = 'Singh'),
            'active', 'none', 'individual',
            'TTD', 2,
            2.75,
            'daily', 'monthly', 'daily_balance', 365,
            1000.00,
            CURRENT_DATE - INTERVAL '8 months', admin_user_id,
            CURRENT_DATE - INTERVAL '8 months', admin_user_id,
            CURRENT_DATE - INTERVAL '8 months', admin_user_id
        );
    END IF;
    
    -- Christmas Club for Cheryl Williams
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams') AND 
       NOT EXISTS (SELECT 1 FROM savings_account sa 
                  JOIN client c ON sa.client_id = c.id 
                  WHERE c.firstname = 'Cheryl' AND c.lastname = 'Williams' AND sa.product_id = christmas_club_id) THEN
        
        INSERT INTO savings_account (
            account_no, client_id, product_id, field_officer_id,
            status, sub_status, account_type,
            currency_code, currency_digits,
            nominal_annual_interest_rate,
            interest_compounding_period_type,
            interest_posting_period_type,
            interest_calculation_type,
            interest_calculation_days_in_year_type,
            min_required_opening_balance,
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id
        )
        VALUES (
            'SA' || to_char(now(), 'YYYYMMDD') || '0004',
            (SELECT id FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams'),
            christmas_club_id,
            (SELECT id FROM staff WHERE first_name = 'Marcus' AND last_name = 'Alexander'),
            'active', 'none', 'individual',
            'TTD', 2,
            4.00,
            'daily', 'monthly', 'daily_balance', 365,
            200.00,
            CURRENT_DATE - INTERVAL '3 months', admin_user_id,
            CURRENT_DATE - INTERVAL '3 months', admin_user_id,
            CURRENT_DATE - INTERVAL '3 months', admin_user_id
        );
    END IF;
END
$$;

-- ================================================
-- Create Savings Account Transactions
-- ================================================

-- Helper function to create transactions
DO $$
DECLARE
    account_cursor CURSOR FOR 
        SELECT sa.id, sa.client_id, sa.product_id, sa.currency_code, 
               sa.account_no, sp.name as product_name
        FROM savings_account sa
        JOIN savings_product sp ON sa.product_id = sp.id
        WHERE sa.status = 'active' AND sa.currency_code = 'TTD';
    
    account_rec RECORD;
    transaction_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Process each active savings account
    OPEN account_cursor;
    LOOP
        FETCH account_cursor INTO account_rec;
        EXIT WHEN NOT FOUND;
        
        -- Initial deposit transaction - opening the account
        IF NOT EXISTS (SELECT 1 FROM savings_account_transaction 
                      WHERE savings_account_id = account_rec.id 
                      AND transaction_type = 'deposit' 
                      AND is_reversed = FALSE
                      AND amount >= 100) THEN
            
            -- Determine initial deposit amount based on product
            DECLARE
                initial_amount DECIMAL(19,6);
            BEGIN
                CASE 
                    WHEN account_rec.product_name = 'Regular Savings Account' THEN
                        initial_amount := 1000.00;
                    WHEN account_rec.product_name = 'Premium Savings Account' THEN
                        initial_amount := 10000.00;
                    WHEN account_rec.product_name = 'Youth Savings Account' THEN
                        initial_amount := 500.00;
                    WHEN account_rec.product_name = 'Business Savings Account' THEN
                        initial_amount := 5000.00;
                    WHEN account_rec.product_name = 'Christmas Club Account' THEN
                        initial_amount := 1000.00;
                    ELSE
                        initial_amount := 1000.00;
                END CASE;
                
                -- Create initial deposit
                INSERT INTO savings_account_transaction (
                    savings_account_id, 
                    office_id,
                    payment_detail_id,
                    transaction_type,
                    transaction_date,
                    amount,
                    running_balance,
                    is_reversed,
                    submitted_on_date,
                    created_by,
                    submitted_by_user_id
                )
                VALUES (
                    account_rec.id,
                    (SELECT office_id FROM client WHERE id = account_rec.client_id),
                    NULL,
                    'deposit',
                    CURRENT_DATE - INTERVAL '3 months',
                    initial_amount,
                    initial_amount,
                    FALSE,
                    CURRENT_DATE - INTERVAL '3 months',
                    admin_user_id,
                    admin_user_id
                )
                RETURNING id INTO transaction_id;
                
                -- Update account balance
                UPDATE savings_account 
                SET account_balance_derived = initial_amount,
                    total_deposits_derived = initial_amount
                WHERE id = account_rec.id;
                
                -- Add some additional deposits for regular accounts
                IF account_rec.product_name = 'Regular Savings Account' OR 
                   account_rec.product_name = 'Premium Savings Account' OR
                   account_rec.product_name = 'Business Savings Account' THEN
                    
                    -- Deposit 2 months ago
                    INSERT INTO savings_account_transaction (
                        savings_account_id, 
                        office_id,
                        payment_detail_id,
                        transaction_type,
                        transaction_date,
                        amount,
                        running_balance,
                        is_reversed,
                        submitted_on_date,
                        created_by,
                        submitted_by_user_id
                    )
                    VALUES (
                        account_rec.id,
                        (SELECT office_id FROM client WHERE id = account_rec.client_id),
                        NULL,
                        'deposit',
                        CURRENT_DATE - INTERVAL '2 months',
                        500.00,
                        initial_amount + 500.00,
                        FALSE,
                        CURRENT_DATE - INTERVAL '2 months',
                        admin_user_id,
                        admin_user_id
                    );
                    
                    -- Update account balance
                    UPDATE savings_account 
                    SET account_balance_derived = account_balance_derived + 500.00,
                        total_deposits_derived = total_deposits_derived + 500.00
                    WHERE id = account_rec.id;
                    
                    -- Deposit 1 month ago
                    INSERT INTO savings_account_transaction (
                        savings_account_id, 
                        office_id,
                        payment_detail_id,
                        transaction_type,
                        transaction_date,
                        amount,
                        running_balance,
                        is_reversed,
                        submitted_on_date,
                        created_by,
                        submitted_by_user_id
                    )
                    VALUES (
                        account_rec.id,
                        (SELECT office_id FROM client WHERE id = account_rec.client_id),
                        NULL,
                        'deposit',
                        CURRENT_DATE - INTERVAL '1 month',
                        750.00,
                        initial_amount + 500.00 + 750.00,
                        FALSE,
                        CURRENT_DATE - INTERVAL '1 month',
                        admin_user_id,
                        admin_user_id
                    );
                    
                    -- Update account balance
                    UPDATE savings_account 
                    SET account_balance_derived = account_balance_derived + 750.00,
                        total_deposits_derived = total_deposits_derived + 750.00
                    WHERE id = account_rec.id;
                    
                    -- Add withdrawal for regular account only
                    IF account_rec.product_name = 'Regular Savings Account' THEN
                        -- Withdrawal 2 weeks ago
                        INSERT INTO savings_account_transaction (
                            savings_account_id, 
                            office_id,
                            payment_detail_id,
                            transaction_type,
                            transaction_date,
                            amount,
                            running_balance,
                            is_reversed,
                            submitted_on_date,
                            created_by,
                            submitted_by_user_id
                        )
                        VALUES (
                            account_rec.id,
                            (SELECT office_id FROM client WHERE id = account_rec.client_id),
                            NULL,
                            'withdrawal',
                            CURRENT_DATE - INTERVAL '2 weeks',
                            300.00,
                            initial_amount + 500.00 + 750.00 - 300.00,
                            FALSE,
                            CURRENT_DATE - INTERVAL '2 weeks',
                            admin_user_id,
                            admin_user_id
                        );
                        
                        -- Update account balance
                        UPDATE savings_account 
                        SET account_balance_derived = account_balance_derived - 300.00,
                            total_withdrawals_derived = total_withdrawals_derived + 300.00
                        WHERE id = account_rec.id;
                    END IF;
                
                -- Add regular monthly deposits for Christmas Club
                ELSIF account_rec.product_name = 'Christmas Club Account' THEN
                    -- Make deposits for previous months
                    FOR i IN 1..2 LOOP
                        -- Monthly deposit
                        INSERT INTO savings_account_transaction (
                            savings_account_id, 
                            office_id,
                            payment_detail_id,
                            transaction_type,
                            transaction_date,
                            amount,
                            running_balance,
                            is_reversed,
                            submitted_on_date,
                            created_by,
                            submitted_by_user_id
                        )
                        VALUES (
                            account_rec.id,
                            (SELECT office_id FROM client WHERE id = account_rec.client_id),
                            NULL,
                            'deposit',
                            CURRENT_DATE - INTERVAL '3 months' + INTERVAL '1 month' * i,
                            250.00,
                            initial_amount + (250.00 * i),
                            FALSE,
                            CURRENT_DATE - INTERVAL '3 months' + INTERVAL '1 month' * i,
                            admin_user_id,
                            admin_user_id
                        );
                        
                        -- Update account balance
                        UPDATE savings_account 
                        SET account_balance_derived = account_balance_derived + 250.00,
                            total_deposits_derived = total_deposits_derived + 250.00
                        WHERE id = account_rec.id;
                    END LOOP;
                END IF;
            END;
        END IF;
    END LOOP;
    CLOSE account_cursor;
END
$$;