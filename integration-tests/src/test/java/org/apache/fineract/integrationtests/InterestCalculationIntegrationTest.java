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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.CommonConstants;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsProductHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsStatusChecker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Integration tests for interest calculation engine testing end-to-end functionality.
 */
public class InterestCalculationIntegrationTest {

    private static final Logger LOG = LoggerFactory.getLogger(InterestCalculationIntegrationTest.class);
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
    @DisplayName("Test Interest Posting with Daily Balance Strategy")
    public void testDailyBalanceInterestPosting() {
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        LOG.info("Created client with ID {}", clientID);
        
        // Create savings product with daily balance interest calculation
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        LOG.info("Created savings product with ID {}", savingsProductID);
        
        // Create savings account
        Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "1000", false);
        LOG.info("Created savings account with ID {}", savingsId);
        
        // Approve and activate savings account
        savingsAccountHelper.approveSavingsOnDate(savingsId, "01 January 2023");
        savingsAccountHelper.activateSavingsAccount(savingsId, "01 January 2023");
        
        // Verify account status
        HashMap<String, Object> savingsStatusHashMap = SavingsStatusChecker.getStatusOfSavings(this.requestSpec, this.responseSpec, savingsId);
        SavingsStatusChecker.verifySavingsIsActive(savingsStatusHashMap);
        
