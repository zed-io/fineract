-- Trinidad and Tobago Integration Seed Data
-- This script creates integration configurations and sample data specific to Trinidad and Tobago

-- Ensure we're using the correct schema
SET search_path TO fineract_default;

-- 1. API Clients (systems that can connect to the Fineract API)
INSERT INTO api_client (
    name,
    client_id,
    client_secret,
    redirect_uri,
    grant_types,
    scopes,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Mobile Banking App',
    'trinidad_mobile_app_' || substr(md5(random()::text), 1, 10),
    encode(gen_random_bytes(32), 'hex'),
    'https://mobile.trinidadfinance.org/auth/callback',
    ARRAY['authorization_code', 'refresh_token'],
    ARRAY['read:clients', 'write:transactions', 'read:accounts'],
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM api_client WHERE name = 'Trinidad Mobile Banking App');

INSERT INTO api_client (
    name,
    client_id,
    client_secret,
    redirect_uri,
    grant_types,
    scopes,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Agent Banking Network',
    'trinidad_agent_network_' || substr(md5(random()::text), 1, 10),
    encode(gen_random_bytes(32), 'hex'),
    'https://agents.trinidadfinance.org/oauth/callback',
    ARRAY['client_credentials', 'authorization_code'],
    ARRAY['read:clients', 'write:transactions', 'read:accounts', 'read:products'],
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM api_client WHERE name = 'Trinidad Agent Banking Network');

INSERT INTO api_client (
    name,
    client_id,
    client_secret,
    redirect_uri,
    grant_types,
    scopes,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Central Bank Reporting',
    'trinidad_central_bank_' || substr(md5(random()::text), 1, 10),
    encode(gen_random_bytes(32), 'hex'),
    'https://api.central-bank.tt/fineract/callback',
    ARRAY['client_credentials'],
    ARRAY['read:reports', 'read:statistics'],
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM api_client WHERE name = 'Trinidad Central Bank Reporting');

INSERT INTO api_client (
    name,
    client_id,
    client_secret,
    redirect_uri,
    grant_types,
    scopes,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Credit Bureau',
    'trinidad_credit_bureau_' || substr(md5(random()::text), 1, 10),
    encode(gen_random_bytes(32), 'hex'),
    'https://api.trinidadcreditbureau.org/callbacks/fineract',
    ARRAY['client_credentials'],
    ARRAY['read:clients', 'read:loans'],
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM api_client WHERE name = 'Trinidad Credit Bureau');

-- 2. API Usage Statistics
DO $$
DECLARE
    client_id_1 UUID;
    client_id_2 UUID;
    client_id_3 UUID;
    client_id_4 UUID;
