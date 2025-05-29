# Trinidad Mock Data Setup Guide

This guide will help you set up and run the Hasura backend with comprehensive Trinidad and Tobago mock data for full feature functionality.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL client tools (psql) installed
- At least 4GB of available RAM

## Quick Start

### 1. Start the Hasura Backend

From the root directory of the project:

```bash
# Start the Hasura backend with PostgreSQL
docker-compose -f docker-compose-hasura.yml up -d

# Wait for services to be ready (about 30 seconds)
sleep 30
```

### 2. Apply Database Migrations

```bash
cd hasura

# Run all migrations to create the database schema
./run_migrations.sh
```

### 3. Load Trinidad Mock Data

```bash
# Make the script executable
chmod +x load_trinidad_seeds.sh

# Load all Trinidad-specific mock data
./load_trinidad_seeds.sh
```

This will load:
- 6 branch offices across Trinidad & Tobago
- 50+ clients with local names and addresses
- 50+ active savings accounts
- 40+ loan accounts (various types)
- 20+ fixed deposits
- 25+ recurring deposits
- 30+ share accounts
- 3000+ realistic transactions
- Complete accounting setup
- Reporting configurations

### 4. Apply Hasura Metadata

```bash
# Apply Hasura metadata (permissions, relationships, actions)
hasura metadata apply
```

### 5. Access the Services

- **Hasura Console**: http://localhost:8080/console
- **GraphQL Endpoint**: http://localhost:8080/v1/graphql
- **PostgreSQL**: localhost:5432 (user: postgres, password: postgrespassword)

## Verify the Data

### Check Data Counts
```bash
# Connect to the database
psql -h localhost -p 5432 -U postgres -d postgres

# Run verification queries
SELECT COUNT(*) FROM m_client; -- Should show 50+ clients
SELECT COUNT(*) FROM m_savings_account WHERE status_enum = 300; -- Active savings accounts
SELECT COUNT(*) FROM m_loan WHERE loan_status_id = 300; -- Active loans
SELECT COUNT(*) FROM m_savings_account_transaction; -- Transaction history
```

### Sample GraphQL Queries

Access the Hasura console at http://localhost:8080/console and try these queries:

```graphql
# Get all clients with their savings accounts
query GetClientsWithSavings {
  m_client(limit: 10) {
    display_name
    mobile_no
    m_savings_accounts {
      account_no
      account_balance_derived
      m_savings_product {
        name
        nominal_annual_interest_rate
      }
    }
  }
}

# Get loan portfolio summary
query GetLoanPortfolio {
  m_loan_aggregate(where: {loan_status_id: {_eq: 300}}) {
    aggregate {
      count
      sum {
        principal_amount
        principal_outstanding_derived
      }
    }
  }
}

# Get recent transactions
query GetRecentTransactions {
  m_savings_account_transaction(
    order_by: {transaction_date: desc}
    limit: 20
  ) {
    transaction_date
    amount
    transaction_type_enum
    transaction_details
    m_savings_account {
      account_no
      m_client {
        display_name
      }
    }
  }
}
```

## Features Available with Mock Data

### 1. Client Management
- Individual clients across all Trinidad regions
- Complete KYC information
- Contact details and addresses

### 2. Savings Accounts
- Regular, Premium, and Youth savings accounts
- Realistic balances and transaction history
- Monthly interest calculations
- Beneficiary management

### 3. Loan Products
- Home Improvement Loans (up to TTD 1.5M)
- Small Business Loans (up to TTD 500K)
- Education Loans (up to TTD 150K)
- Agricultural Loans (up to TTD 300K)
- Carnival Loans (up to TTD 25K)

### 4. Deposits
- Fixed deposits with various terms (6, 12, 24 months)
- Recurring deposits including "Carnival Saver"
- Maturity calculations and interest rates

### 5. Share Accounts
- Credit union share products
- Dividend calculations
- Share purchase/redemption transactions

### 6. Transactions
- Salary deposits from local employers
- Utility bill payments (T&TEC, WASA, TSTT)
- Shopping at local stores (Massy, PriceSmart)
- Carnival-related expenses
- School fee payments
- ATM withdrawals
- Insurance premiums

### 7. Reporting
- Branch performance reports
- Product analytics
- Financial statements
- Regulatory reports

## Troubleshooting

### If migrations fail:
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose-hasura.yml logs postgres

# Reset and try again
docker-compose -f docker-compose-hasura.yml down -v
docker-compose -f docker-compose-hasura.yml up -d
```

### If seed data fails:
```bash
# Check for specific errors
psql -h localhost -p 5432 -U postgres -d postgres -c "SELECT * FROM m_office;"

# The seed scripts are idempotent, so you can run them again
./load_trinidad_seeds.sh
```

## Next Steps

1. **Frontend Access**: The React frontend is available at `http://localhost:3000` (run from `/front-ends/credit-cloud-admin`)
2. **API Testing**: Use the GraphQL playground at `http://localhost:8080/console`
3. **Custom Development**: Modify the seed data files in `/hasura/seeds/` for your specific needs

## Data Privacy Note

All data in this system is mock/fictional. Names, addresses, and phone numbers are randomly generated and do not represent real individuals or businesses.