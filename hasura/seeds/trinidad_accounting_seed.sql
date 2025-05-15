-- Trinidad and Tobago accounting mock data
-- This seed file creates GL accounts and journal entries specific to Trinidad and Tobago

-- Set search path to the appropriate schema
SET search_path TO fineract_default;

-- ================================================
-- Chart of Accounts for Trinidad and Tobago
-- ================================================

-- Helper function to get existing root accounts or create new ones
DO $$
DECLARE
    assets_id UUID;
    liabilities_id UUID;
    equity_id UUID;
    income_id UUID;
    expenses_id UUID;
BEGIN
    -- Create Assets (1000) if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1000') THEN
        INSERT INTO gl_account (
            name, gl_code, hierarchy, disabled, manual_entries_allowed,
            account_type, account_usage, description
        ) VALUES (
            'Assets', '1000', '.', FALSE, TRUE,
            'asset', 'detail', 'Asset accounts'
        ) RETURNING id INTO assets_id;
        
        UPDATE gl_account SET hierarchy = '.' || id WHERE gl_code = '1000';
    ELSE
        SELECT id INTO assets_id FROM gl_account WHERE gl_code = '1000';
    END IF;
    
    -- Create Liabilities (2000) if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '2000') THEN
        INSERT INTO gl_account (
            name, gl_code, hierarchy, disabled, manual_entries_allowed,
            account_type, account_usage, description
        ) VALUES (
            'Liabilities', '2000', '.', FALSE, TRUE,
            'liability', 'detail', 'Liability accounts'
        ) RETURNING id INTO liabilities_id;
        
        UPDATE gl_account SET hierarchy = '.' || id WHERE gl_code = '2000';
    ELSE
        SELECT id INTO liabilities_id FROM gl_account WHERE gl_code = '2000';
    END IF;
    
    -- Create Equity (3000) if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '3000') THEN
        INSERT INTO gl_account (
            name, gl_code, hierarchy, disabled, manual_entries_allowed,
            account_type, account_usage, description
        ) VALUES (
            'Equity', '3000', '.', FALSE, TRUE,
            'equity', 'detail', 'Equity accounts'
        ) RETURNING id INTO equity_id;
        
        UPDATE gl_account SET hierarchy = '.' || id WHERE gl_code = '3000';
    ELSE
        SELECT id INTO equity_id FROM gl_account WHERE gl_code = '3000';
    END IF;
    
    -- Create Income (4000) if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '4000') THEN
        INSERT INTO gl_account (
            name, gl_code, hierarchy, disabled, manual_entries_allowed,
            account_type, account_usage, description
        ) VALUES (
            'Income', '4000', '.', FALSE, TRUE,
            'income', 'detail', 'Income accounts'
        ) RETURNING id INTO income_id;
        
        UPDATE gl_account SET hierarchy = '.' || id WHERE gl_code = '4000';
    ELSE
        SELECT id INTO income_id FROM gl_account WHERE gl_code = '4000';
    END IF;
    
    -- Create Expenses (5000) if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5000') THEN
        INSERT INTO gl_account (
            name, gl_code, hierarchy, disabled, manual_entries_allowed,
            account_type, account_usage, description
        ) VALUES (
            'Expenses', '5000', '.', FALSE, TRUE,
            'expense', 'detail', 'Expense accounts'
        ) RETURNING id INTO expenses_id;
        
        UPDATE gl_account SET hierarchy = '.' || id WHERE gl_code = '5000';
    ELSE
        SELECT id INTO expenses_id FROM gl_account WHERE gl_code = '5000';
    END IF;
END
$$;

-- ASSETS
-- Cash and Bank accounts
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Cash and Bank Accounts', (SELECT id FROM gl_account WHERE gl_code = '1000'), '1100', FALSE, TRUE, 'asset', 'header', 'Cash and bank accounts'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1100');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1000') || '.' || id WHERE gl_code = '1100';

