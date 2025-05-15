/**
 * Models for custom reporting and data visualization
 */

/**
 * Data types for report fields
 */
export enum DataType {
  STRING = 'string',
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  JSON = 'json',
  ARRAY = 'array'
}

/**
 * Parameter types for custom reports
 */
export enum ParameterType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  OFFICE = 'office',
  BRANCH = 'branch',
  STAFF = 'staff',
  CLIENT = 'client',
  GROUP = 'group',
  PRODUCT = 'product',
  LOAN_PRODUCT = 'loan_product',
  SAVINGS_PRODUCT = 'savings_product'
}

/**
 * Component types for visualization
 */
export enum VisualizationType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  DONUT = 'donut',
  AREA = 'area',
  SCATTER = 'scatter',
  BUBBLE = 'bubble',
  RADAR = 'radar',
  POLAR = 'polar',
  TABLE = 'table',
  CARD = 'card',
  GAUGE = 'gauge',
  HEATMAP = 'heatmap',
  TREEMAP = 'treemap',
  FUNNEL = 'funnel',
  SANKEY = 'sankey',
  WORDCLOUD = 'wordcloud'
}

/**
 * Data source types for visualizations
 */
export enum DataSourceType {
  REPORT = 'report', // Standard report
  CUSTOM_REPORT = 'custom_report', // Custom report
  QUERY = 'query', // Direct SQL query
  API = 'api', // External API
  STATIC = 'static' // Static data
}

/**
 * Export formats
 */
export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html',
  IMAGE = 'image'
}

/**
 * Refresh frequencies for data marts
 */
export enum RefreshFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

/**
 * Schedule frequencies for dashboards and reports
 */
export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

/**
 * Status types for executions
 */
export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RUNNING = 'running',
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled'
}

/**
 * Data Mart status
 */
export enum DataMartStatus {
  PENDING = 'pending',
  READY = 'ready',
  FAILED = 'failed',
  REFRESHING = 'refreshing'
}

/**
 * Custom report template interface
 */
export interface CustomReportTemplate {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  dataSources: DataSource[];
  reportConfig: ReportConfig;
  isTemplate: boolean;
  isPublic: boolean;
  parentTemplateId?: string;
  ownerId?: string;
  createdDate?: Date;
  updatedDate?: Date;
  parameters?: CustomReportParameter[];
}

/**
 * Data source definition
 */
export interface DataSource {
  type: string; // table, view, datamart
  name: string;
  alias?: string;
}

/**
 * Report configuration
 */
export interface ReportConfig {
  columns: ColumnConfig[];
  joins?: JoinConfig[];
  groupBy?: GroupByConfig[];
  havingConditions?: ConditionGroup;
  orderBy?: OrderByConfig[];
  filters?: ConditionGroup;
  aggregations?: AggregationConfig[];
  pagination?: PaginationConfig;
}

/**
 * Column configuration
 */
export interface ColumnConfig {
  name: string;
  displayName: string;
  dataType: DataType;
  source: string; // table/view name or alias
  expression?: string; // Custom expression if not a simple column
  isVisible: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  isGroupable: boolean;
  isAggregatable: boolean;
  format?: FormatConfig;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  conditionalStyles?: ConditionalStyle[];
}

/**
 * Join configuration
 */
export interface JoinConfig {
  leftSource: string;
  leftColumn: string;
  rightSource: string;
  rightColumn: string;
  type: 'inner' | 'left' | 'right' | 'full';
  additionalCondition?: string;
}

/**
 * Group by configuration
 */
export interface GroupByConfig {
  column: string;
  rollup?: boolean;
}

/**
 * Order by configuration
 */
