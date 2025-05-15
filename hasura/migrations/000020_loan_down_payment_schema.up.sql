-- Migration script to add down payment support to loan module

-- Add down payment support to loan product table
ALTER TABLE fineract_default.loan_product
ADD COLUMN enable_down_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN down_payment_type VARCHAR(20),
ADD COLUMN down_payment_amount DECIMAL(19,6),
ADD COLUMN down_payment_percentage DECIMAL(19,6),
ADD COLUMN down_payment_description TEXT;

-- Add down payment support to loan table
ALTER TABLE fineract_default.loan
ADD COLUMN enable_down_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN down_payment_type VARCHAR(20),
ADD COLUMN down_payment_amount DECIMAL(19,6),
ADD COLUMN down_payment_percentage DECIMAL(19,6),
ADD COLUMN down_payment_transaction_id VARCHAR(36),
ADD COLUMN down_payment_completed BOOLEAN DEFAULT FALSE;

-- Add new transaction type for down payment
ALTER TYPE fineract_default.transaction_type ADD VALUE IF NOT EXISTS 'DOWN_PAYMENT';

COMMENT ON COLUMN fineract_default.loan_product.enable_down_payment IS 'Flag indicating whether down payments are enabled for loans created from this product';
COMMENT ON COLUMN fineract_default.loan_product.down_payment_type IS 'Type of down payment (fixed_amount or percentage)';
COMMENT ON COLUMN fineract_default.loan_product.down_payment_amount IS 'Fixed amount for down payment if type is fixed_amount';
COMMENT ON COLUMN fineract_default.loan_product.down_payment_percentage IS 'Percentage of principal for down payment if type is percentage';
COMMENT ON COLUMN fineract_default.loan_product.down_payment_description IS 'Description of down payment requirements';

COMMENT ON COLUMN fineract_default.loan.enable_down_payment IS 'Flag indicating whether down payment is enabled for this loan';
COMMENT ON COLUMN fineract_default.loan.down_payment_type IS 'Type of down payment (fixed_amount or percentage)';
COMMENT ON COLUMN fineract_default.loan.down_payment_amount IS 'Fixed amount for down payment if type is fixed_amount';
COMMENT ON COLUMN fineract_default.loan.down_payment_percentage IS 'Percentage of principal for down payment if type is percentage';
COMMENT ON COLUMN fineract_default.loan.down_payment_transaction_id IS 'ID of the transaction recording the down payment';
COMMENT ON COLUMN fineract_default.loan.down_payment_completed IS 'Flag indicating whether the down payment has been completed';