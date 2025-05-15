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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.apache.fineract.integrationtests.common.BatchHelper;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.CommonConstants;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsProductHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Performance tests for interest calculation engine focusing on high volume scenarios.
 */
@Tag("performance")
public class InterestCalculationPerformanceTest {

    private static final Logger LOG = LoggerFactory.getLogger(InterestCalculationPerformanceTest.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");
    
    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private SavingsAccountHelper savingsAccountHelper;
    private SavingsProductHelper savingsProductHelper;
    private ClientHelper clientHelper;
    
    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        this.requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        this.requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        this.responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();
        
        this.savingsAccountHelper = new SavingsAccountHelper(this.requestSpec, this.responseSpec);
        this.savingsProductHelper = new SavingsProductHelper();
        this.clientHelper = new ClientHelper(this.requestSpec, this.responseSpec);
    }
    
    @Test
    @DisplayName("Performance Test: Large Number of Savings Accounts")
    public void testInterestCalculationPerformanceWithLargeNumberOfAccounts() {
        final int NUM_ACCOUNTS = 50; // Adjust based on test environment capacity
        
        // Create a savings product for the test
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        assertNotNull(savingsProductID);
        
        LOG.info("Creating {} savings accounts for performance testing", NUM_ACCOUNTS);
        
        // Create clients and savings accounts
        List<Integer> savingsAccountIds = new ArrayList<>();
        for (int i = 0; i < NUM_ACCOUNTS; i++) {
            // Create client
            Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
            
            // Create savings account
            Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "1000", false);
            
            // Approve and activate
            savingsAccountHelper.approveSavingsOnDate(savingsId, "01 January 2023");
            savingsAccountHelper.activateSavingsAccount(savingsId, "01 January 2023");
            
            // Make deposit
            savingsAccountHelper.depositToSavingsAccount(savingsId, "10000", "01 January 2023", CommonConstants.RESPONSE_RESOURCE_ID);
            
            savingsAccountIds.add(savingsId);
            
            if (i % 10 == 0) {
                LOG.info("Created {} accounts so far", i);
            }
        }
        
        LOG.info("All {} accounts created successfully", NUM_ACCOUNTS);
        
        // Measure time taken for interest posting
        LocalDate postingDate = LocalDate.of(2023, 1, 31);
        
        LOG.info("Starting interest calculation and posting for {} accounts", NUM_ACCOUNTS);
        long startTime = System.nanoTime();
        
        performInterestPosting(postingDate);
        
        long endTime = System.nanoTime();
        long durationMillis = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        LOG.info("Interest posting for {} accounts completed in {} milliseconds", NUM_ACCOUNTS, durationMillis);
        LOG.info("Average time per account: {} milliseconds", durationMillis / NUM_ACCOUNTS);
        
