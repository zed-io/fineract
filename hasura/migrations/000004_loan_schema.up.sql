-- Migration file for Fineract loan management
-- Creates the schema for loan products and loan accounts

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create additional enum types for loans
CREATE TYPE interest_method_type AS ENUM ('declining_balance', 'flat', 'compound');
CREATE TYPE interest_calculation_period_type AS ENUM ('daily', 'monthly');
CREATE TYPE amortization_method_type AS ENUM ('equal_installments', 'equal_principal');
CREATE TYPE repayment_frequency_type AS ENUM ('days', 'weeks', 'months');
CREATE TYPE loan_transaction_type AS ENUM (
    'disbursement', 'repayment', 'waive_interest', 'waive_charges', 'accrual', 
    'writeoff', 'recovery_repayment', 'fee_charge', 'penalty_charge', 'refund', 
    'charge_payment', 'refund_for_active_loan', 'income_posting'
);
CREATE TYPE loan_status_type AS ENUM (
    'submitted_and_pending_approval', 'approved', 'active', 'withdrawn_by_client', 
    'rejected', 'closed_obligations_met', 'closed_written_off', 'closed_reschedule', 
    'overpaid'
);
CREATE TYPE charge_calculation_type AS ENUM ('flat', 'percent_of_amount', 'percent_of_disbursement_amount', 'percent_of_interest');
CREATE TYPE charge_time_type AS ENUM ('disbursement', 'specified_due_date', 'installment_fee', 'overdue_installment');

-- Charges
CREATE TABLE charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL REFERENCES currency(code),
    charge_calculation_type charge_calculation_type NOT NULL,
    charge_payment_mode VARCHAR(50) NOT NULL DEFAULT 'regular',
    amount DECIMAL(19, 6) NOT NULL,
    fee_on_day INTEGER,
    fee_on_month INTEGER,
    fee_interval INTEGER,
    penalty BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_loan_charge BOOLEAN NOT NULL DEFAULT TRUE,
    is_savings_charge BOOLEAN NOT NULL DEFAULT FALSE,
    is_client_charge BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan products
