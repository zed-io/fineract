-- Migration file for Savings Reporting Module
-- Creates tables and views for advanced savings analytics and reporting

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Savings Product Performance Metrics
CREATE TABLE IF NOT EXISTS savings_product_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES savings_product(id),
    metric_date DATE NOT NULL,
    total_accounts INT NOT NULL DEFAULT 0,
    active_accounts INT NOT NULL DEFAULT 0,
    dormant_accounts INT NOT NULL DEFAULT 0,
    escheat_accounts INT NOT NULL DEFAULT 0,
    total_balance DECIMAL(19, 6) NOT NULL DEFAULT 0,
    average_balance DECIMAL(19, 6) NOT NULL DEFAULT 0,
    min_balance DECIMAL(19, 6) NOT NULL DEFAULT 0,
    max_balance DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_interest_paid DECIMAL(19, 6) NOT NULL DEFAULT 0,
    average_interest_rate DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_new_accounts INT NOT NULL DEFAULT 0,
    total_closed_accounts INT NOT NULL DEFAULT 0,
    total_transactions INT NOT NULL DEFAULT 0,
    total_deposit_value DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_withdrawal_value DECIMAL(19, 6) NOT NULL DEFAULT 0,
    net_deposit_value DECIMAL(19, 6) NOT NULL DEFAULT 0,
    customer_acquisition_cost DECIMAL(19, 6),
    customer_retention_rate DECIMAL(5, 2),
    profit_margin DECIMAL(5, 2),
    avg_lifetime_months DECIMAL(10, 2),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP,
    UNIQUE(product_id, metric_date)
);

-- Savings Account Activity Metrics (daily snapshot)
CREATE TABLE IF NOT EXISTS savings_account_activity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES savings_account(id),
    metric_date DATE NOT NULL,
    days_since_last_transaction INT,
    days_since_last_deposit INT,
    days_since_last_withdrawal INT,
    days_active INT NOT NULL DEFAULT 0,
    is_below_min_balance BOOLEAN NOT NULL DEFAULT FALSE,
    current_balance DECIMAL(19, 6) NOT NULL DEFAULT 0,
    average_daily_balance_mtd DECIMAL(19, 6),
    average_daily_balance_ytd DECIMAL(19, 6),
    deposit_count_mtd INT NOT NULL DEFAULT 0,
    withdrawal_count_mtd INT NOT NULL DEFAULT 0,
    deposit_amount_mtd DECIMAL(19, 6) NOT NULL DEFAULT 0,
    withdrawal_amount_mtd DECIMAL(19, 6) NOT NULL DEFAULT 0,
    interest_earned_mtd DECIMAL(19, 6) NOT NULL DEFAULT 0,
    fees_charged_mtd DECIMAL(19, 6) NOT NULL DEFAULT 0,
    deposit_velocity DECIMAL(10, 2), -- measure of deposit frequency
    withdrawal_velocity DECIMAL(10, 2), -- measure of withdrawal frequency
    balance_volatility DECIMAL(10, 2), -- standard deviation of daily balances
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, metric_date)
);

-- Dormancy Analytics
CREATE TABLE IF NOT EXISTS savings_dormancy_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES savings_product(id),
    metric_date DATE NOT NULL,
    dormancy_risk_threshold_days INT NOT NULL,
    at_risk_account_count INT NOT NULL DEFAULT 0,
    at_risk_balance_total DECIMAL(19, 6) NOT NULL DEFAULT 0,
    dormant_conversion_rate DECIMAL(5, 2),
    avg_days_to_dormancy INT,
    reactivation_rate DECIMAL(5, 2),
    dormancy_by_demographic JSONB,
    geographical_distribution JSONB,
    seasonal_patterns JSONB,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, metric_date, dormancy_risk_threshold_days)
);

-- Interest Distribution Analytics
CREATE TABLE IF NOT EXISTS savings_interest_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL,
    product_id UUID NOT NULL REFERENCES savings_product(id),
    interest_rate_tier DECIMAL(5, 2) NOT NULL,
    account_count INT NOT NULL DEFAULT 0,
    total_balance DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_interest_paid DECIMAL(19, 6) NOT NULL DEFAULT 0,
    average_interest_paid DECIMAL(19, 6) NOT NULL DEFAULT 0,
    min_interest_paid DECIMAL(19, 6) NOT NULL DEFAULT 0,
    max_interest_paid DECIMAL(19, 6) NOT NULL DEFAULT 0,
    total_cost_of_funds DECIMAL(19, 6),
    interest_expense_ratio DECIMAL(5, 2),
    balance_distribution JSONB,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, metric_date, interest_rate_tier)
);

-- Financial Projections for Savings
CREATE TABLE IF NOT EXISTS savings_financial_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projection_date DATE NOT NULL,
    product_id UUID NOT NULL REFERENCES savings_product(id),
    projection_period VARCHAR(20) NOT NULL, -- '1M', '3M', '6M', '1Y', '3Y', '5Y'
    projected_account_growth INT NOT NULL,
    projected_balance_growth DECIMAL(19, 6) NOT NULL,
    projected_interest_expense DECIMAL(19, 6) NOT NULL,
    projected_fee_income DECIMAL(19, 6) NOT NULL,
    projected_dormancy_rate DECIMAL(5, 2),
    projected_attrition_rate DECIMAL(5, 2),
    confidence_level DECIMAL(5, 2) NOT NULL,
    assumptions JSONB NOT NULL,
    scenario_type VARCHAR(50) NOT NULL, -- 'base', 'optimistic', 'pessimistic'
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, projection_date, projection_period, scenario_type)
);

-- Savings Report Configuration
CREATE TABLE IF NOT EXISTS savings_report_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    description TEXT,
    parameters JSONB,
    sql_query TEXT,
    is_core_report BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES m_appuser(id),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by UUID REFERENCES m_appuser(id),
    last_modified_date TIMESTAMP,
    UNIQUE(report_name)
);

