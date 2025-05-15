# Hasura Client Tables Configuration

This document outlines the database schema and Hasura configuration needed for the client domain in the Fineract application.

## Client Domain Tables

### client

The main table for storing client information.

```sql
CREATE TABLE "public"."client" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "account_no" text NOT NULL,
  "external_id" text,
  "status" text NOT NULL DEFAULT 'pending',
  "sub_status" text,
  "activation_date" timestamp with time zone,
  "office_id" uuid NOT NULL,
  "staff_id" uuid,
  "submitted_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "mobile_no" text,
  "email_address" text,
  "date_of_birth" date,
  "gender" text,
  "client_type" text,
  "client_type_value" text,
  "client_classification" text,
  "client_classification_value" text,
  "legal_form" text,
  "firstname" text,
  "middlename" text,
  "lastname" text,
  "fullname" text,
  "display_name" text NOT NULL,
  "created_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" text,
  "last_modified_date" timestamp with time zone,
  "last_modified_by" text,
  "closed_date" timestamp with time zone,
  "reopened_date" timestamp with time zone,
  "tenant_id" text NOT NULL DEFAULT 'default',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("office_id") REFERENCES "public"."office"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "idx_client_office_id" ON "public"."client" ("office_id");
CREATE INDEX "idx_client_staff_id" ON "public"."client" ("staff_id");
CREATE INDEX "idx_client_status" ON "public"."client" ("status");
CREATE INDEX "idx_client_external_id" ON "public"."client" ("external_id");
CREATE INDEX "idx_client_tenant_id" ON "public"."client" ("tenant_id");
```

### client_identifier

Table for storing client identity documents.

```sql
CREATE TABLE "public"."client_identifier" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "document_type" text NOT NULL,
  "document_type_id" text NOT NULL,
  "document_key" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" text,
  "last_modified_date" timestamp with time zone,
  "last_modified_by" text,
  "tenant_id" text NOT NULL DEFAULT 'default',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "idx_client_identifier_client_id" ON "public"."client_identifier" ("client_id");
CREATE INDEX "idx_client_identifier_document_type" ON "public"."client_identifier" ("document_type");
CREATE INDEX "idx_client_identifier_tenant_id" ON "public"."client_identifier" ("tenant_id");
```

### client_address

Table for storing client addresses.

```sql
CREATE TABLE "public"."client_address" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "address_type" text NOT NULL,
  "address_line1" text,
  "address_line2" text,
  "address_line3" text,
  "city" text,
  "state_province" text,
  "country" text,
  "postal_code" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" text,
  "last_modified_date" timestamp with time zone,
  "last_modified_by" text,
  "tenant_id" text NOT NULL DEFAULT 'default',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "idx_client_address_client_id" ON "public"."client_address" ("client_id");
CREATE INDEX "idx_client_address_address_type" ON "public"."client_address" ("address_type");
CREATE INDEX "idx_client_address_tenant_id" ON "public"."client_address" ("tenant_id");
```

### client_family_member

Table for storing client family relationships.

```sql
CREATE TABLE "public"."client_family_member" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "firstname" text NOT NULL,
  "middlename" text,
  "lastname" text,
  "qualification" text,
  "mobile_number" text,
  "age" integer,
  "is_dependent" boolean NOT NULL DEFAULT false,
  "relationship_id" text,
  "relationship" text,
  "marital_status" text,
  "gender" text,
  "date_of_birth" date,
  "profession" text,
  "created_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" text,
  "last_modified_date" timestamp with time zone,
  "last_modified_by" text,
  "tenant_id" text NOT NULL DEFAULT 'default',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "idx_client_family_member_client_id" ON "public"."client_family_member" ("client_id");
CREATE INDEX "idx_client_family_member_relationship" ON "public"."client_family_member" ("relationship");
CREATE INDEX "idx_client_family_member_tenant_id" ON "public"."client_family_member" ("tenant_id");
```

### client_document

Table for storing client documents.

```sql
CREATE TABLE "public"."client_document" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "name" text NOT NULL,
  "file_name" text NOT NULL,
  "size" integer,
  "type" text,
  "description" text,
  "location" text NOT NULL,
  "created_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "created_by" text,
  "last_modified_date" timestamp with time zone,
  "last_modified_by" text,
  "tenant_id" text NOT NULL DEFAULT 'default',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "idx_client_document_client_id" ON "public"."client_document" ("client_id");
CREATE INDEX "idx_client_document_tenant_id" ON "public"."client_document" ("tenant_id");
```