-- First Citizens Bank account (major bank in Trinidad and Tobago)
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'First Citizens Bank Current Account', (SELECT id FROM gl_account WHERE gl_code = '1100'), '1101', FALSE, TRUE, 'asset', 'detail', 'Main operational account with First Citizens Bank'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1101');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1100') || '.' || id WHERE gl_code = '1101';

-- Republic Bank account (another major bank in Trinidad and Tobago)
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Republic Bank Savings Account', (SELECT id FROM gl_account WHERE gl_code = '1100'), '1102', FALSE, TRUE, 'asset', 'detail', 'Reserve savings account with Republic Bank'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1102');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1100') || '.' || id WHERE gl_code = '1102';

-- Petty Cash
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Petty Cash', (SELECT id FROM gl_account WHERE gl_code = '1100'), '1103', FALSE, TRUE, 'asset', 'detail', 'Petty cash for minor expenses'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1103');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1100') || '.' || id WHERE gl_code = '1103';

-- Loan Portfolio accounts
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Loan Portfolio', (SELECT id FROM gl_account WHERE gl_code = '1000'), '1200', FALSE, TRUE, 'asset', 'header', 'Loan portfolio accounts'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1200');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1000') || '.' || id WHERE gl_code = '1200';

-- Home Improvement Loans
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Home Improvement Loans', (SELECT id FROM gl_account WHERE gl_code = '1200'), '1201', FALSE, TRUE, 'asset', 'detail', 'Home improvement loans portfolio'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1201');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1200') || '.' || id WHERE gl_code = '1201';

-- Small Business Loans
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Small Business Loans', (SELECT id FROM gl_account WHERE gl_code = '1200'), '1202', FALSE, TRUE, 'asset', 'detail', 'Small business loans portfolio'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1202');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1200') || '.' || id WHERE gl_code = '1202';

-- Education Loans
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Education Loans', (SELECT id FROM gl_account WHERE gl_code = '1200'), '1203', FALSE, TRUE, 'asset', 'detail', 'Education loans portfolio'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1203');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1200') || '.' || id WHERE gl_code = '1203';

-- Agricultural Loans
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Agricultural Loans', (SELECT id FROM gl_account WHERE gl_code = '1200'), '1204', FALSE, TRUE, 'asset', 'detail', 'Agricultural loans portfolio'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1204');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1200') || '.' || id WHERE gl_code = '1204';

-- Carnival Loans
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Carnival Loans', (SELECT id FROM gl_account WHERE gl_code = '1200'), '1205', FALSE, TRUE, 'asset', 'detail', 'Carnival season loans portfolio'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1205');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1200') || '.' || id WHERE gl_code = '1205';

-- Fixed Assets
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Fixed Assets', (SELECT id FROM gl_account WHERE gl_code = '1000'), '1300', FALSE, TRUE, 'asset', 'header', 'Fixed assets'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1300');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1000') || '.' || id WHERE gl_code = '1300';

-- Furniture and Equipment
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Furniture and Equipment', (SELECT id FROM gl_account WHERE gl_code = '1300'), '1301', FALSE, TRUE, 'asset', 'detail', 'Furniture and equipment'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1301');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1300') || '.' || id WHERE gl_code = '1301';

-- Building
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Building', (SELECT id FROM gl_account WHERE gl_code = '1300'), '1302', FALSE, TRUE, 'asset', 'detail', 'Building properties'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1302');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1300') || '.' || id WHERE gl_code = '1302';

-- Vehicles
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Vehicles', (SELECT id FROM gl_account WHERE gl_code = '1300'), '1303', FALSE, TRUE, 'asset', 'detail', 'Company vehicles'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '1303');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '1300') || '.' || id WHERE gl_code = '1303';

-- LIABILITIES
-- Client Deposits
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Client Deposits', (SELECT id FROM gl_account WHERE gl_code = '2000'), '2100', FALSE, TRUE, 'liability', 'header', 'Client deposits'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '2100');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '2000') || '.' || id WHERE gl_code = '2100';

-- Regular Savings Deposits
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Regular Savings Deposits', (SELECT id FROM gl_account WHERE gl_code = '2100'), '2101', FALSE, TRUE, 'liability', 'detail', 'Regular savings account client deposits'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '2101');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '2100') || '.' || id WHERE gl_code = '2101';

