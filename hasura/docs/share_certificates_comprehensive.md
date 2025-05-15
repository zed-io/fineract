# Share Certificate Management for Fineract Hasura

This comprehensive documentation provides a detailed guide to the Share Certificate functionality within the Apache Fineract Hasura implementation.

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [Certificate Template Management](#certificate-template-management)
4. [Certificate Numbering Series](#certificate-numbering-series)
5. [Certificate Generation](#certificate-generation)
6. [Certificate Lifecycle Management](#certificate-lifecycle-management)
7. [Batch Certificate Operations](#batch-certificate-operations)
8. [Certificate Verification](#certificate-verification)
9. [API Reference](#api-reference)
10. [Database Schema](#database-schema)
11. [Technical Implementation](#technical-implementation)
12. [Customization Guide](#customization-guide)
13. [Security Considerations](#security-considerations)
14. [Troubleshooting](#troubleshooting)
15. [Future Enhancements](#future-enhancements)

## Overview

Share certificates are legal documents representing a client's or group's ownership of shares in a financial institution. The Share Certificate functionality provides a complete system for creating, managing, and verifying share certificates within Fineract. This includes template management, certificate generation, batch processing, and verification mechanisms.

## Key Concepts

### Share Certificate

A share certificate is an official document that serves as proof of ownership of a specific number of shares in a financial institution. Each certificate includes:

- A unique certificate number
- Share owner's information (client or group)
- Share product details
- Number of shares
- Share value details
- Issue date
- Verification code
- Authentication features (signatures, seals)

### Certificate Template

Templates define the visual appearance and content structure of certificates. The system provides:

- HTML-based templates with variable substitution
- CSS styling for professional appearance
- Support for organizational branding
- Fields for all required certificate information

### Certificate Series

Series manage the sequential numbering of certificates. Each product can have multiple series, providing:

- Customizable prefix (e.g., "A-", "2023-")
- Sequential numbering for each series
- Tracking of next available number

### Certificate Status

Certificates have a defined lifecycle represented by their status:

- **Active**: Valid, current certificate
- **Revoked**: Certificate has been invalidated
- **Replaced**: Certificate has been superseded by a new one
- **Expired**: Certificate has reached its expiry date

## Certificate Template Management

### Default Template

The system includes a default certificate template that provides a professional, standard layout. The default template features:

- Classic certificate design with decorative elements
- Fields for all required certificate information
- Responsive layout that prints well
- Digital signature and verification code sections

### Creating Custom Templates

Custom templates can be created to match institutional branding or regulatory requirements:

1. **Template Design**: Create an HTML template with embedded CSS
2. **Variable Placeholders**: Use handlebars syntax (`{{variableName}}`) to include dynamic data
3. **Testing**: Preview the template with sample data
4. **Activation**: Set the template as active and optionally as default

### Available Template Variables

Templates can use the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `organizationName` | Institution name | "Fineract Financial Institution" |
| `clientName` | Certificate holder's name | "John Smith" |
| `sharesQuantity` | Number of shares | "1,000" |
| `productName` | Share product name | "Community Shares 2023" |
| `currency` | Currency symbol | "$" |
| `shareValue` | Value per share | "10.00" |
| `totalValue` | Total certificate value | "10,000.00" |
| `certificateNumber` | Unique certificate ID | "A-000123" |
| `accountNumber` | Share account number | "SH-123456" |
| `issueDate` | Certificate issue date | "January 15, 2023" |
| `shareCapitalType` | Share capital type | "Paid Up" |
| `verificationCode` | Verification code | "AB12CD34" |

## Certificate Numbering Series

### Series Configuration

Each share product can have multiple certificate numbering series:

1. **Creating a Series**: Define a prefix and starting number for a product
2. **Managing Active Series**: Only active series can be used for certificate generation
3. **Updating Series**: Series can be updated to change the prefix or current number

### Automatic Numbering

When generating certificates, the system:

1. Selects an active series for the product
2. Creates the certificate number using the series prefix and next available number
3. Increments the series number for future certificates

## Certificate Generation

### Individual Certificate Generation

To generate a certificate for a share account:

1. Select the share account
2. Choose a certificate template
3. Specify the issue date and number of shares
4. Optionally set an expiry date
5. Add any notes or additional information
6. Generate the certificate

The system will:
- Create a unique certificate record
- Generate a verification code
- Render the template with account data
- Generate a PDF document
- Store the certificate details

### PDF Generation Process

Certificate PDF generation follows these steps:

1. Template rendering with Handlebars to create HTML content
2. HTML to PDF conversion using Puppeteer
3. Storage of the PDF in the configured certificates directory
4. Recording the file path in the certificate record

## Certificate Lifecycle Management

### Certificate Revocation

Certificates can be revoked when:
- Errors are found in the certificate
- The certificate is lost or damaged
- Share ownership changes
- Regulatory requirements change

The revocation process:
1. Updates the certificate status to "revoked"
2. Records the revocation date and reason
3. Stores the user who performed the revocation
4. Prevents the certificate from being used

### Certificate Regeneration

Revoked or expired certificates can be regenerated:

1. The original certificate is marked as "replaced"
2. A new certificate is generated with:
   - The same share account and quantity
   - A new certificate number
   - Updated issue date
   - Optionally, a new template or expiry date
3. Reference to the original certificate is maintained

### Certificate Expiry

Certificates can optionally have an expiry date:
- The system automatically considers certificates expired when the date is reached
- Expired certificates can be verified but show as invalid
- Expired certificates can be regenerated

## Batch Certificate Operations

### Batch Generation

For large-scale certificate issuance, the system provides batch operations:

1. **Batch Configuration**:
   - Select a product or specific accounts
   - Choose a template and numbering series
   - Add optional notes

2. **Batch Processing**:
   - The system creates a batch record with pending status
   - Individual batch items are created for each account
   - Processing can be performed asynchronously
   - Progress is tracked through the batch record

3. **Batch Monitoring**:
   - View batch status and progress
   - See counts of total, processed, and failed certificates
   - Access detailed results for each account

### Batch Status

Batches progress through these statuses:
- **Pending**: Batch created but not yet processed
- **Processing**: Batch is currently being processed
- **Completed**: All certificates have been processed
- **Failed**: Critical error occurred during processing

## Certificate Verification

### Verification Process

Certificate verification provides a secure way to confirm authenticity:

1. Each certificate includes a unique verification code
2. Verification requires both the certificate number and verification code
3. The verification API returns the certificate's validity status
4. Failed verifications don't reveal detailed error reasons

### Verification Results

The verification process returns:
- Certificate validity (valid/invalid)
- If valid, basic certificate information
- If invalid, a general reason (e.g., "revoked", "expired")

## API Reference

### GraphQL API

#### Certificate Template Management

```graphql
# Get all certificate templates
query GetShareCertificateTemplates {
  getShareCertificateTemplates {
    templates {
      id
      name
      description
      isActive
      isDefault
      createdDate
    }
  }
}

# Get template by ID
query GetShareCertificateTemplate($templateId: String!) {
  getShareCertificateTemplate(templateId: $templateId) {
    template {
      id
      name
      description
      templateContent
      isActive
      isDefault
      createdDate
      lastModifiedDate
    }
  }
}

# Create new template
mutation CreateShareCertificateTemplate(
  $name: String!,
  $description: String,
  $templateContent: String!,
  $isActive: Boolean,
  $isDefault: Boolean
) {
  createShareCertificateTemplate(
    name: $name,
    description: $description,
    templateContent: $templateContent,
    isActive: $isActive,
    isDefault: $isDefault
  ) {
    templateId
    name
  }
}

# Update existing template
mutation UpdateShareCertificateTemplate(
  $templateId: String!,
  $name: String,
  $description: String,
  $templateContent: String,
  $isActive: Boolean,
  $isDefault: Boolean
) {
  updateShareCertificateTemplate(
    templateId: $templateId,
    name: $name,
    description: $description,
    templateContent: $templateContent,
    isActive: $isActive,
    isDefault: $isDefault
  ) {
    templateId
    name
    updated
  }
}
```

#### Certificate Series Management

```graphql
# Get series for a product
query GetShareCertificateSeries($productId: String!) {
  getShareCertificateSeries(productId: $productId) {
    seriesList {
      id
      productId
      productName
      prefix
      nextNumber
      isActive
      createdDate
    }
  }
}

# Create new series
mutation CreateShareCertificateSeries(
  $productId: String!,
  $prefix: String!,
  $nextNumber: Int,
  $isActive: Boolean
) {
  createShareCertificateSeries(
    productId: $productId,
    prefix: $prefix,
    nextNumber: $nextNumber,
    isActive: $isActive
  ) {
    seriesId
    prefix
  }
}

# Update existing series
mutation UpdateShareCertificateSeries(
  $seriesId: String!,
  $prefix: String,
  $nextNumber: Int,
  $isActive: Boolean
) {
  updateShareCertificateSeries(
    seriesId: $seriesId,
    prefix: $prefix,
    nextNumber: $nextNumber,
    isActive: $isActive
  ) {
    seriesId
    prefix
    updated
  }
}
```

#### Certificate Generation and Management

```graphql
# Get certificates for an account
query GetShareCertificates($accountId: String!) {
  getShareCertificates(accountId: $accountId) {
    certificates {
      id
      certificateNumber
      accountId
      accountNumber
      clientName
      groupName
      productName
      templateName
      seriesPrefix
      issueDate
      expiryDate
      sharesQuantity
      shareValue
      totalValue
      status
      verificationCode
      createdDate
    }
  }
}

# Get certificate by ID
query GetShareCertificateById($certificateId: String!) {
  getShareCertificateById(certificateId: $certificateId) {
    certificate {
      id
      certificateNumber
      accountId
      accountNumber
      clientName
      groupName
      productName
      templateName
      seriesPrefix
      issueDate
      issuedByUsername
      revocationDate
      revokedByUsername
      expiryDate
      sharesQuantity
      shareValue
      totalValue
      status
      notes
      documentPath
      createdDate
    }
  }
}

# Generate certificate
mutation GenerateShareCertificate(
  $accountId: String!,
  $templateId: String!,
  $issueDate: String!,
  $sharesQuantity: Int!,
  $expiryDate: String,
  $notes: String
) {
  generateShareCertificate(
    accountId: $accountId,
    templateId: $templateId,
    issueDate: $issueDate,
    sharesQuantity: $sharesQuantity,
    expiryDate: $expiryDate,
    notes: $notes
  ) {
    certificateId
    certificateNumber
    accountId
    issueDate
    sharesQuantity
    downloadUrl
  }
}

# Revoke certificate
mutation RevokeShareCertificate(
  $certificateId: String!,
  $revocationDate: String!,
  $reason: String!
) {
  revokeShareCertificate(
    certificateId: $certificateId,
    revocationDate: $revocationDate,
    reason: $reason
  ) {
    certificateId
    certificateNumber
    revocationDate
    status
  }
}

# Regenerate certificate
mutation RegenerateShareCertificate(
  $certificateId: String!,
  $newTemplateId: String,
  $newIssueDate: String!,
  $newExpiryDate: String,
  $notes: String
) {
  regenerateShareCertificate(
    certificateId: $certificateId,
    newTemplateId: $newTemplateId,
    newIssueDate: $newIssueDate,
    newExpiryDate: $newExpiryDate,
    notes: $notes
  ) {
    originalCertificateId
    newCertificateId
    newCertificateNumber
    issueDate
    status
    downloadUrl
  }
}

# Download certificate
mutation DownloadShareCertificate(
  $certificateId: String!,
  $format: String
) {
  downloadShareCertificate(
    certificateId: $certificateId,
    format: $format
  ) {
    certificateId
    certificateNumber
    downloadUrl
    format
    expiryTime
  }
}

# Verify certificate
query VerifyShareCertificate(
  $certificateNumber: String!,
  $verificationCode: String!
) {
  verifyShareCertificate(
    certificateNumber: $certificateNumber,
    verificationCode: $verificationCode
  ) {
    isValid
    message
    certificate {
      certificateNumber
      clientName
      groupName
      productName
      issueDate
      expiryDate
      sharesQuantity
      shareValue
      totalValue
      status
    }
  }
}
```

#### Batch Certificate Operations

```graphql
# Get all batches
query GetShareCertificateBatches($productId: String, $status: String) {
  getShareCertificateBatches(productId: $productId, status: $status) {
    batches {
      id
      productId
      productName
      templateId
      templateName
      seriesId
      seriesPrefix
      startedDate
      completedDate
      startedByUsername
      totalCertificates
      processedCertificates
      failedCertificates
      status
      notes
      createdDate
    }
  }
}

# Get batch details
query GetShareCertificateBatch($batchId: String!) {
  getShareCertificateBatch(batchId: $batchId) {
    batch {
      id
      productId
      productName
      templateId
      templateName
      seriesId
      seriesPrefix
      startedDate
      completedDate
      startedByUsername
      totalCertificates
      processedCertificates
      failedCertificates
      status
      notes
      items {
        id
        accountId
        accountNumber
        clientOrGroupName
        certificateNumber
        status
        errorMessage
      }
    }
  }
}

# Start new batch
mutation StartShareCertificateBatch(
  $productId: String,
  $templateId: String!,
  $seriesId: String!,
  $accountIds: [String],
  $notes: String
) {
  startShareCertificateBatch(
    productId: $productId,
    templateId: $templateId,
    seriesId: $seriesId,
    accountIds: $accountIds,
    notes: $notes
  ) {
    batchId
    status
    totalAccounts
    message
  }
}
```

### REST API

In addition to GraphQL, some operations are available through REST endpoints:

#### Certificate Download

```
GET /api/share/certificate/download?id={certificateId}&format=pdf
```

Returns a downloadable PDF file directly.

#### Certificate Verification Public API

```
POST /api/share/certificate/verify
Content-Type: application/json

{
  "certificateNumber": "A-000123",
  "verificationCode": "AB12CD34"
}
```

Returns verification details in JSON format.

## Database Schema

The certificate functionality uses the following database tables:

### share_certificate_template

Stores certificate templates:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Template name |
| description | VARCHAR(500) | Optional description |
| template_content | TEXT | HTML/CSS template content |
| is_active | BOOLEAN | Whether template is available for use |
| is_default | BOOLEAN | Whether this is the default template |
| created_date | TIMESTAMP | Creation timestamp |
| created_by | UUID | User who created the template |
| last_modified_date | TIMESTAMP | Last modification timestamp |
| last_modified_by | UUID | User who last modified the template |

### share_certificate_series

Manages certificate numbering series:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| product_id | UUID | Share product reference |
| prefix | VARCHAR(20) | Certificate number prefix |
| next_number | INTEGER | Next sequential number |
| is_active | BOOLEAN | Whether series is available for use |
| created_date | TIMESTAMP | Creation timestamp |
| created_by | UUID | User who created the series |
| last_modified_date | TIMESTAMP | Last modification timestamp |
| last_modified_by | UUID | User who last modified the series |

### share_certificate

Stores individual certificate data:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| certificate_number | VARCHAR(50) | Unique certificate identifier |
| account_id | UUID | Share account reference |
| template_id | UUID | Template reference |
| series_id | UUID | Series reference |
| issue_date | DATE | Certificate issue date |
| issued_by | UUID | User who issued the certificate |
| revocation_date | DATE | Date certificate was revoked (if applicable) |
| revoked_by | UUID | User who revoked the certificate (if applicable) |
| expiry_date | DATE | Certificate expiry date (if applicable) |
| shares_quantity | BIGINT | Number of shares |
| share_value | DECIMAL(19, 6) | Value per share |
| total_value | DECIMAL(19, 6) | Total certificate value |
| status | ENUM | Certificate status (active, revoked, replaced, expired) |
| notes | TEXT | Optional notes |
| signature_image_path | VARCHAR(255) | Path to signature image file (if applicable) |
| digital_signature_data | TEXT | Digital signature data (if applicable) |
| is_digital | BOOLEAN | Whether certificate is digital or physical |
| document_path | VARCHAR(255) | Path to generated PDF file |
| verification_code | VARCHAR(20) | Unique verification code |
| created_date | TIMESTAMP | Creation timestamp |
| created_by | UUID | User who created the record |
| last_modified_date | TIMESTAMP | Last modification timestamp |
| last_modified_by | UUID | User who last modified the record |

### share_certificate_batch

Manages batch certificate generation:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| product_id | UUID | Share product reference (if batch is for a product) |
| template_id | UUID | Template reference |
| series_id | UUID | Series reference |
| started_date | TIMESTAMP | Batch start timestamp |
| completed_date | TIMESTAMP | Batch completion timestamp (if applicable) |
| started_by | UUID | User who started the batch |
| total_certificates | INTEGER | Total certificates to process |
| processed_certificates | INTEGER | Number of processed certificates |
| failed_certificates | INTEGER | Number of failed certificates |
| status | VARCHAR(50) | Batch status (pending, processing, completed, failed) |
| notes | TEXT | Optional notes |
| created_date | TIMESTAMP | Creation timestamp |
| created_by | UUID | User who created the record |
| last_modified_date | TIMESTAMP | Last modification timestamp |
| last_modified_by | UUID | User who last modified the record |

### share_certificate_batch_item

Tracks individual certificates in a batch:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | Batch reference |
| account_id | UUID | Share account reference |
| certificate_id | UUID | Certificate reference (if generated) |
| status | VARCHAR(50) | Item status (pending, processing, completed, failed) |
| error_message | TEXT | Error message (if failed) |
| created_date | TIMESTAMP | Creation timestamp |
| created_by | UUID | User who created the record |
| last_modified_date | TIMESTAMP | Last modification timestamp |
| last_modified_by | UUID | User who last modified the record |

## Technical Implementation

### Core Technology Stack

The certificate functionality is built using:

- **Database**: PostgreSQL for data storage
- **API Layer**: GraphQL via Hasura Actions and Express.js
- **PDF Generation**: 
  - Handlebars for template rendering
  - Puppeteer for HTML to PDF conversion
- **Security**: 
  - UUID for unique identifiers
  - Cryptographically secure verification codes

### Service Architecture

The implementation follows a layered architecture:

1. **API Layer** (`shareCertificate.ts`): Handles HTTP requests and responses
2. **Service Layer** (`shareCertificateService.ts`): Implements business logic
3. **Data Layer**: Database operations through parameterized SQL queries
4. **Utility Functions**: PDF generation, verification code generation, etc.

### PDF Generation Process

The certificate PDF generation process consists of:

1. **Data Preparation**: Gathering share account, product, and template data
2. **Template Rendering**: Compiling the HTML template with Handlebars
3. **PDF Creation**: Using Puppeteer to render HTML to PDF
4. **Storage**: Saving the PDF to the filesystem and the path to the database

```typescript
// Example from shareCertificateService.ts
async generateCertificatePdf(certificateId, certificateNumber, account, product, certData, template, verificationCode) {
  // Create directory for certificates if it doesn't exist
  const certificatesDir = path.join(__dirname, '..', '..', 'certificates');
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }
  
  // Prepare template data
  const templateData = {
    organizationName: "Fineract Financial Institution",
    clientName: account.clientName || account.groupName,
    sharesQuantity: formatNumber(certData.sharesQuantity),
    productName: product.name,
    // ... additional data
  };
  
  // Compile and render template
  const compiledTemplate = handlebars.compile(template.templateContent);
  const html = compiledTemplate(templateData);
  
  // Generate PDF using puppeteer
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Output path
  const outputPath = path.join(certificatesDir, `${certificateNumber}.pdf`);
  
  // Generate PDF
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { /* margins */ }
  });
  
  await browser.close();
  
  return outputPath;
}
```

## Customization Guide

### Template Customization

Custom templates can be created by:

1. **Starting Point**: Use the default template as a reference
2. **HTML Structure**: Modify the HTML structure while keeping the required fields
3. **CSS Styling**: Customize the appearance with embedded CSS
4. **Testing**: Test with sample data before deployment

Example template structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Share Certificate</title>
  <style>
    /* Custom CSS styling */
    body { font-family: 'Your-Font', serif; }
    .certificate-container { /* Custom styling */ }
    /* Additional styling */
  </style>
</head>
<body>
  <div class="certificate-container">
    <!-- Header section -->
    <div class="certificate-header">
      <div class="certificate-title">Share Certificate</div>
      <div class="organization-name">{{organizationName}}</div>
    </div>
    
    <!-- Content section -->
    <div class="certificate-content">
      <p>This certifies that <strong>{{clientName}}</strong> is the registered holder of 
      <strong>{{sharesQuantity}}</strong> shares...</p>
    </div>
    
    <!-- Details section -->
    <table class="certificate-details">
      <!-- Certificate details rows -->
    </table>
    
    <!-- Signature section -->
    <div class="signature-section">
      <!-- Signature elements -->
    </div>
    
    <!-- Footer with verification code -->
    <div class="certificate-footer">
      Certificate verification: {{verificationCode}}
    </div>
  </div>
</body>
</html>
```

### Certificate Storage Configuration

The certificate storage location can be configured by:

1. Modifying the path in `shareCertificateService.ts`:
```typescript
const certificatesDir = path.join(__dirname, '..', '..', 'certificates');
```

2. Ensuring the directory has appropriate permissions

### Adding Digital Signatures

To implement digital signatures:

1. Add a signature image file or digital signature data
2. Update the `generateCertificatePdf` function to include the signature
3. Add logic to verify the signature during certificate validation

### Custom Numbering Formats

To customize certificate numbering:

1. Create a new series with the desired prefix
2. Modify the number padding if needed:
```typescript
const certificateNumber = `${series.prefix}${series.next_number.toString().padStart(6, '0')}`;
```

## Security Considerations

### Certificate Authentication

Certificates include multiple security features:

1. **Unique Certificate Number**: Generated from series prefix and sequential number
2. **Verification Code**: Randomly generated alphanumeric code
3. **Digital Record**: Database entry with creation and modification tracking
4. **Revocation Capability**: Ability to revoke compromised certificates

### Access Control

Certificate operations are protected by role-based access control:

1. **Certificate Creation**: Limited to authorized staff
2. **Certificate Revocation**: Limited to authorized staff
3. **Template Management**: Limited to administrators
4. **Public Verification**: Limited to certificate number and verification code

### Data Protection

Certificate data is protected through:

1. **Parameterized Queries**: All database operations use parameterized queries
2. **Input Validation**: All user inputs are validated before processing
3. **Audit Trails**: All operations are logged with timestamp and user information

## Troubleshooting

### Common Issues and Solutions

1. **Certificate Generation Fails**
   - **Issue**: PDF generation process errors
   - **Solution**: Check Puppeteer configuration, ensure HTML template is valid

2. **Certificate Verification Fails**
   - **Issue**: Certificate reported as invalid
   - **Solution**: Verify certificate number and verification code, check certificate status

3. **Batch Processing Stalls**
   - **Issue**: Batch remains in "processing" state
   - **Solution**: Check batch processing logs, restart batch processing if needed

4. **Template Rendering Issues**
   - **Issue**: Template doesn't render as expected
   - **Solution**: Validate template HTML, check variable names and syntax

### Debugging Tools

1. **Certificate Service Logs**: Check logs for detailed error messages
2. **Database Queries**: Verify certificate records in the database
3. **Generated PDFs**: Examine generated PDF files

## Future Enhancements

Planned enhancements for the Share Certificate functionality include:

1. **Digital Signatures**
   - Integration with digital signature providers
   - Support for cryptographic certificate validation
   - Blockchain-based certificate verification

2. **Advanced Certificate Features**
   - QR codes for rapid verification
   - Watermarks and additional security features
   - Multi-language support

3. **Process Improvements**
   - Real-time batch processing status updates
   - Automated certificate expiry notifications
   - Certificate transfer between accounts

4. **Integration Features**
   - Email delivery of certificates
   - Integration with document management systems
   - Mobile verification applications