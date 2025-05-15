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
package org.apache.fineract.portfolio.loanaccount.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.common.domain.DaysInMonthType;
import org.apache.fineract.portfolio.common.domain.DaysInYearType;
import org.apache.fineract.portfolio.common.domain.PeriodFrequencyType;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanCalculationParameters;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanInstallmentCalculationParameters;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanScheduleResult;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanScheduleModel;
import org.apache.fineract.portfolio.loanproduct.domain.AmortizationMethod;
import org.apache.fineract.portfolio.loanproduct.domain.InterestCalculationPeriodMethod;
import org.apache.fineract.portfolio.loanproduct.domain.InterestMethod;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the DecliningBalanceEqualPrincipalCalculationEngine.
 */
public class DecliningBalanceEqualPrincipalCalculationEngineTest {

    private DecliningBalanceEqualPrincipalCalculationEngine engine;
    private MathContext mathContext;
    private MonetaryCurrency currency;

    @BeforeEach
    public void setup() {
        engine = new DecliningBalanceEqualPrincipalCalculationEngine();
        mathContext = new MathContext(8, RoundingMode.HALF_EVEN);
        currency = new MonetaryCurrency("USD", 2, 0);
    }

    @Test
    public void testCalculateInterestForPeriod() {
        // Given
        Money principal = Money.of(currency, BigDecimal.valueOf(10000));
        BigDecimal annualInterestRate = BigDecimal.valueOf(12.0); // 12%
        int periodDays = 30;
        int daysInYear = 365;

        // When
        Money interest = engine.calculateInterestForPeriod(principal, annualInterestRate, periodDays, daysInYear, mathContext);

        // Then
        assertNotNull(interest);
        // Interest = 10000 * (12% / 365) * 30 = 10000 * 0.00032877 * 30 = 98.63
        assertEquals(new BigDecimal("98.63"), interest.getAmount().setScale(2, RoundingMode.HALF_EVEN));
    }

    @Test
    public void testCalculateInstallmentAmount() {
        // Given
        Money outstandingBalance = Money.of(currency, BigDecimal.valueOf(10000));
        BigDecimal annualInterestRate = BigDecimal.valueOf(12.0); // 12%
        LocalDate startDate = LocalDate.of(2023, 1, 1);
        LocalDate endDate = LocalDate.of(2023, 1, 31);

        LoanInstallmentCalculationParameters params = new LoanInstallmentCalculationParameters.Builder()
                .withOutstandingBalance(outstandingBalance)
                .withAnnualNominalInterestRate(annualInterestRate)
                .withPeriodNumber(1)
                .withTotalNumberOfPeriods(12)
                .withPeriodStartDate(startDate)
                .withPeriodEndDate(endDate)
                .withDaysInMonthType(DaysInMonthType.ACTUAL)
                .withDaysInYearType(DaysInYearType.ACTUAL)
                .withInterestMethod(InterestMethod.DECLINING_BALANCE)
                .withAmortizationMethod(AmortizationMethod.EQUAL_PRINCIPAL)
                .build();

        // When
        LoanScheduleResult result = engine.calculateInstallmentAmount(params, mathContext);

        // Then
        assertNotNull(result);
        assertNotNull(result.getPrincipal());
        assertNotNull(result.getInterest());
        
        // Interest calculation should match our test above
        assertEquals(new BigDecimal("98.63"), result.getInterest().getAmount().setScale(2, RoundingMode.HALF_EVEN));
        
        // For equal principal, the principal payment is simply the loan amount divided by number of periods
        // Principal = 10000 / 12 = 833.33
        assertEquals(new BigDecimal("833.33"), result.getPrincipal().getAmount().setScale(2, RoundingMode.HALF_EVEN));
        
        // Total due = Principal + Interest = 833.33 + 98.63 = 931.96
        assertEquals(new BigDecimal("931.96"), result.getTotalDue().getAmount().setScale(2, RoundingMode.HALF_EVEN));
    }
    