-- Premium Savings Deposits
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Premium Savings Deposits', (SELECT id FROM gl_account WHERE gl_code = '2100'), '2102', FALSE, TRUE, 'liability', 'detail', 'Premium savings account client deposits'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '2102');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '2100') || '.' || id WHERE gl_code = '2102';

-- Christmas Club Deposits
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Christmas Club Deposits', (SELECT id FROM gl_account WHERE gl_code = '2100'), '2103', FALSE, TRUE, 'liability', 'detail', 'Christmas club account deposits'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '2103');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '2100') || '.' || id WHERE gl_code = '2103';

-- External Borrowing
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'External Borrowing', (SELECT id FROM gl_account WHERE gl_code = '2000'), '2200', FALSE, TRUE, 'liability', 'header', 'External borrowing'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '2200');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '2000') || '.' || id WHERE gl_code = '2200';

-- Central Bank Loan
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Central Bank Loan', (SELECT id FROM gl_account WHERE gl_code = '2200'), '2201', FALSE, TRUE, 'liability', 'detail', 'Loan from Central Bank of Trinidad and Tobago'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '2201');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '2200') || '.' || id WHERE gl_code = '2201';

-- EQUITY
-- Retained Earnings
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Retained Earnings', (SELECT id FROM gl_account WHERE gl_code = '3000'), '3100', FALSE, TRUE, 'equity', 'detail', 'Retained earnings'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '3100');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '3000') || '.' || id WHERE gl_code = '3100';

-- INCOME
-- Interest Income
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Interest Income', (SELECT id FROM gl_account WHERE gl_code = '4000'), '4100', FALSE, TRUE, 'income', 'header', 'Interest income'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '4100');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '4000') || '.' || id WHERE gl_code = '4100';

-- Home Improvement Loan Interest
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Home Improvement Loan Interest', (SELECT id FROM gl_account WHERE gl_code = '4100'), '4101', FALSE, TRUE, 'income', 'detail', 'Interest income from home improvement loans'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '4101');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '4100') || '.' || id WHERE gl_code = '4101';

-- Small Business Loan Interest
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Small Business Loan Interest', (SELECT id FROM gl_account WHERE gl_code = '4100'), '4102', FALSE, TRUE, 'income', 'detail', 'Interest income from small business loans'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '4102');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '4100') || '.' || id WHERE gl_code = '4102';

-- Education Loan Interest
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Education Loan Interest', (SELECT id FROM gl_account WHERE gl_code = '4100'), '4103', FALSE, TRUE, 'income', 'detail', 'Interest income from education loans'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '4103');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '4100') || '.' || id WHERE gl_code = '4103';

-- Fee Income
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Fee Income', (SELECT id FROM gl_account WHERE gl_code = '4000'), '4200', FALSE, TRUE, 'income', 'header', 'Fee income'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '4200');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '4000') || '.' || id WHERE gl_code = '4200';

-- Processing Fees
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Processing Fees', (SELECT id FROM gl_account WHERE gl_code = '4200'), '4201', FALSE, TRUE, 'income', 'detail', 'Loan processing fees'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '4201');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '4200') || '.' || id WHERE gl_code = '4201';

-- EXPENSES
-- Personnel Expenses
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Personnel Expenses', (SELECT id FROM gl_account WHERE gl_code = '5000'), '5100', FALSE, TRUE, 'expense', 'header', 'Personnel expenses'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5100');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '5000') || '.' || id WHERE gl_code = '5100';

-- Salaries
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Salaries', (SELECT id FROM gl_account WHERE gl_code = '5100'), '5101', FALSE, TRUE, 'expense', 'detail', 'Staff salaries'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5101');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '5100') || '.' || id WHERE gl_code = '5101';

-- Employee Benefits
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Employee Benefits', (SELECT id FROM gl_account WHERE gl_code = '5100'), '5102', FALSE, TRUE, 'expense', 'detail', 'Employee benefits'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5102');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '5100') || '.' || id WHERE gl_code = '5102';

