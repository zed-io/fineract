-- Migration file for fraud detection and AML/KYC functionality
-- Creates tables to store fraud detection results and risk assessments

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create enum types for fraud detection
CREATE TYPE fraud_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE fraud_check_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE fraud_check_type AS ENUM (
  'identity_verification',
  'address_verification',
  'document_authenticity',
  'transaction_pattern',
  'aml_screening',
  'pep_screening',
  'sanctions_screening',
  'credit_behavior'
);

-- Add risk fields to client table if they don't already exist
DO $$
BEGIN
    -- Add risk_level column if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_attribute 
                  WHERE attrelid = 'fineract_default.client'::regclass
                  AND attname = 'risk_level'
                  AND NOT attisdropped) THEN
        ALTER TABLE client ADD COLUMN risk_level VARCHAR(20);
    END IF;

    -- Add risk_reason column if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_attribute 
                  WHERE attrelid = 'fineract_default.client'::regclass
                  AND attname = 'risk_reason'
                  AND NOT attisdropped) THEN
        ALTER TABLE client ADD COLUMN risk_reason TEXT;
    END IF;
    
    -- Add last_risk_review_date column if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_attribute 
                  WHERE attrelid = 'fineract_default.client'::regclass
                  AND attname = 'last_risk_review_date'
                  AND NOT attisdropped) THEN
        ALTER TABLE client ADD COLUMN last_risk_review_date TIMESTAMP;
    END IF;
END
$$;

-- Create table for storing fraud check results
CREATE TABLE fraud_check (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    check_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    overall_risk_level fraud_risk_level NOT NULL,
    requires_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
    review_reason TEXT,
    manual_review_resolved BOOLEAN DEFAULT FALSE,
    manual_review_approved BOOLEAN,
    manual_review_notes TEXT,
    manual_review_date TIMESTAMP,
    manual_review_by VARCHAR(100),
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create table for storing individual fraud check details
CREATE TABLE fraud_check_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fraud_check_id UUID NOT NULL REFERENCES fraud_check(id) ON DELETE CASCADE,
    check_type fraud_check_type NOT NULL,
    status fraud_check_status NOT NULL,
    risk_level fraud_risk_level NOT NULL,
    score INTEGER NOT NULL,
    details TEXT,
    match_details JSONB,
    raw_response JSONB,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create table for AML/KYC configuration
CREATE TABLE aml_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    api_url VARCHAR(512),
    api_key VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    connection_timeout INTEGER DEFAULT 30000,
    read_timeout INTEGER DEFAULT 30000,
    config_parameters JSONB,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create table for PEP/sanctions watchlists
CREATE TABLE watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_name VARCHAR(100) NOT NULL UNIQUE,
    list_type VARCHAR(50) NOT NULL, -- 'pep', 'sanctions', 'aml', etc.
    list_source VARCHAR(100) NOT NULL,
    description TEXT,
    import_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    entry_count INTEGER NOT NULL DEFAULT 0,
    last_update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create table for watchlist entries
CREATE TABLE watchlist_entry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id UUID NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
    entry_type VARCHAR(50) NOT NULL, -- 'individual', 'entity', etc.
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    date_of_birth DATE,
    nationality VARCHAR(100),
    identifier VARCHAR(255), -- Passport number, ID number, etc.
    identifier_type VARCHAR(50),
    position VARCHAR(255), -- For PEPs
    category VARCHAR(100), -- PEP category, sanction type, etc.
    listing_date DATE,
    unlisting_date DATE,
    notes TEXT,
    metadata JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100)
);

-- Create client match table for tracking client matches with watchlists
CREATE TABLE client_watchlist_match (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    watchlist_entry_id UUID NOT NULL REFERENCES watchlist_entry(id),
    match_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    match_score DECIMAL(5, 2) NOT NULL, -- 0-100 score
    match_fields JSONB NOT NULL, -- Which fields matched
    status VARCHAR(50) NOT NULL, -- 'pending', 'confirmed', 'rejected', etc.
    review_notes TEXT,
    reviewed_by VARCHAR(100),
    reviewed_date TIMESTAMP,
    created_date TIMESTAMP,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMP,
    last_modified_by VARCHAR(100),
    UNIQUE(client_id, watchlist_entry_id)
);

-- Create indices for better query performance
CREATE INDEX idx_fraud_check_client_id ON fraud_check(client_id);
CREATE INDEX idx_fraud_check_date ON fraud_check(check_date);
CREATE INDEX idx_fraud_check_risk_level ON fraud_check(overall_risk_level);
CREATE INDEX idx_fraud_check_review ON fraud_check(requires_manual_review, manual_review_resolved);
CREATE INDEX idx_fraud_check_detail_check_id ON fraud_check_detail(fraud_check_id);
CREATE INDEX idx_fraud_check_detail_type ON fraud_check_detail(check_type);
CREATE INDEX idx_fraud_check_detail_risk_level ON fraud_check_detail(risk_level);
CREATE INDEX idx_watchlist_entry_watchlist_id ON watchlist_entry(watchlist_id);
CREATE INDEX idx_watchlist_entry_name ON watchlist_entry(full_name);
CREATE INDEX idx_client_watchlist_match_client_id ON client_watchlist_match(client_id);
CREATE INDEX idx_client_watchlist_match_entry_id ON client_watchlist_match(watchlist_entry_id);
CREATE INDEX idx_client_watchlist_match_status ON client_watchlist_match(status);
CREATE INDEX idx_client_risk_level ON client(risk_level);

