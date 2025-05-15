/**
 * Core reporting models for Fineract
 */

/**
 * Report format types for export
 */
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  HTML = 'html',
  JSON = 'json'
}

/**
 * Report category enum
 */
export enum ReportCategory {
  CLIENT = 'client',
  LOAN = 'loan',
  SAVINGS = 'savings',
  FUND = 'fund',
  ACCOUNTING = 'accounting',
  STAFF = 'staff',
  PORTFOLIO = 'portfolio',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  SOCIAL = 'social',
  CUSTOM = 'custom'
}

/**
 * Report frequency for scheduled reports
 */
export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

/**
 * Parameter type for reports
 */
export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  CLIENT = 'client',
  CLIENT_GROUP = 'client_group',
  STAFF = 'staff',
  OFFICE = 'office',
  LOAN_PRODUCT = 'loan_product',
  SAVINGS_PRODUCT = 'savings_product',
  CURRENCY = 'currency'
}

/**
 * Data aggregation method
 */
export enum AggregationMethod {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  COUNT_DISTINCT = 'count_distinct',
  FIRST = 'first',
  LAST = 'last',
  CUSTOM = 'custom'
}

/**
 * Sort direction
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Report definition interface
 */
export interface ReportDefinition {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  category: ReportCategory;
  subCategory?: string;
  reportSql?: string;
  reportQuery?: QueryDefinition;
  parameters: ReportParameter[];
  columns: ReportColumn[];
  isActive: boolean;
  isSystemReport: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Report parameter interface
 */
export interface ReportParameter {
  id?: string;
  reportId?: string;
  name: string;
  displayName: string;
  parameterType: ParameterType;
  defaultValue?: any;
  selectOptions?: SelectOption[];
  isMandatory: boolean;
  validationRegex?: string;
  queryForOptions?: string;
  dependsOn?: string;
  orderPosition: number;
  description?: string;
}

/**
 * Select option for parameters
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Report column interface
 */
export interface ReportColumn {
  id?: string;
  reportId?: string;
  name: string;
  displayName: string;
  dataType: string;
  isVisible: boolean;
  isSortable: boolean;
  isFilterable: boolean;
  isGroupable: boolean;
  isAggregatable: boolean;
  aggregationMethod?: AggregationMethod;
  formatFunction?: string;
  orderPosition: number;
  defaultSortDirection?: SortDirection;
  defaultIsSort?: boolean;
  defaultSortOrder?: number;
  columnWidth?: number;
  columnFunction?: string;
}

/**
 * Query definition for constructing complex reports
 */
export interface QueryDefinition {
  mainTable: string;
  joins?: JoinDefinition[];
  columns: QueryColumn[];
  filters?: FilterGroup;
  groupBy?: string[];
  havingFilters?: FilterGroup;
  orderBy?: OrderByDefinition[];
  limit?: number;
  offset?: number;
}

/**
 * Join definition for query
 */
export interface JoinDefinition {
  table: string;
  alias?: string;
  type: 'inner' | 'left' | 'right' | 'full';
  on: string;
}

/**
 * Query column definition
 */
export interface QueryColumn {
  expression: string;
  alias: string;
  aggregation?: AggregationMethod;
}

/**
 * Filter group (for WHERE and HAVING clauses)
 */
export interface FilterGroup {
  operator: 'AND' | 'OR';
  filters: (Filter | FilterGroup)[];
}

/**
 * Individual filter condition
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value?: any;
  parameterName?: string;
}

/**
 * Filter operators
 */
export type FilterOperator = 
  | '=' | '!=' | '>' | '>=' | '<' | '<=' 
  | 'in' | 'not in' | 'like' | 'not like'
  | 'is null' | 'is not null' | 'between';

/**
 * Order by definition
 */
export interface OrderByDefinition {
  field: string;
  direction: SortDirection;
}

/**
 * Report execution request
 */
export interface ReportExecutionRequest {
  reportId: string;
  parameters: { [key: string]: any };
  format?: ReportFormat;
  pagination?: {
    pageSize: number;
    pageNumber: number;
  };
  sorting?: {
    field: string;
    direction: SortDirection;
  }[];
  filters?: {
    field: string;
    operator: FilterOperator;
    value: any;
  }[];
}

/**
 * Report execution result
 */
export interface ReportExecutionResult {
  reportId: string;
  reportName: string;
  executionDate: Date;
  parameters: { [key: string]: any };
  columns: ReportColumnMetadata[];
  data: any[];
  totals?: { [key: string]: any };
  paging?: {
    pageSize: number;
    pageNumber: number;
    totalRecords: number;
    totalPages: number;
  };
  executionTimeMs: number;
}

/**
 * Column metadata in results
 */
export interface ReportColumnMetadata {
  name: string;
  displayName: string;
  dataType: string;
  isVisible: boolean;
}

/**
 * Scheduled report configuration
 */
export interface ScheduledReport {
  id?: string;
  reportId: string;
  name: string;
  description?: string;
  frequency: ReportFrequency;
  parameters: { [key: string]: any };
  format: ReportFormat;
  recipientEmails?: string[];
  startDate: Date;
  endDate?: Date;
  lastRunDate?: Date;
  nextRunDate?: Date;
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Report execution history
 */
export interface ReportExecutionHistory {
  id?: string;
  reportId: string;
  scheduledReportId?: string;
  executionDate: Date;
  parameters: { [key: string]: any };
  format: ReportFormat;
  status: 'success' | 'failed';
  errorMessage?: string;
  executionTimeMs: number;
  resultFileId?: string;
  executedBy?: string;
}

/**
 * Report types for built-in reports
 */
export enum ReportType {
  // Portfolio reports
  PORTFOLIO_AT_RISK = 'portfolio_at_risk',
  AGE_OUTSTANDING_REPORT = 'age_outstanding',
  COLLECTION_REPORT = 'collection_report',
  OVERDUE_AGING_REPORT = 'overdue_aging',
  LOAN_PORTFOLIO_SUMMARY = 'loan_portfolio_summary',
  PORTFOLIO_QUALITY_REPORT = 'portfolio_quality',
  PAR_REPORT = 'par_report',
  COLLECTIONS_DUE_REPORT = 'collections_due',
  EXPECTED_REPAYMENTS = 'expected_repayments',
  ACTUAL_REPAYMENTS = 'actual_repayments',
  LOAN_CLOSING_REPORT = 'loan_closing',
  REJECTED_LOAN_REPORT = 'rejected_loans',
  
