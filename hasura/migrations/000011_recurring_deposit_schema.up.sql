-- Migration file for Fineract recurring deposit management
-- Creates the schema for recurring deposit products and accounts

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create additional enum types for recurring deposits
CREATE TYPE recurring_frequency_type AS ENUM ('days', 'weeks', 'months', 'years');
CREATE TYPE recurring_type AS ENUM ('mandatory', 'recommended', 'custom');
CREATE TYPE recurring_deposit_status_type AS ENUM ('submitted_and_pending_approval', 'approved', 'active', 'rejected', 'closed', 'premature_closed', 'matured');

-- Recurring Deposit Products
CREATE TABLE recurring_deposit_product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_product_id UUID NOT NULL REFERENCES savings_product(id) ON DELETE CASCADE,
    min_deposit_term INTEGER NOT NULL,
    max_deposit_term INTEGER,
    min_deposit_term_type_enum deposit_term_frequency_type NOT NULL,
    max_deposit_term_type_enum deposit_term_frequency_type,
    in_multiples_of_term INTEGER,
    in_multiples_of_term_type_enum deposit_term_frequency_type,
    is_premature_closure_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    pre_closure_penal_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    pre_closure_penal_interest DECIMAL(19, 6),
    pre_closure_penal_interest_on_type_enum deposit_preclosure_interest_type,
    min_deposit_amount DECIMAL(19, 6),
    max_deposit_amount DECIMAL(19, 6),
    recurring_frequency INTEGER NOT NULL,
    recurring_frequency_type recurring_frequency_type NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    allow_withdrawal BOOLEAN NOT NULL DEFAULT FALSE,
    adjust_advance_towards_future_payments BOOLEAN NOT NULL DEFAULT TRUE,
    is_calendar_inherited BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Recurring Deposit Interest Rate Chart
