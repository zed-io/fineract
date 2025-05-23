/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.fineract.portfolio.savings;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.apache.fineract.accounting.common.AccountingConstants.SavingProductAccountingParams;

public final class DepositsApiConstants {

    private DepositsApiConstants() {

    }

    // Deposit products
    public static final String FIXED_DEPOSIT_PRODUCT_RESOURCE_NAME = "fixeddepositproduct";
    public static final String RECURRING_DEPOSIT_PRODUCT_RESOURCE_NAME = "recurringdepositproduct";

    // Deposit accounts
    public static final String FIXED_DEPOSIT_ACCOUNT_RESOURCE_NAME = "fixeddepositaccount";
    public static final String RECURRING_DEPOSIT_ACCOUNT_RESOURCE_NAME = "recurringdepositaccount";

    public static final String SAVINGS_ACCOUNT_RESOURCE_NAME = "savingsaccount";
    public static final String SAVINGS_ACCOUNT_TRANSACTION_RESOURCE_NAME = "savingsaccount.transaction";
    public static final String SAVINGS_ACCOUNT_CHARGE_RESOURCE_NAME = "savingsaccountcharge";

    // deposit product actions
    public static final String summitalAction = ".summital";
    public static final String approvalAction = ".approval";
    public static final String undoApprovalAction = ".undoApproval";
    public static final String rejectAction = ".reject";
    public static final String withdrawnByApplicantAction = ".withdrawnByApplicant";
    public static final String activateAction = ".activate";
    public static final String modifyApplicationAction = ".modify";
    public static final String deleteApplicationAction = ".delete";
    public static final String undoTransactionAction = ".undotransaction";
    public static final String applyAnnualFeeTransactionAction = ".applyannualfee";
    public static final String adjustTransactionAction = ".adjusttransaction";
    public static final String closeAction = ".close";
    public static final String preMatureCloseAction = ".preMatureClose";
    public static final String payChargeTransactionAction = ".paycharge";
    public static final String waiveChargeTransactionAction = ".waivecharge";

    // command
    public static final String COMMAND_UNDO_TRANSACTION = "undo";
    public static final String COMMAND_ADJUST_TRANSACTION = "modify";
    public static final String COMMAND_WAIVE_CHARGE = "waive";
    public static final String COMMAND_PAY_CHARGE = "paycharge";
    public static final String UPDATE_DEPOSIT_AMOUNT = "updateDepositAmount";

    // general
    public static final String localeParamName = "locale";
    public static final String dateFormatParamName = "dateFormat";
    public static final String monthDayFormatParamName = "monthDayFormat";

    // deposit product and account parameters
    public static final String idParamName = "id";
    public static final String accountNoParamName = "accountNo";
    public static final String externalIdParamName = "externalId";
    public static final String statusParamName = "status";
    public static final String clientIdParamName = "clientId";
    public static final String groupIdParamName = "groupId";
    public static final String productIdParamName = "productId";
    public static final String fieldOfficerIdParamName = "fieldOfficerId";

    public static final String submittedOnDateParamName = "submittedOnDate";
    public static final String rejectedOnDateParamName = "rejectedOnDate";
    public static final String withdrawnOnDateParamName = "withdrawnOnDate";
    public static final String approvedOnDateParamName = "approvedOnDate";
    public static final String activatedOnDateParamName = "activatedOnDate";
    public static final String closedOnDateParamName = "closedOnDate";
    public static final String expectedFirstDepositOnDateParamName = "expectedFirstDepositOnDate";