CREATE TABLE loan_product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_name VARCHAR(4) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    fund_id UUID REFERENCES fund(id),
    is_linked_to_floating_interest_rate BOOLEAN NOT NULL DEFAULT FALSE,
    floating_rates_id UUID,
    
    -- Interest rate details
    min_nominal_interest_rate_per_period DECIMAL(19, 6) DEFAULT 0,
    max_nominal_interest_rate_per_period DECIMAL(19, 6),
    nominal_interest_rate_per_period DECIMAL(19, 6) NOT NULL,
    interest_period_frequency_type repayment_frequency_type NOT NULL,
    annual_nominal_interest_rate DECIMAL(19, 6) NOT NULL,
    interest_method_type interest_method_type NOT NULL,
    interest_calculation_period_type interest_calculation_period_type NOT NULL,
    allow_partial_period_interest_calcualtion BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Repayment strategy
    repayment_strategy VARCHAR(100) NOT NULL DEFAULT 'mifos-standard-strategy',
    
    -- Amortization
    amortization_method_type amortization_method_type NOT NULL,
    
    -- Loan term and amounts
    min_principal_amount DECIMAL(19, 6),
    default_principal_amount DECIMAL(19, 6) NOT NULL,
    max_principal_amount DECIMAL(19, 6),
    min_number_of_repayments INTEGER,
    default_number_of_repayments INTEGER NOT NULL,
    max_number_of_repayments INTEGER,
    repayment_every INTEGER NOT NULL,
    repayment_frequency_type repayment_frequency_type NOT NULL,
    min_interest_rate_differential DECIMAL(19, 6) DEFAULT 0,
    default_interest_rate_differential DECIMAL(19, 6) DEFAULT 0,
    max_interest_rate_differential DECIMAL(19, 6) DEFAULT 0,
    
    -- Grace periods
    grace_on_principal_payment INTEGER NOT NULL DEFAULT 0,
    grace_on_interest_payment INTEGER NOT NULL DEFAULT 0,
    grace_interest_free_period INTEGER NOT NULL DEFAULT 0,
    
    -- Accounting
    accounting_type VARCHAR(50) NOT NULL DEFAULT 'none',
    include_in_borrower_cycle BOOLEAN NOT NULL DEFAULT FALSE,
    use_borrower_cycle BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE,
    close_date DATE,
    allow_multiple_disbursements BOOLEAN NOT NULL DEFAULT FALSE,
    max_disbursements INTEGER,
    max_outstanding_loan_balance DECIMAL(19, 6),
    
    -- Loan configurations
    days_in_month_enum INTEGER DEFAULT 30,
    days_in_year_enum INTEGER DEFAULT 365,
    interest_recalculation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    hold_guarantee_funds BOOLEAN NOT NULL DEFAULT FALSE,
    principal_threshhold_for_last_installment DECIMAL(5, 2) DEFAULT 0,
    account_moves_out_of_npa_only_on_arrears_completion BOOLEAN NOT NULL DEFAULT FALSE,
    can_define_installment_amount BOOLEAN NOT NULL DEFAULT FALSE,
    fixed_installment_amount DECIMAL(19, 6),
    sync_expected_with_disbursement_date BOOLEAN NOT NULL DEFAULT FALSE,
    is_equal_amortization BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Down payment configurations
    enable_down_payment BOOLEAN NOT NULL DEFAULT FALSE,
    disbursed_amount_percentage_for_down_payment DECIMAL(19, 6) DEFAULT 0,
    enable_auto_repayment_for_down_payment BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Installment-level details
    installment_amount_in_multiples_of DECIMAL(19, 6),
    
    -- Charge related settings
    overdue_days_for_npa INTEGER DEFAULT 0,
    
    -- Status flags
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit fields
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan product charges
CREATE TABLE loan_product_charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_product_id UUID NOT NULL REFERENCES loan_product(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charge(id),
    charge_time_type charge_time_type NOT NULL,
    charge_calculation_type charge_calculation_type NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(loan_product_id, charge_id, charge_time_type)
);

