-- Trinidad and Tobago Fixed Deposit schema and mock data
-- This script creates the fixed deposit schema and adds sample data for Trinidad and Tobago

-- Set search path to the appropriate schema
SET search_path TO fineract_default;

-- Fixed Deposit Product table
CREATE TABLE IF NOT EXISTS fixed_deposit_product (
    id UUID PRIMARY KEY DEFAULT fineract_default.uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(4) NOT NULL,
    description VARCHAR(500),
    currency_code VARCHAR(3) NOT NULL,
    currency_digits INTEGER NOT NULL DEFAULT 2,
    minimum_deposit_amount NUMERIC(19, 6) NOT NULL,
    maximum_deposit_amount NUMERIC(19, 6),
    interest_rate NUMERIC(19, 6) NOT NULL,
    term_months INTEGER NOT NULL,
    premature_withdrawal_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    premature_withdrawal_penalty NUMERIC(19, 6),
    auto_renew_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    CONSTRAINT fk_fixed_deposit_product_currency FOREIGN KEY (currency_code) REFERENCES currency(code),
    CONSTRAINT fk_fixed_deposit_product_created_by FOREIGN KEY (created_by) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_product_modified_by FOREIGN KEY (last_modified_by) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_fixed_deposit_product_currency ON fixed_deposit_product(currency_code);
CREATE INDEX IF NOT EXISTS idx_fixed_deposit_product_active ON fixed_deposit_product(active);

-- Fixed Deposit Account table
CREATE TABLE IF NOT EXISTS fixed_deposit_account (
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
    deposit_amount NUMERIC(19, 6) NOT NULL,
    maturity_date DATE,
    interest_rate NUMERIC(19, 6) NOT NULL,
    interest_earned NUMERIC(19, 6) DEFAULT 0,
    auto_renew BOOLEAN DEFAULT FALSE,
    maturity_instruction VARCHAR(50) DEFAULT 'transfer_to_savings',
    transfer_to_savings_account_id UUID,
    total_premature_withdrawals NUMERIC(19, 6) DEFAULT 0,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    CONSTRAINT fk_fixed_deposit_account_client FOREIGN KEY (client_id) REFERENCES client(id),
    CONSTRAINT fk_fixed_deposit_account_product FOREIGN KEY (product_id) REFERENCES fixed_deposit_product(id),
    CONSTRAINT fk_fixed_deposit_account_field_officer FOREIGN KEY (field_officer_id) REFERENCES staff(id),
    CONSTRAINT fk_fixed_deposit_account_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_account_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_account_activated_by FOREIGN KEY (activated_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_account_closed_by FOREIGN KEY (closed_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_account_transfer_savings FOREIGN KEY (transfer_to_savings_account_id) REFERENCES savings_account(id),
    CONSTRAINT fk_fixed_deposit_account_created_by FOREIGN KEY (created_by) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_account_modified_by FOREIGN KEY (last_modified_by) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_fixed_deposit_account_client ON fixed_deposit_account(client_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposit_account_product ON fixed_deposit_account(product_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposit_account_status ON fixed_deposit_account(status);
CREATE INDEX IF NOT EXISTS idx_fixed_deposit_account_maturity ON fixed_deposit_account(maturity_date);

-- Fixed Deposit Transaction table
CREATE TABLE IF NOT EXISTS fixed_deposit_transaction (
    id UUID PRIMARY KEY DEFAULT fineract_default.uuid_generate_v4(),
    fixed_deposit_account_id UUID NOT NULL,
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
    CONSTRAINT fk_fixed_deposit_transaction_account FOREIGN KEY (fixed_deposit_account_id) REFERENCES fixed_deposit_account(id),
    CONSTRAINT fk_fixed_deposit_transaction_office FOREIGN KEY (office_id) REFERENCES office(id),
    CONSTRAINT fk_fixed_deposit_transaction_reversal FOREIGN KEY (reversed_by_transaction_id) REFERENCES fixed_deposit_transaction(id),
    CONSTRAINT fk_fixed_deposit_transaction_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_transaction_created_by FOREIGN KEY (created_by) REFERENCES app_user(id),
    CONSTRAINT fk_fixed_deposit_transaction_modified_by FOREIGN KEY (last_modified_by) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_fixed_deposit_transaction_account ON fixed_deposit_transaction(fixed_deposit_account_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposit_transaction_type ON fixed_deposit_transaction(transaction_type);
CREATE INDEX IF NOT EXISTS idx_fixed_deposit_transaction_date ON fixed_deposit_transaction(transaction_date);

-- ================================================
-- Trinidad and Tobago Fixed Deposit Products
-- ================================================

-- Let's create some Fixed Deposit products specific to Trinidad and Tobago market

-- Helper function to get admin user ID
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Standard Fixed Deposit
    INSERT INTO fixed_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        minimum_deposit_amount, maximum_deposit_amount,
        interest_rate, term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        auto_renew_allowed, active,
        created_date, created_by
    )
    SELECT 
        'Standard Fixed Deposit', 'SFD',
        'Standard fixed deposit for Trinidad and Tobago market',
        'TTD', 2,
        10000.00, 1000000.00,
        4.50, 12,
        TRUE, 1.00,
        TRUE, TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM fixed_deposit_product WHERE name = 'Standard Fixed Deposit');
    
    -- High-Yield Fixed Deposit
    INSERT INTO fixed_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        minimum_deposit_amount, maximum_deposit_amount,
        interest_rate, term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        auto_renew_allowed, active,
        created_date, created_by
    )
    SELECT 
        'High-Yield Fixed Deposit', 'HYD',
        'High interest fixed deposit for larger amounts',
        'TTD', 2,
        50000.00, 5000000.00,
        5.25, 24,
        TRUE, 1.50,
        TRUE, TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM fixed_deposit_product WHERE name = 'High-Yield Fixed Deposit');
    
    -- Short-Term Fixed Deposit
    INSERT INTO fixed_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        minimum_deposit_amount, maximum_deposit_amount,
        interest_rate, term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        auto_renew_allowed, active,
        created_date, created_by
    )
    SELECT 
        'Short-Term Fixed Deposit', 'STD',
        'Short-term fixed deposit with flexible terms',
        'TTD', 2,
        5000.00, 500000.00,
        3.75, 6,
        TRUE, 0.75,
        TRUE, TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM fixed_deposit_product WHERE name = 'Short-Term Fixed Deposit');
    
    -- Retirement Fixed Deposit
    INSERT INTO fixed_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        minimum_deposit_amount, maximum_deposit_amount,
        interest_rate, term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        auto_renew_allowed, active,
        created_date, created_by
    )
    SELECT 
        'Retirement Fixed Deposit', 'RFD',
        'Long-term fixed deposit for retirement planning',
        'TTD', 2,
        25000.00, 2000000.00,
        6.00, 60,
        TRUE, 2.00,
        TRUE, TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM fixed_deposit_product WHERE name = 'Retirement Fixed Deposit');
    
    -- Education Fixed Deposit
    INSERT INTO fixed_deposit_product (
        name, short_name, description,
        currency_code, currency_digits,
        minimum_deposit_amount, maximum_deposit_amount,
        interest_rate, term_months,
        premature_withdrawal_allowed, premature_withdrawal_penalty,
        auto_renew_allowed, active,
        created_date, created_by
    )
    SELECT 
        'Education Fixed Deposit', 'EFD',
        'Fixed deposit for education savings with special terms',
        'TTD', 2,
        10000.00, 1000000.00,
        5.00, 36,
        TRUE, 1.25,
        TRUE, TRUE,
        CURRENT_TIMESTAMP, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM fixed_deposit_product WHERE name = 'Education Fixed Deposit');
