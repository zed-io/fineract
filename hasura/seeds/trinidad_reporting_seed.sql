-- Trinidad and Tobago Reporting Seed Data
-- This script creates sample reporting data specific to Trinidad and Tobago

-- Ensure we're using the correct schema
SET search_path TO fineract_default;

-- 1. Report Templates
INSERT INTO report_template (
    name, 
    description, 
    report_type, 
    report_category,
    parameters
)
SELECT 
    'Trinidad Branch Performance', 
    'Performance metrics for all branches across Trinidad and Tobago', 
    'TABLE', 
    'OPERATIONAL',
    '[{"name":"start_date","type":"DATE","required":true},{"name":"end_date","type":"DATE","required":true},{"name":"branch_id","type":"UUID","required":false}]'
WHERE NOT EXISTS (SELECT 1 FROM report_template WHERE name = 'Trinidad Branch Performance');

INSERT INTO report_template (
    name, 
    description, 
    report_type, 
    report_category,
    parameters
)
SELECT 
    'Trinidad Loan Portfolio Analysis', 
    'Detailed analysis of loan portfolio health across Trinidad and Tobago', 
    'TABLE', 
    'PORTFOLIO',
    '[{"name":"as_of_date","type":"DATE","required":true},{"name":"product_id","type":"UUID","required":false},{"name":"region","type":"STRING","required":false}]'
WHERE NOT EXISTS (SELECT 1 FROM report_template WHERE name = 'Trinidad Loan Portfolio Analysis');

INSERT INTO report_template (
    name, 
    description, 
    report_type, 
    report_category,
    parameters
)
SELECT 
    'Trinidad Financial Inclusion Metrics', 
    'Financial inclusion metrics across Trinidad and Tobago regions', 
    'CHART', 
    'SOCIAL',
    '[{"name":"year","type":"INTEGER","required":true},{"name":"region","type":"STRING","required":false}]'
WHERE NOT EXISTS (SELECT 1 FROM report_template WHERE name = 'Trinidad Financial Inclusion Metrics');

INSERT INTO report_template (
    name, 
    description, 
    report_type, 
    report_category,
    parameters
)
SELECT 
    'Trinidad Monthly Income Statement', 
    'Monthly income statement for Trinidad and Tobago operations', 
    'TABLE', 
    'FINANCIAL',
    '[{"name":"month","type":"INTEGER","required":true},{"name":"year","type":"INTEGER","required":true},{"name":"branch_id","type":"UUID","required":false}]'
WHERE NOT EXISTS (SELECT 1 FROM report_template WHERE name = 'Trinidad Monthly Income Statement');

INSERT INTO report_template (
    name, 
    description, 
    report_type, 
    report_category,
    parameters
)
SELECT 
    'Trinidad Product Performance Dashboard', 
    'Performance metrics for all financial products in Trinidad and Tobago', 
    'DASHBOARD', 
    'PRODUCT',
    '[{"name":"start_date","type":"DATE","required":true},{"name":"end_date","type":"DATE","required":true},{"name":"product_type","type":"STRING","required":false}]'
WHERE NOT EXISTS (SELECT 1 FROM report_template WHERE name = 'Trinidad Product Performance Dashboard');

-- 2. Report Executions (historical report runs)
DO $$
DECLARE
    template_id_1 UUID;
    template_id_2 UUID;
    template_id_3 UUID;
    template_id_4 UUID;
    template_id_5 UUID;
    user_id UUID;
