"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PAYMENT_ALLOCATION_RULES = exports.WriteOffStrategy = exports.DelinquencyClassification = exports.LoanChargeTimeType = exports.LoanChargePaymentMode = exports.LoanChargeCalculationType = exports.RecalculationRestFrequency = exports.RescheduleStrategyMethod = exports.RecalculationCompoundingFrequency = exports.InterestRecalculationCompoundingMethod = exports.LoanRepaymentStrategy = void 0;
/**
 * Loan repayment strategy determines how payments are allocated
 * to outstanding balances
 */
var LoanRepaymentStrategy;
(function (LoanRepaymentStrategy) {
    // Principal, Interest, Penalties, Fees
    LoanRepaymentStrategy["PRINCIPAL_INTEREST_PENALTIES_FEES"] = "principal_interest_penalties_fees";
    // HeavynesS: Principal, Interest, Penalties, Fees
    LoanRepaymentStrategy["HEAVINESS_PRINCIPAL_INTEREST_PENALTIES_FEES"] = "heaviness_principal_interest_penalties_fees";
    // Interest, Principal, Penalties, Fees
    LoanRepaymentStrategy["INTEREST_PRINCIPAL_PENALTIES_FEES"] = "interest_principal_penalties_fees";
    // Principal, Interest, Fees, Penalties
    LoanRepaymentStrategy["PRINCIPAL_INTEREST_FEES_PENALTIES"] = "principal_interest_fees_penalties";
    // Due date: Earliest first
    LoanRepaymentStrategy["DUE_DATE_PRINCIPAL_INTEREST_PENALTIES_FEES"] = "due_date_principal_interest_penalties_fees";
    // Interest, Principal, Fees, Penalties Overdue/Due
    LoanRepaymentStrategy["INTEREST_PRINCIPAL_FEES_PENALTIES_OVERDUE_DUE"] = "interest_principal_fees_penalties_overdue_due";
    // Overdue/Due Interest, Principal, Penalties, Fees
    LoanRepaymentStrategy["OVERDUE_DUE_INTEREST_PRINCIPAL_PENALTIES_FEES"] = "overdue_due_interest_principal_penalties_fees";
})(LoanRepaymentStrategy || (exports.LoanRepaymentStrategy = LoanRepaymentStrategy = {}));
/**
 * Loan interest recalculation options
 */
var InterestRecalculationCompoundingMethod;
(function (InterestRecalculationCompoundingMethod) {
    InterestRecalculationCompoundingMethod["NONE"] = "none";
    InterestRecalculationCompoundingMethod["INTEREST"] = "interest";
    InterestRecalculationCompoundingMethod["FEE"] = "fee";
    InterestRecalculationCompoundingMethod["INTEREST_AND_FEE"] = "interest_and_fee";
})(InterestRecalculationCompoundingMethod || (exports.InterestRecalculationCompoundingMethod = InterestRecalculationCompoundingMethod = {}));
/**
 * Recalculation compounding frequency
 */
var RecalculationCompoundingFrequency;
(function (RecalculationCompoundingFrequency) {
    RecalculationCompoundingFrequency["SAME_AS_REPAYMENT_PERIOD"] = "same_as_repayment_period";
    RecalculationCompoundingFrequency["DAILY"] = "daily";
    RecalculationCompoundingFrequency["WEEKLY"] = "weekly";
    RecalculationCompoundingFrequency["MONTHLY"] = "monthly";
})(RecalculationCompoundingFrequency || (exports.RecalculationCompoundingFrequency = RecalculationCompoundingFrequency = {}));
/**
 * Reschedule strategy options
 */
var RescheduleStrategyMethod;
(function (RescheduleStrategyMethod) {
    RescheduleStrategyMethod["REDUCE_NUMBER_OF_INSTALLMENTS"] = "reduce_number_of_installments";
    RescheduleStrategyMethod["REDUCE_EMI_AMOUNT"] = "reduce_emi_amount";
    RescheduleStrategyMethod["RESCHEDULE_NEXT_REPAYMENTS"] = "reschedule_next_repayments";
})(RescheduleStrategyMethod || (exports.RescheduleStrategyMethod = RescheduleStrategyMethod = {}));
/**
 * Interest recalculation frequency
 */