-- Loan
CREATE TABLE loan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_no VARCHAR(100) NOT NULL UNIQUE,
    external_id VARCHAR(100) UNIQUE,
    client_id UUID REFERENCES client(id),
    group_id UUID REFERENCES client_group(id),
    loan_product_id UUID NOT NULL REFERENCES loan_product(id),
    fund_id UUID REFERENCES fund(id),
    loan_officer_id UUID REFERENCES staff(id),
    loan_status loan_status_type NOT NULL DEFAULT 'submitted_and_pending_approval',
    loan_status_change_date TIMESTAMP,
    loan_type VARCHAR(50) NOT NULL DEFAULT 'individual',  -- 'individual', 'group', 'jlg'
    currency_code VARCHAR(3) NOT NULL,
    currency_digits INTEGER NOT NULL DEFAULT 2,
    principal_amount DECIMAL(19, 6) NOT NULL,
    approved_principal DECIMAL(19, 6),
    arrearstolerance_amount DECIMAL(19, 6),
    nominal_interest_rate_per_period DECIMAL(19, 6) NOT NULL,
    interest_period_frequency_type repayment_frequency_type NOT NULL,
    annual_nominal_interest_rate DECIMAL(19, 6) NOT NULL,
    interest_method_type interest_method_type NOT NULL,
    interest_calculation_period_type interest_calculation_period_type NOT NULL,
    allow_partial_period_interest_calcualtion BOOLEAN NOT NULL DEFAULT FALSE,
    repayment_strategy VARCHAR(100) NOT NULL DEFAULT 'mifos-standard-strategy',
    amortization_method_type amortization_method_type NOT NULL,
    
    -- Loan term details 
    term_frequency INTEGER NOT NULL,
    term_frequency_type repayment_frequency_type NOT NULL,
    repay_every INTEGER NOT NULL,
    repayment_frequency_type repayment_frequency_type NOT NULL,
    number_of_repayments INTEGER NOT NULL,
    
    -- Grace periods
    grace_on_principal_payment INTEGER NOT NULL DEFAULT 0,
    grace_on_interest_payment INTEGER NOT NULL DEFAULT 0,
    grace_interest_free_period INTEGER NOT NULL DEFAULT 0,
    
    -- Important dates
    submitted_on_date DATE NOT NULL,
    submitted_by_user_id UUID REFERENCES app_user(id),
    approved_on_date DATE,
    approved_by_user_id UUID REFERENCES app_user(id),
    expected_disbursement_date DATE,
    disbursed_on_date DATE,
    disbursed_by_user_id UUID REFERENCES app_user(id),
    expected_maturity_date DATE,
    matures_on_date DATE,
    closed_on_date DATE,
    closed_by_user_id UUID REFERENCES app_user(id),
    written_off_on_date DATE,
    written_off_by_user_id UUID REFERENCES app_user(id),
    rejected_on_date DATE,
    rejected_by_user_id UUID REFERENCES app_user(id),
    withdrawn_on_date DATE,
    withdrawn_by_user_id UUID REFERENCES app_user(id),
    
    -- Loan balances
    total_charges_due_at_disbursement_derived DECIMAL(19, 6) DEFAULT 0,
    principal_disbursed_derived DECIMAL(19, 6) DEFAULT 0,
    principal_repaid_derived DECIMAL(19, 6) DEFAULT 0,
    principal_writtenoff_derived DECIMAL(19, 6) DEFAULT 0,
    principal_outstanding_derived DECIMAL(19, 6) DEFAULT 0,
    interest_charged_derived DECIMAL(19, 6) DEFAULT 0,
    interest_repaid_derived DECIMAL(19, 6) DEFAULT 0,
    interest_waived_derived DECIMAL(19, 6) DEFAULT 0,
    interest_writtenoff_derived DECIMAL(19, 6) DEFAULT 0,
    interest_outstanding_derived DECIMAL(19, 6) DEFAULT 0,
    fee_charges_charged_derived DECIMAL(19, 6) DEFAULT 0,
    fee_charges_repaid_derived DECIMAL(19, 6) DEFAULT 0,
    fee_charges_waived_derived DECIMAL(19, 6) DEFAULT 0,
    fee_charges_writtenoff_derived DECIMAL(19, 6) DEFAULT 0,
    fee_charges_outstanding_derived DECIMAL(19, 6) DEFAULT 0,
    penalty_charges_charged_derived DECIMAL(19, 6) DEFAULT 0,
    penalty_charges_repaid_derived DECIMAL(19, 6) DEFAULT 0,
    penalty_charges_waived_derived DECIMAL(19, 6) DEFAULT 0,
    penalty_charges_writtenoff_derived DECIMAL(19, 6) DEFAULT 0,
    penalty_charges_outstanding_derived DECIMAL(19, 6) DEFAULT 0,
    total_expected_repayment_derived DECIMAL(19, 6) DEFAULT 0,
    total_repayment_derived DECIMAL(19, 6) DEFAULT 0,
    total_expected_costofloan_derived DECIMAL(19, 6) DEFAULT 0,
    total_costofloan_derived DECIMAL(19, 6) DEFAULT 0,
    total_waived_derived DECIMAL(19, 6) DEFAULT 0,
    total_writtenoff_derived DECIMAL(19, 6) DEFAULT 0,
    total_outstanding_derived DECIMAL(19, 6) DEFAULT 0,
    total_in_arrears_derived DECIMAL(19, 6) DEFAULT 0,
    
    -- Config values
    days_in_month_enum INTEGER DEFAULT 30,
    days_in_year_enum INTEGER DEFAULT 365,
    interest_recalculation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Loan specific configurations
    is_npa BOOLEAN NOT NULL DEFAULT FALSE,
    accrued_till DATE,
    
    -- Delinquency tracking
    loan_sub_status_id UUID,
    days_in_arrears INTEGER,
    
    -- Installment level details
    installment_amount_in_multiples_of DECIMAL(19, 6),
    is_fixed_installment_amount BOOLEAN NOT NULL DEFAULT FALSE,
    fixed_installment_amount DECIMAL(19, 6),
    
    -- Down payment
    is_down_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    disbursed_amount_percentage_for_down_payment DECIMAL(19, 6) DEFAULT 0,
    is_auto_repayment_enabled_for_down_payment BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Multi-disbursement
    allow_multiple_disbursements BOOLEAN NOT NULL DEFAULT FALSE,
    max_disbursements INTEGER,
    max_outstanding_loan_balance DECIMAL(19, 6),
    
    -- Status flags
    sync_disbursement_with_meeting BOOLEAN NOT NULL DEFAULT FALSE,
    loan_counter INTEGER DEFAULT 1,
    loan_product_counter INTEGER DEFAULT 1,
    
    -- Status locks
    is_currently_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by_user_id UUID REFERENCES app_user(id),
    locked_on_date TIMESTAMP,
    
    -- Audit fields
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    
    CONSTRAINT loan_client_or_group_check CHECK (
        (client_id IS NOT NULL AND group_id IS NULL) OR
        (group_id IS NOT NULL AND client_id IS NULL)
    )
);

