-- Hasura seed file for loan application functionality
-- This seed file populates sample data needed for the credit-cloud-admin frontend

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create mock users if they don't exist
INSERT INTO app_user (
    id, username, email, password_hash, first_name, last_name, is_active, 
    office_id, staff_id, is_system_user, last_login_date
)
SELECT 
    uuid_generate_v4(), 'admin', 'admin@example.com', 
    '$2a$10$VPU2W5e/TzugWbEwAB7Aoe0bECdpxGTQW0r7pqm1OQGOVPDq5xoEW', -- hashed 'password'
    'Admin', 'User', TRUE,
    (SELECT id FROM office WHERE name = 'Head Office' LIMIT 1),
    NULL, TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'admin')
RETURNING id AS admin_user_id \gset

-- Create some sample staff members if they don't exist
INSERT INTO staff (
    id, office_id, first_name, last_name, display_name, 
    is_loan_officer, mobile_no, is_active, joining_date
)
SELECT 
    uuid_generate_v4(), 
    (SELECT id FROM office WHERE name = 'Head Office' LIMIT 1),
    'John', 'Doe', 'John Doe',
    TRUE, '+1234567890', TRUE, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'John' AND last_name = 'Doe')
RETURNING id AS loan_officer_id \gset

-- Create sample clients (if they don't exist already)
DO $$
DECLARE
    client1_id UUID;
    client2_id UUID;
    client3_id UUID;
    office_id UUID;
BEGIN
    SELECT id INTO office_id FROM office WHERE name = 'Head Office' LIMIT 1;
    
    -- Check if we already have clients
    SELECT id INTO client1_id FROM client WHERE firstname = 'Alice' AND lastname = 'Johnson' LIMIT 1;
    
    IF client1_id IS NULL THEN
        -- Insert first client
        INSERT INTO client (
            account_no, status, activation_date, office_id, 
            client_type, firstname, lastname, display_name,
            mobile_no, email_address, date_of_birth, gender,
            submitted_date, created_date
        ) VALUES (
            'CL' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '0001',
            'active', CURRENT_DATE, office_id,
            'person', 'Alice', 'Johnson', 'Alice Johnson',
            '+1555123456', 'alice@example.com', '1985-05-15', 'female',
            CURRENT_DATE, CURRENT_TIMESTAMP
        ) RETURNING id INTO client1_id;
    END IF;
    
    -- Check if we already have the second client
    SELECT id INTO client2_id FROM client WHERE firstname = 'Robert' AND lastname = 'Smith' LIMIT 1;
    
    IF client2_id IS NULL THEN
        -- Insert second client
        INSERT INTO client (
            account_no, status, activation_date, office_id, 
            client_type, firstname, lastname, display_name,
            mobile_no, email_address, date_of_birth, gender,
            submitted_date, created_date
        ) VALUES (
            'CL' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '0002',
            'active', CURRENT_DATE, office_id,
            'person', 'Robert', 'Smith', 'Robert Smith',
            '+1555789012', 'robert@example.com', '1978-10-22', 'male',
            CURRENT_DATE, CURRENT_TIMESTAMP
        ) RETURNING id INTO client2_id;
    END IF;
    
    -- Check if we already have the third client
    SELECT id INTO client3_id FROM client WHERE company_name = 'ABC Corporation' LIMIT 1;
    
    IF client3_id IS NULL THEN
        -- Insert an entity client
        INSERT INTO client (
            account_no, status, activation_date, office_id, 
            client_type, company_name, display_name,
            mobile_no, email_address,
            submitted_date, created_date
        ) VALUES (
            'CL' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '0003',
            'active', CURRENT_DATE, office_id,
            'entity', 'ABC Corporation', 'ABC Corporation',
            '+1555456789', 'contact@abccorp.com',
            CURRENT_DATE, CURRENT_TIMESTAMP
        ) RETURNING id INTO client3_id;
    END IF;
END
$$;

-- Create loan products with different terms for frontend selection
DO $$
DECLARE
    loan_product1_id UUID;
    loan_product2_id UUID;
    loan_product3_id UUID;
BEGIN
    -- Check if we already have the first loan product
    SELECT id INTO loan_product1_id FROM loan_product WHERE name = 'Personal Loan' LIMIT 1;
    
    IF loan_product1_id IS NULL THEN
        -- Insert first loan product (Personal Loan)
        INSERT INTO loan_product (
            short_name, name, description,
            min_principal_amount, default_principal_amount, max_principal_amount,
            min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
            repayment_every, repayment_frequency_type,
            min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
            interest_period_frequency_type, annual_nominal_interest_rate,
            interest_method_type, interest_calculation_period_type,
            amortization_method_type,
            currency_code
        ) VALUES (
            'PERS', 'Personal Loan', 'Standard personal loan for individual borrowers',
            500.00, 5000.00, 50000.00,
            3, 12, 60,
            1, 'months',
            5.00, 12.00, 24.00,
            'months', 12.00,
            'declining_balance', 'daily',
            'equal_installments',
            'USD'
        ) RETURNING id INTO loan_product1_id;
    END IF;
    
    -- Check if we already have the second loan product
    SELECT id INTO loan_product2_id FROM loan_product WHERE name = 'Business Loan' LIMIT 1;
    
    IF loan_product2_id IS NULL THEN
        -- Insert second loan product (Business Loan)
        INSERT INTO loan_product (
            short_name, name, description,
            min_principal_amount, default_principal_amount, max_principal_amount,
            min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
            repayment_every, repayment_frequency_type,
            min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
            interest_period_frequency_type, annual_nominal_interest_rate,
            interest_method_type, interest_calculation_period_type,
            amortization_method_type,
            currency_code
        ) VALUES (
            'BUSI', 'Business Loan', 'Loan for small business capital needs',
            5000.00, 25000.00, 200000.00,
            6, 24, 60,
            1, 'months',
            8.00, 15.00, 18.00,
            'months', 15.00,
            'declining_balance', 'daily',
            'equal_installments',
            'USD'
        ) RETURNING id INTO loan_product2_id;
    END IF;
    
    -- Check if we already have the third loan product
    SELECT id INTO loan_product3_id FROM loan_product WHERE name = 'Microfinance Loan' LIMIT 1;
    
    IF loan_product3_id IS NULL THEN
        -- Insert third loan product (Microfinance Loan)
        INSERT INTO loan_product (
            short_name, name, description,
            min_principal_amount, default_principal_amount, max_principal_amount,
            min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
            repayment_every, repayment_frequency_type,
            min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
            interest_period_frequency_type, annual_nominal_interest_rate,
            interest_method_type, interest_calculation_period_type,
            amortization_method_type,
            currency_code
        ) VALUES (
            'MICR', 'Microfinance Loan', 'Small loan for microentrepreneurs',
            100.00, 500.00, 2000.00,
            3, 6, 12,
            2, 'weeks',
            1.00, 2.00, 4.00,
            'weeks', 24.00,
            'flat', 'daily',
            'equal_installments',
            'USD'
        ) RETURNING id INTO loan_product3_id;
    END IF;
END
$$;

-- Create sample loan applications (for reference - these will be created through the UI)
/*
-- This is commented out as we want users to create these through the frontend
DO $$
DECLARE
    loan_id UUID;
    client_id UUID;
    loan_product_id UUID;
    staff_id UUID;
BEGIN
    -- Get a sample client, loan product and staff
    SELECT id INTO client_id FROM client LIMIT 1;
    SELECT id INTO loan_product_id FROM loan_product LIMIT 1;
    SELECT id INTO staff_id FROM staff WHERE is_loan_officer = TRUE LIMIT 1;
    
    -- Only create if we have the required dependencies
    IF client_id IS NOT NULL AND loan_product_id IS NOT NULL THEN
        -- Insert a sample loan
        INSERT INTO loan (
            account_no, client_id, loan_product_id, loan_officer_id,
            loan_status, loan_type, currency_code, currency_digits,
            principal_amount, nominal_interest_rate_per_period, interest_period_frequency_type,
            annual_nominal_interest_rate, interest_method_type, interest_calculation_period_type,
            repayment_strategy, amortization_method_type,
            term_frequency, term_frequency_type,
            repay_every, repayment_frequency_type, number_of_repayments,
            submitted_on_date, submitted_by_user_id
        ) VALUES (
            'LN' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS'),
            client_id, loan_product_id, staff_id,
            'submitted_and_pending_approval', 'individual', 'USD', 2,
            5000.00, 12.00, 'months',
            12.00, 'declining_balance', 'daily',
            'mifos-standard-strategy', 'equal_installments',
            12, 'months',
            1, 'months', 12,
            CURRENT_DATE, 
            (SELECT id FROM app_user LIMIT 1)
        ) RETURNING id INTO loan_id;
    END IF;
END
$$;
*/

-- Create Hasura reference tables for Apollo GraphQL operations
-- First, let's create a GraphQL client table for querying

-- Create a simple client view for the GraphQL operations
CREATE OR REPLACE VIEW clients AS
SELECT 
    id,
    display_name,
    firstname,
    lastname,
    mobile_no,
    email_address,
    status,
    client_type,
    office_id,
    staff_id,
    date_of_birth,
    gender,
    created_date
FROM client;

-- Create loan product view for GraphQL operations
CREATE OR REPLACE VIEW loan_products AS
SELECT 
    id,
    name as loan_name,
    description,
    short_name,
    currency_code,
    min_principal_amount,
    default_principal_amount,
    max_principal_amount,
    min_number_of_repayments,
    default_number_of_repayments,
    max_number_of_repayments,
    repayment_every,
    repayment_frequency_type,
    nominal_interest_rate_per_period as interest_rate_per_period,
    interest_period_frequency_type,
    annual_nominal_interest_rate,
    interest_method_type as interest_type,
    interest_calculation_period_type,
    amortization_method_type,
    active
FROM loan_product;

-- Create a loan applications view for GraphQL
CREATE OR REPLACE VIEW loan_applications AS
SELECT 
    l.id,
    l.client_id as applicant_id,
    l.loan_product_id as loan_type_id,
    l.principal_amount as principal,
    l.submitted_on_date as application_date,
    COALESCE(l.disbursed_on_date, l.expected_disbursement_date) as start_date,
    l.number_of_repayments as tenor,
    l.loan_status as status,
    'web' as device, -- Assuming all applications are from web in this seed
    l.approved_on_date as approved_at,
    l.approved_by_user_id as approved_by_id
FROM loan l
WHERE l.loan_status IN ('submitted_and_pending_approval', 'approved', 'active');

-- Create a running loans view for GraphQL
CREATE OR REPLACE VIEW running_loans AS
SELECT 
    l.id,
    l.client_id,
    l.loan_product_id,
    l.loan_status,
    l.principal_amount,
    l.principal_outstanding_derived as outstanding_amount,
    l.disbursed_on_date,
    l.expected_maturity_date,
    l.number_of_repayments,
    l.loan_officer_id,
    l.currency_code
FROM loan l
WHERE l.loan_status = 'active';

-- Set up Hasura permissions as needed
-- This would normally be done in the Hasura metadata files
-- But we'll just make sure the tables exist for GraphQL operations