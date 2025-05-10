-- Migration file for Fineract client and group management
-- Creates the schema for managing clients and groups

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Client management tables
CREATE TABLE client (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_no VARCHAR(100) NOT NULL UNIQUE,
    external_id VARCHAR(100) UNIQUE,
    status status_type NOT NULL DEFAULT 'pending',
    sub_status VARCHAR(100),
    activation_date DATE,
    office_id UUID NOT NULL REFERENCES office(id),
    staff_id UUID REFERENCES staff(id),
    submitted_date DATE,
    mobile_no VARCHAR(50),
    email_address VARCHAR(100),
    date_of_birth DATE,
    gender gender_type,
    client_type client_type NOT NULL DEFAULT 'person',
    client_classification_cv_id UUID REFERENCES code_value(id),
    legal_form_id UUID REFERENCES code_value(id),
    
    -- Person details
    firstname VARCHAR(100),
    middlename VARCHAR(100),
    lastname VARCHAR(100),
    fullname VARCHAR(300),
    display_name VARCHAR(300),
    marital_status marital_status_type,
    nationality VARCHAR(100),
    
    -- Company/entity details
    company_name VARCHAR(250),
    company_registration_no VARCHAR(100),
    company_registration_date DATE,
    
    -- Audit fields
    submitted_by_userid UUID REFERENCES app_user(id),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    closed_date DATE,
    closed_by_userid UUID REFERENCES app_user(id),
    reopened_date DATE,
    reopened_by_userid UUID REFERENCES app_user(id),
    
    CONSTRAINT check_person_fields CHECK (
        (client_type = 'person' AND firstname IS NOT NULL) OR
        (client_type = 'entity' AND company_name IS NOT NULL) OR
        client_type = 'group'
    )
);

CREATE TABLE client_identifier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES code_value(id),
    document_key VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    status status_type NOT NULL DEFAULT 'active',
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(client_id, document_type_id, document_key)
);

