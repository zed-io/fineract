# Fineract Scheduled Jobs Framework

This service provides a robust framework for executing scheduled jobs in the Fineract Hasura migration. It handles job scheduling, execution, tracking, and error management, with support for multiple job types across various domains.

## Features

- **Flexible Job Scheduling**: Schedule jobs using cron expressions or predefined intervals
- **Robust Job Execution**: Automatic retries, timeout handling, and concurrency control
- **Comprehensive Job Tracking**: Track job status, execution history, and performance metrics
- **Multi-Tenant Support**: Run jobs for specific tenants or across all tenants
- **Distributed Execution**: Safely run jobs across multiple service instances
- **Extensible Framework**: Easily create new job types with custom workers
- **Built-in System Jobs**: Health checks, database maintenance, and other system tasks
- **REST API**: Manage and monitor jobs through a simple REST API

## Architecture

The scheduled jobs framework consists of the following main components:

### Models
- **Job**: Represents a scheduled job with its configuration, status, and history
- **JobWorker**: Implements the actual work to be done for a specific job type
- **JobScheduler**: Manages job scheduling and triggers
- **JobProcessor**: Executes jobs with proper error handling and logging
- **JobManager**: Combines scheduler and processor functionality

### Database Schema
- **job**: Stores job definitions and status
- **job_execution**: Records job execution history
- **job_lock**: Manages job locking for distributed execution
- **job_config**: Stores job type configurations

## Built-in Job Types

The framework includes the following job types:

- **System Health Check** (`system_health_check`): Monitors system health and connectivity
- **Database Maintenance** (`database_maintenance`): Performs database optimization tasks
- **End of Day** (`end_of_day`): Processes end-of-day financial operations
- **End of Month** (`end_of_month`): Processes end-of-month financial operations
- **Loan COB** (`loan_cob`): Close of business processing for loans
- **Loan Interest Posting** (`loan_interest_posting`): Posts interest to loan accounts
- **Savings Interest Calculation** (`savings_interest_calculation`): Calculates savings account interest
- **Savings Interest Posting** (`savings_interest_posting`): Posts interest to savings accounts
- **Email Notification** (`email_notification`): Processes email notification queue
- **SMS Notification** (`sms_notification`): Processes SMS notification queue

## API Endpoints

The service exposes the following REST API endpoints:

- `GET /health`: Service health check
- `GET /jobs`: List all jobs
- `GET /jobs/:id`: Get job details and execution history
- `POST /jobs`: Create a new job
- `POST /jobs/:id/cancel`: Cancel a job
- `POST /jobs/:id/execute`: Execute a job immediately

## Job Configuration

Jobs can be configured with the following properties:

- **name**: Name of the job
- **description**: Description of what the job does
- **jobType**: Type of job (from JobType enum)
- **cronExpression**: Cron expression for scheduling (optional)
- **executionInterval**: Execution interval type (once, hourly, daily, etc.)
- **priority**: Job priority (low, medium, high, critical)
- **parameters**: Job-specific parameters as JSON
- **maxRetries**: Maximum number of retry attempts
- **timeoutSeconds**: Maximum execution time in seconds
- **tenantId**: Tenant ID for tenant-specific jobs (optional)

## Creating a Custom Job Worker

To create a new job type, implement the `JobWorker` interface:

```typescript
import { Job, JobWorker, JobType } from '../models/job';

export class MyCustomJobWorker implements JobWorker {
  async process(job: Job, parameters?: any): Promise<any> {
    // Implement job logic here
    return { status: 'success', result: 'Job completed' };
  }
  
  getJobType(): JobType {
    return 'my_custom_job' as JobType;
  }
  
  canHandle(job: Job): boolean {
    return job.jobType === 'my_custom_job';
  }
}
```

Then register your worker with the job manager:

```typescript
jobManager.registerWorker(new MyCustomJobWorker());
```

## Distributed Execution

The framework supports running multiple instances of the scheduled jobs service for high availability and load distribution. Key features include:

- **Job Locking**: Ensures jobs are executed only once, even across multiple service instances
- **Node Identification**: Each service instance has a unique node ID
- **Concurrency Control**: Limits the number of concurrent jobs per job type
- **Stale Lock Detection**: Automatically recovers from failed nodes

## Configuration

Configuration is done through environment variables:

- `PORT`: Server port (default: 3100)
- `POSTGRES_*`: Database connection settings
- `MAX_CONCURRENT_JOBS`: Maximum number of concurrent jobs (default: 10)
- `LOG_LEVEL`: Logging level (default: info)

## Development and Testing

To run the service locally:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start in production mode
npm start
```