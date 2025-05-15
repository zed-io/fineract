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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Interface for retrieving historical balance data needed for interest calculations.
 * <p>
 * This interface abstracts the source of balance history, which could be from transactions, 
 * daily snapshots, or other sources.
 */
public interface BalanceHistoryProvider {

    /**
     * Retrieves the balance history data for a specific account within a date range.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param startDate The start date for the period (inclusive)
     * @param endDate The end date for the period (inclusive)
     * @return A list of InterestCalculationData objects containing balance information for the period
     */
    List<InterestCalculationData> getBalanceHistory(UUID accountId, String accountType, 
                                                  LocalDate startDate, LocalDate endDate);
    
    /**
     * Gets the daily balance for a specific account on a specific date.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param date The date for which to get the balance
     * @return InterestCalculationData containing balance information for the specific date
     */
    InterestCalculationData getDailyBalance(UUID accountId, String accountType, LocalDate date);
    
    /**
     * Updates or creates balance history for an account on a specific date.
     * This method would typically be called after transactions that affect the account balance.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param date The date for which to update the balance history
     * @return The updated InterestCalculationData
     */
    InterestCalculationData updateBalanceHistory(UUID accountId, String accountType, LocalDate date);
}