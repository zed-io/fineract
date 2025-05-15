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

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.CommonConstants;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsProductHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Validation tests that compare interest calculation results with expected reference calculations.
 */
public class InterestCalculationReferenceTest {

    private static final Logger LOG = LoggerFactory.getLogger(InterestCalculationReferenceTest.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");
    
    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private SavingsAccountHelper savingsAccountHelper;
    private SavingsProductHelper savingsProductHelper;
    private ClientHelper clientHelper;
    
    // Constants for reference calculations
    private static final BigDecimal DEFAULT_INTEREST_RATE = new BigDecimal("0.05"); // 5% annual interest rate
    private static final int DAYS_IN_YEAR = 365;
    
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
    
    /**
     * Simple model for a transaction in reference calculations
     */
    private static class Transaction {
        final LocalDate date;
        final BigDecimal amount;
        final boolean isDeposit;
        
        Transaction(LocalDate date, BigDecimal amount, boolean isDeposit) {
            this.date = date;
            this.amount = amount;
            this.isDeposit = isDeposit;
        }
    }
    
    /**
     * Model for reference test cases
     */
    private static class ReferenceTestCase {
        final String name;
        final List<Transaction> transactions;
        final LocalDate startDate;
        final LocalDate endDate;
        final boolean useAverageDailyBalance;
        final BigDecimal minimumBalance;
        final BigDecimal expectedInterest;
        
        ReferenceTestCase(String name, List<Transaction> transactions, 
                           LocalDate startDate, LocalDate endDate, 
                           boolean useAverageDailyBalance, 
                           BigDecimal minimumBalance,
                           BigDecimal expectedInterest) {
            this.name = name;
            this.transactions = transactions;
            this.startDate = startDate;
            this.endDate = endDate;
            this.useAverageDailyBalance = useAverageDailyBalance;
            this.minimumBalance = minimumBalance;
            this.expectedInterest = expectedInterest;
        }
    }
    
    /**
     * Provides a stream of test cases for parameterized tests
     */
    private static Stream<Arguments> referenceTestCases() {
        List<ReferenceTestCase> testCases = new ArrayList<>();
        
        // Test case 1: Simple daily balance calculation
        // Initial balance: 10000
        // Period: 30 days
        // Interest = 10000 * 0.05 * (30/365) = 41.10
        LocalDate startDate1 = LocalDate.of(2023, 1, 1);
        LocalDate endDate1 = LocalDate.of(2023, 1, 30);
        List<Transaction> transactions1 = Arrays.asList(
            new Transaction(startDate1, new BigDecimal("10000.00"), true)
        );
        ReferenceTestCase case1 = new ReferenceTestCase(
            "Simple Daily Balance",
            transactions1,
            startDate1,
            endDate1,
            false, // daily balance
            BigDecimal.ZERO, // no minimum balance
            new BigDecimal("41.10") // expected interest
        );
        testCases.add(case1);
        
        // Test case 2: Average daily balance with changing balances
        // Initial balance: 5000
        // Day 10: +3000 (new balance 8000)
        // Day 20: -2000 (new balance 6000)
        // Average daily balance = (5000*9 + 8000*10 + 6000*11) / 30 = 6333.33
        // Interest = 6333.33 * 0.05 * (30/365) = 26.03
        LocalDate startDate2 = LocalDate.of(2023, 2, 1);
        LocalDate endDate2 = LocalDate.of(2023, 2, 28);
        List<Transaction> transactions2 = Arrays.asList(
            new Transaction(startDate2, new BigDecimal("5000.00"), true),
            new Transaction(startDate2.plusDays(9), new BigDecimal("3000.00"), true),
            new Transaction(startDate2.plusDays(19), new BigDecimal("2000.00"), false)
        );
        ReferenceTestCase case2 = new ReferenceTestCase(
            "Average Daily Balance with Changes",
            transactions2,
            startDate2,
            endDate2,
            true, // average daily balance
            BigDecimal.ZERO, // no minimum balance
            new BigDecimal("26.03") // expected interest
        );
        testCases.add(case2);
        
        // Test case 3: Daily balance with minimum balance requirement
        // Initial balance: 800
        // Day 10: +500 (new balance 1300) - now above minimum
        // Day 20: -800 (new balance 500) - now below minimum
        // Interest only for days 10-19 (10 days) when balance is above minimum
        // Interest = 1300 * 0.05 * (10/365) = 1.78
        LocalDate startDate3 = LocalDate.of(2023, 3, 1);
        LocalDate endDate3 = LocalDate.of(2023, 3, 30);
        List<Transaction> transactions3 = Arrays.asList(
            new Transaction(startDate3, new BigDecimal("800.00"), true),
            new Transaction(startDate3.plusDays(9), new BigDecimal("500.00"), true),
            new Transaction(startDate3.plusDays(19), new BigDecimal("800.00"), false)
        );
        ReferenceTestCase case3 = new ReferenceTestCase(
            "Daily Balance with Minimum Requirement",
            transactions3,
            startDate3,
            endDate3,
            false, // daily balance
            new BigDecimal("1000.00"), // minimum balance
            new BigDecimal("1.78") // expected interest
        );
        testCases.add(case3);
        
        // Test case 4: Many small daily transactions
        // Initial balance: 10000
        // Then daily deposits of 100 for 30 days
        // Final balance: 13000
        // Average daily balance with linear growth = (10000 + 13000) / 2 = 11500
        // Interest = 11500 * 0.05 * (30/365) = 47.26
        LocalDate startDate4 = LocalDate.of(2023, 4, 1);
        LocalDate endDate4 = LocalDate.of(2023, 4, 30);
        List<Transaction> transactions4 = new ArrayList<>();
        transactions4.add(new Transaction(startDate4, new BigDecimal("10000.00"), true));
        
        for (int i = 1; i <= 30; i++) {
            transactions4.add(new Transaction(startDate4.plusDays(i-1), new BigDecimal("100.00"), true));
        }
        
        ReferenceTestCase case4 = new ReferenceTestCase(
            "Many Small Daily Transactions",
            transactions4,
            startDate4,
            endDate4,
            true, // average daily balance
            BigDecimal.ZERO, // no minimum balance
            new BigDecimal("47.26") // expected interest
        );
        testCases.add(case4);
        
        // Test case 5: Full year calculation with quarterly transactions
        // Initial balance: 10000
        // Q1: +2000 (new balance 12000)
        // Q2: -3000 (new balance 9000)
        // Q3: +5000 (new balance 14000)
        // Interest calculation will be long
        LocalDate startDate5 = LocalDate.of(2023, 1, 1);
        LocalDate endDate5 = LocalDate.of(2023, 12, 31);
        List<Transaction> transactions5 = Arrays.asList(
            new Transaction(startDate5, new BigDecimal("10000.00"), true),
            new Transaction(startDate5.plusMonths(3), new BigDecimal("2000.00"), true),
            new Transaction(startDate5.plusMonths(6), new BigDecimal("3000.00"), false),
            new Transaction(startDate5.plusMonths(9), new BigDecimal("5000.00"), true)
        );
        
        // Manual calculation:
        // Days in Q1 with 10000: 90 days
        // Days in Q2 with 12000: 91 days
        // Days in Q3 with 9000: 92 days
        // Days in Q4 with 14000: 92 days
        // Interest = (10000*90 + 12000*91 + 9000*92 + 14000*92) / 365 * 0.05 = 572.88
        ReferenceTestCase case5 = new ReferenceTestCase(
            "Full Year with Quarterly Transactions",
            transactions5,
            startDate5,
            endDate5,
            false, // daily balance
            BigDecimal.ZERO, // no minimum balance
            new BigDecimal("572.88") // expected interest
        );
        testCases.add(case5);
        
        return testCases.stream().map(testCase -> 
            Arguments.of(
                testCase.name,
                testCase.transactions,
                testCase.startDate,
                testCase.endDate,
                testCase.useAverageDailyBalance,
                testCase.minimumBalance,
                testCase.expectedInterest
            )
        );
    }
    
    @ParameterizedTest(name = "{0}")
    @MethodSource("referenceTestCases")
    @DisplayName("Reference Test: Compare with External Calculations")
    public void testAgainstReferenceCalculations(
            String testName,
            List<Transaction> transactions,
            LocalDate startDate,
            LocalDate endDate,
            boolean useAverageDailyBalance,
            BigDecimal minimumBalance,
            BigDecimal expectedInterest) {
            
        LOG.info("Running reference test: {}", testName);
        
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create savings product with the appropriate interest calculation type
        SavingsProductHelper productHelper = savingsProductHelper;
        if (useAverageDailyBalance) {
            productHelper = productHelper.withInterestCalculationTypeAverageDailyBalance();
        } else {
            productHelper = productHelper.withInterestCalculationTypeDailyBalance();
        }
        
        String savingsProductJSON = productHelper
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily();
                
        // Add minimum balance if specified
        if (minimumBalance.compareTo(BigDecimal.ZERO) > 0) {
            savingsProductJSON = productHelper.withMinBalanceForInterestCalculation(minimumBalance.toString())
                    .build();
        } else {
            savingsProductJSON = productHelper.build();
        }
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        
        // Create savings account
        Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "0", false);
        
        // Approve and activate account
        savingsAccountHelper.approveSavingsOnDate(savingsId, startDate.format(DATE_FORMATTER));
        savingsAccountHelper.activateSavingsAccount(savingsId, startDate.format(DATE_FORMATTER));
        
        // Process all transactions
        for (Transaction transaction : transactions) {
            if (transaction.isDeposit) {
                savingsAccountHelper.depositToSavingsAccount(
                    savingsId, 
                    transaction.amount.toString(), 
                    transaction.date.format(DATE_FORMATTER), 
                    CommonConstants.RESPONSE_RESOURCE_ID
                );
            } else {
                savingsAccountHelper.withdrawalFromSavingsAccount(
                    savingsId, 
                    transaction.amount.toString(), 
                    transaction.date.format(DATE_FORMATTER), 
                    CommonConstants.RESPONSE_RESOURCE_ID
                );
            }
        }
        
        // Run interest posting for the end date
        final HashMap<String, String> map = new HashMap<>();
        map.put("locale", "en");
        map.put("dateFormat", "dd MMMM yyyy");
        map.put("transactionDate", endDate.format(DATE_FORMATTER));
        map.put("savingsId", savingsId.toString());
        
        String postInterestUrl = "/fineract-provider/api/v1/savingsaccounts/" + savingsId + "/transactions/postInterest?" + Utils.TENANT_IDENTIFIER;
        Utils.performServerPost(this.requestSpec, this.responseSpec, postInterestUrl, new Gson().toJson(map), null);
        
        // Retrieve actual interest posted
        HashMap<String, Object> summary = savingsAccountHelper.getSavingsSummary(savingsId);
        Double actualInterest = (Double) summary.get("totalInterestPosted");
        
        LOG.info("Reference calculation expected: {}, Actual posted: {}", expectedInterest, actualInterest);
        
        // Verify interest matches expected reference calculation
        // Allow a small tolerance (0.01) for rounding differences
        assertEquals(
            expectedInterest.doubleValue(), 
            actualInterest, 
            0.01, 
            "Interest calculation should match reference value for test: " + testName
        );
    }
    