BEGIN
    SELECT id INTO template_id_1 FROM report_template WHERE name = 'Trinidad Branch Performance';
    SELECT id INTO template_id_2 FROM report_template WHERE name = 'Trinidad Loan Portfolio Analysis';
    SELECT id INTO template_id_3 FROM report_template WHERE name = 'Trinidad Financial Inclusion Metrics';
    SELECT id INTO template_id_4 FROM report_template WHERE name = 'Trinidad Monthly Income Statement';
    SELECT id INTO template_id_5 FROM report_template WHERE name = 'Trinidad Product Performance Dashboard';
    
    -- Get a user ID for the creator
    SELECT id INTO user_id FROM app_user LIMIT 1;
    
    -- First Template Executions
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        execution_time_ms
    )
    SELECT 
        template_id_1,
        '{"start_date":"2024-01-01","end_date":"2024-03-31"}',
        user_id,
        '2024-04-02 10:15:22',
        'COMPLETED',
        3245
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_1 
        AND parameters = '{"start_date":"2024-01-01","end_date":"2024-03-31"}'
    );
    
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        execution_time_ms
    )
    SELECT 
        template_id_1,
        '{"start_date":"2024-04-01","end_date":"2024-04-30"}',
        user_id,
        '2024-05-03 09:30:45',
        'COMPLETED',
        2987
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_1 
        AND parameters = '{"start_date":"2024-04-01","end_date":"2024-04-30"}'
    );
    
    -- Second Template Executions
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        execution_time_ms
    )
    SELECT 
        template_id_2,
        '{"as_of_date":"2024-04-30"}',
        user_id,
        '2024-05-01 14:22:10',
        'COMPLETED',
        4532
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_2 
        AND parameters = '{"as_of_date":"2024-04-30"}'
    );
    
    -- Third Template Executions
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        execution_time_ms
    )
    SELECT 
        template_id_3,
        '{"year":2023}',
        user_id,
        '2024-01-15 11:45:39',
        'COMPLETED',
        6789
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_3 
        AND parameters = '{"year":2023}'
    );
    
    -- Fourth Template Executions
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        execution_time_ms
    )
    SELECT 
        template_id_4,
        '{"month":3,"year":2024}',
        user_id,
        '2024-04-05 08:15:22',
        'COMPLETED',
        5432
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_4 
        AND parameters = '{"month":3,"year":2024}'
    );
    
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        execution_time_ms
    )
    SELECT 
        template_id_4,
        '{"month":4,"year":2024}',
        user_id,
        '2024-05-03 08:22:10',
        'COMPLETED',
        5210
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_4 
        AND parameters = '{"month":4,"year":2024}'
    );
    
    -- Fifth Template Executions
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        execution_time_ms
    )
    SELECT 
        template_id_5,
        '{"start_date":"2024-01-01","end_date":"2024-03-31","product_type":"LOAN"}',
        user_id,
        '2024-04-03 15:45:22',
        'COMPLETED',
        7654
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_5 
        AND parameters = '{"start_date":"2024-01-01","end_date":"2024-03-31","product_type":"LOAN"}'
    );
    
    -- Add a failed report execution
    INSERT INTO report_execution (
        report_template_id,
        parameters,
        created_by,
        created_date,
        status,
        error_details
    )
    SELECT 
        template_id_2,
        '{"as_of_date":"invalid-date"}',
        user_id,
        '2024-04-28 16:22:45',
        'FAILED',
        'Invalid date format: "invalid-date" is not a valid date'
    WHERE NOT EXISTS (
        SELECT 1 FROM report_execution 
        WHERE report_template_id = template_id_2 
        AND parameters = '{"as_of_date":"invalid-date"}'
    );
    
END $$;

-- 3. Report Results (sample results for the reports)
DO $$
DECLARE
    execution_id UUID;