-- Create audit triggers
CREATE TRIGGER fraud_check_audit
BEFORE INSERT OR UPDATE ON fraud_check
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER fraud_check_detail_audit
BEFORE INSERT OR UPDATE ON fraud_check_detail
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER aml_configuration_audit
BEFORE INSERT OR UPDATE ON aml_configuration
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER watchlist_audit
BEFORE INSERT OR UPDATE ON watchlist
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER watchlist_entry_audit
BEFORE INSERT OR UPDATE ON watchlist_entry
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER client_watchlist_match_audit
BEFORE INSERT OR UPDATE ON client_watchlist_match
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Add permission for fraud detection
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_FRAUDDETECTION', 'FRAUDDETECTION', 'CREATE', true),
('portfolio', 'READ_FRAUDDETECTION', 'FRAUDDETECTION', 'READ', false),
('portfolio', 'UPDATE_FRAUDDETECTION', 'FRAUDDETECTION', 'UPDATE', true),
('portfolio', 'DELETE_FRAUDDETECTION', 'FRAUDDETECTION', 'DELETE', true),
('portfolio', 'REVIEW_FRAUDDETECTION', 'FRAUDDETECTION', 'REVIEW', true)
ON CONFLICT DO NOTHING;

-- Insert default AML configurations
INSERT INTO aml_configuration (
    provider_name, 
    api_url, 
    is_active, 
    config_parameters,
    created_date,
    created_by
)
VALUES
    (
        'ComplyAdvantage', 
        'https://api.complyadvantage.com/v1', 
        true, 
        '{"checkTypes": ["AML", "PEP", "SANCTIONS"], "searchAlgorithm": "fuzzy_matching", "maxResultCount": 50}',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'RDC', 
        'https://api.rdc.com/v1', 
        false, 
        '{"checkTypes": ["PEP", "ADVERSE_MEDIA", "SANCTIONS"], "searchAlgorithm": "strict_matching", "maxResultCount": 20}',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'WorldCheck', 
        'https://api.worldcheck.com/v2', 
        false, 
        '{"checkTypes": ["AML", "PEP", "SANCTIONS", "ADVERSE_MEDIA"], "searchAlgorithm": "enhanced_matching", "maxResultCount": 100}',
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'TTLocalCheck', 
        'https://api.ttlocalcheck.com/v1', 
        true, 
        '{"checkTypes": ["LOCAL_PEP", "LOCAL_SANCTIONS"], "regionCode": "TT", "searchAlgorithm": "local_matching", "maxResultCount": 20}',
        CURRENT_TIMESTAMP,
        'system'
    )
ON CONFLICT DO NOTHING;

-- Create default watchlists
INSERT INTO watchlist (
    list_name,
    list_type,
    list_source,
    description,
    is_active,
    created_date,
    created_by
)
VALUES
    (
        'OFAC SDN',
        'sanctions',
        'US Treasury Department',
        'Specially Designated Nationals and Blocked Persons List',
        true,
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'EU Consolidated Sanctions',
        'sanctions',
        'European Union',
        'EU Consolidated list of sanctions',
        true,
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'UN Consolidated Sanctions',
        'sanctions',
        'United Nations',
        'UN Consolidated Sanctions List',
        true,
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'TT National PEP List',
        'pep',
        'Trinidad and Tobago FIU',
        'Trinidad and Tobago National Politically Exposed Persons List',
        true,
        CURRENT_TIMESTAMP,
        'system'
    ),
    (
        'CFATF AML Watchlist',
        'aml',
        'Caribbean Financial Action Task Force',
        'Caribbean Financial Action Task Force AML Watchlist',
        true,
        CURRENT_TIMESTAMP,
        'system'
    )
ON CONFLICT DO NOTHING;

-- Add comment to explain tables
COMMENT ON TABLE fraud_check IS 'Stores fraud detection results for clients with risk assessments and review status';
COMMENT ON TABLE fraud_check_detail IS 'Stores individual fraud check results with details and match information';
COMMENT ON TABLE aml_configuration IS 'Configurations for connecting to different AML/KYC providers';
COMMENT ON TABLE watchlist IS 'Watchlists for PEP, sanctions, and AML screening';
COMMENT ON TABLE watchlist_entry IS 'Individual entries in watchlists for screening matches';
COMMENT ON TABLE client_watchlist_match IS 'Matches between clients and watchlist entries';

-- Create function to trigger fraud detection for new clients
CREATE OR REPLACE FUNCTION trigger_fraud_detection_for_new_client()
RETURNS TRIGGER AS $$
BEGIN
    -- If a client is being created or activated
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status_enum <> NEW.status_enum AND NEW.status_enum = 300) THEN
       
        -- Flag the client for fraud detection (in real implementation, this would trigger an event)
        INSERT INTO fineract_default.client_audit (
            client_id, action_type, action_timestamp, performed_by, changes
        ) VALUES (
            NEW.id, 
            'fraud_detection_required', 
            CURRENT_TIMESTAMP, 
            NEW.last_modified_by, 
            jsonb_build_object(
                'client_id', NEW.id,
                'firstname', NEW.firstname,
                'lastname', NEW.lastname,
                'status', NEW.status_enum
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to client table
CREATE TRIGGER client_fraud_detection_trigger
AFTER INSERT OR UPDATE ON client
FOR EACH ROW EXECUTE FUNCTION trigger_fraud_detection_for_new_client();