-- Administrative Expenses
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Administrative Expenses', (SELECT id FROM gl_account WHERE gl_code = '5000'), '5200', FALSE, TRUE, 'expense', 'header', 'Administrative expenses'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5200');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '5000') || '.' || id WHERE gl_code = '5200';

-- Rent
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Rent', (SELECT id FROM gl_account WHERE gl_code = '5200'), '5201', FALSE, TRUE, 'expense', 'detail', 'Office rent'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5201');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '5200') || '.' || id WHERE gl_code = '5201';

-- Utilities
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Utilities', (SELECT id FROM gl_account WHERE gl_code = '5200'), '5202', FALSE, TRUE, 'expense', 'detail', 'Utilities (electricity, water, telecom)'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5202');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '5200') || '.' || id WHERE gl_code = '5202';

-- Office Supplies
INSERT INTO gl_account (name, parent_id, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
SELECT 'Office Supplies', (SELECT id FROM gl_account WHERE gl_code = '5200'), '5203', FALSE, TRUE, 'expense', 'detail', 'Office supplies and stationery'
WHERE NOT EXISTS (SELECT 1 FROM gl_account WHERE gl_code = '5203');

UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE gl_code = '5200') || '.' || id WHERE gl_code = '5203';

-- ================================================
-- GL Journal Entries for Trinidad and Tobago
-- ================================================

