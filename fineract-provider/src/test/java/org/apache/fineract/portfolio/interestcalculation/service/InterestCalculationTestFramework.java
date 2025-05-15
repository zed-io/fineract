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
package org.apache.fineract.portfolio.interestcalculation.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.SortedMap;
import java.util.TreeMap;

import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.interestcalculation.domain.AverageDailyBalanceStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.BonusInterestStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.DailyBalanceStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationData;
import org.apache.fineract.portfolio.interestcalculation.domain.PromotionalInterestStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.TieredBalanceStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.YouthAccountStrategy;

/**
 * Base framework class for interest calculation tests.
 */
public class InterestCalculationTestFramework {

    protected static final int DAYS_IN_YEAR_365 = 365;
    protected static final int DAYS_IN_YEAR_360 = 360;
    protected static final MonetaryCurrency USD = new MonetaryCurrency("USD", 2, 0);

    /**
     * Helper method to create balance data for testing.
     * 
     * @param openingBalance Opening balance
     * @param closingBalance Closing balance
     * @param fromDate From date
     * @param toDate To date
     * @return Balance data for interest calculation
     */
    protected InterestCalculationData createBalanceData(
            BigDecimal openingBalance, 
            BigDecimal closingBalance, 
            LocalDate fromDate, 
            LocalDate toDate) {
            
        BigDecimal averageBalance = openingBalance.add(closingBalance).divide(BigDecimal.valueOf(2));
        BigDecimal minimumBalance = openingBalance.min(closingBalance);
        
        return InterestCalculationData.create(
            fromDate, toDate, openingBalance, closingBalance, averageBalance, minimumBalance);
    }
    
    /**
     * Creates a test implementation of TieredBalanceStrategy with predefined tiers.
     */
    protected TieredBalanceStrategy createTestTieredBalanceStrategy() {
        return new TieredBalanceStrategy() {
            @Override
            protected SortedMap<BigDecimal, BigDecimal> getApplicableInterestRateTiers(BigDecimal balanceAmount) {
                SortedMap<BigDecimal, BigDecimal> tiers = new TreeMap<>();
                tiers.put(new BigDecimal("1000.00"), new BigDecimal("0.03")); // 3% for first $1000
                tiers.put(new BigDecimal("5000.00"), new BigDecimal("0.04")); // 4% for $1000-$5000
                tiers.put(new BigDecimal("999999.00"), new BigDecimal("0.05")); // 5% for above $5000
                return tiers;
            }
        };
    }

    /**
     * Creates a test implementation of BonusInterestStrategy.
     */
    protected BonusInterestStrategy createTestBonusInterestStrategy() {
        // Use average daily balance as the base strategy
        AverageDailyBalanceStrategy baseStrategy = new AverageDailyBalanceStrategy();
        
        return new BonusInterestStrategy(baseStrategy) {
            @Override
            protected boolean isEligibleForBonusInterest(InterestCalculationData balanceData) {
                // Always eligible in test
                return true;
            }
            
            @Override
            protected BigDecimal getBonusInterestRate(InterestCalculationData balanceData) {
                // Fixed 1% bonus for test
                return new BigDecimal("0.01");
            }
        };
    }

    /**
     * Creates a test implementation of YouthAccountStrategy.
     */
    protected YouthAccountStrategy createTestYouthAccountStrategy() {
        // Use daily balance as the base strategy
        DailyBalanceStrategy baseStrategy = new DailyBalanceStrategy();
        
        return new YouthAccountStrategy(baseStrategy, 
                                      new BigDecimal("0.02"), // 2% boost
                                      18, // max age
                                      16) // phase out start age
        {
            @Override
            protected int getClientAge() {
                // Fixed age for testing
                return 17;
            }
        };
    }

    /**
     * Creates a test implementation of PromotionalInterestStrategy.
     */
    protected PromotionalInterestStrategy createTestPromotionalInterestStrategy() {
        // Use daily balance as base strategy
        DailyBalanceStrategy baseStrategy = new DailyBalanceStrategy();
        
        return new PromotionalInterestStrategy(baseStrategy) {
            @Override
            protected PromotionalPeriod findApplicablePromotionalPeriod(LocalDate fromDate, LocalDate toDate) {
                // Fixed promotional period for December 2023
                LocalDate promoStart = LocalDate.of(2023, 12, 1);
                LocalDate promoEnd = LocalDate.of(2023, 12, 31);
                BigDecimal promoRate = new BigDecimal("0.07"); // 7% promotional rate
                
                // Check if our calculation period overlaps with this promotion
                if (fromDate.isBefore(promoEnd) && toDate.isAfter(promoStart)) {
                    return new PromotionalPeriod(promoStart, promoEnd, promoRate);
                }
                
                return null;
            }
        };
    }
}