# Apache Fineract - Hasura Implementation

This is a modular Hasura-based backend implementation of Apache Fineract, converting the existing Java monolith to a PostgreSQL and GraphQL-based architecture.

## Overview

The Hasura implementation of Apache Fineract aims to:

1. Replace Java business logic with Hasura Actions and Event Triggers
2. Migrate from MySQL/MariaDB to PostgreSQL with optimized schema design
3. Leverage Hasura's authorization system for multi-tenancy and access control
4. Use GraphQL for all API interactions
5. Maintain functional parity with the original Fineract platform

## Architecture

The architecture consists of the following components:

1. **PostgreSQL Database**: Optimized schema for financial operations with proper constraints and relationships.
2. **Hasura GraphQL Engine**: Provides GraphQL API, permissions, and actions orchestration.
3. **Microservices**:
   - **Actions Server**: Implements business logic for GraphQL mutations.
   - **Event Handlers**: Processes asynchronous event triggers.
   - **Scheduled Jobs**: Runs background processes like EOD jobs, interest calculations, etc.

## Directory Structure

- `/migrations` - PostgreSQL schema migrations for the Fineract data model
- `/metadata` - Hasura metadata configuration
  - `/actions` - GraphQL action definitions and handlers
  - `/relationships` - Table relationships configuration
  - `/permissions` - Role-based access control definitions
  - `/rest` - REST endpoint configurations for backward compatibility
  - `/event-triggers` - Event trigger configurations
- `/seeds` - Data seeding scripts for initial setup
- `/services` - Implementation of business logic microservices
  - `/actions` - Implements GraphQL action handlers
  - `/event-handlers` - Implements event trigger processors
  - `/scheduled-jobs` - Implements scheduled background jobs

## Multi-tenancy Model

The Hasura implementation uses a schema-based multi-tenancy approach:

1. A central `fineract_tenants` schema manages tenant information
2. Each tenant has its own PostgreSQL schema with identical table structure
3. Hasura permissions isolate tenant data through PostgreSQL role-based access

## Key Features

- **GraphQL API**: Complete replacement of REST APIs with GraphQL
- **Row-Level Security**: Advanced permission system using Hasura's row-level security
- **Event-Driven Architecture**: Business processes implemented through Hasura event triggers
- **Optimized Schema Design**: PostgreSQL-native data types, proper indexing, and constraints

## Development Setup

To set up the Hasura-based Fineract locally:

1. Start PostgreSQL and Hasura using Docker Compose:
   ```
   docker-compose up -d
   ```

2. Apply the migrations:
   ```
   hasura migrate apply
   ```

3. Apply the metadata:
   ```
   hasura metadata apply
   ```

4. Seed the initial data:
   ```
   hasura seed apply
   ```

## Authentication & Authorization

- JWT-based authentication
- Role-based authorization with granular permissions
- Row-level security for tenant isolation

## Implementation Status

This implementation is a work in progress. The current status of the migration:

- ✅ **Client Domain**: Complete implementation with full CRUD operations, lifecycle management, and related entities
- ✅ **Group Domain**: Complete implementation with group management, client-group relationships, and group loans
- ✅ **Integration**: Complete implementation with webhooks, API clients, data exchange, and event streaming
- 🔄 **Loan Domain**: In progress - schema migration complete, core actions implemented
  - ✅ **Loan Decisioning**: Complete implementation with automated risk assessment, rule-based decisioning, document verification, and workflow management
  - ✅ **Credit Check Integration**: Complete implementation with credit bureau integration, credit score tracking, and fraud detection
- ✅ **KYC/AML Compliance**: Complete implementation with fraud detection, watchlist screening, and risk monitoring
  - ✅ **Fraud Detection**: Advanced fraud detection with identity verification and document authenticity checks
  - ✅ **AML/PEP Screening**: Integration with AML databases and politically exposed persons lists
  - ✅ **Sanctions Screening**: Automatic screening against international and local sanctions lists
  - ✅ **Risk Monitoring**: Ongoing monitoring of client risk levels with manual review workflow