        // Make a deposit
        Integer depositTransactionId = (Integer) savingsAccountHelper.depositToSavingsAccount(
                savingsId, "10000", "01 January 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        assertNotNull(depositTransactionId, "Deposit transaction ID should not be null");
        
        // Run periodic interest posting job for Jan 31
        LocalDate postingDate = LocalDate.of(2023, 1, 31);
        performInterestPosting(postingDate);
        
        // Verify interest posted for January (based on 31 days)
        // Daily interest = 10000 * 0.05 (default rate) * 1/365 = 1.3699 per day
        // Interest for Jan (31 days) = 1.3699 * 31 = 42.47
        HashMap<String, Object> summary = savingsAccountHelper.getSavingsSummary(savingsId);
        assertEquals(42.47, (Double) summary.get("totalInterestPosted"), 0.01, 
                "Interest posted for January should match expected amount");
        
        // Make another deposit in February
        depositTransactionId = (Integer) savingsAccountHelper.depositToSavingsAccount(
                savingsId, "5000", "15 February 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        assertNotNull(depositTransactionId, "Deposit transaction ID should not be null");
        
        // Run periodic interest posting job for Feb 28
        postingDate = LocalDate.of(2023, 2, 28);
        performInterestPosting(postingDate);
        
        // Verify cumulative interest posted after February
        // Feb 1-14: 10000 * 0.05 * 1/365 * 14 = 19.18
        // Feb 15-28: 15000 * 0.05 * 1/365 * 14 = 28.77
        // Total Feb interest = 47.95
        // Cumulative interest = 42.47 + 47.95 = 90.42
        summary = savingsAccountHelper.getSavingsSummary(savingsId);
        assertEquals(90.42, (Double) summary.get("totalInterestPosted"), 0.01, 
                "Cumulative interest after February should match expected amount");
    }
    
    @Test
    @DisplayName("Test Interest Posting with Average Daily Balance Strategy")
    public void testAverageDailyBalanceInterestPosting() {
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create savings product with average daily balance interest calculation
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeAverageDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        
        // Create savings account
        Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "0", false);
        
        // Approve and activate savings account
        savingsAccountHelper.approveSavingsOnDate(savingsId, "01 March 2023");
        savingsAccountHelper.activateSavingsAccount(savingsId, "01 March 2023");
        
        // Make deposits with varying balances throughout March
        savingsAccountHelper.depositToSavingsAccount(savingsId, "5000", "01 March 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        savingsAccountHelper.depositToSavingsAccount(savingsId, "3000", "11 March 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        savingsAccountHelper.withdrawalFromSavingsAccount(savingsId, "2000", "21 March 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        
        // Run periodic interest posting job for Mar 31
        performInterestPosting(LocalDate.of(2023, 3, 31));
        
        // Calculate expected interest based on average daily balance
        // Mar 1-10: 5000 for 10 days
        // Mar 11-20: 8000 for 10 days
        // Mar 21-31: 6000 for 11 days
        // Average daily balance = (5000*10 + 8000*10 + 6000*11) / 31 = 6354.84
        // Interest = 6354.84 * 0.05 * 31/365 = 26.99
        HashMap<String, Object> summary = savingsAccountHelper.getSavingsSummary(savingsId);
        assertEquals(26.99, (Double) summary.get("totalInterestPosted"), 0.01, 
                "Interest posted with average daily balance should match expected amount");
    }
    
    @Test
    @DisplayName("Test Interest Calculation with Minimum Balance Requirement")
    public void testInterestCalculationWithMinimumBalanceRequirement() {
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // Create savings product with minimum balance requirement
        final String savingsProductJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .withMinBalanceForInterestCalculation("1000")
                .build();
        
        Integer savingsProductID = savingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
        
        // Create savings account
        Integer savingsId = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductID, "0", false);
        
        // Approve and activate savings account
        savingsAccountHelper.approveSavingsOnDate(savingsId, "01 April 2023");
        savingsAccountHelper.activateSavingsAccount(savingsId, "01 April 2023");
        
        // Make transactions that will result in balance below and above minimum requirement
        savingsAccountHelper.depositToSavingsAccount(savingsId, "800", "01 April 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        // Balance now 800 - below minimum requirement, no interest should accrue
        
        savingsAccountHelper.depositToSavingsAccount(savingsId, "500", "11 April 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        // Balance now 1300 - above minimum requirement, interest should accrue
        
        savingsAccountHelper.withdrawalFromSavingsAccount(savingsId, "800", "21 April 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        // Balance now 500 - below minimum requirement again, no interest should accrue
        
        // Run periodic interest posting job for Apr 30
        performInterestPosting(LocalDate.of(2023, 4, 30));
        
        // Calculate expected interest based on daily balance with minimum balance requirement
        // Apr 1-10: 800 for 10 days (below minimum, no interest)
        // Apr 11-20: 1300 for 10 days (above minimum, interest accrues)
        // Apr 21-30: 500 for 10 days (below minimum, no interest)
        // Interest = 1300 * 0.05 * 10/365 = 1.78
        HashMap<String, Object> summary = savingsAccountHelper.getSavingsSummary(savingsId);
        assertEquals(1.78, (Double) summary.get("totalInterestPosted"), 0.01, 
                "Interest with minimum balance requirement should match expected amount");
    }
    
    @Test
    @DisplayName("Test Interest Calculation with Different Compounding Frequencies")
    public void testInterestCalculationWithDifferentCompoundingFrequencies() {
        // Create client
        Integer clientID = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
        
        // 1. Create savings product with DAILY compounding
        String savingsProductDailyJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeDaily()
                .build();
        
        Integer savingsProductDailyID = savingsProductHelper.createSavingsProduct(savingsProductDailyJSON, requestSpec, responseSpec);
        
        // 2. Create savings product with MONTHLY compounding
        String savingsProductMonthlyJSON = savingsProductHelper.withInterestCalculationTypeDailyBalance()
                .withInterestPostingPeriodTypeMonthly()
                .withInterestCompoundingPeriodTypeMonthly()
                .build();
        
        Integer savingsProductMonthlyID = savingsProductHelper.createSavingsProduct(savingsProductMonthlyJSON, requestSpec, responseSpec);
        
        // Create accounts and activate both
        Integer savingsIdDaily = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductDailyID, "0", false);
        Integer savingsIdMonthly = savingsAccountHelper.applyForSavingsApplication(clientID, savingsProductMonthlyID, "0", false);
        
        savingsAccountHelper.approveSavingsOnDate(savingsIdDaily, "01 May 2023");
        savingsAccountHelper.activateSavingsAccount(savingsIdDaily, "01 May 2023");
        
        savingsAccountHelper.approveSavingsOnDate(savingsIdMonthly, "01 May 2023");
        savingsAccountHelper.activateSavingsAccount(savingsIdMonthly, "01 May 2023");
        
        // Make same deposits to both accounts
        savingsAccountHelper.depositToSavingsAccount(savingsIdDaily, "10000", "01 May 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        savingsAccountHelper.depositToSavingsAccount(savingsIdMonthly, "10000", "01 May 2023", CommonConstants.RESPONSE_RESOURCE_ID);
        
        // Run interest posting jobs for 3 consecutive months
        performInterestPosting(LocalDate.of(2023, 5, 31));
        performInterestPosting(LocalDate.of(2023, 6, 30));
        performInterestPosting(LocalDate.of(2023, 7, 31));
        
        // Get both account summaries
        HashMap<String, Object> summaryDaily = savingsAccountHelper.getSavingsSummary(savingsIdDaily);
        HashMap<String, Object> summaryMonthly = savingsAccountHelper.getSavingsSummary(savingsIdMonthly);
        
        // Daily compounding should result in slightly higher interest due to compounding effect
        double interestDaily = (Double) summaryDaily.get("totalInterestPosted");
        double interestMonthly = (Double) summaryMonthly.get("totalInterestPosted");
        
        LOG.info("Daily compounding interest: {}", interestDaily);
        LOG.info("Monthly compounding interest: {}", interestMonthly);
        
        assertTrue(interestDaily > interestMonthly, 
                "Daily compounding should result in higher interest than monthly compounding");
    }
    
    /**
     * Helper method to trigger interest posting via API
     */
    private void performInterestPosting(LocalDate postingDate) {
        LOG.info("Running interest posting for date: {}", postingDate);
        
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