# Complete Demo Setup Guide - Frontend to Backend

This guide will walk you through setting up and running a complete demo of the Fineract system with the React frontend connected to the Hasura backend.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm/pnpm installed
- PostgreSQL client tools (psql)
- At least 8GB RAM available

## Step 1: Start the Backend Services

### 1.1 Start Hasura and PostgreSQL

```bash
# From the root directory
docker-compose -f docker-compose-hasura.yml up -d

# Verify services are running
docker-compose -f docker-compose-hasura.yml ps

# Should show:
# - postgres running on port 5432
# - hasura running on port 8080
```

### 1.2 Run Database Migrations

```bash
cd hasura

# Make scripts executable
chmod +x run_migrations.sh load_trinidad_seeds.sh

# Run migrations to create schema
./run_migrations.sh

# Load Trinidad mock data
./load_trinidad_seeds.sh
```

### 1.3 Load Demo Users

```bash
# Load demo user accounts
psql -h localhost -p 5432 -U postgres -d postgres -f seeds/trinidad_demo_users.sql
```

### 1.4 Apply Hasura Metadata

```bash
# Install Hasura CLI if not already installed
npm install -g hasura-cli

# Apply metadata (permissions, relationships, actions)
hasura metadata apply --endpoint http://localhost:8080 --admin-secret myadminsecretkey
```

## Step 2: Setup the Frontend

### 2.1 Install Dependencies

```bash
cd ../front-ends/credit-cloud-admin

# Install dependencies
npm install
# or if using pnpm
pnpm install
```

### 2.2 Generate Prisma Client

```bash
# Generate Prisma client for database access
npx prisma generate
```

### 2.3 Generate GraphQL Types

```bash
# Generate TypeScript types from GraphQL schema
npm run codegen
```

## Step 3: Start the Frontend

```bash
# Start the development server
npm run dev
# or for production build
npm run build && npm start
```

The frontend will be available at: **http://localhost:3000**

## Step 4: Demo User Credentials

Use these credentials to log in:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Admin** | admin | Admin@123 | Full system access |
| **Branch Manager** | manager.pos | Admin@123 | Branch operations |
| **Loan Officer** | loan.officer | Admin@123 | Loan management |
| **Teller** | teller.chag | Admin@123 | Cash transactions |
| **Field Officer** | field.officer | Admin@123 | Field operations |
| **Client** | client.demo | Admin@123 | Self-service portal |

## Step 5: Demo Walkthrough

### 5.1 Admin Dashboard (login as 'admin')

1. **Dashboard Overview**
   - View key metrics: Active clients, loan portfolio, savings balances
   - Branch performance across Trinidad locations
   - Recent transactions and activities

2. **Client Management**
   - Browse 50+ Trinidad clients
   - View client details with local addresses and phone numbers
   - Create new clients
   - View client accounts and transactions

3. **Loan Portfolio**
   - View 40+ active loans including:
     - Home Improvement Loans (up to TTD 1.5M)
     - Small Business Loans
     - Education Loans
     - Agricultural Loans
     - Carnival Loans (unique to Trinidad)
   - Process loan applications
   - View repayment schedules

4. **Savings Accounts**
   - 50+ active savings accounts
   - View transaction history
   - Process deposits/withdrawals
   - View beneficiaries

5. **Reports**
   - Branch performance reports
   - Product analytics
   - Financial statements

### 5.2 Branch Manager View (login as 'manager.pos')

- Limited to Port of Spain branch data
- Staff management capabilities
- Branch-level reporting
- Approve loans and accounts

### 5.3 Client Self-Service (login as 'client.demo')

- View own accounts
- Transaction history
- Loan balances and payment schedules
- Transfer funds between accounts

## Step 6: Testing Key Features

### Create a New Savings Account
1. Navigate to Clients → Select a client
2. Click "Add Savings Account"
3. Select product (Regular, Premium, or Youth)
4. Enter opening balance
5. Submit and approve

### Process a Loan Application
1. Navigate to Clients → Select a client
2. Click "Add Loan"
3. Select "Carnival Loan" for quick approval
4. Enter amount (e.g., TTD 15,000)
5. Review schedule and submit
6. Approve and disburse

### Make a Transaction
1. Navigate to Savings → Select an account
2. Click "Deposit" or "Withdraw"
3. Enter amount and description
4. Submit transaction

### View Reports
1. Navigate to Reports
2. Select "Trinidad Branch Performance"
3. Set date range
4. Generate report

## Troubleshooting

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Can't connect to backend
```bash
# Check if services are running
docker-compose -f docker-compose-hasura.yml ps

# Check Hasura console
open http://localhost:8080/console

# Test GraphQL endpoint
curl http://localhost:8080/v1/graphql \
  -H 'x-hasura-admin-secret: myadminsecretkey' \
  -d '{"query":"{ m_client(limit: 1) { id display_name } }"}'
```

### Authentication issues
```bash
# Verify environment variables
cat .env.local

# Check if using correct auth method
# Should be: NEXT_PUBLIC_AUTH_METHOD=admin-secret
```

### Database connection issues
```bash
# Test database connection
psql -h localhost -p 5432 -U postgres -d postgres -c "SELECT COUNT(*) FROM m_client;"

# Reset database if needed
docker-compose -f docker-compose-hasura.yml down -v
docker-compose -f docker-compose-hasura.yml up -d
```

## Additional Resources

- **Hasura Console**: http://localhost:8080/console (admin secret: myadminsecretkey)
- **GraphQL Playground**: http://localhost:8080/console/api-explorer
- **API Documentation**: See `/hasura/docs/` directory
- **Frontend Components**: See `/front-ends/credit-cloud-admin/src/components/`

## Demo Scenarios

### Scenario 1: Carnival Loan Campaign
1. View clients in Port of Spain area
2. Identify clients without Carnival loans
3. Create targeted Carnival loan offers
4. Process applications with quick approval

### Scenario 2: Monthly Interest Posting
1. Navigate to Savings → Interest Posting
2. Review accounts due for interest
3. Run batch interest calculation
4. View posted transactions

### Scenario 3: Branch Comparison
1. Navigate to Reports → Branch Performance
2. Compare loan disbursements across branches
3. Analyze product popularity by region
4. Export report for management

## Next Steps

- Explore the mobile app in `/mobile/` directory
- Customize the Trinidad product offerings
- Add more localized features
- Integrate with local payment gateways

For production deployment, update environment variables and enable proper authentication methods.