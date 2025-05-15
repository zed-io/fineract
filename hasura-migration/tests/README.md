# Fineract Hasura Integration Testing Framework

This directory contains an integration testing framework for the Fineract Hasura GraphQL API. It provides utilities and patterns for writing comprehensive tests that validate the functionality of the Hasura-based API endpoints.

## Directory Structure

```
tests/
├── integration/
│   ├── config/           # Configuration files
│   ├── fixtures/         # Test data fixtures
│   ├── graphql/          # GraphQL queries and mutations
│   ├── helpers/          # Helper utilities
│   ├── tests/            # Test files
│   └── utils/            # Core utilities
├── jest.integration.config.js  # Jest configuration
├── package.json          # Dependencies and scripts
├── README.md             # Documentation
└── tsconfig.json         # TypeScript configuration
```

## Key Features

- **Database Integration**: Utilities for setting up test databases, managing transactions, and loading fixture data
- **GraphQL Client**: Pre-configured client for making GraphQL requests with JWT authentication
- **Test Context**: Manages test state, user authentication, and cleanup
- **Data Generators**: Utilities for generating realistic test data
- **Fixtures**: Reusable test data for various entity types
- **Helpers**: Common operations like authentication and data creation

## Getting Started

### Prerequisites

- Node.js 16+
- Access to a Hasura GraphQL API endpoint
- PostgreSQL database access

### Installation

1. Install dependencies:

```bash
cd hasura-migration/tests
npm install
```

2. Configure the environment:

Create a `.env` file with the appropriate settings:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=fineract_default
HASURA_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=hasura-admin-secret
JWT_SECRET=your-jwt-secret-key
TEST_USERNAME=test@example.com
TEST_PASSWORD=password123
```

### Running Tests

Run all integration tests:

```bash
npm run test:integration
```

Run with coverage report:

```bash
npm run test:coverage
```

Watch mode during development:

```bash
npm run test:watch
```

## Writing Tests

### Create a test file

Create a new test file in `integration/tests/` following this pattern:

```typescript
import { createTestContext, TestContext } from '@utils/test-context';
import { loginTestUser } from '@helpers/auth-helper';
import { generateData } from '@helpers/data-generator';
import { GRAPHQL_MUTATION } from '@graphql/mutations';
import { GRAPHQL_QUERY } from '@graphql/queries';
import { query } from '@utils/graphql-client';

describe('Feature Integration Tests', () => {
  let context: TestContext;

  // Setup test context and login before tests
  beforeAll(async () => {
    context = await createTestContext();
    await loginTestUser(context);
  });

  // Cleanup after all tests
  afterAll(async () => {
    await context.cleanup();
  });

  it('should perform an operation', async () => {
    // Test implementation
    // ...
    
    // Assertions
    expect(result).toBeDefined();
  });
});
```

### Test Database Management

- Tests run in a transaction that's rolled back after each test suite
- Use `context.loadFixtures()` to load test data
- Use `context.executeQuery()` for direct database queries

### Authentication

- `loginTestUser()` handles authentication and sets up the GraphQL client
- Use `context.setUserData()` to track the current user

### GraphQL Operations

- Import queries and mutations from `@graphql/queries` and `@graphql/mutations`
- Use `query()`, `mutate()`, `adminQuery()`, and `adminMutate()` for GraphQL operations

## Best Practices

1. **Test isolation**: Each test should be independent and not rely on state from other tests
2. **Use fixtures**: Prefer reusable fixtures over creating data in each test
3. **Track created entities**: Use `context.trackEntity()` to track entities created during tests
4. **Clean up after tests**: Always clean up resources in `afterAll` or `afterEach` hooks
5. **Use test context**: Store state in the test context instead of global variables

## Troubleshooting

- **Database connection issues**: Verify database credentials in `.env`
- **Authentication failures**: Check that the JWT secret matches your Hasura instance
- **GraphQL errors**: Verify that query/mutation syntax matches the schema