-- Migration file for Fineract consolidated reporting schema
-- This creates the necessary tables for the cross-module reporting system

-- Set schema
SET search_path TO fineract_default;

-- Create data source registry table
CREATE TABLE IF NOT EXISTS m_reporting_datasource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  module_type VARCHAR(50) NOT NULL,
  connection_details JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_time TIMESTAMP,
  record_count INT,
  sync_status VARCHAR(20) DEFAULT 'pending',
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create consolidated report definition table
CREATE TABLE IF NOT EXISTS m_consolidated_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,
  modules JSONB NOT NULL,
  query_definition JSONB,
  parameters_schema JSONB,
  output_format VARCHAR(50) NOT NULL DEFAULT 'json',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create consolidated report execution history
CREATE TABLE IF NOT EXISTS m_consolidated_report_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_consolidated_report(id),
  execution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parameters JSONB,
  filters JSONB,
  output_format VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  execution_time_ms INT NOT NULL,
  result_data JSONB,
  result_metadata JSONB,
  executed_by UUID REFERENCES m_appuser(id)
);

-- Create cross-module metrics table
CREATE TABLE IF NOT EXISTS m_cross_module_metric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  metric_type VARCHAR(50) NOT NULL,
  calculation_logic TEXT,
  query_definition JSONB,
  data_sources JSONB NOT NULL,
  refresh_frequency VARCHAR(50) DEFAULT 'daily',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create cross-module dashboard table
CREATE TABLE IF NOT EXISTS m_cross_module_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  layout_config JSONB,
  metrics JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create dashboard execution history
CREATE TABLE IF NOT EXISTS m_dashboard_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES m_cross_module_dashboard(id),
  execution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parameters JSONB,
  filters JSONB,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  execution_time_ms INT NOT NULL,
  metrics_data JSONB,
  visualization_data JSONB,
  executed_by UUID REFERENCES m_appuser(id)
);

-- Create analytics insights table
CREATE TABLE IF NOT EXISTS m_analytics_insight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  insight_type VARCHAR(50) NOT NULL,
  relevance_score FLOAT NOT NULL,
  metrics JSONB NOT NULL,
  data_sources JSONB NOT NULL,
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_by UUID REFERENCES m_appuser(id),
  acknowledged_date TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_consolidated_report_execution_report_id
  ON m_consolidated_report_execution(report_id);
  
CREATE INDEX IF NOT EXISTS idx_consolidated_report_execution_date
  ON m_consolidated_report_execution(execution_date);

CREATE INDEX IF NOT EXISTS idx_dashboard_execution_dashboard_id
  ON m_dashboard_execution(dashboard_id);

CREATE INDEX IF NOT EXISTS idx_analytics_insight_type
  ON m_analytics_insight(insight_type);

CREATE INDEX IF NOT EXISTS idx_analytics_insight_relevance
  ON m_analytics_insight(relevance_score DESC);

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_consolidated_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consolidated_report_update_timestamp
BEFORE UPDATE ON m_consolidated_report
FOR EACH ROW EXECUTE FUNCTION update_consolidated_report_timestamp();

CREATE TRIGGER cross_module_metric_update_timestamp
BEFORE UPDATE ON m_cross_module_metric
FOR EACH ROW EXECUTE FUNCTION update_consolidated_report_timestamp();

CREATE TRIGGER cross_module_dashboard_update_timestamp
BEFORE UPDATE ON m_cross_module_dashboard
FOR EACH ROW EXECUTE FUNCTION update_consolidated_report_timestamp();

-- Insert some default data sources
INSERT INTO m_reporting_datasource (
  name, 
  module_type, 
  is_active, 
  sync_status
) VALUES 
('Loan Module', 'loan', true, 'ready'),
('Client Module', 'client', true, 'ready'),
('Savings Module', 'savings', true, 'ready'),
('Accounting Module', 'accounting', true, 'ready'),
('Group Module', 'group', true, 'ready'),
('Staff Module', 'staff', true, 'ready')
ON CONFLICT DO NOTHING;

-- Insert sample cross-module dashboards
INSERT INTO m_cross_module_dashboard (
  name,
  display_name,
  description,
  metrics,
  is_active
) VALUES 
('executive_dashboard', 'Executive Dashboard', 'Key organizational performance metrics across all modules', 
 '[
    {"metricId": "total_portfolio", "position": {"x": 0, "y": 0, "w": 6, "h": 1}},
    {"metricId": "active_clients", "position": {"x": 6, "y": 0, "w": 6, "h": 1}},
    {"metricId": "portfolio_at_risk", "position": {"x": 0, "y": 1, "w": 4, "h": 2}},
    {"metricId": "revenue_by_product", "position": {"x": 4, "y": 1, "w": 8, "h": 2}},
    {"metricId": "cash_flow_trend", "position": {"x": 0, "y": 3, "w": 12, "h": 2}}
  ]',
 true),
('financial_performance', 'Financial Performance', 'Comprehensive financial performance metrics', 
 '[
    {"metricId": "income_vs_expenses", "position": {"x": 0, "y": 0, "w": 12, "h": 2}},
    {"metricId": "roi_by_product", "position": {"x": 0, "y": 2, "w": 6, "h": 2}},
    {"metricId": "operational_efficiency", "position": {"x": 6, "y": 2, "w": 6, "h": 2}},
    {"metricId": "product_profitability", "position": {"x": 0, "y": 4, "w": 12, "h": 2}}
  ]',
 true)
ON CONFLICT DO NOTHING;