BEGIN
    -- Get first completed execution of Branch Performance report
    SELECT id INTO execution_id FROM report_execution 
    WHERE status = 'COMPLETED' 
    AND report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Branch Performance')
    LIMIT 1;
    
    IF execution_id IS NOT NULL THEN
        -- Insert result data
        INSERT INTO report_result (
            report_execution_id,
            result_format,
            result_data
        )
        SELECT 
            execution_id,
            'JSON',
            '{
                "columns": ["Branch", "Loans Disbursed", "Savings Opened", "New Clients", "Revenue (TTD)"],
                "data": [
                    ["Port of Spain Headquarters", 78, 122, 95, 456783.45],
                    ["San Fernando Branch", 64, 88, 71, 325678.90],
                    ["Arima Branch", 42, 65, 47, 187654.32],
                    ["Scarborough Branch", 31, 52, 36, 145632.78],
                    ["Chaguanas Branch", 56, 76, 62, 278943.21],
                    ["Point Fortin Branch", 28, 45, 33, 132567.90]
                ],
                "summary": {
                    "total_loans": 299,
                    "total_savings": 448,
                    "total_clients": 344,
                    "total_revenue": 1527260.56
                }
            }'
        WHERE NOT EXISTS (SELECT 1 FROM report_result WHERE report_execution_id = execution_id);
    END IF;
    
    -- Get completed execution of Loan Portfolio Analysis
    SELECT id INTO execution_id FROM report_execution 
    WHERE status = 'COMPLETED' 
    AND report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Loan Portfolio Analysis')
    LIMIT 1;
    
    IF execution_id IS NOT NULL THEN
        -- Insert result data
        INSERT INTO report_result (
            report_execution_id,
            result_format,
            result_data
        )
        SELECT 
            execution_id,
            'JSON',
            '{
                "columns": ["Loan Product", "Active Loans", "Principal Outstanding (TTD)", "Interest Outstanding (TTD)", "PAR > 30 Days (%)", "Average Loan Size (TTD)"],
                "data": [
                    ["Small Business Loan", 154, 4562890.45, 342567.89, 2.3, 29630.46],
                    ["Home Improvement Loan", 89, 3245678.90, 287654.32, 1.8, 36468.30],
                    ["Education Loan", 76, 1231456.78, 98765.43, 0.9, 16203.38],
                    ["Agriculture Loan", 48, 985432.10, 78654.32, 3.1, 20529.84],
                    ["Personal Loan", 213, 1875432.10, 145678.90, 4.2, 8805.78],
                    ["Micro-enterprise Loan", 98, 785432.10, 65789.43, 2.7, 8014.61]
                ],
                "summary": {
                    "total_active_loans": 678,
                    "total_principal": 12686322.43,
                    "total_interest": 1019110.29,
                    "weighted_par": 2.67,
                    "average_loan_size": 18710.65
                },
                "regional_breakdown": {
                    "regions": ["Port of Spain", "San Fernando", "Arima", "Tobago", "Chaguanas", "Point Fortin"],
                    "loan_counts": [187, 142, 98, 76, 124, 51],
                    "portfolio_at_risk": [2.1, 2.8, 3.2, 1.9, 2.5, 3.6]
                }
            }'
        WHERE NOT EXISTS (SELECT 1 FROM report_result WHERE report_execution_id = execution_id);
    END IF;
    
    -- Get completed execution of Financial Inclusion Metrics
    SELECT id INTO execution_id FROM report_execution 
    WHERE status = 'COMPLETED' 
    AND report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Financial Inclusion Metrics')
    LIMIT 1;
    
    IF execution_id IS NOT NULL THEN
        -- Insert result data
        INSERT INTO report_result (
            report_execution_id,
            result_format,
            result_data
        )
        SELECT 
            execution_id,
            'JSON',
            '{
                "chart_data": {
                    "chart_type": "bar",
                    "title": "Financial Inclusion by Region - 2023",
                    "categories": ["Port of Spain", "San Fernando", "Arima", "Tobago", "Chaguanas", "Point Fortin"],
                    "series": [
                        {
                            "name": "Banking Access (%)",
                            "data": [87.5, 82.3, 76.8, 68.4, 79.2, 72.5]
                        },
                        {
                            "name": "Digital Finance Usage (%)",
                            "data": [76.2, 68.9, 62.4, 53.7, 65.8, 58.3]
                        },
                        {
                            "name": "Credit Access (%)",
                            "data": [65.3, 58.7, 52.1, 45.9, 56.4, 49.8]
                        },
                        {
                            "name": "Insurance Coverage (%)",
                            "data": [45.7, 39.8, 36.5, 32.4, 41.2, 35.6]
                        }
                    ]
                },
                "metrics": {
                    "women_inclusion": 68.7,
                    "youth_inclusion": 54.3,
                    "rural_inclusion": 58.9,
                    "digital_adoption": 64.2
                },
                "targets": {
                    "banking_access": 85.0,
                    "digital_finance": 70.0,
                    "credit_access": 60.0,
                    "insurance_coverage": 50.0
                },
                "yearly_trend": {
                    "years": [2019, 2020, 2021, 2022, 2023],
                    "overall_inclusion": [62.3, 65.7, 68.2, 72.5, 75.1]
                }
            }'
        WHERE NOT EXISTS (SELECT 1 FROM report_result WHERE report_execution_id = execution_id);
    END IF;
    
    -- Get completed execution of Monthly Income Statement
    SELECT id INTO execution_id FROM report_execution 
    WHERE status = 'COMPLETED' 
    AND report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Monthly Income Statement')
    ORDER BY created_date DESC
    LIMIT 1;
    
    IF execution_id IS NOT NULL THEN
        -- Insert result data
        INSERT INTO report_result (
            report_execution_id,
            result_format,
            result_data
        )
        SELECT 
            execution_id,
            'JSON',
            '{
                "header": {
                    "report_title": "Monthly Income Statement - April 2024",
                    "entity": "Trinidad and Tobago Operations",
                    "currency": "TTD"
                },
                "income": {
                    "categories": [
                        {"name": "Interest Income", "amount": 876543.21},
                        {"name": "Fee Income", "amount": 123456.78},
                        {"name": "Penalties", "amount": 45678.90},
                        {"name": "Other Income", "amount": 34567.89}
                    ],
                    "total": 1080246.78
                },
                "expenses": {
                    "categories": [
                        {"name": "Personnel Expenses", "amount": 345678.90},
                        {"name": "Administrative Expenses", "amount": 156789.01},
                        {"name": "Financial Expenses", "amount": 87654.32},
                        {"name": "Loan Loss Provisions", "amount": 76543.21},
                        {"name": "Depreciation", "amount": 45678.90},
                        {"name": "Other Expenses", "amount": 34567.89}
                    ],
                    "total": 746912.23
                },
                "summary": {
                    "total_income": 1080246.78,
                    "total_expenses": 746912.23,
                    "net_income": 333334.55,
                    "cost_income_ratio": 69.14,
                    "return_on_assets": 2.45,
                    "return_on_equity": 15.78
                },
                "comparison": {
                    "previous_month": {
                        "income": 1045632.10,
                        "expenses": 723456.78,
                        "net_income": 322175.32
                    },
                    "change": {
                        "income_percent": 3.31,
                        "expenses_percent": 3.24,
                        "net_income_percent": 3.46
                    }
                }
            }'
        WHERE NOT EXISTS (SELECT 1 FROM report_result WHERE report_execution_id = execution_id);
    END IF;
    
    -- Get completed execution of Product Performance Dashboard
    SELECT id INTO execution_id FROM report_execution 
    WHERE status = 'COMPLETED' 
    AND report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Product Performance Dashboard')
    LIMIT 1;
    
    IF execution_id IS NOT NULL THEN
        -- Insert result data
        INSERT INTO report_result (
            report_execution_id,
            result_format,
            result_data
        )
        SELECT 
            execution_id,
            'JSON',
            '{
                "dashboard_title": "Trinidad Loan Product Performance Q1 2024",
                "period": "January 1, 2024 - March 31, 2024",
                "visualizations": [
                    {
                        "title": "Loan Disbursements by Product",
                        "type": "pie",
                        "data": [
                            {"name": "Small Business Loan", "value": 78, "percentage": 26.1},
                            {"name": "Home Improvement Loan", "value": 53, "percentage": 17.7},
                            {"name": "Education Loan", "value": 42, "percentage": 14.0},
                            {"name": "Agriculture Loan", "value": 36, "percentage": 12.0},
                            {"name": "Personal Loan", "value": 65, "percentage": 21.7},
                            {"name": "Micro-enterprise Loan", "value": 25, "percentage": 8.4}
                        ]
                    },
                    {
                        "title": "Portfolio Quality by Product",
                        "type": "bar",
                        "data": {
                            "categories": ["Small Business", "Home Improvement", "Education", "Agriculture", "Personal", "Micro-enterprise"],
                            "series": [
                                {"name": "PAR > 30 Days (%)", "data": [2.3, 1.8, 0.9, 3.1, 4.2, 2.7]},
                                {"name": "Write-off Rate (%)", "data": [0.8, 0.5, 0.3, 1.1, 1.4, 0.9]}
                            ]
                        }
                    },
                    {
                        "title": "Average Loan Size Trends",
                        "type": "line",
                        "data": {
                            "categories": ["Jan 2024", "Feb 2024", "Mar 2024"],
                            "series": [
                                {"name": "Small Business Loan", "data": [28500, 29200, 29630]},
                                {"name": "Home Improvement Loan", "data": [35800, 36100, 36468]},
                                {"name": "Education Loan", "data": [15800, 16000, 16203]},
                                {"name": "Agriculture Loan", "data": [19800, 20200, 20530]},
                                {"name": "Personal Loan", "data": [8500, 8700, 8806]},
                                {"name": "Micro-enterprise Loan", "data": [7800, 7900, 8015]}
                            ]
                        }
                    },
                    {
                        "title": "Disbursements by Branch",
                        "type": "column",
                        "data": {
                            "categories": ["Port of Spain", "San Fernando", "Arima", "Scarborough", "Chaguanas", "Point Fortin"],
                            "series": [
                                {"name": "Number of Loans", "data": [78, 64, 42, 31, 56, 28]},
                                {"name": "Value (Thousands TTD)", "data": [2245, 1856, 984, 645, 1348, 567]}
                            ]
                        }
                    }
                ],
                "key_metrics": [
                    {"name": "Total Disbursed Loans", "value": 299, "change": 8.3},
                    {"name": "Total Disbursed Amount", "value": "TTD 7,645,000", "change": 12.7},
                    {"name": "Average Processing Time", "value": "3.2 days", "change": -15.8},
                    {"name": "Portfolio at Risk > 30", "value": "2.5%", "change": -0.3},
                    {"name": "Average Interest Rate", "value": "12.8%", "change": 0.2}
                ]
            }'
        WHERE NOT EXISTS (SELECT 1 FROM report_result WHERE report_execution_id = execution_id);
    END IF;