    @Test
    @DisplayName("Reference Test: Daily Interest Accrual")
    public void testDailyInterestAccrual() {
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create savings product
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        
        // Create savings account
        Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "0", false);
        
        // Approve and activate account
        LocalDate startDate = LocalDate.of(2023, 5, 1);
        savingsAccountHelper.approveSavingsOnDate(savingsId, startDate.format(DATE_FORMATTER));
        savingsAccountHelper.activateSavingsAccount(savingsId, startDate.format(DATE_FORMATTER));
        
        // Make a deposit
        BigDecimal depositAmount = new BigDecimal("10000.00");
        savingsAccountHelper.depositToSavingsAccount(
            savingsId, 
            depositAmount.toString(), 
            startDate.format(DATE_FORMATTER), 
            CommonConstants.RESPONSE_RESOURCE_ID
        );
        
        // Calculate expected daily interest accrual manually
        // Daily interest = 10000 * 0.05 / 365 = 1.3699 per day
        BigDecimal dailyInterestRate = DEFAULT_INTEREST_RATE.divide(new BigDecimal(DAYS_IN_YEAR), 10, RoundingMode.HALF_EVEN);
        BigDecimal expectedDailyAccrual = depositAmount.multiply(dailyInterestRate);
        
        LOG.info("Expected daily interest accrual: {}", expectedDailyAccrual);
        
