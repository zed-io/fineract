"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestCalculationType = exports.InterestPostingPeriodType = exports.InterestCompoundingPeriodType = exports.SavingsTransactionType = exports.SavingsAccountSubStatus = exports.SavingsAccountStatus = void 0;
/**
 * Savings account status enums
 */
var SavingsAccountStatus;
(function (SavingsAccountStatus) {
    SavingsAccountStatus["SUBMITTED_AND_PENDING_APPROVAL"] = "submitted_and_pending_approval";
    SavingsAccountStatus["APPROVED"] = "approved";
    SavingsAccountStatus["ACTIVE"] = "active";
    SavingsAccountStatus["CLOSED"] = "closed";
    SavingsAccountStatus["REJECTED"] = "rejected";
    SavingsAccountStatus["WITHDRAWN_BY_CLIENT"] = "withdrawn_by_client";
    SavingsAccountStatus["DORMANT"] = "dormant";
    SavingsAccountStatus["ESCHEAT"] = "escheat";
})(SavingsAccountStatus || (exports.SavingsAccountStatus = SavingsAccountStatus = {}));
/**
 * Savings account sub-status enums
 */
var SavingsAccountSubStatus;
(function (SavingsAccountSubStatus) {
    SavingsAccountSubStatus["NONE"] = "none";
    SavingsAccountSubStatus["INACTIVE"] = "inactive";
    SavingsAccountSubStatus["DORMANT"] = "dormant";
    SavingsAccountSubStatus["ESCHEAT"] = "escheat";
    SavingsAccountSubStatus["BLOCK"] = "block";
    SavingsAccountSubStatus["BLOCK_CREDIT"] = "block_credit";
    SavingsAccountSubStatus["BLOCK_DEBIT"] = "block_debit";
})(SavingsAccountSubStatus || (exports.SavingsAccountSubStatus = SavingsAccountSubStatus = {}));
/**
 * Transaction type enums
 */
var SavingsTransactionType;
(function (SavingsTransactionType) {
    SavingsTransactionType["DEPOSIT"] = "deposit";
    SavingsTransactionType["WITHDRAWAL"] = "withdrawal";
    SavingsTransactionType["INTEREST_POSTING"] = "interest_posting";
    SavingsTransactionType["FEE_CHARGE"] = "fee_charge";
    SavingsTransactionType["PENALTY_CHARGE"] = "penalty_charge";
    SavingsTransactionType["WITHDRAWAL_FEE"] = "withdrawal_fee";
    SavingsTransactionType["ANNUAL_FEE"] = "annual_fee";
    SavingsTransactionType["WAIVE_CHARGES"] = "waive_charges";
    SavingsTransactionType["PAY_CHARGE"] = "pay_charge";
    SavingsTransactionType["DIVIDEND_PAYOUT"] = "dividend_payout";
})(SavingsTransactionType || (exports.SavingsTransactionType = SavingsTransactionType = {}));
/**
 * Interest compounding period types
 */
var InterestCompoundingPeriodType;
(function (InterestCompoundingPeriodType) {
    InterestCompoundingPeriodType["DAILY"] = "daily";
    InterestCompoundingPeriodType["MONTHLY"] = "monthly";
    InterestCompoundingPeriodType["QUARTERLY"] = "quarterly";
    InterestCompoundingPeriodType["SEMI_ANNUAL"] = "semi_annual";
    InterestCompoundingPeriodType["ANNUAL"] = "annual";
})(InterestCompoundingPeriodType || (exports.InterestCompoundingPeriodType = InterestCompoundingPeriodType = {}));
/**
 * Interest posting period types
 */
var InterestPostingPeriodType;
(function (InterestPostingPeriodType) {
    InterestPostingPeriodType["MONTHLY"] = "monthly";
    InterestPostingPeriodType["QUARTERLY"] = "quarterly";
    InterestPostingPeriodType["BIANNUAL"] = "biannual";
    InterestPostingPeriodType["ANNUAL"] = "annual";
})(InterestPostingPeriodType || (exports.InterestPostingPeriodType = InterestPostingPeriodType = {}));
/**
 * Interest calculation types
 */
var InterestCalculationType;
(function (InterestCalculationType) {
    InterestCalculationType["DAILY_BALANCE"] = "daily_balance";
    InterestCalculationType["AVERAGE_DAILY_BALANCE"] = "average_daily_balance";
})(InterestCalculationType || (exports.InterestCalculationType = InterestCalculationType = {}));