export interface OrderByConfig {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Condition group for filters and having clauses
 */
export interface ConditionGroup {
  operator: 'and' | 'or';
  conditions: (Condition | ConditionGroup)[];
}

/**
 * Single condition
 */
export interface Condition {
  column: string;
  operator: 
    | '=' | '!=' | '>' | '>=' | '<' | '<=' 
    | 'like' | 'not like' | 'in' | 'not in' 
    | 'is null' | 'is not null' | 'between';
  value?: any;
  parameterRef?: string; // Reference to a parameter
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  column: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct';
  alias: string;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  defaultPageSize: number;
  pageSizeOptions: number[];
}

/**
 * Format configuration for display
 */
export interface FormatConfig {
  type: 
    | 'number' | 'currency' | 'percent' 
    | 'date' | 'datetime' | 'boolean';
  options?: {
    locale?: string;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
    dateFormat?: string;
    timeFormat?: string;
    timezone?: string;
    trueLabel?: string;
    falseLabel?: string;
  };
}

/**
 * Conditional styling rule
 */
export interface ConditionalStyle {
  condition: {
    operator: 
      | '=' | '!=' | '>' | '>=' | '<' | '<=' 
      | 'contains' | 'starts_with' | 'ends_with' 
      | 'is empty' | 'is not empty' | 'between';
    value?: any;
    thresholds?: {
      warning?: number;
      danger?: number;
      success?: number;
    };
  };
  style: {
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    icon?: string;
  };
}

/**
 * Custom report parameter
 */
export interface CustomReportParameter {
  id?: string;
  reportId?: string;
  name: string;
  displayName: string;
  parameterType: ParameterType;
  defaultValue?: any;
  options?: SelectOption[];
  isRequired: boolean;
  validationRules?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customValidator?: string;
  };
  helpText?: string;
  orderPosition: number;
}

/**
 * Select option for parameters
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Saved query for a custom report
 */
export interface CustomReportSavedQuery {
  id?: string;
  reportId: string;
  name: string;
  description?: string;
  parameters: { [key: string]: any };
  filters?: any;
  ownerId?: string;
  createdDate?: Date;
  updatedDate?: Date;
}

/**
 * Custom report execution record
 */
export interface CustomReportExecution {
  id?: string;
  reportId: string;
  savedQueryId?: string;
  executionDate: Date;
  parameters: { [key: string]: any };
  filters?: any;
  sorting?: any;
  executionTimeMs: number;
  rowCount: number;
  resultMetadata?: any;
  status: ExecutionStatus;
  errorMessage?: string;
  ownerId: string;
}

/**
 * Visualization component
 */
export interface VisualizationComponent {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  componentType: VisualizationType;
  configuration: VisualizationConfig;
  dataSource: VisualizationDataSource;
  isTemplate: boolean;
  parentComponentId?: string;
  isPublic: boolean;
  ownerId?: string;
  createdDate?: Date;
  updatedDate?: Date;
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  general?: {
    title?: string;
    subtitle?: string;
    description?: string;
    backgroundColor?: string;
    borderRadius?: number;
    showBorder?: boolean;
    borderColor?: string;
    padding?: { top?: number; right?: number; bottom?: number; left?: number };
  };
  chart?: {
    colorScheme?: string;
    customColors?: string[];
    showLegend?: boolean;
    legendPosition?: 'top' | 'right' | 'bottom' | 'left';
    showDataLabels?: boolean;
    dataLabelsFormat?: string;
    thresholds?: {
      warning?: number;
      danger?: number;
      success?: number;
    };
    yAxis?: {
      title?: string;
      min?: number;
      max?: number;
      format?: string;
      showGridLines?: boolean;
    };
    xAxis?: {
      title?: string;
      format?: string;
      showGridLines?: boolean;
      angle?: number;
    };
    animation?: {
      enabled?: boolean;
      duration?: number;
      easing?: string;
    };
    tooltip?: {
      enabled?: boolean;
      format?: string;
      customContent?: string;
    };
    drill?: {
      enabled?: boolean;
      targetReportId?: string;
      parameterMapping?: { [key: string]: string };
    };
  };
  table?: {
    showHeader?: boolean;
    striped?: boolean;
    bordered?: boolean;
    compact?: boolean;
    pagination?: boolean;
    sorting?: boolean;
    filtering?: boolean;
    rowsPerPageOptions?: number[];
    defaultPageSize?: number;
    highlightRules?: {
      column: string;
      condition: string;
      value: any;
      backgroundColor?: string;
      textColor?: string;
    }[];
  };
  card?: {
    icon?: string;
    iconColor?: string;
    valueSize?: number;
    showTrend?: boolean;
    trendCompareField?: string;
    positiveIsBetter?: boolean;
    formatOptions?: FormatConfig;
  };
  gauge?: {
    min: number;
    max: number;
    colorStops?: { value: number; color: string }[];
    showValue?: boolean;
    format?: string;
    arcWidth?: number;
  };
}

/**
 * Visualization data source
 */
export interface VisualizationDataSource {
  type: DataSourceType;
  reportId?: string;
  customReportId?: string;
  query?: string;
  apiUrl?: string;
  staticData?: any[];
  mapping: {
    // Different fields depending on chart type
    labels?: string;
    values?: string | string[];
    series?: string | string[];
    x?: string;
    y?: string | string[];
    size?: string;
    color?: string;
    category?: string;
    tooltipFields?: string[];
    value?: string; // For gauge, card
    trend?: string; // For trend indicators
    columns?: { field: string; title: string; format?: string }[]; // For tables
  };
  parameters?: { [key: string]: any };
  filters?: any;
}

