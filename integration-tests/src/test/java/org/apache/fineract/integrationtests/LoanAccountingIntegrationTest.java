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
import org.apache.fineract.integrationtests.common.loans.LoanApplicationTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanProductTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanTransactionHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class LoanAccountingIntegrationTest {

    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private ClientHelper clientHelper;
    private LoanTransactionHelper loanTransactionHelper;
    private JournalEntryHelper journalEntryHelper;
    private AccountHelper accountHelper;
    private Account assetAccount;
    private Account incomeAccount;
    private Account expenseAccount;
    private Account overpaymentAccount;
    private Account transfersInSuspenseAccount;
    private Account receivableFeeAccount;
    private Account receivablePenaltyAccount;
    private Account interestIncomeAccount;
    private Account feeIncomeAccount;
    private Account penaltyIncomeAccount;
    private Account writeOffExpenseAccount;
    private DateTimeFormatter dateFormatter = new DateTimeFormatterBuilder().appendPattern("dd MMMM yyyy").toFormatter();
    private PeriodicAccrualAccountingHelper periodicAccrualAccountingHelper;

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
        this.interestIncomeAccount = this.accountHelper.createIncomeAccount();
        this.feeIncomeAccount = this.accountHelper.createIncomeAccount();
        this.penaltyIncomeAccount = this.accountHelper.createIncomeAccount();
        this.writeOffExpenseAccount = this.accountHelper.createExpenseAccount();
        
        this.journalEntryHelper = new JournalEntryHelper(this.requestSpec, this.responseSpec);
        this.clientHelper = new ClientHelper(this.requestSpec, this.responseSpec);
        this.periodicAccrualAccountingHelper = new PeriodicAccrualAccountingHelper(this.requestSpec, this.responseSpec);
    }

    @Test
    public void testLoanDisbursementAccountingEntries() {
        // Set a fixed date for testing
        final String currentDate = "01 January 2023";
        final String futureDate = "02 January 2023";
        
        // Create loan product with accounting enabled
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // Create a client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create a loan
        final Integer loanId = createLoanAccount(clientId, loanProductID, UUID.randomUUID().toString());
        
        // Verify disbursement journal entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, currentDate,
                new JournalEntry(1000, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForAssetAccount(transfersInSuspenseAccount, currentDate,
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
    }
    
    @Test
    public void testLoanRepaymentAccountingEntries() {
        // Set a fixed date for testing
        final String disbursementDate = "01 January 2023";
        final String repaymentDate = "02 January 2023";
        
        // Create loan product with accounting enabled
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // Create a client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create a loan
        final Integer loanId = createLoanAccount(clientId, loanProductID, UUID.randomUUID().toString());
        
        // Make repayment
        final PostLoansLoanIdTransactionsResponse repaymentResponse = loanTransactionHelper.makeLoanRepayment(loanId.longValue(),
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate(repaymentDate).locale("en")
                        .transactionAmount(1000.0));
                        
        // Verify repayment journal entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, repaymentDate,
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, repaymentDate,
                new JournalEntry(1000, JournalEntry.TransactionType.DEBIT));
    }
    
    @Test
    public void testLoanInterestAccrualAndPostingEntries() {
        // Set a fixed date for testing
        final String disbursementDate = "01 January 2023";
        final String accrualDate = "02 January 2023";
        
        // Create loan product with accounting enabled
        final Integer loanProductID = createLoanProductWithInterest();
        
        // Create a client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create a loan
        final Integer loanId = createLoanAccount(clientId, loanProductID, UUID.randomUUID().toString());
        
        // Run accrual
        BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, LocalDate.of(2023, 1, 2));
        this.periodicAccrualAccountingHelper.runPeriodicAccrualAccounting(accrualDate);
        
        // Verify interest accrual entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(this.assetAccount, accrualDate,
                new JournalEntry(16.44, JournalEntry.TransactionType.DEBIT));
        this.journalEntryHelper.checkJournalEntryForIncomeAccount(interestIncomeAccount, accrualDate,
                new JournalEntry(16.44, JournalEntry.TransactionType.CREDIT));
    }
    
    @Test
    public void testLoanWriteOffAccountingEntries() {
        // Set a fixed date for testing
        final String disbursementDate = "01 January 2023";
        final String writeOffDate = "15 January 2023";
        
        // Create loan product with accounting enabled
        final Integer loanProductID = createLoanProductWithPeriodicAccrualAccounting();
        
        // Create a client
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create a loan
        final Integer loanId = createLoanAccount(clientId, loanProductID, UUID.randomUUID().toString());
        
        // Write off loan
        this.loanTransactionHelper.makeWriteOff(loanId.longValue(), 
                new PostLoansLoanIdTransactionsRequest().dateFormat("dd MMMM yyyy").transactionDate(writeOffDate).locale("en")
                        .note("Loan Write-Off"));
        
        // Verify write-off journal entries
        this.journalEntryHelper.checkJournalEntryForAssetAccount(assetAccount, writeOffDate,
                new JournalEntry(1000, JournalEntry.TransactionType.CREDIT));
        this.journalEntryHelper.checkJournalEntryForExpenseAccount(writeOffExpenseAccount, writeOffDate,
                new JournalEntry(1000, JournalEntry.TransactionType.DEBIT));
    }

    private Integer createLoanProductWithPeriodicAccrualAccounting() {
        final String loanProductJSON = new LoanProductTestBuilder().withPrincipal("1000").withRepaymentAfterEvery("1")
                .withNumberOfRepayments("1").withRepaymentTypeAsMonth().withinterestRatePerPeriod("0")
                .withInterestRateFrequencyTypeAsMonths().withAmortizationTypeAsEqualPrincipalPayment().withInterestTypeAsFlat()
                .withAccountingRulePeriodicAccrual(assetAccount, incomeAccount, expenseAccount, overpaymentAccount)
                .withDaysInMonth("30").withDaysInYear("365").withMoratorium("0", "0")
                .build(null);

        return this.loanTransactionHelper.getLoanProductId(loanProductJSON);
    }
    
    private Integer createLoanProductWithInterest() {
        final String loanProductJSON = new LoanProductTestBuilder().withPrincipal("1000").withRepaymentAfterEvery("1")
                .withNumberOfRepayments("12").withRepaymentTypeAsMonth().withinterestRatePerPeriod("12")
                .withInterestRateFrequencyTypeAsMonths().withAmortizationTypeAsEqualPrincipalPayment().withInterestTypeAsDecliningBalance()
                .withAccountingRulePeriodicAccrual(assetAccount, incomeAccount, expenseAccount, overpaymentAccount)
                .withInterestCalculationPeriodTypeAsDaily()
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