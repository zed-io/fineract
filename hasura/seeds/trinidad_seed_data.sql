-- Trinidad and Tobago specific seed data for Fineract Hasura implementation
-- This script populates the database with realistic mock data for Trinidad and Tobago

-- Set search path to the appropriate schema
SET search_path TO fineract_default;

-- ================================================
-- Office Locations in Trinidad and Tobago
-- ================================================

-- First, update the existing Head Office
UPDATE office SET name = 'Port of Spain Headquarters', opening_date = '2020-01-01' WHERE name = 'Head Office';

-- Create branch offices across Trinidad and Tobago
INSERT INTO office (name, hierarchy, opening_date, parent_id)
SELECT 'San Fernando Branch', CONCAT((SELECT hierarchy FROM office WHERE name = 'Port of Spain Headquarters'), '.', fineract_default.uuid_generate_v4()), '2020-03-15', (SELECT id FROM office WHERE name = 'Port of Spain Headquarters')
WHERE NOT EXISTS (SELECT 1 FROM office WHERE name = 'San Fernando Branch');

INSERT INTO office (name, hierarchy, opening_date, parent_id)
SELECT 'Arima Branch', CONCAT((SELECT hierarchy FROM office WHERE name = 'Port of Spain Headquarters'), '.', fineract_default.uuid_generate_v4()), '2020-06-20', (SELECT id FROM office WHERE name = 'Port of Spain Headquarters')
WHERE NOT EXISTS (SELECT 1 FROM office WHERE name = 'Arima Branch');

INSERT INTO office (name, hierarchy, opening_date, parent_id)
SELECT 'Chaguanas Branch', CONCAT((SELECT hierarchy FROM office WHERE name = 'Port of Spain Headquarters'), '.', fineract_default.uuid_generate_v4()), '2021-02-10', (SELECT id FROM office WHERE name = 'Port of Spain Headquarters')
WHERE NOT EXISTS (SELECT 1 FROM office WHERE name = 'Chaguanas Branch');

INSERT INTO office (name, hierarchy, opening_date, parent_id)
SELECT 'Scarborough Branch', CONCAT((SELECT hierarchy FROM office WHERE name = 'Port of Spain Headquarters'), '.', fineract_default.uuid_generate_v4()), '2021-08-05', (SELECT id FROM office WHERE name = 'Port of Spain Headquarters')
WHERE NOT EXISTS (SELECT 1 FROM office WHERE name = 'Scarborough Branch');

INSERT INTO office (name, hierarchy, opening_date, parent_id)
SELECT 'Point Fortin Branch', CONCAT((SELECT hierarchy FROM office WHERE name = 'Port of Spain Headquarters'), '.', fineract_default.uuid_generate_v4()), '2022-01-15', (SELECT id FROM office WHERE name = 'Port of Spain Headquarters')
WHERE NOT EXISTS (SELECT 1 FROM office WHERE name = 'Point Fortin Branch');

-- ================================================
-- Staff members with Trinidad and Tobago names
-- ================================================

-- Add staff for Port of Spain Headquarters
INSERT INTO staff (office_id, first_name, last_name, display_name, is_loan_officer, mobile_no, is_active, joining_date)
SELECT 
    (SELECT id FROM office WHERE name = 'Port of Spain Headquarters'),
    'Avinash', 'Maharaj', 'Avinash Maharaj',
    TRUE, '+18687561234', TRUE, '2020-01-15'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj');

INSERT INTO staff (office_id, first_name, last_name, display_name, is_loan_officer, mobile_no, is_active, joining_date)
SELECT 
    (SELECT id FROM office WHERE name = 'Port of Spain Headquarters'),
    'Sarah', 'Mohammed', 'Sarah Mohammed',
    TRUE, '+18687562345', TRUE, '2020-02-01'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'Sarah' AND last_name = 'Mohammed');

