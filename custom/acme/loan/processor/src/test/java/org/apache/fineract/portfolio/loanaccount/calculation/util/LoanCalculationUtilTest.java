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
package org.apache.fineract.portfolio.loanaccount.calculation.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.common.domain.DaysInMonthType;
import org.apache.fineract.portfolio.common.domain.DaysInYearType;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the LoanCalculationUtil class.
 */
public class LoanCalculationUtilTest {

    @Test
    public void testCalculateDaysBetween() {
        // Given
        LocalDate date1 = LocalDate.of(2023, 1, 1);
        LocalDate date2 = LocalDate.of(2023, 1, 31);
        
        // When
        int days = LoanCalculationUtil.calculateDaysBetween(date1, date2);
        
        // Then
        assertEquals(30, days);
    }
    
    @Test
    public void testCalculateDaysInYear() {
        // Given
        LocalDate leapYearDate = LocalDate.of(2024, 1, 1);
        LocalDate regularYearDate = LocalDate.of(2023, 1, 1);
        
        // When & Then
        assertEquals(360, LoanCalculationUtil.calculateDaysInYear(DaysInYearType.DAYS_360, leapYearDate));
        assertEquals(364, LoanCalculationUtil.calculateDaysInYear(DaysInYearType.DAYS_364, leapYearDate));
        assertEquals(365, LoanCalculationUtil.calculateDaysInYear(DaysInYearType.DAYS_365, leapYearDate));
        assertEquals(366, LoanCalculationUtil.calculateDaysInYear(DaysInYearType.ACTUAL, leapYearDate));
        assertEquals(365, LoanCalculationUtil.calculateDaysInYear(DaysInYearType.ACTUAL, regularYearDate));
    }
    
    @Test
    public void testCalculateDaysInMonth() {
        // Given
        LocalDate thirtyOneDaysMonthDate = LocalDate.of(2023, 1, 1); // January has 31 days
        LocalDate februaryLeapYearDate = LocalDate.of(2024, 2, 1);   // February in a leap year has 29 days
        LocalDate februaryRegularYearDate = LocalDate.of(2023, 2, 1); // February in a regular year has 28 days
        
        // When & Then
        assertEquals(30, LoanCalculationUtil.calculateDaysInMonth(DaysInMonthType.DAYS_30, thirtyOneDaysMonthDate));
        assertEquals(31, LoanCalculationUtil.calculateDaysInMonth(DaysInMonthType.ACTUAL, thirtyOneDaysMonthDate));
        assertEquals(30, LoanCalculationUtil.calculateDaysInMonth(DaysInMonthType.DAYS_30, februaryLeapYearDate));
        assertEquals(29, LoanCalculationUtil.calculateDaysInMonth(DaysInMonthType.ACTUAL, februaryLeapYearDate));
        assertEquals(28, LoanCalculationUtil.calculateDaysInMonth(DaysInMonthType.ACTUAL, februaryRegularYearDate));
    }
    
    @Test
    public void testCalculatePmt() {
        // Given
        MathContext mathContext = new MathContext(8, RoundingMode.HALF_EVEN);
        BigDecimal interestRatePerPeriod = new BigDecimal("0.01"); // 1% per month
        int numberOfRepayments = 12;
        BigDecimal presentValue = new BigDecimal("10000");
        
        // When
        BigDecimal pmt = LoanCalculationUtil.calculatePmt(
                interestRatePerPeriod, numberOfRepayments, presentValue, BigDecimal.ZERO, false, mathContext);
        
        // Then
        // For a $10,000 loan at 1% monthly interest for 12 months, the PMT is approximately $888.49
        assertEquals(new BigDecimal("888.49"), pmt.setScale(2, RoundingMode.HALF_EVEN));
    }
    
    @Test
    public void testCalculatePmtWithZeroInterest() {
        // Given
        MathContext mathContext = new MathContext(8, RoundingMode.HALF_EVEN);
        BigDecimal interestRatePerPeriod = BigDecimal.ZERO;
        int numberOfRepayments = 12;
        BigDecimal presentValue = new BigDecimal("10000");
        
        // When
        BigDecimal pmt = LoanCalculationUtil.calculatePmt(
                interestRatePerPeriod, numberOfRepayments, presentValue, BigDecimal.ZERO, false, mathContext);
        
        // Then
        // For a $10,000 loan with 0% interest for 12 months, the payment is simply $10,000 / 12 = $833.33
        assertEquals(new BigDecimal("833.33"), pmt.setScale(2, RoundingMode.HALF_EVEN));
    }
    
    @Test
    public void testCalculateDailyInterestRate() {
        // Given
        MathContext mathContext = new MathContext(8, RoundingMode.HALF_EVEN);
        BigDecimal annualNominalInterestRate = new BigDecimal("12.00"); // 12%
        int daysInYear = 365;
        
        // When
        BigDecimal dailyRate = LoanCalculationUtil.calculateDailyInterestRate(
                annualNominalInterestRate, daysInYear, mathContext);
        
        // Then
        // Daily rate = 12% / 365 = 0.0003287671
        assertEquals(new BigDecimal("0.00032877"), dailyRate.setScale(8, RoundingMode.HALF_EVEN));
    }
    
    @Test
    public void testCalculateInterestForDays() {
        // Given
        MathContext mathContext = new MathContext(8, RoundingMode.HALF_EVEN);
        MonetaryCurrency currency = new MonetaryCurrency("USD", 2, 0);
        Money outstandingBalance = Money.of(currency, new BigDecimal("10000"));
        BigDecimal interestRatePerDay = new BigDecimal("0.00032877"); // 12% / 365
        int numberOfDays = 30;
        
        // When
        Money interest = LoanCalculationUtil.calculateInterestForDays(
                outstandingBalance, interestRatePerDay, numberOfDays, mathContext);
        
        // Then
        // Interest = 10000 * 0.00032877 * 30 = 98.631
        assertEquals(new BigDecimal("98.63"), interest.getAmount().setScale(2, RoundingMode.HALF_EVEN));
    }
    
    @Test
    public void testRound() {
        // Given
        BigDecimal amount = new BigDecimal("123.4567");
        
        // When & Then
        assertEquals(new BigDecimal("123.46"), LoanCalculationUtil.round(amount, 2, RoundingMode.HALF_EVEN));
        assertEquals(new BigDecimal("123.46"), LoanCalculationUtil.round(amount, 2, RoundingMode.HALF_UP));
        assertEquals(new BigDecimal("123.45"), LoanCalculationUtil.round(amount, 2, RoundingMode.DOWN));
        assertEquals(new BigDecimal("123.5"), LoanCalculationUtil.round(amount, 1, RoundingMode.HALF_UP));
    }
}