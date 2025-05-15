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
package org.apache.fineract.portfolio.interestcalculation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.interestcalculation.domain.AverageDailyBalanceStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.BalanceHistoryProvider;
import org.apache.fineract.portfolio.interestcalculation.domain.DailyBalanceStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationData;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationEngine;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategyType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for the InterestCalculationEngine implementation.
 */
@ExtendWith(MockitoExtension.class)
public class InterestCalculationEngineTest extends InterestCalculationTestFramework {

    @Mock
    private BalanceHistoryProvider balanceHistoryProvider;
    
    @Mock
    private InterestCalculationRepository interestCalculationRepository;
    
    @Mock
    private InterestDailyAccrualRepository dailyAccrualRepository;
    
    private InterestCalculationEngine interestCalculationEngine;
    private Map<InterestCalculationStrategyType, InterestCalculationStrategy> strategies;
    
    @BeforeEach
    public void setup() {
        strategies = new HashMap<>();
        strategies.put(InterestCalculationStrategyType.DAILY_BALANCE, new DailyBalanceStrategy());
        strategies.put(InterestCalculationStrategyType.AVERAGE_DAILY_BALANCE, new AverageDailyBalanceStrategy());
        
        MathContext mathContext = new MathContext(19, RoundingMode.HALF_EVEN);
        
        interestCalculationEngine = new InterestCalculationEngineServiceImpl(
            strategies, balanceHistoryProvider, interestCalculationRepository, 
            dailyAccrualRepository, mathContext);
    }
    
    @Test
    @DisplayName("Calculate Interest with Daily Balance Strategy")
    public void testCalculateInterestWithDailyBalanceStrategy() {
        // Test data setup
        UUID accountId = createTestAccountId();
        String accountType = "SAVINGS";
        LocalDate fromDate = LocalDate.of(2023, 1, 1);
        LocalDate toDate = LocalDate.of(2023, 1, 31);
        BigDecimal interestRate = BigDecimal.valueOf(0.05); // 5%
        Money minBalance = Money.zero(USD);
        
        // Create test balance history
        List<InterestCalculationData> balanceHistory = new ArrayList<>();
        balanceHistory.add(createBalanceData(
            BigDecimal.valueOf(1000), BigDecimal.valueOf(1000), fromDate, toDate));
        
        // Mock behavior
        when(balanceHistoryProvider.getBalanceHistory(
            eq(accountId), eq(accountType), eq(fromDate), eq(toDate)))
            .thenReturn(balanceHistory);
        
        // Expected interest calculation
        BigDecimal expectedInterestAmount = BigDecimal.valueOf(4.25); // $1000 * 5% * (31/365)
        
        // Execute test
        Money calculatedInterest = interestCalculationEngine.calculateInterest(
            accountId, accountType, fromDate, toDate, interestRate,
            InterestCalculationStrategyType.DAILY_BALANCE, DAYS_IN_YEAR_365, minBalance);
        
        // Verify
        assertEquals(
            expectedInterestAmount.setScale(2, RoundingMode.HALF_EVEN), 
            calculatedInterest.getAmount().setScale(2, RoundingMode.HALF_EVEN),
            "Interest calculation should match expected amount");
        
        // Verify interactions
        verify(balanceHistoryProvider).getBalanceHistory(
            eq(accountId), eq(accountType), eq(fromDate), eq(toDate));
        
        verify(interestCalculationRepository).saveCalculationHistory(
            eq(accountId), eq(accountType), any(LocalDate.class),
            eq(fromDate), eq(toDate), any(BigDecimal.class), any(BigDecimal.class),
            eq(interestRate), eq(InterestCalculationStrategyType.DAILY_BALANCE),
            eq(DAYS_IN_YEAR_365), eq(false), eq(null), any(Map.class));
    }
    
    @Test
    @DisplayName("Calculate Interest with Average Daily Balance Strategy")
    public void testCalculateInterestWithAverageDailyBalanceStrategy() {
        // Test data setup
        UUID accountId = createTestAccountId();
        String accountType = "SAVINGS";
        LocalDate fromDate = LocalDate.of(2023, 2, 1);
        LocalDate toDate = LocalDate.of(2023, 2, 28);
        BigDecimal interestRate = BigDecimal.valueOf(0.06); // 6%
        Money minBalance = Money.zero(USD);
        
        // Create test balance history with changing balances
        InterestCalculationData balanceData = InterestCalculationData.builder()
            .openingBalance(BigDecimal.valueOf(1000))
            .closingBalance(BigDecimal.valueOf(2000))
            .averageBalance(BigDecimal.valueOf(1500)) // Average of opening and closing
            .fromDate(fromDate)
            .toDate(toDate)
            .daysInPeriod(28)
            .build();
        
        List<InterestCalculationData> balanceHistory = new ArrayList<>();
        balanceHistory.add(balanceData);
        
        // Mock behavior
        when(balanceHistoryProvider.getBalanceHistory(
            eq(accountId), eq(accountType), eq(fromDate), eq(toDate)))
            .thenReturn(balanceHistory);
        
        // Expected interest calculation using average daily balance
        BigDecimal expectedInterestAmount = BigDecimal.valueOf(6.90); // $1500 * 6% * (28/365)
        
        // Execute test
        Money calculatedInterest = interestCalculationEngine.calculateInterest(
            accountId, accountType, fromDate, toDate, interestRate,
            InterestCalculationStrategyType.AVERAGE_DAILY_BALANCE, DAYS_IN_YEAR_365, minBalance);
        
        // Verify
        assertEquals(
            expectedInterestAmount.setScale(2, RoundingMode.HALF_EVEN), 
            calculatedInterest.getAmount().setScale(2, RoundingMode.HALF_EVEN),
            "Interest calculation with average daily balance should match expected amount");
    }
    
