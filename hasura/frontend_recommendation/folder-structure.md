# Recommended Folder Structure for GraphQL

```
src/
├── graphql/
│   ├── fragments/
│   │   ├── client/
│   │   │   ├── clientBasicInfo.graphql
│   │   │   ├── clientAddressInfo.graphql
│   │   │   └── clientIdentifierInfo.graphql
│   │   ├── loan/
│   │   │   ├── loanBasicInfo.graphql
│   │   │   └── loanPaymentInfo.graphql
│   │   └── index.ts
│   ├── mutations/
│   │   ├── client/
│   │   │   ├── createClient.graphql
│   │   │   ├── updateClient.graphql
│   │   │   └── activateClient.graphql
│   │   ├── loan/
│   │   │   ├── createLoanApplication.graphql
│   │   │   └── approveLoan.graphql
│   │   └── index.ts
│   ├── queries/
│   │   ├── client/
│   │   │   ├── getClientList.graphql
│   │   │   ├── getClientById.graphql
│   │   │   └── getClientAccounts.graphql
│   │   ├── loan/
│   │   │   ├── getLoanApplications.graphql
│   │   │   └── getLoanById.graphql
│   │   └── index.ts
│   └── subscriptions/ (if needed)
├── generated/
│   ├── graphql.ts
│   ├── schema.graphql
│   └── introspection-result.ts
└── components/
    ├── clients/
    │   ├── ClientForm/
    │   ├── ClientList/
    │   └── ClientDetail/
    ├── loans/
    │   ├── LoanApplicationForm/
    │   ├── LoanList/
    │   └── LoanDetail/
    └── shared/
        ├── forms/
        │   ├── FormTextField/
        │   ├── FormDatePicker/
        │   ├── FormSelect/
        │   └── FormActions/
        └── layout/
```