-- Migration file for Fineract accounting
-- Creates the schema for accounting and general ledger functionality

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create enum types for accounting
CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
CREATE TYPE account_usage AS ENUM ('detail', 'header');
CREATE TYPE gl_journal_entry_type AS ENUM ('credit', 'debit');

-- GL Accounts
CREATE TABLE gl_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES gl_account(id),
    hierarchy VARCHAR(100),
    gl_code VARCHAR(50) NOT NULL,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    manual_entries_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    account_type account_type NOT NULL,
    account_usage account_usage NOT NULL,
    description VARCHAR(500),
    tag_id UUID REFERENCES code_value(id),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(gl_code)
);

-- GL Journal Entries
CREATE TABLE gl_journal_entry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES gl_account(id),
    office_id UUID NOT NULL REFERENCES office(id),
    reversal_id UUID REFERENCES gl_journal_entry(id),
    transaction_id VARCHAR(100) NOT NULL,
    reversed BOOLEAN NOT NULL DEFAULT FALSE,
    manual_entry BOOLEAN NOT NULL DEFAULT FALSE,
    entry_date DATE NOT NULL,
    type gl_journal_entry_type NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    description VARCHAR(500),
    entity_type VARCHAR(50),
    entity_id UUID,
    currency_code VARCHAR(3) NOT NULL,
    payment_details_id UUID,
    submitted_on_date DATE NOT NULL,
    submitted_by_user_id UUID REFERENCES app_user(id),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- GL Closures for accounting periods
CREATE TABLE gl_closure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL REFERENCES office(id),
    closing_date DATE NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    comments VARCHAR(500),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(office_id, closing_date)
);

-- Product-Account Mappings
CREATE TABLE product_account_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    product_type VARCHAR(50) NOT NULL, -- 'loan', 'savings', 'share'
    account_mapping_type VARCHAR(100) NOT NULL, -- like 'fund_source', 'loan_portfolio', 'interest_on_loans', etc.
    gl_account_id UUID NOT NULL REFERENCES gl_account(id),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(product_id, product_type, account_mapping_type)
);

-- Accounting Rules
CREATE TABLE accounting_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    office_id UUID REFERENCES office(id),
    debit_account_id UUID REFERENCES gl_account(id),
    credit_account_id UUID REFERENCES gl_account(id),
    description VARCHAR(500),
    system_defined BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(name)
);

-- Payment Types
CREATE TABLE payment_type (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_cash_payment BOOLEAN NOT NULL DEFAULT TRUE,
    order_position INTEGER,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(name)
);

-- Payment Details
CREATE TABLE payment_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_type_id UUID REFERENCES payment_type(id),
    account_number VARCHAR(100),
    check_number VARCHAR(100),
    routing_code VARCHAR(100),
    receipt_number VARCHAR(100),
    bank_number VARCHAR(100),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER gl_account_audit BEFORE INSERT OR UPDATE ON gl_account FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER gl_journal_entry_audit BEFORE INSERT OR UPDATE ON gl_journal_entry FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER gl_closure_audit BEFORE INSERT OR UPDATE ON gl_closure FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER product_account_mapping_audit BEFORE INSERT OR UPDATE ON product_account_mapping FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER accounting_rule_audit BEFORE INSERT OR UPDATE ON accounting_rule FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER payment_type_audit BEFORE INSERT OR UPDATE ON payment_type FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER payment_detail_audit BEFORE INSERT OR UPDATE ON payment_detail FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_gl_account_hierarchy ON gl_account(hierarchy);
CREATE INDEX idx_gl_journal_entry_account_id ON gl_journal_entry(account_id);
CREATE INDEX idx_gl_journal_entry_office_id ON gl_journal_entry(office_id);
CREATE INDEX idx_gl_journal_entry_entry_date ON gl_journal_entry(entry_date);
CREATE INDEX idx_gl_journal_entry_transaction_id ON gl_journal_entry(transaction_id);
CREATE INDEX idx_gl_journal_entry_reversed ON gl_journal_entry(reversed);
CREATE INDEX idx_gl_closure_office_id ON gl_closure(office_id);
CREATE INDEX idx_gl_closure_closing_date ON gl_closure(closing_date);
CREATE INDEX idx_product_account_mapping_product_id ON product_account_mapping(product_id, product_type);