END $$;

-- 4. Scheduled Reports
INSERT INTO scheduled_report (
    report_template_id,
    schedule_type,
    schedule_config,
    parameters,
    recipients,
    is_active,
    created_by,
    created_date
)
SELECT 
    (SELECT id FROM report_template WHERE name = 'Trinidad Branch Performance'),
    'MONTHLY',
    '{"day": 5}',
    '{"start_date": "${firstDayOfPreviousMonth}", "end_date": "${lastDayOfPreviousMonth}"}',
    '[{"type": "EMAIL", "address": "branch-managers@trinidadfinance.org"}, {"type": "EMAIL", "address": "executives@trinidadfinance.org"}]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_report 
    WHERE report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Branch Performance') 
    AND schedule_type = 'MONTHLY'
);

INSERT INTO scheduled_report (
    report_template_id,
    schedule_type,
    schedule_config,
    parameters,
    recipients,
    is_active,
    created_by,
    created_date
)
SELECT 
    (SELECT id FROM report_template WHERE name = 'Trinidad Loan Portfolio Analysis'),
    'MONTHLY',
    '{"day": 3}',
    '{"as_of_date": "${lastDayOfPreviousMonth}"}',
    '[{"type": "EMAIL", "address": "risk@trinidadfinance.org"}, {"type": "EMAIL", "address": "loans@trinidadfinance.org"}]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_report 
    WHERE report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Loan Portfolio Analysis') 
    AND schedule_type = 'MONTHLY'
);

