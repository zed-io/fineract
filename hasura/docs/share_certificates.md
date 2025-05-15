# Share Certificate Implementation

This document provides a brief overview of the share certificate feature implementation for the Fineract platform.

## Overview

The share certificate feature allows financial institutions to generate, manage, and verify certificates for share accounts. Share certificates serve as proof of ownership of shares in the financial institution and can be used for various purposes including collateral, transfer of ownership, and legal documentation.

## Key Features

1. **Certificate Templates Management**
   - Create, update, and manage certificate templates
   - HTML-based template system with variable substitution
   - Support for default templates

2. **Certificate Series Management**
   - Create and manage certificate numbering series per product
   - Automatic sequential numbering
   - Series prefix customization

3. **Certificate Generation**
   - Generate PDF certificates for individual share accounts
   - Support for optional expiry dates
   - Verification codes for certificate validation
   - Digital signatures (future enhancement)

4. **Batch Certificate Generation**
   - Generate certificates for multiple accounts in batch
   - Filter by product or specific accounts
   - Background processing for large batches

5. **Certificate Lifecycle Management**
   - Certificate revocation with reasons
   - Certificate regeneration/replacement
   - Certificate status tracking (active, revoked, replaced, expired)

6. **Certificate Verification**
   - Verify certificate authenticity using verification codes
   - Public verification endpoint with limited information disclosure

## Technical Implementation

### Database Schema

The implementation introduces the following tables:

1. `share_certificate_template` - Stores certificate templates
2. `share_certificate_series` - Manages certificate numbering series
3. `share_certificate` - Stores individual certificates
4. `share_certificate_batch` - Manages batch certificate generation
5. `share_certificate_batch_item` - Tracks individual certificates in a batch

### API Endpoints

The feature exposes GraphQL APIs through Hasura Actions for:

1. **Template Management:**
   - Create/update/list certificate templates
   - Set default templates

2. **Series Management:**
   - Create/update/list certificate series
   - Configure numbering patterns

3. **Certificate Operations:**
   - Generate individual certificates
   - Revoke certificates
   - Regenerate certificates
   - Download certificates as PDF
   - Verify certificates

4. **Batch Operations:**
   - Start batch certificate generation
   - Get batch status and results
   - List batch history

### PDF Generation

Certificates are generated as PDF documents using:

1. **Handlebars** - For template rendering
2. **Puppeteer** - For HTML to PDF conversion
3. **Custom HTML/CSS** - For certificate styling

## Security Considerations

1. **Certificate Authenticity:**
   - Each certificate includes a unique verification code
   - Certificates are stored securely with status tracking
   - Revoked certificates are marked to prevent misuse

2. **Access Control:**
   - Role-based access controls for certificate operations
   - Client self-service for certificate verification and download
   - Restricted administrative functions

## Future Enhancements

1. **Digital Signatures:**
   - Integration with digital signature providers
   - Support for cryptographic certificates

2. **Advanced Templates:**
   - Support for custom CSS and branding
   - Template versioning
   - Image and logo embedding

3. **Certificate Transfer:**
   - Support for transfer of share certificates between accounts
   - Transfer history tracking

4. **Integration:**
   - Integration with document management systems
   - Email delivery of certificates

## Implementation Files

- **Database Migration:**
  - `hasura/migrations/000019_share_certificate_schema.up.sql`

- **GraphQL Types:**
  - `hasura/metadata/actions/share_types.graphql`

- **Action Definitions:**
  - `hasura/metadata/actions/share_actions.yaml`

- **API Handlers:**
  - `hasura/services/actions/src/handlers/shareCertificate.ts`
  - `hasura/services/actions/src/routes/share.ts`

- **Service Layer:**
  - `hasura/services/actions/src/services/shareCertificateService.ts`

- **Templates:**
  - `hasura/services/actions/templates/share_certificate.html`