BEGIN
    SELECT id INTO client_id_1 FROM api_client WHERE name = 'Trinidad Mobile Banking App';
    SELECT id INTO client_id_2 FROM api_client WHERE name = 'Trinidad Agent Banking Network';
    SELECT id INTO client_id_3 FROM api_client WHERE name = 'Trinidad Central Bank Reporting';
    SELECT id INTO client_id_4 FROM api_client WHERE name = 'Trinidad Credit Bureau';
    
    -- Mobile App Usage
    INSERT INTO api_usage (
        api_client_id,
        date,
        endpoint,
        method,
        request_count,
        success_count,
        error_count,
        avg_response_time_ms
    )
    SELECT 
        client_id_1,
        NOW() - INTERVAL '1 day',
        '/clients/{clientId}/accounts',
        'GET',
        1245,
        1220,
        25,
        125
    WHERE client_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM api_usage 
        WHERE api_client_id = client_id_1 
        AND endpoint = '/clients/{clientId}/accounts'
        AND date = NOW() - INTERVAL '1 day'
    );
    
    INSERT INTO api_usage (
        api_client_id,
        date,
        endpoint,
        method,
        request_count,
        success_count,
        error_count,
        avg_response_time_ms
    )
    SELECT 
        client_id_1,
        NOW() - INTERVAL '1 day',
        '/accounts/{accountId}/transactions',
        'POST',
        875,
        865,
        10,
        245
    WHERE client_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM api_usage 
        WHERE api_client_id = client_id_1 
        AND endpoint = '/accounts/{accountId}/transactions'
        AND date = NOW() - INTERVAL '1 day'
    );
    
    -- Agent Network Usage
    INSERT INTO api_usage (
        api_client_id,
        date,
        endpoint,
        method,
        request_count,
        success_count,
        error_count,
        avg_response_time_ms
    )
    SELECT 
        client_id_2,
        NOW() - INTERVAL '1 day',
        '/clients/search',
        'GET',
        678,
        675,
        3,
        156
    WHERE client_id_2 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM api_usage 
        WHERE api_client_id = client_id_2 
        AND endpoint = '/clients/search'
        AND date = NOW() - INTERVAL '1 day'
    );
    
    INSERT INTO api_usage (
        api_client_id,
        date,
        endpoint,
        method,
        request_count,
        success_count,
        error_count,
        avg_response_time_ms
    )
    SELECT 
        client_id_2,
        NOW() - INTERVAL '1 day',
        '/loans/{loanId}/transactions',
        'POST',
        234,
        230,
        4,
        345
    WHERE client_id_2 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM api_usage 
        WHERE api_client_id = client_id_2 
        AND endpoint = '/loans/{loanId}/transactions'
        AND date = NOW() - INTERVAL '1 day'
    );
    
    -- Central Bank Usage
    INSERT INTO api_usage (
        api_client_id,
        date,
        endpoint,
        method,
        request_count,
        success_count,
        error_count,
        avg_response_time_ms
    )
    SELECT 
        client_id_3,
        NOW() - INTERVAL '1 day',
        '/reports/regulatory/portfolio',
        'GET',
        24,
        24,
        0,
        678
    WHERE client_id_3 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM api_usage 
        WHERE api_client_id = client_id_3 
        AND endpoint = '/reports/regulatory/portfolio'
        AND date = NOW() - INTERVAL '1 day'
    );
    
    -- Credit Bureau Usage
    INSERT INTO api_usage (
        api_client_id,
        date,
        endpoint,
        method,
        request_count,
        success_count,
        error_count,
        avg_response_time_ms
    )
    SELECT 
        client_id_4,
        NOW() - INTERVAL '1 day',
        '/clients/{clientId}/loans',
        'GET',
        156,
        154,
        2,
        186
    WHERE client_id_4 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM api_usage 
        WHERE api_client_id = client_id_4 
        AND endpoint = '/clients/{clientId}/loans'
        AND date = NOW() - INTERVAL '1 day'
    );
END $$;

-- 3. Webhooks (endpoints that receive notifications from Fineract)
INSERT INTO webhook (
    name,
    endpoint_url,
    event_types,
    secret_key,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Mobile App Notifications',
    'https://notifications.trinidadfinance.org/webhook/fineract',
    ARRAY['loan.approved', 'loan.disbursed', 'savings.deposit', 'savings.withdrawal'],
    encode(gen_random_bytes(32), 'hex'),
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM webhook WHERE name = 'Trinidad Mobile App Notifications');

INSERT INTO webhook (
    name,
    endpoint_url,
    event_types,
    secret_key,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Credit Bureau Updates',
    'https://api.trinidadcreditbureau.org/webhooks/loan-updates',
    ARRAY['loan.approved', 'loan.disbursed', 'loan.repayment', 'loan.writtenoff', 'loan.closed'],
    encode(gen_random_bytes(32), 'hex'),
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM webhook WHERE name = 'Trinidad Credit Bureau Updates');

INSERT INTO webhook (
    name,
    endpoint_url,
    event_types,
    secret_key,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Fraud Detection System',
    'https://fraud.trinidadfinance.org/api/events',
    ARRAY['transaction.suspicious', 'client.unusual_activity', 'login.failed'],
    encode(gen_random_bytes(32), 'hex'),
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM webhook WHERE name = 'Trinidad Fraud Detection System');

-- 4. Webhook Delivery History
DO $$
DECLARE
    webhook_id_1 UUID;
    webhook_id_2 UUID;
    webhook_id_3 UUID;