### client_note

Table for storing client notes.

```sql
CREATE TABLE "public"."client_note" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "note" text NOT NULL,
  "created_date" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" text,
  "last_modified_date" timestamp with time zone,
  "last_modified_by" text,
  "tenant_id" text NOT NULL DEFAULT 'default',
  PRIMARY KEY ("id"),
  FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "idx_client_note_client_id" ON "public"."client_note" ("client_id");
CREATE INDEX "idx_client_note_tenant_id" ON "public"."client_note" ("tenant_id");
```

## Hasura Relationships Configuration

Define relationships between tables in Hasura:

```yaml
relationships:
  - name: client
    definition:
      table:
        schema: public
        name: client
      object_relationships:
        - name: office
          using:
            foreign_key_constraint_on: office_id
        - name: staff
          using:
            foreign_key_constraint_on: staff_id
      array_relationships:
        - name: identifiers
          using:
            foreign_key_constraint_on:
              column: client_id
              table:
                schema: public
                name: client_identifier
        - name: addresses
          using:
            foreign_key_constraint_on:
              column: client_id
              table:
                schema: public
                name: client_address
        - name: familyMembers
          using:
            foreign_key_constraint_on:
              column: client_id
              table:
                schema: public
                name: client_family_member
        - name: documents
          using:
            foreign_key_constraint_on:
              column: client_id
              table:
                schema: public
                name: client_document
        - name: notes
          using:
            foreign_key_constraint_on:
              column: client_id
              table:
                schema: public
                name: client_note
        - name: loanAccounts
          using:
            foreign_key_constraint_on:
              column: client_id
              table:
                schema: public
                name: loan
        - name: savingsAccounts
          using:
            foreign_key_constraint_on:
              column: client_id
              table:
                schema: public
                name: savings_account
```

## Hasura Permissions Configuration

Define permissions for different roles:

```yaml
permissions:
  - role: admin
    tables:
      - schema: public
        name: client
        permissions:
          select:
            columns: "*"
          insert:
            columns: "*"
          update:
            columns: "*"
          delete:
            filter: {}
      - schema: public
        name: client_identifier
        permissions:
          select:
            columns: "*"
          insert:
            columns: "*"
          update:
            columns: "*"
          delete:
            filter: {}
      - schema: public
        name: client_address
        permissions:
          select:
            columns: "*"
          insert:
            columns: "*"
          update:
            columns: "*"
          delete:
            filter: {}
      - schema: public
        name: client_family_member
        permissions:
          select:
            columns: "*"
          insert:
            columns: "*"
          update:
            columns: "*"
          delete:
            filter: {}
      - schema: public
        name: client_document
        permissions:
          select:
            columns: "*"
          insert:
            columns: "*"
          update:
            columns: "*"
          delete:
            filter: {}
      - schema: public
        name: client_note
        permissions:
          select:
            columns: "*"
          insert:
            columns: "*"
          update:
            columns: "*"
          delete:
            filter: {}
  
  - role: user
    tables:
      - schema: public
        name: client
        permissions:
          select:
            columns: "*"
          insert:
            columns:
              - account_no
              - external_id
              - status
              - sub_status
              - activation_date
              - office_id
              - staff_id
              - submitted_date
              - mobile_no
              - email_address
              - date_of_birth
              - gender
              - client_type
              - client_classification
              - legal_form
              - firstname
              - middlename
              - lastname
              - fullname
              - display_name
          update:
            columns:
              - external_id
              - status
              - sub_status
              - activation_date
              - staff_id
              - mobile_no
              - email_address
              - gender
              - client_type
              - client_classification
              - firstname
              - middlename
              - lastname
              - fullname
            filter:
              status:
                _neq: "closed"
          delete:
            filter: {}
            
  - role: client_self_service
    tables:
      - schema: public
        name: client
        permissions:
          select:
            columns:
              - id
              - account_no
              - external_id
              - status
              - mobile_no
              - email_address
              - firstname
              - middlename
              - lastname
              - fullname
              - display_name
            filter:
              id:
                _eq: X-Hasura-User-Id
```

