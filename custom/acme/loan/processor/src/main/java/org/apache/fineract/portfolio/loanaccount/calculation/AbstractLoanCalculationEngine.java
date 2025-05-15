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

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.calendar.domain.CalendarInstance;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanCalculationParameters;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanInstallmentCalculationParameters;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanScheduleResult;
import org.apache.fineract.portfolio.loanaccount.calculation.util.LoanCalculationUtil;
import org.apache.fineract.portfolio.loanaccount.data.HolidayDetailDTO;
import org.apache.fineract.portfolio.loanaccount.domain.LoanCharge;
import org.apache.fineract.portfolio.loanaccount.loanschedule.data.LoanSchedulePeriodData;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanScheduleModel;
import org.apache.fineract.portfolio.loanproduct.domain.AmortizationMethod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Abstract base class for loan calculation engine implementations
 */
public abstract class AbstractLoanCalculationEngine implements LoanCalculationEngine {
    
    private static final Logger LOG = LoggerFactory.getLogger(AbstractLoanCalculationEngine.class);
    
    /**
     * {@inheritDoc}
     */
    @Override
    public LoanScheduleModel calculateLoanSchedule(LoanCalculationParameters calculationParameters, MathContext mathContext) {
        
        final List<LoanSchedulePeriodData> installments = new ArrayList<>();
        
        // Get the loan parameters
        final Money principal = calculationParameters.getPrincipal();
        final Integer numberOfRepayments = calculationParameters.getNumberOfRepayments();
        final BigDecimal annualNominalInterestRate = calculationParameters.getAnnualNominalInterestRate();
        final LocalDate disbursementDate = calculationParameters.getExpectedDisbursementDate();
        final LocalDate startDate = calculationParameters.getRepaymentsStartingFromDate();
        
        // Generate the schedule dates
        List<LocalDate> scheduleDates = generateScheduleDates(calculationParameters);
        
        // Initialize tracking variables
        Money outstandingBalance = principal;
        Money totalCumulativePrincipal = Money.zero(principal.getCurrency());
        Money totalCumulativeInterest = Money.zero(principal.getCurrency());
        Money totalFees = Money.zero(principal.getCurrency());
        Money totalPenalties = Money.zero(principal.getCurrency());
        
        // Process each period in the schedule
        for (int periodNumber = 1; periodNumber <= numberOfRepayments; periodNumber++) {
            LocalDate periodStartDate = (periodNumber == 1) ? disbursementDate : scheduleDates.get(periodNumber - 2);
            LocalDate periodEndDate = scheduleDates.get(periodNumber - 1);
            
            // Determine grace period statuses
            boolean inInterestGracePeriod = isInInterestGracePeriod(periodNumber, calculationParameters.getInterestChargingGrace());
            boolean inPrincipalGracePeriod = isInPrincipalGracePeriod(periodNumber, calculationParameters.getPrincipalGrace());
            boolean isLastInstallment = (periodNumber == numberOfRepayments);
            
            // Build installment parameters
            LoanInstallmentCalculationParameters installmentParams = new LoanInstallmentCalculationParameters.Builder()
                    .withOutstandingBalance(outstandingBalance)
                    .withAnnualNominalInterestRate(annualNominalInterestRate)
                    .withPeriodNumber(periodNumber)
                    .withTotalNumberOfPeriods(numberOfRepayments)
                    .withPeriodStartDate(periodStartDate)
                    .withPeriodEndDate(periodEndDate)
                    .withDaysInMonthType(calculationParameters.getDaysInMonthType())
                    .withDaysInYearType(calculationParameters.getDaysInYearType())
                    .withInterestMethod(calculationParameters.getInterestMethod())
                    .withAmortizationMethod(calculationParameters.getAmortizationMethod())
                    .withFixedEmiAmount(calculationParameters.getFixedEmiAmount())
                    .withInterestGrace(inInterestGracePeriod)
                    .withPrincipalGrace(inPrincipalGracePeriod)
                    .withLastInstallment(isLastInstallment)
                    .build();
            
            // Calculate the installment amount
            LoanScheduleResult result = calculateInstallmentAmount(installmentParams, mathContext);
            
            // Update the outstanding balance
            outstandingBalance = outstandingBalance.minus(result.getPrincipal());
            
            // Update cumulative totals
            totalCumulativePrincipal = totalCumulativePrincipal.plus(result.getPrincipal());
            totalCumulativeInterest = totalCumulativeInterest.plus(result.getInterest());
            totalFees = totalFees.plus(result.getFee());
            totalPenalties = totalPenalties.plus(result.getPenalty());
            
            // Create installment data
            LoanSchedulePeriodData installment = LoanSchedulePeriodData.repaymentOnlyPeriod(
                    periodNumber, periodStartDate, periodEndDate, 
                    result.getPrincipal().getAmount(), result.getInterest().getAmount(),
                    result.getFee().getAmount(), result.getPenalty().getAmount(),
                    outstandingBalance.getAmount(),
                    totalCumulativePrincipal.getAmount(), totalCumulativeInterest.getAmount());
            
            installments.add(installment);
        }
        
        return LoanScheduleModel.from(installments, calculationParameters.getLoanCharges());
    }
    
