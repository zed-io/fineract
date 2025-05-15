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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.fineract.portfolio.loanproduct.domain.AmortizationMethod;
import org.apache.fineract.portfolio.loanproduct.domain.InterestMethod;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Factory for creating and retrieving loan calculation engines.
 */
@Component
public class LoanCalculationEngineFactory {
    
    private final Map<LoanCalculationEngineType, LoanCalculationEngine> enginesByType;
    private final Map<CombinedMethodKey, LoanCalculationEngine> enginesByMethod;
    
    /**
     * Constructor with injected calculation engines
     *
     * @param calculationEngines List of available calculation engines
     */
    @Autowired
    public LoanCalculationEngineFactory(List<LoanCalculationEngine> calculationEngines) {
        this.enginesByType = new HashMap<>();
        this.enginesByMethod = new HashMap<>();
        
        // Register all engines by type
        for (LoanCalculationEngine engine : calculationEngines) {
            enginesByType.put(engine.getType(), engine);
        }
        
        // Map interest and amortization method combinations to appropriate engines
        enginesByMethod.put(
                new CombinedMethodKey(InterestMethod.DECLINING_BALANCE, AmortizationMethod.EQUAL_INSTALLMENTS),
                getEngineByType(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_INSTALLMENTS));
        
        enginesByMethod.put(
                new CombinedMethodKey(InterestMethod.DECLINING_BALANCE, AmortizationMethod.EQUAL_PRINCIPAL),
                getEngineByType(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_PRINCIPAL));
    }
    
    /**
     * Gets a calculation engine by type
     *
     * @param type The calculation engine type
     * @return The calculation engine or null if not found
     */
    public LoanCalculationEngine getEngineByType(LoanCalculationEngineType type) {
        return enginesByType.get(type);
    }
    
    /**
     * Gets a calculation engine based on the interest method and amortization method
     *
     * @param interestMethod The interest method
     * @param amortizationMethod The amortization method
     * @return The calculation engine or null if no suitable engine is found
     */
    public LoanCalculationEngine getEngine(InterestMethod interestMethod, AmortizationMethod amortizationMethod) {
        CombinedMethodKey key = new CombinedMethodKey(interestMethod, amortizationMethod);
        return enginesByMethod.get(key);
    }
    
    /**
     * Key class for the combined interest and amortization methods
     */
    private static class CombinedMethodKey {
        private final InterestMethod interestMethod;
        private final AmortizationMethod amortizationMethod;
        
        public CombinedMethodKey(InterestMethod interestMethod, AmortizationMethod amortizationMethod) {
            this.interestMethod = interestMethod;
            this.amortizationMethod = amortizationMethod;
        }
        
        @Override
        public boolean equals(Object obj) {
            if (obj == this) {
                return true;
            }
            if (!(obj instanceof CombinedMethodKey)) {
                return false;
            }
            CombinedMethodKey other = (CombinedMethodKey) obj;
            return interestMethod == other.interestMethod && amortizationMethod == other.amortizationMethod;
        }
        
        @Override
        public int hashCode() {
            return 31 * interestMethod.hashCode() + amortizationMethod.hashCode();
        }
    }
}