-- Migration file for Fineract custom reporting and visualization system
-- This creates the necessary tables for the custom reporting and data visualization features

-- Set schema
SET search_path TO fineract_default;

-- Create custom report templates table
CREATE TABLE IF NOT EXISTS m_custom_report_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  data_sources JSONB NOT NULL, -- List of data sources used in the report (tables, views, etc.)
  report_config JSONB NOT NULL, -- Configuration including columns, filters, etc.
  is_template BOOLEAN NOT NULL DEFAULT TRUE, -- Whether this is a template or a user's custom report
  is_public BOOLEAN NOT NULL DEFAULT FALSE, -- Whether the report is shared with all users
  parent_template_id UUID REFERENCES m_custom_report_template(id), -- For user reports based on templates
  owner_id UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP,
  UNIQUE(name, owner_id)
);

-- Create custom report parameters table
CREATE TABLE IF NOT EXISTS m_custom_report_parameter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_custom_report_template(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  parameter_type VARCHAR(50) NOT NULL,
  default_value TEXT,
  options JSONB, -- For select/multi-select parameters
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  validation_rules JSONB, -- JSON validation rules (min, max, pattern, etc.)
  help_text TEXT,
  order_position INT NOT NULL DEFAULT 0,
  UNIQUE(report_id, name)
);

-- Create custom report saved queries table
CREATE TABLE IF NOT EXISTS m_custom_report_saved_query (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_custom_report_template(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL, -- Parameter values
  filters JSONB, -- Applied filters
  owner_id UUID NOT NULL REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP,
  UNIQUE(report_id, name, owner_id)
);

-- Create custom report execution history
CREATE TABLE IF NOT EXISTS m_custom_report_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_custom_report_template(id),
  saved_query_id UUID REFERENCES m_custom_report_saved_query(id),
  execution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parameters JSONB NOT NULL,
  filters JSONB,
  sorting JSONB,
  execution_time_ms INT NOT NULL,
  row_count INT NOT NULL,
  result_metadata JSONB,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  owner_id UUID NOT NULL REFERENCES m_appuser(id)
);

-- Create visualization components table
CREATE TABLE IF NOT EXISTS m_visualization_component (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  component_type VARCHAR(50) NOT NULL, -- pie, bar, line, table, etc.
  configuration JSONB NOT NULL, -- Visual settings, colors, etc.
  data_source JSONB NOT NULL, -- Can be a report ID or direct query
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  parent_component_id UUID REFERENCES m_visualization_component(id),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP,
  UNIQUE(name, owner_id)
);

-- Create dashboards table
CREATE TABLE IF NOT EXISTS m_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  layout_config JSONB NOT NULL, -- Dashboard layout (grid positions, sizes)
  is_system BOOLEAN NOT NULL DEFAULT FALSE, -- System dashboards cannot be deleted
  is_public BOOLEAN NOT NULL DEFAULT FALSE, -- Whether dashboard is shared with all users
  is_default BOOLEAN NOT NULL DEFAULT FALSE, -- Whether this is the user's default dashboard
  owner_id UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP,
  UNIQUE(name, owner_id)
);

-- Create dashboard panels table (links dashboards to visualization components)
CREATE TABLE IF NOT EXISTS m_dashboard_panel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES m_dashboard(id) ON DELETE CASCADE,
  visualization_id UUID NOT NULL REFERENCES m_visualization_component(id),
  panel_title VARCHAR(200),
  panel_description TEXT,
  position_config JSONB NOT NULL, -- x, y, width, height in the grid
  panel_config JSONB, -- Panel-specific settings (borders, refresh rate, etc.)
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP,
  UNIQUE(dashboard_id, visualization_id)
);

-- Create user dashboard preferences
CREATE TABLE IF NOT EXISTS m_user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES m_appuser(id),
  dashboard_id UUID NOT NULL REFERENCES m_dashboard(id),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT,
  custom_settings JSONB,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP,
  UNIQUE(user_id, dashboard_id)
);

-- Create scheduled dashboards (for automatic email delivery)
CREATE TABLE IF NOT EXISTS m_scheduled_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES m_dashboard(id),
  name VARCHAR(200) NOT NULL,
  frequency VARCHAR(50) NOT NULL, -- daily, weekly, monthly, etc.
  schedule_config JSONB NOT NULL, -- cron pattern or specific settings
  format VARCHAR(50) NOT NULL, -- pdf, html, etc.
  recipient_emails TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_date TIMESTAMP,
  next_run_date TIMESTAMP,
  owner_id UUID NOT NULL REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP
);

