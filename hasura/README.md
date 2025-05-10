# Apache Fineract - Hasura Implementation

This is a modular Hasura-based backend implementation of Apache Fineract, converting the existing Java monolith to a PostgreSQL and GraphQL-based architecture.

## Overview

The Hasura implementation of Apache Fineract aims to:

1. Replace Java business logic with Hasura Actions and Event Triggers
2. Migrate from MySQL/MariaDB to PostgreSQL with optimized schema design
3. Leverage Hasura's authorization system for multi-tenancy and access control
4. Use GraphQL for all API interactions
5. Maintain functional parity with the original Fineract platform

## Architecture

The architecture consists of the following components:

1. **PostgreSQL Database**: Optimized schema for financial operations with proper constraints and relationships.
2. **Hasura GraphQL Engine**: Provides GraphQL API, permissions, and actions orchestration.
3. **Microservices**:
   - **Actions Server**: Implements business logic for GraphQL mutations.
   - **Event Handlers**: Processes asynchronous event triggers.
   - **Scheduled Jobs**: Runs background processes like EOD jobs, interest calculations, etc.

## Directory Structure

- `/migrations` - PostgreSQL schema migrations for the Fineract data model
- `/metadata` - Hasura metadata configuration
  - `/actions` - GraphQL action definitions and handlers
  - `/relationships` - Table relationships configuration
  - `/permissions` - Role-based access control definitions
  - `/rest` - REST endpoint configurations for backward compatibility
  - `/event-triggers` - Event trigger configurations
- `/seeds` - Data seeding scripts for initial setup
- `/services` - Implementation of business logic microservices
  - `/actions` - Implements GraphQL action handlers
  - `/event-handlers` - Implements event trigger processors
  - `/scheduled-jobs` - Implements scheduled background jobs

## Multi-tenancy Model

The Hasura implementation uses a schema-based multi-tenancy approach:

1. A central `fineract_tenants` schema manages tenant information
2. Each tenant has its own PostgreSQL schema with identical table structure
3. Hasura permissions isolate tenant data through PostgreSQL role-based access

## Key Features

- **GraphQL API**: Complete replacement of REST APIs with GraphQL
- **Row-Level Security**: Advanced permission system using Hasura's row-level security
- **Event-Driven Architecture**: Business processes implemented through Hasura event triggers
- **Optimized Schema Design**: PostgreSQL-native data types, proper indexing, and constraints

## Development Setup

To set up the Hasura-based Fineract locally:

1. Start PostgreSQL and Hasura using Docker Compose:
   ```
   docker-compose up -d
   ```

2. Apply the migrations:
   ```
   hasura migrate apply
   ```

3. Apply the metadata:
   ```
   hasura metadata apply
   ```

4. Seed the initial data:
   ```
   hasura seed apply
   ```

## Authentication & Authorization

- JWT-based authentication
- Role-based authorization with granular permissions
- Row-level security for tenant isolation

## Implementation Status

This implementation is a work in progress. See [MIGRATION.md](./MIGRATION.md) for the current status of each module's migration.

## How It Works

### Business Logic Implementation

Business logic is implemented through:

1. **Hasura Actions**: For synchronous operations like loan approvals, disbursements, etc.
2. **Event Triggers**: For asynchronous operations, like updating balances after a transaction
3. **Scheduled Jobs**: For periodic operations like interest calculations, maturity processing, etc.

### Data Flow

1. Client applications interact with the GraphQL API
2. Hasura validates permissions and routes operations
3. Mutations are processed by Action handlers
4. Events are triggered for async operations
5. Backend microservices process actions and events

## Performance Considerations

- GraphQL queries optimize data fetching with exactly what's needed
- PostgreSQL is optimized for financial transactions
- Microservices can scale independently based on load
- Caching is implemented for frequently accessed data