# Consolidated Reporting Module

The Consolidated Reporting Module provides powerful cross-module reporting capabilities for Fineract that allow you to generate reports and analytics that combine data from multiple modules such as loans, clients, savings, and accounting.

## Features

- **Cross-Module Reports**: Generate reports that combine data from multiple modules
- **Interactive Dashboards**: View key metrics across modules in unified dashboards
- **Multiple Output Formats**: Export reports in JSON, CSV, PDF, and Excel formats
- **Flexible Filtering**: Apply complex filters across module boundaries
- **GraphQL Integration**: Leverage GraphQL for efficient data fetching
- **Analytics Insights**: Get automated insights from cross-module data analysis

## Architecture

The Consolidated Reporting Module consists of:

1. **GraphQL API Layer**: Provides endpoints for generating reports and dashboards
2. **Data Source Registry**: Manages connections to various modules
3. **Query Engine**: Executes cross-module queries efficiently
4. **Output Formatter**: Formats results in various output formats
5. **Analytics Engine**: Generates insights from cross-module data

## Available Endpoints

The module exposes the following GraphQL endpoints:

### Generate Consolidated Report

```graphql
mutation GenerateConsolidatedReport($input: ConsolidatedReportInput!) {
  generateConsolidatedReport(input: $input) {
    success
    report {
      id
      name
      description
      reportType
      generatedOn
      data
      metadata
      format
    }
    message
  }
}
```

### Get Cross-Module Dashboard

```graphql
mutation GetCrossModuleDashboard($input: CrossModuleDashboardInput!) {
  getCrossModuleDashboard(input: $input) {
    success
    dashboard {
      id
      name
      description
      generatedOn
      metrics {
        id
        name
        value
        previousValue
        changePercentage
        trend
        category
        subCategory
        metadata
      }
      dataSources {
        id
        name
        moduleType
        status
        lastSyncTime
        recordCount
      }
      visualizationData
    }
    message
  }
}
```

### Sync Data Sources

```graphql
mutation SyncDataSources($input: DataSourceSyncInput!) {
  syncDataSources(input: $input) {
    success
    dataSources {
      id
      name
      moduleType
      status
      lastSyncTime
      recordCount
    }
    message
  }
}
```

### Get Analytics Insights

```graphql
mutation GetAnalyticsInsights($input: AnalyticsInsightsInput!) {
  getAnalyticsInsights(input: $input) {
    success
    insights {
      id
      title
      description
      insightType
      relevanceScore
      metrics {
        id
        name
        value
        previousValue
        changePercentage
        trend
        category
        subCategory
        metadata
      }
      generatedOn
      metadata
    }
    message
  }
}
```

## Usage Examples

### Generate a Portfolio Summary Report

```graphql
mutation {
  generateConsolidatedReport(input: {
    name: "Portfolio Summary",
    description: "Combined portfolio and client metrics",
    reportType: "portfolio_summary",
    modules: ["loan", "client"],
    parameters: {
      asOfDate: "2023-12-31"
    },
    format: "json",
    includeMetadata: true
  }) {
    success
    report {
      id
      name
      reportType
      generatedOn
      data
      metadata
    }
    message
  }
}
```

### Generate a Financial Performance Dashboard

```graphql
mutation {
  getCrossModuleDashboard(input: {
    name: "Financial Performance",
    modules: ["loan", "accounting", "savings"],
    metrics: ["total_portfolio", "active_clients", "portfolio_at_risk", "operational_efficiency", "active_savings"],
    dateRange: {
      from: "2023-01-01",
      to: "2023-12-31"
    }
  }) {
    success
    dashboard {
      id
      name
      generatedOn
      metrics {
        id
        name
        value
        previousValue
        changePercentage
        trend
        category
      }
      visualizationData
    }
    message
  }
}
```

## Available Report Types

The module supports the following report types:

- **portfolio_summary**: Combined loan portfolio and client metrics
- **financial_performance**: Financial performance metrics across modules
- **client_performance**: Client-focused metrics with related loan and savings data
- **operational_metrics**: Staff and operational efficiency metrics

## Available Metrics

Key metrics available for dashboards include:

- **total_portfolio**: Total outstanding loan portfolio
- **active_clients**: Number of active clients
- **portfolio_at_risk**: Portfolio at risk ratio (30 days)
- **operational_efficiency**: Operational efficiency ratio
- **active_savings**: Total active savings balance
- **income_vs_expenses**: Income vs expenses ratio
- **roi_by_product**: Return on investment by product
- **cash_flow_trend**: Cash flow trend over time

## Database Schema

The module uses the following database tables:

- `m_reporting_datasource`: Manages data source connections to modules
- `m_consolidated_report`: Stores report definitions
- `m_consolidated_report_execution`: Tracks report execution history
- `m_cross_module_metric`: Defines cross-module metrics
- `m_cross_module_dashboard`: Stores dashboard definitions
- `m_dashboard_execution`: Tracks dashboard execution history
- `m_analytics_insight`: Stores generated insights

## Integration with Other Modules

The Consolidated Reporting Module integrates with:

1. **Loan Module**: For loan portfolio data
2. **Client Module**: For client demographics and status
3. **Savings Module**: For savings account data
4. **Accounting Module**: For financial data
5. **Staff Module**: For loan officer performance
6. **Group Module**: For group metrics and performance

## Performance Considerations

For optimal performance:

1. Use the data source synchronization mechanism to cache frequently accessed data
2. Apply appropriate filters to limit data volume
3. Schedule large reports during off-peak hours
4. Use pagination for large result sets

## Future Enhancements

Planned enhancements include:

1. Machine learning-based predictive analytics
2. Interactive data exploration tools
3. Report scheduling and automated distribution
4. Custom reporting templates
5. Integration with external BI tools