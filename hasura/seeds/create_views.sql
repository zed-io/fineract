-- Create useful views for GraphQL operations
SET search_path TO fineract_default;

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
    loan.id,
    loan.client_id as applicant_id,
    loan.loan_product_id as loan_type_id,
    loan.principal_amount as principal,
    loan.submitted_on_date as application_date,
    COALESCE(loan.disbursed_on_date, loan.expected_disbursement_date) as start_date,
    loan.number_of_repayments as tenor,
    loan.loan_status as status,
    'web' as device, -- Assuming all applications are from web in this seed
    loan.approved_on_date as approved_at,
    loan.approved_by_user_id as approved_by_id
FROM loan
WHERE loan.loan_status IN ('submitted_and_pending_approval', 'approved', 'active');

-- Create a running loans view for GraphQL
DROP VIEW IF EXISTS running_loans;
CREATE OR REPLACE VIEW running_loans AS
SELECT 
    loan.id,
    loan.client_id,
    loan.loan_product_id,
    loan.loan_status,
    loan.principal_amount,
    loan.principal_outstanding_derived as outstanding_amount,
    loan.disbursed_on_date,
    loan.expected_maturity_date,
    loan.number_of_repayments,
    loan.loan_officer_id
FROM loan
WHERE loan.loan_status = 'active';