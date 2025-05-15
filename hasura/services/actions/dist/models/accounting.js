"use strict";
/**
 * Accounting model interfaces for Fineract
 * Provides type-safe structures for GL accounts, journal entries, and accounting rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialStatementType = exports.SavingsAccountMappingType = exports.LoanAccountMappingType = exports.ProductType = exports.JournalEntryType = exports.AccountUsage = exports.AccountType = void 0;
/**
 * GL Account types
 */
var AccountType;
(function (AccountType) {
    AccountType["ASSET"] = "asset";
    AccountType["LIABILITY"] = "liability";
    AccountType["EQUITY"] = "equity";
    AccountType["INCOME"] = "income";
    AccountType["EXPENSE"] = "expense";
})(AccountType || (exports.AccountType = AccountType = {}));
/**
 * Account usage types
 */
var AccountUsage;
(function (AccountUsage) {
    AccountUsage["DETAIL"] = "detail";
    AccountUsage["HEADER"] = "header";
})(AccountUsage || (exports.AccountUsage = AccountUsage = {}));
/**
 * Journal entry types
 */
var JournalEntryType;
(function (JournalEntryType) {
    JournalEntryType["CREDIT"] = "credit";
    JournalEntryType["DEBIT"] = "debit";
})(JournalEntryType || (exports.JournalEntryType = JournalEntryType = {}));
/**
 * Product type for account mappings
 */
var ProductType;
(function (ProductType) {
    ProductType["LOAN"] = "loan";
    ProductType["SAVINGS"] = "savings";
    ProductType["SHARE"] = "share";
})(ProductType || (exports.ProductType = ProductType = {}));
/**
 * Standard account mapping types for loan products
 */
var LoanAccountMappingType;
(function (LoanAccountMappingType) {
    LoanAccountMappingType["FUND_SOURCE"] = "fund_source";
    LoanAccountMappingType["LOAN_PORTFOLIO"] = "loan_portfolio";
    LoanAccountMappingType["INTEREST_RECEIVABLE"] = "interest_receivable";
    LoanAccountMappingType["INTEREST_INCOME"] = "interest_income";
    LoanAccountMappingType["FEE_INCOME"] = "fee_income";
    LoanAccountMappingType["PENALTY_INCOME"] = "penalty_income";
    LoanAccountMappingType["LOSSES_WRITTEN_OFF"] = "losses_written_off";
    LoanAccountMappingType["OVERPAYMENT"] = "overpayment";
    LoanAccountMappingType["INCOME_FROM_RECOVERY"] = "income_from_recovery";
    LoanAccountMappingType["GOODWILL_CREDIT"] = "goodwill_credit";
    LoanAccountMappingType["INCOME_FROM_CHARGE_OFF"] = "income_from_charge_off";
    LoanAccountMappingType["CHARGE_OFF_EXPENSE"] = "charge_off_expense";
    LoanAccountMappingType["CHARGE_OFF_FRAUD_EXPENSE"] = "charge_off_fraud_expense";
})(LoanAccountMappingType || (exports.LoanAccountMappingType = LoanAccountMappingType = {}));
/**
 * Standard account mapping types for savings products
 */
var SavingsAccountMappingType;
(function (SavingsAccountMappingType) {
    SavingsAccountMappingType["SAVINGS_CONTROL"] = "savings_control";
    SavingsAccountMappingType["SAVINGS_REFERENCE"] = "savings_reference";
    SavingsAccountMappingType["INTEREST_ON_SAVINGS"] = "interest_on_savings";
    SavingsAccountMappingType["FEE_INCOME"] = "fee_income";
    SavingsAccountMappingType["PENALTY_INCOME"] = "penalty_income";
    SavingsAccountMappingType["INCOME_FROM_FEES"] = "income_from_fees";
    SavingsAccountMappingType["OVERDRAFT_PORTFOLIO"] = "overdraft_portfolio";
    SavingsAccountMappingType["INCOME_FROM_INTEREST"] = "income_from_interest";
})(SavingsAccountMappingType || (exports.SavingsAccountMappingType = SavingsAccountMappingType = {}));
/**
 * Financial statement type
 */
var FinancialStatementType;
(function (FinancialStatementType) {
    FinancialStatementType["BALANCE_SHEET"] = "balance_sheet";
    FinancialStatementType["INCOME_STATEMENT"] = "income_statement";
    FinancialStatementType["CASH_FLOW"] = "cash_flow";
})(FinancialStatementType || (exports.FinancialStatementType = FinancialStatementType = {}));
