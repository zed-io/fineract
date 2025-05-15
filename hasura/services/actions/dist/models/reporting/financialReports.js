"use strict";
/**
 * Financial Reports Models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountType = exports.FinancialPeriod = exports.FinancialStatementType = void 0;
/**
 * Financial statement type
 */
var FinancialStatementType;
(function (FinancialStatementType) {
    FinancialStatementType["INCOME_STATEMENT"] = "income_statement";
    FinancialStatementType["BALANCE_SHEET"] = "balance_sheet";
    FinancialStatementType["CASH_FLOW"] = "cash_flow";
    FinancialStatementType["TRIAL_BALANCE"] = "trial_balance";
})(FinancialStatementType || (exports.FinancialStatementType = FinancialStatementType = {}));
/**
 * Financial statement time period
 */
var FinancialPeriod;
(function (FinancialPeriod) {
    FinancialPeriod["DAILY"] = "daily";
    FinancialPeriod["WEEKLY"] = "weekly";
    FinancialPeriod["MONTHLY"] = "monthly";
    FinancialPeriod["QUARTERLY"] = "quarterly";
    FinancialPeriod["YEARLY"] = "yearly";
    FinancialPeriod["CUSTOM"] = "custom";
})(FinancialPeriod || (exports.FinancialPeriod = FinancialPeriod = {}));
/**
 * Account type
 */
var AccountType;
(function (AccountType) {
    AccountType["ASSET"] = "asset";
    AccountType["LIABILITY"] = "liability";
    AccountType["EQUITY"] = "equity";
    AccountType["INCOME"] = "income";
    AccountType["EXPENSE"] = "expense";
})(AccountType || (exports.AccountType = AccountType = {}));