    public static final String activeParamName = "active";
    public static final String nameParamName = "name";
    public static final String shortNameParamName = "shortName";
    public static final String descriptionParamName = "description";
    public static final String currencyCodeParamName = "currencyCode";
    public static final String digitsAfterDecimalParamName = "digitsAfterDecimal";
    public static final String inMultiplesOfParamName = "inMultiplesOf";
    public static final String nominalAnnualInterestRateParamName = "nominalAnnualInterestRate";
    public static final String interestCompoundingPeriodTypeParamName = "interestCompoundingPeriodType";
    public static final String interestPostingPeriodTypeParamName = "interestPostingPeriodType";
    public static final String interestCalculationTypeParamName = "interestCalculationType";
    public static final String interestCalculationDaysInYearTypeParamName = "interestCalculationDaysInYearType";
    public static final String lockinPeriodFrequencyParamName = "lockinPeriodFrequency";
    public static final String lockinPeriodFrequencyTypeParamName = "lockinPeriodFrequencyType";
    public static final String feeAmountParamName = "feeAmount";// to be deleted
    public static final String feeOnMonthDayParamName = "feeOnMonthDay";
    public static final String feeIntervalParamName = "feeInterval";
    public static final String accountingRuleParamName = "accountingRule";
    public static final String paymentTypeIdParamName = "paymentTypeId";
    public static final String transactionAccountNumberParamName = "accountNumber";
    public static final String checkNumberParamName = "checkNumber";
    public static final String routingCodeParamName = "routingCode";
    public static final String receiptNumberParamName = "receiptNumber";
    public static final String bankNumberParamName = "bankNumber";
    public static final String principalAmountParamName = "principalAmount";
    public static final String annualInterestRateParamName = "annualInterestRate";
    public static final String interestPostingPeriodInMonthsParamName = "interestPostingPeriodInMonths";
    public static final String tenureInMonthsParamName = "tenureInMonths";
    public static final String interestCompoundingPeriodInMonthsParamName = "interestCompoundingPeriodInMonths";

    // Preclosure parameters
    public static final String preClosurePenalApplicableParamName = "preClosurePenalApplicable";
    public static final String preClosurePenalInterestParamName = "preClosurePenalInterest";
    public static final String preClosurePenalInterestOnTypeIdParamName = "preClosurePenalInterestOnTypeId";
    public static final String interestFreePeriodFrequencyType = "interestFreePeriodFrequencyType";
    public static final String preClosurePenalInterestOnType = "preClosurePenalInterestOnType";

    // term paramters
    public static final String minDepositTermParamName = "minDepositTerm";
    public static final String maxDepositTermParamName = "maxDepositTerm";
    public static final String minDepositTermTypeIdParamName = "minDepositTermTypeId";
    public static final String maxDepositTermTypeIdParamName = "maxDepositTermTypeId";
    public static final String minDepositTermType = "minDepositTermType";
    public static final String maxDepositTermType = "maxDepositTermType";
    public static final String inMultiplesOfDepositTermParamName = "inMultiplesOfDepositTerm";
    public static final String inMultiplesOfDepositTermTypeIdParamName = "inMultiplesOfDepositTermTypeId";
    public static final String inMultiplesOfDepositTermType = "inMultiplesOfDepositTermType";

    public static final String depositAmountParamName = "depositAmount";
    public static final String depositMinAmountParamName = "minDepositAmount";
    public static final String depositMaxAmountParamName = "maxDepositAmount";
    public static final String depositPeriodParamName = "depositPeriod";
    public static final String depositPeriodFrequencyIdParamName = "depositPeriodFrequencyId";

    // recurring parameters
    public static final String mandatoryRecommendedDepositAmountParamName = "mandatoryRecommendedDepositAmount";
    public static final String isMandatoryDepositParamName = "isMandatoryDeposit";
    public static final String allowWithdrawalParamName = "allowWithdrawal";
    public static final String adjustAdvanceTowardsFuturePaymentsParamName = "adjustAdvanceTowardsFuturePayments";

    public static final String recurringFrequencyTypeParamName = "recurringFrequencyType";
    public static final String recurringFrequencyParamName = "recurringFrequency";
    public static final String isCalendarInheritedParamName = "isCalendarInherited";

