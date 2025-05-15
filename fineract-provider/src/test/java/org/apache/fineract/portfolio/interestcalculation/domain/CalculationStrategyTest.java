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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.interestcalculation.service.InterestCalculationTestFramework;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Unit tests for interest calculation strategies.
 */
public class CalculationStrategyTest extends InterestCalculationTestFramework {

    private DailyBalanceStrategy dailyBalanceStrategy;
    private AverageDailyBalanceStrategy averageDailyBalanceStrategy;
    private MonetaryCurrency usd;

    @BeforeEach
    public void setup() {
        dailyBalanceStrategy = new DailyBalanceStrategy();
        averageDailyBalanceStrategy = new AverageDailyBalanceStrategy();
        usd = new MonetaryCurrency("USD", 2, 0);
    }

    @Test
    @DisplayName("Daily Balance Strategy - Basic Calculation Test")
    public void testDailyBalanceCalculation() {
        // Setup test data
        LocalDate fromDate = LocalDate.of(2023, 1, 1);
        LocalDate toDate = LocalDate.of(2023, 1, 31);
        BigDecimal balance = new BigDecimal("1000.00");
        BigDecimal interestRate = new BigDecimal("0.05"); // 5%
        int daysInPeriod = 31;
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
        
        // Expected interest for 31 days at 5% annual rate on $1000
        // 1000 * 0.05 * (31/365) = $4.25
        BigDecimal expectedInterestAmount = new BigDecimal("4.25");
        
        // Execute test
        Money result = dailyBalanceStrategy.calculateInterest(
            usd, balanceData, interestRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Daily balance strategy should calculate correct interest");
    }
    
    @Test
    @DisplayName("Average Daily Balance Strategy - Basic Calculation Test")
    public void testAverageDailyBalanceCalculation() {
        // Setup test data
        LocalDate fromDate = LocalDate.of(2023, 2, 1);
        LocalDate toDate = LocalDate.of(2023, 2, 28);
        BigDecimal openingBalance = new BigDecimal("1000.00");
        BigDecimal closingBalance = new BigDecimal("2000.00");
        BigDecimal averageBalance = new BigDecimal("1500.00");
        BigDecimal interestRate = new BigDecimal("0.06"); // 6%
        int daysInPeriod = 28;
        
        InterestCalculationData balanceData = InterestCalculationData.builder()
            .openingBalance(openingBalance)
            .closingBalance(closingBalance)
            .averageBalance(averageBalance)
            .fromDate(fromDate)
            .toDate(toDate)
            .daysInPeriod(daysInPeriod)
            .build();
        
        // Expected interest for 28 days at 6% annual rate on average balance of $1500
        // 1500 * 0.06 * (28/365) = $6.90
        BigDecimal expectedInterestAmount = new BigDecimal("6.90");
        
        // Execute test
        Money result = averageDailyBalanceStrategy.calculateInterest(
            usd, balanceData, interestRate, DAYS_IN_YEAR_365);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Average daily balance strategy should calculate correct interest");
    }
    
    @Test
    @DisplayName("Interest Eligibility - Minimum Balance Tests")
    public void testMinimumBalanceRequirement() {
        // Setup test data
        Money balance1000 = Money.of(USD, BigDecimal.valueOf(1000));
        Money balance500 = Money.of(USD, BigDecimal.valueOf(500));
        Money minBalance750 = Money.of(USD, BigDecimal.valueOf(750));
        
        // Verify eligibility logic
        assertTrue(
            dailyBalanceStrategy.isEligibleForInterestCalculation(balance1000, minBalance750),
            "Balance of 1000 should be eligible when min balance is 750"
        );
        
        assertFalse(
            dailyBalanceStrategy.isEligibleForInterestCalculation(balance500, minBalance750),
            "Balance of 500 should not be eligible when min balance is 750"
        );
        
        assertTrue(
            dailyBalanceStrategy.isEligibleForInterestCalculation(balance500, null),
            "Any balance should be eligible when min balance requirement is null"
        );
        
        assertTrue(
            dailyBalanceStrategy.isEligibleForInterestCalculation(
                balance500, Money.zero(USD)),
            "Any balance should be eligible when min balance requirement is zero"
        );
    }
    
    @Test
    @DisplayName("Daily Balance Strategy - Zero Balance Test")
    public void testZeroBalanceCalculation() {
        // Setup test data with zero balance
        LocalDate fromDate = LocalDate.of(2023, 3, 1);
        LocalDate toDate = LocalDate.of(2023, 3, 31);
        BigDecimal zeroBalance = BigDecimal.ZERO;
        BigDecimal interestRate = new BigDecimal("0.05"); // 5%
        
        InterestCalculationData balanceData = createBalanceData(
            zeroBalance, zeroBalance, fromDate, toDate);
        
        // Execute test
        Money result = dailyBalanceStrategy.calculateInterest(
            usd, balanceData, interestRate, DAYS_IN_YEAR_365);
        
        // Verify results - zero balance should yield zero interest
        assertEquals(BigDecimal.ZERO, result.getAmount(),
            "Zero balance should result in zero interest");
    }
    
    @Test
    @DisplayName("Daily Balance Strategy with 360 Days In Year")
    public void testDailyBalance360DaysYear() {
        // Setup test data
        LocalDate fromDate = LocalDate.of(2023, 4, 1);
        LocalDate toDate = LocalDate.of(2023, 4, 30);
        BigDecimal balance = new BigDecimal("1000.00");
        BigDecimal interestRate = new BigDecimal("0.05"); // 5%
        int daysInPeriod = 30;
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
        
        // Expected interest for 30 days at 5% annual rate on $1000 with 360-day year
        // 1000 * 0.05 * (30/360) = $4.17
        BigDecimal expectedInterestAmount = new BigDecimal("4.17");
        
        // Execute test
        Money result = dailyBalanceStrategy.calculateInterest(
            usd, balanceData, interestRate, DAYS_IN_YEAR_360);
        
        // Verify results
        assertEquals(expectedInterestAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Daily balance strategy with 360-day year should calculate correct interest");
    }
    
    /**
     * Provides a stream of test data for parameterized edge case tests.
     */
    private static Stream<Arguments> edgeCaseTestData() {
        return Stream.of(
            // Test case format: strategyType, balance, interestRate, daysInPeriod, daysInYear, expectedAmount
            
            // High balance test (1 million)
            Arguments.of(
                InterestCalculationStrategyType.DAILY_BALANCE, 
                new BigDecimal("1000000.00"), 
                new BigDecimal("0.03"), // 3%
                30, 
                DAYS_IN_YEAR_365, 
                new BigDecimal("2465.75")
            ),
            
            // Fractional interest rate test (1.75%)
            Arguments.of(
                InterestCalculationStrategyType.AVERAGE_DAILY_BALANCE, 
                new BigDecimal("10000.00"), 
                new BigDecimal("0.0175"), // 1.75%
                31, 
                DAYS_IN_YEAR_365, 
                new BigDecimal("14.86")
            ),
            
            // Single day test
            Arguments.of(
                InterestCalculationStrategyType.DAILY_BALANCE, 
                new BigDecimal("5000.00"), 
                new BigDecimal("0.045"), // 4.5%
                1, 
                DAYS_IN_YEAR_365, 
                new BigDecimal("0.62")
            ),
            
            // Full year test (365 days)
            Arguments.of(
                InterestCalculationStrategyType.DAILY_BALANCE, 
                new BigDecimal("10000.00"), 
                new BigDecimal("0.05"), // 5%
                365, 
                DAYS_IN_YEAR_365, 
                new BigDecimal("500.00")
            ),
            
            // Very low interest rate test (0.01%)
            Arguments.of(
                InterestCalculationStrategyType.AVERAGE_DAILY_BALANCE, 
                new BigDecimal("100000.00"), 
                new BigDecimal("0.0001"), // 0.01%
                30, 
                DAYS_IN_YEAR_365, 
                new BigDecimal("0.82")
            )
        );
    }
    
    @ParameterizedTest
    @MethodSource("edgeCaseTestData")
    @DisplayName("Edge Case Interest Calculation Tests")
    public void testEdgeCaseCalculations(
            InterestCalculationStrategyType strategyType, 
            BigDecimal balance,
            BigDecimal interestRate,
            int daysInPeriod,
            int daysInYear,
            BigDecimal expectedAmount) {
            
        // Setup
        LocalDate fromDate = LocalDate.of(2023, 1, 1);
        LocalDate toDate = fromDate.plusDays(daysInPeriod - 1);
        
        InterestCalculationData balanceData = createBalanceData(
            balance, balance, fromDate, toDate);
            
        InterestCalculationStrategy strategy = (strategyType == InterestCalculationStrategyType.DAILY_BALANCE)
            ? dailyBalanceStrategy : averageDailyBalanceStrategy;
            
        // Execute
        Money result = strategy.calculateInterest(usd, balanceData, interestRate, daysInYear);
        
        // Verify
        assertEquals(expectedAmount, result.getAmount().setScale(2, BigDecimal.ROUND_HALF_EVEN),
            "Edge case " + strategyType + " should calculate correct interest");
    }
}