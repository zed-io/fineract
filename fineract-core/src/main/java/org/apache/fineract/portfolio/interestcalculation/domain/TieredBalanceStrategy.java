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
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.springframework.stereotype.Component;

/**
 * Tiered balance interest calculation strategy.
 * <p>
 * This strategy calculates interest based on different interest rates applied to different balance tiers.
 * For example, 3% for balances up to $1000, 4% for balances between $1000-$5000, and 5% for balances above $5000.
 * <p>
 * The balance can be calculated using closing balance, average balance, or minimum balance based on configuration.
 */
@Component
public class TieredBalanceStrategy extends AbstractInterestCalculationStrategy {

    @Override
    public Money calculateInterest(MonetaryCurrency currency, InterestCalculationData balanceData, 
                                  BigDecimal defaultAnnualInterestRate, int daysInYear) {
        
        // For tiered balance, we use the average balance by default,
        // but this could be configured to use closing balance or minimum balance
        BigDecimal balanceAmount = balanceData.getAverageBalance();
        
        // Get interest rate tiers for this account (this would come from the account configuration)
        SortedMap<BigDecimal, BigDecimal> interestRateTiers = getApplicableInterestRateTiers(balanceAmount);
        
        BigDecimal totalInterestAmount = BigDecimal.ZERO;
        
        if (balanceAmount.compareTo(BigDecimal.ZERO) > 0) {
            if (interestRateTiers.isEmpty()) {
                // If no tiers defined, use default rate
                totalInterestAmount = calculateDailyInterest(
                    balanceAmount, 
                    defaultAnnualInterestRate, 
                    balanceData.getDaysInPeriod(), 
                    daysInYear
                );
            } else {
                // Apply tiered rates
                totalInterestAmount = calculateTieredInterest(
                    balanceAmount,
                    interestRateTiers,
                    balanceData.getDaysInPeriod(),
                    daysInYear
                );
            }
        }
        
        return Money.of(currency, totalInterestAmount);
    }

    @Override
    public InterestCalculationStrategyType getType() {
        return InterestCalculationStrategyType.TIERED_BALANCE;
    }
    
    /**
     * Returns the applicable interest rate tiers for the given balance.
     * 
     * <p>This method would be implemented to retrieve the tiered interest rates
     * from the account configuration. The tiers are stored as a sorted map
     * where the keys are the upper bounds of each tier (in ascending order)
     * and the values are the interest rates for those tiers.
     * 
     * <p>For example:
     * <ul>
     *   <li>1000.00 -> 0.03 (3% for balances up to $1000)</li>
     *   <li>5000.00 -> 0.04 (4% for balances from $1000.01 to $5000)</li>
     *   <li>10000.00 -> 0.05 (5% for balances from $5000.01 to $10000)</li>
     *   <li>MAX_VALUE -> 0.06 (6% for balances above $10000)</li>
     * </ul>
     * 
     * @param balanceAmount The account balance
     * @return A sorted map of tier boundaries and their corresponding interest rates
     */
    protected SortedMap<BigDecimal, BigDecimal> getApplicableInterestRateTiers(BigDecimal balanceAmount) {
        // This implementation would be replaced with actual tier retrieval logic
        // For example, fetched from account configuration or product definition
        // Here, we just return an empty map, and the default rate will be used
        return new TreeMap<>();
    }
    
    /**
     * Calculates interest using tiered interest rates.
     * 
     * <p>For example, if tiers are:
     * <ul>
     *   <li>1000.00 -> 0.03 (3% for balances up to $1000)</li>
     *   <li>5000.00 -> 0.04 (4% for balances from $1000.01 to $5000)</li>
     *   <li>Infinity -> 0.05 (5% for balances above $5000)</li>
     * </ul>
     * 
     * <p>And balance is $6000, the interest would be calculated as:
     * <ul>
     *   <li>$1000 * 0.03 * (daysInPeriod/daysInYear) +</li>
     *   <li>$4000 * 0.04 * (daysInPeriod/daysInYear) +</li>
     *   <li>$1000 * 0.05 * (daysInPeriod/daysInYear)</li>
     * </ul>
     * 
     * @param balance The account balance
     * @param tiers The tiered interest rates
     * @param daysInPeriod Number of days in the period
     * @param daysInYear Number of days in the year
     * @return The calculated interest amount
     */
    private BigDecimal calculateTieredInterest(BigDecimal balance, 
                                             SortedMap<BigDecimal, BigDecimal> tiers,
                                             int daysInPeriod, 
                                             int daysInYear) {
        BigDecimal totalInterest = BigDecimal.ZERO;
        BigDecimal remainingBalance = balance;
        BigDecimal previousTierBound = BigDecimal.ZERO;
        
        for (SortedMap.Entry<BigDecimal, BigDecimal> tier : tiers.entrySet()) {
            BigDecimal tierBound = tier.getKey();
            BigDecimal tierRate = tier.getValue();
            
            BigDecimal tierBalance = remainingBalance;
            if (balance.compareTo(tierBound) > 0) {
                // If balance exceeds this tier, only calculate interest for the portion within this tier
                tierBalance = tierBound.subtract(previousTierBound);
                remainingBalance = remainingBalance.subtract(tierBalance);
            } else {
                // If balance is within this tier, calculate interest for remaining balance
                tierBalance = remainingBalance;
                remainingBalance = BigDecimal.ZERO;
            }
            
            // Calculate interest for this tier
            BigDecimal tierInterest = calculateDailyInterest(
                tierBalance, tierRate, daysInPeriod, daysInYear);
            
            totalInterest = totalInterest.add(tierInterest);
            previousTierBound = tierBound;
            
            if (remainingBalance.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
        }
        
        return totalInterest;
    }
}