        // Simple performance assertion - adjust threshold as needed based on environment
        long maxAcceptableTimePerAccount = 500; // milliseconds
        assertTrue(durationMillis / NUM_ACCOUNTS < maxAcceptableTimePerAccount, 
                   "Average time per account should be less than " + maxAcceptableTimePerAccount + "ms");
    }
    
    @Test
    @DisplayName("Performance Test: Account with Many Transactions")
    public void testInterestCalculationPerformanceWithManyTransactions() {
        final int NUM_TRANSACTIONS = 100; // Adjust based on test environment
        
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create savings product
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        
        // Create savings account
        Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "1000", false);
        
        // Approve and activate
        savingsAccountHelper.approveSavingsOnDate(savingsId, "01 January 2023");
        savingsAccountHelper.activateSavingsAccount(savingsId, "01 January 2023");
        
        // Initial deposit
        savingsAccountHelper.depositToSavingsAccount(savingsId, "100000", "01 January 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        
        LOG.info("Creating {} transactions for performance testing", NUM_TRANSACTIONS);
        
        // Create many transactions
        LocalDate currentDate = LocalDate.of(2023, 1, 2);
        for (int i = 0; i < NUM_TRANSACTIONS; i++) {
            // Alternate deposits and withdrawals
            if (i % 2 == 0) {
                savingsAccountHelper.depositToSavingsAccount(savingsId, "1000", 
                        currentDate.format(DATE_FORMATTER), CommonConstants.RESPONSE_RESOURCE_ID);
            } else {
                savingsAccountHelper.withdrawalFromSavingsAccount(savingsId, "500", 
                        currentDate.format(DATE_FORMATTER), CommonConstants.RESPONSE_RESOURCE_ID);
            }
            
            // Advance the date
            currentDate = currentDate.plusDays(1);
            
            if (i % 20 == 0) {
                LOG.info("Created {} transactions so far", i);
            }
        }
        
        LOG.info("All {} transactions created successfully", NUM_TRANSACTIONS);
        
        // Measure time taken for interest calculation
        LocalDate postingDate = LocalDate.of(2023, 1, 31);
        
        LOG.info("Starting interest calculation and posting for account with {} transactions", NUM_TRANSACTIONS);
        long startTime = System.nanoTime();
        
        performInterestPosting(postingDate);
        
        long endTime = System.nanoTime();
        long durationMillis = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        LOG.info("Interest posting for account with {} transactions completed in {} milliseconds", 
                NUM_TRANSACTIONS, durationMillis);
        
        // Simple performance assertion
        long maxAcceptableTime = 10000; // 10 seconds, adjust based on environment
        assertTrue(durationMillis < maxAcceptableTime, 
                   "Interest calculation with many transactions should complete in less than " + maxAcceptableTime + "ms");
    }
    
    @Test
    @DisplayName("Performance Test: Batch Interest Calculation")
    public void testBatchInterestCalculationPerformance() {
        final int NUM_ACCOUNTS = 20; // Adjust based on test environment
        
        // Create a savings product for the test
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        
        // Create clients and savings accounts
        List<Integer> savingsAccountIds = new ArrayList<>();
        for (int i = 0; i < NUM_ACCOUNTS; i++) {
            Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
            Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "1000", false);
            
            savingsAccountHelper.approveSavingsOnDate(savingsId, "01 February 2023");
            savingsAccountHelper.activateSavingsAccount(savingsId, "01 February 2023");
            savingsAccountHelper.depositToSavingsAccount(savingsId, "10000", "01 February 2023", CommonConstants.RESPONSE_RESOURCE_ID);
            
            savingsAccountIds.add(savingsId);
        }
        
        // Prepare batch request for interest posting
        List<BatchHelper.BatchRequest> batchRequests = new ArrayList<>();
        
        for (Integer savingsId : savingsAccountIds) {
            BatchHelper.BatchRequest request = BatchHelper.postInterestAsJSON(savingsId.longValue(), "28 February 2023");
            batchRequests.add(request);
        }
        
        // Execute batch requests and measure performance
        LOG.info("Starting batch interest posting for {} accounts", NUM_ACCOUNTS);
        long startTime = System.nanoTime();
        
        List<BatchHelper.BatchResponse> responses = BatchHelper.postBatchRequestsWithoutEnclosingTransaction(requestSpec, responseSpec, batchRequests);
        
        long endTime = System.nanoTime();
        long durationMillis = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        LOG.info("Batch interest posting for {} accounts completed in {} milliseconds", NUM_ACCOUNTS, durationMillis);
        LOG.info("Average time per account in batch mode: {} milliseconds", durationMillis / NUM_ACCOUNTS);
        
        // Verify all requests succeeded
        for (BatchHelper.BatchResponse response : responses) {
            assertTrue(response.getStatusCode() == 200, "Batch request should be successful");
        }
        
        // Performance comparison with individual requests
        LOG.info("Starting individual interest posting for comparison");
        long startTimeIndividual = System.nanoTime();
        
        performInterestPosting(LocalDate.of(2023, 2, 28));
        
        long endTimeIndividual = System.nanoTime();
        long durationMillisIndividual = TimeUnit.NANOSECONDS.toMillis(endTimeIndividual - startTimeIndividual);
        
        LOG.info("Individual interest posting completed in {} milliseconds", durationMillisIndividual);
        
        // Batch should be faster
        assertTrue(durationMillis < durationMillisIndividual, 
                "Batch interest posting should be faster than individual posting");
    }
    
    @Test
    @DisplayName("Performance Test: Long Period Interest Calculation")
    public void testInterestCalculationPerformanceForLongPeriod() {
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create savings product with annual posting
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeAnnual() // Annual posting
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        
        // Create savings account
        Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "1000", false);
        
        // Approve and activate one year ago
        LocalDate oneYearAgo = LocalDate.now().minusYears(1);
        String activationDate = oneYearAgo.format(DATE_FORMATTER);
        
        savingsAccountHelper.approveSavingsOnDate(savingsId, activationDate);
        savingsAccountHelper.activateSavingsAccount(savingsId, activationDate);
        
        // Make initial deposit
        savingsAccountHelper.depositToSavingsAccount(savingsId, "10000", activationDate, CommonConstants.RESPONSE_RESOURCE_ID);
        
        // Create a few transactions throughout the year
        LocalDate transactionDate = oneYearAgo.plusMonths(1);
        savingsAccountHelper.depositToSavingsAccount(savingsId, "5000", 
                transactionDate.format(DATE_FORMATTER), CommonConstants.RESPONSE_RESOURCE_ID);
        
        transactionDate = oneYearAgo.plusMonths(3);
        savingsAccountHelper.withdrawalFromSavingsAccount(savingsId, "2000", 
                transactionDate.format(DATE_FORMATTER), CommonConstants.RESPONSE_RESOURCE_ID);
        
        transactionDate = oneYearAgo.plusMonths(6);
        savingsAccountHelper.depositToSavingsAccount(savingsId, "3000", 
                transactionDate.format(DATE_FORMATTER), CommonConstants.RESPONSE_RESOURCE_ID);
        
        transactionDate = oneYearAgo.plusMonths(9);
        savingsAccountHelper.withdrawalFromSavingsAccount(savingsId, "1000", 
                transactionDate.format(DATE_FORMATTER), CommonConstants.RESPONSE_RESOURCE_ID);
        
        // Set posting date to today
        LocalDate postingDate = LocalDate.now();
        
        // Measure performance for one year interest calculation
        LOG.info("Starting interest calculation for one-year period");
        long startTime = System.nanoTime();
        
        HashMap<String, String> map = new HashMap<>();
        map.put("locale", "en");
        map.put("dateFormat", "dd MMMM yyyy");
        map.put("transactionDate", postingDate.format(DATE_FORMATTER));
        map.put("savingsId", savingsId.toString());
        
        String postInterestUrl = "/fineract-provider/api/v1/savingsaccounts/" + savingsId + "/transactions/postInterest?" + Utils.TENANT_IDENTIFIER;
        Utils.performServerPost(this.requestSpec, this.responseSpec, postInterestUrl, new Gson().toJson(map), null);
        
        long endTime = System.nanoTime();
        long durationMillis = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        LOG.info("One-year interest calculation completed in {} milliseconds", durationMillis);
        
        // Performance threshold
        long maxAcceptableTime = 5000; // 5 seconds, adjust based on environment
        assertTrue(durationMillis < maxAcceptableTime, 
                   "One-year interest calculation should complete in less than " + maxAcceptableTime + "ms");
    }
    
    /**
     * Helper method to trigger interest posting via API for all accounts
     */
    private void performInterestPosting(LocalDate postingDate) {
        final HashMap<String, String> map = new HashMap<>();
        map.put("locale", "en");
        map.put("dateFormat", "dd MMMM yyyy");
        map.put("transactionDate", postingDate.format(DATE_FORMATTER));
        
        String savingsInterestPostingURL = "/fineract-provider/api/v1/savingsaccount/postInterest?" + Utils.TENANT_IDENTIFIER;
        Utils.performServerPost(this.requestSpec, this.responseSpec, savingsInterestPostingURL, new Gson().toJson(map), null);
    }
    
    /**
     * Test helper for JSON serialization
     */
    private static class Gson {
        public String toJson(Object obj) {
            com.google.gson.Gson gson = new com.google.gson.Gson();
            return gson.toJson(obj);
        }
    }
}