-- Add foreign key references from other modules
ALTER TABLE loan_transaction 
ADD CONSTRAINT fk_loan_transaction_payment_detail 
FOREIGN KEY (payment_detail_id) REFERENCES payment_detail(id);

ALTER TABLE savings_account_transaction 
ADD CONSTRAINT fk_savings_transaction_payment_detail 
FOREIGN KEY (payment_detail_id) REFERENCES payment_detail(id);

-- Insert permissions for accounting
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('accounting', 'CREATE_GLACCOUNT', 'GLACCOUNT', 'CREATE', true),
('accounting', 'UPDATE_GLACCOUNT', 'GLACCOUNT', 'UPDATE', true),
('accounting', 'DELETE_GLACCOUNT', 'GLACCOUNT', 'DELETE', true),
('accounting', 'CREATE_GLCLOSURE', 'GLCLOSURE', 'CREATE', true),
('accounting', 'UPDATE_GLCLOSURE', 'GLCLOSURE', 'UPDATE', true),
('accounting', 'DELETE_GLCLOSURE', 'GLCLOSURE', 'DELETE', true),
('accounting', 'CREATE_JOURNALENTRY', 'JOURNALENTRY', 'CREATE', true),
('accounting', 'REVERSE_JOURNALENTRY', 'JOURNALENTRY', 'REVERSE', true),
('accounting', 'CREATE_ACCOUNTINGRULE', 'ACCOUNTINGRULE', 'CREATE', true),
('accounting', 'UPDATE_ACCOUNTINGRULE', 'ACCOUNTINGRULE', 'UPDATE', true),
('accounting', 'DELETE_ACCOUNTINGRULE', 'ACCOUNTINGRULE', 'DELETE', true);

-- Insert payment types
INSERT INTO payment_type (name, description, is_cash_payment, order_position, is_enabled)
VALUES
('Cash', 'Cash payment', true, 1, true),
('Cheque', 'Cheque payment', false, 2, true),
('Bank Transfer', 'Bank transfer payment', false, 3, true),
('Debit Card', 'Debit card payment', false, 4, true),
('Credit Card', 'Credit card payment', false, 5, true),
('Mobile Money', 'Mobile money payment', false, 6, true);

-- Insert chart of accounts (basic structure)
-- Assets
INSERT INTO gl_account (name, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
VALUES 
('Assets', '1000', false, false, 'asset', 'header', 'Asset accounts'),
('Cash', '1100', false, true, 'asset', 'detail', 'Cash accounts'),
('Bank', '1200', false, true, 'asset', 'detail', 'Bank accounts'),
('Loans Portfolio', '1300', false, true, 'asset', 'detail', 'Loans portfolio'),
('Interest Receivable', '1400', false, true, 'asset', 'detail', 'Interest receivable on loans');

-- Update hierarchy for the asset accounts
UPDATE gl_account SET hierarchy = '.' || id WHERE name = 'Assets';
UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE name = 'Assets') || '.' || id, parent_id = (SELECT id FROM gl_account WHERE name = 'Assets') WHERE name IN ('Cash', 'Bank', 'Loans Portfolio', 'Interest Receivable');

-- Liabilities
INSERT INTO gl_account (name, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
VALUES 
('Liabilities', '2000', false, false, 'liability', 'header', 'Liability accounts'),
('Savings', '2100', false, true, 'liability', 'detail', 'Savings accounts'),
('Deposits', '2200', false, true, 'liability', 'detail', 'Client deposits');

-- Update hierarchy for the liability accounts
UPDATE gl_account SET hierarchy = '.' || id WHERE name = 'Liabilities';
UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE name = 'Liabilities') || '.' || id, parent_id = (SELECT id FROM gl_account WHERE name = 'Liabilities') WHERE name IN ('Savings', 'Deposits');

