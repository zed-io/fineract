# Interest Batch Processing Module

This document describes the interest batch processing module for automated interest calculation and posting in Fineract.

## Overview

The interest batch processing module provides a robust, configurable framework for automating interest calculations and postings for savings, fixed deposit, and recurring deposit accounts. It includes:

1. A database schema for tracking batch jobs and their execution
2. A comprehensive set of GraphQL actions for configuring and managing batch jobs
3. A scheduling framework that integrates with the existing job system
4. Detailed logging and monitoring capabilities
5. Support for error handling, retries, and manual interventions

## Database Schema

The module creates four main tables:

1. `interest_batch_config` - Configuration settings for batch jobs
2. `interest_batch_account_status` - Tracking of interest calculation/posting status per account
3. `interest_batch_execution` - Records of batch job executions
4. `interest_batch_account_result` - Detailed processing results per account

See the SQL migration file for detailed schema information.

## Job Types

The module supports two primary job types:

1. **Daily Interest Accrual** (`daily_interest_accrual`)
   - Calculates daily interest accruals for all active accounts
   - Typically runs once per day
   - Does not post interest to accounts, only accrues it

2. **Interest Posting** (`interest_posting`)
   - Posts accrued interest to accounts based on their posting frequency
   - Runs daily but only processes accounts due for posting
   - Handles taxation if applicable

## Configuration Options

Each batch job can be configured with the following options:

- **Batch Size** - Number of accounts to process in each batch
- **Parallel Threads** - Number of accounts to process concurrently
- **Max Retries** - Number of times to retry failed account processing
- **Retry Interval** - Time to wait between retries
- **Timeout** - Maximum time allowed for a job to run
- **Account Types** - Types of accounts to include (savings, fixed deposit, recurring deposit)
- **Custom Parameters** - Job-specific parameters as JSON

## GraphQL API

The module exposes the following GraphQL operations:

### Queries

- `getInterestBatchConfigs` - Get all batch job configurations
- `getInterestBatchConfig` - Get a specific batch configuration
- `getInterestBatchExecutions` - Get execution history with pagination
- `getInterestBatchExecution` - Get details of a specific execution
- `getInterestBatchAccountResults` - Get account processing results for an execution
- `getInterestBatchSummary` - Get summary statistics for batch processing

### Mutations

- `createInterestBatchConfig` - Create a new batch configuration
- `updateInterestBatchConfig` - Update an existing batch configuration
- `triggerInterestBatchJob` - Manually trigger a batch job
- `cancelInterestBatchExecution` - Cancel a running batch execution

## Executing Batch Jobs

Batch jobs can be executed in two ways:

1. **Scheduled Execution** - Jobs run automatically according to their configured schedule
2. **Manual Execution** - Jobs can be triggered manually through the GraphQL API

### Scheduled Execution

The batch jobs are registered with the existing scheduler and run based on the defined cron expression:

- Daily Interest Accrual - Runs at midnight (0 0 * * *)
- Interest Posting - Runs at 1 AM (0 1 * * *)

### Manual Execution

Jobs can be triggered manually using the `triggerInterestBatchJob` mutation:

```graphql
mutation {
  triggerInterestBatchJob(
    input: {
      jobType: "daily_interest_accrual",
      parameters: {
        include_dormant_accounts: false,
        process_failed_accounts_first: true
      }
    }
  ) {
    id
    jobType
    startedAt
    status
  }
}
```

You can also process specific accounts by providing the `accountIds` parameter:

```graphql
mutation {
  triggerInterestBatchJob(
    input: {
      jobType: "interest_posting",
      accountIds: ["account-id-1", "account-id-2"]
    }
  ) {
    id
    jobType
    startedAt
    status
  }
}
```

## Monitoring and Error Handling

The module provides comprehensive monitoring and error handling:

1. **Job Execution History** - Complete record of all job executions
2. **Account Processing Results** - Detailed results for each account
3. **Error Tracking** - Detailed error messages and stack traces
4. **Retry Mechanism** - Automatic retries for failed account processing
5. **Logging** - Detailed logging of all operations

## Performance Considerations

To optimize performance:

1. **Batch Processing** - Accounts are processed in configurable batch sizes
2. **Parallel Processing** - Multiple accounts are processed concurrently
3. **Prioritization** - Failed accounts can be prioritized in subsequent runs
4. **Selective Processing** - Only accounts due for posting are processed

## Integration

The batch processing module integrates with:

1. **Savings Account Service** - For interest calculations and postings
2. **Tax Service** - For withholding tax calculations
3. **Accounting Service** - For account entries
4. **Notification Service** - For alerts and notifications

## Security

Access to batch processing operations is controlled through Hasura permissions:

- `admin` role - Full access to all operations
- `user` role - Read-only access to configurations, executions, and results

## Usage Examples

### Viewing Batch Job Summary

```graphql
query {
  getInterestBatchSummary {
    totalAccountsProcessedToday
    totalInterestPostedToday
    failedAccountsToday
    avgProcessingTimeMs
    currentRunningJobs
    lastCompletedRun {
      id
      jobType
      completedAt
      status
    }
  }
}
```

### Getting Execution Results

```graphql
query {
  getInterestBatchAccountResults(
    input: {
      batchExecutionId: "execution-id",
      status: "FAILED",
      limit: 10,
      offset: 0
    }
  ) {
    data {
      accountId
      accountNumber
      interestCalculated
      status
      errorMessage
      processingTimeMs
    }
    totalCount
  }
}
```

### Updating Batch Configuration

```graphql
mutation {
  updateInterestBatchConfig(
    input: {
      id: "config-id",
      batchSize: 500,
      parallelThreads: 8,
      parameters: {
        include_dormant_accounts: true,
        logging_level: "DEBUG"
      }
    }
  ) {
    id
    jobType
    batchSize
    parallelThreads
    enabled
    updatedAt
  }
}
```

## Troubleshooting

Common issues and their resolutions:

1. **Job is stuck in RUNNING state**
   - Check logs for errors
   - Use `cancelInterestBatchExecution` to cancel the job
   - Check for high server load or database locks

2. **High failure rate for accounts**
   - Check common error messages in account results
   - Verify account configurations
   - Check database connection pool settings

3. **Job is taking too long**
   - Reduce batch size
   - Reduce parallel threads
   - Check for database performance issues
   - Add indexes to relevant tables

## Future Enhancements

Planned future enhancements:

1. Real-time monitoring dashboard
2. Email/SMS alerts for job failures
3. More detailed performance metrics
4. Support for custom calculation rules per account
5. Support for multiple currencies and exchange rates