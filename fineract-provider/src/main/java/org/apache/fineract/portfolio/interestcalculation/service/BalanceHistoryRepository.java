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
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Repository interface for balance history data.
 */
public interface BalanceHistoryRepository {

    /**
     * Gets balance history for an account within a date range.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @return List of balance history data for the period
     */
    List<BalanceHistoryData> getBalanceHistory(UUID accountId, String accountType, 
                                              LocalDate startDate, LocalDate endDate);
    
    /**
     * Gets balance history for an account on a specific date.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param date The specific date
     * @return Balance history data for the specific date, or null if not found
     */
    BalanceHistoryData getBalanceForDate(UUID accountId, String accountType, LocalDate date);
    
    /**
     * Saves a new balance history record.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param balanceDate The date of the balance
     * @param openingBalance The opening balance on the date
     * @param closingBalance The closing balance on the date
     * @param minimumBalance The minimum balance on the date
     * @param averageBalance The average balance on the date
     * @param numberOfTransactions The number of transactions on the date
     * @return The ID of the new balance history record
     */
    UUID saveBalanceHistory(UUID accountId, String accountType, LocalDate balanceDate,
                          BigDecimal openingBalance, BigDecimal closingBalance,
                          BigDecimal minimumBalance, BigDecimal averageBalance,
                          int numberOfTransactions);
    
    /**
     * Gets the average balance for an account over a period.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @return The average balance over the period
     */
    BigDecimal getAverageBalance(UUID accountId, String accountType, 
                               LocalDate startDate, LocalDate endDate);
    
    /**
     * Gets the minimum balance for an account over a period.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @return The minimum balance over the period
     */
    BigDecimal getMinimumBalance(UUID accountId, String accountType, 
                               LocalDate startDate, LocalDate endDate);
}