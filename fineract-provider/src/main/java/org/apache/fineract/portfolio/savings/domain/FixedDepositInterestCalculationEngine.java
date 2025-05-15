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

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.fineract.infrastructure.core.domain.LocalDateInterval;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationEngine;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategyType;
import org.apache.fineract.portfolio.savings.SavingsCompoundingInterestPeriodType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationDaysInYearType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationType;
import org.apache.fineract.portfolio.savings.SavingsPostingInterestPeriodType;
import org.apache.fineract.portfolio.savings.domain.interest.PostingPeriod;
import org.apache.fineract.portfolio.savings.domain.interest.SavingsAccountTransactionDetailsForPostingPeriod;
import org.springframework.stereotype.Component;

/**
 * A specialized interest calculation engine for fixed deposit accounts.
 * 
 * This implementation handles the specific needs of fixed deposit accounts:
 * - Interest calculation based on term deposit amount and duration
 * - Support for different interest rates based on term length
 * - Handling of pre-mature withdrawals and associated penalties
 */
@Component
public class FixedDepositInterestCalculationEngine {

    /**
     * Calculates the total interest for a fixed deposit over its entire term.
     *
     * @param account The fixed deposit account
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The calculated interest amount
     */
    public Money calculateTotalInterest(final FixedDepositAccount account, final MathContext mc, final boolean isPreMatureClosure) {
        LocalDate startDate = account.depositStartDate();
        LocalDate maturityDate = account.maturityDate();
        
        if (isPreMatureClosure) {
            maturityDate = DateUtils.getBusinessLocalDate();
        }
        
        if (startDate == null || maturityDate == null || maturityDate.isBefore(startDate)) {
            return Money.zero(account.getCurrency());
        }
        
        return calculateInterest(account, startDate, maturityDate, mc, isPreMatureClosure);
    }
    
    /**
     * Calculates the interest for a fixed deposit for a specific period.
     *
     * @param account The fixed deposit account
     * @param fromDate The start date of the period
     * @param toDate The end date of the period
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The calculated interest amount
     */
    public Money calculateInterest(final FixedDepositAccount account, final LocalDate fromDate, 
            final LocalDate toDate, final MathContext mc, final boolean isPreMatureClosure) {
        
        if (fromDate == null || toDate == null || toDate.isBefore(fromDate)) {
            return Money.zero(account.getCurrency());
        }
        
        // Get account details
        final BigDecimal depositAmount = account.getAccountBalance();
        final SavingsCompoundingInterestPeriodType compoundingType = SavingsCompoundingInterestPeriodType
                .fromInt(account.getInterestCompoundingPeriodType());
        final SavingsPostingInterestPeriodType postingPeriodType = SavingsPostingInterestPeriodType
                .fromInt(account.getInterestPostingPeriodType());
        final SavingsInterestCalculationType interestCalculationType = SavingsInterestCalculationType
                .fromInt(account.getInterestCalculationType());
        final SavingsInterestCalculationDaysInYearType daysInYearType = SavingsInterestCalculationDaysInYearType
                .fromInt(account.getInterestCalculationDaysInYearType());
        
        // Get financial year beginning month for posting period calculations
        final Integer financialYearBeginningMonth = 1; // January (can be configured)
        
        // Get the effective interest rate, applying any pre-mature closure penalty if applicable
        final BigDecimal interestRateAsFraction = getEffectiveInterestRateAsFraction(account, mc, isPreMatureClosure);
        
        // Create a single interval for the entire deposit period
        final LocalDateInterval periodInterval = LocalDateInterval.create(fromDate, toDate);
        
        // Create transaction list with initial deposit amount
        List<SavingsAccountTransactionDetailsForPostingPeriod> transactionDetails = new ArrayList<>();
        SavingsAccountTransactionDetailsForPostingPeriod initialDeposit = 
                new SavingsAccountTransactionDetailsForPostingPeriod(fromDate, Money.of(account.getCurrency(), depositAmount), null);
        transactionDetails.add(initialDeposit);
        
        // For fixed deposits, we create a single posting period for the entire term
        final PostingPeriod postingPeriod = PostingPeriod.createFrom(
                periodInterval, 
                Money.of(account.getCurrency(), depositAmount), // opening balance
                transactionDetails,
                account.getCurrency(),
                compoundingType,
                interestCalculationType,
                interestRateAsFraction,
                daysInYearType.getValue(),
                toDate, // maturity date
                null, // no interest post transactions
                false, // no interest transfers
                Money.zero(account.getCurrency()), // no minimum balance requirement
                false, // not posting at period end
                false, // not a user posting
                financialYearBeginningMonth);
        
        // Calculate interest for the period
        return postingPeriod.calculateInterest(mc);
    }
    
    /**
     * Gets the effective interest rate for a fixed deposit account considering penalties for pre-mature closure.
     *
     * @param account The fixed deposit account
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The effective interest rate as a fraction (e.g., 0.05 for 5%)
     */
    private BigDecimal getEffectiveInterestRateAsFraction(final FixedDepositAccount account, 
            final MathContext mc, final boolean isPreMatureClosure) {
        
        BigDecimal applicableInterestRate = account.getNominalAnnualInterestRate();
        
        // Apply interest chart rate if available
        if (account.chart != null) {
            final BigDecimal depositAmount = account.getAccountBalance();
            LocalDate depositStartDate = account.depositStartDate();
            LocalDate depositCloseDate = account.maturityDate();
            
            // For pre-mature closure, adjust the close date and potentially apply penalties
            if (isPreMatureClosure && account.accountTermAndPreClosure != null) {
                if (account.accountTermAndPreClosure.isPreClosurePenalApplicable()) {
                    depositCloseDate = DateUtils.getBusinessLocalDate();
                    
                    // Get penalty interest rate
                    BigDecimal penalInterest = account.accountTermAndPreClosure.depositPreClosureDetail().preClosurePenalInterest();
                    
                    // Get applicable interest rate from chart
                    applicableInterestRate = account.chart.getApplicableInterestRate(
                            depositAmount, depositStartDate, depositCloseDate, account.client);
                    
                    // Apply penalty by reducing the interest rate
                    applicableInterestRate = applicableInterestRate.subtract(penalInterest);
                    
                    // Ensure rate doesn't go below zero
                    if (applicableInterestRate.compareTo(BigDecimal.ZERO) < 0) {
                        applicableInterestRate = BigDecimal.ZERO;
                    }
                    
                    return applicableInterestRate.divide(BigDecimal.valueOf(100L), mc); // Convert to fraction
                }
            }
            
            // If not pre-mature or no penalty applies, just get the applicable rate from the chart
            applicableInterestRate = account.chart.getApplicableInterestRate(
                    depositAmount, depositStartDate, depositCloseDate, account.client);
        }
        
        // Convert the annual rate to a fraction
        return applicableInterestRate.divide(BigDecimal.valueOf(100L), mc);
    }
    
    /**
     * Calculates the maturity amount for a fixed deposit account.
     *
     * @param account The fixed deposit account
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The calculated maturity amount
     */
    public Money calculateMaturityAmount(final FixedDepositAccount account, final MathContext mc, final boolean isPreMatureClosure) {
        // Calculate total interest
        Money totalInterest = calculateTotalInterest(account, mc, isPreMatureClosure);
        
        // Add the original deposit amount
        Money depositAmount = Money.of(account.getCurrency(), account.getAccountBalance());
        
        // Return the maturity amount
        return depositAmount.plus(totalInterest);
    }
}