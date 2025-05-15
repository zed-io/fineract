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

/**
 * Enumeration of supported loan calculation engine types.
 */
public enum LoanCalculationEngineType {
    /**
     * Declining balance interest method with equal installment payments.
     * The total payment due for each installment is fixed and calculated using a PMT-like function.
     * The interest due is calculated from the outstanding principal balance.
     * The principal component is the total payment due minus interest due.
     */
    DECLINING_BALANCE_EQUAL_INSTALLMENTS(1, "Declining balance - equal installments"),
    
    /**
     * Declining balance interest method with equal principal payments.
     * The principal component of each installment is fixed.
     * The interest due is calculated from the outstanding principal balance.
     * The total payment due for each installment varies (decreases over time).
     */
    DECLINING_BALANCE_EQUAL_PRINCIPAL(2, "Declining balance - equal principal"),
    
    /**
     * Flat interest method.
     * The interest is calculated on the original loan amount for the entire loan period.
     * Both principal and interest payments are equal for each installment.
     */
    FLAT(3, "Flat");
    
    private final Integer id;
    private final String code;
    
    LoanCalculationEngineType(final Integer id, final String code) {
        this.id = id;
        this.code = code;
    }
    
    public Integer getId() {
        return this.id;
    }
    
    public String getCode() {
        return this.code;
    }
    
    /**
     * Find engine type by ID
     *
     * @param id The ID of the engine type
     * @return The matching engine type or null if not found
     */
    public static LoanCalculationEngineType fromId(Integer id) {
        for (LoanCalculationEngineType type : values()) {
            if (type.id.equals(id)) {
                return type;
            }
        }
        return null;
    }
}