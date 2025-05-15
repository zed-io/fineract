# Fineract Hasura Action Handlers

This service provides the business logic implementation for the Apache Fineract GraphQL API powered by Hasura. 
It contains action handlers that implement complex business logic, validations, and multi-step operations.

## Features

- **Client Management**
  - Create, retrieve, update and manage client information
  - Handle client lifecycle (activation, closure, rejection, withdrawal)
  - Manage client identifiers, addresses, family members, and documents

- **Loan Management**
  - Create and manage loan applications
  - Calculate repayment schedules
  - Process disbursements and repayments

- **Savings Management**
  - Create and manage savings accounts
  - Process deposits and withdrawals
  - Calculate interest and apply charges

## Architecture

The service follows a modular architecture:

```
src/
├── handlers/        # Express route handlers for each action
├── services/        # Business logic services
├── models/          # Type definitions and interfaces
├── utils/           # Utility functions and helpers
└── index.ts         # Application entry point
```

## Development

### Prerequisites

- Node.js 14+ 
- TypeScript 4.5+
- PostgreSQL 13+

### Setup

1. Install dependencies
   ```
   npm install
   ```

2. Set environment variables
   ```
   DATABASE_URL=postgres://postgres:password@postgres:5432/fineract_tenants
   LOG_LEVEL=debug
   PORT=3000
   ```

3. Run development server
   ```
   npm run dev
   ```

### Building and Deployment

```bash
# Build TypeScript 
npm run build

# Start production server
npm start
```

## Integration with Hasura

This service provides HTTP endpoints that are called by Hasura when a GraphQL operation is executed. 
The integration is defined in the Hasura metadata configuration.

### Action Handlers

- `/api/client/*` - Client management endpoints
- `/api/loan/*` - Loan management endpoints
- `/api/savings/*` - Savings account management endpoints

### Authorization

Authentication and authorization are handled by Hasura's JWT authentication system. 
All endpoints receive a JWT token from Hasura that contains role and user information.