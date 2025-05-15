# Client-Group-Loan Integration Tests

This directory contains integration tests for client-group-loan relationships in Fineract. These tests verify the complex interactions between clients, groups, and loans, focusing on the following scenarios:

1. Group creation with multiple clients
2. Group loan application and approval
3. Loan distribution to group members
4. Group loan repayments (contributed by different members)
5. Client guarantor relationships for loans

## Test Structure

The tests are organized into the following files:

- `clientGroupLoan.test.ts`: Main integration tests for client-group-loan flows
- `../graphql/clientGroupLoan.graphql.test.ts`: GraphQL schema tests for client-group-loan relationships

## Running the Tests

### Prerequisites

1. A running Hasura instance
2. The actions service running
3. A test database with appropriate schema

### Environment Variables

Set the following environment variables to configure the test environment:

```bash
# Enable integration tests
export RUN_INTEGRATION_TESTS=true

# Hasura configuration
export HASURA_ENDPOINT=http://localhost:8080/v1/graphql
export HASURA_ADMIN_SECRET=your-admin-secret

# Database configuration (for cleanup)
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=fineract
export DB_USER=postgres
export DB_PASSWORD=postgres
```

### Running Integration Tests

To run only the client-group-loan integration tests:

```bash
cd fineract/hasura/services/actions
npm test -- --testPathPattern=integration/clientGroupLoan.test.ts
```

### Running GraphQL Schema Tests

To run the GraphQL schema tests (which don't require database connectivity):

```bash
cd fineract/hasura/services/actions
npm test -- --testPathPattern=graphql/clientGroupLoan.graphql.test.ts
```

## Test Coverage

The tests cover the following critical aspects of client-group-loan relationships:

### Group Management
- Creating groups with initial members
- Adding additional members to groups
- Assigning leadership roles to clients
- Activating groups
- Retrieving group details with members and roles

### Group Loan Management
- Creating loans for groups
- Approving and disbursing group loans
- Making repayments from specific group members
- Tracking individual member contributions
- Retrieving loan details and repayment schedules

### Guarantor Management
- Adding guarantors to loans
- Retrieving guarantor details for loans
- Retrieving loans guaranteed by specific clients

## Notes

- The integration tests create and clean up their own test data
- Tests are skipped by default unless `RUN_INTEGRATION_TESTS=true` is set
- The GraphQL schema tests use mocks and don't require a database connection
- Some operations may require specific permissions or roles to execute correctly

## Extending the Tests

To add new test scenarios:

1. Add new test cases to the appropriate describe block in `clientGroupLoan.test.ts`
2. Update the test cleanup in the `afterAll` function to clean up any new test data
3. Add corresponding GraphQL schema tests in `../graphql/clientGroupLoan.graphql.test.ts`