# Share Account Domain - Fineract Hasura Implementation

## Overview

The Share Account Domain in Fineract Hasura implements the functionality for managing share products, share accounts, and share transactions. This domain allows financial institutions to offer share-based products to their clients and groups, enabling them to invest in the institution through share purchases.

## Key Concepts

### Share Products

Share products define the template for share accounts and include configuration for:

- **Total Shares**: The total number of shares available for the product
- **Nominal Price**: The face value of each share
- **Market Price**: The current trading value of each share (optional)
- **Share Value Calculation**: Whether to use nominal or market pricing for value calculations
- **Capital Type**: Whether shares represent paid-up or authorized capital
- **Dividend Configuration**: Settings for dividend declarations and payments
- **Lock-in Period**: Restriction on share redemption for a specific period

### Share Accounts

Share accounts represent a client's or group's holding of shares in a specific share product. Key aspects include:

- **Account Status**: The lifecycle of a share account (pending approval, approved, active, rejected, closed)
- **Share Holdings**: The number of approved and pending shares held
- **Dividend Eligibility**: Tracking of dividend payments and eligibility
- **Charges**: Fees applicable to share account transactions

### Share Transactions

Share accounts support various transaction types:

- **Share Purchase**: Buying additional shares
- **Share Redemption**: Selling back owned shares
- **Dividend Payments**: Distribution of profits to shareholders
- **Charge Payments**: Fees charged for account operations

## Domain Model

The Share Account domain consists of the following core entities:

### Share Product

Defines the overall structure and rules for share accounts:

- Product details (name, description, currency)
- Share configuration (total shares, nominal price, market price)
- Calculation and dividend policies
- Associated charges

### Share Account

Represents individual share holdings:

- Link to client or group
- Status tracking
- Share counts and values
- Transaction history
- Dividend history

### Share Purchase Request

Tracks requests to buy additional shares:

- Requested shares quantity
- Status (pending, approved, rejected)
- Approval information

### Share Account Transaction

Records financial movements in the share account:

- Transaction type (purchase, redemption, dividend, charge)
- Shares quantity and monetary values
- Date and associated data

### Share Product Dividend

Manages product-level dividend declarations:

- Dividend period and amount
- Status tracking

### Share Account Dividend

Manages individual account dividend payments:

- Link to product dividend declaration
- Amount and status
- Payment tracking

## API Functionality

The Share Account domain provides comprehensive API functionality through GraphQL:

### Share Product Management

- Create share products with customizable settings
- Query product details and listings
- Configure charges and market prices
- Declare dividends for products

### Share Account Management

- Create accounts for clients and groups
- Handle the account lifecycle (approval, rejection, activation, closure)
- Query account details and balances
- Retrieve client/group account listings

### Share Transaction Processing

- Submit and process share purchase requests
- Redeem shares
- Process dividend payments
- Calculate share values and dividends

## Using the Share Account API

### Creating a Share Product

```graphql
mutation CreateShareProduct {
  createShareProduct(
    name: "Community Shares 2023"
    shortName: "CS2023"
    description: "Community participation shares with annual dividends"
    currencyCode: "USD"
    totalShares: 10000
    totalSharesToBeIssued: 8000
    nominalPrice: 100.00
    marketPrice: 105.50
    shareCapitalType: "paid_up"
    shareValueCalculationType: "market"
    allowDividendsForInactiveClients: false
    accountingRule: "cash"
    charges: ["fee1-uuid", "fee2-uuid"]
    marketPrices: [
      {
        fromDate: "2023-01-01"
        price: 105.50
      }
    ]
  ) {
    productId
  }
}
```

### Creating a Share Account

```graphql
mutation CreateShareAccount {
  createShareAccount(
    clientId: "client-uuid"
    productId: "product-uuid"
    submittedDate: "2023-05-15"
    requestedShares: 50
    externalId: "EXT12345"
    savingsAccountId: "savings-account-uuid"
    lockinPeriod: 12
    lockinPeriodFrequencyType: "months"
  ) {
    accountId
  }
}
```

### Approving a Share Account

```graphql
mutation ApproveShareAccount {
  approveShareAccount(
    accountId: "account-uuid"
    approvedDate: "2023-05-20"
    approvedShares: 50
    note: "Account approved after verification"
  ) {
    accountId
    approvedDate
    approvedShares
  }
}
```

### Redeeming Shares

```graphql
mutation RedeemShares {
  redeemShares(
    accountId: "account-uuid"
    transactionDate: "2023-08-15"
    sharesQuantity: 10
  ) {
    accountId
    transactionId
    transactionDate
    sharesQuantity
    totalAmount
  }
}
```

### Declaring Dividends

```graphql
mutation DeclareShareProductDividend {
  declareShareProductDividend(
    productId: "product-uuid"
    dividendPeriodStartDate: "2023-01-01"
    dividendPeriodEndDate: "2023-12-31"
    dividendAmount: 100000.00
  ) {
    productId
    dividendId
    dividendAmount
  }
}
```

### Processing Dividends

```graphql
mutation ProcessShareDividend {
  processShareDividend(
    accountId: "account-uuid"
    dividendPayOutId: "dividend-payout-uuid"
    savingsAccountId: "savings-account-uuid"
  ) {
    accountId
    dividendId
    processedDate
    amount
  }
}
```

## Integration with Other Domains

The Share Account domain integrates with:

1. **Client Domain**: Share accounts are linked to clients
2. **Group Domain**: Share accounts can be created for groups
3. **Savings Domain**: Dividends can be transferred to savings accounts
4. **Accounting Domain**: Share transactions generate journal entries
5. **Reporting Domain**: Share data is included in financial reports

## Data Model

The Share Account domain uses the following database tables:

- `share_product`: Defines share product templates
- `share_product_charge`: Maps charges to share products
- `share_product_market_price`: Tracks market price history
- `share_product_dividend`: Records dividend declarations
- `share_account`: Manages client/group share holdings
- `share_account_charge`: Tracks fees for share accounts
- `share_purchase_request`: Manages share purchase requests
- `share_account_transaction`: Records all share movements
- `share_account_dividend`: Tracks dividend payments

## Implementation Details

### Database Schema

The schema follows a consistent pattern with:

- UUID primary keys for all entities
- Comprehensive audit fields (created/modified date and user)
- Proper foreign key constraints
- Status tracking through enum types
- Transaction integrity through database constraints

### Business Logic

The business logic is implemented in the `shareService.ts` file, which provides:

- Comprehensive validation of business rules
- Transaction management for data integrity
- Calculation of share values and dividends
- Status transition management for accounts and requests

### API Layer

The API is implemented through:

- GraphQL actions and types defined in Hasura metadata
- Express API handlers for business logic
- JWT-based authentication and role-based authorization

## Future Enhancements

Planned enhancements for the Share Account domain:

1. **Share Certificate Generation**: Creating printable certificates for shareholders
2. **Advanced Dividend Calculation**: Supporting multiple dividend calculation methods
3. **Secondary Market**: Enabling share trading between clients
4. **Voting Rights**: Managing voting rights based on share ownership
5. **Regulatory Reporting**: Specialized reports for regulatory compliance