-- Add staff for San Fernando Branch
INSERT INTO staff (office_id, first_name, last_name, display_name, is_loan_officer, mobile_no, is_active, joining_date)
SELECT 
    (SELECT id FROM office WHERE name = 'San Fernando Branch'),
    'Kamla', 'Singh', 'Kamla Singh',
    TRUE, '+18687563456', TRUE, '2020-03-20'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'Kamla' AND last_name = 'Singh');

-- Add staff for Arima Branch
INSERT INTO staff (office_id, first_name, last_name, display_name, is_loan_officer, mobile_no, is_active, joining_date)
SELECT 
    (SELECT id FROM office WHERE name = 'Arima Branch'),
    'Marcus', 'Alexander', 'Marcus Alexander',
    TRUE, '+18687564567', TRUE, '2020-06-25'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'Marcus' AND last_name = 'Alexander');

-- Add staff for Chaguanas Branch
INSERT INTO staff (office_id, first_name, last_name, display_name, is_loan_officer, mobile_no, is_active, joining_date)
SELECT 
    (SELECT id FROM office WHERE name = 'Chaguanas Branch'),
    'Lakshmi', 'Ramkissoon', 'Lakshmi Ramkissoon',
    TRUE, '+18687565678', TRUE, '2021-02-15'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'Lakshmi' AND last_name = 'Ramkissoon');

-- Add staff for Scarborough Branch
INSERT INTO staff (office_id, first_name, last_name, display_name, is_loan_officer, mobile_no, is_active, joining_date)
SELECT 
    (SELECT id FROM office WHERE name = 'Scarborough Branch'),
    'Devon', 'Charles', 'Devon Charles',
    TRUE, '+18687566789', TRUE, '2021-08-10'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'Devon' AND last_name = 'Charles');

-- Add staff for Point Fortin Branch
INSERT INTO staff (office_id, first_name, last_name, display_name, is_loan_officer, mobile_no, is_active, joining_date)
SELECT 
    (SELECT id FROM office WHERE name = 'Point Fortin Branch'),
    'Sherry', 'Persad', 'Sherry Persad',
    TRUE, '+18687567890', TRUE, '2022-01-20'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE first_name = 'Sherry' AND last_name = 'Persad');

-- ================================================
-- Loan Products specific to Trinidad and Tobago
-- ================================================

-- Ensure currency is set correctly for Trinidad and Tobago
INSERT INTO currency (code, name, decimal_places, display_symbol)
SELECT 'TTD', 'Trinidad and Tobago Dollar', 2, 'TT$'
WHERE NOT EXISTS (SELECT 1 FROM currency WHERE code = 'TTD');

-- Home Improvement Loan
INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type, repayment_strategy
)
SELECT
    'HOME', 'Home Improvement Loan', 'Loan for home repairs and renovations in Trinidad and Tobago',
    5000.00, 25000.00, 100000.00,
    12, 24, 60,
    1, 'months',
    6.75, 7.50, 9.00,
    'months', 7.50,
    'declining_balance', 'daily',
    'equal_installments', 'mifos-standard-strategy'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Home Improvement Loan');

-- Small Business Loan
INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type, repayment_strategy
)
SELECT
    'BUSI', 'Small Business Loan', 'Loan for small business owners in Trinidad and Tobago',
    10000.00, 50000.00, 200000.00,
    12, 36, 60,
    1, 'months',
    8.00, 9.50, 11.00,
    'months', 9.50,
    'declining_balance', 'daily',
    'equal_installments', 'mifos-standard-strategy'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Small Business Loan');

-- Education Loan
INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type, repayment_strategy
)
SELECT
    'EDU', 'Education Loan', 'Loan for education and skill development in Trinidad and Tobago',
    3000.00, 15000.00, 50000.00,
    12, 24, 48,
    1, 'months',
    5.00, 6.00, 7.00,
    'months', 6.00,
    'declining_balance', 'daily',
    'equal_installments', 'mifos-standard-strategy'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Education Loan');

