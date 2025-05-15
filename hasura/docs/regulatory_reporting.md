# Regulatory Reporting System

## Overview

The Regulatory Reporting System provides comprehensive capabilities for Trinidad and Tobago credit unions to generate, manage, and submit mandatory regulatory reports to various local authorities including:

- Financial Intelligence Unit (FIU)
- Central Bank of Trinidad and Tobago
- Commissioner for Co-operative Development
- Financial Services Commission

The system automates the generation of required reports, helps track submission deadlines, and maintains a complete history of report submissions for audit purposes.

## Key Features

- **Trinidad & Tobago-specific Reports**: Pre-configured report templates for all required regulatory filings
- **Report Scheduling**: Automatic generation of reports based on defined schedules
- **Deadline Tracking**: Proactive notifications for upcoming report deadlines
- **Multi-format Export**: Generate reports in PDF, Excel, CSV, JSON, or XML formats
- **Approval Workflow**: Multi-level review and approval process before submission
- **Submission Tracking**: Track report submissions and maintain submission history
- **Audit Trail**: Comprehensive tracking of who generated, approved, and submitted each report

## Report Types

The system supports the following report types specific to Trinidad and Tobago regulatory requirements:

### AML/CFT Reports
- **Suspicious Transaction Reports (STR)**: For reporting suspicious transactions to the FIU
- **Large Cash Transaction Reports (LCTR)**: For transactions over $10,000 TTD
- **Terrorist Property Reports**: For reporting suspected terrorist financing
- **Annual Compliance Reports**: For demonstrating AML/CFT compliance

### Prudential Reports
- **Quarterly Returns**: Financial performance reports for the Central Bank
- **Credit Union Monthly Statements**: For the Commissioner for Co-operative Development
- **Financial Condition Reports**: Detailed financial position reports

### Portfolio Reports
- **Loan Portfolio Reports**: Analysis of loan portfolio quality and composition
- **Delinquency Reports**: Detailed analysis of past-due loans and aging
- **Member Statistics Reports**: Membership demographics and activity

## Architecture

The Regulatory Reporting System is built on a service-oriented architecture with the following components:

- **Database Layer**: PostgreSQL schema with tables for report definitions, instances, and schedules
- **Service Layer**: TypeScript services implementing business logic for report generation and management
- **API Layer**: RESTful API endpoints exposed via Hasura GraphQL actions
- **GraphQL Interface**: Strongly-typed GraphQL schema for client applications

## API Endpoints

The system exposes the following API endpoints through Hasura Actions:

- `/api/regulatory-reporting/definitions` - Get all report definitions
- `/api/regulatory-reporting/definition` - Get a specific report definition
- `/api/regulatory-reporting/generate` - Generate a regulatory report
- `/api/regulatory-reporting/instances` - Get all report instances
- `/api/regulatory-reporting/instance` - Get a specific report instance
- `/api/regulatory-reporting/status` - Update report status
- `/api/regulatory-reporting/deadlines` - Get upcoming report deadlines
- `/api/regulatory-reporting/schedules` - Get report schedules
- `/api/regulatory-reporting/schedule` - Create a report schedule
- `/api/regulatory-reporting/run-scheduled` - Run scheduled reports

## GraphQL Schema

The system defines the following GraphQL types:

- **Enums**: `ReportFrequency`, `ReportFormat`, `ReportStatus`, `RegulatoryReportType`
- **Input Types**: `RegReportGenerationRequest`, `UpdateReportStatusInput`, `ReportScheduleParams`, `CreateReportScheduleInput`
- **Output Types**: `RegReportDefinition`, `RegReportInstance`, `RegReportSchedule`, `UpcomingDeadline`, `RegReportGenerationResult`
- **Response Types**: Various response types for each query/mutation

## Database Schema

The system uses the following tables in the database:

- `regulatory_report_definition`: Stores report templates and configurations
- `regulatory_report_instance`: Stores generated report instances
- `regulatory_report_schedule`: Stores report generation schedules

## Implementation Details

The implementation includes the following components:

### Services
- `RegulatoryReportingService`: Core service for generating and managing reports

### Handlers
- `RegulatoryReportingHandler`: HTTP handlers for API endpoints

### Routes
- `regulatoryReportingRoutes`: Express routes for API endpoints

### GraphQL
- `regulatory_reporting_types.graphql`: GraphQL type definitions
- `regulatory_reporting_actions.yaml`: Hasura actions configuration

## Usage Examples

### Generating a Suspicious Transaction Report

```graphql
mutation GenerateSTR {
  generateReport(
    reportType: suspicious_transaction_report
    startDate: "2023-01-01"
    endDate: "2023-01-31"
    format: pdf
    parameters: {
      threshold: 10000
    }
  ) {
    success
    reportInstance {
      id
      name
      fileUrl
    }
  }
}
```

### Getting Upcoming Report Deadlines

```graphql
query GetDeadlines {
  getUpcomingDeadlines(daysAhead: 30) {
    success
    deadlines {
      name
      reportType
      dueDate
      daysUntilDue
    }
  }
}
```

### Creating a Report Schedule

```graphql
mutation CreateSchedule {
  createReportSchedule(
    definitionId: "123e4567-e89b-12d3-a456-426614174000"
    frequency: monthly
    scheduleParams: {
      dayOfMonth: 15
      hour: 2
      minute: 0
    }
    reportParams: {
      threshold: 10000
    }
  ) {
    success
    schedule {
      id
      nextRun
    }
  }
}
```

## Security Considerations

The Regulatory Reporting System implements strict access controls:

- Only authorized users with specific roles (`admin`, `bank_admin`, `cu_admin`) can access reports
- All report generation actions are audit-logged
- Report data is encrypted at rest
- Access to sensitive STR and LCTR reports is limited to compliance officers

## Best Practices

- Schedule reports to run during off-peak hours
- Create report schedules that align with regulatory deadlines (e.g., 15 days before due date)
- Regularly review upcoming deadlines to ensure timely submissions
- Implement a review process before submitting reports to regulatory authorities

## Trinidad and Tobago Specific Requirements

The system is specifically designed to meet Trinidad and Tobago's regulatory requirements:

- **Financial Intelligence Unit (FIU)**: STRs and LCTRs in required formats
- **Central Bank**: Quarterly return format as specified in the Financial Institutions Act
- **Commissioner for Co-operative Development**: Monthly statements as required by the Co-operative Societies Act
- **Financial Services Commission**: Risk assessment reports as required

## Future Enhancements

- Integration with electronic filing systems of regulatory authorities
- Enhanced analytical capabilities for identifying reportable transactions
- Additional report templates as regulations evolve
- Mobile notifications for upcoming deadlines