CREATE TABLE client_address (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    address_type address_type NOT NULL DEFAULT 'permanent',
    address_line_1 VARCHAR(500),
    address_line_2 VARCHAR(500),
    address_line_3 VARCHAR(500),
    city VARCHAR(100),
    state_province VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

CREATE TABLE client_family_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    firstname VARCHAR(100) NOT NULL,
    middlename VARCHAR(100),
    lastname VARCHAR(100),
    qualification VARCHAR(100),
    mobile_number VARCHAR(50),
    age INTEGER,
    is_dependent BOOLEAN NOT NULL DEFAULT FALSE,
    relationship_id UUID REFERENCES code_value(id),
    marital_status marital_status_type,
    gender gender_type,
    date_of_birth DATE,
    profession VARCHAR(100),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

CREATE TABLE client_document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    name VARCHAR(250) NOT NULL,
    file_name VARCHAR(250) NOT NULL,
    size BIGINT,
    type VARCHAR(100),
    description VARCHAR(500),
    location VARCHAR(500) NOT NULL,
    storage_type VARCHAR(100) NOT NULL DEFAULT 'filesystem',
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Group management tables
CREATE TABLE client_group (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL REFERENCES office(id),
    staff_id UUID REFERENCES staff(id),
    parent_id UUID REFERENCES client_group(id),
    level_id UUID REFERENCES code_value(id),
    group_name VARCHAR(100) NOT NULL,
    external_id VARCHAR(100) UNIQUE,
    status status_type NOT NULL DEFAULT 'pending',
    activation_date DATE,
    submitted_date DATE,
    submitter_user_id UUID REFERENCES app_user(id),
    is_centralized_group BOOLEAN NOT NULL DEFAULT FALSE,
    hierarchy VARCHAR(100),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    closed_date DATE,
    closed_by_userid UUID REFERENCES app_user(id)
);

CREATE TABLE client_group_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES client_group(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(group_id, client_id)
);

CREATE TABLE client_group_role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES client_group(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES code_value(id),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(group_id, client_id, role_id)
);

-- Client Notes and Comments
CREATE TABLE client_note (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

CREATE TABLE group_note (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES client_group(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Client business details
CREATE TABLE client_business (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    business_name VARCHAR(250),
    business_type VARCHAR(100),
    business_activity VARCHAR(250),
    business_address VARCHAR(500),
    registration_number VARCHAR(100),
    registration_date DATE,
    monthly_revenue DECIMAL(19,6),
    monthly_expense DECIMAL(19,6),
    business_description TEXT,
    years_in_business INTEGER,
    number_of_employees INTEGER,
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(client_id)
);

-- Audit Trail
CREATE TABLE client_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    action_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES app_user(id),
    office_id UUID REFERENCES office(id),
    entity_name VARCHAR(100) NOT NULL,
    resource_id UUID,
    changes JSONB,
    created_date TIMESTAMP,
    created_by UUID
);

-- Client Transfer
CREATE TABLE client_transfer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id),
    from_office_id UUID NOT NULL REFERENCES office(id),
    to_office_id UUID NOT NULL REFERENCES office(id),
    from_staff_id UUID REFERENCES staff(id),
    to_staff_id UUID REFERENCES staff(id),
    transfer_date DATE NOT NULL,
    submitted_date DATE NOT NULL,
    submitted_by UUID NOT NULL REFERENCES app_user(id),
    status status_type NOT NULL DEFAULT 'pending',
    description VARCHAR(500),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Group Transfer
CREATE TABLE group_transfer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES client_group(id),
    from_office_id UUID NOT NULL REFERENCES office(id),
    to_office_id UUID NOT NULL REFERENCES office(id),
    transfer_date DATE NOT NULL,
    submitted_date DATE NOT NULL,
    submitted_by UUID NOT NULL REFERENCES app_user(id),
    status status_type NOT NULL DEFAULT 'pending',
    description VARCHAR(500),
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER client_audit BEFORE INSERT OR UPDATE ON client FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_identifier_audit BEFORE INSERT OR UPDATE ON client_identifier FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_address_audit BEFORE INSERT OR UPDATE ON client_address FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_family_member_audit BEFORE INSERT OR UPDATE ON client_family_member FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_document_audit BEFORE INSERT OR UPDATE ON client_document FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_group_audit BEFORE INSERT OR UPDATE ON client_group FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_group_member_audit BEFORE INSERT OR UPDATE ON client_group_member FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_group_role_audit BEFORE INSERT OR UPDATE ON client_group_role FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_note_audit BEFORE INSERT OR UPDATE ON client_note FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER group_note_audit BEFORE INSERT OR UPDATE ON group_note FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_business_audit BEFORE INSERT OR UPDATE ON client_business FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_audit_audit BEFORE INSERT OR UPDATE ON client_audit FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER client_transfer_audit BEFORE INSERT OR UPDATE ON client_transfer FOR EACH ROW EXECUTE FUNCTION audit_fields();
CREATE TRIGGER group_transfer_audit BEFORE INSERT OR UPDATE ON group_transfer FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_client_status ON client(status);
CREATE INDEX idx_client_office_id ON client(office_id);
CREATE INDEX idx_client_staff_id ON client(staff_id);
CREATE INDEX idx_client_external_id ON client(external_id);
CREATE INDEX idx_client_mobile_no ON client(mobile_no);
CREATE INDEX idx_client_group_office_id ON client_group(office_id);
CREATE INDEX idx_client_group_staff_id ON client_group(staff_id);
CREATE INDEX idx_client_group_parent_id ON client_group(parent_id);
CREATE INDEX idx_client_group_member_group_id ON client_group_member(group_id);
CREATE INDEX idx_client_group_member_client_id ON client_group_member(client_id);

-- Insert code values for client types
INSERT INTO code (name, is_system_defined)
VALUES 
('ClientClassification', true),
('ClientLegalForm', true),
('ClientRelationshipType', true),
('GroupRole', true);

-- Insert code values for ClientClassification
INSERT INTO code_value (code_id, code_value, code_description, order_position, is_active)
SELECT id, 'Individual', 'Individual client', 1, true FROM code WHERE name = 'ClientClassification'
UNION ALL
SELECT id, 'Corporate', 'Corporate client', 2, true FROM code WHERE name = 'ClientClassification'
UNION ALL
SELECT id, 'SME', 'Small and Medium Enterprise', 3, true FROM code WHERE name = 'ClientClassification'
UNION ALL
SELECT id, 'LargeEnterprise', 'Large Enterprise', 4, true FROM code WHERE name = 'ClientClassification';

-- Insert code values for ClientLegalForm
INSERT INTO code_value (code_id, code_value, code_description, order_position, is_active)
SELECT id, 'Person', 'Individual person', 1, true FROM code WHERE name = 'ClientLegalForm'
UNION ALL
SELECT id, 'Entity', 'Legal entity or company', 2, true FROM code WHERE name = 'ClientLegalForm';

-- Insert code values for ClientRelationshipType
INSERT INTO code_value (code_id, code_value, code_description, order_position, is_active)
SELECT id, 'Spouse', 'Husband/Wife', 1, true FROM code WHERE name = 'ClientRelationshipType'
UNION ALL
SELECT id, 'Parent', 'Father/Mother', 2, true FROM code WHERE name = 'ClientRelationshipType'
UNION ALL
SELECT id, 'Child', 'Son/Daughter', 3, true FROM code WHERE name = 'ClientRelationshipType'
UNION ALL
SELECT id, 'Sibling', 'Brother/Sister', 4, true FROM code WHERE name = 'ClientRelationshipType'
UNION ALL
SELECT id, 'Other', 'Other relationship', 5, true FROM code WHERE name = 'ClientRelationshipType';

-- Insert code values for GroupRole
INSERT INTO code_value (code_id, code_value, code_description, order_position, is_active)
SELECT id, 'Leader', 'Group leader', 1, true FROM code WHERE name = 'GroupRole'
UNION ALL
SELECT id, 'Secretary', 'Group secretary', 2, true FROM code WHERE name = 'GroupRole'
UNION ALL
SELECT id, 'Treasurer', 'Group treasurer', 3, true FROM code WHERE name = 'GroupRole'
UNION ALL
SELECT id, 'Member', 'Regular group member', 4, true FROM code WHERE name = 'GroupRole';

-- Client-related permissions
INSERT INTO permission (grouping, code, entity_name, action_name, can_maker_checker)
VALUES
('portfolio', 'CREATE_CLIENT', 'CLIENT', 'CREATE', true),
('portfolio', 'READ_CLIENT', 'CLIENT', 'READ', false),
('portfolio', 'UPDATE_CLIENT', 'CLIENT', 'UPDATE', true),
('portfolio', 'DELETE_CLIENT', 'CLIENT', 'DELETE', true),
('portfolio', 'CREATE_CLIENT_IDENTIFIER', 'CLIENT_IDENTIFIER', 'CREATE', true),
('portfolio', 'READ_CLIENT_IDENTIFIER', 'CLIENT_IDENTIFIER', 'READ', false),
('portfolio', 'UPDATE_CLIENT_IDENTIFIER', 'CLIENT_IDENTIFIER', 'UPDATE', true),
('portfolio', 'DELETE_CLIENT_IDENTIFIER', 'CLIENT_IDENTIFIER', 'DELETE', true),
('portfolio', 'CREATE_GROUP', 'GROUP', 'CREATE', true),
('portfolio', 'READ_GROUP', 'GROUP', 'READ', false),
('portfolio', 'UPDATE_GROUP', 'GROUP', 'UPDATE', true),
('portfolio', 'DELETE_GROUP', 'GROUP', 'DELETE', true);

-- Functions and procedures

-- Function to generate client account number
CREATE OR REPLACE FUNCTION generate_client_account_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a unique account number based on client ID with a 'CL' prefix and timestamp
    NEW.account_no := 'CL' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || substring(md5(random()::text), 1, 4);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply account generation trigger to client table
CREATE TRIGGER client_account_number_trigger
BEFORE INSERT ON client
FOR EACH ROW
WHEN (NEW.account_no IS NULL)
EXECUTE FUNCTION generate_client_account_number();

-- Function to log changes to client table
CREATE OR REPLACE FUNCTION log_client_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO client_audit (
            client_id, action, entity_name, resource_id, changes, user_id, office_id, created_by
        ) VALUES (
            NEW.id, 'CREATE', 'CLIENT', NEW.id, 
            jsonb_build_object('new', row_to_json(NEW)::jsonb),
            NEW.created_by, NEW.office_id, NEW.created_by
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if there are changes
        IF row_to_json(NEW) != row_to_json(OLD) THEN
            INSERT INTO client_audit (
                client_id, action, entity_name, resource_id, changes, user_id, office_id, created_by
            ) VALUES (
                NEW.id, 'UPDATE', 'CLIENT', NEW.id,
                jsonb_build_object(
                    'old', row_to_json(OLD)::jsonb,
                    'new', row_to_json(NEW)::jsonb
                ),
                NEW.last_modified_by, NEW.office_id, NEW.last_modified_by
            );
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO client_audit (
            client_id, action, entity_name, resource_id, changes, user_id, office_id, created_by
        ) VALUES (
            OLD.id, 'DELETE', 'CLIENT', OLD.id,
            jsonb_build_object('old', row_to_json(OLD)::jsonb),
            current_setting('app.current_user_id', true)::uuid, OLD.office_id, current_setting('app.current_user_id', true)::uuid
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging trigger to client table
CREATE TRIGGER client_audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON client
FOR EACH ROW
EXECUTE FUNCTION log_client_audit();