-- Agricultural Loan
INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type, repayment_strategy
)
SELECT
    'AGRI', 'Agricultural Loan', 'Loan for farmers and agricultural businesses in Trinidad and Tobago',
    5000.00, 20000.00, 75000.00,
    6, 12, 24,
    1, 'months',
    5.50, 6.50, 8.00,
    'months', 6.50,
    'declining_balance', 'daily',
    'equal_installments', 'mifos-standard-strategy'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Agricultural Loan');

-- Carnival Loan (special seasonal loan for Trinidad's famous Carnival)
INSERT INTO loan_product (
    short_name, name, description,
    min_principal_amount, default_principal_amount, max_principal_amount,
    min_number_of_repayments, default_number_of_repayments, max_number_of_repayments,
    repayment_every, repayment_frequency_type,
    min_nominal_interest_rate_per_period, nominal_interest_rate_per_period, max_nominal_interest_rate_per_period,
    interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type,
    amortization_method_type, repayment_strategy
)
SELECT
    'CARN', 'Carnival Loan', 'Short-term loan for Carnival expenses, costumes and festivities',
    2000.00, 7500.00, 15000.00,
    3, 6, 12,
    1, 'months',
    7.00, 8.50, 9.50,
    'months', 8.50,
    'declining_balance', 'daily',
    'equal_installments', 'mifos-standard-strategy'
WHERE NOT EXISTS (SELECT 1 FROM loan_product WHERE name = 'Carnival Loan');

-- ================================================
-- Create sample clients with Trinidad and Tobago details
-- ================================================

-- Port of Spain clients
INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0001',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Port of Spain Headquarters'),
    'person', 'Rajiv', 'Persad', 'Rajiv Persad',
    '+18683334001', 'rajiv.p@ttmail.com', '1985-06-15', 'male',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad');

INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0002',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Port of Spain Headquarters'),
    'person', 'Michelle', 'Garcia', 'Michelle Garcia',
    '+18683334002', 'michelle.g@ttmail.com', '1990-03-22', 'female',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Michelle' AND lastname = 'Garcia');

-- San Fernando clients
INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0003',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'San Fernando Branch'),
    'person', 'Vishnu', 'Ramlal', 'Vishnu Ramlal',
    '+18683334003', 'vishnu.r@ttmail.com', '1978-09-10', 'male',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Vishnu' AND lastname = 'Ramlal');

INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, company_name, display_name,
    mobile_no, email_address,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0004',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'San Fernando Branch'),
    'entity', 'Trini Fresh Produce Ltd', 'Trini Fresh Produce Ltd',
    '+18683334004', 'info@trinifresh.tt',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE company_name = 'Trini Fresh Produce Ltd');

-- Arima clients
INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0005',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Arima Branch'),
    'person', 'Cheryl', 'Williams', 'Cheryl Williams',
    '+18683334005', 'cheryl.w@ttmail.com', '1982-11-05', 'female',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams');

-- Chaguanas clients
INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0006',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Chaguanas Branch'),
    'person', 'Deonath', 'Maharaj', 'Deonath Maharaj',
    '+18683334006', 'deonath.m@ttmail.com', '1975-04-18', 'male',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Deonath' AND lastname = 'Maharaj');

INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, company_name, display_name,
    mobile_no, email_address,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0007',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Chaguanas Branch'),
    'entity', 'Caribtech Solutions', 'Caribtech Solutions',
    '+18683334007', 'contact@caribtech.tt',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE company_name = 'Caribtech Solutions');

-- Scarborough clients (Tobago)
INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0008',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Scarborough Branch'),
    'person', 'Claudette', 'Phillips', 'Claudette Phillips',
    '+18683334008', 'claudette.p@ttmail.com', '1988-07-23', 'female',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips');

INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, company_name, display_name,
    mobile_no, email_address,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0009',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Scarborough Branch'),
    'entity', 'Tobago Tourism Experience Ltd', 'Tobago Tourism Experience Ltd',
    '+18683334009', 'info@tobagotourism.tt',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE company_name = 'Tobago Tourism Experience Ltd');