-- Helper function to create journal entries
DO $$
DECLARE
    admin_user_id UUID;
    office_id UUID;
    transaction_id TEXT;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM app_user WHERE username = 'admin' LIMIT 1;
    
    -- Get head office ID
    SELECT id INTO office_id FROM office WHERE name = 'Port of Spain Headquarters' LIMIT 1;
    
    -- Only add transactions if we have an office and admin user
    IF office_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        -- Add some sample journal entries
        
        -- Initial deposit of funds to First Citizens Bank
        IF NOT EXISTS (SELECT 1 FROM gl_journal_entry WHERE description LIKE 'Initial deposit%First Citizens%') THEN
            -- Generate a transaction ID
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-001';
            
            -- Credit Retained Earnings
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '3100'), -- Retained Earnings
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 year', 'credit', 5000000.00,
                'Initial deposit of capital to First Citizens Bank',
                'TTD',
                CURRENT_DATE - INTERVAL '1 year', admin_user_id
            );
            
            -- Debit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 year', 'debit', 5000000.00,
                'Initial deposit of capital to First Citizens Bank',
                'TTD',
                CURRENT_DATE - INTERVAL '1 year', admin_user_id
            );
        END IF;
        
        -- Loan disbursement for Home Improvement Loan
        IF NOT EXISTS (SELECT 1 FROM gl_journal_entry WHERE description LIKE 'Disbursement of Home Improvement%') THEN
            -- Generate a transaction ID
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-002';
            
            -- Credit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '3 months', 'credit', 75000.00,
                'Disbursement of Home Improvement Loan #HL-001',
                'TTD',
                CURRENT_DATE - INTERVAL '3 months', admin_user_id
            );
            
            -- Debit Home Improvement Loans
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1201'), -- Home Improvement Loans
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '3 months', 'debit', 75000.00,
                'Disbursement of Home Improvement Loan #HL-001',
                'TTD',
                CURRENT_DATE - INTERVAL '3 months', admin_user_id
            );
        END IF;
        
        -- Loan disbursement for Small Business Loan
        IF NOT EXISTS (SELECT 1 FROM gl_journal_entry WHERE description LIKE 'Disbursement of Small Business%') THEN
            -- Generate a transaction ID
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-003';
            
            -- Credit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '4 months', 'credit', 150000.00,
                'Disbursement of Small Business Loan #SB-001',
                'TTD',
                CURRENT_DATE - INTERVAL '4 months', admin_user_id
            );
            
            -- Debit Small Business Loans
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1202'), -- Small Business Loans
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '4 months', 'debit', 150000.00,
                'Disbursement of Small Business Loan #SB-001',
                'TTD',
                CURRENT_DATE - INTERVAL '4 months', admin_user_id
            );
        END IF;
        
        -- Interest Income from Home Improvement Loan
        IF NOT EXISTS (SELECT 1 FROM gl_journal_entry WHERE description LIKE 'Interest income from Home Improvement%') THEN
            -- Generate a transaction ID for month 1
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-004';
            
            -- Credit Interest Income
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '4101'), -- Home Improvement Loan Interest
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '2 months', 'credit', 470.00,
                'Interest income from Home Improvement Loan #HL-001 - Month 1',
                'TTD',
                CURRENT_DATE - INTERVAL '2 months', admin_user_id
            );
            
            -- Debit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '2 months', 'debit', 470.00,
                'Interest income from Home Improvement Loan #HL-001 - Month 1',
                'TTD',
                CURRENT_DATE - INTERVAL '2 months', admin_user_id
            );
            
            -- Generate a transaction ID for month 2
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-005';
            
            -- Credit Interest Income
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '4101'), -- Home Improvement Loan Interest
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 month', 'credit', 465.00,
                'Interest income from Home Improvement Loan #HL-001 - Month 2',
                'TTD',
                CURRENT_DATE - INTERVAL '1 month', admin_user_id
            );
            
            -- Debit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 month', 'debit', 465.00,
                'Interest income from Home Improvement Loan #HL-001 - Month 2',
                'TTD',
                CURRENT_DATE - INTERVAL '1 month', admin_user_id
            );
        END IF;
        
        -- Client deposit into savings account
        IF NOT EXISTS (SELECT 1 FROM gl_journal_entry WHERE description LIKE 'Client deposit into Regular Savings%') THEN
            -- Generate a transaction ID
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-006';
            
            -- Credit Client Deposits
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '2101'), -- Regular Savings Deposits
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '3 months', 'credit', 1000.00,
                'Client deposit into Regular Savings Account',
                'TTD',
                CURRENT_DATE - INTERVAL '3 months', admin_user_id
            );
            
            -- Debit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '3 months', 'debit', 1000.00,
                'Client deposit into Regular Savings Account',
                'TTD',
                CURRENT_DATE - INTERVAL '3 months', admin_user_id
            );
        END IF;
        
        -- Rent payment for office space
        IF NOT EXISTS (SELECT 1 FROM gl_journal_entry WHERE description LIKE 'Monthly rent payment%') THEN
            -- Generate a transaction ID
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-007';
            
            -- Debit Rent Expense
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '5201'), -- Rent
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 month', 'debit', 15000.00,
                'Monthly rent payment for Port of Spain office',
                'TTD',
                CURRENT_DATE - INTERVAL '1 month', admin_user_id
            );
            
            -- Credit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 month', 'credit', 15000.00,
                'Monthly rent payment for Port of Spain office',
                'TTD',
                CURRENT_DATE - INTERVAL '1 month', admin_user_id
            );
        END IF;
        
        -- Salary payment
        IF NOT EXISTS (SELECT 1 FROM gl_journal_entry WHERE description LIKE 'Staff salary payment%') THEN
            -- Generate a transaction ID
            transaction_id := 'JE-' || to_char(now(), 'YYYYMMDD') || '-008';
            
            -- Debit Salaries Expense
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '5101'), -- Salaries
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 month', 'debit', 120000.00,
                'Staff salary payment - month end',
                'TTD',
                CURRENT_DATE - INTERVAL '1 month', admin_user_id
            );
            
            -- Credit First Citizens Bank
            INSERT INTO gl_journal_entry (
                account_id, office_id, transaction_id, reversed, manual_entry,
                entry_date, type, amount, description, currency_code,
                submitted_on_date, submitted_by_user_id
            )
            VALUES (
                (SELECT id FROM gl_account WHERE gl_code = '1101'), -- First Citizens Bank
                office_id,
                transaction_id,
                FALSE, TRUE,
                CURRENT_DATE - INTERVAL '1 month', 'credit', 120000.00,
                'Staff salary payment - month end',
                'TTD',
                CURRENT_DATE - INTERVAL '1 month', admin_user_id
            );
        END IF;
    END IF;
END
$$;