BEGIN
    SELECT id INTO webhook_id_1 FROM webhook WHERE name = 'Trinidad Mobile App Notifications';
    SELECT id INTO webhook_id_2 FROM webhook WHERE name = 'Trinidad Credit Bureau Updates';
    SELECT id INTO webhook_id_3 FROM webhook WHERE name = 'Trinidad Fraud Detection System';
    
    -- Mobile App Notifications
    INSERT INTO webhook_delivery (
        webhook_id,
        event_type,
        event_id,
        delivery_status,
        status_code,
        attempt_count,
        created_date,
        last_attempted_date,
        payload
    )
    SELECT 
        webhook_id_1,
        'savings.deposit',
        md5(random()::text),
        'DELIVERED',
        200,
        1,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours',
        '{"event":"savings.deposit","data":{"accountId":"' || (SELECT id FROM savings_account LIMIT 1) || '","amount":1000.00,"currency":"TTD","timestamp":"' || (NOW() - INTERVAL '2 hours')::text || '"}}'
    WHERE webhook_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM webhook_delivery 
        WHERE webhook_id = webhook_id_1 
        AND event_type = 'savings.deposit'
        AND created_date = NOW() - INTERVAL '2 hours'
    );
    
    INSERT INTO webhook_delivery (
        webhook_id,
        event_type,
        event_id,
        delivery_status,
        status_code,
        attempt_count,
        created_date,
        last_attempted_date,
        payload
    )
    SELECT 
        webhook_id_1,
        'loan.disbursed',
        md5(random()::text),
        'DELIVERED',
        200,
        1,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '3 hours',
        '{"event":"loan.disbursed","data":{"loanId":"' || (SELECT id FROM loan LIMIT 1) || '","amount":15000.00,"currency":"TTD","timestamp":"' || (NOW() - INTERVAL '3 hours')::text || '"}}'
    WHERE webhook_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM webhook_delivery 
        WHERE webhook_id = webhook_id_1 
        AND event_type = 'loan.disbursed'
        AND created_date = NOW() - INTERVAL '3 hours'
    );
    
    -- Credit Bureau Updates
    INSERT INTO webhook_delivery (
        webhook_id,
        event_type,
        event_id,
        delivery_status,
        status_code,
        attempt_count,
        created_date,
        last_attempted_date,
        payload
    )
    SELECT 
        webhook_id_2,
        'loan.approved',
        md5(random()::text),
        'DELIVERED',
        200,
        1,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day',
        '{"event":"loan.approved","data":{"loanId":"' || (SELECT id FROM loan LIMIT 1 OFFSET 1) || '","clientId":"' || (SELECT client_id FROM loan LIMIT 1) || '","productId":"' || (SELECT product_id FROM loan LIMIT 1) || '","amount":25000.00,"currency":"TTD","timestamp":"' || (NOW() - INTERVAL '1 day')::text || '"}}'
    WHERE webhook_id_2 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM webhook_delivery 
        WHERE webhook_id = webhook_id_2 
        AND event_type = 'loan.approved'
        AND created_date = NOW() - INTERVAL '1 day'
    );
    
    -- Failed delivery example
    INSERT INTO webhook_delivery (
        webhook_id,
        event_type,
        event_id,
        delivery_status,
        status_code,
        attempt_count,
        created_date,
        last_attempted_date,
        payload,
        error_details
    )
    SELECT 
        webhook_id_3,
        'transaction.suspicious',
        md5(random()::text),
        'FAILED',
        503,
        3,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '4 hours',
        '{"event":"transaction.suspicious","data":{"transactionId":"' || uuid_generate_v4() || '","accountId":"' || (SELECT id FROM savings_account LIMIT 1 OFFSET 2) || '","amount":50000.00,"currency":"TTD","reason":"Unusual large transaction","timestamp":"' || (NOW() - INTERVAL '5 hours')::text || '"}}',
        'Service Unavailable: The fraud detection system is currently experiencing downtime'
    WHERE webhook_id_3 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM webhook_delivery 
        WHERE webhook_id = webhook_id_3 
        AND event_type = 'transaction.suspicious'
        AND delivery_status = 'FAILED'
        AND created_date = NOW() - INTERVAL '5 hours'
    );
END $$;

-- 5. Data Exchange Configurations (for batch file transfers)
INSERT INTO data_exchange_config (
    name,
    exchange_type,
    direction,
    format,
    schedule,
    source_path,
    destination_path,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Central Bank Regulatory Reports',
    'SFTP',
    'EXPORT',
    'CSV',
    '0 1 * * *', -- Daily at 1 AM
    '/exports/regulatory/',
    '/incoming/fineract/',
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM data_exchange_config WHERE name = 'Trinidad Central Bank Regulatory Reports');

