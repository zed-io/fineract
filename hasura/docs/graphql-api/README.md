# Fineract GraphQL API Documentation

Welcome to the comprehensive documentation for the Fineract GraphQL API. This documentation serves as a guide for developers integrating with the Fineract platform through our GraphQL interface.

## Introduction

The Fineract GraphQL API provides a modern, flexible way to interact with the Fineract core banking system. GraphQL enables you to request exactly the data you need, reducing over-fetching and improving application performance.

### Key Benefits

- **Request Exactly What You Need**: Specify the fields you want to retrieve in a single request
- **Strongly Typed Schema**: All types and operations are clearly defined
- **Introspection**: Discover API capabilities directly through the GraphQL endpoint
- **Efficient Data Fetching**: Reduce bandwidth usage by avoiding over-fetching
- **Single Endpoint**: Access all functionality through a unified endpoint

## Getting Started

- [Authentication Guide](./authentication.md) - Learn how to authenticate with the API
- [Schema Overview](./schema-overview.md) - Understand the API's type system
- [Query Examples](./query-examples.md) - See examples of common queries
- [Mutation Examples](./mutation-examples.md) - Learn how to modify data via mutations
- [Best Practices](./best-practices.md) - Optimize your API usage

## Core Modules

- [Clients](./modules/clients.md) - Managing customer profiles
- [Loans](./modules/loans.md) - Loan products and application processing
- [Savings](./modules/savings.md) - Savings account management
- [Groups](./modules/groups.md) - Group and center management
- [Accounting](./modules/accounting.md) - General ledger and accounting operations
- [Fixed Deposit](./modules/fixed-deposits.md) - Fixed deposit accounts
- [Recurring Deposit](./modules/recurring-deposits.md) - Recurring deposit accounts
- [Shares](./modules/shares.md) - Share account management
- [Reporting](./modules/reporting.md) - Financial and portfolio reporting

## Advanced Topics

- [Error Handling](./advanced/error-handling.md) - Managing API errors
- [Pagination](./advanced/pagination.md) - Working with large datasets
- [Filtering and Sorting](./advanced/filtering-sorting.md) - Query optimization techniques
- [Batch Operations](./advanced/batch-operations.md) - Processing multiple operations at once
- [Rate Limiting](./advanced/rate-limiting.md) - Understanding API rate limits

## Developer Tools

- [GraphQL Playground Guide](./tools/graphql-playground.md) - Interactive API explorer
- [API Testing Guide](./tools/api-testing.md) - Testing your GraphQL queries
- [Client Libraries](./tools/client-libraries.md) - Libraries for different programming languages

## Reference

- [Schema Documentation](./reference/schema.md) - Complete schema reference
- [Error Codes](./reference/error-codes.md) - Comprehensive list of error codes
- [Changelog](./reference/changelog.md) - API version history and changes

## Support

For technical support, please contact us at [support@fineract.org](mailto:support@fineract.org) or open an issue in our [GitHub repository](https://github.com/apache/fineract).