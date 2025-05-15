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
import org.apache.fineract.portfolio.interestcalculation.domain.AverageDailyBalanceStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.BonusInterestStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.DailyBalanceStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.PromotionalInterestStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.YouthAccountStrategy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Factory for creating specialized interest calculation strategies.
 * <p>
 * This factory handles strategies that require runtime parameters or special configuration.
 */
@Component
public class SpecializedStrategyFactory {
    
    private final DailyBalanceStrategy dailyBalanceStrategy;
    private final AverageDailyBalanceStrategy averageDailyBalanceStrategy;
    
    @Autowired
    public SpecializedStrategyFactory(
            DailyBalanceStrategy dailyBalanceStrategy,
            AverageDailyBalanceStrategy averageDailyBalanceStrategy) {
        this.dailyBalanceStrategy = dailyBalanceStrategy;
        this.averageDailyBalanceStrategy = averageDailyBalanceStrategy;
    }
    
    /**
     * Creates a bonus interest strategy with the specified base strategy.
     *
     * @param baseStrategyType The type of base strategy to use
     * @return A configured BonusInterestStrategy
     */
    public BonusInterestStrategy createBonusInterestStrategy(String baseStrategyType) {
        InterestCalculationStrategy baseStrategy = resolveBaseStrategy(baseStrategyType);
        return new BonusInterestStrategy(baseStrategy);
    }
    
    /**
     * Creates a youth account strategy with the specified parameters.
     *
     * @param baseStrategyType The type of base strategy to use
     * @param youthRateBoost The rate boost for youth accounts
     * @param maxYouthAge The maximum age for full youth benefits
     * @param phaseOutStartAge The age at which benefits start to phase out
     * @return A configured YouthAccountStrategy
     */
    public YouthAccountStrategy createYouthAccountStrategy(
            String baseStrategyType,
            BigDecimal youthRateBoost,
            int maxYouthAge,
            int phaseOutStartAge) {
        InterestCalculationStrategy baseStrategy = resolveBaseStrategy(baseStrategyType);
        return new YouthAccountStrategy(baseStrategy, youthRateBoost, maxYouthAge, phaseOutStartAge);
    }
    
    /**
     * Creates a promotional interest strategy with the specified base strategy.
     *
     * @param baseStrategyType The type of base strategy to use
     * @return A configured PromotionalInterestStrategy
     */
    public PromotionalInterestStrategy createPromotionalInterestStrategy(String baseStrategyType) {
        InterestCalculationStrategy baseStrategy = resolveBaseStrategy(baseStrategyType);
        return new PromotionalInterestStrategy(baseStrategy);
    }
    
    /**
     * Resolves the base strategy from a string type.
     * 
     * @param baseStrategyType The strategy type as a string
     * @return The resolved strategy instance
     */
    private InterestCalculationStrategy resolveBaseStrategy(String baseStrategyType) {
        if ("DAILY_BALANCE".equals(baseStrategyType)) {
            return dailyBalanceStrategy;
        } else if ("AVERAGE_DAILY_BALANCE".equals(baseStrategyType)) {
            return averageDailyBalanceStrategy;
        } else {
            // Default to daily balance if not specified
            return dailyBalanceStrategy;
        }
    }
}