INSERT INTO data_exchange_config (
    name,
    exchange_type,
    direction,
    format,
    schedule,
    source_path,
    destination_path,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Credit Bureau Daily Updates',
    'SFTP',
    'EXPORT',
    'CSV',
    '0 2 * * *', -- Daily at 2 AM
    '/exports/credit-bureau/',
    '/incoming/fineract/',
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM data_exchange_config WHERE name = 'Trinidad Credit Bureau Daily Updates');

INSERT INTO data_exchange_config (
    name,
    exchange_type,
    direction,
    format,
    schedule,
    source_path,
    destination_path,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Remittance Partner Integration',
    'API',
    'IMPORT',
    'JSON',
    '*/15 * * * *', -- Every 15 minutes
    'https://api.worldremit.com/partners/trinidad-finance/transactions',
    '/imports/remittances/',
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM data_exchange_config WHERE name = 'Trinidad Remittance Partner Integration');

INSERT INTO data_exchange_config (
    name,
    exchange_type,
    direction,
    format,
    schedule,
    source_path,
    destination_path,
    encryption_type,
    encryption_key_id,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Bank Account Statements',
    'SFTP',
    'IMPORT',
    'CSV',
    '0 5 * * *', -- Daily at 5 AM
    '/statements/outgoing/',
    '/imports/statements/',
    'PGP',
    'trinidad-finance-pgp-key',
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM data_exchange_config WHERE name = 'Trinidad Bank Account Statements');

-- 6. Data Exchange Executions
DO $$
DECLARE
    config_id_1 UUID;
    config_id_2 UUID;
    config_id_3 UUID;
    config_id_4 UUID;
BEGIN
    SELECT id INTO config_id_1 FROM data_exchange_config WHERE name = 'Trinidad Central Bank Regulatory Reports';
    SELECT id INTO config_id_2 FROM data_exchange_config WHERE name = 'Trinidad Credit Bureau Daily Updates';
    SELECT id INTO config_id_3 FROM data_exchange_config WHERE name = 'Trinidad Remittance Partner Integration';
    SELECT id INTO config_id_4 FROM data_exchange_config WHERE name = 'Trinidad Bank Account Statements';
    
    -- Central Bank Reports
    INSERT INTO data_exchange_execution (
        config_id,
        start_time,
        end_time,
        status,
        records_processed,
        file_size,
        file_name
    )
    SELECT 
        config_id_1,
        NOW() - INTERVAL '1 day 1 hour',
        NOW() - INTERVAL '1 day 55 minutes',
        'COMPLETED',
        12435,
        4563789,
        'regulatory_report_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv'
    WHERE config_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM data_exchange_execution 
        WHERE config_id = config_id_1 
        AND file_name = 'regulatory_report_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv'
    );
    
    -- Credit Bureau Daily Updates
    INSERT INTO data_exchange_execution (
        config_id,
        start_time,
        end_time,
        status,
        records_processed,
        file_size,
        file_name
    )
    SELECT 
        config_id_2,
        NOW() - INTERVAL '1 day 2 hour',
        NOW() - INTERVAL '1 day 1 hour 45 minutes',
        'COMPLETED',
        5647,
        2345678,
        'credit_bureau_report_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv'
    WHERE config_id_2 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM data_exchange_execution 
        WHERE config_id = config_id_2 
        AND file_name = 'credit_bureau_report_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv'
    );
    
    -- Remittance Partner - Recent executions
    INSERT INTO data_exchange_execution (
        config_id,
        start_time,
        end_time,
        status,
        records_processed,
        file_size,
        file_name
    )
    SELECT 
        config_id_3,
        NOW() - INTERVAL '15 minutes',
        NOW() - INTERVAL '14 minutes 30 seconds',
        'COMPLETED',
        12,
        24680,
        'remittance_import_' || to_char(NOW() - INTERVAL '15 minutes', 'YYYYMMDD_HH24MI') || '.json'
    WHERE config_id_3 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM data_exchange_execution 
        WHERE config_id = config_id_3 
        AND file_name = 'remittance_import_' || to_char(NOW() - INTERVAL '15 minutes', 'YYYYMMDD_HH24MI') || '.json'
    );
    
    INSERT INTO data_exchange_execution (
        config_id,
        start_time,
        end_time,
        status,
        records_processed,
        file_size,
        file_name
    )
    SELECT 
        config_id_3,
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '29 minutes 30 seconds',
        'COMPLETED',
        8,
        16420,
        'remittance_import_' || to_char(NOW() - INTERVAL '30 minutes', 'YYYYMMDD_HH24MI') || '.json'
    WHERE config_id_3 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM data_exchange_execution 
        WHERE config_id = config_id_3 
        AND file_name = 'remittance_import_' || to_char(NOW() - INTERVAL '30 minutes', 'YYYYMMDD_HH24MI') || '.json'
    );
    
    -- Bank Statement Import with error
    INSERT INTO data_exchange_execution (
        config_id,
        start_time,
        end_time,
        status,
        error_details,
        file_name
    )
    SELECT 
        config_id_4,
        NOW() - INTERVAL '1 day 5 hour',
        NOW() - INTERVAL '1 day 4 hour 55 minutes',
        'FAILED',
        'Failed to decrypt file: Invalid PGP key or corrupted file',
        'fcb_statement_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv.pgp'
    WHERE config_id_4 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM data_exchange_execution 
        WHERE config_id = config_id_4 
        AND file_name = 'fcb_statement_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv.pgp'
        AND status = 'FAILED'
    );
    
    -- Successful retry
    INSERT INTO data_exchange_execution (
        config_id,
        start_time,
        end_time,
        status,
        records_processed,
        file_size,
        file_name
    )
    SELECT 
        config_id_4,
        NOW() - INTERVAL '1 day 3 hour',
        NOW() - INTERVAL '1 day 2 hour 50 minutes',
        'COMPLETED',
        342,
        1567890,
        'fcb_statement_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv.pgp'
    WHERE config_id_4 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM data_exchange_execution 
        WHERE config_id = config_id_4 
        AND file_name = 'fcb_statement_' || to_char(NOW() - INTERVAL '1 day', 'YYYYMMDD') || '.csv.pgp'
        AND status = 'COMPLETED'
    );
