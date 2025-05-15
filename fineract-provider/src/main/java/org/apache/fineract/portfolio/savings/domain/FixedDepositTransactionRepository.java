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
package org.apache.fineract.portfolio.savings.domain;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repository for FixedDepositTransaction entities.
 */
public interface FixedDepositTransactionRepository extends JpaRepository<FixedDepositTransaction, String>,
        JpaSpecificationExecutor<FixedDepositTransaction> {

    /**
     * Finds transactions for a specific fixed deposit account.
     *
     * @param fixedDepositAccountId The ID of the fixed deposit account
     * @return List of transactions for the account
     */
    List<FixedDepositTransaction> findByFixedDepositAccountIdOrderByCreatedDateDesc(String fixedDepositAccountId);
    
    /**
     * Finds transactions for a specific fixed deposit account with a specific transaction type.
     *
     * @param fixedDepositAccountId The ID of the fixed deposit account
     * @param transactionType The type of transaction to find
     * @return List of transactions matching the criteria
     */
    List<FixedDepositTransaction> findByFixedDepositAccountIdAndTransactionTypeOrderByCreatedDateDesc(
            String fixedDepositAccountId, String transactionType);
    
    /**
     * Finds non-reversed transactions for a specific fixed deposit account within a date range.
     *
     * @param fixedDepositAccountId The ID of the fixed deposit account
     * @param startDate The start date of the range
     * @param endDate The end date of the range
     * @return List of transactions matching the criteria
     */
    @Query("SELECT t FROM FixedDepositTransaction t WHERE t.fixedDepositAccount.id = :accountId "
            + "AND t.reversed = false "
            + "AND EXISTS (SELECT 1 FROM SavingsAccountTransaction s WHERE s = t.savingsAccountTransaction "
            + "AND s.dateOf BETWEEN :startDate AND :endDate) "
            + "ORDER BY t.createdDate DESC")
    List<FixedDepositTransaction> findNonReversedTransactionsByAccountAndDateRange(
            @Param("accountId") String fixedDepositAccountId, 
            @Param("startDate") LocalDate startDate, 
            @Param("endDate") LocalDate endDate);
    
    /**
     * Finds interest posting transactions for a specific fixed deposit account.
     *
     * @param fixedDepositAccountId The ID of the fixed deposit account
     * @return List of interest posting transactions
     */
    @Query("SELECT t FROM FixedDepositTransaction t WHERE t.fixedDepositAccount.id = :accountId "
            + "AND t.transactionType = 'interest_posting' "
            + "AND t.reversed = false "
            + "ORDER BY t.createdDate DESC")
    List<FixedDepositTransaction> findInterestPostingTransactions(@Param("accountId") String fixedDepositAccountId);
    
    /**
     * Finds the latest transaction for a specific fixed deposit account.
     *
     * @param fixedDepositAccountId The ID of the fixed deposit account
     * @return The latest transaction for the account, or null if none exists
     */
    @Query("SELECT t FROM FixedDepositTransaction t WHERE t.fixedDepositAccount.id = :accountId "
            + "ORDER BY t.createdDate DESC")
    FixedDepositTransaction findLatestTransaction(@Param("accountId") String fixedDepositAccountId);
    
    /**
     * Finds the transaction associated with a specific savings account transaction.
     *
     * @param savingsAccountTransactionId The ID of the savings account transaction
     * @return The fixed deposit transaction associated with the savings account transaction, or null if none exists
     */
    FixedDepositTransaction findBySavingsAccountTransactionId(Long savingsAccountTransactionId);
}