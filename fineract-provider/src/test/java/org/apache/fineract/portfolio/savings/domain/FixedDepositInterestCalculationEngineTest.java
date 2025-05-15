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
package org.apache.fineract.portfolio.savings.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;

import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.savings.SavingsCompoundingInterestPeriodType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationDaysInYearType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationType;
import org.apache.fineract.portfolio.savings.SavingsPostingInterestPeriodType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class FixedDepositInterestCalculationEngineTest {

    @InjectMocks
    private FixedDepositInterestCalculationEngine engine;
    
    private FixedDepositAccount testAccount;
    private LocalDate startDate;
    private LocalDate maturityDate;
    private final MathContext mc = MathContext.DECIMAL64;
    private final MonetaryCurrency currency = new MonetaryCurrency("USD", 2, 0);

    @BeforeEach
    public void setUp() {
        startDate = LocalDate.of(2023, 1, 1);
        maturityDate = LocalDate.of(2023, 7, 1); // 6 months
        
        // Set up test account
        testAccount = mock(FixedDepositAccount.class);
        DepositAccountInterestRateChart chart = mock(DepositAccountInterestRateChart.class);
        
        // Mock account properties
        when(testAccount.depositStartDate()).thenReturn(startDate);
        when(testAccount.maturityDate()).thenReturn(maturityDate);
        when(testAccount.getAccountBalance()).thenReturn(BigDecimal.valueOf(10000.0));
        when(testAccount.getCurrency()).thenReturn(currency);
        when(testAccount.getNominalAnnualInterestRate()).thenReturn(BigDecimal.valueOf(5.0));
        when(testAccount.getInterestCompoundingPeriodType()).thenReturn(SavingsCompoundingInterestPeriodType.DAILY.getValue());
        when(testAccount.getInterestPostingPeriodType()).thenReturn(SavingsPostingInterestPeriodType.MONTHLY.getValue());
        when(testAccount.getInterestCalculationType()).thenReturn(SavingsInterestCalculationType.DAILY_BALANCE.getValue());
        when(testAccount.getInterestCalculationDaysInYearType())
                .thenReturn(SavingsInterestCalculationDaysInYearType.DAYS_365.getValue());
        
        // Mock chart behavior
        when(testAccount.chart).thenReturn(chart);
        when(chart.getApplicableInterestRate(any(), any(), any(), any())).thenReturn(BigDecimal.valueOf(5.0));
    }

    @Test
    public void testCalculateTotalInterest_Standard() {
        // Arrange
        final boolean isPreMatureClosure = false;
        
        // Act
        Money result = engine.calculateTotalInterest(testAccount, mc, isPreMatureClosure);
        
        // Assert
        assertNotNull(result);
        assertEquals(currency, result.getCurrency());
        
        // Expected interest for 10,000 at 5% for 6 months = 10000 * 0.05 * (6/12) = 250
        // Assuming simple interest without compounding for this basic test
        BigDecimal expectedAmount = BigDecimal.valueOf(250.0).setScale(currency.getDigitsAfterDecimal());
        
        // Allow small rounding differences due to how the actual calculation works with daily compounding
        BigDecimal difference = result.getAmount().subtract(expectedAmount).abs();
        
        // Assert that the difference is small (within reasonable tolerance)
        assertTrue(difference.compareTo(BigDecimal.valueOf(25)) < 0, 
                "Expected roughly $250 interest (allowing for compounding differences), but got: " + result.getAmount());
    }
    
    @Test
    public void testCalculateTotalInterest_PreMatureClosure() {
        // Arrange
        final boolean isPreMatureClosure = true;
        
        // Set up pre-mature closure behavior - typically with penalty rate
        when(testAccount.accountTermAndPreClosure).thenReturn(mock(DepositAccountTermAndPreClosure.class));
        when(testAccount.accountTermAndPreClosure.isPreClosurePenalApplicable()).thenReturn(true);
        when(testAccount.accountTermAndPreClosure.depositPreClosureDetail()).thenReturn(mock(DepositPreClosureDetail.class));
        when(testAccount.accountTermAndPreClosure.depositPreClosureDetail().preClosurePenalInterest())
                .thenReturn(BigDecimal.valueOf(1.0)); // 1% penalty
        
        // Act
        Money result = engine.calculateTotalInterest(testAccount, mc, isPreMatureClosure);
        
        // Assert
        assertNotNull(result);
        
        // Expected interest with penalty: effective rate of 4% (5% - 1% penalty) for partial term
        // Since we're mocking the current date, this is approximate
        BigDecimal expectedAmount = BigDecimal.valueOf(200.0).setScale(currency.getDigitsAfterDecimal());
        
        // Allow larger tolerance for the pre-mature case since the actual calculation involves
        // more complex date calculations
        BigDecimal difference = result.getAmount().subtract(expectedAmount).abs();
        
        // Assert that the difference is within reasonable tolerance
        assertTrue(difference.compareTo(BigDecimal.valueOf(50)) < 0, 
                "Expected roughly $200 interest after penalty (allowing for differences), but got: " + result.getAmount());
    }
    
    @Test
    public void testCalculateMaturityAmount() {
        // Arrange
        final boolean isPreMatureClosure = false;
        
        // Act
        Money result = engine.calculateMaturityAmount(testAccount, mc, isPreMatureClosure);
        
        // Assert
        assertNotNull(result);
        
        // Expected maturity amount = principal + interest = 10000 + 250 = 10250
        BigDecimal expectedPrincipal = BigDecimal.valueOf(10000.0);
        BigDecimal expectedInterest = BigDecimal.valueOf(250.0);
        BigDecimal expectedTotal = expectedPrincipal.add(expectedInterest).setScale(currency.getDigitsAfterDecimal());
        
        // Allow some tolerance for rounding and implementation details
        BigDecimal difference = result.getAmount().subtract(expectedTotal).abs();
        
        // Assert that the difference is small
        assertTrue(difference.compareTo(BigDecimal.valueOf(25)) < 0, 
                "Expected roughly $10,250 maturity amount, but got: " + result.getAmount());
    }
    
    private void assertTrue(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}