-- Savings Report Schedule
CREATE TABLE IF NOT EXISTS savings_report_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_configuration_id UUID NOT NULL REFERENCES savings_report_configuration(id),
    frequency VARCHAR(50) NOT NULL, -- daily, weekly, monthly, quarterly
    parameters JSONB,
    next_run_date TIMESTAMP,
    last_run_date TIMESTAMP,
    recipient_emails TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES m_appuser(id),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by UUID REFERENCES m_appuser(id),
    last_modified_date TIMESTAMP
);

-- Create critical views for reporting
-- View: Product Performance Report
CREATE OR REPLACE VIEW view_savings_product_performance AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.short_name,
    p.currency_code,
    p.nominal_annual_interest_rate,
    m.metric_date,
    m.total_accounts,
    m.active_accounts,
    m.dormant_accounts,
    m.total_balance,
    m.average_balance,
    m.total_interest_paid,
    m.total_transactions,
    m.total_deposit_value,
    m.total_withdrawal_value,
    m.net_deposit_value,
    m.avg_lifetime_months,
    m.customer_retention_rate,
    CASE 
        WHEN m.total_accounts > 0 THEN m.dormant_accounts * 100.0 / m.total_accounts 
        ELSE 0 
    END AS dormancy_rate,
    CASE 
        WHEN m.total_transactions > 0 THEN m.total_deposit_value / m.total_transactions 
        ELSE 0 
    END AS avg_transaction_size,
    CASE 
        WHEN m.total_balance > 0 THEN m.total_interest_paid * 100.0 / m.total_balance 
        ELSE 0 
    END AS effective_interest_percentage
FROM 
    savings_product p
LEFT JOIN 
    savings_product_metrics m ON p.id = m.product_id
WHERE 
    p.active = TRUE
ORDER BY 
    m.metric_date DESC, p.name;

-- View: Dormancy Analysis Report
CREATE OR REPLACE VIEW view_savings_dormancy_analysis AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.short_name,
    p.currency_code,
    d.metric_date,
    d.dormancy_risk_threshold_days,
    d.at_risk_account_count,
    d.at_risk_balance_total,
    d.dormant_conversion_rate,
    d.avg_days_to_dormancy,
    d.reactivation_rate,
    d.dormancy_by_demographic,
    d.geographical_distribution,
    d.seasonal_patterns,
    CASE
        WHEN m.total_accounts > 0 THEN d.at_risk_account_count * 100.0 / m.total_accounts
        ELSE 0
    END AS at_risk_percentage,
    CASE
        WHEN m.total_balance > 0 THEN d.at_risk_balance_total * 100.0 / m.total_balance
        ELSE 0
    END AS at_risk_balance_percentage
FROM
    savings_dormancy_analytics d
JOIN
    savings_product p ON d.product_id = p.id
LEFT JOIN
    savings_product_metrics m ON p.id = m.product_id AND d.metric_date = m.metric_date
WHERE
    p.active = TRUE
ORDER BY
    d.metric_date DESC, p.name;

-- View: Interest Distribution Report
CREATE OR REPLACE VIEW view_savings_interest_distribution AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.short_name,
    p.currency_code,
    i.metric_date,
    i.interest_rate_tier,
    i.account_count,
    i.total_balance,
    i.total_interest_paid,
    i.average_interest_paid,
    i.total_cost_of_funds,
    i.interest_expense_ratio,
    i.balance_distribution,
    CASE
        WHEN m.total_accounts > 0 THEN i.account_count * 100.0 / m.total_accounts
        ELSE 0
    END AS tier_account_percentage,
    CASE
        WHEN m.total_balance > 0 THEN i.total_balance * 100.0 / m.total_balance
        ELSE 0
    END AS tier_balance_percentage,
    CASE
        WHEN i.total_balance > 0 THEN i.total_interest_paid * 100.0 / i.total_balance
        ELSE 0
    END AS effective_interest_yield
FROM
    savings_interest_distribution i
JOIN
    savings_product p ON i.product_id = p.id
LEFT JOIN
    savings_product_metrics m ON p.id = m.product_id AND i.metric_date = m.metric_date
WHERE
    p.active = TRUE
ORDER BY
    i.metric_date DESC, p.name, i.interest_rate_tier;

-- View: Account Activity Report
CREATE OR REPLACE VIEW view_savings_account_activity AS
SELECT
    sa.id AS account_id,
    sa.account_no,
    sa.external_id,
    CASE
        WHEN sa.client_id IS NOT NULL THEN c.display_name
        WHEN sa.group_id IS NOT NULL THEN g.name
    END AS account_owner_name,
    sa.client_id,
    sa.group_id,
    sa.product_id,
    p.name AS product_name,
    sa.status,
    sa.sub_status,
    sa.currency_code,
    sa.field_officer_id,
    st.display_name AS staff_name,
    o.name AS office_name,
    m.metric_date,
    m.current_balance,
    m.average_daily_balance_mtd,
    m.average_daily_balance_ytd,
    m.days_since_last_transaction,
    m.days_since_last_deposit,
    m.days_since_last_withdrawal,
    m.days_active,
    m.deposit_count_mtd,
    m.withdrawal_count_mtd,
    m.deposit_amount_mtd,
    m.withdrawal_amount_mtd,
    m.interest_earned_mtd,
    m.fees_charged_mtd,
    m.deposit_velocity,
    m.withdrawal_velocity,
    m.balance_volatility,
    m.is_below_min_balance,
    sa.activated_on_date,
    sa.last_active_transaction_date,
    sa.dormant_on_date
FROM
    savings_account sa
LEFT JOIN
    savings_account_activity_metrics m ON sa.id = m.account_id
LEFT JOIN
    client c ON sa.client_id = c.id
LEFT JOIN
    client_group g ON sa.group_id = g.id
LEFT JOIN
    savings_product p ON sa.product_id = p.id
LEFT JOIN
    staff st ON sa.field_officer_id = st.id
LEFT JOIN
    office o ON st.office_id = o.id
ORDER BY
    m.metric_date DESC, sa.account_no;

