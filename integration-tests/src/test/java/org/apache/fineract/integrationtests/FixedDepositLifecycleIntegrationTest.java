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
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.SchedulerJobHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.accounting.Account;
import org.apache.fineract.integrationtests.common.accounting.AccountHelper;
import org.apache.fineract.integrationtests.common.accounting.JournalEntryHelper;
import org.apache.fineract.integrationtests.common.fixeddeposit.FixedDepositAccountHelper;
import org.apache.fineract.integrationtests.common.fixeddeposit.FixedDepositAccountStatusChecker;
import org.apache.fineract.integrationtests.common.fixeddeposit.FixedDepositProductHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsProductHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsStatusChecker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Integration test for the fixed deposit account lifecycle: Client creation -> Fixed deposit account creation -> 
 * Approval -> Activation -> Interest calculation -> Maturity processing.
 * This tests the end-to-end flow of fixed deposit operations with multiple validations along the way.
 */
public class FixedDepositLifecycleIntegrationTest {

    private static final Logger LOG = LoggerFactory.getLogger(FixedDepositLifecycleIntegrationTest.class);

    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private ClientHelper clientHelper;
    private FixedDepositAccountHelper fixedDepositAccountHelper;
    private FixedDepositProductHelper fixedDepositProductHelper;
    private SavingsAccountHelper savingsAccountHelper;
    private SavingsProductHelper savingsProductHelper;
    private AccountHelper accountHelper;
    private JournalEntryHelper journalEntryHelper;
    private SchedulerJobHelper schedulerJobHelper;

    // Test constants
    private static final String FIXED_DEPOSIT_PRODUCT_NAME = "Fixed Deposit Product";
    private static final String MINIMUM_OPENING_BALANCE = "100000.00";
    private static final String DEPOSIT_AMOUNT = "100000.00";
    private static final String NOMINAL_ANNUAL_INTEREST_RATE = "10";
    private static final String INTEREST_COMPOUNDING_PERIOD = "1"; // Daily
    private static final String INTEREST_POSTING_PERIOD = "4"; // Monthly
    private static final String INTEREST_CALCULATION_TYPE = "1"; // Daily Balance
    private static final String ACCOUNTING_RULE = "2"; // Cash-based accounting
    private static final String TERM_FREQUENCY = "12"; // 12 months
    private static final String TERM_FREQUENCY_TYPE = "2"; // Months
    private static final String LOCK_IN_PERIOD = "6"; // 6 months
    private static final String LOCK_IN_PERIOD_TYPE = "2"; // Months
    private static final String DAYS_IN_YEAR = "365";
    private static final String CLOSURE_TYPE_TRANSFER_TO_SAVINGS = "200";
    private static final String SAVINGS_PRODUCT_NAME = "Transfer Destination Savings";

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        requestSpec.header("Fineract-Platform-TenantId", "default");
        responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();