END $$;

-- 7. Event Streams (for real-time data streaming)
INSERT INTO event_stream (
    name,
    stream_type,
    event_types,
    configuration,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Transaction Stream',
    'KAFKA',
    ARRAY['TRANSACTION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'DEPOSIT', 'WITHDRAWAL'],
    '{"bootstrap.servers":"kafka.trinidadfinance.org:9092","topic":"trinidad-transactions","client.id":"fineract-producer","compression.type":"gzip"}',
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM event_stream WHERE name = 'Trinidad Transaction Stream');

INSERT INTO event_stream (
    name,
    stream_type,
    event_types,
    configuration,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Client Activity Stream',
    'KAFKA',
    ARRAY['CLIENT_CREATED', 'CLIENT_UPDATED', 'ACCOUNT_OPENED', 'ACCOUNT_CLOSED'],
    '{"bootstrap.servers":"kafka.trinidadfinance.org:9092","topic":"trinidad-client-events","client.id":"fineract-producer","compression.type":"gzip"}',
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM event_stream WHERE name = 'Trinidad Client Activity Stream');

INSERT INTO event_stream (
    name,
    stream_type,
    event_types,
    configuration,
    status,
    created_by,
    created_date
)
SELECT 
    'Trinidad Regulatory Event Stream',
    'AWS_KINESIS',
    ARRAY['LARGE_TRANSACTION', 'SUSPICIOUS_ACTIVITY', 'ACCOUNT_BLOCK'],
    '{"stream":"trinidad-regulatory-events","region":"us-east-1","partitionKey":"${eventType}"}',
    'ACTIVE',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM event_stream WHERE name = 'Trinidad Regulatory Event Stream');

-- 8. Event Stream Statistics
DO $$
DECLARE
    stream_id_1 UUID;
    stream_id_2 UUID;
    stream_id_3 UUID;