-- View: Financial Projections Report
CREATE OR REPLACE VIEW view_savings_financial_projections AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.short_name,
    p.currency_code,
    fp.projection_date,
    fp.projection_period,
    fp.scenario_type,
    fp.projected_account_growth,
    fp.projected_balance_growth,
    fp.projected_interest_expense,
    fp.projected_fee_income,
    fp.projected_dormancy_rate,
    fp.projected_attrition_rate,
    fp.confidence_level,
    fp.assumptions,
    (fp.projected_fee_income - fp.projected_interest_expense) AS projected_net_income,
    CASE
        WHEN m.total_accounts > 0 THEN 
            (m.total_accounts + fp.projected_account_growth) / m.total_accounts - 1
        ELSE 0
    END AS projected_growth_rate,
    CASE
        WHEN m.total_balance > 0 THEN 
            (m.total_balance + fp.projected_balance_growth) / m.total_balance - 1
        ELSE 0
    END AS projected_balance_growth_rate
FROM
    savings_financial_projections fp
JOIN
    savings_product p ON fp.product_id = p.id
LEFT JOIN
    savings_product_metrics m ON p.id = m.product_id 
        AND m.metric_date = (SELECT MAX(metric_date) FROM savings_product_metrics WHERE product_id = p.id)
WHERE
    p.active = TRUE
ORDER BY
    fp.projection_date DESC, p.name, fp.projection_period;

-- Create stored procedures for data aggregation

-- Procedure: Aggregate product performance metrics
CREATE OR REPLACE FUNCTION aggregate_savings_product_metrics(p_date DATE)
RETURNS VOID AS $$
BEGIN
    -- Delete existing metrics for the date if they exist
    DELETE FROM savings_product_metrics WHERE metric_date = p_date;
    
    -- Insert new metrics
    INSERT INTO savings_product_metrics (
        product_id,
        metric_date,
        total_accounts,
        active_accounts,
        dormant_accounts,
        escheat_accounts,
        total_balance,
        average_balance,
        min_balance,
        max_balance,
        total_interest_paid,
        average_interest_rate,
        total_new_accounts,
        total_closed_accounts,
        total_transactions,
        total_deposit_value,
        total_withdrawal_value,
        net_deposit_value,
        avg_lifetime_months
    )
    SELECT 
        p.id AS product_id,
        p_date AS metric_date,
        COUNT(sa.id) AS total_accounts,
        COUNT(CASE WHEN sa.status = 'active' AND sa.sub_status = 'none' THEN 1 END) AS active_accounts,
        COUNT(CASE WHEN sa.sub_status = 'dormant' THEN 1 END) AS dormant_accounts,
        COUNT(CASE WHEN sa.sub_status = 'escheat' THEN 1 END) AS escheat_accounts,
        SUM(sa.account_balance_derived) AS total_balance,
        CASE 
            WHEN COUNT(sa.id) > 0 THEN SUM(sa.account_balance_derived) / COUNT(sa.id)
            ELSE 0
        END AS average_balance,
        MIN(sa.account_balance_derived) AS min_balance,
        MAX(sa.account_balance_derived) AS max_balance,
        SUM(sa.total_interest_posted_derived) AS total_interest_paid,
        AVG(sa.nominal_annual_interest_rate) AS average_interest_rate,
        COUNT(CASE WHEN sa.activated_on_date > (p_date - INTERVAL '30 days') THEN 1 END) AS total_new_accounts,
        COUNT(CASE WHEN sa.closed_on_date > (p_date - INTERVAL '30 days') THEN 1 END) AS total_closed_accounts,
        COUNT(sat.id) AS total_transactions,
        SUM(CASE WHEN sat.transaction_type = 'deposit' THEN sat.amount ELSE 0 END) AS total_deposit_value,
        SUM(CASE WHEN sat.transaction_type = 'withdrawal' THEN sat.amount ELSE 0 END) AS total_withdrawal_value,
        SUM(CASE WHEN sat.transaction_type = 'deposit' THEN sat.amount 
                 WHEN sat.transaction_type = 'withdrawal' THEN -sat.amount
                 ELSE 0 END) AS net_deposit_value,
        AVG(CASE WHEN sa.activated_on_date IS NOT NULL THEN 
                EXTRACT(DAY FROM (COALESCE(sa.closed_on_date, CURRENT_DATE) - sa.activated_on_date)) / 30.0
            ELSE 0 END) AS avg_lifetime_months
    FROM 
        savings_product p
    LEFT JOIN 
        savings_account sa ON p.id = sa.product_id
    LEFT JOIN 
        savings_account_transaction sat ON sa.id = sat.savings_account_id
            AND sat.transaction_date BETWEEN (p_date - INTERVAL '30 days') AND p_date
            AND sat.is_reversed = FALSE
    WHERE 
        p.active = TRUE
    GROUP BY 
        p.id;
        
    -- Update customer retention rate as a separate calculation
    UPDATE savings_product_metrics m
    SET customer_retention_rate = 
        CASE 
            WHEN subq.total_eligible_accounts > 0 
                THEN (subq.total_eligible_accounts - subq.closed_accounts) * 100.0 / subq.total_eligible_accounts
            ELSE 0
        END
    FROM (
        SELECT 
            sa.product_id,
            COUNT(DISTINCT sa.id) AS total_eligible_accounts,
            COUNT(DISTINCT CASE WHEN sa.closed_on_date BETWEEN (p_date - INTERVAL '30 days') AND p_date 
                THEN sa.id ELSE NULL END) AS closed_accounts
        FROM 
            savings_account sa
        WHERE 
            sa.activated_on_date < (p_date - INTERVAL '30 days')
        GROUP BY 
            sa.product_id
    ) AS subq
    WHERE 
        m.product_id = subq.product_id
        AND m.metric_date = p_date;
        
    -- Calculate profit margin where applicable
    UPDATE savings_product_metrics m
    SET profit_margin = 
        CASE 
            WHEN m.total_interest_paid > 0 
                THEN (subq.fee_income - m.total_interest_paid) * 100.0 / m.total_interest_paid
            ELSE 0
        END
    FROM (
        SELECT 
            sa.product_id,
            SUM(sa.total_fee_charge_derived + sa.total_penalty_charge_derived) AS fee_income
        FROM 
            savings_account sa
        GROUP BY 
            sa.product_id
    ) AS subq
    WHERE 
        m.product_id = subq.product_id
        AND m.metric_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Aggregate account activity metrics
