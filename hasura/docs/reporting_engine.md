# Reporting Engine Documentation

The Fineract Hasura implementation includes a comprehensive reporting engine that provides both portfolio and financial reports along with multiple export formats.

## Available Reports

### Portfolio Reports

1. **Portfolio at Risk (PAR)**
   - Shows outstanding loan amounts at different risk levels (days overdue)
   - Includes breakdowns by loan officer, branch, and product
   - Provides portfolio quality indicators like PAR ratio

2. **Collection Report**
   - Compares expected vs actual collections for a specified period
   - Breaks down collections by principal, interest, fees, and penalties
   - Includes daily collection trends and officer performance

3. **Loan Portfolio Summary**
   - Comprehensive overview of the active loan portfolio
   - Shows portfolio distribution by status, product, and branch
   - Includes outstanding balances, delinquency rates, and trends

4. **Expected Repayments Report**
   - Projects future repayments for cash flow planning
   - Breaks down expected payments by date, loan officer, branch, and product
   - Useful for liquidity management and collection planning

### Financial Reports

1. **Income Statement**
   - Standard profit and loss statement with customizable periods
   - Option for comparative analysis against previous periods
   - Categorized income and expense items

2. **Balance Sheet**
   - Complete asset, liability, and equity breakdown
   - Comparative analysis with previous period
   - Detailed account-level information

3. **Financial Ratios Report**
   - Over 20 key financial indicators across multiple categories:
     - Profitability ratios (ROA, ROE, etc.)
     - Asset quality ratios (PAR, write-off ratio, etc.)
     - Financial structure ratios (debt-to-equity, etc.)
     - Liquidity ratios (current ratio, etc.)
     - Efficiency ratios (cost-to-income, etc.)
     - Growth ratios

4. **Interest Income Report**
   - Detailed breakdown of interest income by source
   - Analysis by product, branch, and loan officer
   - Trends over time

5. **Fee Income Report**
   - Detailed breakdown of fee income by type
   - Analysis by product, branch, and loan officer
   - Trends over time

## Export Formats

All reports can be exported in multiple formats:

1. **PDF**
   - Professional layout with tables, headers, and formatting
   - Pagination for large reports
   - Embedded charts and graphs (future enhancement)

2. **Excel**
   - Multiple worksheets for data and metadata
   - Column formatting based on data types
   - Data validation and formulae

3. **CSV**
   - Standard CSV format for data processing
   - Metadata included as comments at the top of the file

4. **JSON**
   - Complete report data in structured JSON format
   - Ideal for API integration and custom processing

## Using the Reporting API

The reporting engine is accessible through GraphQL queries and mutations:

### Executing Standard Reports

```graphql
mutation ExecuteReport {
  executeReport(input: {
    reportId: "portfolio_at_risk",
    parameters: {
      asOfDate: "2023-05-01",
      officeId: "12345"
    },
    pagination: {
      pageSize: 50,
      pageNumber: 1
    },
    sorting: [
      {
        field: "outstandingAmount",
        direction: "desc"
      }
    ]
  }) {
    success
    report {
      reportId
      reportName
      columns {
        name
        displayName
        dataType
      }
      data
      totals
      paging {
        totalRecords
        totalPages
      }
    }
  }
}
```

### Exporting Reports

```graphql
mutation ExportReport {
  exportReport(input: {
    reportId: "income_statement",
    parameters: {
      fromDate: "2023-01-01",
      toDate: "2023-12-31",
      officeId: "12345",
      includeComparative: true
    },
    format: "pdf"
  })
}
```

### Portfolio Reports

#### Portfolio at Risk

```graphql
mutation PortfolioAtRisk {
  portfolioAtRiskReport(input: {
    asOfDate: "2023-05-01",
    officeId: "12345",
    currencyCode: "USD",
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
        daysOverdueFrom
        daysOverdueTo
        outstandingAmount
        numberOfLoans
        percentOfPortfolio
      }
      parByLoanOfficer {
        loanOfficerId
        loanOfficerName
        totalOutstanding
        portfolioAtRisk
        parRatio
      }
    }
  }
}
```

#### Collection Report

```graphql
mutation CollectionReport {
  collectionReport(input: {
    fromDate: "2023-04-01",
    toDate: "2023-04-30",
    officeId: "12345"
  }) {
    success
    report {
      fromDate
      toDate
      currency
      expected {
        principal
        interest
        fees
        penalties
        total
      }
      actual {
        principal
        interest
        fees
        penalties
        total
      }
      variance {
        principal
        interest
        fees
        penalties
        total
      }
      collectionRatio
      collectionsByDay {
        date
        expected
        actual
        ratio
      }
    }
  }
}
```

### Financial Reports

#### Income Statement

```graphql
mutation IncomeStatement {
  incomeStatementReport(input: {
    fromDate: "2023-01-01",
    toDate: "2023-03-31",
    officeId: "12345",
    includeComparative: true
  }) {
    success
    report {
      reportName
      currency
      fromDate
      toDate
      income {
        total
        previousTotal
        changePercentage
        categories {
          name
          amount
          previousAmount
          changePercentage
          accounts {
            name
            glCode
            amount
          }
        }
      }
      expenses {
        total
        previousTotal
        changePercentage
        categories {
          name
          amount
          previousAmount
          changePercentage
        }
      }
      summary {
        totalIncome
        totalExpenses
        netIncome
        changeInNetIncome
      }
    }
  }
}
```

#### Balance Sheet

```graphql
mutation BalanceSheet {
  balanceSheetReport(input: {
    asOfDate: "2023-03-31",
    officeId: "12345",
    includeComparative: true
  }) {
    success
    report {
      reportName
      currency
      asOfDate
      assets {
        total
        categories {
          name
          amount
          accounts {
            name
            glCode
            amount
          }
        }
      }
      liabilities {
        total
        categories {
          name
          amount
        }
      }
      equity {
        total
        categories {
          name
          amount
        }
      }
      summary {
        totalAssets
        totalLiabilities
        totalEquity
      }
    }
  }
}
```

#### Financial Ratios

```graphql
mutation FinancialRatios {
  financialRatiosReport(input: {
    asOfDate: "2023-03-31",
    officeId: "12345"
  }) {
    success
    report {
      reportName
      asOfDate
      profitabilityRatios {
        returnOnAssets
        returnOnEquity
        operationalSelfSufficiency
        yieldOnGrossPortfolio
      }
      assetQualityRatios {
        portfolioAtRisk30
        portfolioAtRisk90
        writeOffRatio
      }
      financialStructureRatios {
        debtToEquityRatio
        equityToAssetRatio
      }
      liquidityRatios {
        currentRatio
        quickRatio
      }
      efficiencyRatios {
        operatingExpenseRatio
        costToIncomeRatio
      }
    }
  }
}
```

## Extending the Reporting Engine

The reporting engine is designed to be extensible:

1. **Adding New Reports**
   - Create a report definition in the database
   - Implement a new API endpoint or query in the action handlers
   - Add GraphQL types for the report

2. **Custom Export Formats**
   - Extend the ExportService class with new format handlers
   - Implement formatting logic for the desired output

3. **Scheduled Reports**
   - Use the scheduled report tables to configure automated report generation
   - Set up the scheduled jobs service to process pending reports