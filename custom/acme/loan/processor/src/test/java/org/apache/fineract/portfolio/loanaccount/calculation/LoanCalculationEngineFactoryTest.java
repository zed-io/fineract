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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import org.apache.fineract.portfolio.loanproduct.domain.AmortizationMethod;
import org.apache.fineract.portfolio.loanproduct.domain.InterestMethod;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests for the LoanCalculationEngineFactory.
 */
@ExtendWith(MockitoExtension.class)
public class LoanCalculationEngineFactoryTest {

    @Mock
    private DecliningBalanceEqualInstallmentsCalculationEngine equalInstallmentsEngine;
    
    @Mock
    private DecliningBalanceEqualPrincipalCalculationEngine equalPrincipalEngine;

    @Test
    public void testGetEngineByType() {
        // Given
        when(equalInstallmentsEngine.getType()).thenReturn(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_INSTALLMENTS);
        when(equalPrincipalEngine.getType()).thenReturn(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_PRINCIPAL);
        
        List<LoanCalculationEngine> engines = Arrays.asList(equalInstallmentsEngine, equalPrincipalEngine);
        LoanCalculationEngineFactory factory = new LoanCalculationEngineFactory(engines);
        
        // When & Then
        LoanCalculationEngine result1 = factory.getEngineByType(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_INSTALLMENTS);
        LoanCalculationEngine result2 = factory.getEngineByType(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_PRINCIPAL);
        LoanCalculationEngine result3 = factory.getEngineByType(LoanCalculationEngineType.FLAT);
        
        assertEquals(equalInstallmentsEngine, result1);
        assertEquals(equalPrincipalEngine, result2);
        assertNull(result3); // FLAT engine is not registered
    }
    
    @Test
    public void testGetEngine() {
        // Given
        when(equalInstallmentsEngine.getType()).thenReturn(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_INSTALLMENTS);
        when(equalPrincipalEngine.getType()).thenReturn(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_PRINCIPAL);
        
        List<LoanCalculationEngine> engines = Arrays.asList(equalInstallmentsEngine, equalPrincipalEngine);
        LoanCalculationEngineFactory factory = new LoanCalculationEngineFactory(engines);
        
        // When & Then
        LoanCalculationEngine result1 = factory.getEngine(InterestMethod.DECLINING_BALANCE, AmortizationMethod.EQUAL_INSTALLMENTS);
        LoanCalculationEngine result2 = factory.getEngine(InterestMethod.DECLINING_BALANCE, AmortizationMethod.EQUAL_PRINCIPAL);
        LoanCalculationEngine result3 = factory.getEngine(InterestMethod.FLAT, AmortizationMethod.EQUAL_INSTALLMENTS);
        
        assertEquals(equalInstallmentsEngine, result1);
        assertEquals(equalPrincipalEngine, result2);
        assertNull(result3); // No engine registered for FLAT interest method
    }
    
    @Test
    public void testAddCustomEngine() {
        // Given
        when(equalInstallmentsEngine.getType()).thenReturn(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_INSTALLMENTS);
        
        List<LoanCalculationEngine> engines = Arrays.asList(equalInstallmentsEngine);
        LoanCalculationEngineFactory factory = new LoanCalculationEngineFactory(engines);
        
        // A mock for a custom engine
        LoanCalculationEngine customEngine = mock(LoanCalculationEngine.class);
        when(customEngine.getType()).thenReturn(LoanCalculationEngineType.FLAT);
        
        // Add the custom engine (Not actually possible through public API, but we test the concept)
        List<LoanCalculationEngine> updatedEngines = Arrays.asList(equalInstallmentsEngine, customEngine);
        factory = new LoanCalculationEngineFactory(updatedEngines);
        
        // When & Then
        LoanCalculationEngine result1 = factory.getEngineByType(LoanCalculationEngineType.DECLINING_BALANCE_EQUAL_INSTALLMENTS);
        LoanCalculationEngine result2 = factory.getEngineByType(LoanCalculationEngineType.FLAT);
        
        assertEquals(equalInstallmentsEngine, result1);
        assertEquals(customEngine, result2);
    }
}