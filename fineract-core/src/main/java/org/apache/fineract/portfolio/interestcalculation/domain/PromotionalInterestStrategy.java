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
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.springframework.stereotype.Component;

/**
 * Promotional interest calculation strategy.
 * <p>
 * This strategy applies promotional interest rates for specific time periods.
 * For example:
 * <ul>
 *   <li>Higher introductory rates for new accounts (first 3 months)</li>
 *   <li>Special promotion rates for limited periods</li>
 *   <li>Seasonal rate boosts (e.g. holiday season promotions)</li>
 * </ul>
 * <p>
 * The strategy delegates to a base strategy for the standard calculation,
 * but modifies the interest rate based on the current date and promotional periods.
 */
@Component
public class PromotionalInterestStrategy extends AbstractInterestCalculationStrategy {

    // Delegate to a base calculation strategy
    private final InterestCalculationStrategy baseStrategy;
    
    /**
     * Constructor for PromotionalInterestStrategy.
     * 
     * @param baseStrategy The base strategy to calculate the interest
     */
    public PromotionalInterestStrategy(InterestCalculationStrategy baseStrategy) {
        this.baseStrategy = baseStrategy;
    }
    
    @Override
    public Money calculateInterest(MonetaryCurrency currency, InterestCalculationData balanceData, 
                                  BigDecimal standardInterestRate, int daysInYear) {
        
        // Check if this period overlaps with a promotional period
        PromotionalPeriod promotionalPeriod = findApplicablePromotionalPeriod(
            balanceData.getFromDate(), balanceData.getToDate());
        
        if (promotionalPeriod == null) {
            // No active promotion, use standard calculation
            return baseStrategy.calculateInterest(
                currency, balanceData, standardInterestRate, daysInYear);
        }
        
        // Split the calculation if the period spans both promotional and non-promotional days
        if (isPartiallyInPromotionalPeriod(balanceData, promotionalPeriod)) {
            return calculateMixedPeriodInterest(
                currency, balanceData, standardInterestRate, promotionalPeriod, daysInYear);
        } else {
            // Full period is within the promotion
            return baseStrategy.calculateInterest(
                currency, balanceData, promotionalPeriod.getPromotionalRate(), daysInYear);
        }
    }

    @Override
    public InterestCalculationStrategyType getType() {
        return InterestCalculationStrategyType.PROMOTIONAL_INTEREST;
    }
    
    /**
     * Finds the applicable promotional period for a given date range.
     * 
     * <p>This method would query the promotional rate configuration for
     * any active promotions during the specified period.
     * 
     * @param fromDate Start date of the interest calculation period
     * @param toDate End date of the interest calculation period
     * @return The applicable promotional period, or null if none is active
     */
    protected PromotionalPeriod findApplicablePromotionalPeriod(LocalDate fromDate, LocalDate toDate) {
        // This would query stored promotional periods
        // For demonstration, we'll create a sample promotional period
        
        // Example: special year-end promotion
        LocalDate promoStart = LocalDate.of(2023, 12, 1);
        LocalDate promoEnd = LocalDate.of(2023, 12, 31);
        BigDecimal promoRate = new BigDecimal("0.07"); // 7% promotional rate
        
        // Check if our calculation period overlaps with this promotion
        if (fromDate.isBefore(promoEnd) && toDate.isAfter(promoStart)) {
            return new PromotionalPeriod(promoStart, promoEnd, promoRate);
        }
        
        return null;
    }
    
    /**
     * Determines if the calculation period is partially within a promotional period.
     * 
     * @param balanceData The balance data containing calculation period
     * @param promotionalPeriod The promotional period to check against
     * @return True if the calculation period is partially in the promotional period
     */
    private boolean isPartiallyInPromotionalPeriod(
            InterestCalculationData balanceData, 
            PromotionalPeriod promotionalPeriod) {
        
        return (balanceData.getFromDate().isBefore(promotionalPeriod.getStartDate()) || 
                balanceData.getToDate().isAfter(promotionalPeriod.getEndDate()));
    }
    
    /**
     * Calculates interest for a period that spans both promotional and non-promotional days.
     * 
     * @param currency The monetary currency
     * @param balanceData The balance data for interest calculation
     * @param standardRate The standard interest rate
     * @param promotionalPeriod The applicable promotional period
     * @param daysInYear The number of days in the year
     * @return The calculated interest amount
     */
    private Money calculateMixedPeriodInterest(
            MonetaryCurrency currency,
            InterestCalculationData balanceData,
            BigDecimal standardRate,
            PromotionalPeriod promotionalPeriod,
            int daysInYear) {
        
        // Determine overlap between calculation period and promotional period
        LocalDate periodStart = balanceData.getFromDate();
        LocalDate periodEnd = balanceData.getToDate();
        LocalDate promoStart = promotionalPeriod.getStartDate();
        LocalDate promoEnd = promotionalPeriod.getEndDate();
        
        // Calculate days in promotional and standard periods
        int totalDays = balanceData.getDaysInPeriod();
        int promoDays = 0;
        
        // Calculate actual overlap days
        LocalDate overlapStart = periodStart.isBefore(promoStart) ? promoStart : periodStart;
        LocalDate overlapEnd = periodEnd.isAfter(promoEnd) ? promoEnd : periodEnd;
        promoDays = overlapEnd.getDayOfYear() - overlapStart.getDayOfYear() + 1;
        if (overlapEnd.getYear() > overlapStart.getYear()) {
            // Adjust for year boundary
            promoDays += (overlapEnd.getYear() - overlapStart.getYear()) * 365;
        }
        
        int standardDays = totalDays - promoDays;
        
        // Calculate interest for each period
        BigDecimal balanceAmount = balanceData.getAverageBalance();
        BigDecimal promoRate = promotionalPeriod.getPromotionalRate();
        
        BigDecimal standardInterest = calculateDailyInterest(
            balanceAmount, standardRate, standardDays, daysInYear);
            
        BigDecimal promoInterest = calculateDailyInterest(
            balanceAmount, promoRate, promoDays, daysInYear);
            
        return Money.of(currency, standardInterest.add(promoInterest));
    }
    
    /**
     * Data class representing a promotional interest period.
     */
    protected static class PromotionalPeriod {
        private final LocalDate startDate;
        private final LocalDate endDate;
        private final BigDecimal promotionalRate;
        
        public PromotionalPeriod(LocalDate startDate, LocalDate endDate, BigDecimal promotionalRate) {
            this.startDate = startDate;
            this.endDate = endDate;
            this.promotionalRate = promotionalRate;
        }
        
        public LocalDate getStartDate() {
            return startDate;
        }
        
        public LocalDate getEndDate() {
            return endDate;
        }
        
        public BigDecimal getPromotionalRate() {
            return promotionalRate;
        }
    }
}