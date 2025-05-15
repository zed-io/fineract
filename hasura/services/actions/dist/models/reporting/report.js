"use strict";
/**
 * Core reporting models for Fineract
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportExportError = exports.ReportExecutionError = exports.InvalidReportParameterError = exports.ReportNotFoundError = exports.ReportError = exports.ReportType = exports.SortDirection = exports.AggregationMethod = exports.ParameterType = exports.ReportFrequency = exports.ReportCategory = exports.ReportFormat = void 0;
/**
 * Report format types for export
 */
var ReportFormat;
(function (ReportFormat) {
    ReportFormat["PDF"] = "pdf";
    ReportFormat["EXCEL"] = "excel";
    ReportFormat["CSV"] = "csv";
    ReportFormat["HTML"] = "html";
    ReportFormat["JSON"] = "json";
})(ReportFormat || (exports.ReportFormat = ReportFormat = {}));
/**
 * Report category enum
 */
var ReportCategory;
(function (ReportCategory) {
    ReportCategory["CLIENT"] = "client";
    ReportCategory["LOAN"] = "loan";
    ReportCategory["SAVINGS"] = "savings";
    ReportCategory["FUND"] = "fund";
    ReportCategory["ACCOUNTING"] = "accounting";
    ReportCategory["STAFF"] = "staff";
    ReportCategory["PORTFOLIO"] = "portfolio";
    ReportCategory["FINANCIAL"] = "financial";
    ReportCategory["OPERATIONAL"] = "operational";
    ReportCategory["SOCIAL"] = "social";
    ReportCategory["CUSTOM"] = "custom";
})(ReportCategory || (exports.ReportCategory = ReportCategory = {}));
/**
 * Report frequency for scheduled reports
 */
var ReportFrequency;
(function (ReportFrequency) {
    ReportFrequency["DAILY"] = "daily";
    ReportFrequency["WEEKLY"] = "weekly";
    ReportFrequency["BIWEEKLY"] = "biweekly";
    ReportFrequency["MONTHLY"] = "monthly";
    ReportFrequency["QUARTERLY"] = "quarterly";
    ReportFrequency["YEARLY"] = "yearly";
    ReportFrequency["CUSTOM"] = "custom";
})(ReportFrequency || (exports.ReportFrequency = ReportFrequency = {}));
/**
 * Parameter type for reports
 */
var ParameterType;
(function (ParameterType) {
    ParameterType["STRING"] = "string";
    ParameterType["NUMBER"] = "number";
    ParameterType["BOOLEAN"] = "boolean";
    ParameterType["DATE"] = "date";
    ParameterType["DATE_RANGE"] = "date_range";
    ParameterType["SELECT"] = "select";
    ParameterType["MULTI_SELECT"] = "multi_select";
    ParameterType["CLIENT"] = "client";
    ParameterType["CLIENT_GROUP"] = "client_group";
    ParameterType["STAFF"] = "staff";
    ParameterType["OFFICE"] = "office";
    ParameterType["LOAN_PRODUCT"] = "loan_product";
    ParameterType["SAVINGS_PRODUCT"] = "savings_product";
    ParameterType["CURRENCY"] = "currency";
})(ParameterType || (exports.ParameterType = ParameterType = {}));
/**
 * Data aggregation method
 */
var AggregationMethod;
(function (AggregationMethod) {
    AggregationMethod["SUM"] = "sum";
    AggregationMethod["AVG"] = "avg";
    AggregationMethod["MIN"] = "min";
    AggregationMethod["MAX"] = "max";
    AggregationMethod["COUNT"] = "count";
    AggregationMethod["COUNT_DISTINCT"] = "count_distinct";
    AggregationMethod["FIRST"] = "first";
    AggregationMethod["LAST"] = "last";
    AggregationMethod["CUSTOM"] = "custom";
})(AggregationMethod || (exports.AggregationMethod = AggregationMethod = {}));
/**
 * Sort direction
 */
