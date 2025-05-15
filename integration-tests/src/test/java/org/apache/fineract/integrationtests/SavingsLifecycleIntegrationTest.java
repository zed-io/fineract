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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.SchedulerJobHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.accounting.Account;
import org.apache.fineract.integrationtests.common.accounting.AccountHelper;
import org.apache.fineract.integrationtests.common.accounting.JournalEntryHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsProductHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsStatusChecker;
import org.apache.fineract.integrationtests.common.savings.SavingsTransactionData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Integration test for the savings account lifecycle: Client creation -> Savings account creation -> 
 * Approval -> Activation -> Deposit -> Withdrawal -> Interest posting.
 * This tests the end-to-end flow of savings operations with multiple validations along the way.
 */
public class SavingsLifecycleIntegrationTest {

    private static final Logger LOG = LoggerFactory.getLogger(SavingsLifecycleIntegrationTest.class);

    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private ClientHelper clientHelper;
    private SavingsAccountHelper savingsAccountHelper;
    private SavingsProductHelper savingsProductHelper;
    private AccountHelper accountHelper;
    private JournalEntryHelper journalEntryHelper;
    private SchedulerJobHelper schedulerJobHelper;

    // Test constants
    private static final String SAVINGS_PRODUCT_NAME = "Regular Savings";
    private static final String MINIMUM_OPENING_BALANCE = "1000.00";
    private static final String NOMINAL_ANNUAL_INTEREST_RATE = "5";
    private static final String INTEREST_COMPOUNDING_PERIOD = "1"; // Daily
    private static final String INTEREST_POSTING_PERIOD = "4"; // Monthly
    private static final String INTEREST_CALCULATION_TYPE = "1"; // Daily Balance
    private static final String ACCOUNTING_RULE = "2"; // Cash-based accounting
    private static final String DEPOSIT_AMOUNT = "5000";
    private static final String WITHDRAWAL_AMOUNT = "2000";

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        requestSpec.header("Fineract-Platform-TenantId", "default");
        responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();