        // Get interest accrued after a few days (let's check day 15)
        LocalDate accrualDate = startDate.plusDays(15);
        BigDecimal expectedAccruedAmount = expectedDailyAccrual.multiply(new BigDecimal("15"));
        
        // Calculate the interest accrued by posting and then checking summary
        final HashMap<String, String> map = new HashMap<>();
        map.put("locale", "en");
        map.put("dateFormat", "dd MMMM yyyy");
        map.put("transactionDate", accrualDate.format(DATE_FORMATTER));
        map.put("savingsId", savingsId.toString());
        
        String postInterestUrl = "/fineract-provider/api/v1/savingsaccounts/" + savingsId + "/transactions/postInterest?" + Utils.TENANT_IDENTIFIER;
        Utils.performServerPost(this.requestSpec, this.responseSpec, postInterestUrl, new Gson().toJson(map), null);
        
        // Get actual interest accrued
        HashMap<String, Object> summary = savingsAccountHelper.getSavingsSummary(savingsId);
        Double actualInterest = (Double) summary.get("totalInterestPosted");
        
        LOG.info("Expected accrued interest after 15 days: {}, Actual posted: {}", 
                expectedAccruedAmount.setScale(2, RoundingMode.HALF_EVEN), actualInterest);
        
        // Verify with a small tolerance
        assertEquals(
            expectedAccruedAmount.setScale(2, RoundingMode.HALF_EVEN).doubleValue(), 
            actualInterest, 
            0.01, 
            "Daily interest accrual should match reference calculation"
        );
    }
    
    @Test
    @DisplayName("Reference Test: Compound Interest Effect")
    public void testCompoundInterestEffect() {
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create two identical savings products with different compounding frequencies
        final String dailyCompoundProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        final String yearlyCompoundProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeAnnual() // Annual compounding
                .build();
        
        Integer dailyCompoundProductID = savingsProductHelper.createSavingsProduct(dailyCompoundProductJSON, requestSpec, responseSpec);
        Integer yearlyCompoundProductID = savingsProductHelper.createSavingsProduct(yearlyCompoundProductJSON, requestSpec, responseSpec);
        
        // Create two savings accounts
        Integer dailyCompoundSavingsId = savingsAccountHelper.applyForSavingsApplication(clientID, dailyCompoundProductID, "0", false);
        Integer yearlyCompoundSavingsId = savingsAccountHelper.applyForSavingsApplication(clientID, yearlyCompoundProductID, "0", false);
        
        // Start date - beginning of a year for simplicity
        LocalDate startDate = LocalDate.of(2023, 1, 1);
        
        // Approve and activate both accounts
        savingsAccountHelper.approveSavingsOnDate(dailyCompoundSavingsId, startDate.format(DATE_FORMATTER));
        savingsAccountHelper.activateSavingsAccount(dailyCompoundSavingsId, startDate.format(DATE_FORMATTER));
        
        savingsAccountHelper.approveSavingsOnDate(yearlyCompoundSavingsId, startDate.format(DATE_FORMATTER));
        savingsAccountHelper.activateSavingsAccount(yearlyCompoundSavingsId, startDate.format(DATE_FORMATTER));
        
        // Make identical deposits to both accounts
        BigDecimal depositAmount = new BigDecimal("10000.00");
        savingsAccountHelper.depositToSavingsAccount(
            dailyCompoundSavingsId, 
            depositAmount.toString(), 
            startDate.format(DATE_FORMATTER), 
            CommonConstants.RESPONSE_RESOURCE_ID
        );
        
        savingsAccountHelper.depositToSavingsAccount(
            yearlyCompoundSavingsId, 
            depositAmount.toString(), 
            startDate.format(DATE_FORMATTER), 
            CommonConstants.RESPONSE_RESOURCE_ID
        );
        
        // Let's run for a full year
        LocalDate endDate = startDate.plusYears(1).minusDays(1); // Dec 31
        
        // Post interest monthly for both accounts for the entire year
        for (int month = 1; month <= 12; month++) {
            LocalDate postingDate = startDate.plusMonths(month).minusDays(1);
            
            // Post interest for both accounts
            for (Integer savingsId : Arrays.asList(dailyCompoundSavingsId, yearlyCompoundSavingsId)) {
                final HashMap<String, String> map = new HashMap<>();
                map.put("locale", "en");
                map.put("dateFormat", "dd MMMM yyyy");
                map.put("transactionDate", postingDate.format(DATE_FORMATTER));
                map.put("savingsId", savingsId.toString());
                
                String postInterestUrl = "/fineract-provider/api/v1/savingsaccounts/" + savingsId + "/transactions/postInterest?" + Utils.TENANT_IDENTIFIER;
                Utils.performServerPost(this.requestSpec, this.responseSpec, postInterestUrl, new Gson().toJson(map), null);
            }
        }
        
        // Get interest amounts for both accounts
        HashMap<String, Object> dailyCompoundSummary = savingsAccountHelper.getSavingsSummary(dailyCompoundSavingsId);
        HashMap<String, Object> yearlyCompoundSummary = savingsAccountHelper.getSavingsSummary(yearlyCompoundSavingsId);
        
        Double dailyCompoundInterest = (Double) dailyCompoundSummary.get("totalInterestPosted");
        Double yearlyCompoundInterest = (Double) yearlyCompoundSummary.get("totalInterestPosted");
        
        // Calculate reference amounts:
        // For yearly compounding: 10000 * 0.05 = 500
        // For daily compounding: 10000 * ((1 + 0.05/365)^365 - 1) = 512.67
        BigDecimal yearlyCompoundRef = new BigDecimal("500.00");
        BigDecimal dailyCompoundRef = new BigDecimal("512.67");
        
        LOG.info("Daily compounding - Expected: {}, Actual: {}", dailyCompoundRef, dailyCompoundInterest);
        LOG.info("Yearly compounding - Expected: {}, Actual: {}", yearlyCompoundRef, yearlyCompoundInterest);
        
        // Verify with appropriate tolerance
        assertEquals(
            yearlyCompoundRef.doubleValue(), 
            yearlyCompoundInterest, 
            0.5, // Higher tolerance for the simplistic calculation
            "Yearly compound interest should match reference value"
        );
        
        assertEquals(
            dailyCompoundRef.doubleValue(), 
            dailyCompoundInterest, 
            0.5, // Higher tolerance for the simplistic calculation
            "Daily compound interest should match reference value"
        );
        
        // Daily compounding should always yield higher interest
        assertTrue(
            dailyCompoundInterest > yearlyCompoundInterest,
            "Daily compounding should result in higher interest than yearly compounding"
        );
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