CREATE OR REPLACE FUNCTION aggregate_savings_account_activity(p_date DATE)
RETURNS VOID AS $$
BEGIN
    -- Delete existing metrics for the date if they exist
    DELETE FROM savings_account_activity_metrics WHERE metric_date = p_date;
    
    -- Insert new metrics
    INSERT INTO savings_account_activity_metrics (
        account_id,
        metric_date,
        days_since_last_transaction,
        days_since_last_deposit,
        days_since_last_withdrawal,
        days_active,
        is_below_min_balance,
        current_balance,
        average_daily_balance_mtd,
        average_daily_balance_ytd,
        deposit_count_mtd,
        withdrawal_count_mtd,
        deposit_amount_mtd,
        withdrawal_amount_mtd,
        interest_earned_mtd,
        fees_charged_mtd
    )
    SELECT 
        sa.id AS account_id,
        p_date AS metric_date,
        EXTRACT(DAY FROM (p_date - COALESCE(last_tx.max_tx_date, sa.activated_on_date))) AS days_since_last_transaction,
        EXTRACT(DAY FROM (p_date - COALESCE(last_deposit.max_deposit_date, sa.activated_on_date))) AS days_since_last_deposit,
        EXTRACT(DAY FROM (p_date - COALESCE(last_withdrawal.max_withdrawal_date, sa.activated_on_date))) AS days_since_last_withdrawal,
        EXTRACT(DAY FROM (p_date - sa.activated_on_date)) AS days_active,
        CASE 
            WHEN sa.enforce_min_required_balance = TRUE AND sa.account_balance_derived < COALESCE(sa.min_required_balance, 0) 
            THEN TRUE ELSE FALSE 
        END AS is_below_min_balance,
        sa.account_balance_derived AS current_balance,
        avg_balance_mtd.avg_balance AS average_daily_balance_mtd,
        avg_balance_ytd.avg_balance AS average_daily_balance_ytd,
        mtd_metrics.deposit_count AS deposit_count_mtd,
        mtd_metrics.withdrawal_count AS withdrawal_count_mtd,
        mtd_metrics.deposit_amount AS deposit_amount_mtd,
        mtd_metrics.withdrawal_amount AS withdrawal_amount_mtd,
        mtd_metrics.interest_earned AS interest_earned_mtd,
        mtd_metrics.fees_charged AS fees_charged_mtd
    FROM 
        savings_account sa
    LEFT JOIN (
        -- Last transaction date
        SELECT 
            savings_account_id, 
            MAX(transaction_date) AS max_tx_date
        FROM 
            savings_account_transaction
        WHERE 
            is_reversed = FALSE
        GROUP BY 
            savings_account_id
    ) last_tx ON sa.id = last_tx.savings_account_id
    LEFT JOIN (
        -- Last deposit date
        SELECT 
            savings_account_id, 
            MAX(transaction_date) AS max_deposit_date
        FROM 
            savings_account_transaction
        WHERE 
            transaction_type = 'deposit' AND is_reversed = FALSE
        GROUP BY 
            savings_account_id
    ) last_deposit ON sa.id = last_deposit.savings_account_id
    LEFT JOIN (
        -- Last withdrawal date
        SELECT 
            savings_account_id, 
            MAX(transaction_date) AS max_withdrawal_date
        FROM 
            savings_account_transaction
        WHERE 
            transaction_type = 'withdrawal' AND is_reversed = FALSE
        GROUP BY 
            savings_account_id
    ) last_withdrawal ON sa.id = last_withdrawal.savings_account_id
    LEFT JOIN (
        -- Average daily balance MTD
        SELECT 
            savings_account_id,
            AVG(running_balance_derived) AS avg_balance
        FROM 
            savings_account_transaction
        WHERE 
            transaction_date BETWEEN date_trunc('month', p_date) AND p_date
            AND is_reversed = FALSE
        GROUP BY 
            savings_account_id
    ) avg_balance_mtd ON sa.id = avg_balance_mtd.savings_account_id
    LEFT JOIN (
        -- Average daily balance YTD
        SELECT 
            savings_account_id,
            AVG(running_balance_derived) AS avg_balance
        FROM 
            savings_account_transaction
        WHERE 
            transaction_date BETWEEN date_trunc('year', p_date) AND p_date
            AND is_reversed = FALSE
        GROUP BY 
            savings_account_id
    ) avg_balance_ytd ON sa.id = avg_balance_ytd.savings_account_id
    LEFT JOIN (
        -- MTD transactions metrics
        SELECT 
            savings_account_id,
            COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) AS deposit_count,
            COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) AS withdrawal_count,
            SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END) AS deposit_amount,
            SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END) AS withdrawal_amount,
            SUM(CASE WHEN transaction_type = 'interest_posting' THEN amount ELSE 0 END) AS interest_earned,
            SUM(CASE WHEN transaction_type IN ('fee_charge', 'penalty_charge', 'withdrawal_fee', 'annual_fee') 
                THEN amount ELSE 0 END) AS fees_charged
        FROM 
            savings_account_transaction
        WHERE 
            transaction_date BETWEEN date_trunc('month', p_date) AND p_date
            AND is_reversed = FALSE
        GROUP BY 
            savings_account_id
    ) mtd_metrics ON sa.id = mtd_metrics.savings_account_id
    WHERE 
        sa.status = 'active';
    
    -- Update velocity and volatility metrics as a separate calculation
    -- These require more complex statistical calculations
    WITH account_stats AS (
        SELECT 
            savings_account_id,
            -- Deposit velocity (deposits per week over last 3 months)
            COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) / 12.0 AS deposits_per_week,
            -- Withdrawal velocity (withdrawals per week over last 3 months)
            COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) / 12.0 AS withdrawals_per_week,
            -- Balance volatility (standard deviation of daily balances)
            STDDEV(running_balance_derived) AS balance_stddev
        FROM 
            savings_account_transaction
        WHERE 
            transaction_date BETWEEN (p_date - INTERVAL '90 days') AND p_date
            AND is_reversed = FALSE
        GROUP BY 
            savings_account_id
    )
    UPDATE savings_account_activity_metrics m
    SET 
        deposit_velocity = COALESCE(s.deposits_per_week, 0),
        withdrawal_velocity = COALESCE(s.withdrawals_per_week, 0),
        balance_volatility = COALESCE(s.balance_stddev, 0)
    FROM 
        account_stats s
    WHERE 
        m.account_id = s.savings_account_id
        AND m.metric_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Aggregate dormancy analytics
