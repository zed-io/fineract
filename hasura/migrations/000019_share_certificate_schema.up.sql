-- Migration file for Fineract share certificate management
-- Creates the schema for share certificates and templates

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create additional enum types for share certificates
CREATE TYPE share_certificate_status_type AS ENUM (
    'active',
    'revoked',
    'replaced',
    'expired'
);

-- Share Certificate Template
CREATE TABLE share_certificate_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    template_content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Certificate Series
CREATE TABLE share_certificate_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES share_product(id),
    prefix VARCHAR(20) NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Certificates
CREATE TABLE share_certificate (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_number VARCHAR(50) NOT NULL UNIQUE,
    account_id UUID NOT NULL REFERENCES share_account(id),
    template_id UUID NOT NULL REFERENCES share_certificate_template(id),
    series_id UUID NOT NULL REFERENCES share_certificate_series(id),
    
    issue_date DATE NOT NULL,
    issued_by UUID,
    revocation_date DATE,
    revoked_by UUID,
    expiry_date DATE,
    
    shares_quantity BIGINT NOT NULL,
    share_value DECIMAL(19, 6) NOT NULL,
    total_value DECIMAL(19, 6) NOT NULL,
    
    status share_certificate_status_type NOT NULL DEFAULT 'active',
    
    notes TEXT,
    signature_image_path VARCHAR(255),
    digital_signature_data TEXT,
    
    is_digital BOOLEAN NOT NULL DEFAULT TRUE,
    document_path VARCHAR(255),
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Certificate Batch Jobs
CREATE TABLE share_certificate_batch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES share_product(id),
    template_id UUID NOT NULL REFERENCES share_certificate_template(id),
    series_id UUID NOT NULL REFERENCES share_certificate_series(id),
    
    started_date TIMESTAMP NOT NULL,
    completed_date TIMESTAMP,
    started_by UUID,
    
    total_certificates INTEGER NOT NULL DEFAULT 0,
    processed_certificates INTEGER NOT NULL DEFAULT 0,
    failed_certificates INTEGER NOT NULL DEFAULT 0,
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    notes TEXT,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Share Certificate Batch Items
CREATE TABLE share_certificate_batch_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES share_certificate_batch(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES share_account(id),
    certificate_id UUID REFERENCES share_certificate(id),
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    
    created_date TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create audit triggers
CREATE TRIGGER share_certificate_template_audit 
BEFORE INSERT OR UPDATE ON share_certificate_template 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_certificate_series_audit 
BEFORE INSERT OR UPDATE ON share_certificate_series 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_certificate_audit 
BEFORE INSERT OR UPDATE ON share_certificate 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_certificate_batch_audit 
BEFORE INSERT OR UPDATE ON share_certificate_batch 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

CREATE TRIGGER share_certificate_batch_item_audit 
BEFORE INSERT OR UPDATE ON share_certificate_batch_item 
FOR EACH ROW EXECUTE FUNCTION audit_fields();

-- Create indexes for better query performance
CREATE INDEX idx_share_certificate_template_name ON share_certificate_template(name);
CREATE INDEX idx_share_certificate_template_is_default ON share_certificate_template(is_default);

CREATE INDEX idx_share_certificate_series_product_id ON share_certificate_series(product_id);
CREATE INDEX idx_share_certificate_series_prefix ON share_certificate_series(prefix);

CREATE INDEX idx_share_certificate_certificate_number ON share_certificate(certificate_number);
CREATE INDEX idx_share_certificate_account_id ON share_certificate(account_id);
CREATE INDEX idx_share_certificate_template_id ON share_certificate(template_id);
CREATE INDEX idx_share_certificate_series_id ON share_certificate(series_id);
CREATE INDEX idx_share_certificate_issue_date ON share_certificate(issue_date);
CREATE INDEX idx_share_certificate_status ON share_certificate(status);

CREATE INDEX idx_share_certificate_batch_product_id ON share_certificate_batch(product_id);
CREATE INDEX idx_share_certificate_batch_template_id ON share_certificate_batch(template_id);
CREATE INDEX idx_share_certificate_batch_series_id ON share_certificate_batch(series_id);
CREATE INDEX idx_share_certificate_batch_status ON share_certificate_batch(status);

CREATE INDEX idx_share_certificate_batch_item_batch_id ON share_certificate_batch_item(batch_id);
CREATE INDEX idx_share_certificate_batch_item_account_id ON share_certificate_batch_item(account_id);
CREATE INDEX idx_share_certificate_batch_item_certificate_id ON share_certificate_batch_item(certificate_id);
CREATE INDEX idx_share_certificate_batch_item_status ON share_certificate_batch_item(status);

-- Insert default template
INSERT INTO share_certificate_template (
    name, 
    description, 
    template_content, 
    is_active, 
    is_default
) VALUES (
    'Default Share Certificate Template',
    'Default template for share certificates',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Certificate</title>
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      margin: 0;
      padding: 0;
      color: #000;
      background-color: #fff;
    }
    .certificate-container {
      width: 800px;
      height: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 3px double #000;
      position: relative;
      background-color: #f9f9f9;
      background-image: url(''data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuXzEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcGF0dGVyblRyYW5zZm9ybT0icm90YXRlKDQ1KSI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjUiIGhlaWdodD0iNSIgZmlsbD0icmdiYSgwLDAsMCwwLjAyKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuXzEpIi8+PC9zdmc+'');
    }
    .border-pattern {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 1px solid #000;
      pointer-events: none;
    }
    .certificate-header {
      text-align: center;
      margin-bottom: 20px;
      padding-top: 20px;
    }
    .certificate-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .organization-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .certificate-content {
      text-align: center;
      margin: 40px 0;
      line-height: 1.6;
      font-size: 16px;
    }
    .certificate-details {
      margin: 30px auto;
      width: 80%;
      border-collapse: collapse;
    }
    .certificate-details td {
      padding: 8px;
      text-align: left;
    }
    .certificate-details td:first-child {
      font-weight: bold;
      width: 40%;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      padding: 0 40px;
    }
    .signature {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-bottom: 5px;
    }
    .signature-title {
      font-style: italic;
      font-size: 14px;
    }
    .certificate-seal {
      position: absolute;
      right: 30px;
      bottom: 40px;
      width: 120px;
      height: 120px;
      background-image: url(''data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODg4IiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODg4IiBzdHJva2Utd2lkdGg9IjEiLz48dGV4dCB4PSI1MCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzg4OCI+T0ZGSUNJQUwgU0VBTDwvdGV4dD48L3N2Zz4='');
      background-repeat: no-repeat;
      background-size: contain;
      opacity: 0.7;
    }
    .certificate-footer {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    .certificate-number {
      font-family: monospace;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="border-pattern"></div>
    <div class="certificate-header">
      <div class="certificate-title">Share Certificate</div>
      <div class="organization-name">{{organizationName}}</div>
    </div>
    
    <div class="certificate-content">
      <p>This certifies that <strong>{{clientName}}</strong> is the registered holder of 
      <strong>{{sharesQuantity}}</strong> shares of {{productName}}, 
      with a nominal value of {{currency}} {{shareValue}} each, for a total value of 
      <strong>{{currency}} {{totalValue}}</strong>.</p>
    </div>
    
    <table class="certificate-details">
      <tr>
        <td>Certificate Number:</td>
        <td class="certificate-number">{{certificateNumber}}</td>
      </tr>
      <tr>
        <td>Account Number:</td>
        <td>{{accountNumber}}</td>
      </tr>
      <tr>
        <td>Issue Date:</td>
        <td>{{issueDate}}</td>
      </tr>
      <tr>
        <td>Share Type:</td>
        <td>{{shareCapitalType}}</td>
      </tr>
    </table>
    
    <div class="signature-section">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-title">Authorized Officer</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-title">Secretary</div>
      </div>
    </div>
    
    <div class="certificate-seal"></div>
    
    <div class="certificate-footer">
      This certificate is issued in accordance with the terms and conditions specified in the share account agreement.
      <br>
      Certificate verification: {{verificationCode}}
    </div>
  </div>
</body>
</html>',
    TRUE,
    TRUE
);