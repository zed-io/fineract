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
import java.util.UUID;
import org.apache.fineract.organisation.monetary.domain.Money;

/**
 * Interface for services responsible for posting interest to accounts.
 * <p>
 * This interface abstracts the process of calculating and posting interest to accounts,
 * allowing for different implementations for different account types.
 */
public interface InterestPostingService {

    /**
     * Posts accrued interest to an account as of a specific date.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param postingDate The date to which interest should be posted
     * @return The amount of interest posted
     */
    Money postInterest(UUID accountId, String accountType, LocalDate postingDate);
    
    /**
     * Determines if interest posting is due for an account based on its posting period and last posting date.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @param asOfDate The date to check against
     * @return true if interest posting is due, false otherwise
     */
    boolean isInterestPostingDue(UUID accountId, String accountType, LocalDate asOfDate);
    
    /**
     * Gets the next interest posting date for an account based on its posting period and last posting date.
     *
     * @param accountId The ID of the account
     * @param accountType The type of account (savings, fixed deposit, etc.)
     * @return The next date when interest should be posted
     */
    LocalDate getNextInterestPostingDate(UUID accountId, String accountType);
}