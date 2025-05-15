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

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanCalculationParameters;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanInstallmentCalculationParameters;
import org.apache.fineract.portfolio.loanaccount.calculation.domain.LoanScheduleResult;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanScheduleModel;

/**
 * Core interface for loan calculation operations
 */
public interface LoanCalculationEngine {

    /**
     * Calculates a complete loan schedule based on input parameters
     *
     * @param calculationParameters The parameters needed for calculation
     * @param mathContext The math context to use for calculations
     * @return The complete loan schedule model
     */
    LoanScheduleModel calculateLoanSchedule(LoanCalculationParameters calculationParameters, MathContext mathContext);
    
    /**
     * Calculates the principal and interest for a specific period in the loan
     *
     * @param installmentParams The parameters for the specific installment
     * @param mathContext The math context to use for calculations
     * @return The calculated results including principal, interest and fees
     */
    LoanScheduleResult calculateInstallmentAmount(LoanInstallmentCalculationParameters installmentParams, MathContext mathContext);
    
    /**
     * Calculates the interest due for a given period
     *
     * @param outstandingBalance The outstanding principal balance
     * @param annualInterestRate The annual interest rate
     * @param periodDays The number of days in the period
     * @param daysInYear The number of days in the year
     * @param mathContext The math context to use for calculations
     * @return The interest amount due for the period
     */
    Money calculateInterestForPeriod(Money outstandingBalance, BigDecimal annualInterestRate, 
            int periodDays, int daysInYear, MathContext mathContext);
    
    /**
     * Calculates the principal due for a given period
     *
     * @param installmentParams The parameters for the specific installment
     * @param interestForPeriod The already calculated interest for this period
     * @param mathContext The math context to use for calculations
     * @return The principal amount due for the period
     */
    Money calculatePrincipalForPeriod(LoanInstallmentCalculationParameters installmentParams, 
            Money interestForPeriod, MathContext mathContext);
    
    /**
     * Gets the type of calculation engine (used for lookup and identification)
     *
     * @return The calculation engine type
     */
    LoanCalculationEngineType getType();
}