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

/**
 * Interface defining the contract for implementing different interest calculation strategies.
 * <p>
 * Different financial products may employ different methods for calculating interest, such as daily balance,
 * average daily balance, minimum balance, etc.
 */
public interface InterestCalculationStrategy {

    /**
     * Calculates the interest amount for the given period based on the provided balance information.
     *
     * @param currency the monetary currency in which the calculation is performed
     * @param balanceData the balance data containing information for the interest calculation
     * @param annualInterestRate the annual interest rate as a decimal (e.g., 0.05 for 5%)
     * @param daysInYear the number of days in the year (365 or 360 depending on configuration)
     * @return the calculated interest amount as Money
     */
    Money calculateInterest(MonetaryCurrency currency, InterestCalculationData balanceData, 
                           BigDecimal annualInterestRate, int daysInYear);
    
    /**
     * Returns the type of interest calculation strategy.
     *
     * @return the interest calculation strategy type
     */
    InterestCalculationStrategyType getType();
    
    /**
     * Determines if a balance meets the minimum requirements for interest calculation.
     *
     * @param balance the balance to check
     * @param minimumBalanceForInterestCalculation the minimum balance required for interest calculation
     * @return true if the balance meets the minimum requirement for interest calculation
     */
    boolean isEligibleForInterestCalculation(Money balance, Money minimumBalanceForInterestCalculation);
}