    @Test
    @DisplayName("Process Daily Accruals")
    public void testProcessAccruals() {
        // Test data setup
        UUID accountId = createTestAccountId();
        String accountType = "SAVINGS";
        LocalDate accrualDate = LocalDate.of(2023, 3, 15);
        BigDecimal interestRate = BigDecimal.valueOf(0.045); // 4.5%
        Money minBalance = Money.of(USD, BigDecimal.valueOf(100));
        
        // Create test daily balance
        InterestCalculationData dailyBalance = InterestCalculationData.builder()
            .openingBalance(BigDecimal.valueOf(5000))
            .closingBalance(BigDecimal.valueOf(5000))
            .averageBalance(BigDecimal.valueOf(5000))
            .fromDate(accrualDate)
            .toDate(accrualDate)
            .daysInPeriod(1)
            .build();
        
        // Mock behavior
        when(balanceHistoryProvider.getDailyBalance(
            eq(accountId), eq(accountType), eq(accrualDate)))
            .thenReturn(dailyBalance);
        
        // Expected daily accrual interest
        BigDecimal expectedAccrualAmount = BigDecimal.valueOf(0.62); // $5000 * 4.5% * (1/365)
        
        // Execute test
        Money accruedInterest = interestCalculationEngine.processAccruals(
            accountId, accountType, accrualDate, interestRate,
            InterestCalculationStrategyType.DAILY_BALANCE, DAYS_IN_YEAR_365, minBalance);
        
        // Verify
        assertEquals(
            expectedAccrualAmount.setScale(2, RoundingMode.HALF_EVEN), 
            accruedInterest.getAmount().setScale(2, RoundingMode.HALF_EVEN),
            "Daily accrual interest should match expected amount");
        
        // Verify interactions
        verify(balanceHistoryProvider).getDailyBalance(
            eq(accountId), eq(accountType), eq(accrualDate));
        
        verify(dailyAccrualRepository).saveDailyAccrual(
            eq(accountId), eq(accountType), eq(accrualDate), 
            any(BigDecimal.class), any(BigDecimal.class), eq(interestRate),
            eq(DAYS_IN_YEAR_365), eq(false), eq(null));
    }
    
    @Test
    @DisplayName("Get Accrued Interest")
    public void testGetAccruedInterest() {
        // Test data setup
        UUID accountId = createTestAccountId();
        String accountType = "SAVINGS";
        LocalDate asOfDate = LocalDate.of(2023, 4, 30);
        
        // Mock behavior
        when(dailyAccrualRepository.getAccruedInterestTotal(
            eq(accountId), eq(accountType), eq(asOfDate)))
            .thenReturn(BigDecimal.valueOf(25.75));
        
        when(dailyAccrualRepository.getLatestAccrualCurrency(
            eq(accountId), eq(accountType)))
            .thenReturn(USD);
        
        // Execute test
        Money accruedInterest = interestCalculationEngine.getAccruedInterest(
            accountId, accountType, asOfDate);
        
        // Verify
        assertEquals(
            BigDecimal.valueOf(25.75), 
            accruedInterest.getAmount(),
            "Accrued interest should match expected amount");
        
        // Verify interactions
        verify(dailyAccrualRepository).getAccruedInterestTotal(
            eq(accountId), eq(accountType), eq(asOfDate));
        
        verify(dailyAccrualRepository).getLatestAccrualCurrency(
            eq(accountId), eq(accountType));
    }
    
    @Test
    @DisplayName("Record Interest Posting")
    public void testRecordInterestPosting() {
        // Test data setup
        UUID accountId = createTestAccountId();
        String accountType = "SAVINGS";
        LocalDate postingDate = LocalDate.of(2023, 5, 31);
        Money interestAmount = Money.of(USD, BigDecimal.valueOf(42.50));
        UUID transactionId = UUID.randomUUID();
        
        // Execute test
        interestCalculationEngine.recordInterestPosting(
            accountId, accountType, postingDate, interestAmount, transactionId);
        
        // Verify interactions
        verify(interestCalculationRepository).markAsPosted(
            eq(accountId), eq(accountType), eq(postingDate), eq(transactionId));
        
        verify(dailyAccrualRepository).markAsProcessed(
            eq(accountId), eq(accountType), eq(postingDate));
    }
    
