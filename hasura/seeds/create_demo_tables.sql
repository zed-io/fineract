-- Create demo tables for Hasura backend
CREATE SCHEMA IF NOT EXISTS fineract;

-- Set search path
SET search_path TO fineract, public;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_no VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    firstname VARCHAR(100),
    middlename VARCHAR(100),
    lastname VARCHAR(100),
    mobile_no VARCHAR(50),
    email_address VARCHAR(150),
    date_of_birth DATE,
    gender VARCHAR(10),
    marital_status VARCHAR(20),
    external_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    activation_date DATE DEFAULT CURRENT_DATE,
    office_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create savings accounts table
CREATE TABLE IF NOT EXISTS savings_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_no VARCHAR(20) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    product_name VARCHAR(100),
    currency_code VARCHAR(3) DEFAULT 'TTD',
    account_balance DECIMAL(19,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    interest_rate DECIMAL(5,2),
    activation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_no VARCHAR(20) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    product_name VARCHAR(100),
    currency_code VARCHAR(3) DEFAULT 'TTD',
    principal_amount DECIMAL(19,2),
    outstanding_balance DECIMAL(19,2),
    interest_rate DECIMAL(5,2),
    term_months INTEGER,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    disbursement_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID,
    account_type VARCHAR(20), -- 'SAVINGS' or 'LOAN'
    transaction_type VARCHAR(20), -- 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT', etc.
    amount DECIMAL(19,2),
    balance_after DECIMAL(19,2),
    description TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo clients
INSERT INTO clients (account_no, display_name, firstname, lastname, mobile_no, email_address, gender, marital_status) VALUES
('CL000001', 'Sarah Thompson', 'Sarah', 'Thompson', '+1 868 555 0100', 'sarah.thompson@email.com', 'Female', 'Single'),
('CL000002', 'John Mohammed', 'John', 'Mohammed', '+1 868 555 0101', 'john.mohammed@email.com', 'Male', 'Married'),
('CL000003', 'Priya Singh', 'Priya', 'Singh', '+1 868 555 0102', 'priya.singh@email.com', 'Female', 'Single'),
('CL000004', 'David Williams', 'David', 'Williams', '+1 868 555 0103', 'david.williams@email.com', 'Male', 'Married'),
('CL000005', 'Maria Rodriguez', 'Maria', 'Rodriguez', '+1 868 555 0104', 'maria.rodriguez@email.com', 'Female', 'Single');

-- Insert demo savings accounts
INSERT INTO savings_accounts (account_no, client_id, product_name, account_balance, interest_rate) 
SELECT 
    'SAV' || LPAD((row_number() OVER ())::text, 6, '0'),
    c.id,
    CASE 
        WHEN (row_number() OVER ()) % 3 = 0 THEN 'Premium Savings Account'
        WHEN (row_number() OVER ()) % 3 = 1 THEN 'Regular Savings Account'
        ELSE 'Youth Savings Account'
    END,
    (RANDOM() * 50000 + 1000)::DECIMAL(19,2),
    CASE 
        WHEN (row_number() OVER ()) % 3 = 0 THEN 3.5
        WHEN (row_number() OVER ()) % 3 = 1 THEN 2.0
        ELSE 3.0
    END
FROM clients c;

-- Insert demo loans
INSERT INTO loans (account_no, client_id, product_name, principal_amount, outstanding_balance, interest_rate, term_months, disbursement_date)
SELECT 
    'LN' || LPAD((row_number() OVER ())::text, 6, '0'),
    c.id,
    CASE (row_number() OVER ()) % 5
        WHEN 0 THEN 'Home Improvement Loan'
        WHEN 1 THEN 'Small Business Loan'
        WHEN 2 THEN 'Education Loan'
        WHEN 3 THEN 'Agricultural Loan'
        ELSE 'Carnival Loan'
    END,
    CASE (row_number() OVER ()) % 5
        WHEN 0 THEN 150000
        WHEN 1 THEN 50000
        WHEN 2 THEN 25000
        WHEN 3 THEN 75000
        ELSE 10000
    END,
    CASE (row_number() OVER ()) % 5
        WHEN 0 THEN 125000
        WHEN 1 THEN 35000
        WHEN 2 THEN 18000
        WHEN 3 THEN 60000
        ELSE 5000
    END,
    CASE (row_number() OVER ()) % 5
        WHEN 0 THEN 7.5
        WHEN 1 THEN 10.0
        WHEN 2 THEN 6.0
        WHEN 3 THEN 9.0
        ELSE 12.0
    END,
    CASE (row_number() OVER ()) % 5
        WHEN 0 THEN 120
        WHEN 1 THEN 60
        WHEN 2 THEN 48
        WHEN 3 THEN 36
        ELSE 12
    END,
    CURRENT_DATE - INTERVAL '3 months'
FROM clients c
LIMIT 3;

-- Insert demo transactions
INSERT INTO transactions (account_id, account_type, transaction_type, amount, balance_after, description)
SELECT 
    sa.id,
    'SAVINGS',
    CASE (row_number() OVER (PARTITION BY sa.id)) % 4
        WHEN 0 THEN 'DEPOSIT'
        WHEN 1 THEN 'WITHDRAWAL'
        WHEN 2 THEN 'INTEREST'
        ELSE 'DEPOSIT'
    END,
    (RANDOM() * 5000 + 100)::DECIMAL(19,2),
    sa.account_balance,
    CASE (row_number() OVER (PARTITION BY sa.id)) % 4
        WHEN 0 THEN 'Salary Deposit'
        WHEN 1 THEN 'ATM Withdrawal'
        WHEN 2 THEN 'Monthly Interest'
        ELSE 'Cash Deposit'
    END
FROM savings_accounts sa
CROSS JOIN generate_series(1, 5);

-- Create indexes
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_savings_accounts_client_id ON savings_accounts(client_id);
CREATE INDEX idx_loans_client_id ON loans(client_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);