    /**
     * {@inheritDoc}
     */
    @Override
    public Money calculateInterestForPeriod(Money outstandingBalance, BigDecimal annualInterestRate, 
            int periodDays, int daysInYear, MathContext mathContext) {
        if (outstandingBalance.isGreaterThanZero()) {
            final BigDecimal dailyInterestRate = LoanCalculationUtil.calculateDailyInterestRate(
                    annualInterestRate, daysInYear, mathContext);
            return LoanCalculationUtil.calculateInterestForDays(outstandingBalance, dailyInterestRate, periodDays, mathContext);
        }
        return Money.zero(outstandingBalance.getCurrency());
    }
    
    /**
     * Generates the schedule dates for the loan
     *
     * @param calculationParameters The loan calculation parameters
     * @return List of repayment dates
     */
    protected List<LocalDate> generateScheduleDates(LoanCalculationParameters calculationParameters) {
        LocalDate startDate = calculationParameters.getRepaymentsStartingFromDate();
        if (startDate == null) {
            startDate = calculationParameters.getExpectedDisbursementDate();
        }
        
        List<LocalDate> scheduleDates = new ArrayList<>();
        LocalDate currentDate = startDate;
        
        for (int i = 0; i < calculationParameters.getNumberOfRepayments(); i++) {
            // Skip first period if we're starting from disbursement date
            if (i > 0 || startDate != calculationParameters.getExpectedDisbursementDate()) {
                // Add the current date to the schedule
                scheduleDates.add(currentDate);
            }
            
            // Move to next repayment date
            currentDate = getNextRepaymentDate(currentDate, calculationParameters);
        }
        
        return scheduleDates;
    }
    
    /**
     * Gets the next repayment date based on frequency and adjusts for holidays if needed
     *
     * @param currentDate The current repayment date
     * @param calculationParameters The loan calculation parameters
     * @return The next repayment date
     */
    protected LocalDate getNextRepaymentDate(LocalDate currentDate, LoanCalculationParameters calculationParameters) {
        LocalDate nextDate;
        switch (calculationParameters.getRepaymentPeriodFrequencyType()) {
            case DAYS:
                nextDate = currentDate.plusDays(calculationParameters.getRepaymentEvery());
                break;
            case WEEKS:
                nextDate = currentDate.plusWeeks(calculationParameters.getRepaymentEvery());
                break;
            case MONTHS:
                nextDate = currentDate.plusMonths(calculationParameters.getRepaymentEvery());
                break;
            case YEARS:
                nextDate = currentDate.plusYears(calculationParameters.getRepaymentEvery());
                break;
            default:
                nextDate = currentDate.plusMonths(1);
        }
        
        // Apply holiday adjustments if provided
        HolidayDetailDTO holidayDetailDTO = calculationParameters.getHolidayDetailDTO();
        if (holidayDetailDTO != null && holidayDetailDTO.isHolidayEnabled()) {
            while (holidayDetailDTO.isHoliday(nextDate) && !calculationParameters.isFirstRepaymentDateAllowedOnHoliday()) {
                if (holidayDetailDTO.getWorkingDays().isWorkingDay(nextDate.plusDays(1))) {
                    nextDate = nextDate.plusDays(1);
                } else {
                    nextDate = getNextWorkingDay(nextDate, holidayDetailDTO);
                }
            }
        }
        
        return nextDate;
    }
    
    /**
     * Gets the next working day after a holiday
     *
     * @param date The holiday date
     * @param holidayDetailDTO The holiday details
     * @return The next working day
     */
    private LocalDate getNextWorkingDay(LocalDate date, HolidayDetailDTO holidayDetailDTO) {
        LocalDate nextDate = date.plusDays(1);
        while (!holidayDetailDTO.getWorkingDays().isWorkingDay(nextDate)) {
            nextDate = nextDate.plusDays(1);
        }
        return nextDate;
    }
    
    /**
     * Checks if the current period is in interest charging grace period
     *
     * @param periodNumber The current period number
     * @param interestChargingGrace The number of interest charging grace periods
     * @return True if the period is in grace period
     */
    protected boolean isInInterestGracePeriod(int periodNumber, Integer interestChargingGrace) {
        return interestChargingGrace != null && periodNumber <= interestChargingGrace;
    }
    
    /**
     * Checks if the current period is in principal grace period
     *
     * @param periodNumber The current period number
     * @param principalGrace The number of principal grace periods
     * @return True if the period is in grace period
     */
    protected boolean isInPrincipalGracePeriod(int periodNumber, Integer principalGrace) {
        return principalGrace != null && periodNumber <= principalGrace;
    }
}