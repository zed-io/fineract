-- Trinidad and Tobago Credit Union specific schema enhancements
-- Based on requirements analysis for enhanced digital banking capabilities

-- Set search path
SET search_path TO fineract_default, public;

-- Enhanced KYC/AML tables for improved regulatory compliance
CREATE TYPE identity_verification_status AS ENUM (
  'pending', 'verified', 'rejected', 'expired'
);

CREATE TYPE identity_document_type AS ENUM (
  'national_id', 'passport', 'drivers_license', 'certificate_of_birth', 
  'utility_bill', 'bank_statement', 'digital_signature'
);

-- KYC document verification tracking
CREATE TABLE identity_verification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  document_type identity_document_type NOT NULL,
  document_number VARCHAR(100) NOT NULL,
  issuing_authority VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  verification_status identity_verification_status NOT NULL DEFAULT 'pending',
  verification_date TIMESTAMP,
  verified_by_user_id UUID REFERENCES app_user(id),
  document_image_url VARCHAR(500),
  rejection_reason TEXT,
  digital_signature_data TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID
);

-- Enhanced mobile banking capabilities
CREATE TABLE mobile_banking_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  device_id VARCHAR(100),
  device_type VARCHAR(50),
  device_model VARCHAR(100),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  biometric_enabled BOOLEAN DEFAULT FALSE,
  push_notification_token VARCHAR(255),
  last_login_timestamp TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  security_questions_configured BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID,
  UNIQUE(client_id, device_id)
);

-- Digital wallet integration
CREATE TABLE digital_wallet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  wallet_provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(100) NOT NULL,
  wallet_token VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID,
  UNIQUE(client_id, wallet_provider, provider_account_id)
);

-- Enhanced loan origination flow for digital applications
CREATE TABLE loan_application_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id),
  current_stage VARCHAR(50) NOT NULL,
  application_channel VARCHAR(50) NOT NULL DEFAULT 'web',
  credit_score DECIMAL(5,2),
  auto_decision_result VARCHAR(50),
  has_income_verification BOOLEAN DEFAULT FALSE,
  has_collateral_verification BOOLEAN DEFAULT FALSE,
  assigned_officer_id UUID REFERENCES staff(id),
  additional_details JSONB,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID
);

-- Loan application workflow history
CREATE TABLE loan_application_workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_application_workflow_id UUID NOT NULL REFERENCES loan_application_workflow(id) ON DELETE CASCADE,
  previous_stage VARCHAR(50) NOT NULL,
  new_stage VARCHAR(50) NOT NULL,
  comments TEXT,
  action_by_user_id UUID REFERENCES app_user(id),
  action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Digital loan repayment methods for mobile/online channels
CREATE TABLE loan_repayment_method (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
  repayment_type VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50),
  payment_method_token VARCHAR(255),
  account_number VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID
);

-- Regulatory reporting enhancement for compliance
CREATE TABLE regulatory_report_submission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type VARCHAR(100) NOT NULL,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  submission_date TIMESTAMP,
  submitted_by_user_id UUID REFERENCES app_user(id),
  report_data JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  submission_reference VARCHAR(100),
  report_generated_filepath VARCHAR(500),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID
);

-- Credit Union specific configuration
CREATE TABLE credit_union_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id UUID NOT NULL REFERENCES office(id),
  enable_mobile_banking BOOLEAN DEFAULT TRUE,
  enable_digital_onboarding BOOLEAN DEFAULT TRUE,
  enable_digital_signatures BOOLEAN DEFAULT FALSE,
  enable_automated_credit_scoring BOOLEAN DEFAULT FALSE,
  kyc_document_requirements JSONB,
  digital_wallet_providers JSONB,
  loan_auto_approval_threshold DECIMAL(19, 6),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID
);

-- Security enhancements for multifactor authentication
CREATE TABLE multi_factor_auth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  mfa_type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'app', 'security_questions'
  phone_number VARCHAR(20),
  email VARCHAR(100),
  is_enabled BOOLEAN DEFAULT FALSE,
  secret_key VARCHAR(255),
  backup_codes JSONB,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID
);

-- Security questions for account recovery and additional verification
CREATE TABLE security_question (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID
);

CREATE TABLE user_security_answer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  security_question_id UUID NOT NULL REFERENCES security_question(id),
  answer_hash VARCHAR(255) NOT NULL,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_modified_date TIMESTAMP,
  last_modified_by UUID,
  UNIQUE(app_user_id, security_question_id)
);

-- Triggers for audit
CREATE TRIGGER identity_verification_audit BEFORE INSERT OR UPDATE ON identity_verification FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER mobile_banking_profile_audit BEFORE INSERT OR UPDATE ON mobile_banking_profile FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER digital_wallet_audit BEFORE INSERT OR UPDATE ON digital_wallet FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_application_workflow_audit BEFORE INSERT OR UPDATE ON loan_application_workflow FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER loan_repayment_method_audit BEFORE INSERT OR UPDATE ON loan_repayment_method FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER regulatory_report_submission_audit BEFORE INSERT OR UPDATE ON regulatory_report_submission FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER credit_union_config_audit BEFORE INSERT OR UPDATE ON credit_union_config FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER multi_factor_auth_audit BEFORE INSERT OR UPDATE ON multi_factor_auth FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER security_question_audit BEFORE INSERT OR UPDATE ON security_question FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER user_security_answer_audit BEFORE INSERT OR UPDATE ON user_security_answer FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Indexes for performance
CREATE INDEX idx_identity_verification_client_id ON identity_verification(client_id);
CREATE INDEX idx_identity_verification_status ON identity_verification(verification_status);
CREATE INDEX idx_mobile_banking_profile_client_id ON mobile_banking_profile(client_id);
CREATE INDEX idx_digital_wallet_client_id ON digital_wallet(client_id);
CREATE INDEX idx_loan_application_workflow_loan_id ON loan_application_workflow(loan_id);
CREATE INDEX idx_loan_application_workflow_client_id ON loan_application_workflow(client_id);
CREATE INDEX idx_loan_application_workflow_stage ON loan_application_workflow(current_stage);
CREATE INDEX idx_loan_repayment_method_loan_id ON loan_repayment_method(loan_id);
CREATE INDEX idx_regulatory_report_submission_type ON regulatory_report_submission(report_type);
CREATE INDEX idx_regulatory_report_submission_status ON regulatory_report_submission(status);
CREATE INDEX idx_multi_factor_auth_user_id ON multi_factor_auth(app_user_id);
CREATE INDEX idx_user_security_answer_user_id ON user_security_answer(app_user_id);

-- Default security questions
INSERT INTO security_question (question_text) VALUES 
('What is the name of your first pet?'),
('In which city were you born?'),
('What is your mother''s maiden name?'),
('What was the make of your first car?'),
('What was the name of your primary school?');

-- Default credit union configuration
INSERT INTO credit_union_config (
  office_id, 
  enable_mobile_banking, 
  enable_digital_onboarding,
  enable_digital_signatures,
  enable_automated_credit_scoring,
  kyc_document_requirements,
  digital_wallet_providers
) 
VALUES (
  (SELECT id FROM office WHERE name = 'Head Office'),
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  '{"required": ["national_id", "utility_bill"], "optional": ["passport", "drivers_license"]}',
  '["mobile_money", "bank_transfer", "card_payment"]'
);