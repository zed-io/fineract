-- Trinidad and Tobago Recurring Deposit schema and mock data
-- This script creates the recurring deposit schema and adds sample data for Trinidad and Tobago

-- Set search path to the appropriate schema
SET search_path TO fineract_default;

-- Recurring Deposit Product table
CREATE TABLE IF NOT EXISTS recurring_deposit_product (
    id UUID PRIMARY KEY DEFAULT fineract_default.uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(4) NOT NULL,
    description VARCHAR(500),
    currency_code VARCHAR(3) NOT NULL,
    currency_digits INTEGER NOT NULL DEFAULT 2,
    recurring_deposit_amount NUMERIC(19, 6) NOT NULL,
    minimum_deposit_amount NUMERIC(19, 6) NOT NULL,
    maximum_deposit_amount NUMERIC(19, 6),
    deposit_frequency VARCHAR(50) NOT NULL,
    interest_rate NUMERIC(19, 6) NOT NULL,
    interest_compounding_period_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
    interest_posting_period_type VARCHAR(50) NOT NULL DEFAULT 'quarterly',
    interest_calculation_type VARCHAR(50) NOT NULL DEFAULT 'daily_balance',
    term_months INTEGER NOT NULL,
    premature_withdrawal_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    premature_withdrawal_penalty NUMERIC(19, 6),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    CONSTRAINT fk_recurring_deposit_product_currency FOREIGN KEY (currency_code) REFERENCES currency(code),
    CONSTRAINT fk_recurring_deposit_product_created_by FOREIGN KEY (created_by) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_product_modified_by FOREIGN KEY (last_modified_by) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_deposit_product_currency ON recurring_deposit_product(currency_code);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_product_active ON recurring_deposit_product(active);

-- Recurring Deposit Account table
CREATE TABLE IF NOT EXISTS recurring_deposit_account (
    id UUID PRIMARY KEY DEFAULT fineract_default.uuid_generate_v4(),
    account_no VARCHAR(100) NOT NULL UNIQUE,
    external_id VARCHAR(100) UNIQUE,
    client_id UUID,
    product_id UUID NOT NULL,
    field_officer_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted_and_pending_approval',
    submitted_on_date DATE NOT NULL,
    submitted_by_user_id UUID,
    approved_on_date DATE,
    approved_by_user_id UUID,
    activated_on_date DATE,
    activated_by_user_id UUID,
    closed_on_date DATE,
    closed_by_user_id UUID,
    recurring_deposit_amount NUMERIC(19, 6) NOT NULL,
    total_deposit_amount NUMERIC(19, 6) DEFAULT 0,
    deposit_frequency VARCHAR(50) NOT NULL,
    next_deposit_due_date DATE,
    deposits_completed INTEGER DEFAULT 0,
    expected_deposits INTEGER NOT NULL,
    maturity_date DATE,
    interest_rate NUMERIC(19, 6) NOT NULL,
    interest_earned NUMERIC(19, 6) DEFAULT 0,
    total_premature_withdrawals NUMERIC(19, 6) DEFAULT 0,
    maturity_instruction VARCHAR(50) DEFAULT 'transfer_to_savings',
    transfer_to_savings_account_id UUID,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    CONSTRAINT fk_recurring_deposit_account_client FOREIGN KEY (client_id) REFERENCES client(id),
    CONSTRAINT fk_recurring_deposit_account_product FOREIGN KEY (product_id) REFERENCES recurring_deposit_product(id),
    CONSTRAINT fk_recurring_deposit_account_field_officer FOREIGN KEY (field_officer_id) REFERENCES staff(id),
    CONSTRAINT fk_recurring_deposit_account_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_account_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_account_activated_by FOREIGN KEY (activated_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_account_closed_by FOREIGN KEY (closed_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_account_transfer_savings FOREIGN KEY (transfer_to_savings_account_id) REFERENCES savings_account(id),
    CONSTRAINT fk_recurring_deposit_account_created_by FOREIGN KEY (created_by) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_account_modified_by FOREIGN KEY (last_modified_by) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_deposit_account_client ON recurring_deposit_account(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_account_product ON recurring_deposit_account(product_id);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_account_status ON recurring_deposit_account(status);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_account_maturity ON recurring_deposit_account(maturity_date);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_account_next_due ON recurring_deposit_account(next_deposit_due_date);

-- Recurring Deposit Transaction table
CREATE TABLE IF NOT EXISTS recurring_deposit_transaction (
    id UUID PRIMARY KEY DEFAULT fineract_default.uuid_generate_v4(),
    recurring_deposit_account_id UUID NOT NULL,
    office_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    amount NUMERIC(19, 6) NOT NULL,
    is_reversal BOOLEAN DEFAULT FALSE,
    reversed_by_transaction_id UUID,
    submitted_on_date DATE NOT NULL,
    submitted_by_user_id UUID,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    CONSTRAINT fk_recurring_deposit_transaction_account FOREIGN KEY (recurring_deposit_account_id) REFERENCES recurring_deposit_account(id),
    CONSTRAINT fk_recurring_deposit_transaction_office FOREIGN KEY (office_id) REFERENCES office(id),
    CONSTRAINT fk_recurring_deposit_transaction_reversal FOREIGN KEY (reversed_by_transaction_id) REFERENCES recurring_deposit_transaction(id),
    CONSTRAINT fk_recurring_deposit_transaction_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_transaction_created_by FOREIGN KEY (created_by) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_transaction_modified_by FOREIGN KEY (last_modified_by) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_deposit_transaction_account ON recurring_deposit_transaction(recurring_deposit_account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_transaction_type ON recurring_deposit_transaction(transaction_type);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_transaction_date ON recurring_deposit_transaction(transaction_date);

-- Recurring Deposit Installment table
CREATE TABLE IF NOT EXISTS recurring_deposit_installment (
    id UUID PRIMARY KEY DEFAULT fineract_default.uuid_generate_v4(),
    recurring_deposit_account_id UUID NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    deposit_amount NUMERIC(19, 6) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    transaction_id UUID,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    CONSTRAINT fk_recurring_deposit_installment_account FOREIGN KEY (recurring_deposit_account_id) REFERENCES recurring_deposit_account(id),
    CONSTRAINT fk_recurring_deposit_installment_transaction FOREIGN KEY (transaction_id) REFERENCES recurring_deposit_transaction(id),
    CONSTRAINT fk_recurring_deposit_installment_created_by FOREIGN KEY (created_by) REFERENCES app_user(id),
    CONSTRAINT fk_recurring_deposit_installment_modified_by FOREIGN KEY (last_modified_by) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_deposit_installment_account ON recurring_deposit_installment(recurring_deposit_account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_installment_due_date ON recurring_deposit_installment(due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_deposit_installment_completed ON recurring_deposit_installment(completed);

-- ================================================
-- Trinidad and Tobago Recurring Deposit Products
-- ================================================

-- Let's create some Recurring Deposit products specific to Trinidad and Tobago market

-- Helper function to get admin user ID
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Standard Recurring Deposit
    INSERT INTO recurring_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        recurring_deposit_amount, minimum_deposit_amount, maximum_deposit_amount,
        deposit_frequency, interest_rate,
        interest_compounding_period_type, interest_posting_period_type, interest_calculation_type,
        term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        active,
        created_date, created_by
    )
    SELECT 
        'Standard Recurring Deposit', 'SRD',
        'Standard recurring deposit for Trinidad and Tobago market',
        'TTD', 2,
        1000.00, 500.00, 10000.00,
        'monthly', 4.25,
        'monthly', 'quarterly', 'daily_balance',
        12,
        TRUE, 1.00,
        TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM recurring_deposit_product WHERE name = 'Standard Recurring Deposit');
    
    -- Education Saver Recurring Deposit
    INSERT INTO recurring_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        recurring_deposit_amount, minimum_deposit_amount, maximum_deposit_amount,
        deposit_frequency, interest_rate,
        interest_compounding_period_type, interest_posting_period_type, interest_calculation_type,
        term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        active,
        created_date, created_by
    )
    SELECT 
        'Education Saver', 'EDU',
        'Long-term recurring deposit for education savings in Trinidad and Tobago',
        'TTD', 2,
        500.00, 200.00, 5000.00,
        'monthly', 5.00,
        'monthly', 'quarterly', 'daily_balance',
        36,
        TRUE, 1.25,
        TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM recurring_deposit_product WHERE name = 'Education Saver');
    
    -- Carnival Saver Recurring Deposit (Specific to Trinidad's Carnival season)
    INSERT INTO recurring_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        recurring_deposit_amount, minimum_deposit_amount, maximum_deposit_amount,
        deposit_frequency, interest_rate,
        interest_compounding_period_type, interest_posting_period_type, interest_calculation_type,
        term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        active,
        created_date, created_by
    )
    SELECT 
        'Carnival Saver', 'CAR',
        'Short-term recurring deposit for Trinidad Carnival expenses',
        'TTD', 2,
        500.00, 200.00, 2000.00,
        'monthly', 3.75,
        'monthly', 'at_maturity', 'daily_balance',
        6,
        TRUE, 0.50,
        TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM recurring_deposit_product WHERE name = 'Carnival Saver');
    
    -- Retirement Booster Recurring Deposit
    INSERT INTO recurring_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        recurring_deposit_amount, minimum_deposit_amount, maximum_deposit_amount,
        deposit_frequency, interest_rate,
        interest_compounding_period_type, interest_posting_period_type, interest_calculation_type,
        term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        active,
        created_date, created_by
    )
    SELECT 
        'Retirement Booster', 'RET',
        'Long-term recurring deposit for retirement planning in Trinidad and Tobago',
        'TTD', 2,
        2000.00, 1000.00, 10000.00,
        'monthly', 5.50,
        'monthly', 'quarterly', 'daily_balance',
        60,
        TRUE, 2.00,
        TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM recurring_deposit_product WHERE name = 'Retirement Booster');
    
    -- Weekly Saver Recurring Deposit
    INSERT INTO recurring_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        recurring_deposit_amount, minimum_deposit_amount, maximum_deposit_amount,
        deposit_frequency, interest_rate,
        interest_compounding_period_type, interest_posting_period_type, interest_calculation_type,
        term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        active,
        created_date, created_by
    )
    SELECT 
        'Weekly Saver', 'WKS',
        'Short-term weekly recurring deposit for Trinidad and Tobago market',
        'TTD', 2,
        200.00, 100.00, 1000.00,
        'weekly', 3.50,
        'monthly', 'quarterly', 'daily_balance',
        6,
        TRUE, 0.75,
        TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM recurring_deposit_product WHERE name = 'Weekly Saver');
END
$$;

-- ================================================
-- Recurring Deposit Accounts for Trinidad and Tobago clients
-- ================================================

-- Helper function to create recurring deposit accounts
DO $$
DECLARE
    admin_user_id UUID;
    standard_rd_id UUID;
    education_saver_id UUID;
    carnival_saver_id UUID;
    retirement_booster_id UUID;
    weekly_saver_id UUID;
    account_id UUID;
    start_date DATE;
    deposits_completed INTEGER;
    next_due_date DATE;
    months_completed INTEGER;
    total_deposit NUMERIC(19,6);
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Get product IDs
    SELECT id INTO standard_rd_id FROM recurring_deposit_product WHERE name = 'Standard Recurring Deposit';
    SELECT id INTO education_saver_id FROM recurring_deposit_product WHERE name = 'Education Saver';
    SELECT id INTO carnival_saver_id FROM recurring_deposit_product WHERE name = 'Carnival Saver';
    SELECT id INTO retirement_booster_id FROM recurring_deposit_product WHERE name = 'Retirement Booster';
    SELECT id INTO weekly_saver_id FROM recurring_deposit_product WHERE name = 'Weekly Saver';
    
    -- Create recurring deposit accounts for clients if they don't exist already
    
    -- Standard RD for Rajiv Persad
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad') AND 
       NOT EXISTS (SELECT 1 FROM recurring_deposit_account rda 
                  JOIN client c ON rda.client_id = c.id 
                  WHERE c.firstname = 'Rajiv' AND c.lastname = 'Persad' AND rda.product_id = standard_rd_id) AND
       standard_rd_id IS NOT NULL THEN
        
        -- Set start date and calculate other values
        start_date := CURRENT_DATE - INTERVAL '5 months';
        months_completed := 5;
        deposits_completed := months_completed;
        next_due_date := start_date + INTERVAL '1 month' * (months_completed + 1);
        total_deposit := 1000.00 * months_completed;
        
        INSERT INTO recurring_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            recurring_deposit_amount, total_deposit_amount,
            deposit_frequency, next_deposit_due_date,
            deposits_completed, expected_deposits,
            maturity_date, interest_rate, interest_earned,
            maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'RD' || to_char(now(), 'YYYYMMDD') || '0001',
            (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad'),
            standard_rd_id,
            (SELECT id FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj'),
            'active',
            start_date, admin_user_id,
            start_date, admin_user_id,
            start_date, admin_user_id,
            1000.00, total_deposit,
            'monthly', next_due_date,
            deposits_completed, 12,
            start_date + INTERVAL '12 months', 4.25, 
            ROUND((total_deposit * 0.0425 * months_completed / 12)::NUMERIC, 2),
            'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        ) RETURNING id INTO account_id;
        
        -- Create past installments
        FOR i IN 1..months_completed LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                completed_date,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 month' * i,
                1000.00,
                TRUE,
                start_date + INTERVAL '1 month' * i,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create future installments
        FOR i IN (months_completed + 1)..12 LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 month' * i,
                1000.00,
                FALSE,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create deposit transactions for completed installments
        FOR i IN 1..months_completed LOOP
            INSERT INTO recurring_deposit_transaction (
                recurring_deposit_account_id,
                office_id,
                transaction_type,
                transaction_date,
                amount,
                is_reversal,
                submitted_on_date,
                submitted_by_user_id,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                (SELECT office_id FROM client WHERE id = (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad')),
                'deposit',
                start_date + INTERVAL '1 month' * i,
                1000.00,
                FALSE,
                start_date + INTERVAL '1 month' * i,
                admin_user_id,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
    END IF;
    
    -- Education Saver RD for Cheryl Williams
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams') AND 
       NOT EXISTS (SELECT 1 FROM recurring_deposit_account rda 
                  JOIN client c ON rda.client_id = c.id 
                  WHERE c.firstname = 'Cheryl' AND c.lastname = 'Williams' AND rda.product_id = education_saver_id) AND
       education_saver_id IS NOT NULL THEN
        
        -- Set start date and calculate other values
        start_date := CURRENT_DATE - INTERVAL '3 months';
        months_completed := 3;
        deposits_completed := months_completed;
        next_due_date := start_date + INTERVAL '1 month' * (months_completed + 1);
        total_deposit := 500.00 * months_completed;
        
        INSERT INTO recurring_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            recurring_deposit_amount, total_deposit_amount,
            deposit_frequency, next_deposit_due_date,
            deposits_completed, expected_deposits,
            maturity_date, interest_rate, interest_earned,
            maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'RD' || to_char(now(), 'YYYYMMDD') || '0002',
            (SELECT id FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams'),
            education_saver_id,
            (SELECT id FROM staff WHERE first_name = 'Marcus' AND last_name = 'Alexander'),
            'active',
            start_date, admin_user_id,
            start_date, admin_user_id,
            start_date, admin_user_id,
            500.00, total_deposit,
            'monthly', next_due_date,
            deposits_completed, 36,
            start_date + INTERVAL '36 months', 5.00, 
            ROUND((total_deposit * 0.05 * months_completed / 12)::NUMERIC, 2),
            'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        ) RETURNING id INTO account_id;
        
        -- Create past installments
        FOR i IN 1..months_completed LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                completed_date,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 month' * i,
                500.00,
                TRUE,
                start_date + INTERVAL '1 month' * i,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create future installments (up to the next 12 months)
        FOR i IN (months_completed + 1)..12 LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 month' * i,
                500.00,
                FALSE,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create deposit transactions for completed installments
        FOR i IN 1..months_completed LOOP
            INSERT INTO recurring_deposit_transaction (
                recurring_deposit_account_id,
                office_id,
                transaction_type,
                transaction_date,
                amount,
                is_reversal,
                submitted_on_date,
                submitted_by_user_id,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                (SELECT office_id FROM client WHERE id = (SELECT id FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams')),
                'deposit',
                start_date + INTERVAL '1 month' * i,
                500.00,
                FALSE,
                start_date + INTERVAL '1 month' * i,
                admin_user_id,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
    END IF;
    
    -- Carnival Saver RD for Claudette Phillips
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips') AND 
       NOT EXISTS (SELECT 1 FROM recurring_deposit_account rda 
                  JOIN client c ON rda.client_id = c.id 
                  WHERE c.firstname = 'Claudette' AND c.lastname = 'Phillips' AND rda.product_id = carnival_saver_id) AND
       carnival_saver_id IS NOT NULL THEN
        
        -- Set start date and calculate other values
        start_date := CURRENT_DATE - INTERVAL '2 months';
        months_completed := 2;
        deposits_completed := months_completed;
        next_due_date := start_date + INTERVAL '1 month' * (months_completed + 1);
        total_deposit := 500.00 * months_completed;
        
        INSERT INTO recurring_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            recurring_deposit_amount, total_deposit_amount,
            deposit_frequency, next_deposit_due_date,
            deposits_completed, expected_deposits,
            maturity_date, interest_rate, interest_earned,
            maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'RD' || to_char(now(), 'YYYYMMDD') || '0003',
            (SELECT id FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips'),
            carnival_saver_id,
            (SELECT id FROM staff WHERE first_name = 'Devon' AND last_name = 'Charles'),
            'active',
            start_date, admin_user_id,
            start_date, admin_user_id,
            start_date, admin_user_id,
            500.00, total_deposit,
            'monthly', next_due_date,
            deposits_completed, 6,
            start_date + INTERVAL '6 months', 3.75, 
            ROUND((total_deposit * 0.0375 * months_completed / 12)::NUMERIC, 2),
            'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        ) RETURNING id INTO account_id;
        
        -- Create past installments
        FOR i IN 1..months_completed LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                completed_date,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 month' * i,
                500.00,
                TRUE,
                start_date + INTERVAL '1 month' * i,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create future installments
        FOR i IN (months_completed + 1)..6 LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 month' * i,
                500.00,
                FALSE,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create deposit transactions for completed installments
        FOR i IN 1..months_completed LOOP
            INSERT INTO recurring_deposit_transaction (
                recurring_deposit_account_id,
                office_id,
                transaction_type,
                transaction_date,
                amount,
                is_reversal,
                submitted_on_date,
                submitted_by_user_id,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                (SELECT office_id FROM client WHERE id = (SELECT id FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips')),
                'deposit',
                start_date + INTERVAL '1 month' * i,
                500.00,
                FALSE,
                start_date + INTERVAL '1 month' * i,
                admin_user_id,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
    END IF;
    
    -- Weekly Saver RD for Tobago Tourism Experience Ltd
    IF EXISTS (SELECT 1 FROM client WHERE company_name = 'Tobago Tourism Experience Ltd') AND 
       NOT EXISTS (SELECT 1 FROM recurring_deposit_account rda 
                  JOIN client c ON rda.client_id = c.id 
                  WHERE c.company_name = 'Tobago Tourism Experience Ltd' AND rda.product_id = weekly_saver_id) AND
       weekly_saver_id IS NOT NULL THEN
        
        -- Set start date and calculate other values based on weeks
        start_date := CURRENT_DATE - INTERVAL '8 weeks';
        deposits_completed := 8; -- 8 weeks
        next_due_date := start_date + INTERVAL '1 week' * (deposits_completed + 1);
        total_deposit := 200.00 * deposits_completed;
        
        INSERT INTO recurring_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            recurring_deposit_amount, total_deposit_amount,
            deposit_frequency, next_deposit_due_date,
            deposits_completed, expected_deposits,
            maturity_date, interest_rate, interest_earned,
            maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'RD' || to_char(now(), 'YYYYMMDD') || '0004',
            (SELECT id FROM client WHERE company_name = 'Tobago Tourism Experience Ltd'),
            weekly_saver_id,
            (SELECT id FROM staff WHERE first_name = 'Devon' AND last_name = 'Charles'),
            'active',
            start_date, admin_user_id,
            start_date, admin_user_id,
            start_date, admin_user_id,
            200.00, total_deposit,
            'weekly', next_due_date,
            deposits_completed, 26, -- 26 weeks (6 months)
            start_date + INTERVAL '26 weeks', 3.50, 
            ROUND((total_deposit * 0.035 * (deposits_completed / 52.0))::NUMERIC, 2),
            'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        ) RETURNING id INTO account_id;
        
        -- Create past installments
        FOR i IN 1..deposits_completed LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                completed_date,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 week' * i,
                200.00,
                TRUE,
                start_date + INTERVAL '1 week' * i,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create future installments (next 10 weeks)
        FOR i IN (deposits_completed + 1)..(deposits_completed + 10) LOOP
            INSERT INTO recurring_deposit_installment (
                recurring_deposit_account_id,
                installment_number,
                due_date,
                deposit_amount,
                completed,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                i,
                start_date + INTERVAL '1 week' * i,
                200.00,
                FALSE,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
        
        -- Create deposit transactions for completed installments
        FOR i IN 1..deposits_completed LOOP
            INSERT INTO recurring_deposit_transaction (
                recurring_deposit_account_id,
                office_id,
                transaction_type,
                transaction_date,
                amount,
                is_reversal,
                submitted_on_date,
                submitted_by_user_id,
                created_date,
                created_by
            )
            VALUES (
                account_id,
                (SELECT office_id FROM client WHERE id = (SELECT id FROM client WHERE company_name = 'Tobago Tourism Experience Ltd')),
                'deposit',
                start_date + INTERVAL '1 week' * i,
                200.00,
                FALSE,
                start_date + INTERVAL '1 week' * i,
                admin_user_id,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
        END LOOP;
    END IF;
END
$$;

-- Create view for easy access to recurring deposit data
CREATE OR REPLACE VIEW recurring_deposits AS
SELECT 
    rda.id,
    rda.account_no,
    c.display_name as client_name,
    rdp.name as product_name,
    rda.recurring_deposit_amount,
    rda.total_deposit_amount,
    rda.deposit_frequency,
    rda.deposits_completed,
    rda.expected_deposits,
    rda.next_deposit_due_date,
    rda.interest_rate,
    rda.interest_earned,
    rda.maturity_date,
    rda.maturity_instruction,
    rda.status,
    rda.activated_on_date as start_date,
    o.name as office_name,
    s.display_name as officer_name
FROM recurring_deposit_account rda
JOIN recurring_deposit_product rdp ON rda.product_id = rdp.id
LEFT JOIN client c ON rda.client_id = c.id
LEFT JOIN office o ON (SELECT office_id FROM client WHERE id = rda.client_id) = o.id
LEFT JOIN staff s ON rda.field_officer_id = s.id;