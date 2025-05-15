# Group Domain Testing Strategy

This document provides an overview of the comprehensive testing approach for the Group domain in Apache Fineract.

## Overview

The Group domain in Apache Fineract enables the creation and management of groups, which can include clients, have hierarchical relationships with centers, and interact with other domains such as savings and loans. The comprehensive testing strategy ensures that all aspects of group functionality work correctly in isolation and integrated with other domains.

## Test Categories

The testing approach includes multiple types of tests:

### 1. Unit Tests

- `GroupTest`: Tests the Group domain entity and its business logic
- `GroupingTypesWritePlatformServiceTest`: Tests the service layer for Group operations

Unit tests focus on testing individual components in isolation, using mocks for dependencies.

### 2. Integration Tests

- `GroupClientAssociationTest`: Tests the association and disassociation of clients with groups
- `GroupSavingsIntegrationTest` (existing): Tests the integration between Groups and Savings
- `GroupLoanIntegrationTest` (existing): Tests the integration between Groups and Loans

Integration tests verify that different components work together correctly.

### 3. End-to-End Tests

- `GroupLifecycleE2ETest`: Tests the complete lifecycle of a group from creation to closure
- Tests for hierarchical relationships between centers and groups

End-to-end tests verify that complete business processes work as expected.

### 4. Performance Tests

- `GroupOperationsPerformanceTest`: Tests the performance of group operations with different scales

Performance tests ensure that the system maintains performance requirements under load.

## Running the Tests

### Unit Tests

Run unit tests with Gradle:

```bash
./gradlew :fineract-core:test --tests "*org.apache.fineract.portfolio.group.domain.GroupTest"
./gradlew :fineract-provider:test --tests "*org.apache.fineract.portfolio.group.service.GroupingTypesWritePlatformServiceTest"
```

### Integration Tests

Run integration tests with Gradle:

```bash
./gradlew :integration-tests:test --tests "*org.apache.fineract.integrationtests.GroupClientAssociationTest"
./gradlew :integration-tests:test --tests "*org.apache.fineract.integrationtests.GroupSavingsIntegrationTest"
./gradlew :integration-tests:test --tests "*org.apache.fineract.integrationtests.GroupLoanIntegrationTest"
```

### End-to-End Tests

Run end-to-end tests with Gradle:

```bash
./gradlew :integration-tests:test --tests "*org.apache.fineract.integrationtests.GroupLifecycleE2ETest"
```

### Performance Tests

Performance tests are marked with the `performance` tag and should be run separately:

```bash
./gradlew :integration-tests:test --tests "*org.apache.fineract.integrationtests.GroupOperationsPerformanceTest"
```

## Test Coverage

The testing strategy is designed to cover:

1. Core domain logic (Group entity, business rules)
2. Service operations (create, update, activate, close groups)
3. Client association/disassociation
4. Group hierarchies (center-group relationships)
5. Integration with other domains (Savings, Loans)
6. Performance with different scales (small to large groups)

## Continuous Improvement

This testing strategy should be continuously improved:

1. Add more tests based on new features
2. Add tests for bug fixes
3. Update existing tests when functionality changes
4. Monitor and adjust performance thresholds as necessary

## Related Documentation

For more details on the comprehensive testing plan, refer to:
- [Group Testing Plan](docs/group-testing-plan.md)