var RecalculationRestFrequency;
(function (RecalculationRestFrequency) {
    RecalculationRestFrequency["SAME_AS_REPAYMENT_PERIOD"] = "same_as_repayment_period";
    RecalculationRestFrequency["DAILY"] = "daily";
    RecalculationRestFrequency["WEEKLY"] = "weekly";
    RecalculationRestFrequency["MONTHLY"] = "monthly";
})(RecalculationRestFrequency || (exports.RecalculationRestFrequency = RecalculationRestFrequency = {}));
/**
 * Loan charge calculation type
 */
var LoanChargeCalculationType;
(function (LoanChargeCalculationType) {
    LoanChargeCalculationType["FLAT"] = "flat";
    LoanChargeCalculationType["PERCENT_OF_AMOUNT"] = "percent_of_amount";
    LoanChargeCalculationType["PERCENT_OF_AMOUNT_AND_INTEREST"] = "percent_of_amount_and_interest";
    LoanChargeCalculationType["PERCENT_OF_INTEREST"] = "percent_of_interest";
    LoanChargeCalculationType["PERCENT_OF_DISBURSEMENT_AMOUNT"] = "percent_of_disbursement_amount";
    LoanChargeCalculationType["PERCENT_OF_TOTAL_OUTSTANDING"] = "percent_of_total_outstanding";
})(LoanChargeCalculationType || (exports.LoanChargeCalculationType = LoanChargeCalculationType = {}));
/**
 * Loan charge payment mode
 */
var LoanChargePaymentMode;
(function (LoanChargePaymentMode) {
    LoanChargePaymentMode["REGULAR"] = "regular";
    LoanChargePaymentMode["ACCOUNT_TRANSFER"] = "account_transfer";
})(LoanChargePaymentMode || (exports.LoanChargePaymentMode = LoanChargePaymentMode = {}));
/**
 * Loan charge time type
 */
var LoanChargeTimeType;
(function (LoanChargeTimeType) {
    LoanChargeTimeType["DISBURSEMENT"] = "disbursement";
    LoanChargeTimeType["SPECIFIED_DUE_DATE"] = "specified_due_date";
    LoanChargeTimeType["INSTALLMENT_FEE"] = "installment_fee";
    LoanChargeTimeType["OVERDUE_INSTALLMENT"] = "overdue_installment";
    LoanChargeTimeType["OVERDUE_MATURITY"] = "overdue_maturity";
    LoanChargeTimeType["OVERDUE_ON_LOAN_MATURITY"] = "overdue_on_loan_maturity";
    LoanChargeTimeType["TRANCHE_DISBURSEMENT"] = "tranche_disbursement";
})(LoanChargeTimeType || (exports.LoanChargeTimeType = LoanChargeTimeType = {}));
/**
 * Delinquency classification
 */
var DelinquencyClassification;
(function (DelinquencyClassification) {
    DelinquencyClassification["NO_DELINQUENCY"] = "no_delinquency";
    DelinquencyClassification["DELINQUENT_30"] = "delinquent_30";
    DelinquencyClassification["DELINQUENT_60"] = "delinquent_60";
    DelinquencyClassification["DELINQUENT_90"] = "delinquent_90";
    DelinquencyClassification["DELINQUENT_120"] = "delinquent_120";
    DelinquencyClassification["DELINQUENT_150"] = "delinquent_150";
    DelinquencyClassification["DELINQUENT_180"] = "delinquent_180";
})(DelinquencyClassification || (exports.DelinquencyClassification = DelinquencyClassification = {}));
/**
 * Write-off strategy
 */