-- Point Fortin clients
INSERT INTO client (
    account_no, status, activation_date, office_id, 
    client_type, firstname, lastname, display_name,
    mobile_no, email_address, date_of_birth, gender,
    submitted_date
)
SELECT 
    'CL' || to_char(now(), 'YYYYMMDD') || '0010',
    'active', CURRENT_DATE, (SELECT id FROM office WHERE name = 'Point Fortin Branch'),
    'person', 'Andre', 'Thomas', 'Andre Thomas',
    '+18683334010', 'andre.t@ttmail.com', '1980-12-12', 'male',
    CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM client WHERE firstname = 'Andre' AND lastname = 'Thomas');

-- ================================================
-- Create sample loans with Trinidad and Tobago details
-- ================================================

-- Create loans for clients (sample of 5 loans)

-- Home Improvement Loan for Rajiv Persad
INSERT INTO loan (
    account_no, client_id, loan_product_id, loan_officer_id,
    loan_status, loan_type, principal_amount, 
    term_frequency, term_frequency_type,
    repay_every, repayment_frequency_type, number_of_repayments,
    nominal_interest_rate_per_period, interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type, amortization_method_type, repayment_strategy,
    submitted_on_date, approved_on_date, disbursed_on_date, expected_maturity_date,
    principal_outstanding_derived
)
SELECT 
    'LN' || to_char(now(), 'YYYYMMDD') || '0001',
    (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad'),
    (SELECT id FROM loan_product WHERE name = 'Home Improvement Loan'),
    (SELECT id FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj'),
    'active', 'individual', 75000.00,
    24, 'months',
    1, 'months', 24,
    7.50, 'months', 7.50,
    'declining_balance', 'daily', 'equal_installments', 'mifos-standard-strategy',
    CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '21 months',
    70000.00
WHERE NOT EXISTS (SELECT 1 FROM loan 
                 WHERE client_id = (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad')
                 AND loan_product_id = (SELECT id FROM loan_product WHERE name = 'Home Improvement Loan'));

-- Small Business Loan for Trini Fresh Produce Ltd
INSERT INTO loan (
    account_no, client_id, loan_product_id, loan_officer_id,
    loan_status, loan_type, principal_amount, 
    term_frequency, term_frequency_type,
    repay_every, repayment_frequency_type, number_of_repayments,
    nominal_interest_rate_per_period, interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type, amortization_method_type, repayment_strategy,
    submitted_on_date, approved_on_date, disbursed_on_date, expected_maturity_date,
    principal_outstanding_derived
)
SELECT 
    'LN' || to_char(now(), 'YYYYMMDD') || '0002',
    (SELECT id FROM client WHERE company_name = 'Trini Fresh Produce Ltd'),
    (SELECT id FROM loan_product WHERE name = 'Small Business Loan'),
    (SELECT id FROM staff WHERE first_name = 'Kamla' AND last_name = 'Singh'),
    'active', 'individual', 150000.00,
    36, 'months',
    1, 'months', 36,
    9.50, 'months', 9.50,
    'declining_balance', 'daily', 'equal_installments', 'mifos-standard-strategy',
    CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '32 months',
    135000.00
WHERE NOT EXISTS (SELECT 1 FROM loan 
                 WHERE client_id = (SELECT id FROM client WHERE company_name = 'Trini Fresh Produce Ltd')
                 AND loan_product_id = (SELECT id FROM loan_product WHERE name = 'Small Business Loan'));

-- Education Loan for Cheryl Williams
INSERT INTO loan (
    account_no, client_id, loan_product_id, loan_officer_id,
    loan_status, loan_type, principal_amount, 
    term_frequency, term_frequency_type,
    repay_every, repayment_frequency_type, number_of_repayments,
    nominal_interest_rate_per_period, interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type, amortization_method_type, repayment_strategy,
    submitted_on_date, approved_on_date, disbursed_on_date, expected_maturity_date,
    principal_outstanding_derived
)
SELECT 
    'LN' || to_char(now(), 'YYYYMMDD') || '0003',
    (SELECT id FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams'),
    (SELECT id FROM loan_product WHERE name = 'Education Loan'),
    (SELECT id FROM staff WHERE first_name = 'Marcus' AND last_name = 'Alexander'),
    'active', 'individual', 25000.00,
    24, 'months',
    1, 'months', 24,
    6.00, 'months', 6.00,
    'declining_balance', 'daily', 'equal_installments', 'mifos-standard-strategy',
    CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '23 months',
    24375.00
WHERE NOT EXISTS (SELECT 1 FROM loan 
                 WHERE client_id = (SELECT id FROM client WHERE firstname = 'Cheryl' AND lastname = 'Williams')
                 AND loan_product_id = (SELECT id FROM loan_product WHERE name = 'Education Loan'));

-- Agricultural Loan for Deonath Maharaj
INSERT INTO loan (
    account_no, client_id, loan_product_id, loan_officer_id,
    loan_status, loan_type, principal_amount, 
    term_frequency, term_frequency_type,
    repay_every, repayment_frequency_type, number_of_repayments,
    nominal_interest_rate_per_period, interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type, amortization_method_type, repayment_strategy,
    submitted_on_date, approved_on_date, disbursed_on_date, expected_maturity_date,
    principal_outstanding_derived
)
SELECT 
    'LN' || to_char(now(), 'YYYYMMDD') || '0004',
    (SELECT id FROM client WHERE firstname = 'Deonath' AND lastname = 'Maharaj'),
    (SELECT id FROM loan_product WHERE name = 'Agricultural Loan'),
    (SELECT id FROM staff WHERE first_name = 'Lakshmi' AND last_name = 'Ramkissoon'),
    'active', 'individual', 50000.00,
    18, 'months',
    1, 'months', 18,
    6.50, 'months', 6.50,
    'declining_balance', 'daily', 'equal_installments', 'mifos-standard-strategy',
    CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '16 months',
    47000.00
WHERE NOT EXISTS (SELECT 1 FROM loan 
                 WHERE client_id = (SELECT id FROM client WHERE firstname = 'Deonath' AND lastname = 'Maharaj')
                 AND loan_product_id = (SELECT id FROM loan_product WHERE name = 'Agricultural Loan'));

-- Carnival Loan for Claudette Phillips
INSERT INTO loan (
    account_no, client_id, loan_product_id, loan_officer_id,
    loan_status, loan_type, principal_amount, 
    term_frequency, term_frequency_type,
    repay_every, repayment_frequency_type, number_of_repayments,
    nominal_interest_rate_per_period, interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type, amortization_method_type, repayment_strategy,
    submitted_on_date, approved_on_date, disbursed_on_date, expected_maturity_date,
    principal_outstanding_derived
)
SELECT 
    'LN' || to_char(now(), 'YYYYMMDD') || '0005',
    (SELECT id FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips'),
    (SELECT id FROM loan_product WHERE name = 'Carnival Loan'),
    (SELECT id FROM staff WHERE first_name = 'Devon' AND last_name = 'Charles'),
    'active', 'individual', 10000.00,
    6, 'months',
    1, 'months', 6,
    8.50, 'months', 8.50,
    'declining_balance', 'daily', 'equal_installments', 'mifos-standard-strategy',
    CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '5 months',
    8500.00
WHERE NOT EXISTS (SELECT 1 FROM loan 
                 WHERE client_id = (SELECT id FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips')
                 AND loan_product_id = (SELECT id FROM loan_product WHERE name = 'Carnival Loan'));

-- ================================================
-- Create client groups for community-based lending
-- ================================================

-- Create a farmers group in Chaguanas
INSERT INTO client_group (
    name, external_id, office_id, staff_id, status, activation_date, submitted_date
)
SELECT 
    'Chaguanas Agricultural Cooperative', 'GROUP-CHAG-001', 
    (SELECT id FROM office WHERE name = 'Chaguanas Branch'),
    (SELECT id FROM staff WHERE first_name = 'Lakshmi' AND last_name = 'Ramkissoon'),
    'active', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '7 months'
WHERE NOT EXISTS (SELECT 1 FROM client_group WHERE name = 'Chaguanas Agricultural Cooperative');

-- Create a small business group in Port of Spain
INSERT INTO client_group (
    name, external_id, office_id, staff_id, status, activation_date, submitted_date
)
SELECT 
    'Port of Spain Business Network', 'GROUP-POS-001', 
    (SELECT id FROM office WHERE name = 'Port of Spain Headquarters'),
    (SELECT id FROM staff WHERE first_name = 'Avinash' AND last_name = 'Maharaj'),
    'active', CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE - INTERVAL '9 months'
WHERE NOT EXISTS (SELECT 1 FROM client_group WHERE name = 'Port of Spain Business Network');

-- Create a tourism group in Scarborough (Tobago)
INSERT INTO client_group (
    name, external_id, office_id, staff_id, status, activation_date, submitted_date
)
SELECT 
    'Tobago Tourism Circle', 'GROUP-TOB-001', 
    (SELECT id FROM office WHERE name = 'Scarborough Branch'),
    (SELECT id FROM staff WHERE first_name = 'Devon' AND last_name = 'Charles'),
    'active', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE - INTERVAL '5 months'
WHERE NOT EXISTS (SELECT 1 FROM client_group WHERE name = 'Tobago Tourism Circle');

-- ================================================
-- Add clients to groups
-- ================================================

-- Add Deonath to Agricultural Cooperative
INSERT INTO client_group_member (
    group_id, client_id
)
SELECT 
    (SELECT id FROM client_group WHERE name = 'Chaguanas Agricultural Cooperative'),
    (SELECT id FROM client WHERE firstname = 'Deonath' AND lastname = 'Maharaj')
WHERE NOT EXISTS (
    SELECT 1 FROM client_group_member 
    WHERE group_id = (SELECT id FROM client_group WHERE name = 'Chaguanas Agricultural Cooperative')
    AND client_id = (SELECT id FROM client WHERE firstname = 'Deonath' AND lastname = 'Maharaj')
);

-- Add business clients to Port of Spain Business Network
INSERT INTO client_group_member (
    group_id, client_id
)
SELECT 
    (SELECT id FROM client_group WHERE name = 'Port of Spain Business Network'),
    (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad')
WHERE NOT EXISTS (
    SELECT 1 FROM client_group_member 
    WHERE group_id = (SELECT id FROM client_group WHERE name = 'Port of Spain Business Network')
    AND client_id = (SELECT id FROM client WHERE firstname = 'Rajiv' AND lastname = 'Persad')
);

INSERT INTO client_group_member (
    group_id, client_id
)
SELECT 
    (SELECT id FROM client_group WHERE name = 'Port of Spain Business Network'),
    (SELECT id FROM client WHERE firstname = 'Michelle' AND lastname = 'Garcia')
WHERE NOT EXISTS (
    SELECT 1 FROM client_group_member 
    WHERE group_id = (SELECT id FROM client_group WHERE name = 'Port of Spain Business Network')
    AND client_id = (SELECT id FROM client WHERE firstname = 'Michelle' AND lastname = 'Garcia')
);

-- Add tourism business to Tobago Tourism Circle
INSERT INTO client_group_member (
    group_id, client_id
)
SELECT 
    (SELECT id FROM client_group WHERE name = 'Tobago Tourism Circle'),
    (SELECT id FROM client WHERE company_name = 'Tobago Tourism Experience Ltd')
WHERE NOT EXISTS (
    SELECT 1 FROM client_group_member 
    WHERE group_id = (SELECT id FROM client_group WHERE name = 'Tobago Tourism Circle')
    AND client_id = (SELECT id FROM client WHERE company_name = 'Tobago Tourism Experience Ltd')
);

INSERT INTO client_group_member (
    group_id, client_id
)
SELECT 
    (SELECT id FROM client_group WHERE name = 'Tobago Tourism Circle'),
    (SELECT id FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips')
WHERE NOT EXISTS (
    SELECT 1 FROM client_group_member 
    WHERE group_id = (SELECT id FROM client_group WHERE name = 'Tobago Tourism Circle')
    AND client_id = (SELECT id FROM client WHERE firstname = 'Claudette' AND lastname = 'Phillips')
);

-- ================================================
-- Update configuration settings for Trinidad and Tobago
-- ================================================

-- Set default currency to TTD
UPDATE configuration SET value = 'TTD' WHERE name = 'default-currency';

-- Add Trinidad and Tobago holidays
INSERT INTO holiday (
    name, from_date, to_date, description, is_active
)
SELECT 
    'Carnival Monday and Tuesday', '2025-02-03', '2025-02-04', 
    'Annual Trinidad and Tobago Carnival celebration', TRUE
WHERE NOT EXISTS (SELECT 1 FROM holiday WHERE name = 'Carnival Monday and Tuesday');

INSERT INTO holiday (
    name, from_date, to_date, description, is_active
)
SELECT 
    'Emancipation Day', '2025-08-01', '2025-08-01',
    'Commemorates the emancipation of enslaved Africans', TRUE
WHERE NOT EXISTS (SELECT 1 FROM holiday WHERE name = 'Emancipation Day');

INSERT INTO holiday (
    name, from_date, to_date, description, is_active
)
SELECT 
    'Indian Arrival Day', '2025-05-30', '2025-05-30',
    'Commemorates the arrival of the first Indian indentured laborers', TRUE
WHERE NOT EXISTS (SELECT 1 FROM holiday WHERE name = 'Indian Arrival Day');

INSERT INTO holiday (
    name, from_date, to_date, description, is_active
)
SELECT 
    'Independence Day', '2025-08-31', '2025-08-31',
    'Trinidad and Tobago Independence Day', TRUE
WHERE NOT EXISTS (SELECT 1 FROM holiday WHERE name = 'Independence Day');

INSERT INTO holiday (
    name, from_date, to_date, description, is_active
)
SELECT 
    'Republic Day', '2025-09-24', '2025-09-24',
    'Republic Day of Trinidad and Tobago', TRUE
WHERE NOT EXISTS (SELECT 1 FROM holiday WHERE name = 'Republic Day');

INSERT INTO holiday (
    name, from_date, to_date, description, is_active
)
SELECT 
    'Divali', '2025-11-12', '2025-11-12',
    'Hindu festival of lights', TRUE
WHERE NOT EXISTS (SELECT 1 FROM holiday WHERE name = 'Divali');

INSERT INTO holiday (
    name, from_date, to_date, description, is_active
)
SELECT 
    'Eid-ul-Fitr', '2025-04-20', '2025-04-20',
    'Islamic holiday marking the end of Ramadan', TRUE
WHERE NOT EXISTS (SELECT 1 FROM holiday WHERE name = 'Eid-ul-Fitr');

-- Link holidays to all offices
DO $$
DECLARE
    holiday_rec RECORD;
    office_rec RECORD;
BEGIN
    FOR holiday_rec IN SELECT id FROM holiday LOOP
        FOR office_rec IN SELECT id FROM office LOOP
            INSERT INTO holiday_office (holiday_id, office_id)
            SELECT holiday_rec.id, office_rec.id
            WHERE NOT EXISTS (
                SELECT 1 FROM holiday_office 
                WHERE holiday_id = holiday_rec.id AND office_id = office_rec.id
            );
        END LOOP;
    END LOOP;
END
$$;