- 🔄 **Savings Domain**: In progress - schema migration complete, basic operations implemented
- 🔄 **Fixed Deposits**: In progress - core implementation complete, pending automation features
- 🔄 **Recurring Deposits**: In progress - core implementation complete, pending installment automation
- ✅ **Share Accounts**: Complete implementation with product management, share transactions, and dividend processing
- 🔄 **Authentication**: In progress - core user and permission model implemented
- ✅ **Reporting Engine**: Complete implementation with financial and portfolio reports, export functionality
- ⏳ **Accounting**: Planned - schema design in progress

See [MIGRATION_PROGRESS.md](./docs/MIGRATION_PROGRESS.md) for detailed status of each domain.

## How It Works

### Business Logic Implementation

Business logic is implemented through:

1. **Hasura Actions**: For synchronous operations like loan approvals, disbursements, etc.
2. **Event Triggers**: For asynchronous operations, like updating balances after a transaction
3. **Scheduled Jobs**: For periodic operations like interest calculations, maturity processing, etc.

### Data Flow

1. Client applications interact with the GraphQL API
2. Hasura validates permissions and routes operations
3. Mutations are processed by Action handlers
4. Events are triggered for async operations
5. Backend microservices process actions and events

## Performance Considerations

- GraphQL queries optimize data fetching with exactly what's needed
- PostgreSQL is optimized for financial transactions
- Microservices can scale independently based on load
- Caching is implemented for frequently accessed data

## Reporting Engine

The Fineract Hasura implementation includes a comprehensive reporting engine that provides:

### Portfolio Reports
- **Portfolio at Risk (PAR)**: Shows outstanding loan amounts at different levels of risk
- **Collection Report**: Compares expected vs actual collections with detailed breakdowns
- **Loan Portfolio Summary**: Provides a comprehensive view of the loan portfolio
- **Expected Repayments**: Forecasts upcoming repayments for cash flow planning

### Financial Analysis
- **Income Statement**: Standard P&L statement with comparative periods
- **Balance Sheet**: Asset, liability, and equity breakdown with comparative analysis
- **Financial Ratios**: Over 20 key financial indicators across multiple categories
- **Interest & Fee Income**: Detailed breakdowns of income sources

### Export Functionality
Reports can be exported in multiple formats:
- PDF with formatted tables and summaries
- Excel with multiple worksheets and data validation
- CSV for data processing
- JSON for API integration

### Loan Decisioning Engine

The Fineract Hasura implementation includes a comprehensive loan decisioning engine that provides:

#### Automated Risk Assessment
- **Credit Scoring**: Automatic evaluation of credit history and scores
- **Debt Ratio Analysis**: Assessment of income-to-debt ratios and repayment capacity
- **Document Verification**: Automated or manual verification of required documentation
- **Employment Verification**: Tracking of employment status and verification
- **Savings History**: Analysis of savings patterns and account balances

#### Credit Bureau Integration
- **Real-time Credit Checks**: Integration with Trinidad & Tobago credit bureaus
- **Risk Category Assessment**: Categorization of applicants into risk groups
- **Delinquency Detection**: Identification of past payment issues
- **Fraud Indicators**: Detection of potential fraud patterns
- **Active Loan Tracking**: Monitoring of other active loans and total debt
- **Bankruptcy Flagging**: Recognition of bankruptcy or insolvency history

#### Rule-Based Decision System
- **Decisioning Rulesets**: Configurable sets of decision rules
- **Decision Rules**: Individual rules with conditions and actions
- **Rule Evaluation**: Automatic evaluation of loan applications against rules
- **Risk Scoring**: Numerical scoring of loan applications for standardized assessment
- **Conditional Approvals**: Support for approvals with specific conditions

#### Loan Application Workflow
- **Workflow Stages**: Tracking of loan applications through multiple stages
- **Multi-Level Approvals**: Support for hierarchical approval processes
- **Decision History**: Complete audit trail of all decisions made
- **Manual Overrides**: Ability for authorized staff to override automated decisions
- **Comprehensive Audit**: Detailed audit logging of all application-related activities

### KYC/AML Compliance Engine

The Fineract Hasura implementation includes a comprehensive KYC/AML compliance engine designed specifically for Trinidad and Tobago credit unions, providing:

