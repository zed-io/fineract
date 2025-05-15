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
import java.util.Map;
import java.util.UUID;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategyType;

/**
 * Repository interface for interest calculation history.
 */
public interface InterestCalculationRepository {

    /**
     * Saves a new interest calculation history record.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param calculationDate The date the calculation was performed
     * @param fromDate The start date of the calculation period
     * @param toDate The end date of the calculation period
     * @param interestCalculated The amount of interest calculated
     * @param balanceUsed The balance used for the calculation
     * @param annualInterestRate The annual interest rate used
     * @param strategy The calculation strategy used
     * @param daysInYear The number of days in the year used for calculation
     * @param isPosted Whether the interest has been posted to the account
     * @param postedTransactionId The transaction ID if posted
     * @param calculationData Additional calculation metadata
     * @return The ID of the new calculation history record
     */
    UUID saveCalculationHistory(UUID accountId, String accountType, LocalDate calculationDate,
                              LocalDate fromDate, LocalDate toDate, BigDecimal interestCalculated,
                              BigDecimal balanceUsed, BigDecimal annualInterestRate,
                              InterestCalculationStrategyType strategy, int daysInYear,
                              boolean isPosted, UUID postedTransactionId,
                              Map<String, Object> calculationData);
    
    /**
     * Updates calculation history records to mark them as posted.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param postingDate The date of posting
     * @param transactionId The transaction ID of the interest posting
     * @return The number of records updated
     */
    int markAsPosted(UUID accountId, String accountType, LocalDate postingDate, UUID transactionId);
    
    /**
     * Gets the total interest calculated but not yet posted for an account.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param asOfDate The date up to which to include calculations
     * @return The total interest calculated but not yet posted
     */
    BigDecimal getUnpostedInterestTotal(UUID accountId, String accountType, LocalDate asOfDate);
}