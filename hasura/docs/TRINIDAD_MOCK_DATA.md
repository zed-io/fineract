# Trinidad and Tobago Mock Data

This document explains the mock data created for Trinidad and Tobago within the Fineract Hasura implementation.

## Overview

The Trinidad and Tobago mock dataset provides a comprehensive sample environment that reflects:

- Local geography (Port of Spain, San Fernando, Arima, etc.)
- Trinidad and Tobago currency (TTD)
- Local financial products and services
- Cultural elements relevant to Trinidad (e.g., Carnival Saver accounts)
- Integration with local financial institutions

## Data Structure

The mock data is organized across multiple domains:

### 1. Core Data (`trinidad_seed_data.sql`)

- **Offices:** Branches across Trinidad and Tobago including Port of Spain, San Fernando, Arima, Scarborough, Chaguanas and Point Fortin
- **Staff:** Personnel with locally relevant names and positions
- **Clients:** Individual and group clients with Trinidad demographic information
- **Loan Products:** Products designed for Trinidad market (Small Business, Agriculture, Personal)

### 2. Accounting Data (`trinidad_accounting_seed.sql`)

- **Chart of Accounts:** Trinidad-specific GL structure
- **Bank Accounts:** Reflects local banks (First Citizens Bank, Republic Bank)
- **Journal Entries:** Sample accounting transactions in TTD
- **Accounting Rules:** Trinidad-specific accounting configurations

### 3. Savings Data (`trinidad_savings_seed.sql`)

- **Savings Products:** Trinidad-specific savings offerings
- **Savings Accounts:** Sample accounts for Trinidad clients
- **Transactions:** Deposits and withdrawals with reasonable TTD amounts

### 4. Fixed Deposit Data (`trinidad_fixed_deposit_schema.sql`)

- **Fixed Deposit Schema:** Table definitions for Trinidad FDs
- **Fixed Deposit Products:** Products with Trinidad interest rates and terms
- **Fixed Deposit Accounts:** Sample accounts with maturity dates and interest calculations

### 5. Recurring Deposit Data (`trinidad_recurring_deposit_schema.sql`)

- **Recurring Deposit Schema:** Table definitions for Trinidad RDs
- **Recurring Deposit Products:** Including culturally relevant "Carnival Saver"
- **Recurring Deposit Accounts:** Sample accounts with installment history
- **Installment Tracking:** Records tracking deposit schedules

### 6. Reporting Data (`trinidad_reporting_seed.sql`)

- **Report Templates:** Trinidad-specific report definitions
- **Report Executions:** Sample report runs with timestamps
- **Report Results:** Mock results in JSON format
- **Scheduled Reports:** Configured report schedules for Trinidad operations
- **Financial Analysis:** Trinidad-specific financial metrics and ratios
- **Dashboards:** Preconfigured Trinidad performance dashboards

### 7. Integration Data (`trinidad_integration_seed.sql`)

- **API Clients:** Systems that connect to Trinidad instances (Mobile App, Agent Network)
- **API Usage:** Sample usage statistics for APIs
- **Webhooks:** Notification endpoints for Trinidad systems
- **Data Exchange:** File transfer configurations with Trinidad institutions
- **Event Streams:** Real-time data streaming for Trinidad operations

## Using the Mock Data

### Loading the Data

Run the `load_trinidad_seeds.sh` script to populate the database:

```bash
chmod +x /Users/markp/wam/fineract/hasura/load_trinidad_seeds.sh
/Users/markp/wam/fineract/hasura/load_trinidad_seeds.sh
```

### Verifying the Data

After loading, you can verify the data with SQL queries:

```sql
-- Check Trinidad offices
SELECT name, hierarchy FROM office WHERE name LIKE '%Trinidad%' OR name LIKE '%Port of Spain%';

-- View Trinidad loan products
SELECT name, currency_code, min_principal, max_principal FROM loan_product;

-- Check Trinidad recurring deposit products (including Carnival Saver)
SELECT name, description, currency_code, interest_rate FROM recurring_deposit_product;

-- View Trinidad reports
SELECT * FROM trinidad_reporting_summary;

-- View Trinidad integration configurations
SELECT * FROM trinidad_integration_summary;
```

## Customizing the Data

The seed scripts are designed to create data if it doesn't exist, allowing you to:

1. Run the scripts multiple times safely
2. Modify seed scripts to add more data
3. Create additional Trinidad-specific data by following the patterns in existing scripts

## Trinidad-Specific Features

### Cultural Context

The data incorporates Trinidad and Tobago cultural elements:

- **Carnival Saver:** Recurring deposit designed for Trinidad's famous Carnival
- **Geography:** Reflects actual regions across Trinidad and Tobago
- **Financial Services:** Tailored to Trinidad's banking landscape
- **Currency:** All financial data in Trinidad and Tobago Dollars (TTD)

### Regulatory Context

Includes mock regulatory integrations relevant to Trinidad:

- Central Bank reporting connections
- Credit Bureau data exchange
- Regulatory event streams
- Financial inclusion metrics

## Limitations

This mock data is for development and testing purposes only and has some limitations:

1. Some complex financial calculations (e.g., interest compounding) are simplified
2. While names and locations are realistic, they do not represent real individuals
3. Financial values are representative but do not reflect actual market conditions
4. Integration endpoints use fictional URLs and credentials

## Contributing

To enhance the Trinidad mock data:

1. Add more product variations relevant to Trinidad market
2. Expand client demographics to better reflect Trinidad population
3. Add more specific cultural contexts to financial products
4. Include additional financial institutions specific to Trinidad