INSERT INTO scheduled_report (
    report_template_id,
    schedule_type,
    schedule_config,
    parameters,
    recipients,
    is_active,
    created_by,
    created_date
)
SELECT 
    (SELECT id FROM report_template WHERE name = 'Trinidad Monthly Income Statement'),
    'MONTHLY',
    '{"day": 10}',
    '{"month": "${previousMonth}", "year": "${currentYearIfPreviousMonthIsDecemberElsePreviousYear}"}',
    '[{"type": "EMAIL", "address": "finance@trinidadfinance.org"}, {"type": "EMAIL", "address": "board@trinidadfinance.org"}]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_report 
    WHERE report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Monthly Income Statement') 
    AND schedule_type = 'MONTHLY'
);

INSERT INTO scheduled_report (
    report_template_id,
    schedule_type,
    schedule_config,
    parameters,
    recipients,
    is_active,
    created_by,
    created_date
)
SELECT 
    (SELECT id FROM report_template WHERE name = 'Trinidad Financial Inclusion Metrics'),
    'YEARLY',
    '{"day": 15, "month": 1}',
    '{"year": "${previousYear}"}',
    '[{"type": "EMAIL", "address": "social-impact@trinidadfinance.org"}, {"type": "EMAIL", "address": "central-bank@gov.tt"}]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_report 
    WHERE report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Financial Inclusion Metrics') 
    AND schedule_type = 'YEARLY'
);

