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

public class LoanAccountingLifecycleTest {

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
    public void testFullLoanAccountingLifecycleWithPeriodicAccrualAccounting() {
        // Set business date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 1));
        
        // 1. Create Loan Product with Periodic Accrual Accounting
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // 2. Create Client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // 3. Create Loan with fees
        final Integer feeCharge = ChargesHelper.createCharges(requestSpec, responseSpec, 
                ChargesHelper.getLoanSpecifiedDueDateJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "100", false));
        final String loanExternalId = UUID.randomUUID().toString();
        final Integer loanId = createLoanAccountWithFee(clientId, loanProductID, loanExternalId, feeCharge);
        
        // 4. Verify Disbursement Journal Entries - Principal
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "01 January 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForAssetAccount(transfersInSuspenseAccount, "01 January 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
                
        // 5. Verify Fee Receivable Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivableFeeAccount, "01 January 2023",
                new JournalEntry(100, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(feeIncomeAccount, "01 January 2023",
                new JournalEntry(100, JournalEntry.TransactionType.CREDIT));
        
        // 6. Move forward to accrual date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 15));
        
        // 7. Run Periodic Accrual
        this.periodicAccrualAccountingHelper.runPeriodicAccrualAccounting("15 January 2023");
        
        // 8. Verify Interest Accrual Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivableInterestAccount, "15 January 2023",
                new JournalEntry(10, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(interestIncomeAccount, "15 January 2023",
                new JournalEntry(10, JournalEntry.TransactionType.CREDIT));
        
        // 9. Make Repayment
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 1));
        final PostLoansLoanIdTransactionsResponse repaymentResponse = loanTransactionHelper.makeLoanRepayment(loanId.longValue(),
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate("01 February 2023").locale("en")
                        .transactionAmount(1110.0));
        
        // 10. Verify Repayment Journal Entries
        // Principal
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "01 February 2023",
                new JournalEntry(1110, JournalEntry.TransactionType.DEBIT));
        
        // Principal repayment
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "01 February 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
                
        // Fee repayment
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivableFeeAccount, "01 February 2023",
                new JournalEntry(100, JournalEntry.TransactionType.CREDIT));
                
        // Interest repayment
        this.journalEntryHelper.checkJournalEntryForAssetAccount(receivableInterestAccount, "01 February 2023",
                new JournalEntry(10, JournalEntry.TransactionType.CREDIT));
        
        // 11. Verify loan status
        GetLoansLoanIdResponse loanDetails = this.loanTransactionHelper.getLoanDetails((long) loanId);
        assertTrue(loanDetails.getStatus().getClosedObligationsMet());
    }
    
    @Test
    public void testLoanAccountingWithWriteOff() {
        // Set business date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 1));
        
        // 1. Create Loan Product with Periodic Accrual Accounting
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // 2. Create Client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // 3. Create Loan
        final String loanExternalId = UUID.randomUUID().toString();
        final Integer loanId = createLoanAccount(clientId, loanProductID, loanExternalId);
        
        // 4. Verify Disbursement Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "01 January 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForAssetAccount(transfersInSuspenseAccount, "01 January 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
        
        // 5. Move forward to write-off date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 15));
        
        // 6. Write off loan
        this.loanTransactionHelper.makeWriteOff(loanId.longValue(), 
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate("15 February 2023").locale("en")
                        .note("Loan Write-Off"));
        
        // 7. Verify Write-off Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "15 February 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
        this.journalEntryHelper.checkJournalEntryForExpenseAccount(writeOffExpenseAccount, "15 February 2023",
                new JournalEntry(1000, JournalEntry.TransactionType.DEBIT));
        
        // 8. Verify loan status
        GetLoansLoanIdResponse loanDetails = this.loanTransactionHelper.getLoanDetails((long) loanId);
        assertTrue(loanDetails.getStatus().getWrittenOff());
    }
    
    @Test
    public void testLoanRecoveryAfterWriteOff() {
        // Set business date
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 1));
        
        // 1. Create Loan Product with Periodic Accrual Accounting
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // 2. Create Client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // 3. Create Loan
        final String loanExternalId = UUID.randomUUID().toString();
        final Integer loanId = createLoanAccount(clientId, loanProductID, loanExternalId);
        
        // 4. Write off loan
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 2, 15));
        this.loanTransactionHelper.makeWriteOff(loanId.longValue(), 
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate("15 February 2023").locale("en")
                        .note("Loan Write-Off"));
        
        // 5. Recover loan after write-off
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 3, 1));
        final PostLoansLoanIdTransactionsResponse recoveryResponse = loanTransactionHelper.makeLoanRepayment(loanId.longValue(),
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate("01 March 2023").locale("en")
                        .transactionAmount(500.0));
        
        // 6. Verify Recovery Journal Entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, "01 March 2023",
                new JournalEntry(500, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(incomeAccount, "01 March 2023",
                new JournalEntry(500, JournalEntry.TransactionType.CREDIT));
    }

    private Integer createLoanProductWithPeriodicAccrualAccounting() {
        final String loanProductJSON = new LoanProductTestBuilder().withPrincipal("1000").withRepaymentAfterEvery("1")
                .withNumberOfRepayments("1").withRepaymentTypeAsMonth().withinterestRatePerPeriod("12")
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
                .withRepaymentFrequencyTypeAsMonths().withInterestRatePerPeriod("12").withInterestTypeAsFlatBalance()
                .withAmortizationTypeAsEqualPrincipalPayments().withInterestCalculationPeriodTypeSameAsRepaymentPeriod()
                .withExpectedDisbursementDate("01 January 2023").withSubmittedOnDate("01 January 2023").withLoanType("individual")
                .withExternalId(externalId).build(clientID.toString(), loanProductID.toString(), null);

        final Integer loanId = loanTransactionHelper.getLoanId(loanApplicationJSON);
        loanTransactionHelper.approveLoan("01 January 2023", "1000", loanId, null);
        loanTransactionHelper.disburseLoanWithNetDisbursalAmount("01 January 2023", loanId, "1000");
        return loanId;
    }
    
    private Integer createLoanAccountWithFee(final Integer clientID, final Integer loanProductID, 
            final String externalId, final Integer feeId) {
        
        // First create the loan
        Integer loanId = createLoanAccount(clientID, loanProductID, externalId);
        
        // Then add fee
        final LocalDate targetDate = LocalDate.of(2023, 1, 1);
        final String feeChargeAddedDate = dateFormatter.format(targetDate);
        Integer loanChargeId = this.loanTransactionHelper.addChargesForLoan(loanId,
                LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(String.valueOf(feeId), feeChargeAddedDate, "100"));
                
        return loanId;
    }
}