BEGIN
    SELECT id INTO stream_id_1 FROM event_stream WHERE name = 'Trinidad Transaction Stream';
    SELECT id INTO stream_id_2 FROM event_stream WHERE name = 'Trinidad Client Activity Stream';
    SELECT id INTO stream_id_3 FROM event_stream WHERE name = 'Trinidad Regulatory Event Stream';
    
    -- Transaction Stream
    INSERT INTO event_stream_stats (
        stream_id,
        date,
        event_type,
        messages_sent,
        bytes_sent,
        errors
    )
    SELECT 
        stream_id_1,
        NOW()::date,
        'TRANSACTION',
        4562,
        7658945,
        3
    WHERE stream_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM event_stream_stats 
        WHERE stream_id = stream_id_1 
        AND date = NOW()::date
        AND event_type = 'TRANSACTION'
    );
    
    INSERT INTO event_stream_stats (
        stream_id,
        date,
        event_type,
        messages_sent,
        bytes_sent,
        errors
    )
    SELECT 
        stream_id_1,
        NOW()::date,
        'LOAN_DISBURSEMENT',
        45,
        234567,
        0
    WHERE stream_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM event_stream_stats 
        WHERE stream_id = stream_id_1 
        AND date = NOW()::date
        AND event_type = 'LOAN_DISBURSEMENT'
    );
    
    INSERT INTO event_stream_stats (
        stream_id,
        date,
        event_type,
        messages_sent,
        bytes_sent,
        errors
    )
    SELECT 
        stream_id_1,
        NOW()::date,
        'DEPOSIT',
        987,
        3456789,
        2
    WHERE stream_id_1 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM event_stream_stats 
        WHERE stream_id = stream_id_1 
        AND date = NOW()::date
        AND event_type = 'DEPOSIT'
    );
    
    -- Client Activity Stream
    INSERT INTO event_stream_stats (
        stream_id,
        date,
        event_type,
        messages_sent,
        bytes_sent,
        errors
    )
    SELECT 
        stream_id_2,
        NOW()::date,
        'CLIENT_CREATED',
        23,
        345678,
        0
    WHERE stream_id_2 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM event_stream_stats 
        WHERE stream_id = stream_id_2 
        AND date = NOW()::date
        AND event_type = 'CLIENT_CREATED'
    );
    
    INSERT INTO event_stream_stats (
        stream_id,
        date,
        event_type,
        messages_sent,
        bytes_sent,
        errors
    )
    SELECT 
        stream_id_2,
        NOW()::date,
        'ACCOUNT_OPENED',
        56,
        876543,
        1
    WHERE stream_id_2 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM event_stream_stats 
        WHERE stream_id = stream_id_2 
        AND date = NOW()::date
        AND event_type = 'ACCOUNT_OPENED'
    );
    
    -- Regulatory Stream
    INSERT INTO event_stream_stats (
        stream_id,
        date,
        event_type,
        messages_sent,
        bytes_sent,
        errors
    )
    SELECT 
        stream_id_3,
        NOW()::date,
        'LARGE_TRANSACTION',
        12,
        123456,
        0
    WHERE stream_id_3 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM event_stream_stats 
        WHERE stream_id = stream_id_3 
        AND date = NOW()::date
        AND event_type = 'LARGE_TRANSACTION'
    );
    
    INSERT INTO event_stream_stats (
        stream_id,
        date,
        event_type,
        messages_sent,
        bytes_sent,
        errors
    )
    SELECT 
        stream_id_3,
        NOW()::date,
        'SUSPICIOUS_ACTIVITY',
        3,
        45678,
        0
    WHERE stream_id_3 IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM event_stream_stats 
        WHERE stream_id = stream_id_3 
        AND date = NOW()::date
        AND event_type = 'SUSPICIOUS_ACTIVITY'
    );
END $$;

-- 9. Create a view to access Trinidad integration data
CREATE OR REPLACE VIEW trinidad_integration_summary AS
SELECT 
    'API Clients' AS integration_type, 
    COUNT(*) AS count, 
    STRING_AGG(name, ', ') AS items
FROM 
    api_client
WHERE 
    name LIKE 'Trinidad%'
UNION ALL
SELECT 
    'Webhooks' AS integration_type, 
    COUNT(*) AS count, 
    STRING_AGG(name, ', ') AS items
FROM 
    webhook
WHERE 
    name LIKE 'Trinidad%'
UNION ALL
SELECT 
    'Data Exchange Configs' AS integration_type, 
    COUNT(*) AS count, 
    STRING_AGG(name, ', ') AS items
FROM 
    data_exchange_config
WHERE 
    name LIKE 'Trinidad%'
UNION ALL
SELECT 
    'Event Streams' AS integration_type, 
    COUNT(*) AS count, 
    STRING_AGG(name, ', ') AS items
FROM 
    event_stream
WHERE 
    name LIKE 'Trinidad%';

-- Done! Trinidad integration data has been created