/**
 * Dashboard
 */
export interface Dashboard {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  layoutConfig: DashboardLayoutConfig;
  isSystem: boolean;
  isPublic: boolean;
  isDefault: boolean;
  ownerId?: string;
  createdDate?: Date;
  updatedDate?: Date;
  panels?: DashboardPanel[];
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayoutConfig {
  layoutType: 'grid' | 'free' | 'fixed';
  columns?: number;
  rowHeight?: number;
  backgroundColor?: string;
  margin?: { x: number; y: number };
  autoHeight?: boolean;
  maxHeight?: number;
  responsive?: boolean;
  breakpoints?: {
    xs?: { cols: number; rowHeight: number };
    sm?: { cols: number; rowHeight: number };
    md?: { cols: number; rowHeight: number };
    lg?: { cols: number; rowHeight: number };
    xl?: { cols: number; rowHeight: number };
  };
}

/**
 * Dashboard panel
 */
export interface DashboardPanel {
  id?: string;
  dashboardId: string;
  visualizationId: string;
  visualization?: VisualizationComponent;
  panelTitle?: string;
  panelDescription?: string;
  positionConfig: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
  };
  panelConfig?: {
    showTitle?: boolean;
    showBorder?: boolean;
    borderColor?: string;
    backgroundColor?: string;
    refreshInterval?: number;
    collapsible?: boolean;
    collapsed?: boolean;
    showRefreshButton?: boolean;
    showFullscreenButton?: boolean;
    showSettingsButton?: boolean;
    showExportButton?: boolean;
  };
  createdDate?: Date;
  updatedDate?: Date;
}

/**
 * User dashboard preference
 */
export interface UserDashboardPreference {
  id?: string;
  userId: string;
  dashboardId: string;
  dashboard?: Dashboard;
  isFavorite: boolean;
  isDefault: boolean;
  displayOrder?: number;
  customSettings?: {
    themeOverride?: string;
    showWelcomeMessage?: boolean;
    notificationSettings?: {
      showAlerts?: boolean;
      emailDigest?: boolean;
      emailDigestFrequency?: string;
    };
  };
  createdDate?: Date;
  updatedDate?: Date;
}

/**
 * Scheduled dashboard
 */
export interface ScheduledDashboard {
  id?: string;
  dashboardId: string;
  dashboard?: Dashboard;
  name: string;
  frequency: ScheduleFrequency;
  scheduleConfig: {
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    hour?: number; // 0-23
    minute?: number; // 0-59
    cronExpression?: string; // For custom schedules
    timeZone?: string;
  };
  format: ExportFormat;
  recipientEmails: string[];
  isActive: boolean;
  lastRunDate?: Date;
  nextRunDate?: Date;
  ownerId: string;
  createdDate?: Date;
  updatedDate?: Date;
}

/**
 * Data mart
 */
export interface DataMart {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  sourceQuery: string;
  refreshFrequency: RefreshFrequency;
  refreshConfig?: {
    startTime?: string;
    endTime?: string;
    dayOfWeek?: number[];
    preserveHistory?: boolean;
    historyRetentionPeriod?: number;
    cronExpression?: string;
  };
  lastRefreshDate?: Date;
  nextRefreshDate?: Date;
  rowCount?: number;
  status: DataMartStatus;
  isActive: boolean;
  createdDate?: Date;
  updatedDate?: Date;
}

/**
 * Chart data for rendering
 */
export interface ChartData {
  type: string;
  data: any;
  options: any;
  width?: number;
  height?: number;
}

/**
 * Dashboard panel with data
 */
export interface DashboardPanelData {
  panel: DashboardPanel;
  chartData?: ChartData;
}

/**
 * Error classes for custom reporting
 */
export class CustomReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomReportError';
  }
}

export class CustomReportValidationError extends CustomReportError {
  constructor(message: string) {
    super(message);
    this.name = 'CustomReportValidationError';
  }
}

export class CustomReportExecutionError extends CustomReportError {
  constructor(message: string) {
    super(message);
    this.name = 'CustomReportExecutionError';
  }
}

export class VisualizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VisualizationError';
  }
}

export class DashboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DashboardError';
  }
}

export class DataMartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataMartError';
  }
}