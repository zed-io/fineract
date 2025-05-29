# Mock Data Population Summary

## Successfully Populated Data

The Hasura instance has been populated with comprehensive mock data for Trinidad and Tobago operations. Here's what was successfully loaded:

### Core Organizational Data
- **Offices**: 6 branches across Trinidad and Tobago
  - Port of Spain Headquarters
  - San Fernando Branch
  - Arima Branch
  - Chaguanas Branch
  - Scarborough Branch
  - Point Fortin Branch

- **Staff**: 7 staff members with local names
  - Includes loan officers, branch managers, cashiers, and operational roles

### Financial Products
- **Loan Products**: 6 loan products configured for Trinidad market
  - Standard Loan (12% interest)
  - Home Improvement Loan (7.5% interest)
  - Small Business Loan (9.5% interest)
  - Education Loan (6% interest)
  - Agricultural Loan (6.5% interest)
  - Carnival Loan (8.5% interest - unique to Trinidad culture)

- **Savings Products**: 6 savings products
  - Regular/premium/retirement savings accounts
  - Trinidad-specific product structures

### Accounting
- **GL Accounts**: 39 general ledger accounts
  - Chart of accounts referencing local banks (First Citizens, RBC)
  - Properly structured account hierarchy

### Additional Data
- **Beneficiary Notification Templates**: 16 templates for email and SMS notifications
- **Currency**: TTD (Trinidad and Tobago Dollar) configured
- **Holiday Calendar**: Trinidad national holidays configured

### Tables with Issues
Due to schema migration ordering issues, the following tables couldn't be fully populated:
- Client records
- Client groups
- Loans and loan transactions
- Savings accounts and transactions
- Fixed deposits
- Recurring deposits
- Reporting data
- Integration configurations

## Data Access

To access the data from Hasura GraphQL endpoints:

1. Navigate to http://localhost:8080/console
2. Use the admin secret: `myadminsecretkey`
3. The data is in the `fineract_default` schema

## Example Queries

### Get all offices:
```graphql
query GetOffices {
  fineract_default_office {
    id
    name
    hierarchy
    opening_date
  }
}
```

### Get loan products:
```graphql
query GetLoanProducts {
  fineract_default_loan_product {
    id
    name
    short_name
    annual_nominal_interest_rate
    min_principal_amount
    max_principal_amount
  }
}
```

### Get staff members:
```graphql
query GetStaff {
  fineract_default_staff {
    id
    firstname
    lastname
    display_name
    mobile_no
    email_address
  }
}
```

## Next Steps

To fully populate remaining data, you would need to:
1. Fix the client table creation issues in migrations
2. Re-run the seed scripts with proper dependency ordering
3. Or manually insert client data first, then dependent records

The current setup provides a good foundation with organizational structure, products, and accounting framework ready for use.