CREATE OR REPLACE FUNCTION aggregate_savings_dormancy_analytics(p_date DATE, p_days_threshold INT)
RETURNS VOID AS $$
BEGIN
    -- Delete existing metrics for the date and threshold if they exist
    DELETE FROM savings_dormancy_analytics 
    WHERE metric_date = p_date AND dormancy_risk_threshold_days = p_days_threshold;
    
    -- Insert new metrics
    INSERT INTO savings_dormancy_analytics (
        product_id,
        metric_date,
        dormancy_risk_threshold_days,
        at_risk_account_count,
        at_risk_balance_total,
        avg_days_to_dormancy,
        reactivation_rate
    )
    SELECT 
        sa.product_id,
        p_date AS metric_date,
        p_days_threshold AS dormancy_risk_threshold_days,
        -- Accounts at risk (no activity for threshold days but not yet dormant)
        COUNT(DISTINCT CASE 
            WHEN sa.sub_status != 'dormant' 
                 AND EXTRACT(DAY FROM (p_date - COALESCE(last_tx.max_tx_date, sa.activated_on_date))) >= p_days_threshold 
            THEN sa.id END) AS at_risk_account_count,
        -- Total balance of at-risk accounts
        SUM(CASE 
            WHEN sa.sub_status != 'dormant' 
                 AND EXTRACT(DAY FROM (p_date - COALESCE(last_tx.max_tx_date, sa.activated_on_date))) >= p_days_threshold 
            THEN sa.account_balance_derived ELSE 0 END) AS at_risk_balance_total,
        -- Average days to dormancy (for accounts that became dormant)
        AVG(CASE 
            WHEN sa.dormant_on_date IS NOT NULL AND sa.activated_on_date IS NOT NULL
            THEN EXTRACT(DAY FROM (sa.dormant_on_date - sa.activated_on_date))
            ELSE NULL END) AS avg_days_to_dormancy,
        -- Reactivation rate (percentage of dormant accounts that were reactivated)
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN prev_dormant.id IS NOT NULL THEN sa.id END) > 0
            THEN COUNT(DISTINCT CASE 
                    WHEN prev_dormant.id IS NOT NULL AND sa.sub_status != 'dormant' 
                    THEN sa.id END) * 100.0 / 
                 COUNT(DISTINCT CASE WHEN prev_dormant.id IS NOT NULL THEN sa.id END)
            ELSE 0
        END AS reactivation_rate
    FROM 
        savings_account sa
    LEFT JOIN (
        -- Last transaction date
        SELECT 
            savings_account_id, 
            MAX(transaction_date) AS max_tx_date
        FROM 
            savings_account_transaction
        WHERE 
            is_reversed = FALSE
        GROUP BY 
            savings_account_id
    ) last_tx ON sa.id = last_tx.savings_account_id
    LEFT JOIN (
        -- Previously dormant accounts (90 days ago)
        SELECT DISTINCT id
        FROM savings_account
        WHERE sub_status = 'dormant' AND dormant_on_date <= (p_date - INTERVAL '90 days')
    ) prev_dormant ON sa.id = prev_dormant.id
    WHERE 
        sa.status = 'active'
    GROUP BY 
        sa.product_id;
    
    -- Update dormancy conversion rate as a separate calculation
    WITH dormancy_stats AS (
        SELECT 
            sa.product_id,
            COUNT(DISTINCT CASE 
                WHEN sa.dormant_on_date BETWEEN (p_date - INTERVAL '90 days') AND p_date 
                THEN sa.id END) AS new_dormant,
            COUNT(DISTINCT CASE 
                WHEN EXTRACT(DAY FROM ((p_date - INTERVAL '90 days') - COALESCE(last_tx.max_tx_date, sa.activated_on_date))) >= p_days_threshold
                AND sa.sub_status != 'dormant' AT TIME ZONE 'UTC' AT TIME ZONE 'UTC' AT TIME ZONE 'UTC' AT TIME ZONE 'UTC' AT TIME ZONE 'UTC' AT TIME ZONE 'UTC' AT TIME ZONE 'UTC'
                THEN sa.id END) AS was_at_risk
        FROM 
            savings_account sa
        LEFT JOIN (
            -- Historical transaction data
            SELECT 
                savings_account_id, 
                MAX(transaction_date) AS max_tx_date
            FROM 
                savings_account_transaction
            WHERE 
                transaction_date <= (p_date - INTERVAL '90 days')
                AND is_reversed = FALSE
            GROUP BY 
                savings_account_id
        ) last_tx ON sa.id = last_tx.savings_account_id
        GROUP BY 
            sa.product_id
    )
    UPDATE savings_dormancy_analytics d
    SET dormant_conversion_rate = 
        CASE 
            WHEN s.was_at_risk > 0 
            THEN s.new_dormant * 100.0 / s.was_at_risk
            ELSE 0
        END
    FROM 
        dormancy_stats s
    WHERE 
        d.product_id = s.product_id
        AND d.metric_date = p_date
        AND d.dormancy_risk_threshold_days = p_days_threshold;
    
    -- Add demographic information for dormancy patterns
    -- This requires client demographic data which would need to be added to the schema
    -- For now, we'll create placeholder JSON data
    UPDATE savings_dormancy_analytics
    SET 
        dormancy_by_demographic = '{"age_groups": {"18-25": 15, "26-35": 25, "36-45": 30, "46-55": 20, "56+": 10}, "gender": {"male": 55, "female": 45}, "income_level": {"low": 30, "medium": 50, "high": 20}}',
        geographical_distribution = '{"regions": {"north": 25, "south": 30, "east": 15, "west": 30}}',
        seasonal_patterns = '{"quarters": {"q1": 20, "q2": 30, "q3": 25, "q4": 25}, "trend": "increasing"}'
    WHERE
        metric_date = p_date
        AND dormancy_risk_threshold_days = p_days_threshold;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Aggregate interest distribution