-- Create data marts table (for pre-computed datasets optimized for reporting)
CREATE TABLE IF NOT EXISTS m_data_mart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  source_query TEXT NOT NULL, -- SQL query for creating the data mart
  refresh_frequency VARCHAR(50) NOT NULL, -- hourly, daily, weekly, etc.
  refresh_config JSONB, -- Additional refresh configuration
  last_refresh_date TIMESTAMP,
  next_refresh_date TIMESTAMP,
  row_count INT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, ready, failed, refreshing
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_report_owner
  ON m_custom_report_template(owner_id);
  
CREATE INDEX IF NOT EXISTS idx_custom_report_public
  ON m_custom_report_template(is_public);
  
CREATE INDEX IF NOT EXISTS idx_visualization_component_owner
  ON m_visualization_component(owner_id);
  
CREATE INDEX IF NOT EXISTS idx_visualization_component_public
  ON m_visualization_component(is_public);
  
CREATE INDEX IF NOT EXISTS idx_dashboard_owner
  ON m_dashboard(owner_id);
  
CREATE INDEX IF NOT EXISTS idx_dashboard_public
  ON m_dashboard(is_public);
  
CREATE INDEX IF NOT EXISTS idx_custom_report_execution_report
  ON m_custom_report_execution(report_id);
  
CREATE INDEX IF NOT EXISTS idx_custom_report_execution_date
  ON m_custom_report_execution(execution_date);

-- Add triggers to update timestamps
CREATE OR REPLACE FUNCTION update_custom_reporting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_report_update_timestamp
BEFORE UPDATE ON m_custom_report_template
FOR EACH ROW EXECUTE FUNCTION update_custom_reporting_timestamp();

CREATE TRIGGER visualization_component_update_timestamp
BEFORE UPDATE ON m_visualization_component
FOR EACH ROW EXECUTE FUNCTION update_custom_reporting_timestamp();

CREATE TRIGGER dashboard_update_timestamp
BEFORE UPDATE ON m_dashboard
FOR EACH ROW EXECUTE FUNCTION update_custom_reporting_timestamp();

CREATE TRIGGER dashboard_panel_update_timestamp
BEFORE UPDATE ON m_dashboard_panel
FOR EACH ROW EXECUTE FUNCTION update_custom_reporting_timestamp();

CREATE TRIGGER user_dashboard_prefs_update_timestamp
BEFORE UPDATE ON m_user_dashboard_preferences
FOR EACH ROW EXECUTE FUNCTION update_custom_reporting_timestamp();

CREATE TRIGGER scheduled_dashboard_update_timestamp
BEFORE UPDATE ON m_scheduled_dashboard
FOR EACH ROW EXECUTE FUNCTION update_custom_reporting_timestamp();

CREATE TRIGGER data_mart_update_timestamp
BEFORE UPDATE ON m_data_mart
FOR EACH ROW EXECUTE FUNCTION update_custom_reporting_timestamp();

-- Insert default data marts
INSERT INTO m_data_mart (
  name,
  display_name,
  description,
  source_query,
  refresh_frequency,
  status
) VALUES
('loan_summary_mart', 
 'Loan Summary Data Mart', 
 'Summarized loan data optimized for reporting and analytics',
 'SELECT 
    l.id as loan_id,
    c.id as client_id,
    c.display_name as client_name,
    lp.id as product_id,
    lp.name as product_name,
    o.id as office_id,
    o.name as office_name,
    s.id as staff_id,
    s.display_name as loan_officer_name,
    l.principal_amount,
    l.disbursedon_date,
    l.expected_maturedon_date,
    l.loan_status_id,
    (SELECT COALESCE(SUM(ltp.amount), 0) FROM m_loan_transaction ltp WHERE ltp.loan_id = l.id AND ltp.transaction_type_enum = 1) as amount_repaid,
    (SELECT COALESCE(SUM(ltp.amount), 0) FROM m_loan_transaction ltp WHERE ltp.loan_id = l.id AND ltp.transaction_type_enum = 2) as amount_outstanding
  FROM m_loan l
  JOIN m_client c ON c.id = l.client_id
  JOIN m_product_loan lp ON lp.id = l.product_id
  JOIN m_office o ON o.id = l.office_id
  LEFT JOIN m_staff s ON s.id = l.loan_officer_id
  WHERE l.loan_status_id IN (300, 600, 700)',
 'daily',
 'pending'),

