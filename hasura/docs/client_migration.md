# Client Domain Migration to Hasura

This document outlines the approach and implementation details for migrating the Client domain from Java to Hasura GraphQL with TypeScript action handlers.

## Migration Strategy

The client domain migration follows these steps:

1. **Database Schema Migration**
   - Convert JPA entities to SQL tables with PostgreSQL data types
   - Design appropriate constraints and indexes
   - Implement audit logging and triggers

2. **Hasura Metadata Configuration**
   - Define relationships between tables
   - Configure permissions based on user roles
   - Setup computed fields where needed

3. **Business Logic Implementation**
   - Create TypeScript action handlers for complex operations
   - Implement validation and business rules
   - Ensure idempotent and transactional operations

## Database Schema

The client schema includes the following tables:

- `client` - Core client information
- `client_identifier` - Identity documents and verification
- `client_address` - Address information
- `client_family_member` - Family relationships
- `client_document` - Uploaded documents
- `client_audit` - Audit trail for client changes
- `client_note` - Notes and comments
- `client_business` - Business details for business clients

Key features:
- UUID primary keys for better data distribution
- JSON/JSONB fields for flexible storage
- PostgreSQL triggers for automated behaviors
- Proper indexing for search performance

## API Endpoints

The client domain has the following GraphQL endpoints:

**Queries:**
- `client_list` - List clients with filtering and pagination
- `client_get` - Get detailed client information
- `client_accounts` - Get client account summary

**Mutations:**
- `client_create` - Create a new client
- `client_update` - Update client information
- `client_activate` - Activate a pending client
- `client_close` - Close a client
- `client_reject` - Reject a client application
- `client_withdraw` - Mark client as withdrawn
- `client_reactivate` - Reactivate a closed client
- `client_add_identifier` - Add client identity document
- `client_add_address` - Add client address
- `client_add_family_member` - Add family relationship
- `client_add_document` - Upload client document

## Permission Model

The client domain implements these permissions:

- **Admin** - Full access to all client operations
- **Manager** - Full access except for delete operations
- **User** - Read-only access to client data
- **Client_Self_Service** - Limited access to own client data

## Migration Verification

To verify the migration, ensure:

1. All existing client records are properly migrated
2. Business validation rules are preserved
3. Security constraints are maintained
4. Performance is equal or better than the Java implementation
5. All client workflows remain functional

## Current Status

The migration is completed with:

- ✅ Database schema implementation
- ✅ GraphQL endpoints and actions
- ✅ Business logic in TypeScript
- ✅ Permission model
- ✅ Data integrity checks

## Next Steps

1. Integration testing with the frontend application
2. Performance testing with large datasets
3. Security audit
4. Documentation for API consumers