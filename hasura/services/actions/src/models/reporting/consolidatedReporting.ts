/**
 * Consolidated reporting models for cross-module reporting capabilities
 */

import { ReportFormat } from './report';

/**
 * Supported module types for data sources
 */
export enum ModuleType {
  LOAN = 'loan',
  CLIENT = 'client',
  SAVINGS = 'savings',
  ACCOUNTING = 'accounting',
  GROUP = 'group',
  STAFF = 'staff',
  PRODUCT = 'product',
  FUND = 'fund',
  INVESTOR = 'investor',
  CUSTOM = 'custom'
}

/**
 * Data source status
 */
export enum DataSourceStatus {
  READY = 'ready',
  PENDING = 'pending',
  SYNCING = 'syncing',
  ERROR = 'error',
  INACTIVE = 'inactive'
}

/**
 * Report refresh frequency
 */
export enum RefreshFrequency {
  REALTIME = 'realtime',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  ON_DEMAND = 'on_demand'
}

/**
 * Insight types for analytics
 */
export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  OPPORTUNITY = 'opportunity',
  RISK = 'risk',
  CORRELATION = 'correlation',
  PERFORMANCE = 'performance',
  FORECAST = 'forecast'
}

/**
 * Metric trend direction
 */
export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

/**
 * Data source definition
 */
