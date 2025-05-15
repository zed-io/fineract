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
 * Bonus interest calculation strategy.
 * <p>
 * This strategy calculates interest and applies additional bonus interest based on
 * meeting specific criteria, such as:
 * <ul>
 *   <li>Account age exceeding a certain threshold</li>
 *   <li>Average balance maintained above a threshold</li>
 *   <li>No withdrawals made during the period</li>
 *   <li>Regular deposits during the period</li>
 * </ul>
 * <p>
 * This is particularly useful for loyalty rewards or promotional savings products.
 */
@Component
public class BonusInterestStrategy extends AbstractInterestCalculationStrategy {

    // Delegate to a base calculation strategy
    private final InterestCalculationStrategy baseStrategy;
    
    /**
     * Constructor for BonusInterestStrategy.
     * 
     * @param baseStrategy The base strategy to calculate the initial interest amount
     */
    public BonusInterestStrategy(InterestCalculationStrategy baseStrategy) {
        this.baseStrategy = baseStrategy;
    }
    
    @Override
    public Money calculateInterest(MonetaryCurrency currency, InterestCalculationData balanceData, 
                                  BigDecimal annualInterestRate, int daysInYear) {
        
        // Calculate base interest using the delegated strategy
        Money baseInterest = baseStrategy.calculateInterest(
            currency, balanceData, annualInterestRate, daysInYear);
        
        // Check if the account is eligible for bonus interest
        if (!isEligibleForBonusInterest(balanceData)) {
            return baseInterest;
        }
        
        // Apply bonus interest
        BigDecimal bonusRate = getBonusInterestRate(balanceData);
        BigDecimal bonusAmount = calculateBonusInterest(
            balanceData, bonusRate, daysInYear);
            
        return baseInterest.plus(bonusAmount);
    }

    @Override
    public InterestCalculationStrategyType getType() {
        return InterestCalculationStrategyType.BONUS_INTEREST;
    }
    
    /**
     * Determines if an account is eligible for bonus interest based on specific criteria.
     * 
     * <p>Criteria could include:
     * <ul>
     *   <li>Account age (e.g., account older than 6 months)</li>
     *   <li>Minimum balance maintained</li>
     *   <li>No withdrawals in period</li>
     *   <li>Regular deposits made</li>
     * </ul>
     * 
     * @param balanceData The balance data for interest calculation
     * @return True if eligible for bonus interest, false otherwise
     */
    protected boolean isEligibleForBonusInterest(InterestCalculationData balanceData) {
        // This would need to be implemented based on specific business rules
        // For demonstration, we'll use a simple check based on minimum balance
        BigDecimal minimumEligibilityBalance = new BigDecimal("1000.00");
        return balanceData.getMinimumBalance().compareTo(minimumEligibilityBalance) >= 0;
    }
    
    /**
     * Returns the applicable bonus interest rate based on account data.
     * 
     * <p>The bonus rate could vary based on different criteria:
     * <ul>
     *   <li>Account age tiers (longer accounts get higher bonus)</li>
     *   <li>Balance tiers (higher balances get higher bonus)</li>
     *   <li>Transaction behavior (fewer withdrawals get higher bonus)</li>
     * </ul>
     * 
     * @param balanceData The balance data for interest calculation
     * @return The bonus interest rate as a decimal (e.g., 0.01 for 1%)
     */
    protected BigDecimal getBonusInterestRate(InterestCalculationData balanceData) {
        // This would be implemented based on specific business rules
        // For demonstration, we'll return a fixed bonus rate
        return new BigDecimal("0.01"); // 1% bonus
    }
    
    /**
     * Calculates the bonus interest amount.
     * 
     * @param balanceData The balance data for interest calculation
     * @param bonusRate The bonus interest rate as a decimal
     * @param daysInYear The number of days in the year
     * @return The calculated bonus interest amount
     */
    protected BigDecimal calculateBonusInterest(InterestCalculationData balanceData,
                                             BigDecimal bonusRate,
                                             int daysInYear) {
        // Typically bonus interest is calculated on the average balance
        BigDecimal balanceAmount = balanceData.getAverageBalance();
        
        return calculateDailyInterest(
            balanceAmount,
            bonusRate,
            balanceData.getDaysInPeriod(),
            daysInYear
        );
    }
}