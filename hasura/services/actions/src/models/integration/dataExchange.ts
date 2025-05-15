/**
 * Data Exchange models for Fineract (Import/Export)
 */

/**
 * Export format types
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  EXCEL = 'excel',
  PDF = 'pdf'
}

/**
 * Entity types for data exchange
 */
export enum EntityType {
  CLIENT = 'client',
  LOAN = 'loan',
  SAVINGS = 'savings',
  TRANSACTION = 'transaction',
  CHART_OF_ACCOUNTS = 'chart_of_accounts',
  JOURNAL_ENTRY = 'journal_entry',
  USER = 'user',
  ROLE = 'role',
  OFFICE = 'office',
  STAFF = 'staff',
  PRODUCT = 'product',
  CUSTOM = 'custom'
}

/**
 * Export configuration
 */
export interface ExportConfig {
  id?: string;
  name: string;
  description?: string;
  entityType: EntityType | string;
  exportFormat: ExportFormat;
  fieldMapping?: Record<string, string>;
  filterCriteria?: any;
  schedule?: string;
  lastExecutedTime?: Date;
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Import configuration
 */
export interface ImportConfig {
  id?: string;
  name: string;
  description?: string;
  entityType: EntityType | string;
  importFormat: ExportFormat;
  fieldMapping?: Record<string, string>;
  validationRules?: any;
  successHandler?: string;
  errorHandler?: string;
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Export request
 */
export interface ExportRequest {
  configId?: string;  // Use existing config or provide details below
  entityType?: EntityType | string;
  exportFormat?: ExportFormat;
  fieldMapping?: Record<string, string>;
  filterCriteria?: any;
  pageSize?: number;
  pageNumber?: number;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  recordCount: number;
  downloadUrl: string;
  expiresAt: Date;
  executionTimeMs: number;
  message?: string;
}

/**
 * Import request
 */
export interface ImportRequest {
  configId?: string;  // Use existing config or provide details below
  entityType?: EntityType | string;
  importFormat?: ExportFormat;
  fieldMapping?: Record<string, string>;
  validationRules?: any;
  fileContent: string;  // Base64 encoded file content
  fileName: string;
  dryRun?: boolean;  // Validate without saving
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  processingTimeMs: number;
  errors?: ImportError[];
  warnings?: ImportWarning[];
  message?: string;
}

/**
 * Import processing error
 */
export interface ImportError {
  row: number;
  field?: string;
  value?: string;
  errorType: string;
  message: string;
}

/**
 * Import processing warning
 */
export interface ImportWarning {
  row: number;
  field?: string;
  value?: string;
  warningType: string;
  message: string;
}

/**
 * Export config list response
 */
export interface ExportConfigListResponse {
  configs: ExportConfig[];
  total: number;
}

/**
 * Import config list response
 */
export interface ImportConfigListResponse {
  configs: ImportConfig[];
  total: number;
}