var SortDirection;
(function (SortDirection) {
    SortDirection["ASC"] = "asc";
    SortDirection["DESC"] = "desc";
})(SortDirection || (exports.SortDirection = SortDirection = {}));
/**
 * Report types for built-in reports
 */
var ReportType;
(function (ReportType) {
    // Portfolio reports
    ReportType["PORTFOLIO_AT_RISK"] = "portfolio_at_risk";
    ReportType["AGE_OUTSTANDING_REPORT"] = "age_outstanding";
    ReportType["COLLECTION_REPORT"] = "collection_report";
    ReportType["OVERDUE_AGING_REPORT"] = "overdue_aging";
    ReportType["LOAN_PORTFOLIO_SUMMARY"] = "loan_portfolio_summary";
    ReportType["PORTFOLIO_QUALITY_REPORT"] = "portfolio_quality";
    ReportType["PAR_REPORT"] = "par_report";
    ReportType["COLLECTIONS_DUE_REPORT"] = "collections_due";
    ReportType["EXPECTED_REPAYMENTS"] = "expected_repayments";
    ReportType["ACTUAL_REPAYMENTS"] = "actual_repayments";
    ReportType["LOAN_CLOSING_REPORT"] = "loan_closing";
    ReportType["REJECTED_LOAN_REPORT"] = "rejected_loans";
    // Financial reports
    ReportType["INCOME_STATEMENT"] = "income_statement";
    ReportType["BALANCE_SHEET"] = "balance_sheet";
    ReportType["CASH_FLOW_STATEMENT"] = "cash_flow_statement";
    ReportType["INTEREST_INCOME_REPORT"] = "interest_income";
    ReportType["FEE_INCOME_REPORT"] = "fee_income";
    ReportType["PENALTY_INCOME_REPORT"] = "penalty_income";
    ReportType["ACCOUNTING_JOURNAL"] = "accounting_journal";
    ReportType["GENERAL_LEDGER"] = "general_ledger";
    ReportType["TRIAL_BALANCE"] = "trial_balance";
    // Client reports
    ReportType["CLIENT_LISTING"] = "client_listing";
    ReportType["CLIENT_LOAN_HISTORY"] = "client_loan_history";
    ReportType["CLIENT_SAVINGS_HISTORY"] = "client_savings_history";
    ReportType["CLIENT_SUMMARY"] = "client_summary";
    ReportType["CLIENT_TRANSACTION_HISTORY"] = "client_transaction_history";
    // Staff/operational reports
    ReportType["STAFF_PERFORMANCE"] = "staff_performance";
    ReportType["LOAN_OFFICER_REPORT"] = "loan_officer_report";
    ReportType["USER_ACTIVITY_REPORT"] = "user_activity";
    ReportType["AUDIT_TRAIL_REPORT"] = "audit_trail";
    ReportType["SYSTEM_USAGE_REPORT"] = "system_usage";
})(ReportType || (exports.ReportType = ReportType = {}));
/**
 * Error types for reporting
 */
class ReportError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReportError';
    }
}
exports.ReportError = ReportError;
class ReportNotFoundError extends ReportError {
    constructor(reportId) {
        super(`Report not found with id: ${reportId}`);
        this.name = 'ReportNotFoundError';
    }
}
exports.ReportNotFoundError = ReportNotFoundError;
class InvalidReportParameterError extends ReportError {
    constructor(message) {
        super(message);
        this.name = 'InvalidReportParameterError';
    }
}
exports.InvalidReportParameterError = InvalidReportParameterError;
class ReportExecutionError extends ReportError {
    constructor(message) {
        super(message);
        this.name = 'ReportExecutionError';
    }
}
exports.ReportExecutionError = ReportExecutionError;
class ReportExportError extends ReportError {
    constructor(message) {
        super(message);
        this.name = 'ReportExportError';
    }
}
exports.ReportExportError = ReportExportError;
