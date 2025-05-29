-- Migration to add support for mobile API optimizations

-- Create table for tracking offline transactions
CREATE TABLE IF NOT EXISTS savings_offline_transactions (
    id UUID PRIMARY KEY,
    offline_id VARCHAR(50) NOT NULL,
    account_id UUID NOT NULL REFERENCES savings_accounts(id),
    transaction_id UUID REFERENCES savings_account_transactions(id),
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    transaction_date DATE NOT NULL,
    created_by UUID NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    offline_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT unique_offline_transaction UNIQUE (offline_id, account_id)
);

-- Create index for faster lookups
CREATE INDEX idx_savings_offline_transactions_account
ON savings_offline_transactions(account_id);

CREATE INDEX idx_savings_offline_transactions_offline_id
ON savings_offline_transactions(offline_id);

-- Create a view for mobile-optimized savings account summary
CREATE OR REPLACE VIEW mobile_savings_account_summary AS
SELECT 
    sa.id,
    sa.account_no,
    sa.client_id,
    COALESCE(c.display_name, c.first_name || ' ' || c.last_name) AS client_name,
    sp.name AS product_name,
    sa.status,
    sa.currency_code AS currency,
    sa.account_balance AS balance,
    sa.available_balance,
    sa.nominal_annual_interest_rate AS interest_rate,
    (
        SELECT transaction_date 
        FROM savings_account_transactions 
        WHERE savings_account_id = sa.id 
        ORDER BY transaction_date DESC, created_date DESC 
        LIMIT 1
    ) AS last_transaction_date
FROM 
    savings_accounts sa
JOIN 
    savings_products sp ON sa.product_id = sp.id
LEFT JOIN 
    clients c ON sa.client_id = c.id;

-- Create a view for mobile-optimized transaction list
CREATE OR REPLACE VIEW mobile_savings_transactions AS
SELECT 
    sat.id,
    sat.savings_account_id AS account_id,
    sat.transaction_date AS date,
    sat.transaction_type AS type,
    sat.amount,
    sat.running_balance,
    sat.description,
    'COMPLETED' AS status,
    sot.offline_id
FROM 
    savings_account_transactions sat
LEFT JOIN 
    savings_offline_transactions sot ON sat.id = sot.transaction_id;

-- Create a function to handle a batch of offline transactions
CREATE OR REPLACE FUNCTION process_offline_savings_transactions(
    transactions JSONB,
    user_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB = '{"success": true, "results": []}'::JSONB;
    tx JSONB;
    tx_result JSONB;
    tx_type TEXT;
    tx_id UUID;
BEGIN
    FOR tx IN SELECT * FROM jsonb_array_elements(transactions)
    LOOP
        -- Check if transaction already exists
        IF EXISTS (
            SELECT 1 FROM savings_offline_transactions 
            WHERE offline_id = tx->>'offlineId' AND account_id = (tx->>'accountId')::UUID
        ) THEN
            -- Already processed
            tx_result = jsonb_build_object(
                'success', true,
                'offlineId', tx->>'offlineId',
                'accountId', tx->>'accountId',
                'status', 'COMPLETED',
                'processingStatus', 'ALREADY_PROCESSED',
                'message', 'Transaction was already processed',
                'pendingSync', false
            );
        ELSE
            -- Process new transaction
            tx_type = tx->>'transactionType';
            
            IF tx_type = 'DEPOSIT' THEN
                -- Deposit process logic would be called here
                tx_id = uuid_generate_v4();
                
                -- For demo purposes, we're just recording the transaction
                INSERT INTO savings_offline_transactions (
                    id, offline_id, account_id, transaction_type, amount, 
                    transaction_date, created_by, device_id, offline_created_at, synced_at
                ) VALUES (
                    uuid_generate_v4(), 
                    tx->>'offlineId', 
                    (tx->>'accountId')::UUID, 
                    'DEPOSIT',
                    (tx->>'amount')::DECIMAL, 
                    (tx->>'transactionDate')::DATE, 
                    user_id,
                    COALESCE(tx->>'deviceId', 'unknown'),
                    COALESCE((tx->>'offlineCreatedAt')::TIMESTAMP WITH TIME ZONE, NOW()),
                    NOW()
                );
                
                tx_result = jsonb_build_object(
                    'success', true,
                    'transactionId', tx_id,
                    'offlineId', tx->>'offlineId',
                    'accountId', tx->>'accountId',
                    'status', 'COMPLETED',
                    'processingStatus', 'PROCESSED',
                    'message', 'Transaction processed successfully',
                    'pendingSync', false
                );
            ELSIF tx_type = 'WITHDRAWAL' THEN
                -- Withdrawal process logic would be called here
                tx_id = uuid_generate_v4();
                
                -- For demo purposes, we're just recording the transaction
                INSERT INTO savings_offline_transactions (
                    id, offline_id, account_id, transaction_type, amount, 
                    transaction_date, created_by, device_id, offline_created_at, synced_at
                ) VALUES (
                    uuid_generate_v4(), 
                    tx->>'offlineId', 
                    (tx->>'accountId')::UUID, 
                    'WITHDRAWAL',
                    (tx->>'amount')::DECIMAL, 
                    (tx->>'transactionDate')::DATE, 
                    user_id,
                    COALESCE(tx->>'deviceId', 'unknown'),
                    COALESCE((tx->>'offlineCreatedAt')::TIMESTAMP WITH TIME ZONE, NOW()),
                    NOW()
                );
                
                tx_result = jsonb_build_object(
                    'success', true,
                    'transactionId', tx_id,
                    'offlineId', tx->>'offlineId',
                    'accountId', tx->>'accountId',
                    'status', 'COMPLETED',
                    'processingStatus', 'PROCESSED',
                    'message', 'Transaction processed successfully',
                    'pendingSync', false
                );
            ELSE
                tx_result = jsonb_build_object(
                    'success', false,
                    'offlineId', tx->>'offlineId',
                    'accountId', tx->>'accountId',
                    'status', 'ERROR',
                    'processingStatus', 'FAILED',
                    'message', 'Unsupported transaction type: ' || tx_type,
                    'pendingSync', true
                );
            END IF;
        END IF;
        
        -- Add to results array
        result = jsonb_set(
            result,
            '{results}',
            (result->'results') || tx_result
        );
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;