var WriteOffStrategy;
(function (WriteOffStrategy) {
    WriteOffStrategy["FULL_OUTSTANDING"] = "full_outstanding";
    WriteOffStrategy["PRINCIPAL_ONLY"] = "principal_only";
    WriteOffStrategy["PARTIAL_AMOUNT"] = "partial_amount";
})(WriteOffStrategy || (exports.WriteOffStrategy = WriteOffStrategy = {}));
/**
 * Default payment allocation rules for each repayment strategy
 */
exports.DEFAULT_PAYMENT_ALLOCATION_RULES = {
    [LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES]: {
        strategy: LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES,
        allocationOrder: [
            { componentType: 'principal', order: 1 },
            { componentType: 'interest', order: 2 },
            { componentType: 'penalties', order: 3 },
            { componentType: 'fees', order: 4 },
        ],
        dueDateOrderingFlag: false,
        isDefault: true
    },
    [LoanRepaymentStrategy.HEAVINESS_PRINCIPAL_INTEREST_PENALTIES_FEES]: {
        strategy: LoanRepaymentStrategy.HEAVINESS_PRINCIPAL_INTEREST_PENALTIES_FEES,
        allocationOrder: [
            { componentType: 'principal', order: 1 },
            { componentType: 'interest', order: 2 },
            { componentType: 'penalties', order: 3 },
            { componentType: 'fees', order: 4 },
        ],
        dueDateOrderingFlag: false,
        isDefault: false
    },
    [LoanRepaymentStrategy.INTEREST_PRINCIPAL_PENALTIES_FEES]: {
        strategy: LoanRepaymentStrategy.INTEREST_PRINCIPAL_PENALTIES_FEES,
        allocationOrder: [
            { componentType: 'interest', order: 1 },
            { componentType: 'principal', order: 2 },
            { componentType: 'penalties', order: 3 },
            { componentType: 'fees', order: 4 },
        ],
        dueDateOrderingFlag: false,
        isDefault: false
    },
    [LoanRepaymentStrategy.PRINCIPAL_INTEREST_FEES_PENALTIES]: {
        strategy: LoanRepaymentStrategy.PRINCIPAL_INTEREST_FEES_PENALTIES,
        allocationOrder: [
            { componentType: 'principal', order: 1 },
            { componentType: 'interest', order: 2 },
            { componentType: 'fees', order: 3 },
            { componentType: 'penalties', order: 4 },
        ],
        dueDateOrderingFlag: false,
        isDefault: false
    },
    [LoanRepaymentStrategy.DUE_DATE_PRINCIPAL_INTEREST_PENALTIES_FEES]: {
        strategy: LoanRepaymentStrategy.DUE_DATE_PRINCIPAL_INTEREST_PENALTIES_FEES,
        allocationOrder: [
            { componentType: 'principal', order: 1 },
            { componentType: 'interest', order: 2 },
            { componentType: 'penalties', order: 3 },
            { componentType: 'fees', order: 4 },
        ],
        dueDateOrderingFlag: true,
        isDefault: false
    },
    [LoanRepaymentStrategy.INTEREST_PRINCIPAL_FEES_PENALTIES_OVERDUE_DUE]: {
        strategy: LoanRepaymentStrategy.INTEREST_PRINCIPAL_FEES_PENALTIES_OVERDUE_DUE,
        allocationOrder: [
            { componentType: 'interest', order: 1 },
            { componentType: 'principal', order: 2 },
            { componentType: 'fees', order: 3 },
            { componentType: 'penalties', order: 4 },
        ],
        dueDateOrderingFlag: true,
        isDefault: false
    },
    [LoanRepaymentStrategy.OVERDUE_DUE_INTEREST_PRINCIPAL_PENALTIES_FEES]: {
        strategy: LoanRepaymentStrategy.OVERDUE_DUE_INTEREST_PRINCIPAL_PENALTIES_FEES,
        allocationOrder: [
            { componentType: 'interest', order: 1 },
            { componentType: 'principal', order: 2 },
            { componentType: 'penalties', order: 3 },
            { componentType: 'fees', order: 4 },
        ],
        dueDateOrderingFlag: true,
        isDefault: false
    }
};