    // transaction parameters
    public static final String transactionDateParamName = "transactionDate";
    public static final String transactionAmountParamName = "transactionAmount";
    public static final String paymentDetailDataParamName = "paymentDetailData";
    public static final String runningBalanceParamName = "runningBalance";
    public static final String reversedParamName = "reversed";
    public static final String dateParamName = "date";
    public static final String accountIdParamName = "accountId";

    // recurring deposits update parameters
    public static final String effectiveDateParamName = "effectiveDate";

    // charges parameters
    public static final String chargeIdParamName = "chargeId";
    public static final String chargesParamName = "charges";
    public static final String savingsAccountChargeIdParamName = "savingsAccountChargeId";
    public static final String chargeNameParamName = "name";
    public static final String penaltyParamName = "penalty";
    public static final String chargeTimeTypeParamName = "chargeTimeType";
    public static final String dueAsOfDateParamName = "dueDate";
    public static final String chargeCalculationTypeParamName = "chargeCalculationType";
    public static final String percentageParamName = "percentage";
    public static final String amountPercentageAppliedToParamName = "amountPercentageAppliedTo";
    public static final String currencyParamName = "currency";
    public static final String amountWaivedParamName = "amountWaived";
    public static final String amountWrittenOffParamName = "amountWrittenOff";
    public static final String amountOutstandingParamName = "amountOutstanding";
    public static final String amountOrPercentageParamName = "amountOrPercentage";
    public static final String amountParamName = "amount";
    public static final String isManualTransaction = "isManualTransaction";
    public static final String lienTransaction = "lienTransaction";
    public static final String chargesPaidByData = "chargesPaidByData";
    public static final String amountPaidParamName = "amountPaid";
    public static final String chargeOptionsParamName = "chargeOptions";
    public static final String chargePaymentModeParamName = "chargePaymentMode";

    public static final String noteParamName = "note";
    public static final String chartsParamName = "charts";
    public static final String chartIdParamName = "chartId";

    // deposit account associations
    public static final String transactions = "transactions";
    public static final String charges = "charges";
    public static final String activeChart = "activeChart";

    // account closure
    public static final String onAccountClosureIdParamName = "onAccountClosureId";
    public static final String transferDescriptionParamName = "transferDescription";
    public static final String toSavingsAccountIdParamName = "toSavingsAccountId";
    public static final String savingsAccounts = "savingsAccounts";
    public static final String maturityInstructionIdParamName = "maturityInstructionId";
    public static final String transferToSavingsIdParamName = "transferToSavingsId";

    public static final String preMatureCloseOnDateParamName = "preMatureCloseOnDate";

    public static final String linkedAccountParamName = "linkAccountId";
    public static final String transferInterestToSavingsParamName = "transferInterestToSavings";

    // template
    public static final String chartTemplate = "chartTemplate";

    /**
     * Deposit Product Parameters
     */
    private static final Set<String> DEPOSIT_PRODUCT_REQUEST_DATA_PARAMETERS = new HashSet<>(Arrays.asList(localeParamName,
            monthDayFormatParamName, nameParamName, shortNameParamName, descriptionParamName, currencyCodeParamName,
            digitsAfterDecimalParamName, inMultiplesOfParamName, nominalAnnualInterestRateParamName, interestCompoundingPeriodTypeParamName,
            interestPostingPeriodTypeParamName, interestCalculationTypeParamName, interestCalculationDaysInYearTypeParamName,
            lockinPeriodFrequencyParamName, lockinPeriodFrequencyTypeParamName, accountingRuleParamName, chargesParamName,
            SavingProductAccountingParams.INCOME_FROM_FEES.getValue(), SavingProductAccountingParams.INCOME_FROM_PENALTIES.getValue(),
            SavingProductAccountingParams.INTEREST_ON_SAVINGS.getValue(),
            SavingProductAccountingParams.PAYMENT_CHANNEL_FUND_SOURCE_MAPPING.getValue(),
            SavingProductAccountingParams.SAVINGS_CONTROL.getValue(), SavingProductAccountingParams.TRANSFERS_SUSPENSE.getValue(),
            SavingProductAccountingParams.SAVINGS_REFERENCE.getValue(), SavingProductAccountingParams.FEE_INCOME_ACCOUNT_MAPPING.getValue(),
            SavingProductAccountingParams.PENALTY_INCOME_ACCOUNT_MAPPING.getValue(),
            SavingProductAccountingParams.INTEREST_PAYABLE.getValue(), SavingProductAccountingParams.PENALTIES_RECEIVABLE.getValue(),
            SavingProductAccountingParams.FEES_RECEIVABLE.getValue(), chartsParamName, SavingsApiConstants.withHoldTaxParamName,
            SavingsApiConstants.taxGroupIdParamName));