    @Test
    @DisplayName("Calculate Interest With Minimum Balance Requirement")
    public void testCalculateInterestWithMinimumBalanceRequirement() {
        // Test data setup
        UUID accountId = createTestAccountId();
        String accountType = "SAVINGS";
        LocalDate fromDate = LocalDate.of(2023, 6, 1);
        LocalDate toDate = LocalDate.of(2023, 6, 30);
        BigDecimal interestRate = BigDecimal.valueOf(0.04); // 4%
        Money minBalance = Money.of(USD, BigDecimal.valueOf(1000));
        
        // Create test balance history with both eligible and ineligible balances
        List<InterestCalculationData> balanceHistory = new ArrayList<>();
        
        // Day 1-10: Balance $800 (below minimum)
        balanceHistory.add(createBalanceData(
            BigDecimal.valueOf(800), BigDecimal.valueOf(800), 
            fromDate, fromDate.plusDays(9)));
        
        // Day 11-30: Balance $1500 (above minimum)
        balanceHistory.add(createBalanceData(
            BigDecimal.valueOf(1500), BigDecimal.valueOf(1500), 
            fromDate.plusDays(10), toDate));
        
        // Mock behavior
        when(balanceHistoryProvider.getBalanceHistory(
            eq(accountId), eq(accountType), eq(fromDate), eq(toDate)))
            .thenReturn(balanceHistory);
        
        // Expected interest calculation (only for days 11-30)
        // $1500 * 4% * (20/365) = $3.29
        BigDecimal expectedInterestAmount = BigDecimal.valueOf(3.29);
        
        // Execute test
        Money calculatedInterest = interestCalculationEngine.calculateInterest(
            accountId, accountType, fromDate, toDate, interestRate,
            InterestCalculationStrategyType.DAILY_BALANCE, DAYS_IN_YEAR_365, minBalance);
        
        // Verify
        assertEquals(
            expectedInterestAmount.setScale(2, RoundingMode.HALF_EVEN), 
            calculatedInterest.getAmount().setScale(2, RoundingMode.HALF_EVEN),
            "Interest calculation with minimum balance requirement should match expected amount");
    }
    
    @Test
    @DisplayName("Process Accruals for Multiple Days")
    public void testProcessAccrualsForMultipleDays() {
        // Test data setup
        UUID accountId = createTestAccountId();
        String accountType = "SAVINGS";
        LocalDate startDate = LocalDate.of(2023, 7, 1);
        int daysToProcess = 5;
        BigDecimal interestRate = BigDecimal.valueOf(0.035); // 3.5%
        Money minBalance = Money.zero(USD);
        
        // Create daily balance data
        BigDecimal balance = BigDecimal.valueOf(10000.00);
        
        // Expected daily accrual interest per day
        // $10000 * 3.5% * (1/365) = $0.96 per day
        BigDecimal expectedDailyAccrual = BigDecimal.valueOf(0.96);
        
        // Mock behavior for each day
        for (int i = 0; i < daysToProcess; i++) {
            LocalDate currentDate = startDate.plusDays(i);
            
            InterestCalculationData dailyData = InterestCalculationData.builder()
                .openingBalance(balance)
                .closingBalance(balance)
                .averageBalance(balance)
                .fromDate(currentDate)
                .toDate(currentDate)
                .daysInPeriod(1)
                .build();
                
            when(balanceHistoryProvider.getDailyBalance(
                eq(accountId), eq(accountType), eq(currentDate)))
                .thenReturn(dailyData);
        }
        
        // Process accruals for each day
        BigDecimal totalAccrued = BigDecimal.ZERO;
        
        for (int i = 0; i < daysToProcess; i++) {
            LocalDate currentDate = startDate.plusDays(i);
            
            Money dailyAccrual = interestCalculationEngine.processAccruals(
                accountId, accountType, currentDate, interestRate,
                InterestCalculationStrategyType.DAILY_BALANCE, DAYS_IN_YEAR_365, minBalance);
                
            totalAccrued = totalAccrued.add(dailyAccrual.getAmount());
        }
        
        // Expected total accrued interest for 5 days
        BigDecimal expectedTotalAccrued = expectedDailyAccrual.multiply(BigDecimal.valueOf(daysToProcess));
        
        // Verify
        assertEquals(
            expectedTotalAccrued.setScale(2, RoundingMode.HALF_EVEN), 
            totalAccrued.setScale(2, RoundingMode.HALF_EVEN),
            "Total accrued interest for multiple days should match expected amount");
        
        // Verify interactions
        verify(balanceHistoryProvider, times(daysToProcess))
            .getDailyBalance(eq(accountId), eq(accountType), any(LocalDate.class));
        
        verify(dailyAccrualRepository, times(daysToProcess))
            .saveDailyAccrual(eq(accountId), eq(accountType), any(LocalDate.class), 
                any(BigDecimal.class), any(BigDecimal.class), eq(interestRate),
                eq(DAYS_IN_YEAR_365), eq(false), eq(null));
    }
}