export interface DataSource {
  id?: string;
  name: string;
  moduleType: ModuleType;
  connectionDetails?: object;
  isActive: boolean;
  lastSyncTime?: Date;
  recordCount?: number;
  syncStatus: DataSourceStatus;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Consolidated report definition
 */
export interface ConsolidatedReportDefinition {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  reportType: string;
  modules: ModuleConfig[];
  queryDefinition?: QueryDefinition;
  parametersSchema?: ParameterSchema[];
  outputFormat: ReportFormat;
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Module configuration for consolidated report
 */
export interface ModuleConfig {
  moduleType: ModuleType;
  entities?: string[];
  fields?: string[];
  filters?: FilterConfig[];
  joins?: JoinConfig[];
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: string;
  value?: any;
  parameterRef?: string;
}

/**
 * Join configuration for cross-module relationships
 */
export interface JoinConfig {
  sourceModule: ModuleType;
  targetModule: ModuleType;
  sourceKey: string;
  targetKey: string;
  joinType: 'inner' | 'left' | 'right';
}

/**
 * Query definition
 */
export interface QueryDefinition {
  graphQLQuery?: string;
  sqlQuery?: string;
  restEndpoints?: RestEndpointConfig[];
  transformations?: TransformationConfig[];
}

/**
 * REST endpoint configuration
 */
export interface RestEndpointConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: object;
  resultPath?: string;
}

/**
 * Data transformation configuration
 */
export interface TransformationConfig {
  type: 'filter' | 'map' | 'reduce' | 'group' | 'sort' | 'aggregate' | 'join';
  config: object;
}

/**
 * Parameter schema
 */
export interface ParameterSchema {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'dateRange' | 'select' | 'multiSelect';
  required: boolean;
  defaultValue?: any;
  options?: ParameterOption[];
  validation?: object;
}

/**
 * Parameter option
 */
export interface ParameterOption {
  value: string;
  label: string;
}

/**
 * Cross-module metric definition
 */
export interface CrossModuleMetricDefinition {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  metricType: string;
  calculationLogic?: string;
  queryDefinition?: QueryDefinition;
  dataSources: ModuleType[];
  refreshFrequency: RefreshFrequency;
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Consolidated report execution
 */
export interface ConsolidatedReportExecution {
  id?: string;
  reportId: string;
  executionDate: Date;
  parameters?: Record<string, any>;
  filters?: Record<string, any>;
  outputFormat: ReportFormat;
  status: 'success' | 'failed';
  errorMessage?: string;
  executionTimeMs: number;
  resultData: object;
  resultMetadata?: object;
  executedBy?: string;
}

/**
 * Cross-module dashboard definition
 */
export interface CrossModuleDashboard {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  layoutConfig?: object;
  metrics: DashboardMetricConfig[];
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Dashboard metric configuration
 */
export interface DashboardMetricConfig {
  metricId: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  visualizationType?: string;
  visualizationConfig?: object;
}

/**
 * Cross-module dashboard execution
 */
export interface DashboardExecution {
  id?: string;
  dashboardId: string;
  executionDate: Date;
  parameters?: Record<string, any>;
  filters?: Record<string, any>;
  status: 'success' | 'failed';
  errorMessage?: string;
  executionTimeMs: number;
  metricsData: object;
  visualizationData: object;
  executedBy?: string;
}

/**
 * Analytics insight
 */
export interface AnalyticsInsight {
  id?: string;
  title: string;
  description: string;
  insightType: InsightType;
  relevanceScore: number;
  metrics: any[];
  dataSources: ModuleType[];
  isAcknowledged: boolean;
  createdDate: Date;
  acknowledgedBy?: string;
  acknowledgedDate?: Date;
}

/**
 * Consolidated report request
 */
export interface ConsolidatedReportRequest {
  name: string;
  description?: string;
  reportType: string;
  modules: string[];
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  format: ReportFormat;
  includeMetadata?: boolean;
  userId?: string;
}

/**
 * Consolidated report response
 */
export interface ConsolidatedReportResponse {
  success: boolean;
  report?: {
    id: string;
    name: string;
    description?: string;
    reportType: string;
    generatedOn: string;
    data: any;
    metadata?: any;
    format: string;
  };
  message?: string;
}

/**
 * Cross-module dashboard request
 */
export interface CrossModuleDashboardRequest {
  name: string;
  description?: string;
  modules: string[];
  metrics: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  userId?: string;
}

/**
 * Cross-module dashboard response
 */
export interface CrossModuleDashboardResponse {
  success: boolean;
  dashboard?: {
    id: string;
    name: string;
    description?: string;
    generatedOn: string;
    metrics: {
      id: string;
      name: string;
      value: number;
      previousValue?: number;
      changePercentage?: number;
      trend?: TrendDirection;
      category: string;
      subCategory?: string;
      metadata?: any;
    }[];
    dataSources: {
      id: string;
      name: string;
      moduleType: string;
      status: string;
      lastSyncTime?: string;
      recordCount?: number;
    }[];
    visualizationData: any;
  };
  message?: string;
}

/**
 * Data source sync request
 */
export interface DataSourceSyncRequest {
  moduleTypes: string[];
  fullSync?: boolean;
  userId?: string;
}

/**
 * Data source sync response
 */
export interface DataSourceSyncResponse {
  success: boolean;
  dataSources?: {
    id: string;
    name: string;
    moduleType: string;
    status: string;
    lastSyncTime?: string;
    recordCount?: number;
  }[];
  message?: string;
}

/**
 * Analytics insights request
 */
export interface AnalyticsInsightsRequest {
  modules: string[];
  insightTypes?: string[];
  limit?: number;
  minRelevanceScore?: number;
  userId?: string;
}

/**
 * Analytics insights response
 */
export interface AnalyticsInsightsResponse {
  success: boolean;
  insights?: {
    id: string;
    title: string;
    description: string;
    insightType: string;
    relevanceScore: number;
    metrics: {
      id: string;
      name: string;
      value: number;
      previousValue?: number;
      changePercentage?: number;
      trend?: string;
      category: string;
      subCategory?: string;
      metadata?: any;
    }[];
    generatedOn: string;
    metadata?: any;
  }[];
  message?: string;
}

/**
 * Error classes for consolidated reporting
 */
export class ConsolidatedReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsolidatedReportError';
  }
}

export class DataSourceError extends ConsolidatedReportError {
  constructor(message: string) {
    super(message);
    this.name = 'DataSourceError';
  }
}

export class MetricCalculationError extends ConsolidatedReportError {
  constructor(message: string) {
    super(message);
    this.name = 'MetricCalculationError';
  }
}

export class ReportGenerationError extends ConsolidatedReportError {
  constructor(message: string) {
    super(message);
    this.name = 'ReportGenerationError';
  }
}

export class DashboardError extends ConsolidatedReportError {
  constructor(message: string) {
    super(message);
    this.name = 'DashboardError';
  }
}

export class InsightGenerationError extends ConsolidatedReportError {
  constructor(message: string) {
    super(message);
    this.name = 'InsightGenerationError';
  }
}