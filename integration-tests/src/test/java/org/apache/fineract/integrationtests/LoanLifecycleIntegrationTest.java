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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.CommonConstants;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.accounting.Account;
import org.apache.fineract.integrationtests.common.accounting.AccountHelper;
import org.apache.fineract.integrationtests.common.accounting.JournalEntryHelper;
import org.apache.fineract.integrationtests.common.loans.LoanApplicationTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanProductTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanStatusChecker;
import org.apache.fineract.integrationtests.common.loans.LoanTransactionHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Integration test for the core loan lifecycle: Client creation -> Loan application -> Approval -> Disbursement -> Repayment.
 * This tests the end-to-end flow of the lending process with multiple validations along the way.
 */
public class LoanLifecycleIntegrationTest {

    private static final Logger LOG = LoggerFactory.getLogger(LoanLifecycleIntegrationTest.class);

    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private ClientHelper clientHelper;
    private LoanTransactionHelper loanTransactionHelper;
    private JournalEntryHelper journalEntryHelper;
    private AccountHelper accountHelper;

    // Test constants
    private static final String LOAN_TERM_FREQUENCY = "12";
    private static final String LOAN_TERM_FREQUENCY_TYPE = "2"; // months
    private static final String LOAN_PRINCIPAL = "10000";
    private static final String NUMBER_OF_REPAYMENTS = "12";
    private static final String INTEREST_RATE_PER_PERIOD = "18";
    private static final String INTEREST_TYPE = "flat"; // flat interest
    private static final String AMORTIZATION_TYPE = "1"; // equal installments
    private static final String INTEREST_CALCULATION_PERIOD_TYPE = "1"; // same as repayment period
    private static final String REPAYMENT_FREQUENCY = "1"; // monthly
    private static final String REPAYMENT_FREQUENCY_TYPE = "2"; // months
    private static final String INTEREST_RATE_FREQUENCY_TYPE = "3"; // per year
    private static final String ACCOUNTING_RULE = "4"; // accrual based accounting
    private static final String LOAN_TRANSACTION_STRATEGY = "1"; // mifos-standard-strategy

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        requestSpec.header("Fineract-Platform-TenantId", "default");
        responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();

