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
import java.util.UUID;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;

/**
 * Repository interface for interest daily accrual.
 */
public interface InterestDailyAccrualRepository {

    /**
     * Saves a new daily accrual record.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param accrualDate The date of the accrual
     * @param balanceAmount The balance amount used for accrual
     * @param accruedInterest The amount of interest accrued
     * @param annualInterestRate The annual interest rate used
     * @param daysInYear The number of days in the year used for calculation
     * @param isProcessed Whether the accrual has been processed
     * @param processedDate The date the accrual was processed, if applicable
     * @return The ID of the new accrual record
     */
    UUID saveDailyAccrual(UUID accountId, String accountType, LocalDate accrualDate,
                        BigDecimal balanceAmount, BigDecimal accruedInterest,
                        BigDecimal annualInterestRate, int daysInYear,
                        boolean isProcessed, LocalDate processedDate);
    
    /**
     * Updates accrual records to mark them as processed.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param asOfDate The date up to which to mark accruals as processed
     * @return The number of records updated
     */
    int markAsProcessed(UUID accountId, String accountType, LocalDate asOfDate);
    
    /**
     * Gets the total accrued interest not yet processed for an account.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param asOfDate The date up to which to include accruals
     * @return The total accrued interest
     */
    BigDecimal getAccruedInterestTotal(UUID accountId, String accountType, LocalDate asOfDate);
    
    /**
     * Gets the currency used in the latest accrual for an account.
     * Used to ensure consistent currency in calculations.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @return The currency of the latest accrual, or null if no accruals exist
     */
    MonetaryCurrency getLatestAccrualCurrency(UUID accountId, String accountType);
}