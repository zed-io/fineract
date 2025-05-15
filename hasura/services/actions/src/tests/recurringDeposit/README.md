# Recurring Deposit Test Suite

This folder contains unit tests for the recurring deposit functionality of the Fineract Hasura integration. The tests focus on three core areas of the recurring deposit module:

## 1. Installment Tracking Tests

Tests in `installmentTracking.test.ts` validate that the system correctly:
- Identifies overdue installments
- Updates account statistics with overdue information
- Applies penalties to overdue installments when enabled
- Respects configuration limits for penalties

## 2. Penalty Calculation Tests

Tests in `penaltyCalculation.test.ts` focus on the penalty calculation logic:
- Fixed penalty amount calculations
- Percentage-based penalty calculations
- Tiered penalty rules based on days overdue
- Maximum penalty amount caps
- Grace period implementation
- Maximum penalty occurrence limits
- Penalty waiver functionality

## 3. Scheduled Job Tests

Tests in `scheduledJobs.test.ts` verify the background jobs that process recurring deposits:
- Recurring Deposit Penalty Job
- Installment Tracking Job
- Test mode functionality
- Error handling and retry logic
- Notification integration

## Running Tests

To run all recurring deposit tests:

```bash
npm run test:rd
```

To run a specific test file:

```bash
npx jest src/tests/recurringDeposit/installmentTracking.test.ts
```

## Test Setup

The test setup file `jest.setup.ts` initializes mocks and test utilities for the recurring deposit tests. It provides:
- Logger mocks
- UUID mocking for predictable IDs in tests
- Account utility mocks for consistent date and amount calculations

## Test Coverage

These tests focus on the core business logic of the recurring deposit module rather than trying to achieve 100% code coverage. The emphasis is on validating the correctness of:

1. Installment tracking logic
2. Penalty calculation for missed deposits
3. Scheduled job functionality

## Adding New Tests

When adding new tests, follow these patterns:
- Mock database interaction using the patterns in existing tests
- Focus on testing business logic, not database queries
- Use descriptive test names that explain the scenario
- Group related tests into appropriate sections
- Add new mocks to the setup file if needed