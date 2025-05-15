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
package org.apache.fineract.integrationtests;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.UUID;
import org.apache.fineract.client.models.GetLoansLoanIdResponse;
import org.apache.fineract.client.models.PostLoansLoanIdChargesChargeIdRequest;
import org.apache.fineract.client.models.PostLoansLoanIdChargesChargeIdResponse;
import org.apache.fineract.client.models.PostLoansLoanIdTransactionsRequest;
import org.apache.fineract.client.models.PostLoansLoanIdTransactionsResponse;
import org.apache.fineract.infrastructure.businessdate.domain.BusinessDateType;
import org.apache.fineract.integrationtests.common.BusinessDateHelper;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.accounting.Account;
import org.apache.fineract.integrationtests.common.accounting.AccountHelper;
import org.apache.fineract.integrationtests.common.accounting.JournalEntry;
import org.apache.fineract.integrationtests.common.accounting.JournalEntryHelper;
import org.apache.fineract.integrationtests.common.accounting.PeriodicAccrualAccountingHelper;
import org.apache.fineract.integrationtests.common.charges.ChargesHelper;
import org.apache.fineract.integrationtests.common.loans.LoanApplicationTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanProductTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanTransactionHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class LoanFeePenaltyAccountingTest {

    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private ClientHelper clientHelper;
    private LoanTransactionHelper loanTransactionHelper;
    private JournalEntryHelper journalEntryHelper;
    private AccountHelper accountHelper;
    private DateTimeFormatter dateFormatter = new DateTimeFormatterBuilder().appendPattern("dd MMMM yyyy").toFormatter();
    private PeriodicAccrualAccountingHelper periodicAccrualAccountingHelper;

    // GL Account variables
    private Account assetAccount;
    private Account incomeAccount;
    private Account expenseAccount;
    private Account overpaymentAccount;
    private Account transfersInSuspenseAccount;
    private Account receivableFeeAccount;
    private Account receivablePenaltyAccount;
    private Account receivableInterestAccount;
    private Account interestIncomeAccount;
    private Account feeIncomeAccount;
    private Account penaltyIncomeAccount;
    private Account writeOffExpenseAccount;

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        this.requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        this.requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        this.requestSpec.header("Fineract-Platform-TenantId", "default");
        this.responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();
        this.loanTransactionHelper = new LoanTransactionHelper(this.requestSpec, this.responseSpec);
        this.accountHelper = new AccountHelper(this.requestSpec, this.responseSpec);
        
        // Set up GL accounts needed for loan accounting
        this.assetAccount = this.accountHelper.createAssetAccount();
        this.incomeAccount = this.accountHelper.createIncomeAccount();
        this.expenseAccount = this.accountHelper.createExpenseAccount();
        this.overpaymentAccount = this.accountHelper.createLiabilityAccount();
        this.transfersInSuspenseAccount = this.accountHelper.createAssetAccount();
        this.receivableFeeAccount = this.accountHelper.createAssetAccount();
        this.receivablePenaltyAccount = this.accountHelper.createAssetAccount();
        this.receivableInterestAccount = this.accountHelper.createAssetAccount();
        this.interestIncomeAccount = this.accountHelper.createIncomeAccount();
        this.feeIncomeAccount = this.accountHelper.createIncomeAccount();
        this.penaltyIncomeAccount = this.accountHelper.createIncomeAccount();
        this.writeOffExpenseAccount = this.accountHelper.createExpenseAccount();
        
        this.journalEntryHelper = new JournalEntryHelper(this.requestSpec, this.responseSpec);
        this.clientHelper = new ClientHelper(this.requestSpec, this.responseSpec);
        this.periodicAccrualAccountingHelper = new PeriodicAccrualAccountingHelper(this.requestSpec, this.responseSpec);
    }

    @Test
    public void testLoanWithFeesAccountingEntries() {
        // Set business date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 1));
        
        // 1. Create Loan Product with Periodic Accrual Accounting
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // 2. Create Client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // 3. Create Loan
        final String loanExternalId = UUID.randomUUID().toString();
        final Integer loanId = createLoanAccount(clientId, loanProductID, loanExternalId);
        
        // 4. Add Disbursement Fee
        final Integer disbursementFeeCharge = ChargesHelper.createCharges(requestSpec, responseSpec, 
                ChargesHelper.getLoanDisbursementJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "100"));
                
        this.loanTransactionHelper.addChargesForLoan(loanId, 
                LoanTransactionHelper.getDisbursementChargesForLoanAsJSON(String.valueOf(disbursementFeeCharge), "100"));
        
        // 5. Add Specified Due Date Fee
        final Integer dueDateFeeCharge = ChargesHelper.createCharges(requestSpec, responseSpec, 
                ChargesHelper.getLoanSpecifiedDueDateJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "150", false));
                
        final LocalDate targetDate = LocalDate.of(2023, 1, 15);
        final String feeChargeAddedDate = dateFormatter.format(targetDate);
        
        this.loanTransactionHelper.addChargesForLoan(loanId,
                LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(String.valueOf(dueDateFeeCharge), feeChargeAddedDate, "150"));
        
        // 6. Verify Disbursement Fee Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivableFeeAccount, "01 January 2023",
                new JournalEntry(100, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(feeIncomeAccount, "01 January 2023",
                new JournalEntry(100, JournalEntry.TransactionType.CREDIT));
        
        // 7. Move forward to due date for specified due date fee
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 15));
        
        // 8. Run periodic accrual to process the due date fee
        this.periodicAccrualAccountingHelper.runPeriodicAccrualAccounting("15 January 2023");
        
        // 9. Verify Due Date Fee Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivableFeeAccount, "15 January 2023",
                new JournalEntry(150, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(feeIncomeAccount, "15 January 2023",
                new JournalEntry(150, JournalEntry.TransactionType.CREDIT));
        
        // 10. Make repayment that covers fees
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 1));
        final PostLoansLoanIdTransactionsResponse repaymentResponse = loanTransactionHelper.makeLoanRepayment(loanId.longValue(),
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate("01 February 2023").locale("en")
                        .transactionAmount(1250.0));
        
        // 11. Verify Repayment Journal Entries
        // Cash received
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "01 February 2023",
                new JournalEntry(1250, JournalEntry.TransactionType.DEBIT));
        
        // Principal repayment
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "01 February 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
                
        // Fee receivable reduction - both fees
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivableFeeAccount, "01 February 2023",
                new JournalEntry(250, JournalEntry.TransactionType.CREDIT));
    }

    @Test
    public void testLoanWithPenaltyAccountingEntries() {
        // Set business date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 1));
        
        // 1. Create Loan Product with Periodic Accrual Accounting
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // 2. Create Client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // 3. Create Loan
        final String loanExternalId = UUID.randomUUID().toString();
        final Integer loanId = createLoanAccount(clientId, loanProductID, loanExternalId);
        
        // 4. Add Late Payment Penalty
        final Integer latePaymentPenalty = ChargesHelper.createCharges(requestSpec, responseSpec, 
                ChargesHelper.getLoanSpecifiedDueDateJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "50", true));
                
        final LocalDate targetDate = LocalDate.of(2023, 2, 1);
        final String penaltyAddedDate = dateFormatter.format(targetDate);
        
        Integer penaltyLoanChargeId = this.loanTransactionHelper.addChargesForLoan(loanId,
                LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(String.valueOf(latePaymentPenalty), penaltyAddedDate, "50"));
        
        // 5. Move forward to due date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 1));
        
        // 6. Run periodic accrual to process the penalty
        this.periodicAccrualAccountingHelper.runPeriodicAccrualAccounting("01 February 2023");
        
        // 7. Verify Penalty Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivablePenaltyAccount, "01 February 2023",
                new JournalEntry(50, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(penaltyIncomeAccount, "01 February 2023",
                new JournalEntry(50, JournalEntry.TransactionType.CREDIT));
        
        // 8. Make repayment that covers principal and penalty
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 15));
        final PostLoansLoanIdTransactionsResponse repaymentResponse = loanTransactionHelper.makeLoanRepayment(loanId.longValue(),
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate("15 February 2023").locale("en")
                        .transactionAmount(1050.0));
        
        // 9. Verify Repayment Journal Entries
        // Cash received
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "15 February 2023",
                new JournalEntry(1050, JournalEntry.TransactionType.DEBIT));
        
        // Principal repayment
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "15 February 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
                
        // Penalty receivable reduction
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivablePenaltyAccount, "15 February 2023",
                new JournalEntry(50, JournalEntry.TransactionType.CREDIT));
    }
    
    @Test
    public void testLoanChargeAdjustmentAccountingEntries() {
        // Set business date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 1));
        
        // 1. Create Loan Product with Periodic Accrual Accounting
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // 2. Create Client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // 3. Create Loan
        final String loanExternalId = UUID.randomUUID().toString();
        final Integer loanId = createLoanAccount(clientId, loanProductID, loanExternalId);
        
        // 4. Add Specified Due Date Fee
        final Integer dueDateFeeCharge = ChargesHelper.createCharges(requestSpec, responseSpec, 
                ChargesHelper.getLoanSpecifiedDueDateJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "100", false));
                
        final LocalDate targetDate = LocalDate.of(2023, 1, 15);
        final String feeChargeAddedDate = dateFormatter.format(targetDate);
        
        Integer feeLoanChargeId = this.loanTransactionHelper.addChargesForLoan(loanId,
                LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(String.valueOf(dueDateFeeCharge), feeChargeAddedDate, "100"));
        
        // 5. Move forward to due date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 15));
        
        // 6. Run periodic accrual to process the fee
        this.periodicAccrualAccountingHelper.runPeriodicAccrualAccounting("15 January 2023");
        
        // 7. Make repayment that covers principal and fee
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 1));
        final PostLoansLoanIdTransactionsResponse repaymentResponse = loanTransactionHelper.makeLoanRepayment(loanId.longValue(),
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate("01 February 2023").locale("en")
                        .transactionAmount(1100.0));
        
        // 8. Make Charge Adjustment
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 15));
        final PostLoansLoanIdChargesChargeIdResponse chargeAdjustmentResult = loanTransactionHelper.chargeAdjustment((long) loanId,
                (long) feeLoanChargeId, new PostLoansLoanIdChargesChargeIdRequest().amount(50.0).locale("en"));
        
        // 9. Verify Charge Adjustment Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "15 February 2023",
                new JournalEntry(50, JournalEntry.TransactionType.CREDIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(feeIncomeAccount, "15 February 2023",
                new JournalEntry(50, JournalEntry.TransactionType.DEBIT));
    }

    private Integer createLoanProductWithPeriodicAccrualAccounting() {
        final String loanProductJSON = new LoanProductTestBuilder().withPrincipal("1000").withRepaymentAfterEvery("1")
                .withNumberOfRepayments("1").withRepaymentTypeAsMonth().withinterestRatePerPeriod("0")
                .withInterestRateFrequencyTypeAsMonths().withAmortizationTypeAsEqualPrincipalPayment().withInterestTypeAsFlat()
                .withAccountingRulePeriodicAccrual(new Account[] {
                    assetAccount, incomeAccount, expenseAccount, overpaymentAccount, transfersInSuspenseAccount,
                    receivableFeeAccount, receivablePenaltyAccount, receivableInterestAccount, 
                    interestIncomeAccount, feeIncomeAccount, penaltyIncomeAccount, writeOffExpenseAccount
                })
                .withDaysInMonth("30").withDaysInYear("365").withMoratorium("0", "0")
                .build(null);

        return this.loanTransactionHelper.getLoanProductId(loanProductJSON);
    }

    private Integer createLoanAccount(final Integer clientID, final Integer loanProductID, final String externalId) {
        String loanApplicationJSON = new LoanApplicationTestBuilder().withPrincipal("1000").withLoanTermFrequency("1")
                .withLoanTermFrequencyAsMonths().withNumberOfRepayments("1").withRepaymentEveryAfter("1")
                .withRepaymentFrequencyTypeAsMonths().withInterestRatePerPeriod("0").withInterestTypeAsFlatBalance()
                .withAmortizationTypeAsEqualPrincipalPayments().withInterestCalculationPeriodTypeSameAsRepaymentPeriod()
                .withExpectedDisbursementDate("01 January 2023").withSubmittedOnDate("01 January 2023").withLoanType("individual")
                .withExternalId(externalId).build(clientID.toString(), loanProductID.toString(), null);

        final Integer loanId = loanTransactionHelper.getLoanId(loanApplicationJSON);
        loanTransactionHelper.approveLoan("01 January 2023", "1000", loanId, null);
        loanTransactionHelper.disburseLoanWithNetDisbursalAmount("01 January 2023", loanId, "1000");
        return loanId;
    }
}