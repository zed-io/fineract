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

import java.time.LocalDate;
import java.util.Collection;
import java.util.UUID;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;

/**
 * Service for handling interest posting operations on fixed deposit accounts.
 * This service provides methods to calculate, accrue, and post interest for fixed deposit accounts,
 * as well as methods to handle maturity processing.
 */
public interface FixedDepositAccountInterestPostingService {

    /**
     * Posts accrued interest to the fixed deposit account up to the specified date.
     * 
     * @param accountId The ID of the fixed deposit account
     * @param postingDate The date up to which interest should be posted
     * @return The amount of interest posted
     */
    Money postInterest(UUID accountId, LocalDate postingDate);
    
    /**
     * Posts accrued interest to a collection of fixed deposit accounts.
     * This method is primarily used by batch processing jobs.
     * 
     * @param postingDate The date for which to post interest
     * @return Number of accounts that had interest posted successfully
     */
    int postInterestForAccounts(Collection<FixedDepositAccountData> accounts, LocalDate postingDate);
    
    /**
     * Accrues interest for a specific fixed deposit account up to the specified date.
     * 
     * @param accountId The ID of the fixed deposit account
     * @param accrualDate The date up to which to accrue interest
     * @return The amount of interest accrued
     */
    Money accrueInterest(UUID accountId, LocalDate accrualDate);
    
    /**
     * Accrues interest for a collection of fixed deposit accounts.
     * This method is primarily used by batch processing jobs.
     * 
     * @param accrualDate The date for which to accrue interest
     * @return Number of accounts that had interest accrued successfully
     */
    int accrueInterestForAccounts(Collection<FixedDepositAccountData> accounts, LocalDate accrualDate);
    
    /**
     * Calculates the maturity amount for a fixed deposit account.
     * 
     * @param account The fixed deposit account
     * @param maturityDate The maturity date of the account
     * @return The calculated maturity amount
     */
    Money calculateMaturityAmount(FixedDepositAccount account, LocalDate maturityDate);
    
    /**
     * Processes accounts that have reached maturity.
     * This includes calculating final interest, posting the interest, and 
     * changing the account status based on the maturity instructions.
     * 
     * @param maturityDate The date to check for matured accounts
     * @return Number of accounts processed for maturity
     */
    int processMaturedAccounts(LocalDate maturityDate);
    
    /**
     * Determines if an account is eligible for interest posting based on its posting period and last posting date.
     * 
     * @param accountId The ID of the fixed deposit account
     * @param asOfDate The date to check against
     * @return true if interest posting is due, false otherwise
     */
    boolean isInterestPostingDue(UUID accountId, LocalDate asOfDate);
    
    /**
     * Gets the next date when interest should be posted for the account.
     * 
     * @param accountId The ID of the fixed deposit account
     * @return The next interest posting date
     */
    LocalDate getNextInterestPostingDate(UUID accountId);
    
    /**
     * Gets a collection of fixed deposit accounts due for interest posting on the specified date.
     * 
     * @param postingDate The date to check for accounts due for interest posting
     * @return Collection of fixed deposit accounts due for interest posting
     */
    Collection<FixedDepositAccountData> getAccountsDueForInterestPosting(LocalDate postingDate);
    
    /**
     * Gets a collection of fixed deposit accounts due for maturity processing on the specified date.
     * 
     * @param maturityDate The date to check for accounts reaching maturity
     * @return Collection of fixed deposit accounts reaching maturity
     */
    Collection<FixedDepositAccountData> getAccountsDueForMaturityProcessing(LocalDate maturityDate);
}