#### Advanced Fraud Detection
- **Identity Verification**: Automated verification of client identity against government databases
- **Document Authenticity**: Analysis of document security features to detect forgeries
- **Address Verification**: Confirmation of address information with postal records
- **Transaction Pattern Analysis**: Detection of suspicious transaction patterns

#### AML and Sanctions Screening
- **AML Database Integration**: Screening against Anti-Money Laundering databases
- **PEP Identification**: Detection of Politically Exposed Persons as defined by FATF and local regulations
- **Sanctions Screening**: Checking against OFAC, EU, UN, and local Trinidad and Tobago sanctions lists
- **Caribbean-Specific Lists**: Integration with CFATF (Caribbean Financial Action Task Force) watchlists

#### Risk Management Workflow
- **Risk Categorization**: Automatic classification of clients into risk categories
- **Manual Review Process**: Workflow for compliance officers to review high-risk cases
- **Audit Trail**: Comprehensive tracking of all verification steps and decisions
- **Ongoing Monitoring**: Continuous monitoring of client risk levels with periodic rescreening

#### Compliance Reporting
- **Regulatory Reports**: Generation of reports required by Trinidad and Tobago regulators
- **Suspicious Activity**: Flagging and reporting of suspicious activity
- **Risk Analytics**: Dashboards showing risk distribution across the client base
- **Audit Support**: Tools to support regulatory compliance audits

### Using the Decisioning & Reporting APIs

```graphql
# Example: Performing fraud detection and AML screening
mutation PerformFraudDetection {
  performFraudDetection(input: {
    clientId: "client-123",
    checkTypes: [
      IDENTITY_VERIFICATION,
      AML_SCREENING,
      PEP_SCREENING,
      SANCTIONS_SCREENING
    ],
    identificationNumber: "ID12345678",
    firstName: "John",
    lastName: "Smith"
  }) {
    success
    fraudDetection {
      requestId
      clientId
      timestamp
      overallRiskLevel
      requiresManualReview
      reviewReason
      checks {
        checkType
        riskLevel
        score
        details
        matchDetails
      }
    }
  }
}

# Example: Performing a credit check
mutation PerformCreditCheck {
  performCreditCheck(input: {
    clientId: "client-123",
    identificationNumber: "ID12345678",
    includeHistory: true
  }) {
    success
    creditCheck {
      requestId
      clientId
      creditScore
      scoreDate
      reportReference
      creditBureau
      riskCategory
      delinquencyStatus
      activeLoans
      totalOutstanding
      bankruptcyFlag
      fraudFlag
      inquiryCount
      reportSummary
    }
  }
}

# Example: Assessing a loan application
mutation AssessLoanApplication {
  assessLoanApplication(input: {
    loanId: "loan-123",
    assessmentDate: "2023-05-01",
    includeDocumentVerification: true,
    includeCreditCheck: true,
    includeEmploymentVerification: true
  }) {
    success
    assessment {
      loanId
      decisionId
      result
      riskScore
      riskLevel
      factors {
        type
        name
        value
        impact
        details
      }
      conditions {
        description
        requiredBy
        isMandatory
      }
      isFinal
    }
  }
}

# Example: Making a loan decision
mutation MakeLoanDecision {
  makeLoanDecision(input: {
    loanId: "loan-123",
    decisionResult: APPROVED,
    notes: "Approved based on excellent credit history",
    isFinal: true
  }) {
    success
    decision {
      decisionId
      loanId
      result
      timestamp
      isFinal
    }
  }
}

# Example: Generating a Portfolio at Risk report
mutation GeneratePortfolioAtRiskReport {
  portfolioAtRiskReport(input: {
    asOfDate: "2023-05-01",
    officeId: "12345",
    includeDetails: true
  }) {
    success
    report {
      asOfDate
      currency
      totalOutstanding
      parRatio
      parBrackets {
        name
        outstandingAmount
        percentOfPortfolio
      }
    }
  }
}

# Example: Exporting an Income Statement as PDF
mutation ExportIncomeStatement {
  exportReport(input: {
    reportId: "income_statement",
    parameters: {
      fromDate: "2023-01-01",
      toDate: "2023-12-31"
    },
    format: "pdf"
  })
}
```