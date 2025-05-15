# Fineract Hasura Seeds

This directory contains seed data for the Fineract Hasura integration. These seeds help to set up a development environment with sample data that can be used with the credit-cloud-admin front-end application.

## Included Seeds

- `loan_application_seed.sql`: Contains sample data for loan products, clients, and database views needed for the loan application functionality in the front-end.

## How to Load Seeds

You can load the seed data using the included script:

```bash
cd /path/to/fineract/hasura
./load_seeds.sh
```

Or manually with psql:

```bash
psql -h localhost -p 5432 -U fineract -d fineract -f ./seeds/loan_application_seed.sql
```

## Seed Data Overview

The seed data includes:

1. **Sample Clients**:
   - Alice Johnson (individual client)
   - Robert Smith (individual client)
   - ABC Corporation (entity client)

2. **Loan Products**:
   - Personal Loan (for individuals)
   - Business Loan (for larger capital needs)
   - Microfinance Loan (small short-term loans)

3. **Database Views**:
   - Simplified client view
   - Loan product view
   - Loan applications view
   - Running loans view

## Using with the Front-end

After loading these seeds, the credit-cloud-admin front-end will be able to:

1. Display the sample clients in the client selection dropdown
2. Show the loan products in the loan product selection step
3. Use the appropriate currency and loan parameters for calculations
4. Submit loan applications that will be properly stored in the database

## Customizing Seeds

You can modify the `loan_application_seed.sql` file to add more clients or loan products according to your needs. Make sure to maintain the structure of the data to ensure compatibility with the front-end application.

## Required Environment

The seeds assume you have already run the migration files to set up the database schema. Make sure you have completed the basic setup before loading the seeds:

1. Fineract database schema migrations
2. Hasura metadata setup

## Troubleshooting

If you encounter issues loading the seeds:

- Verify that your PostgreSQL user has sufficient permissions
- Check that the database and schemas exist
- Ensure that the migrations have been applied successfully before loading seeds