## GraphQL Actions

Define GraphQL actions for client operations that require business logic:

```yaml
actions:
  - name: client_list
    definition:
      kind: synchronous
      handler: http://actions-service:3000/api/client_list
      forward_client_headers: true
      headers:
        - name: x-hasura-role
          value: admin
    permissions:
      - role: admin
      - role: user
      
  - name: client_get
    definition:
      kind: synchronous
      handler: http://actions-service:3000/api/client_get
      forward_client_headers: true
      headers:
        - name: x-hasura-role
          value: admin
    permissions:
      - role: admin
      - role: user
      - role: client_self_service
      
  - name: client_accounts
    definition:
      kind: synchronous
      handler: http://actions-service:3000/api/client_accounts
      forward_client_headers: true
      headers:
        - name: x-hasura-role
          value: admin
    permissions:
      - role: admin
      - role: user
      - role: client_self_service
      
  - name: client_create
    definition:
      kind: synchronous
      handler: http://actions-service:3000/api/client_create
      forward_client_headers: true
      headers:
        - name: x-hasura-role
          value: admin
    permissions:
      - role: admin
      - role: user
      
  - name: client_update
    definition:
      kind: synchronous
      handler: http://actions-service:3000/api/client_update
      forward_client_headers: true
      headers:
        - name: x-hasura-role
          value: admin
    permissions:
      - role: admin
      - role: user
      
  - name: client_activate
    definition:
      kind: synchronous
      handler: http://actions-service:3000/api/client_activate
      forward_client_headers: true
      headers:
        - name: x-hasura-role
          value: admin
    permissions:
      - role: admin
      - role: user
      
  - name: client_close
    definition:
      kind: synchronous
      handler: http://actions-service:3000/api/client_close
      forward_client_headers: true
      headers:
        - name: x-hasura-role
          value: admin
    permissions:
      - role: admin
      - role: user
```

## Data Migration

To seed initial data for testing:

```sql
INSERT INTO public.client (
  id, account_no, external_id, status, office_id, mobile_no, 
  email_address, firstname, lastname, display_name, tenant_id
)
VALUES 
(
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'CLIENT-001',
  'EXT-001',
  'active',
  '00000000-0000-0000-0000-000000000001', -- Sample office ID
  '+12025550191',
  'john.doe@example.com',
  'John',
  'Doe',
  'John Doe',
  'default'
),
(
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  'CLIENT-002',
  'EXT-002',
  'pending',
  '00000000-0000-0000-0000-000000000001', -- Sample office ID
  '+12025550192',
  'jane.smith@example.com',
  'Jane',
  'Smith',
  'Jane Smith',
  'default'
);

-- Add sample address for first client
INSERT INTO public.client_address (
  client_id, address_type, address_line1, city, 
  state_province, country, postal_code, is_active
)
VALUES (
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'HOME',
  '123 Main Street',
  'New York',
  'NY',
  'USA',
  '10001',
  true
);

-- Add sample identifier for first client
INSERT INTO public.client_identifier (
  client_id, document_type, document_type_id, document_key, description
)
VALUES (
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Passport',
  '1',
  'AB123456',
  'International passport'
);

-- Add sample family member for first client
INSERT INTO public.client_family_member (
  client_id, firstname, lastname, relationship, is_dependent
)
VALUES (
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Mary',
  'Doe',
  'Spouse',
  false
);

-- Add sample note for first client
INSERT INTO public.client_note (
  client_id, note, created_by
)
VALUES (
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Client onboarded successfully.',
  'system'
);
```

## Implementation Notes

1. All primary keys use UUIDs instead of sequential IDs for better distribution
2. Tenant-based multi-tenancy is implemented with the tenant_id column
3. All tables include audit fields (created_by, created_date, etc.)
4. Foreign key constraints enforce data integrity
5. Indexes improve query performance

## Integration with React Frontend

The client APIs support the following operations from the React frontend:

1. Listing clients with filtering and pagination
2. Viewing detailed client information
3. Creating new clients
4. Updating client information
5. Activating pending clients
6. Closing client accounts
7. Managing client identifiers, addresses, and documents
8. Tracking client family members
9. Adding notes to client records
10. Viewing client loan and savings accounts