# Recurring Deposit Installment Tracking

This document describes the automated installment tracking system for Recurring Deposit accounts in Fineract.

## Overview

The Recurring Deposit Installment Tracking feature provides automated monitoring of recurring deposit installments, identifying overdue installments, applying penalties, updating account statistics, and sending notifications to customers and staff.

## Key Features

1. **Automated Daily Tracking**: The system automatically tracks installment due dates and identifies overdue installments on a daily basis.

2. **Overdue Detection**: Identifies accounts with missed installments and calculates the overdue amount.

3. **Penalty Management**: Automatically applies penalties for overdue installments based on configurable rules.

4. **Account Statistics**: Updates account-level statistics including total overdue amount and number of overdue installments.

5. **Notification System**: Integrated with the notification system to:
   - Send reminders about upcoming installments
   - Alert customers about missed installments
   - Notify staff about accounts with multiple missed payments
   - Inform customers when penalties are applied

6. **Configurable Rules**: Flexible configuration for:
   - Penalty amounts and calculation methods
   - Grace period for penalty application
   - Maximum number of penalties per installment
   - Notification preferences and templates

## Technical Implementation

### Components

1. **Database Schema**:
   - `recurring_deposit_schedule_installment`: Tracks individual installments
   - `recurring_deposit_account_recurring_detail`: Stores overdue statistics
   - `notification_template`: Defines templates for notifications
   - `job_config`: Stores configuration for batch processing

2. **Scheduled Jobs**:
   - `recurring_deposit_installment_tracking`: Runs daily to detect overdue installments
   - `recurring_deposit_installment_reminder`: Sends reminders about upcoming installments

3. **Services**:
   - `RecurringDepositService`: Contains core business logic for tracking installments
   - `RecurringDepositInstallmentTrackingJobWorker`: Job worker for batch processing

### Workflow

1. **Tracking Process**:
   - The scheduled job runs daily (default: 3 AM)
   - For each active recurring deposit account:
     - Identifies overdue installments (due date < current date and not completed)
     - Calculates total overdue amount
     - Updates account statistics
     - Applies penalties if enabled

2. **Penalty Application**:
   - Checks if penalty should be applied based on:
     - Days since due date > grace period
     - Maximum penalties per installment not exceeded
   - Calculates penalty amount based on configuration
   - Creates charge and applies it to the account

3. **Notification Process**:
   - Sends notifications for:
     - Upcoming installments (few days before due date)
     - Missed installments
     - Applied penalties
   - Supports multiple notification channels (email, SMS, in-app)

## Configuration

### Job Configuration

The installment tracking job has the following configurable parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `apply_penalties` | Whether to apply penalties for overdue installments | `true` |
| `send_notifications` | Whether to send notifications | `true` |
| `track_overdue_only` | Whether to track only overdue installments | `false` |
| `batch_size` | Number of accounts to process in each batch | `500` |
| `penalty_grace_period_days` | Days after due date before penalty is applied | `5` |

The job can be configured in the `job_config` table with type `recurring_deposit_installment_tracking`.

### Penalty Configuration

Penalties are configured with the following parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enable_auto_penalty` | Whether to automatically apply penalties | `true` |
| `penalty_type` | Type of penalty (fixed or percentage) | `fixed` |
| `penalty_amount` | Amount of penalty (fixed amount or percentage) | `10` |
| `grace_period_days` | Days after due date before penalty is applied | `5` |
| `max_penalties_per_installment` | Maximum number of penalties per installment | `1` |

## API

The installment tracking system is primarily automated but can be triggered manually through API endpoints:

### Execute Job Manually

```
POST /api/jobs/execute/{jobId}
```

Example payload:
```json
{
  "parameters": {
    "applyPenalties": true,
    "sendNotifications": true,
    "testMode": false,
    "asOfDate": "2023-07-15"
  }
}
```

## Command Line Utility

A shell script is provided to manually run the installment tracking job:

```bash
./run_recurring_deposit_installment_tracking.sh [options]
```

Options:
- `--no-penalties`: Disable penalty application
- `--no-notifications`: Disable sending notifications
- `--test-mode`: Run in test mode (no actual penalties or notifications)
- `--date YYYY-MM-DD`: Specify a date (default: today)

## Monitoring and Metrics

The installment tracking job produces the following metrics:

1. **Execution Summary**:
   - Total accounts checked
   - Accounts with overdue installments
   - Total overdue installments
   - Total overdue amount
   - Penalties applied
   - Total penalty amount

2. **Job Execution History**:
   - Available in the `job_execution` table
   - Accessible through the jobs API

## Security and Access Control

The installment tracking system runs under the 'admin' role and requires appropriate permissions to:
- Read account data
- Update account statistics
- Apply penalties
- Send notifications

## Troubleshooting

Common issues and troubleshooting steps:

1. **Job Not Running**:
   - Check job status in `job` table
   - Verify cron expression in job configuration
   - Check job execution history for errors

2. **Penalties Not Applied**:
   - Verify `apply_penalties` parameter is enabled
   - Check if grace period has passed
   - Ensure penalty configuration exists

3. **Notifications Not Sent**:
   - Verify `send_notifications` parameter is enabled
   - Check notification templates exist
   - Ensure notification service is operational

## Log Messages

The system generates structured logs for monitoring and debugging:

- `Starting recurring deposit installment tracking`: Job starting
- `Recurring deposit installment tracking completed`: Job completed successfully
- `Error tracking recurring deposit installments`: Error occurred during tracking
- `Error applying penalty charge`: Error occurred when applying penalty
- `Sending notifications for overdue installments`: Sending notifications

## Integration Points

The installment tracking system integrates with:

1. **Notification System**: For sending alerts and reminders
2. **Accounting System**: For applying penalties
3. **Reporting System**: For generating overdue reports
4. **Client Portal**: For displaying overdue information to customers
5. **Staff Dashboard**: For highlighting accounts with overdue installments

## Future Enhancements

Planned enhancements include:

1. **Advanced Segmentation**: Categorize accounts by risk profile
2. **Progressive Penalties**: Increasing penalties for repeat missed payments
3. **Payment Prediction**: ML-based prediction of likelihood to miss payments
4. **Auto-debit Integration**: Automatic collection from linked accounts
5. **Customizable Workflows**: Allow institutions to define custom workflows for handling missed payments