-- Equity
INSERT INTO gl_account (name, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
VALUES 
('Equity', '3000', false, false, 'equity', 'header', 'Equity accounts'),
('Retained Earnings', '3100', false, true, 'equity', 'detail', 'Retained earnings');

-- Update hierarchy for the equity accounts
UPDATE gl_account SET hierarchy = '.' || id WHERE name = 'Equity';
UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE name = 'Equity') || '.' || id, parent_id = (SELECT id FROM gl_account WHERE name = 'Equity') WHERE name = 'Retained Earnings';

-- Income
INSERT INTO gl_account (name, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
VALUES 
('Income', '4000', false, false, 'income', 'header', 'Income accounts'),
('Interest Income', '4100', false, true, 'income', 'detail', 'Interest income from loans'),
('Fee Income', '4200', false, true, 'income', 'detail', 'Fee income from loans and services'),
('Penalties', '4300', false, true, 'income', 'detail', 'Income from penalties');

-- Update hierarchy for the income accounts
UPDATE gl_account SET hierarchy = '.' || id WHERE name = 'Income';
UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE name = 'Income') || '.' || id, parent_id = (SELECT id FROM gl_account WHERE name = 'Income') WHERE name IN ('Interest Income', 'Fee Income', 'Penalties');

-- Expenses
INSERT INTO gl_account (name, gl_code, disabled, manual_entries_allowed, account_type, account_usage, description)
VALUES 
('Expenses', '5000', false, false, 'expense', 'header', 'Expense accounts'),
('Interest Expense', '5100', false, true, 'expense', 'detail', 'Interest paid on savings/deposits'),
('Loan Loss Provision', '5200', false, true, 'expense', 'detail', 'Provision for loan losses'),
('Write-offs', '5300', false, true, 'expense', 'detail', 'Loan write-offs');

-- Update hierarchy for the expense accounts
UPDATE gl_account SET hierarchy = '.' || id WHERE name = 'Expenses';
UPDATE gl_account SET hierarchy = (SELECT hierarchy FROM gl_account WHERE name = 'Expenses') || '.' || id, parent_id = (SELECT id FROM gl_account WHERE name = 'Expenses') WHERE name IN ('Interest Expense', 'Loan Loss Provision', 'Write-offs');

-- Link loan product to GL accounts
INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT lp.id, 'loan', 'fund_source', gl.id
FROM loan_product lp, gl_account gl
WHERE gl.name = 'Bank'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT lp.id, 'loan', 'loan_portfolio', gl.id
FROM loan_product lp, gl_account gl
WHERE gl.name = 'Loans Portfolio'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT lp.id, 'loan', 'interest_receivable', gl.id
FROM loan_product lp, gl_account gl
WHERE gl.name = 'Interest Receivable'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT lp.id, 'loan', 'interest_income', gl.id
FROM loan_product lp, gl_account gl
WHERE gl.name = 'Interest Income'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT lp.id, 'loan', 'fee_income', gl.id
FROM loan_product lp, gl_account gl
WHERE gl.name = 'Fee Income'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT lp.id, 'loan', 'penalty_income', gl.id
FROM loan_product lp, gl_account gl
WHERE gl.name = 'Penalties'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT lp.id, 'loan', 'losses_written_off', gl.id
FROM loan_product lp, gl_account gl
WHERE gl.name = 'Write-offs'
LIMIT 1;

-- Link savings product to GL accounts
INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT sp.id, 'savings', 'savings_control', gl.id
FROM savings_product sp, gl_account gl
WHERE gl.name = 'Savings'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT sp.id, 'savings', 'savings_reference', gl.id
FROM savings_product sp, gl_account gl
WHERE gl.name = 'Savings'
LIMIT 1;

INSERT INTO product_account_mapping (product_id, product_type, account_mapping_type, gl_account_id)
SELECT sp.id, 'savings', 'interest_on_savings', gl.id
FROM savings_product sp, gl_account gl
WHERE gl.name = 'Interest Expense'
LIMIT 1;