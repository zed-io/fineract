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
package org.apache.fineract.portfolio.interestcalculation.config;

import java.math.MathContext;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategyType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class for the interest calculation engine.
 */
@Configuration
public class InterestCalculationConfiguration {

    /**
     * Creates a MathContext bean for consistent mathematical operations.
     * 
     * @return The MathContext instance
     */
    @Bean
    public MathContext mathContext() {
        return new MathContext(19, RoundingMode.HALF_EVEN);
    }
    
    /**
     * Creates a map of interest calculation strategies indexed by their types.
     * 
     * @param strategies The list of available strategy implementations
     * @return A map of strategies
     */
    @Bean
    public Map<InterestCalculationStrategyType, InterestCalculationStrategy> interestCalculationStrategies(
            List<InterestCalculationStrategy> strategies) {
        
        Map<InterestCalculationStrategyType, InterestCalculationStrategy> strategyMap = new HashMap<>();
        
        for (InterestCalculationStrategy strategy : strategies) {
            strategyMap.put(strategy.getType(), strategy);
        }
        
        return strategyMap;
    }
}