  // Financial reports
  INCOME_STATEMENT = 'income_statement',
  BALANCE_SHEET = 'balance_sheet',
  CASH_FLOW_STATEMENT = 'cash_flow_statement',
  INTEREST_INCOME_REPORT = 'interest_income',
  FEE_INCOME_REPORT = 'fee_income',
  PENALTY_INCOME_REPORT = 'penalty_income',
  ACCOUNTING_JOURNAL = 'accounting_journal',
  GENERAL_LEDGER = 'general_ledger',
  TRIAL_BALANCE = 'trial_balance',
  
  // Client reports
  CLIENT_LISTING = 'client_listing',
  CLIENT_LOAN_HISTORY = 'client_loan_history',
  CLIENT_SAVINGS_HISTORY = 'client_savings_history',
  CLIENT_SUMMARY = 'client_summary',
  CLIENT_TRANSACTION_HISTORY = 'client_transaction_history',
  
  // Staff/operational reports
  STAFF_PERFORMANCE = 'staff_performance',
  LOAN_OFFICER_REPORT = 'loan_officer_report',
  USER_ACTIVITY_REPORT = 'user_activity',
  AUDIT_TRAIL_REPORT = 'audit_trail',
  SYSTEM_USAGE_REPORT = 'system_usage'
}

/**
 * Error types for reporting
 */
export class ReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportError';
  }
}

export class ReportNotFoundError extends ReportError {
  constructor(reportId: string) {
    super(`Report not found with id: ${reportId}`);
    this.name = 'ReportNotFoundError';
  }
}

export class InvalidReportParameterError extends ReportError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReportParameterError';
  }
}

export class ReportExecutionError extends ReportError {
  constructor(message: string) {
    super(message);
    this.name = 'ReportExecutionError';
  }
}

export class ReportExportError extends ReportError {
  constructor(message: string) {
    super(message);
    this.name = 'ReportExportError';
  }
}