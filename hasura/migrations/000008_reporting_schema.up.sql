-- Migration file for Fineract reporting schema
-- This creates the necessary tables for the reporting system

-- Create Schema for report objects
SET search_path TO fineract_default;

-- Create report definition table
CREATE TABLE IF NOT EXISTS m_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50),
  report_sql TEXT,
  report_query JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_report BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Create report parameters table
CREATE TABLE IF NOT EXISTS m_report_parameter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_report(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  parameter_type VARCHAR(50) NOT NULL,
  default_value TEXT,
  select_options JSONB,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  validation_regex VARCHAR(200),
  query_for_options TEXT,
  depends_on VARCHAR(100),
  order_position INT NOT NULL DEFAULT 0,
  description TEXT,
  UNIQUE(report_id, name)
);

-- Create report columns table
CREATE TABLE IF NOT EXISTS m_report_column (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_report(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_sortable BOOLEAN NOT NULL DEFAULT FALSE,
  is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
  is_groupable BOOLEAN NOT NULL DEFAULT FALSE,
  is_aggregatable BOOLEAN NOT NULL DEFAULT FALSE,
  aggregation_method VARCHAR(50),
  format_function TEXT,
  order_position INT NOT NULL DEFAULT 0,
  default_sort_direction VARCHAR(10),
  default_is_sort BOOLEAN DEFAULT FALSE,
  default_sort_order INT,
  column_width INT,
  column_function TEXT,
  UNIQUE(report_id, name)
);

-- Create report execution history
CREATE TABLE IF NOT EXISTS m_report_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_report(id),
  scheduled_report_id UUID,
  execution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parameters JSONB,
  format VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  execution_time_ms INT NOT NULL,
  result_file_id UUID,
  executed_by UUID REFERENCES m_appuser(id)
);

-- Create scheduled reports
CREATE TABLE IF NOT EXISTS m_scheduled_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES m_report(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(50) NOT NULL,
  parameters JSONB,
  format VARCHAR(50) NOT NULL,
  recipient_emails TEXT[],
  start_date DATE NOT NULL,
  end_date DATE,
  last_run_date TIMESTAMP,
  next_run_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_report_execution_history_report_id
  ON m_report_execution_history(report_id);
  
CREATE INDEX IF NOT EXISTS idx_report_execution_history_execution_date
  ON m_report_execution_history(execution_date);

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_update_timestamp
BEFORE UPDATE ON m_report
FOR EACH ROW EXECUTE FUNCTION update_report_timestamp();

CREATE TRIGGER report_parameter_update_timestamp
BEFORE UPDATE ON m_report_parameter
FOR EACH ROW EXECUTE FUNCTION update_report_timestamp();

CREATE TRIGGER report_column_update_timestamp
BEFORE UPDATE ON m_report_column
FOR EACH ROW EXECUTE FUNCTION update_report_timestamp();

CREATE TRIGGER scheduled_report_update_timestamp
BEFORE UPDATE ON m_scheduled_report
FOR EACH ROW EXECUTE FUNCTION update_report_timestamp();

-- Insert some default reports
INSERT INTO m_report (
  name, 
  display_name, 
  description, 
  category, 
  sub_category, 
  is_active, 
  is_system_report
) VALUES 
('portfolio_at_risk', 'Portfolio at Risk Report', 'Shows outstanding loan amounts at different levels of risk', 'portfolio', 'risk', true, true),
('collection_report', 'Collection Report', 'Shows expected vs actual collections for a period', 'portfolio', 'collections', true, true),
('loan_portfolio_summary', 'Loan Portfolio Summary', 'Provides a summary of the loan portfolio', 'portfolio', 'summary', true, true),
('expected_repayments', 'Expected Repayments Report', 'Shows expected repayments for a future period', 'portfolio', 'collections', true, true),
('income_statement', 'Income Statement', 'Standard income statement (profit & loss)', 'financial', 'statements', true, true),
('balance_sheet', 'Balance Sheet', 'Standard balance sheet', 'financial', 'statements', true, true),
('financial_ratios', 'Financial Ratios', 'Key performance indicators and ratios', 'financial', 'analysis', true, true),
('interest_income', 'Interest Income Report', 'Detailed breakdown of interest income', 'financial', 'income', true, true),
('fee_income', 'Fee Income Report', 'Detailed breakdown of fee income', 'financial', 'income', true, true)
ON CONFLICT (name) DO NOTHING;