CREATE TABLE recurring_deposit_interest_rate_chart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES recurring_deposit_product(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    from_date DATE NOT NULL,
    end_date DATE,
    is_primary_grouping_by_amount BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Recurring Deposit Interest Rate Slab
CREATE TABLE recurring_deposit_interest_rate_slab (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interest_rate_chart_id UUID NOT NULL REFERENCES recurring_deposit_interest_rate_chart(id) ON DELETE CASCADE,
    description VARCHAR(500),
    period_type_enum deposit_period_frequency_type NOT NULL,
    from_period INTEGER NOT NULL,
    to_period INTEGER,
    amount_range_from DECIMAL(19, 6),
    amount_range_to DECIMAL(19, 6),
    annual_interest_rate DECIMAL(19, 6) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Recurring Deposit Accounts
CREATE TABLE recurring_deposit_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_id UUID NOT NULL REFERENCES savings_account(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES recurring_deposit_product(id),
    deposit_amount DECIMAL(19, 6) NOT NULL,
    maturity_amount DECIMAL(19, 6),
    maturity_date DATE,
    deposit_period INTEGER NOT NULL,
    deposit_period_frequency_type_enum deposit_period_frequency_type NOT NULL,
    expected_maturity_amount DECIMAL(19, 6),
    expected_maturity_date DATE,
    interest_rate DECIMAL(19, 6) NOT NULL,
    is_renewal_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    is_premature_closure_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    pre_closure_penal_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    pre_closure_penal_interest DECIMAL(19, 6),
    pre_closure_penal_interest_on_type_enum deposit_preclosure_interest_type,
    total_deposits DECIMAL(19, 6) DEFAULT 0,
    interest_earned DECIMAL(19, 6),
    total_withdrawals DECIMAL(19, 6),
    total_withhold_tax DECIMAL(19, 6),
    on_account_closure_type deposit_account_on_closure_type NOT NULL DEFAULT 'withdraw_deposit',
    transfer_to_savings_account_id UUID REFERENCES savings_account(id),
    linked_account_id UUID REFERENCES savings_account(id),
    transfer_interest_to_linked_account BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Recurring Deposit Account Recurring Detail
CREATE TABLE recurring_deposit_account_recurring_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES recurring_deposit_account(id) ON DELETE CASCADE,
    mandatory_recommended_deposit_amount DECIMAL(19, 6) NOT NULL,
    recurring_frequency INTEGER NOT NULL,
    recurring_frequency_type recurring_frequency_type NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    allow_withdrawal BOOLEAN NOT NULL DEFAULT FALSE,
    adjust_advance_towards_future_payments BOOLEAN NOT NULL DEFAULT TRUE,
    is_calendar_inherited BOOLEAN NOT NULL DEFAULT FALSE,
    total_overdue_amount DECIMAL(19, 6) DEFAULT 0,
    no_of_overdue_installments INTEGER DEFAULT 0,
    expected_first_deposit_on_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Recurring Deposit Schedule Installments
CREATE TABLE recurring_deposit_schedule_installment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES recurring_deposit_account(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    deposit_amount DECIMAL(19, 6) NOT NULL,
    deposit_amount_completed DECIMAL(19, 6) DEFAULT 0,
    total_paid_in_advance DECIMAL(19, 6) DEFAULT 0,
    total_paid_late DECIMAL(19, 6) DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    obligations_met_on_date DATE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Recurring Deposit Transactions
CREATE TABLE recurring_deposit_transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_transaction_id UUID NOT NULL REFERENCES savings_account_transaction(id) ON DELETE CASCADE,
    recurring_deposit_account_id UUID NOT NULL REFERENCES recurring_deposit_account(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'interest_posting', 'maturity', 'premature_closure'
    installment_number INTEGER,
    amount DECIMAL(19, 6) NOT NULL,
    interest_portion DECIMAL(19, 6),
    fee_charges_portion DECIMAL(19, 6),
    penalty_charges_portion DECIMAL(19, 6),
    overpayment_portion DECIMAL(19, 6),
    balance_after_transaction DECIMAL(19, 6),
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Recurring Deposit Account Charge
CREATE TABLE recurring_deposit_account_charge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savings_account_charge_id UUID NOT NULL REFERENCES savings_account_charge(id) ON DELETE CASCADE,
    recurring_deposit_account_id UUID NOT NULL REFERENCES recurring_deposit_account(id),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER recurring_deposit_product_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_product 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_interest_rate_chart_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_interest_rate_chart 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_interest_rate_slab_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_interest_rate_slab 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_account_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_account 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_account_recurring_detail_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_account_recurring_detail 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_schedule_installment_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_schedule_installment 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_transaction_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_transaction 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER recurring_deposit_account_charge_audit 
BEFORE INSERT OR UPDATE ON recurring_deposit_account_charge 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_rd_product_savings_product_id ON recurring_deposit_product(savings_product_id);
CREATE INDEX idx_rd_interest_rate_chart_product_id ON recurring_deposit_interest_rate_chart(product_id);
CREATE INDEX idx_rd_interest_rate_slab_chart_id ON recurring_deposit_interest_rate_slab(interest_rate_chart_id);
CREATE INDEX idx_rd_account_savings_account_id ON recurring_deposit_account(savings_account_id);
CREATE INDEX idx_rd_account_product_id ON recurring_deposit_account(product_id);
CREATE INDEX idx_rd_account_recurring_detail_account_id ON recurring_deposit_account_recurring_detail(account_id);
CREATE INDEX idx_rd_schedule_installment_account_id ON recurring_deposit_schedule_installment(account_id);
CREATE INDEX idx_rd_schedule_installment_due_date ON recurring_deposit_schedule_installment(due_date);
CREATE INDEX idx_rd_transaction_account_id ON recurring_deposit_transaction(recurring_deposit_account_id);
CREATE INDEX idx_rd_transaction_transaction_id ON recurring_deposit_transaction(savings_account_transaction_id);
CREATE INDEX idx_rd_account_charge_account_id ON recurring_deposit_account_charge(recurring_deposit_account_id);
CREATE INDEX idx_rd_account_charge_charge_id ON recurring_deposit_account_charge(savings_account_charge_id);
CREATE INDEX idx_rd_account_maturity_date ON recurring_deposit_account(maturity_date);