INSERT INTO scheduled_report (
    report_template_id,
    schedule_type,
    schedule_config,
    parameters,
    recipients,
    is_active,
    created_by,
    created_date
)
SELECT 
    (SELECT id FROM report_template WHERE name = 'Trinidad Product Performance Dashboard'),
    'QUARTERLY',
    '{"day": 5}',
    '{"start_date": "${firstDayOfPreviousQuarter}", "end_date": "${lastDayOfPreviousQuarter}", "product_type": "LOAN"}',
    '[{"type": "EMAIL", "address": "product-managers@trinidadfinance.org"}, {"type": "EMAIL", "address": "marketing@trinidadfinance.org"}]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_report 
    WHERE report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Product Performance Dashboard') 
    AND schedule_type = 'QUARTERLY'
);

-- 5. Custom Trinidad Financial Analysis Reports
INSERT INTO financial_analysis_report (
    name,
    description,
    report_type,
    metrics,
    created_by,
    created_date
)
SELECT 
    'Trinidad Regional Financial Health Analysis',
    'Comprehensive analysis of financial health metrics across Trinidad and Tobago regions',
    'FINANCIAL_HEALTH',
    '["CAPITAL_ADEQUACY", "ASSET_QUALITY", "MANAGEMENT_EFFICIENCY", "EARNINGS", "LIQUIDITY"]',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_analysis_report WHERE name = 'Trinidad Regional Financial Health Analysis');

INSERT INTO financial_analysis_report (
    name,
    description,
    report_type,
    metrics,
    created_by,
    created_date
)
SELECT 
    'Trinidad Small Business Loan Impact Analysis',
    'Analysis of economic impact of small business loans across Trinidad and Tobago',
    'IMPACT_ANALYSIS',
    '["JOB_CREATION", "REVENUE_GROWTH", "BUSINESS_EXPANSION", "SECTOR_CONTRIBUTION"]',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_analysis_report WHERE name = 'Trinidad Small Business Loan Impact Analysis');

INSERT INTO financial_analysis_report (
    name,
    description,
    report_type,
    metrics,
    created_by,
    created_date
)
SELECT 
    'Trinidad Carnival Season Financial Trends',
    'Analysis of financial product uptake and usage during Trinidad Carnival season',
    'SEASONAL_ANALYSIS',
    '["LOAN_DISBURSEMENT", "SAVINGS_WITHDRAWAL", "REMITTANCE_VOLUME", "TRANSACTION_FREQUENCY"]',
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_analysis_report WHERE name = 'Trinidad Carnival Season Financial Trends');

-- 6. Trinidad-specific Financial Ratios
INSERT INTO financial_ratio (
    name,
    description,
    formula,
    benchmark,
    category
)
SELECT 
    'Trinidad Microfinance Sustainability Ratio',
    'Measures the operational sustainability of microfinance operations in Trinidad context',
    'Operating_Income / (Financial_Expense + Loan_Loss_Provision + Operating_Expense)',
    '1.15',
    'SUSTAINABILITY'
WHERE NOT EXISTS (SELECT 1 FROM financial_ratio WHERE name = 'Trinidad Microfinance Sustainability Ratio');

INSERT INTO financial_ratio (
    name,
    description,
    formula,
    benchmark,
    category
)
SELECT 
    'Trinidad SME Loan Efficiency Ratio',
    'Measures efficiency of SME loan processing in Trinidad market',
    'Operating_Expense / Average_SME_Loan_Portfolio',
    '0.08',
    'EFFICIENCY'
WHERE NOT EXISTS (SELECT 1 FROM financial_ratio WHERE name = 'Trinidad SME Loan Efficiency Ratio');

