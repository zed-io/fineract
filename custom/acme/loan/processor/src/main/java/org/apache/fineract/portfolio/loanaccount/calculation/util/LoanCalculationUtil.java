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

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.common.domain.DaysInMonthType;
import org.apache.fineract.portfolio.common.domain.DaysInYearType;

/**
 * Utility class for loan calculations
 */
public final class LoanCalculationUtil {
    
    private LoanCalculationUtil() {
        // Private constructor to prevent instantiation
    }
    
    /**
     * Calculates the number of days between two dates
     *
     * @param startDate The start date
     * @param endDate The end date
     * @return The number of days between the dates
     */
    public static int calculateDaysBetween(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return 0;
        }
        return (int) ChronoUnit.DAYS.between(startDate, endDate);
    }
    
    /**
     * Gets the number of days in the year based on the type
     *
     * @param daysInYearType The days in year type
     * @param date The date to use for days in year calculation
     * @return The number of days in the year
     */
    public static int calculateDaysInYear(DaysInYearType daysInYearType, LocalDate date) {
        switch (daysInYearType) {
            case DAYS_360:
                return 360;
            case DAYS_364:
                return 364;
            case DAYS_365:
                return 365;
            case ACTUAL:
                if (date.isLeapYear()) {
                    return 366;
                }
                return 365;
            default:
                return 365;
        }
    }
    
    /**
     * Gets the number of days in a month based on the type
     *
     * @param daysInMonthType The days in month type
     * @param date The date for which to get days in month
     * @return The number of days in the month
     */
    public static int calculateDaysInMonth(DaysInMonthType daysInMonthType, LocalDate date) {
        switch (daysInMonthType) {
            case DAYS_30:
                return 30;
            case ACTUAL:
                return date.lengthOfMonth();
            default:
                return 30;
        }
    }
    
    /**
     * Calculates the PMT (loan payment) amount for equal installment loans
     *
     * @param interestRatePerPeriod The interest rate per period
     * @param numberOfRepayments The total number of repayments
     * @param presentValue The present value or principal amount
     * @param futureValue The future value (usually 0)
     * @param type The payment type (0 for payments at end of period, 1 for payments at beginning)
     * @param mc The math context for precision
     * @return The payment amount per period
     */
    public static BigDecimal calculatePmt(BigDecimal interestRatePerPeriod, int numberOfRepayments, 
                                          BigDecimal presentValue, BigDecimal futureValue, boolean type, MathContext mc) {
        
        // Converting to monthly interest rate by dividing annual rate by 12
        BigDecimal r = interestRatePerPeriod;
        BigDecimal pv = presentValue;
        int n = numberOfRepayments;
        BigDecimal fv = (futureValue != null) ? futureValue : BigDecimal.ZERO;
        int t = type ? 1 : 0;
        
        if (r.compareTo(BigDecimal.ZERO) == 0) {
            return pv.negate().add(fv).divide(BigDecimal.valueOf(n), mc);
        }
        
        // Calculate (1+r)^n
        BigDecimal onePlusR = BigDecimal.ONE.add(r);
        BigDecimal onePlusRPowN = onePlusR.pow(n, mc);
        
        // Calculate numerator and denominator
        BigDecimal numerator = pv.multiply(onePlusR.pow(n, mc)).add(fv.negate());
        
        BigDecimal denominator;
        if (t == 1) {
            // Payment at beginning of period
            denominator = BigDecimal.ONE.divide(r, mc).multiply(onePlusRPowN.subtract(BigDecimal.ONE)).multiply(onePlusR);
        } else {
            // Payment at end of period
            denominator = BigDecimal.ONE.divide(r, mc).multiply(onePlusRPowN.subtract(BigDecimal.ONE));
        }
        
        return numerator.divide(denominator, mc).negate();
    }
    
    /**
     * Calculates the daily interest rate from an annual nominal interest rate
     *
     * @param annualNominalInterestRate The annual nominal interest rate
     * @param daysInYear The number of days in a year
     * @param mc The math context for precision
     * @return The daily interest rate
     */
    public static BigDecimal calculateDailyInterestRate(BigDecimal annualNominalInterestRate, int daysInYear, MathContext mc) {
        return annualNominalInterestRate.divide(BigDecimal.valueOf(100), mc)
                .divide(BigDecimal.valueOf(daysInYear), mc);
    }
    
    /**
     * Calculates the interest amount for a period
     *
     * @param outstandingBalance The outstanding principal balance
     * @param interestRatePerDay The interest rate per day
     * @param numberOfDays The number of days in the period
     * @param mc The math context for precision
     * @return The interest amount
     */
    public static Money calculateInterestForDays(Money outstandingBalance, BigDecimal interestRatePerDay, 
                                                int numberOfDays, MathContext mc) {
        final BigDecimal amount = outstandingBalance.getAmount().multiply(interestRatePerDay, mc)
                .multiply(BigDecimal.valueOf(numberOfDays), mc);
        return Money.of(outstandingBalance.getCurrency(), amount);
    }
    
    /**
     * Rounds an amount to a specified number of decimal places
     *
     * @param amount The amount to round
     * @param places The number of decimal places
     * @param roundingMode The rounding mode to use
     * @return The rounded amount
     */
    public static BigDecimal round(BigDecimal amount, int places, RoundingMode roundingMode) {
        return amount.setScale(places, roundingMode);
    }
}