    @Test
    public void testCalculateLoanSchedule() {
        // Given
        Money principal = Money.of(currency, BigDecimal.valueOf(10000));
        BigDecimal annualInterestRate = BigDecimal.valueOf(12.0); // 12%
        int numberOfRepayments = 12;
        LocalDate disbursementDate = LocalDate.of(2023, 1, 1);
        
        LoanCalculationParameters params = new LoanCalculationParameters.Builder()
                .withPrincipal(principal)
                .withAnnualNominalInterestRate(annualInterestRate)
                .withNumberOfRepayments(numberOfRepayments)
                .withRepaymentEvery(1)
                .withRepaymentPeriodFrequencyType(PeriodFrequencyType.MONTHS)
                .withExpectedDisbursementDate(disbursementDate)
                .withInterestMethod(InterestMethod.DECLINING_BALANCE)
                .withAmortizationMethod(AmortizationMethod.EQUAL_PRINCIPAL)
                .withInterestCalculationPeriodMethod(InterestCalculationPeriodMethod.SAME_AS_REPAYMENT_PERIOD)
                .withDaysInMonthType(DaysInMonthType.ACTUAL)
                .withDaysInYearType(DaysInYearType.ACTUAL)
                .build();
        
        // When
        LoanScheduleModel scheduleModel = engine.calculateLoanSchedule(params, mathContext);
        
        // Then
        assertNotNull(scheduleModel);
        assertEquals(12, scheduleModel.getPeriods().size());
        
        // For equal principal, all principal payments should be equal (except possibly the last one due to rounding)
        // Principal per period = 10000 / 12 = 833.33
        BigDecimal expectedPrincipalPerPeriod = principal.getAmount().divide(
                BigDecimal.valueOf(numberOfRepayments), mathContext)
                .setScale(2, RoundingMode.HALF_EVEN);
        
        for (int i = 0; i < scheduleModel.getPeriods().size() - 1; i++) {
            assertEquals(expectedPrincipalPerPeriod, 
                         scheduleModel.getPeriods().get(i).getPrincipal().setScale(2, RoundingMode.HALF_EVEN));
        }
        
        // The sum of all principal payments should equal the original loan amount
        BigDecimal totalPrincipal = scheduleModel.getPeriods().stream()
                .map(period -> period.getPrincipal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        assertEquals(principal.getAmount().setScale(2, RoundingMode.HALF_EVEN), 
                     totalPrincipal.setScale(2, RoundingMode.HALF_EVEN));
        
        // The interest payments should decrease over time as the outstanding balance decreases
        for (int i = 1; i < scheduleModel.getPeriods().size(); i++) {
            BigDecimal previousInterest = scheduleModel.getPeriods().get(i-1).getInterest();
            BigDecimal currentInterest = scheduleModel.getPeriods().get(i).getInterest();
            assert(previousInterest.compareTo(currentInterest) >= 0);
        }
        
        // The outstanding balance on the last period should be zero
        assertEquals(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN), 
                     scheduleModel.getPeriods().get(scheduleModel.getPeriods().size() - 1)
                     .getOutstandingPrincipalBalance().setScale(2, RoundingMode.HALF_EVEN));
    }
    
    @Test
    public void testCalculateWithGracePeriod() {
        // Given
        Money principal = Money.of(currency, BigDecimal.valueOf(10000));
        BigDecimal annualInterestRate = BigDecimal.valueOf(12.0); // 12%
        int numberOfRepayments = 12;
        int principalGrace = 3; // 3 months grace period
        LocalDate disbursementDate = LocalDate.of(2023, 1, 1);
        
        LoanCalculationParameters params = new LoanCalculationParameters.Builder()
                .withPrincipal(principal)
                .withAnnualNominalInterestRate(annualInterestRate)
                .withNumberOfRepayments(numberOfRepayments)
                .withRepaymentEvery(1)
                .withRepaymentPeriodFrequencyType(PeriodFrequencyType.MONTHS)
                .withExpectedDisbursementDate(disbursementDate)
                .withInterestMethod(InterestMethod.DECLINING_BALANCE)
                .withAmortizationMethod(AmortizationMethod.EQUAL_PRINCIPAL)
                .withInterestCalculationPeriodMethod(InterestCalculationPeriodMethod.SAME_AS_REPAYMENT_PERIOD)
                .withDaysInMonthType(DaysInMonthType.ACTUAL)
                .withDaysInYearType(DaysInYearType.ACTUAL)
                .withPrincipalGrace(principalGrace)
                .build();
        
        // When
        LoanScheduleModel scheduleModel = engine.calculateLoanSchedule(params, mathContext);
        
        // Then
        assertNotNull(scheduleModel);
        assertEquals(12, scheduleModel.getPeriods().size());
        
        // First 3 periods should have zero principal payment due to grace period
        for (int i = 0; i < principalGrace; i++) {
            assertEquals(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN), 
                         scheduleModel.getPeriods().get(i).getPrincipal().setScale(2, RoundingMode.HALF_EVEN));
        }
        
        // For remaining periods, principal should be equal
        // Principal per period after grace = 10000 / (12 - 3) = 10000 / 9 = 1111.11
        BigDecimal expectedPrincipalPerPeriod = principal.getAmount().divide(
                BigDecimal.valueOf(numberOfRepayments - principalGrace), mathContext)
                .setScale(2, RoundingMode.HALF_EVEN);
        
        for (int i = principalGrace; i < scheduleModel.getPeriods().size() - 1; i++) {
            assertEquals(expectedPrincipalPerPeriod, 
                         scheduleModel.getPeriods().get(i).getPrincipal().setScale(2, RoundingMode.HALF_EVEN));
        }
        
        // The sum of all principal payments should still equal the original loan amount
        BigDecimal totalPrincipal = scheduleModel.getPeriods().stream()
                .map(period -> period.getPrincipal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        assertEquals(principal.getAmount().setScale(2, RoundingMode.HALF_EVEN), 
                     totalPrincipal.setScale(2, RoundingMode.HALF_EVEN));
    }
    
    @Test
    public void testGetType() {
        assertEquals(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_PRINCIPAL, engine.getType());
    }
}