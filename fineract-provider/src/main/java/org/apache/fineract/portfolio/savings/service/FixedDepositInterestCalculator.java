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
package org.apache.fineract.portfolio.savings.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;

/**
 * Service interface for calculating interest on fixed deposit accounts.
 */
public interface FixedDepositInterestCalculator {

    /**
     * Calculates the total interest for a fixed deposit account over its entire term.
     *
     * @param account The fixed deposit account
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The calculated interest amount
     */
    Money calculateTotalInterest(FixedDepositAccount account, MathContext mc, boolean isPreMatureClosure);
    
    /**
     * Calculates the interest for a specific period.
     *
     * @param account The fixed deposit account
     * @param fromDate The start date of the period
     * @param toDate The end date of the period
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The calculated interest amount
     */
    Money calculateInterest(FixedDepositAccount account, LocalDate fromDate, LocalDate toDate, 
                          MathContext mc, boolean isPreMatureClosure);
    
    /**
     * Calculates the maturity amount for a fixed deposit account.
     *
     * @param account The fixed deposit account
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The calculated maturity amount
     */
    Money calculateMaturityAmount(FixedDepositAccount account, MathContext mc, boolean isPreMatureClosure);
    
    /**
     * Gets the effective interest rate for a fixed deposit account considering any applicable penalties.
     *
     * @param account The fixed deposit account
     * @param mc The math context to use for calculations
     * @param isPreMatureClosure Whether this is a premature closure calculation
     * @return The effective interest rate as a BigDecimal
     */
    BigDecimal getEffectiveInterestRate(FixedDepositAccount account, MathContext mc, boolean isPreMatureClosure);
    
    /**
     * Determines whether an interest rate chart applies to the given account, deposit amount and term.
     *
     * @param account The fixed deposit account
     * @param depositAmount The deposit amount to check
     * @param depositStartDate The start date of the deposit
     * @param depositEndDate The end date of the deposit
     * @return The applicable interest rate, or the account's default rate if no chart applies
     */
    BigDecimal getApplicableInterestRate(FixedDepositAccount account, BigDecimal depositAmount,
                                       LocalDate depositStartDate, LocalDate depositEndDate);
}