INSERT INTO financial_ratio (
    name,
    description,
    formula,
    benchmark,
    category
)
SELECT 
    'Trinidad Agriculture Loan Risk Coverage',
    'Risk coverage ratio for agriculture loans in Trinidad and Tobago',
    'Loan_Loss_Reserve / PAR_30_Ag_Loans',
    '1.25',
    'RISK'
WHERE NOT EXISTS (SELECT 1 FROM financial_ratio WHERE name = 'Trinidad Agriculture Loan Risk Coverage');

-- 7. Sample Report Export History
DO $$
DECLARE
    execution_id UUID;
    user_id UUID;
BEGIN
    -- Get a user ID
    SELECT id INTO user_id FROM app_user LIMIT 1;
    
    -- Get first completed execution of Branch Performance report
    SELECT id INTO execution_id FROM report_execution 
    WHERE status = 'COMPLETED' 
    AND report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Branch Performance')
    LIMIT 1;
    
    IF execution_id IS NOT NULL THEN
        -- Insert export history
        INSERT INTO report_export (
            report_execution_id,
            export_format,
            created_by,
            created_date,
            file_size,
            export_status
        )
        SELECT 
            execution_id,
            'PDF',
            user_id,
            '2024-04-02 14:35:22',
            542678,
            'COMPLETED'
        WHERE NOT EXISTS (
            SELECT 1 FROM report_export 
            WHERE report_execution_id = execution_id 
            AND export_format = 'PDF'
        );
        
        INSERT INTO report_export (
            report_execution_id,
            export_format,
            created_by,
            created_date,
            file_size,
            export_status
        )
        SELECT 
            execution_id,
            'EXCEL',
            user_id,
            '2024-04-02 14:36:45',
            156432,
            'COMPLETED'
        WHERE NOT EXISTS (
            SELECT 1 FROM report_export 
            WHERE report_execution_id = execution_id 
            AND export_format = 'EXCEL'
        );
    END IF;
    
    -- Get completed execution of Loan Portfolio Analysis
    SELECT id INTO execution_id FROM report_execution 
    WHERE status = 'COMPLETED' 
    AND report_template_id = (SELECT id FROM report_template WHERE name = 'Trinidad Loan Portfolio Analysis')
    LIMIT 1;
    
    IF execution_id IS NOT NULL THEN
        -- Insert export history
        INSERT INTO report_export (
            report_execution_id,
            export_format,
            created_by,
            created_date,
            file_size,
            export_status
        )
        SELECT 
            execution_id,
            'PDF',
            user_id,
            '2024-05-01 16:45:33',
            876543,
            'COMPLETED'
        WHERE NOT EXISTS (
            SELECT 1 FROM report_export 
            WHERE report_execution_id = execution_id 
            AND export_format = 'PDF'
        );
        
        INSERT INTO report_export (
            report_execution_id,
            export_format,
            created_by,
            created_date,
            file_size,
            export_status
        )
        SELECT 
            execution_id,
            'CSV',
            user_id,
            '2024-05-01 16:48:12',
            87654,
            'COMPLETED'
        WHERE NOT EXISTS (
            SELECT 1 FROM report_export 
            WHERE report_execution_id = execution_id 
            AND export_format = 'CSV'
        );
    END IF;
END $$;

-- 8. Create a view to access Trinidad reporting data
CREATE OR REPLACE VIEW trinidad_reporting_summary AS
SELECT 
    rt.name AS report_name,
    rt.report_type,
    rt.report_category,
    COUNT(re.id) AS execution_count,
    MIN(re.created_date) AS first_execution,
    MAX(re.created_date) AS latest_execution,
    AVG(re.execution_time_ms) AS avg_execution_time_ms,
    COUNT(rex.id) AS export_count
FROM 
    report_template rt
LEFT JOIN 
    report_execution re ON rt.id = re.report_template_id
LEFT JOIN 
    report_export rex ON re.id = rex.report_execution_id
WHERE 
    rt.name LIKE 'Trinidad%'
GROUP BY 
    rt.id, rt.name, rt.report_type, rt.report_category
ORDER BY 
    rt.name;

