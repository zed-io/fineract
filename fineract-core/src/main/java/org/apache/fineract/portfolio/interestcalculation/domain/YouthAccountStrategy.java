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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.springframework.stereotype.Component;

/**
 * Youth/Student account interest calculation strategy.
 * <p>
 * This strategy calculates interest for youth or student accounts, typically offering:
 * <ul>
 *   <li>Higher base interest rates than standard accounts</li>
 *   <li>Lower or no minimum balance requirements</li>
 *   <li>Age-based rate tiers (e.g., higher rates for younger account holders)</li>
 *   <li>Special bonuses for maintaining savings during school terms</li>
 * </ul>
 */
@Component
public class YouthAccountStrategy extends AbstractInterestCalculationStrategy {

    // Delegate to a base calculation strategy
    private final InterestCalculationStrategy baseStrategy;
    
    // Special rate boost for youth accounts as a percentage
    private final BigDecimal youthRateBoost;
    
    // Maximum age to be eligible for the full youth rate
    private final int maxYouthAge;
    
    // Age at which the rate boost starts phasing out
    private final int phaseOutStartAge;
    
    /**
     * Constructor for YouthAccountStrategy.
     * 
     * @param baseStrategy The base strategy to calculate the initial interest amount
     * @param youthRateBoost Additional interest rate for youth accounts (as decimal)
     * @param maxYouthAge Maximum age for full youth rate eligibility
     * @param phaseOutStartAge Age at which rate boost starts decreasing
     */
    public YouthAccountStrategy(
            InterestCalculationStrategy baseStrategy,
            BigDecimal youthRateBoost,
            int maxYouthAge,
            int phaseOutStartAge) {
        this.baseStrategy = baseStrategy;
        this.youthRateBoost = youthRateBoost;
        this.maxYouthAge = maxYouthAge;
        this.phaseOutStartAge = phaseOutStartAge;
    }
    
    /**
     * Default constructor with common youth account parameters.
     * 
     * @param baseStrategy The base strategy to calculate the initial interest amount
     */
    public YouthAccountStrategy(InterestCalculationStrategy baseStrategy) {
        this(baseStrategy, new BigDecimal("0.02"), 18, 16);
    }
    
    @Override
    public Money calculateInterest(MonetaryCurrency currency, InterestCalculationData balanceData, 
                                  BigDecimal annualInterestRate, int daysInYear) {
        
        // Get client age
        int clientAge = getClientAge();
        
        // Get the applicable interest rate based on age
        BigDecimal adjustedRate = getAgeAdjustedRate(clientAge, annualInterestRate);
        
        // Calculate interest using the adjusted rate
        return baseStrategy.calculateInterest(
            currency, balanceData, adjustedRate, daysInYear);
    }

    @Override
    public InterestCalculationStrategyType getType() {
        return InterestCalculationStrategyType.YOUTH_ACCOUNT;
    }
    
    @Override
    public boolean isEligibleForInterestCalculation(Money balance, Money minimumBalanceForInterestCalculation) {
        // Youth accounts typically have lower or no minimum balance requirements
        Money reducedMinimumBalance = minimumBalanceForInterestCalculation;
        
        if (minimumBalanceForInterestCalculation != null && !minimumBalanceForInterestCalculation.isZero()) {
            // Reduce the minimum balance requirement for youth accounts (e.g., by 50%)
            BigDecimal reduction = new BigDecimal("0.5");
            reducedMinimumBalance = minimumBalanceForInterestCalculation.multipliedBy(reduction);
        }
        
        return super.isEligibleForInterestCalculation(balance, reducedMinimumBalance);
    }
    
    /**
     * Gets the client's age from the account data.
     * 
     * <p>This method would need to be implemented to retrieve the client's age
     * from the account data or client profile.
     * 
     * @return The client's age in years
     */
    protected int getClientAge() {
        // This would be implemented to get the actual client age
        // For demonstration, we'll return a fixed age
        return 17;
    }
    
    /**
     * Calculates the age-adjusted interest rate.
     * 
     * <p>The adjusted rate is:
     * <ul>
     *   <li>Base rate + full boost for ages up to phaseOutStartAge</li>
     *   <li>Base rate + declining boost for ages between phaseOutStartAge and maxYouthAge</li>
     *   <li>Base rate for ages beyond maxYouthAge</li>
     * </ul>
     * 
     * @param clientAge The client's age in years
     * @param baseRate The base interest rate
     * @return The age-adjusted interest rate
     */
    protected BigDecimal getAgeAdjustedRate(int clientAge, BigDecimal baseRate) {
        if (clientAge > maxYouthAge) {
            // Beyond the maximum age, no boost applied
            return baseRate;
        } else if (clientAge <= phaseOutStartAge) {
            // Full boost for clients younger than phase-out age
            return baseRate.add(youthRateBoost);
        } else {
            // Partial boost during phase-out period
            int yearsOverPhaseOutStart = clientAge - phaseOutStartAge;
            int phaseOutPeriod = maxYouthAge - phaseOutStartAge;
            
            // Calculate the reduction factor (declines linearly)
            BigDecimal reductionFactor = new BigDecimal(phaseOutPeriod - yearsOverPhaseOutStart)
                                          .divide(new BigDecimal(phaseOutPeriod), mathContext);
            
            // Apply the reduced boost
            BigDecimal reducedBoost = youthRateBoost.multiply(reductionFactor, mathContext);
            return baseRate.add(reducedBoost);
        }
    }
}