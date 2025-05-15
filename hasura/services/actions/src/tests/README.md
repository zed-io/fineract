# Fixed Deposit Module Testing

This directory contains comprehensive tests for the fixed deposit module of the Fineract Hasura implementation. The tests are organized into unit tests and integration tests to ensure functionality, correctness, and reliability of the fixed deposit features.

## Test Structure

```
tests/
├── unit/                       # Unit tests
│   ├── services/               # Service-level unit tests
│   │   ├── fixedDepositService.test.ts
│   │   └── interestCalculationService.test.ts
│   └── handlers/               # Handler-level unit tests
│       ├── fixedDepositMaturity.test.ts
│       └── fixedDepositPrematureClosure.test.ts
├── integration/                # Integration tests
│   └── fixedDeposit.test.ts    # End-to-end API tests
├── setup.js                    # Test setup configuration
└── README.md                   # This file
```

## Testing Focus

These tests focus on the key business logic components of the fixed deposit module:

1. **Interest Calculation Service**
   - Simple and compound interest calculations
   - Different compounding frequencies
   - Days in year calculation (365, 360, actual)

2. **Fixed Deposit Service**
   - Account creation
   - Account approval with maturity calculation
   - Account activation

3. **Maturity Processing**
   - Maturity date calculation
   - Maturity instructions handling (withdraw, transfer, renew)
   - Maturity amount calculation

4. **Premature Closure**
   - Penalty calculation (flat amount, percentage-based)
   - Closure processing options (withdraw, transfer)
   - Interest adjustments

## Running Tests

### Prerequisites

- Node.js (14+ recommended)
- npm or yarn
- Test database (for integration tests)

### Unit Tests

Unit tests can be run without any external dependencies. They use mocks for database interactions:

```bash
npm run test:unit
```

### Integration Tests

Integration tests require a running Hasura instance and test database:

1. Start the Hasura server and PostgreSQL database:
   ```bash
   cd /Users/markp/wam/fineract/hasura
   docker-compose up -d
   ```

2. Create necessary test fixtures (optional, tests can set up and clean test data):
   ```bash
   npm run seed:test
   ```

3. Run integration tests:
   ```bash
   npm run test:integration
   ```

### Coverage Report

Generate test coverage report:

```bash
npm run test:coverage
```

The coverage report will be available in the `coverage/` directory.

## Testing Strategies

1. **Unit Tests**
   - Mock database interactions
   - Focus on business logic correctness
   - Test edge cases and error handling

2. **Integration Tests**
   - Test API endpoints
   - Verify end-to-end functionality
   - Test complex workflows

## Best Practices

When adding new features to the fixed deposit module, consider these testing best practices:

1. Write tests before implementing features (TDD)
2. Focus on critical financial calculations and business rules
3. For each API endpoint, test both success and failure scenarios
4. Test boundary conditions and edge cases, especially for financial calculations
5. Ensure proper cleanup of test data in integration tests

## Key Areas to Watch

Pay special attention to these critical components:

1. Interest calculation accuracy
2. Maturity date determination
3. Premature closure penalty calculations
4. Transaction processing and balance updates
5. Edge cases like leap years in date calculations