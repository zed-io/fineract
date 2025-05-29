-- Create savings statement history table
CREATE TABLE IF NOT EXISTS "default".savings_statement_history (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES "default".savings_account(id),
  generated_date TIMESTAMP NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  format VARCHAR(10) NOT NULL,
  file_path VARCHAR(255),
  created_by UUID REFERENCES "default".m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_savings_statement_history_account_id ON "default".savings_statement_history(account_id);
CREATE INDEX IF NOT EXISTS idx_savings_statement_history_generated_date ON "default".savings_statement_history(generated_date);