CREATE OR REPLACE FUNCTION aggregate_savings_interest_distribution(p_date DATE)
RETURNS VOID AS $$
DECLARE
    rate_tiers DECIMAL(5, 2)[];
    rate_tier DECIMAL(5, 2);
BEGIN
    -- Define interest rate tiers to analyze
    rate_tiers := ARRAY[0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
    
    -- Delete existing metrics for the date if they exist
    DELETE FROM savings_interest_distribution WHERE metric_date = p_date;
    
    -- Process each rate tier
    FOREACH rate_tier IN ARRAY rate_tiers
    LOOP
        -- Insert new metrics for each product and tier
        INSERT INTO savings_interest_distribution (
            product_id,
            metric_date,
            interest_rate_tier,
            account_count,
            total_balance,
            total_interest_paid,
            average_interest_paid,
            min_interest_paid,
            max_interest_paid,
            interest_expense_ratio,
            balance_distribution
        )
        SELECT 
            sa.product_id,
            p_date AS metric_date,
            rate_tier AS interest_rate_tier,
            -- Count accounts in this tier
            COUNT(DISTINCT sa.id) AS account_count,
            -- Total balance in this tier
            SUM(sa.account_balance_derived) AS total_balance,
            -- Total interest paid
            SUM(CASE 
                WHEN interest_tx.interest_paid IS NOT NULL THEN interest_tx.interest_paid
                ELSE 0 
            END) AS total_interest_paid,
            -- Average interest paid
            AVG(CASE 
                WHEN interest_tx.interest_paid IS NOT NULL THEN interest_tx.interest_paid
                ELSE 0 
            END) AS average_interest_paid,
            -- Min interest paid
            MIN(CASE 
                WHEN interest_tx.interest_paid IS NOT NULL THEN interest_tx.interest_paid
                ELSE 0 
            END) AS min_interest_paid,
            -- Max interest paid
            MAX(CASE 
                WHEN interest_tx.interest_paid IS NOT NULL THEN interest_tx.interest_paid
                ELSE 0 
            END) AS max_interest_paid,
            -- Interest expense ratio relative to total balance
            CASE 
                WHEN SUM(sa.account_balance_derived) > 0 
                THEN SUM(COALESCE(interest_tx.interest_paid, 0)) * 100.0 / SUM(sa.account_balance_derived)
                ELSE 0 
            END AS interest_expense_ratio,
            -- Balance distribution by amount ranges (placeholder JSON)
            '{"ranges": [{"range": "0-1000", "count": 0, "total": 0}, {"range": "1001-5000", "count": 0, "total": 0}, {"range": "5001-10000", "count": 0, "total": 0}, {"range": "10001+", "count": 0, "total": 0}]}' AS balance_distribution
        FROM 
            savings_account sa
        LEFT JOIN (
            -- Interest paid in the last 30 days
            SELECT 
                savings_account_id,
                SUM(amount) AS interest_paid
            FROM 
                savings_account_transaction
            WHERE 
                transaction_type = 'interest_posting'
                AND transaction_date BETWEEN (p_date - INTERVAL '30 days') AND p_date
                AND is_reversed = FALSE
            GROUP BY 
                savings_account_id
        ) interest_tx ON sa.id = interest_tx.savings_account_id
        WHERE 
            sa.status = 'active'
            AND sa.nominal_annual_interest_rate >= rate_tier
            AND sa.nominal_annual_interest_rate < (rate_tier + 1.0)
        GROUP BY 
            sa.product_id;
    END LOOP;
    
    -- Update cost of funds for each tier
    -- This requires external data about the institution's cost of funds
    -- For now, we'll set a placeholder value based on the interest rate tier
    UPDATE savings_interest_distribution
    SET total_cost_of_funds = total_interest_paid * 0.7  -- Assuming 70% is the cost of funds
    WHERE metric_date = p_date;
    
    -- Update balance distribution with real data
    WITH balance_ranges AS (
        SELECT 
            sa.product_id,
            sa.nominal_annual_interest_rate,
            JSON_BUILD_OBJECT(
                'ranges', JSON_BUILD_ARRAY(
                    JSON_BUILD_OBJECT(
                        'range', '0-1000',
                        'count', COUNT(CASE WHEN sa.account_balance_derived BETWEEN 0 AND 1000 THEN 1 END),
                        'total', SUM(CASE WHEN sa.account_balance_derived BETWEEN 0 AND 1000 THEN sa.account_balance_derived ELSE 0 END)
                    ),
                    JSON_BUILD_OBJECT(
                        'range', '1001-5000',
                        'count', COUNT(CASE WHEN sa.account_balance_derived BETWEEN 1001 AND 5000 THEN 1 END),
                        'total', SUM(CASE WHEN sa.account_balance_derived BETWEEN 1001 AND 5000 THEN sa.account_balance_derived ELSE 0 END)
                    ),
                    JSON_BUILD_OBJECT(
                        'range', '5001-10000',
                        'count', COUNT(CASE WHEN sa.account_balance_derived BETWEEN 5001 AND 10000 THEN 1 END),
                        'total', SUM(CASE WHEN sa.account_balance_derived BETWEEN 5001 AND 10000 THEN sa.account_balance_derived ELSE 0 END)
                    ),
                    JSON_BUILD_OBJECT(
                        'range', '10001+',
                        'count', COUNT(CASE WHEN sa.account_balance_derived > 10000 THEN 1 END),
                        'total', SUM(CASE WHEN sa.account_balance_derived > 10000 THEN sa.account_balance_derived ELSE 0 END)
                    )
                )
            ) AS balance_dist
        FROM 
            savings_account sa
        WHERE 
            sa.status = 'active'
        GROUP BY 
            sa.product_id, 
            sa.nominal_annual_interest_rate
    )
    UPDATE savings_interest_distribution d
    SET balance_distribution = r.balance_dist
    FROM balance_ranges r
    WHERE 
        d.product_id = r.product_id
        AND d.interest_rate_tier = FLOOR(r.nominal_annual_interest_rate)
        AND d.metric_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Generate financial projections
CREATE OR REPLACE FUNCTION generate_savings_financial_projections(p_date DATE, p_product_id UUID, p_scenario VARCHAR)
RETURNS VOID AS $$
DECLARE
    periods VARCHAR[] := ARRAY['1M', '3M', '6M', '1Y', '3Y', '5Y'];
    period VARCHAR;
    growth_factor DECIMAL;
    interest_factor DECIMAL;
    dormancy_factor DECIMAL;
BEGIN
    -- Set growth factors based on scenario
    IF p_scenario = 'base' THEN
        growth_factor := 1.0;
        interest_factor := 1.0;
        dormancy_factor := 1.0;
    ELSIF p_scenario = 'optimistic' THEN
        growth_factor := 1.25;
        interest_factor := 0.9;  -- Lower interest expense
        dormancy_factor := 0.8;  -- Lower dormancy rate
    ELSIF p_scenario = 'pessimistic' THEN
        growth_factor := 0.75;
        interest_factor := 1.1;  -- Higher interest expense
        dormancy_factor := 1.2;  -- Higher dormancy rate
    ELSE
        -- Default to base scenario
        growth_factor := 1.0;
        interest_factor := 1.0;
        dormancy_factor := 1.0;
    END IF;
    
    -- Delete existing projections for this date, product and scenario
    DELETE FROM savings_financial_projections 
    WHERE projection_date = p_date 
      AND product_id = p_product_id 
      AND scenario_type = p_scenario;
    
    -- Get current metrics for the product
    WITH current_metrics AS (
        SELECT 
            m.total_accounts,
            m.total_balance,
            m.total_interest_paid,
            p.nominal_annual_interest_rate,
            COALESCE(
                (SELECT COUNT(*) FROM savings_account 
                 WHERE product_id = p_product_id AND dormant_on_date > (p_date - INTERVAL '90 days')),
                0
            ) / NULLIF(m.total_accounts, 0) * 100 AS current_dormancy_rate,
            COALESCE(
                (SELECT COUNT(*) FROM savings_account 
                 WHERE product_id = p_product_id AND closed_on_date > (p_date - INTERVAL '90 days')),
                0
            ) / NULLIF(m.total_accounts, 0) * 100 AS current_attrition_rate,
            COALESCE(
                (SELECT SUM(amount) FROM savings_account_transaction sat
                 JOIN savings_account sa ON sat.savings_account_id = sa.id
                 WHERE sa.product_id = p_product_id
                   AND sat.transaction_type IN ('fee_charge', 'penalty_charge', 'withdrawal_fee', 'annual_fee')
                   AND sat.transaction_date > (p_date - INTERVAL '30 days')),
                0
            ) AS monthly_fee_income
        FROM 
            savings_product_metrics m
        JOIN
            savings_product p ON m.product_id = p.id
        WHERE 
            m.product_id = p_product_id
            AND m.metric_date = (SELECT MAX(metric_date) FROM savings_product_metrics WHERE product_id = p_product_id)
    )
    
    -- Generate projections for each time period
    FOREACH period IN ARRAY periods
    LOOP
        -- Calculate months based on period
        DECLARE months INT;
        BEGIN
            IF period = '1M' THEN
                months := 1;
            ELSIF period = '3M' THEN
                months := 3;
            ELSIF period = '6M' THEN
                months := 6;
            ELSIF period = '1Y' THEN
                months := 12;
            ELSIF period = '3Y' THEN
                months := 36;
            ELSIF period = '5Y' THEN
                months := 60;
            ELSE
                months := 1;
            END IF;
            
            -- Insert projection for this period
            INSERT INTO savings_financial_projections (
                projection_date,
                product_id,
                projection_period,
                projected_account_growth,
                projected_balance_growth,
                projected_interest_expense,
                projected_fee_income,
                projected_dormancy_rate,
                projected_attrition_rate,
                confidence_level,
                assumptions,
                scenario_type
            )
            SELECT
                p_date AS projection_date,
                p_product_id AS product_id,
                period AS projection_period,
                -- Account growth based on historical trend and scenario
                FLOOR(
                    CASE
                        WHEN total_accounts IS NULL OR total_accounts = 0 THEN 100
                        ELSE POWER(1 + (0.03 * growth_factor), months) * total_accounts - total_accounts
                    END
                ) AS projected_account_growth,
                -- Balance growth based on account growth plus increased deposits
                CASE
                    WHEN total_balance IS NULL OR total_balance = 0 THEN 10000
                    ELSE POWER(1 + (0.04 * growth_factor), months) * total_balance - total_balance
                END AS projected_balance_growth,
                -- Interest expense based on balance and interest rate
                CASE
                    WHEN total_balance IS NULL OR total_balance = 0 THEN 0
                    ELSE (POWER(1 + (0.04 * growth_factor), months) * total_balance * 
                          nominal_annual_interest_rate / 100 * interest_factor * months / 12)
                END AS projected_interest_expense,
                -- Fee income based on accounts and transaction volume
                CASE
                    WHEN monthly_fee_income IS NULL OR monthly_fee_income = 0 THEN 100
                    ELSE monthly_fee_income * POWER(1 + (0.02 * growth_factor), months) * months
                END AS projected_fee_income,
                -- Dormancy rate projections
                CASE
                    WHEN current_dormancy_rate IS NULL OR current_dormancy_rate = 0 THEN 5.0
                    ELSE LEAST(current_dormancy_rate * dormancy_factor * (1 + months * 0.01), 25.0)
                END AS projected_dormancy_rate,
                -- Attrition rate projections
                CASE
                    WHEN current_attrition_rate IS NULL OR current_attrition_rate = 0 THEN 2.0
                    ELSE LEAST(current_attrition_rate * (1 + months * 0.005), 15.0)
                END AS projected_attrition_rate,
                -- Confidence level decreases with longer time periods
                CASE
                    WHEN months <= 3 THEN 0.9
                    WHEN months <= 12 THEN 0.8
                    WHEN months <= 36 THEN 0.7
                    ELSE 0.5
                END AS confidence_level,
                -- Assumptions used for the projection
                JSON_BUILD_OBJECT(
                    'interest_rate_change', CASE 
                        WHEN p_scenario = 'base' THEN 0.0
                        WHEN p_scenario = 'optimistic' THEN -0.25
                        WHEN p_scenario = 'pessimistic' THEN 0.5
                        ELSE 0.0
                    END,
                    'customer_acquisition_rate', CASE 
                        WHEN p_scenario = 'base' THEN 3.0
                        WHEN p_scenario = 'optimistic' THEN 5.0
                        WHEN p_scenario = 'pessimistic' THEN 1.5
                        ELSE 3.0
                    END,
                    'average_deposit_growth', CASE 
                        WHEN p_scenario = 'base' THEN 4.0
                        WHEN p_scenario = 'optimistic' THEN 6.0
                        WHEN p_scenario = 'pessimistic' THEN 2.0
                        ELSE 4.0
                    END,
                    'market_conditions', p_scenario,
                    'economic_factors', CASE 
                        WHEN p_scenario = 'base' THEN 'stable'
                        WHEN p_scenario = 'optimistic' THEN 'growing'
                        WHEN p_scenario = 'pessimistic' THEN 'contracting'
                        ELSE 'stable'
                    END,
                    'regulatory_changes', 'none_expected',
                    'inflation_rate', CASE 
                        WHEN p_scenario = 'base' THEN 2.5
                        WHEN p_scenario = 'optimistic' THEN 2.0
                        WHEN p_scenario = 'pessimistic' THEN 4.0
                        ELSE 2.5
                    END
                ) AS assumptions,
                p_scenario AS scenario_type
            FROM 
                current_metrics;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create default report configurations
INSERT INTO savings_report_configuration (
    report_name, 
    report_type, 
    description, 
    parameters, 
    is_core_report, 
    is_active
)
VALUES
    (
        'Savings Product Performance Report',
        'product_performance',
        'Comprehensive analysis of savings product performance metrics including account growth, balances, interest paid, and profitability indicators.',
        '{"required": ["start_date", "end_date"], "optional": ["product_id", "currency_code"]}',
        TRUE,
        TRUE
    ),
    (
        'Dormancy Analysis Report',
        'dormancy_analysis',
        'Analyzes dormancy trends, identifies at-risk accounts, and provides insights into dormancy patterns and reactivation rates.',
        '{"required": ["as_of_date", "risk_threshold_days"], "optional": ["product_id"]}',
        TRUE,
        TRUE
    ),
    (
        'Interest Distribution Report',
        'interest_distribution',
        'Analyzes how interest is distributed across savings accounts at different interest rate tiers and balance levels.',
        '{"required": ["as_of_date"], "optional": ["product_id", "currency_code"]}',
        TRUE,
        TRUE
    ),
    (
        'Account Activity Report',
        'account_activity',
        'Detailed analysis of savings account transaction patterns, balances, and activity metrics.',
        '{"required": ["as_of_date"], "optional": ["product_id", "client_id", "group_id", "office_id"]}',
        TRUE,
        TRUE
    ),
    (
        'Financial Projection Report',
        'financial_projection',
        'Projects future savings growth, interest expenses, and key metrics based on different scenarios.',
        '{"required": ["as_of_date", "product_id", "scenario_type"], "optional": ["projection_periods"]}',
        TRUE,
        TRUE
    );

-- Create triggers for audit fields
CREATE TRIGGER savings_product_metrics_audit 
BEFORE UPDATE ON savings_product_metrics 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER savings_account_activity_metrics_audit 
BEFORE UPDATE ON savings_account_activity_metrics 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER savings_dormancy_analytics_audit 
BEFORE UPDATE ON savings_dormancy_analytics 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER savings_interest_distribution_audit 
BEFORE UPDATE ON savings_interest_distribution 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER savings_financial_projections_audit 
BEFORE UPDATE ON savings_financial_projections 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER savings_report_configuration_audit 
BEFORE UPDATE ON savings_report_configuration 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER savings_report_schedule_audit 
BEFORE UPDATE ON savings_report_schedule 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_savings_product_metrics_product_id_date 
ON savings_product_metrics(product_id, metric_date);

CREATE INDEX idx_savings_account_activity_metrics_account_id_date 
ON savings_account_activity_metrics(account_id, metric_date);

CREATE INDEX idx_savings_dormancy_analytics_product_id_date_threshold 
ON savings_dormancy_analytics(product_id, metric_date, dormancy_risk_threshold_days);

CREATE INDEX idx_savings_interest_distribution_product_id_date_tier 
ON savings_interest_distribution(product_id, metric_date, interest_rate_tier);

CREATE INDEX idx_savings_financial_projections_product_id_date_period_scenario 
ON savings_financial_projections(product_id, projection_date, projection_period, scenario_type);

-- Add permissions for savings reporting module
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
    ('report', 'READ_SAVINGSREPORT', 'SAVINGSREPORT', 'READ', false),
    ('report', 'CREATE_SAVINGSREPORT', 'SAVINGSREPORT', 'CREATE', true),
    ('report', 'UPDATE_SAVINGSREPORT', 'SAVINGSREPORT', 'UPDATE', true),
    ('report', 'DELETE_SAVINGSREPORT', 'SAVINGSREPORT', 'DELETE', true),
    ('report', 'EXPORT_SAVINGSREPORT', 'SAVINGSREPORT', 'EXPORT', false),
    ('report', 'SCHEDULE_SAVINGSREPORT', 'SAVINGSREPORT', 'SCHEDULE', true);