-- 9. Create reporting dashboards
INSERT INTO dashboard (
    name,
    description,
    layout,
    is_public,
    created_by,
    created_date
)
SELECT 
    'Trinidad Financial Inclusion Dashboard',
    'Dashboard showing key financial inclusion metrics across Trinidad and Tobago',
    '[
        {"id": "financial_inclusion_chart", "type": "chart", "position": {"x": 0, "y": 0, "w": 12, "h": 8}, "config": {"reportId": "trinidad_financial_inclusion", "chartType": "bar"}},
        {"id": "inclusion_metrics", "type": "metrics", "position": {"x": 0, "y": 8, "w": 6, "h": 4}, "config": {"metrics": ["women_inclusion", "youth_inclusion", "rural_inclusion", "digital_adoption"]}},
        {"id": "yearly_trend", "type": "chart", "position": {"x": 6, "y": 8, "w": 6, "h": 4}, "config": {"reportId": "trinidad_financial_inclusion", "chartType": "line", "seriesKey": "yearly_trend"}}
    ]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM dashboard WHERE name = 'Trinidad Financial Inclusion Dashboard');

INSERT INTO dashboard (
    name,
    description,
    layout,
    is_public,
    created_by,
    created_date
)
SELECT 
    'Trinidad Loan Performance Dashboard',
    'Dashboard showing loan performance metrics for Trinidad operations',
    '[
        {"id": "loan_disbursement", "type": "chart", "position": {"x": 0, "y": 0, "w": 6, "h": 6}, "config": {"reportId": "trinidad_product_performance", "chartType": "pie", "seriesKey": "loan_disbursements"}},
        {"id": "portfolio_quality", "type": "chart", "position": {"x": 6, "y": 0, "w": 6, "h": 6}, "config": {"reportId": "trinidad_product_performance", "chartType": "bar", "seriesKey": "portfolio_quality"}},
        {"id": "key_metrics", "type": "metrics", "position": {"x": 0, "y": 6, "w": 12, "h": 3}, "config": {"metrics": ["total_disbursed_loans", "total_disbursed_amount", "average_processing_time", "portfolio_at_risk"]}},
        {"id": "branch_performance", "type": "table", "position": {"x": 0, "y": 9, "w": 12, "h": 6}, "config": {"reportId": "trinidad_branch_performance", "columns": ["Branch", "Loans Disbursed", "Revenue (TTD)"]}}
    ]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM dashboard WHERE name = 'Trinidad Loan Performance Dashboard');

INSERT INTO dashboard (
    name,
    description,
    layout,
    is_public,
    created_by,
    created_date
)
SELECT 
    'Trinidad Executive Summary Dashboard',
    'Executive dashboard providing high-level overview of Trinidad and Tobago operations',
    '[
        {"id": "income_statement", "type": "chart", "position": {"x": 0, "y": 0, "w": 12, "h": 6}, "config": {"reportId": "trinidad_monthly_income", "chartType": "column", "seriesKey": "monthly_comparison"}},
        {"id": "financial_metrics", "type": "metrics", "position": {"x": 0, "y": 6, "w": 4, "h": 4}, "config": {"metrics": ["net_income", "cost_income_ratio", "return_on_assets", "return_on_equity"]}},
        {"id": "product_metrics", "type": "metrics", "position": {"x": 4, "y": 6, "w": 4, "h": 4}, "config": {"metrics": ["loan_growth", "deposit_growth", "client_growth", "digital_adoption"]}},
        {"id": "regional_map", "type": "map", "position": {"x": 8, "y": 6, "w": 4, "h": 4}, "config": {"mapType": "trinidad", "dataKey": "portfolio_distribution"}},
        {"id": "portfolio_summary", "type": "table", "position": {"x": 0, "y": 10, "w": 12, "h": 5}, "config": {"reportId": "trinidad_loan_portfolio", "columns": ["Loan Product", "Active Loans", "Principal Outstanding (TTD)", "PAR > 30 Days (%)"]}}
    ]',
    TRUE,
    (SELECT id FROM app_user LIMIT 1),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM dashboard WHERE name = 'Trinidad Executive Summary Dashboard');

-- Done! Trinidad reporting data has been created