END
$$;

-- ================================================
-- Fixed Deposit Accounts for Trinidad and Tobago clients
-- ================================================

-- Helper function to create fixed deposit accounts
DO $$
DECLARE
    admin_user_id UUID;
    standard_fd_id UUID;
    high_yield_fd_id UUID;
    short_term_fd_id UUID;
    retirement_fd_id UUID;
    education_fd_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Get product IDs
    SELECT id INTO standard_fd_id FROM fixed_deposit_product WHERE name = 'Standard Fixed Deposit';
    SELECT id INTO high_yield_fd_id FROM fixed_deposit_product WHERE name = 'High-Yield Fixed Deposit';
    SELECT id INTO short_term_fd_id FROM fixed_deposit_product WHERE name = 'Short-Term Fixed Deposit';
    SELECT id INTO retirement_fd_id FROM fixed_deposit_product WHERE name = 'Retirement Fixed Deposit';
    SELECT id INTO education_fd_id FROM fixed_deposit_product WHERE name = 'Education Fixed Deposit';
    
    -- Create fixed deposit accounts for clients if they don't exist already
    
    -- Standard FD for Rajiv Persad
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad') AND 
       NOT EXISTS (SELECT 1 FROM fixed_deposit_account fda 
                  JOIN client c ON fda.client_id = c.id 
                  WHERE c.firstname = 'Rajiv' AND c.lastname = 'Persad' AND fda.product_id = standard_fd_id) AND
       standard_fd_id IS NOT NULL THEN
        
        INSERT INTO fixed_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            deposit_amount, maturity_date, interest_rate,
            auto_renew, maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'FD' || to_char(now(), 'YYYYMMDD') || '0001',
            (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad'),
            standard_fd_id,
            (SELECT id FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj'),
            'active',
            CURRENT_DATE - INTERVAL '3 months', admin_user_id,
            CURRENT_DATE - INTERVAL '3 months', admin_user_id,
            CURRENT_DATE - INTERVAL '3 months', admin_user_id,
            50000.00, CURRENT_DATE + INTERVAL '9 months', 4.50,
            TRUE, 'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        );
    END IF;
    
    -- High-Yield FD for Michelle Garcia
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Michelle' AND lastname = 'Garcia') AND 
       NOT EXISTS (SELECT 1 FROM fixed_deposit_account fda 
                  JOIN client c ON fda.client_id = c.id 
                  WHERE c.firstname = 'Michelle' AND c.lastname = 'Garcia' AND fda.product_id = high_yield_fd_id) AND
       high_yield_fd_id IS NOT NULL THEN
        
        INSERT INTO fixed_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            deposit_amount, maturity_date, interest_rate,
            auto_renew, maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'FD' || to_char(now(), 'YYYYMMDD') || '0002',
            (SELECT id FROM client WHERE firstname = 'Michelle' AND lastname = 'Garcia'),
            high_yield_fd_id,
            (SELECT id FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj'),
            'active',
            CURRENT_DATE - INTERVAL '6 months', admin_user_id,
            CURRENT_DATE - INTERVAL '6 months', admin_user_id,
            CURRENT_DATE - INTERVAL '6 months', admin_user_id,
            100000.00, CURRENT_DATE + INTERVAL '18 months', 5.25,
            TRUE, 'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        );
    END IF;
    
    -- Short-Term FD for Trini Fresh Produce Ltd
    IF EXISTS (SELECT 1 FROM client WHERE company_name = 'Trini Fresh Produce Ltd') AND 
       NOT EXISTS (SELECT 1 FROM fixed_deposit_account fda 
                  JOIN client c ON fda.client_id = c.id 
                  WHERE c.company_name = 'Trini Fresh Produce Ltd' AND fda.product_id = short_term_fd_id) AND
       short_term_fd_id IS NOT NULL THEN
        
        INSERT INTO fixed_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            deposit_amount, maturity_date, interest_rate,
            auto_renew, maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'FD' || to_char(now(), 'YYYYMMDD') || '0003',
            (SELECT id FROM client WHERE company_name = 'Trini Fresh Produce Ltd'),
            short_term_fd_id,
            (SELECT id FROM staff WHERE first_name = 'Kamla' AND last_name = 'Singh'),
            'active',
            CURRENT_DATE - INTERVAL '4 months', admin_user_id,
            CURRENT_DATE - INTERVAL '4 months', admin_user_id,
            CURRENT_DATE - INTERVAL '4 months', admin_user_id,
            75000.00, CURRENT_DATE + INTERVAL '2 months', 3.75,
            FALSE, 'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        );
    END IF;
    
    -- Education FD for Cheryl Williams
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams') AND 
       NOT EXISTS (SELECT 1 FROM fixed_deposit_account fda 
                  JOIN client c ON fda.client_id = c.id 
                  WHERE c.firstname = 'Cheryl' AND c.lastname = 'Williams' AND fda.product_id = education_fd_id) AND
       education_fd_id IS NOT NULL THEN
        
        INSERT INTO fixed_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            deposit_amount, maturity_date, interest_rate,
            auto_renew, maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'FD' || to_char(now(), 'YYYYMMDD') || '0004',
            (SELECT id FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams'),
            education_fd_id,
            (SELECT id FROM staff WHERE first_name = 'Marcus' AND last_name = 'Alexander'),
            'active',
            CURRENT_DATE - INTERVAL '2 months', admin_user_id,
            CURRENT_DATE - INTERVAL '2 months', admin_user_id,
            CURRENT_DATE - INTERVAL '2 months', admin_user_id,
            40000.00, CURRENT_DATE + INTERVAL '34 months', 5.00,
            TRUE, 'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        );
    END IF;
    
    -- Retirement FD for Andre Thomas
    IF EXISTS (SELECT 1 FROM client WHERE firstname = 'Andre' AND lastname = 'Thomas') AND 
       NOT EXISTS (SELECT 1 FROM fixed_deposit_account fda 
                  JOIN client c ON fda.client_id = c.id 
                  WHERE c.firstname = 'Andre' AND c.lastname = 'Thomas' AND fda.product_id = retirement_fd_id) AND
       retirement_fd_id IS NOT NULL THEN
        
        INSERT INTO fixed_deposit_account (
            account_no, client_id, product_id, field_officer_id,
            status, 
            submitted_on_date, submitted_by_user_id,
            approved_on_date, approved_by_user_id,
            activated_on_date, activated_by_user_id,
            deposit_amount, maturity_date, interest_rate,
            auto_renew, maturity_instruction,
            created_date, created_by
        )
        VALUES (
            'FD' || to_char(now(), 'YYYYMMDD') || '0005',
            (SELECT id FROM client WHERE firstname = 'Andre' AND lastname = 'Thomas'),
            retirement_fd_id,
            (SELECT id FROM staff WHERE first_name = 'Sherry' AND last_name = 'Persad'),
            'active',
            CURRENT_DATE - INTERVAL '1 month', admin_user_id,
            CURRENT_DATE - INTERVAL '1 month', admin_user_id,
            CURRENT_DATE - INTERVAL '1 month', admin_user_id,
            150000.00, CURRENT_DATE + INTERVAL '59 months', 6.00,
            TRUE, 'transfer_to_savings',
            CURRENT_TIMESTAMP, admin_user_id
        );
    END IF;
END
$$;

-- ================================================
-- Fixed Deposit Transactions
-- ================================================

-- Helper function to create transactions
DO $$
DECLARE
    account_cursor CURSOR FOR 
        SELECT fda.id, fda.client_id, fda.deposit_amount, fda.office_id, 
               fda.activated_on_date, fdp.name as product_name
        FROM fixed_deposit_account fda
        JOIN fixed_deposit_product fdp ON fda.product_id = fdp.id
        WHERE fda.status = 'active';
    
    account_rec RECORD;
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Process each active fixed deposit account
    OPEN account_cursor;
    LOOP
        FETCH account_cursor INTO account_rec;
        EXIT WHEN NOT FOUND;
        
        -- Initial deposit transaction - opening the account
        IF NOT EXISTS (SELECT 1 FROM fixed_deposit_transaction 
                      WHERE fixed_deposit_account_id = account_rec.id 
                      AND transaction_type = 'deposit' 
                      AND is_reversal = FALSE) THEN
            
            -- Create initial deposit
            INSERT INTO fixed_deposit_transaction (
                fixed_deposit_account_id, 
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
                account_rec.id,
                (SELECT office_id FROM client WHERE id = account_rec.client_id),
                'deposit',
                account_rec.activated_on_date,
                account_rec.deposit_amount,
                FALSE,
                account_rec.activated_on_date,
                admin_user_id,
                CURRENT_TIMESTAMP,
                admin_user_id
            );
            
            -- Add interest accrual transaction if the account has been active for a while
            IF account_rec.activated_on_date < (CURRENT_DATE - INTERVAL '1 month') THEN
                -- Simple interest calculation for demonstration
                DECLARE
                    interest_amount NUMERIC(19,6);
                BEGIN
                    -- Calculate monthly interest (simple approximation)
                    interest_amount := (account_rec.deposit_amount * 
                                       CASE 
                                          WHEN account_rec.product_name = 'Standard Fixed Deposit' THEN 0.045 / 12
                                          WHEN account_rec.product_name = 'High-Yield Fixed Deposit' THEN 0.0525 / 12
                                          WHEN account_rec.product_name = 'Short-Term Fixed Deposit' THEN 0.0375 / 12
                                          WHEN account_rec.product_name = 'Retirement Fixed Deposit' THEN 0.06 / 12
                                          WHEN account_rec.product_name = 'Education Fixed Deposit' THEN 0.05 / 12
                                          ELSE 0.04 / 12
                                       END 
                                      * EXTRACT(DAY FROM (CURRENT_DATE - account_rec.activated_on_date)) / 30);
                    
                    -- Round to 2 decimal places
                    interest_amount := ROUND(interest_amount, 2);
                    
                    -- Create interest accrual transaction
                    INSERT INTO fixed_deposit_transaction (
                        fixed_deposit_account_id, 
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
                        account_rec.id,
                        (SELECT office_id FROM client WHERE id = account_rec.client_id),
                        'interest_accrual',
                        CURRENT_DATE - INTERVAL '1 day',
                        interest_amount,
                        FALSE,
                        CURRENT_DATE - INTERVAL '1 day',
                        admin_user_id,
                        CURRENT_TIMESTAMP,
                        admin_user_id
                    );
                    
                    -- Update interest earned in account
                    UPDATE fixed_deposit_account 
                    SET interest_earned = interest_amount
                    WHERE id = account_rec.id;
                END;
            END IF;
        END IF;
    END LOOP;
    CLOSE account_cursor;
END
$$;

-- Create view for easy access to fixed deposit data
CREATE OR REPLACE VIEW fixed_deposits AS
SELECT 
    fda.id,
    fda.account_no,
    c.display_name as client_name,
    fdp.name as product_name,
    fda.deposit_amount,
    fda.interest_rate,
    fda.interest_earned,
    fda.maturity_date,
    fda.auto_renew,
    fda.maturity_instruction,
    fda.status,
    fda.activated_on_date as start_date,
    o.name as office_name,
    s.display_name as officer_name
FROM fixed_deposit_account fda
JOIN fixed_deposit_product fdp ON fda.product_id = fdp.id
LEFT JOIN client c ON fda.client_id = c.id
LEFT JOIN office o ON (SELECT office_id FROM client WHERE id = fda.client_id) = o.id
LEFT JOIN staff s ON fda.field_officer_id = s.id;