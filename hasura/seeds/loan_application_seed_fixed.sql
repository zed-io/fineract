-- Hasura seed file for loan application functionality (fixed version)
-- This seed file populates sample data needed for the credit-cloud-admin frontend

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create sample clients if they don't exist already
INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '0001',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Head Office' LIMIT 1),
    'person', 'Alice', 'Johnson', 'Alice Johnson',
    '+1555123456', 'alice@example.com', '1985-05-15', 'female',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Alice' AND lastname = 'Johnson');

INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '0002',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Head Office' LIMIT 1),
    'person', 'Robert', 'Smith', 'Robert Smith',
    '+1555789012', 'robert@example.com', '1978-10-22', 'male',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Robert' AND lastname = 'Smith');

INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, company_name, display_name,
    mobile_no, email_address,
    submitted_date
)
SELECT 
    'CL' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '0003',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Head Office' LIMIT 1),
    'entity', 'ABC Corporation', 'ABC Corporation',
    '+1555456789', 'contact@abccorp.com',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE company_name = 'ABC Corporation');

-- Create loan products with different terms for frontend selection
INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type
)
SELECT 
    'PERS', 'Personal Loan', 'Standard personal loan for individual borrowers',
    500.00, 5000.00, 50000.00,
    3, 12, 60,
    1, 'months',
    5.00, 12.00, 24.00,
    'months', 12.00,
    'declining_balance', 'daily',
    'equal_installments'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Personal Loan');

INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type
)
SELECT 
    'BUSI', 'Business Loan', 'Loan for small business capital needs',
    5000.00, 25000.00, 200000.00,
    6, 24, 60,
    1, 'months',
    8.00, 15.00, 18.00,
    'months', 15.00,
    'declining_balance', 'daily',
    'equal_installments'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Business Loan');

INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type
)
SELECT 
    'MICR', 'Microfinance Loan', 'Small loan for microentrepreneurs',
    100.00, 500.00, 2000.00,
    3, 6, 12,
    2, 'weeks',
    1.00, 2.00, 4.00,
    'weeks', 24.00,
    'flat', 'daily',
    'equal_installments'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Microfinance Loan');

-- Create useful views for GraphQL if they don't exist

-- Create a simple client view for the GraphQL operations
DROP VIEW IF EXISTS clients;
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
    date_of_birth,
    gender,
    submitted_date
FROM client;

-- Create loan product view for GraphQL operations
DROP VIEW IF EXISTS loan_products;
CREATE OR REPLACE VIEW loan_products AS
SELECT 
    id,
    name as loan_name,
    description,
    short_name,
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
DROP VIEW IF EXISTS loan_applications;
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
FROM loan
WHERE l.loan_status IN ('submitted_and_pending_approval', 'approved', 'active');

-- Create a running loans view for GraphQL
DROP VIEW IF EXISTS running_loans;
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
    l.loan_officer_id
FROM loan l
WHERE l.loan_status = 'active';