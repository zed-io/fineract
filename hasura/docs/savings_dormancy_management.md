# Savings Account Dormancy Management

This document provides an overview of the Savings Account Dormancy Management feature in Apache Fineract.

## Overview

The Dormancy Management feature allows financial institutions to manage inactive savings accounts by:

- Tracking account inactivity periods
- Automatically transitioning accounts through different dormancy states
- Applying dormancy fees
- Sending notifications before dormancy transitions
- Managing reactivation processes
- Generating dormancy reports

## Dormancy States

Savings accounts can be in the following dormancy states:

1. **Active (None)** - Normal operational account with recent activity
2. **Inactive** - Account with no activity for a configured period
3. **Dormant** - Account formally classified as dormant after extended inactivity
4. **Escheat** - Account dormant for very long periods (typically years), subject to regulatory requirements

## Configuration Options

Dormancy management can be configured at the product level with the following options:

- **Dormancy Tracking Active** - Enable/disable dormancy tracking
- **Days to Inactive** - Days of inactivity before account is marked inactive
- **Days to Dormancy** - Days of inactivity before account is marked dormant
- **Days to Escheat** - Days of inactivity before account is marked for escheat
- **Dormancy Fee Amount** - Fee charged to dormant accounts
- **Dormancy Fee Period** - Frequency of charging dormancy fees (monthly, yearly)
- **Dormancy Notification Days** - When to send notifications before dormancy status changes
- **Reactivation Allowed** - Whether dormant accounts can be reactivated
- **Auto-reactivate on Credit** - Whether deposits automatically reactivate dormant accounts

## Dormancy Process

1. **Activity Tracking**: 
   - Last transaction date is tracked for all accounts
   - Inactivity periods are calculated based on this date

2. **Status Transitions**:
   - Accounts move from active → inactive → dormant → escheat
   - Each transition is logged with date, reason, and triggering user
   - Notifications can be configured to alert customers before transitions

3. **Dormancy Fees**:
   - Fees can be charged at configurable intervals
   - Fees can be waived if balance is below threshold
   - Fee history is tracked

4. **Reactivation**:
   - Manual reactivation by staff
   - Automatic reactivation when a deposit is made (configurable)
   - Reactivation history is tracked

## API Endpoints

The following GraphQL operations are available:

### Queries

- `getDormancyConfiguration` - Get dormancy settings for a product
- `getDormancyLog` - Get dormancy status transition history for an account
- `getDormancyReport` - Generate reports on dormant accounts

### Mutations

- `updateDormancyConfiguration` - Update dormancy settings for a product
- `reactivateDormantAccount` - Manually reactivate a dormant account
- `changeDormancyStatus` - Manually change dormancy status
- `applyDormancyFee` - Manually apply a dormancy fee
- `processDormancyFees` - Process dormancy fees in batch

## Database Schema

The following tables and views support this feature:

- `savings_product` - Enhanced with dormancy configuration fields
- `savings_account` - Enhanced with dormancy tracking fields
- `savings_account_dormancy_log` - Tracks dormancy status transitions
- `view_dormant_savings_accounts` - View for reporting on dormant accounts

## Automated Jobs

The following automated processes maintain dormancy states:

1. **Dormancy Detection** - Identifies accounts meeting dormancy criteria
2. **Fee Processing** - Applies configured dormancy fees
3. **Notification Processing** - Sends alerts before status changes

## Integration Points

Dormancy management integrates with:

- **Notification System** - For sending dormancy alerts
- **Accounting** - For dormancy fee processing
- **Reporting** - For regulatory and management reports

## Regulatory Considerations

Different jurisdictions have varying regulations for dormant accounts:

- Required notification periods
- Maximum dormancy fees
- Escheatment processes
- Reporting requirements

The system allows configuring these parameters to meet local requirements.