        clientHelper = new ClientHelper(requestSpec, responseSpec);
        fixedDepositAccountHelper = new FixedDepositAccountHelper(requestSpec, responseSpec);
        fixedDepositProductHelper = new FixedDepositProductHelper(requestSpec, responseSpec);
        savingsAccountHelper = new SavingsAccountHelper(requestSpec, responseSpec);
        savingsProductHelper = new SavingsProductHelper();
        accountHelper = new AccountHelper(requestSpec, responseSpec);
        journalEntryHelper = new JournalEntryHelper(requestSpec, responseSpec);
        schedulerJobHelper = new SchedulerJobHelper(requestSpec);
    }

    @Test
    @DisplayName("Test full fixed deposit account lifecycle including maturity processing")
    public void testFixedDepositAccountLifecycle() {
        // 1. Create a client
        final Integer clientId = createClient();
        LOG.info("Client created with ID: {}", clientId);

        // 2. Create a savings product (for maturity transfer)
        final Integer savingsProductId = createSavingsProduct();
        LOG.info("Savings product created with ID: {}", savingsProductId);

        // 3. Create a savings account (for maturity transfer)
        final Integer savingsId = createSavingsAccount(clientId, savingsProductId);
        LOG.info("Savings account created with ID: {}", savingsId);

        // 4. Approve and activate savings account
        approveSavingsAccount(savingsId);
        activateSavingsAccount(savingsId);
        LOG.info("Savings account activated successfully");

        // 5. Create a fixed deposit product
        final Integer fixedDepositProductId = createFixedDepositProduct();
        LOG.info("Fixed Deposit product created with ID: {}", fixedDepositProductId);

        // 6. Create a fixed deposit account
        LocalDate submittedDate = LocalDate.now();
        LocalDate maturityDate = submittedDate.plus(Integer.parseInt(TERM_FREQUENCY), ChronoUnit.MONTHS);
        
        final Integer fixedDepositAccountId = createFixedDepositAccount(clientId, fixedDepositProductId, savingsId, 
                submittedDate, maturityDate);
        LOG.info("Fixed Deposit account created with ID: {}", fixedDepositAccountId);

        // 7. Approve fixed deposit account
        approveFixedDepositAccount(fixedDepositAccountId, submittedDate);
        LOG.info("Fixed Deposit account approved successfully");

        // 8. Activate fixed deposit account
        activateFixedDepositAccount(fixedDepositAccountId, submittedDate);
        LOG.info("Fixed Deposit account activated successfully");

        // 9. Verify fixed deposit details after activation
        verifyFixedDepositDetails(fixedDepositAccountId, maturityDate);

        // 10. Apply interest and verify
        applyInterestAndVerify(fixedDepositAccountId);
        LOG.info("Interest applied and verified successfully");

        // 11. Process maturity (simulate reaching maturity date)
        processMaturityAndVerify(fixedDepositAccountId, savingsId, maturityDate);
        LOG.info("Maturity processed and verified successfully, test completed");
    }

    private Integer createClient() {
        final String dateString = Utils.dateFormatter.format(LocalDate.now());
        
        final Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest(dateString, 
                "01 January 2010"));
        assertNotNull(clientId, "Client ID should not be null");
        assertTrue(clientId > 0, "Client ID should be a positive number");
        
        return clientId;
    }

    private Integer createSavingsProduct() {
        // Create GL Accounts for savings product
        final Account assetAccount = accountHelper.createAssetAccount();
        final Account incomeAccount = accountHelper.createIncomeAccount();
        final Account expenseAccount = accountHelper.createExpenseAccount();
        final Account liabilityAccount = accountHelper.createLiabilityAccount();

        Map<String, String> financialActivityAccountMappings = new HashMap<>();

        Map<String, Object> savingsProductMap = savingsProductHelper.buildSavingsProductWithCashBasedAccounting(
                SAVINGS_PRODUCT_NAME, "5", INTEREST_COMPOUNDING_PERIOD, INTEREST_POSTING_PERIOD, 
                INTEREST_CALCULATION_TYPE, "0.00", assetAccount, liabilityAccount, expenseAccount, 
                incomeAccount, financialActivityAccountMappings);

        return savingsProductHelper.createSavingsProduct(savingsProductMap, requestSpec, responseSpec);
    }

    private Integer createSavingsAccount(final Integer clientId, final Integer savingsProductId) {
        final String submitDate = Utils.dateFormatter.format(LocalDate.now());
        
        final Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientId, savingsProductId, 
                "0.00", submitDate);
        assertNotNull(savingsId, "Savings ID should not be null");
        assertTrue(savingsId > 0, "Savings ID should be a positive number");
        
        return savingsId;
    }

    private void approveSavingsAccount(final Integer savingsId) {
        final String approvalDate = Utils.dateFormatter.format(LocalDate.now());
        HashMap<String, Object> savingsStatusHashMap = savingsAccountHelper.approveSavingsOnDate(savingsId, approvalDate);
        
        SavingsStatusChecker.verifySavingsIsApproved(savingsStatusHashMap);
    }

    private void activateSavingsAccount(final Integer savingsId) {
        final String activationDate = Utils.dateFormatter.format(LocalDate.now());
        HashMap<String, Object> savingsStatusHashMap = savingsAccountHelper.activateSavingsAccount(savingsId, activationDate);
        
        SavingsStatusChecker.verifySavingsIsActive(savingsStatusHashMap);
    }

    private Integer createFixedDepositProduct() {
        // Create GL Accounts for fixed deposit product
        final Account assetAccount = accountHelper.createAssetAccount();
        final Account incomeAccount = accountHelper.createIncomeAccount();
        final Account expenseAccount = accountHelper.createExpenseAccount();
        final Account liabilityAccount = accountHelper.createLiabilityAccount();

        LocalDate todaysDate = LocalDate.now();
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd MMMM yyyy");
        final String VALID_FROM = dateFormatter.format(todaysDate);
        final String VALID_TO = dateFormatter.format(todaysDate.plusYears(10));

        final String fixedDepositProductJSON = fixedDepositProductHelper.buildFixedDepositProductWithCashBasedAccounting(
                FIXED_DEPOSIT_PRODUCT_NAME, NOMINAL_ANNUAL_INTEREST_RATE, INTEREST_COMPOUNDING_PERIOD, INTEREST_POSTING_PERIOD,
                INTEREST_CALCULATION_TYPE, DAYS_IN_YEAR, TERM_FREQUENCY, TERM_FREQUENCY_TYPE,
                LOCK_IN_PERIOD, LOCK_IN_PERIOD_TYPE, MINIMUM_OPENING_BALANCE, VALID_FROM, VALID_TO,
                assetAccount, liabilityAccount, incomeAccount, expenseAccount);

        return fixedDepositProductHelper.createFixedDepositProduct(fixedDepositProductJSON);
    }

    private Integer createFixedDepositAccount(final Integer clientId, final Integer productId, final Integer savingsId,
            LocalDate submitDate, LocalDate maturityDate) {
        final String submitDateString = Utils.dateFormatter.format(submitDate);
        final String maturityDateString = Utils.dateFormatter.format(maturityDate);
        
        final String closureType = CLOSURE_TYPE_TRANSFER_TO_SAVINGS;
        final String transferToSavingsId = savingsId.toString();
        
        final Integer fixedDepositAccountId = fixedDepositAccountHelper.applyForFixedDepositApplication(clientId, productId, 
                DEPOSIT_AMOUNT, TERM_FREQUENCY, TERM_FREQUENCY_TYPE, submitDateString, closureType, transferToSavingsId);
        
        assertNotNull(fixedDepositAccountId, "Fixed Deposit Account ID should not be null");
        assertTrue(fixedDepositAccountId > 0, "Fixed Deposit Account ID should be a positive number");
        
        return fixedDepositAccountId;
    }

    private void approveFixedDepositAccount(final Integer fixedDepositAccountId, LocalDate approveDate) {
        final String approveDateString = Utils.dateFormatter.format(approveDate);
        HashMap<String, Object> statusHashMap = fixedDepositAccountHelper.approveFixedDeposit(fixedDepositAccountId, approveDateString);
        
        FixedDepositAccountStatusChecker.verifyFixedDepositIsApproved(statusHashMap);
    }

    private void activateFixedDepositAccount(final Integer fixedDepositAccountId, LocalDate activationDate) {
        final String activationDateString = Utils.dateFormatter.format(activationDate);
        HashMap<String, Object> statusHashMap = fixedDepositAccountHelper.activateFixedDeposit(fixedDepositAccountId, activationDateString);
        
        FixedDepositAccountStatusChecker.verifyFixedDepositIsActive(statusHashMap);
    }

    private void verifyFixedDepositDetails(final Integer fixedDepositAccountId, LocalDate expectedMaturityDate) {
        HashMap<String, Object> fixedDepositDetails = fixedDepositAccountHelper.getFixedDepositDetails(fixedDepositAccountId);
        assertNotNull(fixedDepositDetails, "Fixed Deposit details should not be null");
        
        // Verify account status is active
        HashMap<String, Object> status = (HashMap<String, Object>) fixedDepositDetails.get("status");
        assertEquals("Active", status.get("value").toString(), "Fixed Deposit account should be in Active status");
        
        // Verify deposit amount
        assertEquals(new BigDecimal(DEPOSIT_AMOUNT), BigDecimal.valueOf((Double) fixedDepositDetails.get("depositAmount")), 
                "Deposit amount should match");
        
        // Verify nominal interest rate
        assertEquals(new BigDecimal(NOMINAL_ANNUAL_INTEREST_RATE), BigDecimal.valueOf((Double) fixedDepositDetails.get("nominalAnnualInterestRate")), 
                "Nominal annual interest rate should match");
        
        // Verify maturity date - compare just the date part to handle timezone issues
        String actualMaturityDateStr = (String) fixedDepositDetails.get("maturityDate");
        LocalDate actualMaturityDate = LocalDate.parse(actualMaturityDateStr.substring(0, 10));
        assertEquals(expectedMaturityDate.toString(), actualMaturityDate.toString(), "Maturity date should match expected date");
    }

    private void applyInterestAndVerify(final Integer fixedDepositAccountId) {
        // Run interest posting scheduler job
        final String jobName = "Post Interest For Fixed Deposits";
        schedulerJobHelper.executeAndAwaitJob(jobName);
        
        // Get fixed deposit details after interest posting
        HashMap<String, Object> fixedDepositDetails = fixedDepositAccountHelper.getFixedDepositDetails(fixedDepositAccountId);
        HashMap<String, Object> summary = (HashMap<String, Object>) fixedDepositDetails.get("summary");
        Double totalInterestPosted = (Double) summary.get("totalInterestPosted");
        
        // Verify interest was posted
        assertTrue(totalInterestPosted > 0, "Interest should have been posted to the account");
        
        // Verify interest entries
        journalEntryHelper.checkJournalEntryForAssetAccount(fixedDepositAccountId, "INTEREST_POSTING");
        journalEntryHelper.checkJournalEntryForLiabilityAccount(fixedDepositAccountId, "INTEREST_POSTING");
    }

    private void processMaturityAndVerify(final Integer fixedDepositAccountId, final Integer savingsId, LocalDate maturityDate) {
        // Simulate maturity by directly posting maturity transaction
        final String maturityDateString = Utils.dateFormatter.format(maturityDate);
        HashMap<String, Object> maturityHashMap = fixedDepositAccountHelper.postFixedDepositMaturityTransaction(fixedDepositAccountId, 
                maturityDateString);
        
        assertNotNull(maturityHashMap, "Maturity response should not be null");
        
        // Verify fixed deposit account status
        HashMap<String, Object> fixedDepositDetails = fixedDepositAccountHelper.getFixedDepositDetails(fixedDepositAccountId);
        HashMap<String, Object> status = (HashMap<String, Object>) fixedDepositDetails.get("status");
        assertEquals("Matured", status.get("value").toString(), "Fixed Deposit account should be in Matured status");
        
        // Get account summaries
        HashMap<String, Object> summary = (HashMap<String, Object>) fixedDepositDetails.get("summary");
        Double maturityAmount = (Double) summary.get("maturityAmount");
        
        // Verify transfer to savings account
        HashMap<String, Object> savingsDetails = savingsAccountHelper.getSavingsDetails(savingsId);
        HashMap<String, Object> savingsSummary = (HashMap<String, Object>) savingsDetails.get("summary");
        Double savingsBalance = (Double) savingsSummary.get("accountBalance");
        
        // The maturity amount should be transferred to the savings account
        assertTrue(savingsBalance >= maturityAmount, "Savings account balance should include the maturity amount");
        
        // Verify journal entries for maturity transaction
        journalEntryHelper.checkJournalEntryForAssetAccount(fixedDepositAccountId, "MATURITY");
        journalEntryHelper.checkJournalEntryForLiabilityAccount(fixedDepositAccountId, "MATURITY");
    }
}