    private static final Set<String> PRECLOSURE_REQUEST_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(preClosurePenalApplicableParamName, preClosurePenalInterestParamName, preClosurePenalInterestOnTypeIdParamName));

    private static final Set<String> PRECLOSURE_RESPONSE_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(preClosurePenalApplicableParamName, preClosurePenalInterestParamName, preClosurePenalInterestOnType));

    private static final Set<String> DEPOSIT_TERM_REQUEST_DATA_PARAMETERS = new HashSet<>(Arrays.asList(minDepositTermParamName,
            maxDepositTermParamName, minDepositTermTypeIdParamName, maxDepositTermTypeIdParamName, inMultiplesOfDepositTermParamName,
            inMultiplesOfDepositTermTypeIdParamName, depositAmountParamName, depositMinAmountParamName, depositMaxAmountParamName));

    private static final Set<String> DEPOSIT_TERM_RESPONSE_DATA_PARAMETERS = new HashSet<>(Arrays.asList(minDepositTermParamName,
            maxDepositTermParamName, minDepositTermType, maxDepositTermType, inMultiplesOfDepositTermParamName,
            inMultiplesOfDepositTermType, depositAmountParamName, depositMinAmountParamName, depositMaxAmountParamName));

    private static final Set<String> RECURRING_DETAILS_REQUEST_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(mandatoryRecommendedDepositAmountParamName, isMandatoryDepositParamName, allowWithdrawalParamName,
                    adjustAdvanceTowardsFuturePaymentsParamName, recurringFrequencyTypeParamName, recurringFrequencyParamName,
                    isCalendarInheritedParamName));

    private static final Set<String> RECURRING_DETAILS_RESPONSE_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(mandatoryRecommendedDepositAmountParamName, isMandatoryDepositParamName, allowWithdrawalParamName,
                    adjustAdvanceTowardsFuturePaymentsParamName, recurringFrequencyTypeParamName, recurringFrequencyParamName,
                    isCalendarInheritedParamName));

    private static final Set<String> DEPOSIT_PRECLOSURE_CALCULATION_REQUEST_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(preMatureCloseOnDateParamName));

    public static final Set<String> FIXED_DEPOSIT_PRODUCT_REQUEST_DATA_PARAMETERS = fixedDepositProductRequestData();
    public static final Set<String> FIXED_DEPOSIT_PRODUCT_RESPONSE_DATA_PARAMETERS = fixedDepositProductResponseData();

    public static final Set<String> RECURRING_DEPOSIT_PRODUCT_REQUEST_DATA_PARAMETERS = recurringDepositProductRequestData();
    public static final Set<String> RECURRING_DEPOSIT_PRODUCT_RESPONSE_DATA_PARAMETERS = recurringDepositProductResponseData();

    private static Set<String> fixedDepositProductRequestData() {
        final Set<String> fixedDepositRequestData = new HashSet<>();
        fixedDepositRequestData.addAll(DEPOSIT_PRODUCT_REQUEST_DATA_PARAMETERS);
        fixedDepositRequestData.addAll(PRECLOSURE_REQUEST_DATA_PARAMETERS);
        fixedDepositRequestData.addAll(DEPOSIT_TERM_REQUEST_DATA_PARAMETERS);
        return fixedDepositRequestData;
    }

    private static Set<String> fixedDepositProductResponseData() {
        final Set<String> fixedDepositRequestData = new HashSet<>();
        fixedDepositRequestData.addAll(DEPOSIT_PRODUCT_REQUEST_DATA_PARAMETERS);
        fixedDepositRequestData.addAll(PRECLOSURE_RESPONSE_DATA_PARAMETERS);
        fixedDepositRequestData.addAll(DEPOSIT_TERM_RESPONSE_DATA_PARAMETERS);
        return fixedDepositRequestData;
    }

    private static Set<String> recurringDepositProductRequestData() {
        final Set<String> recurringDepositRequestData = new HashSet<>();
        recurringDepositRequestData.addAll(DEPOSIT_PRODUCT_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(PRECLOSURE_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(DEPOSIT_TERM_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(RECURRING_DETAILS_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.add(SavingsApiConstants.minBalanceForInterestCalculationParamName);
        return recurringDepositRequestData;
    }

    private static Set<String> recurringDepositProductResponseData() {
        final Set<String> recurringDepositRequestData = new HashSet<>();
        recurringDepositRequestData.addAll(DEPOSIT_PRODUCT_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(PRECLOSURE_RESPONSE_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(DEPOSIT_TERM_RESPONSE_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(RECURRING_DETAILS_RESPONSE_DATA_PARAMETERS);
        recurringDepositRequestData.add(SavingsApiConstants.minBalanceForInterestCalculationParamName);
        return recurringDepositRequestData;
    }

    /**
     * Depost Account parameters
     */

    private static final Set<String> DEPOSIT_ACCOUNT_REQUEST_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(localeParamName, dateFormatParamName, monthDayFormatParamName, accountNoParamName, externalIdParamName,
                    clientIdParamName, groupIdParamName, productIdParamName, fieldOfficerIdParamName, submittedOnDateParamName,
                    nominalAnnualInterestRateParamName, interestCompoundingPeriodTypeParamName, interestPostingPeriodTypeParamName,
                    interestCalculationTypeParamName, interestCalculationDaysInYearTypeParamName, lockinPeriodFrequencyParamName,
                    lockinPeriodFrequencyTypeParamName, chargesParamName, chartsParamName, depositAmountParamName, depositPeriodParamName,
                    depositPeriodFrequencyIdParamName, savingsAccounts, expectedFirstDepositOnDateParamName,
                    SavingsApiConstants.withHoldTaxParamName, maturityInstructionIdParamName, transferToSavingsIdParamName));

    public static final Set<String> FIXED_DEPOSIT_ACCOUNT_REQUEST_DATA_PARAMETERS = fixedDepositAccountRequestData();
    public static final Set<String> FIXED_DEPOSIT_ACCOUNT_RESPONSE_DATA_PARAMETERS = fixedDepositAccountResponseData();
    public static final Set<String> FIXED_DEPOSIT_ACCOUNT_INTEREST_CALCULATION_PARAMETERS = fixedDepositInterestCalculationData();
    public static final Set<String> RECURRING_DEPOSIT_ACCOUNT_REQUEST_DATA_PARAMETERS = recurringDepositAccountRequestData();
    public static final Set<String> RECURRING_DEPOSIT_ACCOUNT_RESPONSE_DATA_PARAMETERS = recurringDepositAccountResponseData();

    private static Set<String> fixedDepositInterestCalculationData() {
        final Set<String> fixedDepositInterestCalculationData = new HashSet<>();
        fixedDepositInterestCalculationData.add(principalAmountParamName);
        fixedDepositInterestCalculationData.add(annualInterestRateParamName);
        fixedDepositInterestCalculationData.add(tenureInMonthsParamName);
        fixedDepositInterestCalculationData.add(interestPostingPeriodInMonthsParamName);
        fixedDepositInterestCalculationData.add(interestCompoundingPeriodInMonthsParamName);

        return fixedDepositInterestCalculationData;

    }

    private static Set<String> fixedDepositAccountRequestData() {
        final Set<String> fixedDepositRequestData = new HashSet<>();
        fixedDepositRequestData.addAll(DEPOSIT_ACCOUNT_REQUEST_DATA_PARAMETERS);
        fixedDepositRequestData.addAll(PRECLOSURE_REQUEST_DATA_PARAMETERS);
        fixedDepositRequestData.addAll(DEPOSIT_TERM_REQUEST_DATA_PARAMETERS);
        fixedDepositRequestData.add(linkedAccountParamName);
        fixedDepositRequestData.add(transferInterestToSavingsParamName);
        return fixedDepositRequestData;
    }

    private static Set<String> fixedDepositAccountResponseData() {
        final Set<String> fixedDepositResponseData = new HashSet<>();
        fixedDepositResponseData.addAll(DEPOSIT_ACCOUNT_REQUEST_DATA_PARAMETERS);
        fixedDepositResponseData.addAll(PRECLOSURE_RESPONSE_DATA_PARAMETERS);
        fixedDepositResponseData.addAll(DEPOSIT_TERM_RESPONSE_DATA_PARAMETERS);
        fixedDepositResponseData.add(linkedAccountParamName);
        fixedDepositResponseData.add(transferInterestToSavingsParamName);
        return fixedDepositResponseData;
    }

    private static Set<String> recurringDepositAccountRequestData() {
        final Set<String> recurringDepositRequestData = new HashSet<>();
        recurringDepositRequestData.addAll(DEPOSIT_ACCOUNT_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(PRECLOSURE_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(DEPOSIT_TERM_REQUEST_DATA_PARAMETERS);
        recurringDepositRequestData.addAll(RECURRING_DETAILS_REQUEST_DATA_PARAMETERS);
        return recurringDepositRequestData;
    }

    private static Set<String> recurringDepositAccountResponseData() {
        final Set<String> recurringDepositResponseData = new HashSet<>();
        recurringDepositResponseData.addAll(DEPOSIT_ACCOUNT_REQUEST_DATA_PARAMETERS);
        recurringDepositResponseData.addAll(PRECLOSURE_RESPONSE_DATA_PARAMETERS);
        recurringDepositResponseData.addAll(DEPOSIT_TERM_RESPONSE_DATA_PARAMETERS);
        recurringDepositResponseData.addAll(RECURRING_DETAILS_RESPONSE_DATA_PARAMETERS);
        return recurringDepositResponseData;
    }

    private static final Set<String> RECURRING_DEPOSIT_TRANSACTION_RESPONSE_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(idParamName, "accountId", accountNoParamName, "currency", "amount", dateParamName, paymentDetailDataParamName,
                    runningBalanceParamName, reversedParamName));

    private static final Set<String> SAVINGS_ACCOUNT_ACTIVATION_REQUEST_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(localeParamName, dateFormatParamName, activatedOnDateParamName));

    private static final Set<String> SAVINGS_ACCOUNT_CHARGES_RESPONSE_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(chargeIdParamName, savingsAccountChargeIdParamName, chargeNameParamName, penaltyParamName,
                    chargeTimeTypeParamName, dueAsOfDateParamName, chargeCalculationTypeParamName, percentageParamName,
                    amountPercentageAppliedToParamName, currencyParamName, amountWaivedParamName, amountWrittenOffParamName,
                    amountOutstandingParamName, amountOrPercentageParamName, amountParamName, amountPaidParamName, chargeOptionsParamName));

    private static final Set<String> SAVINGS_ACCOUNT_CHARGES_ADD_REQUEST_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(chargeIdParamName, amountParamName, dueAsOfDateParamName, dateFormatParamName, localeParamName,
                    feeOnMonthDayParamName, monthDayFormatParamName, feeIntervalParamName));

    private static final Set<String> SAVINGS_ACCOUNT_CHARGES_PAY_CHARGE_REQUEST_DATA_PARAMETERS = new HashSet<>(
            Arrays.asList(amountParamName, dueAsOfDateParamName, dateFormatParamName, localeParamName));
}
