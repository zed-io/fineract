# Savings Notification System

This module implements a comprehensive event-based notification system for the Savings module. It provides notifications for various savings account-related events, including account lifecycle changes, transactions, balance alerts, and more.

## Key Features

1. **Event-based Architecture**: Listens to business events emitted by the savings module and generates appropriate notifications.

2. **Flexible Templates**: Customizable notification templates for different types of events.

3. **Multi-channel Delivery**: Integrated with existing notification channels (email, SMS, in-app).

4. **Configurable Thresholds**: Set transaction amount thresholds for when notifications should be sent.

5. **Balance Monitoring**: Low balance alerts when accounts fall below configurable thresholds.

6. **Dormancy Management**: Automated warnings before accounts become dormant and notifications when dormancy status changes.

7. **Account Hold Notifications**: Alerts when holds are placed or removed from accounts.

8. **Deposit Account Support**: Support for Fixed Deposit and Recurring Deposit specific notifications.

## Notification Events

The system supports notifications for the following events:

### Savings Account Lifecycle
- Account creation
- Account approval
- Account activation
- Account rejection
- Account closure

### Transactions
- Deposits (configurable threshold)
- Withdrawals (configurable threshold)
- Interest postings

### Alerts
- Low balance alerts
- Dormancy warnings
- Account becoming dormant
- Account reactivation

### Account Restrictions
- Hold placement
- Hold removal

### Other
- Statement generation
- Fixed Deposit maturity
- Recurring Deposit installment dues

## Configuration

Notification settings can be configured through the API:

1. **Enable/Disable Events**: Control which events trigger notifications.
2. **Transaction Thresholds**: Set minimum transaction amounts for triggering notifications.
3. **Low Balance Threshold**: Configure when low balance alerts should be triggered.
4. **Dormancy Parameters**: Set the days of inactivity before dormancy warnings and status changes.
5. **Templates**: Customize notification message templates.

## Implementation Details

The notification system consists of the following components:

1. **SavingsNotificationListener**: Listens to savings-related business events and triggers the appropriate notifications.

2. **SavingsNotificationService**: Service for sending different types of notifications.

3. **SavingsNotificationTemplateService**: Manages notification message templates.

4. **SavingsNotificationConfigService**: Manages notification configuration settings.

5. **SavingsNotificationsApiResource**: REST API for managing notification settings.

6. **SavingsDormancyNotificationTask**: Scheduled task for checking accounts approaching dormancy.

## Architecture

The notification system follows these principles:

1. **Loosely Coupled**: Minimal dependencies on other components.
2. **Configurable**: All notification behaviors can be configured.
3. **Extensible**: New notification types can be easily added.
4. **Fault Tolerant**: Errors in notification delivery don't affect core operations.

## Integration Points

- Integrates with the existing notification framework
- Hooks into business events from the savings module
- Uses the platform's configuration system for settings
- Leverages the existing authentication and authorization framework

## Getting Started

1. Configure notification preferences through the API
2. Customize templates as needed
3. Enable/disable specific notification types
4. Set thresholds for transaction and balance notifications