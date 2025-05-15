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
package org.apache.fineract.portfolio.savings.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.apache.fineract.infrastructure.core.domain.LocalDateInterval;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.savings.SavingsCompoundingInterestPeriodType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationDaysInYearType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationType;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.interest.PostingPeriod;
import org.apache.fineract.portfolio.savings.domain.interest.SavingsAccountTransactionDetailsForPostingPeriod;
import org.springframework.stereotype.Service;

/**
 * Implementation of FixedDepositInterestCalculator that calculates interest for fixed deposit accounts
 * based on deposit amount, term, and interest rate.
 */
@Service
public class FixedDepositInterestCalculatorImpl implements FixedDepositInterestCalculator {

    @Override
    public Money calculateTotalInterest(final FixedDepositAccount account, final MathContext mc, final boolean isPreMatureClosure) {
        LocalDate startDate = account.depositStartDate();
        LocalDate maturityDate = account.calculateMaturityDate();
        
        if (isPreMatureClosure) {
            maturityDate = DateUtils.getBusinessLocalDate();
        }
        
        if (startDate == null || maturityDate == null || maturityDate.isBefore(startDate)) {
            return Money.zero(account.getCurrency());
        }
        
        return calculateInterest(account, startDate, maturityDate, mc, isPreMatureClosure);
    }

    @Override
    public Money calculateInterest(final FixedDepositAccount account, final LocalDate fromDate, 
            final LocalDate toDate, final MathContext mc, final boolean isPreMatureClosure) {
        
        if (fromDate == null || toDate == null || toDate.isBefore(fromDate)) {
            return Money.zero(account.getCurrency());
        }
        
        // Get deposit amount
        final BigDecimal depositAmount = account.getAccountBalance();
        
        // Get compounding type
        final SavingsCompoundingInterestPeriodType compoundingType = getCompoundingInterestPeriodType(account);
        
        // Get interest calculation type
        final SavingsInterestCalculationType interestCalculationType = getInterestCalculationType(account);
        
        // Get days in year type
        final SavingsInterestCalculationDaysInYearType daysInYearType = getDaysInYearType(account);
        
        // Get effective interest rate, applying any pre-mature closure penalty if applicable
        final BigDecimal interestRateAsFraction = getEffectiveInterestRate(account, mc, isPreMatureClosure)
                .divide(BigDecimal.valueOf(100), mc); // Convert to fraction
        
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
                1); // January as default financial year beginning
        
        // Calculate interest for the period
        return postingPeriod.calculateInterest(mc);
    }

    @Override
    public Money calculateMaturityAmount(final FixedDepositAccount account, final MathContext mc, final boolean isPreMatureClosure) {
        // Calculate total interest
        Money totalInterest = calculateTotalInterest(account, mc, isPreMatureClosure);
        
        // Add the original deposit amount
        Money depositAmount = Money.of(account.getCurrency(), account.getAccountBalance());
        
        // Return the maturity amount
        return depositAmount.plus(totalInterest);
    }

    @Override
    public BigDecimal getEffectiveInterestRate(final FixedDepositAccount account, 
            final MathContext mc, final boolean isPreMatureClosure) {
        
        BigDecimal applicableInterestRate = account.getNominalAnnualInterestRate();
        
        // Apply interest chart rate if available
        if (account.chart != null) {
            final BigDecimal depositAmount = account.getAccountBalance();
            LocalDate depositStartDate = account.depositStartDate();
            LocalDate depositCloseDate = account.calculateMaturityDate();
            
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
                }
            } else {
                // If not pre-mature or no penalty applies, just get the applicable rate from the chart
                applicableInterestRate = account.chart.getApplicableInterestRate(
                        depositAmount, depositStartDate, depositCloseDate, account.client);
            }
        }
        
        return applicableInterestRate;
    }

    @Override
    public BigDecimal getApplicableInterestRate(FixedDepositAccount account, BigDecimal depositAmount,
            LocalDate depositStartDate, LocalDate depositEndDate) {
        
        BigDecimal applicableInterestRate = account.getNominalAnnualInterestRate();
        
        // Check if interest rate chart is available and apply it
        if (account.chart != null) {
            applicableInterestRate = account.chart.getApplicableInterestRate(
                    depositAmount, depositStartDate, depositEndDate, account.client);
        }
        
        return applicableInterestRate;
    }
    
    // Private helper methods
    
    private SavingsCompoundingInterestPeriodType getCompoundingInterestPeriodType(FixedDepositAccount account) {
        return SavingsCompoundingInterestPeriodType.fromInt(account.getInterestCompoundingPeriodType());
    }
    
    private SavingsInterestCalculationType getInterestCalculationType(FixedDepositAccount account) {
        return SavingsInterestCalculationType.fromInt(account.getInterestCalculationType());
    }
    
    private SavingsInterestCalculationDaysInYearType getDaysInYearType(FixedDepositAccount account) {
        return SavingsInterestCalculationDaysInYearType.fromInt(account.getInterestCalculationDaysInYearType());
    }
}