        clientHelper = new ClientHelper(requestSpec, responseSpec);
        loanTransactionHelper = new LoanTransactionHelper(requestSpec, responseSpec);
        journalEntryHelper = new JournalEntryHelper(requestSpec, responseSpec);
        accountHelper = new AccountHelper(requestSpec, responseSpec);
    }

    @Test
    @DisplayName("Test full loan lifecycle from client creation to full repayment")
    public void testLoanLifecycle() {
        // 1. Create client
        final Integer clientId = createClient();
        LOG.info("Client created with ID: {}", clientId);

        // 2. Create loan product
        final Integer loanProductId = createLoanProduct();
        LOG.info("Loan product created with ID: {}", loanProductId);

        // 3. Apply for loan
        final Integer loanId = applyForLoanApplication(clientId, loanProductId);
        LOG.info("Loan application submitted with ID: {}", loanId);

        // 4. Approve loan
        approveLoan(loanId);
        LOG.info("Loan approved successfully");

        // 5. Disburse loan
        disburseLoan(loanId);
        LOG.info("Loan disbursed successfully");

        // 6. Verify loan details after disbursement
        verifyLoanDetails(loanId);

        // 7. Make loan repayments
        makeFullLoanRepayment(loanId);
        LOG.info("Loan repayment completed successfully");

        // 8. Verify loan is closed
        verifyLoanClosed(loanId);
        LOG.info("Loan closed successfully, test completed");
    }

    private Integer createClient() {
        final String dateString = Utils.dateFormatter.format(LocalDate.now());
        
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest(dateString, 
                "01 January 2010"));
        assertNotNull(clientId, "Client ID should not be null");
        assertTrue(clientId > 0, "Client ID should be a positive number");
        
        return clientId;
    }

    private Integer createLoanProduct() {
        // Create GL Accounts for loan product
        final Account assetAccount = accountHelper.createAssetAccount();
        final Account incomeAccount = accountHelper.createIncomeAccount();
        final Account expenseAccount = accountHelper.createExpenseAccount();
        final Account overpaymentAccount = accountHelper.createLiabilityAccount();

        final String loanProductJSON = new LoanProductTestBuilder()
                .withPrincipal(LOAN_PRINCIPAL)
                .withNumberOfRepayments(NUMBER_OF_REPAYMENTS)
                .withRepaymentAfterEvery(REPAYMENT_FREQUENCY)
                .withRepaymentTypeAsMonth()
                .withinterestRatePerPeriod(INTEREST_RATE_PER_PERIOD)
                .withInterestRateFrequencyTypeAsMonths()
                .withAmortizationTypeAsEqualPrincipalPayment()
                .withInterestTypeAsFlat()
                .withAccountingRuleAsAccrualBased(accountHelper.ACCRUAL_ACCOUNTS_FOR_LOAN)
                .withInterestCalculationPeriodTypeAsDays()
                .build(assetAccount, incomeAccount, expenseAccount, overpaymentAccount);

        return loanTransactionHelper.getLoanProductId(loanProductJSON);
    }

    private Integer applyForLoanApplication(final Integer clientId, final Integer loanProductId) {
        // Get loan application template
        HashMap loanApplicationMap = loanTransactionHelper.getLoanApplicationTemplateByProduct(clientId, loanProductId);
        assertNotNull(loanApplicationMap, "Loan application template should not be null");

        // Prepare loan application
        final String loanApplicationJSON = new LoanApplicationTestBuilder()
                .withPrincipal(LOAN_PRINCIPAL)
                .withLoanTermFrequency(LOAN_TERM_FREQUENCY)
                .withLoanTermFrequencyAsMonths()
                .withNumberOfRepayments(NUMBER_OF_REPAYMENTS)
                .withRepaymentEveryAfter(REPAYMENT_FREQUENCY)
                .withRepaymentFrequencyTypeAsMonths()
                .withInterestRatePerPeriod(INTEREST_RATE_PER_PERIOD)
                .withInterestTypeAsFlatBalance()
                .withAmortizationTypeAsEqualInstallments()
                .withInterestCalculationPeriodTypeAsSameAsRepaymentPeriod()
                .withExpectedDisbursementDate(Utils.dateFormatter.format(LocalDate.now()))
                .withSubmittedOnDate(Utils.dateFormatter.format(LocalDate.now()))
                .withLoanType("individual")
                .build(clientId.toString(), loanProductId.toString(), null);

        // Submit loan application
        return loanTransactionHelper.getLoanId(loanApplicationJSON);
    }

    private void approveLoan(final Integer loanId) {
        // Prepare approval JSON
        final String approvalDate = Utils.dateFormatter.format(LocalDate.now());
        final String expectedDisbursementDate = approvalDate;
        String approvalJSON = loanTransactionHelper.approveLoanApplication(approvalDate, expectedDisbursementDate, loanId);
        
        // Verify response
        assertNotNull(approvalJSON, "Approval response should not be null");
        
        // Verify loan status
        LoanStatusChecker.verifyLoanIsApproved(loanTransactionHelper.getLoanDetails(loanId));
    }

    private void disburseLoan(final Integer loanId) {
        // Prepare disbursement JSON
        final String disbursementDate = Utils.dateFormatter.format(LocalDate.now());
        String disbursementJSON = loanTransactionHelper.disburseLoanApplication(disbursementDate, loanId);
        
        // Verify response
        assertNotNull(disbursementJSON, "Disbursement response should not be null");
        
        // Verify loan status
        LoanStatusChecker.verifyLoanIsActive(loanTransactionHelper.getLoanDetails(loanId));
    }

    private void verifyLoanDetails(final Integer loanId) {
        // Get loan details
        HashMap loanDetails = loanTransactionHelper.getLoanDetails(loanId);
        assertNotNull(loanDetails, "Loan details should not be null");
        
        // Verify principal amount
        assertEquals(LOAN_PRINCIPAL, String.valueOf((int) ((Double) loanDetails.get("principal"))), 
                "Principal amount should match");
        
        // Verify number of repayments
        assertEquals(NUMBER_OF_REPAYMENTS, String.valueOf((int) ((Double) loanDetails.get("numberOfRepayments"))), 
                "Number of repayments should match");
        
        // Verify loan is active
        assertEquals("Active", (String) loanDetails.get("status").toString(), 
                "Loan should be in Active status");
        
        // Verify loan schedule
        @SuppressWarnings("unchecked")
        List<HashMap> repaymentSchedule = (List<HashMap>) ((HashMap) loanDetails.get("repaymentSchedule")).get("periods");
        assertNotNull(repaymentSchedule, "Repayment schedule should not be null");
        assertEquals(Integer.parseInt(NUMBER_OF_REPAYMENTS) + 1, repaymentSchedule.size(), 
                "Repayment schedule size should match number of repayments + 1 (disbursement)");
    }

    private void makeFullLoanRepayment(final Integer loanId) {
        // Get loan summary
        HashMap loanDetails = loanTransactionHelper.getLoanDetails(loanId);
        assertNotNull(loanDetails, "Loan details should not be null");
        
        // Get total outstanding
        HashMap summary = (HashMap) loanDetails.get("summary");
        Double outstandingBalance = (Double) summary.get("totalOutstanding");
        
        // Make payment for the full outstanding amount
        final String transactionDate = Utils.dateFormatter.format(LocalDate.now());
        String repaymentJSON = loanTransactionHelper.makeRepayment(transactionDate, outstandingBalance, loanId);
        assertNotNull(repaymentJSON, "Repayment response should not be null");
        
        // Verify journal entries
        journalEntryHelper.checkJournalEntryForAssetAccount(loanId, CommonConstants.REPAYMENT_TRANSACTION_TYPE);
        journalEntryHelper.checkJournalEntryForIncomeAccount(loanId, CommonConstants.REPAYMENT_TRANSACTION_TYPE);
    }

    private void verifyLoanClosed(final Integer loanId) {
        // Get loan details
        HashMap loanDetails = loanTransactionHelper.getLoanDetails(loanId);
        assertNotNull(loanDetails, "Loan details should not be null");
        
        // Verify loan status
        assertEquals("Closed (obligations met)", (String) loanDetails.get("status").toString(), 
                "Loan should be in Closed status");
        
        // Verify loan summary
        HashMap summary = (HashMap) loanDetails.get("summary");
        Double outstandingBalance = (Double) summary.get("totalOutstanding");
        assertEquals(0.0, outstandingBalance, 0.001, "Outstanding balance should be zero");
    }
}