('client_summary_mart', 
 'Client Summary Data Mart', 
 'Summarized client data optimized for reporting and analytics',
 'SELECT
    c.id as client_id,
    c.account_no,
    c.status_enum,
    c.activation_date,
    c.display_name,
    c.mobile_no,
    c.date_of_birth,
    c.gender_cv_id,
    o.id as office_id,
    o.name as office_name,
    s.id as staff_id,
    s.display_name as staff_name,
    (SELECT COUNT(*) FROM m_loan l WHERE l.client_id = c.id) as loan_count,
    (SELECT COUNT(*) FROM m_savings_account sa WHERE sa.client_id = c.id) as savings_count
  FROM m_client c
  JOIN m_office o ON o.id = c.office_id
  LEFT JOIN m_staff s ON s.id = c.staff_id',
 'daily',
 'pending'),

('financial_summary_mart', 
 'Financial Summary Data Mart', 
 'Summarized financial data optimized for reporting and analytics',
 'SELECT
    je.id as journal_entry_id,
    je.office_id,
    o.name as office_name,
    je.transaction_date,
    je.entry_date,
    je.created_date,
    ga.id as gl_account_id,
    ga.name as gl_account_name,
    ga.gl_code,
    je.type_enum,
    je.amount,
    je.description
  FROM acc_gl_journal_entry je
  JOIN acc_gl_account ga ON ga.id = je.account_id
  JOIN m_office o ON o.id = je.office_id',
 'daily',
 'pending');

-- Insert default system dashboard
INSERT INTO m_dashboard (
  name,
  display_name,
  description,
  layout_config,
  is_system,
  is_public,
  is_default
) VALUES
('executive_overview', 
 'Executive Overview', 
 'Executive dashboard with key metrics and KPIs',
 '{
    "layoutType": "grid",
    "columns": 12,
    "rowHeight": 80,
    "backgroundColor": "#f5f5f5",
    "margin": {"x": 10, "y": 10}
 }',
 true,
 true,
 true);

-- Insert default visualization templates
INSERT INTO m_visualization_component (
  name,
  display_name,
  description,
  component_type,
  configuration,
  data_source,
  is_template,
  is_public
) VALUES
('loan_portfolio_pie', 
 'Loan Portfolio by Product', 
 'Pie chart showing loan portfolio distribution by product',
 'pie',
 '{
    "colorScheme": "categorical",
    "legend": {"position": "right", "enabled": true},
    "labels": {"enabled": true, "format": "${value}"},
    "tooltip": {"enabled": true}
 }',
 '{
    "type": "report",
    "reportId": "loan_portfolio_summary",
    "mapping": {
      "labels": "productName",
      "values": "outstanding",
      "tooltipFields": ["productName", "outstanding", "percentByAmount"]
    }
 }',
 true,
 true),

('collections_trend', 
 'Collections Trend', 
 'Line chart showing collection trends over time',
 'line',
 '{
    "colorScheme": "sequential",
    "legend": {"position": "bottom", "enabled": true},
    "axes": {
      "x": {"title": "Date", "type": "time"},
      "y": {"title": "Amount", "format": "currency"}
    },
    "tooltip": {"enabled": true}
 }',
 '{
    "type": "report",
    "reportId": "collection_report",
    "mapping": {
      "x": "date",
      "y": ["expected", "actual"],
      "series": ["Expected", "Actual"],
      "tooltipFields": ["date", "expected", "actual", "ratio"]
    }
 }',
 true,
 true),

('portfolio_at_risk_gauge', 
 'Portfolio at Risk', 
 'Gauge chart showing portfolio at risk percentage',
 'gauge',
 '{
    "colorStops": [
      {"value": 0, "color": "#00C851"},
      {"value": 5, "color": "#FFBB33"},
      {"value": 10, "color": "#FF4444"}
    ],
    "min": 0,
    "max": 20,
    "format": "percentage",
    "showValue": true
 }',
 '{
    "type": "report",
    "reportId": "portfolio_at_risk",
    "mapping": {
      "value": "parRatio"
    }
 }',
 true,
 true),

('client_growth_bar', 
 'Client Growth', 
 'Bar chart showing client growth over time',
 'bar',
 '{
    "colorScheme": "categorical",
    "legend": {"position": "bottom", "enabled": true},
    "axes": {
      "x": {"title": "Month", "type": "category"},
      "y": {"title": "Clients", "format": "number"}
    },
    "tooltip": {"enabled": true},
    "stacked": false
 }',
 '{
    "type": "query",
    "query": "SELECT TO_CHAR(activation_date, \'YYYY-MM\') as month, COUNT(*) as client_count FROM m_client GROUP BY month ORDER BY month",
    "mapping": {
      "x": "month",
      "y": "client_count",
      "tooltipFields": ["month", "client_count"]
    }
 }',
 true,
 true);