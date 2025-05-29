-- Create table for recurring deposit metrics cache
CREATE TABLE IF NOT EXISTS recurring_deposit_metrics_cache (
    id VARCHAR(36) PRIMARY KEY,
    metrics_data JSONB NOT NULL,
    generated_date TIMESTAMP NOT NULL,
    total_accounts INTEGER NOT NULL,
    active_accounts INTEGER NOT NULL,
    total_deposits DECIMAL(19, 6) NOT NULL,
    total_interest_earned DECIMAL(19, 6) NOT NULL,
    compliance_rate DECIMAL(5, 2) NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on generated date for faster queries
CREATE INDEX IF NOT EXISTS idx_rd_metrics_cache_generated_date
ON recurring_deposit_metrics_cache(generated_date);

-- Create table for metrics dashboard configuration
CREATE TABLE IF NOT EXISTS recurring_deposit_dashboard_config (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    dashboard_name VARCHAR(100) NOT NULL,
    widgets_config JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100),
    last_modified_date TIMESTAMP
);

-- Create index on user ID for faster lookups
CREATE INDEX IF NOT EXISTS idx_rd_dashboard_config_user_id
ON recurring_deposit_dashboard_config(user_id);

-- Create unique index to ensure only one default dashboard per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_rd_dashboard_config_user_default
ON recurring_deposit_dashboard_config(user_id, is_default)
WHERE is_default = TRUE;

-- Create table for metrics dashboard widgets
CREATE TABLE IF NOT EXISTS recurring_deposit_dashboard_widget (
    id VARCHAR(36) PRIMARY KEY,
    widget_type VARCHAR(50) NOT NULL,
    widget_title VARCHAR(100) NOT NULL,
    widget_description TEXT,
    widget_config JSONB NOT NULL,
    is_system_widget BOOLEAN NOT NULL DEFAULT FALSE, -- System widgets cannot be deleted
    created_by VARCHAR(100),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100),
    last_modified_date TIMESTAMP
);

-- Insert default system widgets
INSERT INTO recurring_deposit_dashboard_widget (
    id, widget_type, widget_title, widget_description, widget_config, is_system_widget
)
VALUES
(
    'a1b2c3d4-1234-5678-9abc-def123456789',
    'general_stats',
    'Account Overview',
    'Shows general statistics about recurring deposit accounts',
    '{"stats": ["totalAccounts", "activeAccounts", "totalDeposits", "totalInterestPosted"]}',
    TRUE
),
(
    'b2c3d4e5-2345-6789-abcd-ef1234567890',
    'compliance_chart',
    'Installment Compliance',
    'Shows compliance rate for recurring deposit installments',
    '{"chartType": "line", "timeframe": "monthly"}',
    TRUE
),
(
    'c3d4e5f6-3456-789a-bcde-f12345678901',
    'maturity_forecast',
    'Maturity Forecast',
    'Shows upcoming maturities for recurring deposit accounts',
    '{"forecastPeriod": 90, "showAmounts": true}',
    TRUE
),
(
    'd4e5f6g7-4567-89ab-cdef-123456789012',
    'deposit_trends',
    'Deposit Trends',
    'Shows deposit trends for recurring deposit accounts',
    '{"chartType": "line", "timeframe": "monthly"}',
    TRUE
),
(
    'e5f6g7h8-5678-9abc-def1-234567890123',
    'product_performance',
    'Product Performance',
    'Shows performance metrics for recurring deposit products',
    '{"metrics": ["totalAccounts", "totalDeposits", "averageDepositAmount"]}',
    TRUE
),
(
    'f6g7h8i9-6789-abcd-ef12-345678901234',
    'recent_activity',
    'Recent Activity',
    'Shows recent activities for recurring deposit accounts',
    '{"limit": 10, "activityTypes": ["deposit", "interest_posting", "account_maturity"]}',
    TRUE
) ON CONFLICT DO NOTHING;