        clientHelper = new ClientHelper(requestSpec, responseSpec);
        savingsAccountHelper = new SavingsAccountHelper(requestSpec, responseSpec);
        savingsProductHelper = new SavingsProductHelper();
        accountHelper = new AccountHelper(requestSpec, responseSpec);
        journalEntryHelper = new JournalEntryHelper(requestSpec, responseSpec);
        schedulerJobHelper = new SchedulerJobHelper(requestSpec);
    }

    @Test
    @DisplayName("Test full savings account lifecycle including interest posting")
    public void testSavingsAccountLifecycle() {
        // 1. Create a client
        final Integer clientId = createClient();
        LOG.info("Client created with ID: {}", clientId);

        // 2. Create a savings product
        final Integer savingsProductId = createSavingsProduct();
        LOG.info("Savings product created with ID: {}", savingsProductId);

        // 3. Create a savings account
        final Integer savingsId = createSavingsAccount(clientId, savingsProductId);
        LOG.info("Savings account created with ID: {}", savingsId);

        // 4. Approve savings account
        approveSavingsAccount(savingsId);
        LOG.info("Savings account approved successfully");

        // 5. Activate savings account
        activateSavingsAccount(savingsId);
        LOG.info("Savings account activated successfully");

        // 6. Verify savings account details after activation
        verifySavingsDetails(savingsId);

        // 7. Make deposit to savings account
        makeDeposit(savingsId);
        LOG.info("Deposit to savings account completed successfully");

        // 8. Make withdrawal from savings account
        makeWithdrawal(savingsId);
        LOG.info("Withdrawal from savings account completed successfully");

        // 9. Post interest and verify
        postInterestAndVerify(savingsId);
        LOG.info("Interest posting completed and verified successfully");
        
        // 10. Verify transaction history
        verifyTransactionHistory(savingsId);
        LOG.info("Transaction history verified successfully, test completed");
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
                SAVINGS_PRODUCT_NAME, NOMINAL_ANNUAL_INTEREST_RATE, INTEREST_COMPOUNDING_PERIOD, INTEREST_POSTING_PERIOD, 
                INTEREST_CALCULATION_TYPE, MINIMUM_OPENING_BALANCE, assetAccount, liabilityAccount, expenseAccount, 
                incomeAccount, financialActivityAccountMappings);

        return savingsProductHelper.createSavingsProduct(savingsProductMap, requestSpec, responseSpec);
    }

    private Integer createSavingsAccount(final Integer clientId, final Integer savingsProductId) {
        final String submitDate = Utils.dateFormatter.format(LocalDate.now());
        
        final Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientId, savingsProductId, 
                MINIMUM_OPENING_BALANCE, submitDate);
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

    private void verifySavingsDetails(final Integer savingsId) {
        HashMap<String, Object> savingsDetails = savingsAccountHelper.getSavingsDetails(savingsId);
        assertNotNull(savingsDetails, "Savings details should not be null");
        
        // Verify account status is active
        HashMap<String, Object> status = (HashMap<String, Object>) savingsDetails.get("status");
        assertEquals("Active", status.get("value").toString(), "Savings account should be in Active status");
        
        // Verify minimum opening balance
        assertEquals(new BigDecimal(MINIMUM_OPENING_BALANCE), BigDecimal.valueOf((Double) savingsDetails.get("minRequiredOpeningBalance")), 
                "Minimum opening balance should match");
        
        // Verify nominal interest rate
        assertEquals(new BigDecimal(NOMINAL_ANNUAL_INTEREST_RATE), BigDecimal.valueOf((Double) savingsDetails.get("nominalAnnualInterestRate")), 
                "Nominal annual interest rate should match");
    }

    private void makeDeposit(final Integer savingsId) {
        final String transactionDate = Utils.dateFormatter.format(LocalDate.now());
        HashMap<String, Object> depositMap = savingsAccountHelper.depositToSavingsAccount(savingsId, DEPOSIT_AMOUNT, transactionDate, 
                "Deposit to savings account");
        
        assertNotNull(depositMap, "Deposit response should not be null");
        assertEquals("Deposit", depositMap.get("transactionType").toString(), "Transaction type should be Deposit");
        
        // Verify account balance after deposit
        HashMap<String, Object> savingsDetails = savingsAccountHelper.getSavingsDetails(savingsId);
        HashMap<String, Object> summary = (HashMap<String, Object>) savingsDetails.get("summary");
        Double accountBalance = (Double) summary.get("accountBalance");
        
        // Expected balance = minimum opening balance + deposit amount
        Double expectedBalance = Double.parseDouble(MINIMUM_OPENING_BALANCE) + Double.parseDouble(DEPOSIT_AMOUNT);
        assertEquals(expectedBalance, accountBalance, 0.001, "Account balance after deposit should match expected amount");
    }

    private void makeWithdrawal(final Integer savingsId) {
        final String transactionDate = Utils.dateFormatter.format(LocalDate.now());
        HashMap<String, Object> withdrawalMap = savingsAccountHelper.withdrawalFromSavingsAccount(savingsId, WITHDRAWAL_AMOUNT, 
                transactionDate, "Withdrawal from savings account");
        
        assertNotNull(withdrawalMap, "Withdrawal response should not be null");
        assertEquals("Withdrawal", withdrawalMap.get("transactionType").toString(), "Transaction type should be Withdrawal");
        
        // Verify account balance after withdrawal
        HashMap<String, Object> savingsDetails = savingsAccountHelper.getSavingsDetails(savingsId);
        HashMap<String, Object> summary = (HashMap<String, Object>) savingsDetails.get("summary");
        Double accountBalance = (Double) summary.get("accountBalance");
        
        // Expected balance = minimum opening balance + deposit amount - withdrawal amount
        Double expectedBalance = Double.parseDouble(MINIMUM_OPENING_BALANCE) + Double.parseDouble(DEPOSIT_AMOUNT) 
                - Double.parseDouble(WITHDRAWAL_AMOUNT);
        assertEquals(expectedBalance, accountBalance, 0.001, "Account balance after withdrawal should match expected amount");
    }

    private void postInterestAndVerify(final Integer savingsId) {
        // Run interest posting scheduler job
        final String jobName = "Post Interest For Savings";
        schedulerJobHelper.executeAndAwaitJob(jobName);
        
        // Get savings details after interest posting
        HashMap<String, Object> savingsDetails = savingsAccountHelper.getSavingsDetails(savingsId);
        HashMap<String, Object> summary = (HashMap<String, Object>) savingsDetails.get("summary");
        Double totalInterestPosted = (Double) summary.get("totalInterestPosted");
        
        // Verify interest was posted
        assertTrue(totalInterestPosted > 0, "Interest should have been posted to the account");
        
        // Verify journal entries for interest posting
        journalEntryHelper.checkJournalEntryForIncomeAccount(savingsId, "INTEREST_POSTING");
        journalEntryHelper.checkJournalEntryForLiabilityAccount(savingsId, "INTEREST_POSTING");
    }

    private void verifyTransactionHistory(final Integer savingsId) {
        // Get transaction history
        ArrayList<HashMap<String, Object>> transactions = savingsAccountHelper.getSavingsTransactions(savingsId);
        assertNotNull(transactions, "Transaction history should not be null");
        
        // Verify at least three transactions exist (deposit, withdrawal, interest posting)
        assertTrue(transactions.size() >= 3, "Should have at least 3 transactions");
        
        // Verify transaction types - we need to find all expected transaction types in the history
        boolean hasDeposit = false;
        boolean hasWithdrawal = false;
        boolean hasInterestPosting = false;
        
        for (HashMap<String, Object> transaction : transactions) {
            String transactionType = (String) transaction.get("transactionType");
            if ("Deposit".equals(transactionType)) {
                hasDeposit = true;
            } else if ("Withdrawal".equals(transactionType)) {
                hasWithdrawal = true;
            } else if ("Interest Posting".equals(transactionType)) {
                hasInterestPosting = true;
            }
        }
        
        assertTrue(hasDeposit, "Transaction history should contain a deposit");
        assertTrue(hasWithdrawal, "Transaction history should contain a withdrawal");
        assertTrue(hasInterestPosting, "Transaction history should contain an interest posting");
    }
}