-- Loan Charges
CREATE TABLE loan_charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charge(id),
    charge_time_type charge_time_type NOT NULL,
    charge_calculation_type charge_calculation_type NOT NULL,
    charge_payment_mode VARCHAR(50) NOT NULL DEFAULT 'regular',
    is_penalty BOOLEAN NOT NULL DEFAULT FALSE,
    due_for_collection_as_of_date DATE,
    charge_amount_or_percentage DECIMAL(19, 6) NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    amount_paid_derived DECIMAL(19, 6) DEFAULT 0,
    amount_waived_derived DECIMAL(19, 6) DEFAULT 0,
    amount_writtenoff_derived DECIMAL(19, 6) DEFAULT 0,
    amount_outstanding_derived DECIMAL(19, 6) NOT NULL DEFAULT 0,
    is_paid_derived BOOLEAN NOT NULL DEFAULT FALSE,
    is_waived BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan Repayment Schedule
CREATE TABLE loan_repayment_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    from_date DATE,
    due_date DATE NOT NULL,
    
    -- Expected amounts
    principal_amount DECIMAL(19, 6),
    interest_amount DECIMAL(19, 6),
    fee_charges_amount DECIMAL(19, 6),
    penalty_charges_amount DECIMAL(19, 6),
    
    -- Completed amounts
    principal_completed_derived DECIMAL(19, 6),
    principal_writtenoff_derived DECIMAL(19, 6),
    interest_completed_derived DECIMAL(19, 6),
    interest_writtenoff_derived DECIMAL(19, 6),
    interest_waived_derived DECIMAL(19, 6),
    fee_charges_completed_derived DECIMAL(19, 6),
    fee_charges_writtenoff_derived DECIMAL(19, 6),
    fee_charges_waived_derived DECIMAL(19, 6),
    penalty_charges_completed_derived DECIMAL(19, 6),
    penalty_charges_writtenoff_derived DECIMAL(19, 6),
    penalty_charges_waived_derived DECIMAL(19, 6),
    
    -- Status
    completed_derived BOOLEAN NOT NULL DEFAULT FALSE,
    obligations_met_on_date DATE,
    
    -- Audit fields
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan Transactions
CREATE TABLE loan_transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    payment_detail_id UUID,
    transaction_type loan_transaction_type NOT NULL,
    transaction_date DATE NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    principal_portion_derived DECIMAL(19, 6),
    interest_portion_derived DECIMAL(19, 6),
    fee_charges_portion_derived DECIMAL(19, 6),
    penalty_charges_portion_derived DECIMAL(19, 6),
    overpayment_portion_derived DECIMAL(19, 6),
    unrecognized_income_portion DECIMAL(19, 6),
    outstanding_loan_balance_derived DECIMAL(19, 6),
    externally_generated BOOLEAN DEFAULT FALSE,
    submitted_on_date DATE NOT NULL,
    submitted_by_user_id UUID REFERENCES app_user(id),
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    reversed_on_date DATE,
    reversed_by_user_id UUID REFERENCES app_user(id),
    manually_adjusted_or_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan Collateral
