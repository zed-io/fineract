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

import java.time.LocalDate;
import java.util.UUID;
import org.apache.fineract.organisation.monetary.domain.Money;

/**
 * Interface for accessing account data needed for interest calculation and posting.
 */
public interface AccountDataProvider {

    /**
     * Gets configuration details for an account.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @return The account configuration data
     */
    AccountConfigurationData getAccountConfiguration(UUID accountId, String accountType);
    
    /**
     * Gets the date of the last interest posting for an account.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @return The date of the last interest posting, or null if no interest has been posted yet
     */
    LocalDate getLastInterestPostingDate(UUID accountId, String accountType);
    
    /**
     * Creates a transaction for interest posting.
     * 
     * @param accountId The account ID
     * @param accountType The account type
     * @param postingDate The date of the interest posting
     * @param interestAmount The amount of interest to post
     * @return The ID of the new transaction
     */
    UUID createInterestPostingTransaction(UUID accountId, String accountType, 
                                        LocalDate postingDate, Money interestAmount);
}