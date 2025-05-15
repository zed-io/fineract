# Interest Calculation Testing Framework

This testing framework provides comprehensive validation for the interest calculation engine in Apache Fineract. The framework is designed to ensure accuracy, performance, and reliability of interest calculations across different scenarios and configurations.

## Testing Layers

The framework consists of multiple testing layers:

1. **Unit Tests**: Tests for individual calculation strategies and components
2. **Integration Tests**: End-to-end tests for the calculation and posting workflows
3. **Performance Tests**: Tests for system behavior under high load and with large data volumes
4. **Reference Tests**: Validation against externally calculated expected values

## Key Test Files

### Unit Tests

- `InterestCalculationTestFramework.java`: Base testing utilities and helpers
- `CalculationStrategyTest.java`: Tests for individual calculation strategies (Daily Balance, Average Daily Balance)

### Integration Tests

- `InterestCalculationEngineTest.java`: Tests for the core calculation engine
- `InterestCalculationIntegrationTest.java`: API-level tests for interest calculation and posting

### Performance Tests

- `InterestCalculationPerformanceTest.java`: Tests for system performance with:
  - Large numbers of accounts
  - Accounts with many transactions
  - Extended calculation periods
  - Batch processing

### Reference Tests

- `InterestCalculationReferenceTest.java`: Tests comparing system calculations with reference values

## Test Scenarios

The test suite covers the following key scenarios:

### Basic Calculation Strategies

- Daily Balance method
- Average Daily Balance method
- Minimum Balance method

### Edge Cases

- Zero balances
- Negative balances
- Very high balances
- Fractional interest rates
- Short periods (single day)
- Long periods (full year)

### Configurations

- Different compounding frequencies (daily, monthly, quarterly, annually)
- Different posting frequencies
- Different day count conventions (365/360)
- Minimum balance requirements

### Performance Scenarios

- Large account volumes
- High transaction volumes
- Long calculation periods
- Batch vs. individual processing

## Running the Tests

### Unit Tests

```bash
./gradlew :fineract-provider:test --tests "org.apache.fineract.portfolio.interestcalculation.domain.CalculationStrategyTest"
./gradlew :fineract-provider:test --tests "org.apache.fineract.portfolio.interestcalculation.service.InterestCalculationEngineTest"
```

### Integration Tests

```bash
./gradlew :integration-tests:test --tests "org.apache.fineract.integrationtests.InterestCalculationIntegrationTest"
```

### Performance Tests

```bash
./gradlew :integration-tests:test --tests "org.apache.fineract.integrationtests.InterestCalculationPerformanceTest"
```

### Reference Tests

```bash
./gradlew :integration-tests:test --tests "org.apache.fineract.integrationtests.InterestCalculationReferenceTest"
```

### All Tests

```bash
./gradlew :fineract-provider:test --tests "org.apache.fineract.portfolio.interestcalculation.*"
./gradlew :integration-tests:test --tests "org.apache.fineract.integrationtests.*InterestCalculation*"
```

## Extending the Framework

When adding new calculation methods or modifying existing ones:

1. Add unit tests for the new strategy in `CalculationStrategyTest.java`
2. Add integration tests in `InterestCalculationIntegrationTest.java`
3. Add reference test cases in `InterestCalculationReferenceTest.java`
4. Verify performance implications in `InterestCalculationPerformanceTest.java`

## Best Practices

- Always include reference calculations with expected values
- Test with realistic data volumes and time periods
- Cover edge cases and boundary conditions
- Verify performance with large data sets
- Test all supported calculation methods and configurations

## Troubleshooting

If tests are failing:

1. Check calculation logic against manually verified reference values
2. Verify that test data is properly set up
3. Ensure the test environment has sufficient resources for performance tests
4. For integration tests, verify that the database is properly initialized

## References

- [Interest Calculation Methods Documentation](https://fineract.apache.org/docs/current/)
- [Financial Mathematics Reference](https://en.wikipedia.org/wiki/Time_value_of_money)