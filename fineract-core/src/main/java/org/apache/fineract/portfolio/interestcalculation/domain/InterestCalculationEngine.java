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
import java.util.UUID;
import org.apache.fineract.organisation.monetary.domain.Money;

/**
 * Core interface for the interest calculation engine that manages the overall interest calculation process.
 * <p>
 * The engine is responsible for orchestrating the calculation process using the appropriate strategy
 * and balance data, tracking calculation history, and managing daily accruals.
 */
public interface InterestCalculationEngine {

    /**
     * Calculates interest for an account for a given period.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param fromDate The start date for calculation (inclusive)
     * @param toDate The end date for calculation (inclusive)
     * @param interestRate The annual interest rate as a decimal (e.g., 0.05 for 5%)
     * @param strategyType The interest calculation strategy to use
     * @param daysInYear The number of days in the year for calculation (360 or 365)
     * @param minBalanceForInterestCalculation The minimum balance required for interest calculation
     * @return The calculated interest amount
     */
    Money calculateInterest(UUID accountId, String accountType, LocalDate fromDate, LocalDate toDate, 
                           BigDecimal interestRate, InterestCalculationStrategyType strategyType, 
                           int daysInYear, Money minBalanceForInterestCalculation);
    
    /**
     * Processes daily interest accruals for an account up to a specific date.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param accrualDate The date up to which to process accruals
     * @param interestRate The annual interest rate as a decimal
     * @param strategyType The interest calculation strategy to use
     * @param daysInYear The number of days in the year for calculation
     * @param minBalanceForInterestCalculation The minimum balance required for interest calculation
     * @return The total accrued interest up to the specified date
     */
    Money processAccruals(UUID accountId, String accountType, LocalDate accrualDate, 
                         BigDecimal interestRate, InterestCalculationStrategyType strategyType, 
                         int daysInYear, Money minBalanceForInterestCalculation);
    
    /**
     * Retrieves the total interest accrued but not yet posted for an account.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param asOfDate The date up to which to calculate accrued interest
     * @return The total accrued but not posted interest
     */
    Money getAccruedInterest(UUID accountId, String accountType, LocalDate asOfDate);
    
    /**
     * Records a posted interest transaction. This should be called after the interest has been posted
     * to the account to update the interest calculation history.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param postingDate The date of the interest posting
     * @param interestAmount The amount of interest posted
     * @param transactionId The ID of the interest posting transaction
     */
    void recordInterestPosting(UUID accountId, String accountType, LocalDate postingDate, 
                              Money interestAmount, UUID transactionId);
}