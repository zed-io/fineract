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
import java.time.temporal.ChronoUnit;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanInstallmentCalculationParameters;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanScheduleResult;
import org.apache.fineract.portfolio.loanaccount.calculation.util.LoanCalculationUtil;
import org.springframework.stereotype.Component;

/**
 * Implementation of loan calculation engine for declining balance loans with equal principal.
 * 
 * <p>
 * When amortized using equal principal payments, the principal component of each installment is fixed and
 * interest due is calculated from the outstanding principal balance resulting in a different total
 * payment due for each installment.
 * </p>
 */
@Component
public class DecliningBalanceEqualPrincipalCalculationEngine extends AbstractLoanCalculationEngine {

    /**
     * {@inheritDoc}
     */
    @Override
    public LoanScheduleResult calculateInstallmentAmount(LoanInstallmentCalculationParameters installmentParams, MathContext mathContext) {
        
        // Calculate interest for the period
        Money interestForPeriod = calculateInterestForPeriod(installmentParams, mathContext);
        
        // If in interest grace period, no interest is due
        if (installmentParams.isInterestGrace()) {
            interestForPeriod = Money.zero(installmentParams.getOutstandingBalance().getCurrency());
        }
        
        // Calculate principal for the period
        Money principalForPeriod = calculatePrincipalForPeriod(installmentParams, interestForPeriod, mathContext);
        
        // If in principal grace period, no principal is due
        if (installmentParams.isPrincipalGrace()) {
            principalForPeriod = Money.zero(installmentParams.getOutstandingBalance().getCurrency());
        }
        
        // For last installment, principal may need adjustment to match the outstanding balance
        if (installmentParams.isLastInstallment()) {
            principalForPeriod = installmentParams.getOutstandingBalance();
        }
        
        // Return the schedule result with zero fees and penalties (these are typically added later)
        return new LoanScheduleResult.Builder()
                .withPrincipal(principalForPeriod)
                .withInterest(interestForPeriod)
                .withFee(Money.zero(installmentParams.getOutstandingBalance().getCurrency()))
                .withPenalty(Money.zero(installmentParams.getOutstandingBalance().getCurrency()))
                .build();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Money calculatePrincipalForPeriod(LoanInstallmentCalculationParameters installmentParams, 
            Money interestForPeriod, MathContext mathContext) {
        
        Money outstandingBalance = installmentParams.getOutstandingBalance();
        
        // If there's a fixed principal amount, use that
        if (installmentParams.getFixedEmiAmount() != null && 
                installmentParams.getFixedEmiAmount().compareTo(BigDecimal.ZERO) > 0) {
            
            Money fixedPrincipal = Money.of(outstandingBalance.getCurrency(), installmentParams.getFixedEmiAmount());
            
            // Principal cannot be more than outstanding balance
            if (fixedPrincipal.isGreaterThan(outstandingBalance)) {
                fixedPrincipal = outstandingBalance;
            }
            
            return fixedPrincipal;
        }
        
        // For equal principal, divide the original loan amount by the number of installments
        int remainingPeriods = installmentParams.getTotalNumberOfPeriods() - installmentParams.getPeriodNumber() + 1;
        
        if (remainingPeriods > 0 && outstandingBalance.isGreaterThanZero()) {
            if (installmentParams.isLastInstallment()) {
                // For the last installment, use the outstanding balance as principal
                return outstandingBalance;
            } else {
                // Otherwise, divide the outstanding balance by the remaining periods
                BigDecimal principalAmount = outstandingBalance.getAmount()
                        .divide(BigDecimal.valueOf(remainingPeriods), mathContext);
                
                Money principalPortion = Money.of(outstandingBalance.getCurrency(), principalAmount);
                
                // Principal cannot be more than outstanding balance
                if (principalPortion.isGreaterThan(outstandingBalance)) {
                    principalPortion = outstandingBalance;
                }
                
                return principalPortion;
            }
        }
        
        return Money.zero(outstandingBalance.getCurrency());
    }

    /**
     * Calculate the interest for the given period
     *
     * @param installmentParams The installment parameters
     * @param mathContext The math context for precision
     * @return The interest amount for the period
     */
    private Money calculateInterestForPeriod(LoanInstallmentCalculationParameters installmentParams, MathContext mathContext) {
        if (installmentParams.getOutstandingBalance().isGreaterThanZero()) {
            // Calculate days in period
            int periodDays = (int) ChronoUnit.DAYS.between(
                    installmentParams.getPeriodStartDate(), installmentParams.getPeriodEndDate());
            
            // Calculate days in year based on configuration
            int daysInYear = LoanCalculationUtil.calculateDaysInYear(
                    installmentParams.getDaysInYearType(), installmentParams.getPeriodEndDate());
            
            // Calculate interest amount using the standard interest calculation
            return calculateInterestForPeriod(
                    installmentParams.getOutstandingBalance(),
                    installmentParams.getAnnualNominalInterestRate(),
                    periodDays,
                    daysInYear,
                    mathContext);
        }
        return Money.zero(installmentParams.getOutstandingBalance().getCurrency());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public LoanCalculationEngineType getType() {
        return LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_PRINCIPAL;
    }
}