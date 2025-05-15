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
package org.apache.fineract.portfolio.interestcalculation.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.SortedMap;
import java.util.TreeMap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.interestcalculation.service.InterestCalculationTestFramework;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for specialized interest calculation strategies.
 */
public class SpecializedStrategiesTest extends InterestCalculationTestFramework {

    private MonetaryCurrency usd;
    private MinimumBalanceStrategy minimumBalanceStrategy;
    private TieredBalanceStrategy tieredBalanceStrategy;
    private BonusInterestStrategy bonusInterestStrategy;
    private YouthAccountStrategy youthAccountStrategy;
    private PromotionalInterestStrategy promotionalInterestStrategy;

    @BeforeEach
    public void setup() {
        usd = new MonetaryCurrency("USD", 2, 0);
        minimumBalanceStrategy = new MinimumBalanceStrategy();
        tieredBalanceStrategy = createTestTieredBalanceStrategy();
        bonusInterestStrategy = createTestBonusInterestStrategy();
        youthAccountStrategy = createTestYouthAccountStrategy();
        promotionalInterestStrategy = createTestPromotionalInterestStrategy();
    }

    @Test
    @DisplayName("Minimum Balance Strategy - Basic Calculation Test")
    public void testMinimumBalanceCalculation() {
        // Setup test data
        LocalDate fromDate = LocalDate.of(2023, 1, 1);
        LocalDate toDate = LocalDate.of(2023, 1, 31);
        BigDecimal openingBalance = new BigDecimal("1500.00");
        BigDecimal closingBalance = new BigDecimal("2000.00");
        BigDecimal averageBalance = new BigDecimal("1750.00");
        BigDecimal minimumBalance = new BigDecimal("1200.00");
        BigDecimal interestRate = new BigDecimal("0.04"); // 4%
        
        InterestCalculationData balanceData = InterestCalculationData.create(
            fromDate, toDate, openingBalance, closingBalance, averageBalance, minimumBalance);
        
        // Expected interest for 31 days at 4% annual rate on minimum balance of $1200
        // 1200 * 0.04 * (31/365) = $4.08
        BigDecimal expectedInterestAmount = new BigDecimal("4.08");
        
        // Execute test
        Money result = minimumBalanceStrategy.calculateInterest(
            usd, balanceData, interestRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Minimum balance strategy should calculate correct interest on the minimum balance");
    }

    @Test
    @DisplayName("Tiered Balance Strategy - Basic Calculation Test")
    public void testTieredBalanceCalculation() {
        // Setup test data
        LocalDate fromDate = LocalDate.of(2023, 2, 1);
        LocalDate toDate = LocalDate.of(2023, 2, 28);
        BigDecimal balance = new BigDecimal("6000.00");
        BigDecimal interestRate = new BigDecimal("0.03"); // Default rate 3%
        int daysInPeriod = 28;
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
        
        // For $6000 with tiers at:
        // - 3% for first $1000
        // - 4% for next $4000 ($1000-$5000)
        // - 5% for amount above $5000
        // Expected interest:
        // (1000 * 0.03 * 28/365) + (4000 * 0.04 * 28/365) + (1000 * 0.05 * 28/365)
        // = 2.30 + 12.27 + 3.84 = $18.41
        BigDecimal expectedInterestAmount = new BigDecimal("18.41");
        
        // Execute test
        Money result = tieredBalanceStrategy.calculateInterest(
            usd, balanceData, interestRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Tiered balance strategy should calculate correct interest based on balance tiers");
    }

    @Test
    @DisplayName("Bonus Interest Strategy - Basic Calculation Test")
    public void testBonusInterestCalculation() {
        // Setup test data
        LocalDate fromDate = LocalDate.of(2023, 3, 1);
        LocalDate toDate = LocalDate.of(2023, 3, 31);
        BigDecimal balance = new BigDecimal("2000.00");
        BigDecimal interestRate = new BigDecimal("0.03"); // 3% base rate
        int daysInPeriod = 31;
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
        
        // Base interest: 2000 * 0.03 * 31/365 = $5.10
        // Bonus interest: 2000 * 0.01 * 31/365 = $1.70
        // Total expected: $6.80
        BigDecimal expectedInterestAmount = new BigDecimal("6.80");
        
        // Execute test
        Money result = bonusInterestStrategy.calculateInterest(
            usd, balanceData, interestRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Bonus interest strategy should calculate correct interest with bonus rate");
    }

    @Test
    @DisplayName("Youth Account Strategy - Basic Calculation Test")
    public void testYouthAccountCalculation() {
        // Setup test data
        LocalDate fromDate = LocalDate.of(2023, 4, 1);
        LocalDate toDate = LocalDate.of(2023, 4, 30);
        BigDecimal balance = new BigDecimal("1000.00");
        BigDecimal baseRate = new BigDecimal("0.03"); // 3% base rate
        int daysInPeriod = 30;
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
        
        // The youth rate at age 17 should be 3% + 2% = 5%
        // Expected interest: 1000 * 0.05 * 30/365 = $4.11
        BigDecimal expectedInterestAmount = new BigDecimal("4.11");
        
        // Execute test
        Money result = youthAccountStrategy.calculateInterest(
            usd, balanceData, baseRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Youth account strategy should calculate correct interest with age-adjusted rate");
    }

    @Test
    @DisplayName("Promotional Interest Strategy - Fully Within Promotion Period Test")
    public void testPromotionalInterestFullPeriod() {
        // Setup test data
        // December 2023 is within our promotional period
        LocalDate fromDate = LocalDate.of(2023, 12, 10);
        LocalDate toDate = LocalDate.of(2023, 12, 20);
        BigDecimal balance = new BigDecimal("3000.00");
        BigDecimal standardRate = new BigDecimal("0.03"); // 3% standard rate
        int daysInPeriod = 11;
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
        
        // For the promotional period with 7% rate
        // Expected interest: 3000 * 0.07 * 11/365 = $6.33
        BigDecimal expectedInterestAmount = new BigDecimal("6.33");
        
        // Execute test
        Money result = promotionalInterestStrategy.calculateInterest(
            usd, balanceData, standardRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Promotional interest strategy should apply promotional rate for periods fully within promotion");
    }

    @Test
    @DisplayName("Promotional Interest Strategy - Partially Within Promotion Period Test")
    public void testPromotionalInterestPartialPeriod() {
        // Setup test data
        // Period spans from before promotion starts to within promotion
        LocalDate fromDate = LocalDate.of(2023, 11, 25);
        LocalDate toDate = LocalDate.of(2023, 12, 10);
        BigDecimal balance = new BigDecimal("3000.00");
        BigDecimal standardRate = new BigDecimal("0.03"); // 3% standard rate
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
        
        // 6 days at standard rate (Nov 25-30): 3000 * 0.03 * 6/365 = $1.48
        // 10 days at promo rate (Dec 1-10): 3000 * 0.07 * 10/365 = $5.75
        // Total expected: $7.23
        BigDecimal expectedInterestAmount = new BigDecimal("7.23");
        
        // Execute test
        Money result = promotionalInterestStrategy.calculateInterest(
            usd, balanceData, standardRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Promotional interest strategy should correctly handle periods partially within promotion");
    }

    /**
     * Creates a test implementation of TieredBalanceStrategy with predefined tiers.
     */
    private TieredBalanceStrategy createTestTieredBalanceStrategy() {
        return new TieredBalanceStrategy() {
            @Override
            protected SortedMap<BigDecimal, BigDecimal> getApplicableInterestRateTiers(BigDecimal balanceAmount) {
                SortedMap<BigDecimal, BigDecimal> tiers = new TreeMap<>();
                tiers.put(new BigDecimal("1000.00"), new BigDecimal("0.03")); // 3% for first $1000
                tiers.put(new BigDecimal("5000.00"), new BigDecimal("0.04")); // 4% for $1000-$5000
                tiers.put(new BigDecimal("999999.00"), new BigDecimal("0.05")); // 5% for above $5000
                return tiers;
            }
        };
    }

    /**
     * Creates a test implementation of BonusInterestStrategy.
     */
    private BonusInterestStrategy createTestBonusInterestStrategy() {
        // Use average daily balance as the base strategy
        AverageDailyBalanceStrategy baseStrategy = new AverageDailyBalanceStrategy();
        
        return new BonusInterestStrategy(baseStrategy) {
            @Override
            protected boolean isEligibleForBonusInterest(InterestCalculationData balanceData) {
                // Always eligible in test
                return true;
            }
            
            @Override
            protected BigDecimal getBonusInterestRate(InterestCalculationData balanceData) {
                // Fixed 1% bonus for test
                return new BigDecimal("0.01");
            }
        };
    }

    /**
     * Creates a test implementation of YouthAccountStrategy.
     */
    private YouthAccountStrategy createTestYouthAccountStrategy() {
        // Use daily balance as the base strategy
        DailyBalanceStrategy baseStrategy = new DailyBalanceStrategy();
        
        return new YouthAccountStrategy(baseStrategy, 
                                      new BigDecimal("0.02"), // 2% boost
                                      18, // max age
                                      16) // phase out start age
        {
            @Override
            protected int getClientAge() {
                // Fixed age for testing
                return 17;
            }
        };
    }

    /**
     * Creates a test implementation of PromotionalInterestStrategy.
     */
    private PromotionalInterestStrategy createTestPromotionalInterestStrategy() {
        // Use daily balance as base strategy
        DailyBalanceStrategy baseStrategy = new DailyBalanceStrategy();
        
        return new PromotionalInterestStrategy(baseStrategy) {
            @Override
            protected PromotionalPeriod findApplicablePromotionalPeriod(LocalDate fromDate, LocalDate toDate) {
                // Fixed promotional period for December 2023
                LocalDate promoStart = LocalDate.of(2023, 12, 1);
                LocalDate promoEnd = LocalDate.of(2023, 12, 31);
                BigDecimal promoRate = new BigDecimal("0.07"); // 7% promotional rate
                
                // Check if our calculation period overlaps with this promotion
                if (fromDate.isBefore(promoEnd) && toDate.isAfter(promoStart)) {
                    return new PromotionalPeriod(promoStart, promoEnd, promoRate);
                }
                
                return null;
            }
        };
    }
}