CREATE TABLE loan_collateral (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    collateral_type_id UUID NOT NULL REFERENCES code_value(id),
    value DECIMAL(19, 6),
    description VARCHAR(500),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan Guarantor
CREATE TABLE loan_guarantor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    client_id UUID REFERENCES client(id),
    guarantor_type VARCHAR(50) NOT NULL, -- 'internal' for existing clients, 'external' for external
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    dob DATE,
    address_line_1 VARCHAR(500),
    address_line_2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip VARCHAR(20),
    house_phone_number VARCHAR(20),
    mobile_number VARCHAR(20),
    comment VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Loan Officer Assignments
CREATE TABLE loan_officer_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    loan_officer_id UUID REFERENCES staff(id),
    start_date DATE NOT NULL,
    end_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER charge_audit BEFORE INSERT OR UPDATE ON charge FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_product_audit BEFORE INSERT OR UPDATE ON loan_product FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_product_charge_audit BEFORE INSERT OR UPDATE ON loan_product_charge FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_audit BEFORE INSERT OR UPDATE ON loan FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_charge_audit BEFORE INSERT OR UPDATE ON loan_charge FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_repayment_schedule_audit BEFORE INSERT OR UPDATE ON loan_repayment_schedule FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_transaction_audit BEFORE INSERT OR UPDATE ON loan_transaction FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_collateral_audit BEFORE INSERT OR UPDATE ON loan_collateral FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_guarantor_audit BEFORE INSERT OR UPDATE ON loan_guarantor FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_officer_assignment_audit BEFORE INSERT OR UPDATE ON loan_officer_assignment FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_loan_client_id ON loan(client_id);
CREATE INDEX idx_loan_group_id ON loan(group_id);
CREATE INDEX idx_loan_product_id ON loan(loan_product_id);
CREATE INDEX idx_loan_status ON loan(loan_status);
CREATE INDEX idx_loan_loan_officer_id ON loan(loan_officer_id);
CREATE INDEX idx_loan_external_id ON loan(external_id);
CREATE INDEX idx_loan_submitted_on_date ON loan(submitted_on_date);
CREATE INDEX idx_loan_disbursed_on_date ON loan(disbursed_on_date);
CREATE INDEX idx_loan_charge_loan_id ON loan_charge(loan_id);
CREATE INDEX idx_loan_transaction_loan_id ON loan_transaction(loan_id);
CREATE INDEX idx_loan_transaction_type ON loan_transaction(transaction_type);
CREATE INDEX idx_loan_transaction_date ON loan_transaction(transaction_date);
CREATE INDEX idx_loan_repayment_schedule_loan_id ON loan_repayment_schedule(loan_id);
CREATE INDEX idx_loan_repayment_schedule_due_date ON loan_repayment_schedule(due_date);

-- Function to generate loan account number
CREATE OR REPLACE FUNCTION generate_loan_account_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a unique account number based on loan ID with a 'LN' prefix and timestamp
    NEW.account_no := 'LN' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || substring(md5(random()::text), 1, 4);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply account generation trigger to loan table
CREATE TRIGGER loan_account_number_trigger
BEFORE INSERT ON loan
FOR EACH ROW
WHEN (NEW.account_no IS NULL)
EXECUTE FUNCTION generate_loan_account_number();

-- Insert default loan permissions
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_LOAN', 'LOAN', 'CREATE', true),
('portfolio', 'READ_LOAN', 'LOAN', 'READ', false),
('portfolio', 'UPDATE_LOAN', 'LOAN', 'UPDATE', true),
('portfolio', 'DELETE_LOAN', 'LOAN', 'DELETE', true),
('portfolio', 'APPROVE_LOAN', 'LOAN', 'APPROVE', true),
('portfolio', 'DISBURSE_LOAN', 'LOAN', 'DISBURSE', true),
('portfolio', 'REJECT_LOAN', 'LOAN', 'REJECT', true),
('portfolio', 'WITHDRAW_LOAN', 'LOAN', 'WITHDRAW', true),
('portfolio', 'WRITE_OFF_LOAN', 'LOAN', 'WRITE_OFF', true),
('portfolio', 'CLOSE_LOAN', 'LOAN', 'CLOSE', true),
('portfolio', 'CREATE_LOAN_CHARGE', 'LOANCHARGE', 'CREATE', true),
('portfolio', 'UPDATE_LOAN_CHARGE', 'LOANCHARGE', 'UPDATE', true),
('portfolio', 'DELETE_LOAN_CHARGE', 'LOANCHARGE', 'DELETE', true),
('portfolio', 'WAIVE_LOAN_CHARGE', 'LOANCHARGE', 'WAIVE', true),
('portfolio', 'LOAN_REPAYMENT', 'LOAN', 'REPAYMENT', true),
('portfolio', 'LOAN_REPAYMENT_ADJUSTMENT', 'LOAN', 'ADJUST', true);

-- Insert loan product related reference data
INSERT INTO code (name, is_system_defined)
VALUES 
('CollateralType', true);

-- Insert code values for CollateralType
INSERT INTO code_value (code_id, code_value, code_description, order_position, is_active)
SELECT id, 'Real Estate', 'Land and buildings', 1, true FROM code WHERE name = 'CollateralType'
UNION ALL
SELECT id, 'Vehicle', 'Cars and other motor vehicles', 2, true FROM code WHERE name = 'CollateralType'
UNION ALL
SELECT id, 'Jewelry', 'Gold, silver, precious stones', 3, true FROM code WHERE name = 'CollateralType'
UNION ALL
SELECT id, 'Shares', 'Stocks and shares', 4, true FROM code WHERE name = 'CollateralType'
UNION ALL
SELECT id, 'Deposits', 'Fixed deposits, savings', 5, true FROM code WHERE name = 'CollateralType'
UNION ALL
SELECT id, 'Household Items', 'Appliances, furniture', 6, true FROM code WHERE name = 'CollateralType'
UNION ALL
SELECT id, 'Others', 'Other types of collateral', 7, true FROM code WHERE name = 'CollateralType';

-- Create default charge
INSERT INTO charge (
    name, currency_code, charge_calculation_type, charge_payment_mode, 
    amount, penalty, active, is_loan_charge
)
VALUES (
    'Processing Fee', 'USD', 'percent_of_amount', 'regular',
    1.00, false, true, true
);

-- Create a default loan product
INSERT INTO loan_product (
    short_name, name, description, 
    nominal_interest_rate_per_period, interest_period_frequency_type, annual_nominal_interest_rate,
    interest_method_type, interest_calculation_period_type, amortization_method_type,
    default_principal_amount, default_number_of_repayments, 
    repayment_every, repayment_frequency_type
)
VALUES (
    'STD', 'Standard Loan', 'Basic loan product with standard terms and conditions',
    1.00, 'months', 12.00, 
    'declining_balance', 'daily', 'equal_installments',
    1000.00, 12, 
    1, 'months'
);