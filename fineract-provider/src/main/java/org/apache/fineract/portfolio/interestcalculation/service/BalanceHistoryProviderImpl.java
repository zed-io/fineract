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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.portfolio.interestcalculation.domain.BalanceHistoryProvider;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationData;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of the BalanceHistoryProvider interface that gets balance data from the balance_history table.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BalanceHistoryProviderImpl implements BalanceHistoryProvider {

    private final JdbcTemplate jdbcTemplate;
    private final BalanceHistoryRepository balanceHistoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<InterestCalculationData> getBalanceHistory(UUID accountId, String accountType,
                                                        LocalDate startDate, LocalDate endDate) {
        log.debug("Getting balance history for account {} of type {} from {} to {}",
                accountId, accountType, startDate, endDate);
        
        // Fetch balance history records from the repository
        List<BalanceHistoryData> balanceHistory = 
            balanceHistoryRepository.getBalanceHistory(accountId, accountType, startDate, endDate);
            
        // Convert to InterestCalculationData objects
        List<InterestCalculationData> result = new ArrayList<>();
        
        for (BalanceHistoryData historyData : balanceHistory) {
            InterestCalculationData calculationData = InterestCalculationData.create(
                historyData.getBalanceDate(),
                historyData.getBalanceDate(), // Same day for daily balance
                historyData.getOpeningBalance(),
                historyData.getClosingBalance(),
                historyData.getAverageBalance(),
                historyData.getMinimumBalance()
            );
            
            result.add(calculationData);
        }
        
        // If no balance history found, create a single entry with zero balances
        if (result.isEmpty()) {
            log.warn("No balance history found for account {} from {} to {}, creating zero balance entry",
                    accountId, startDate, endDate);
                    
            InterestCalculationData zeroBalanceData = InterestCalculationData.create(
                startDate,
                endDate,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
            );
            
            result.add(zeroBalanceData);
        }
        
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public InterestCalculationData getDailyBalance(UUID accountId, String accountType, LocalDate date) {
        log.debug("Getting daily balance for account {} of type {} on {}", accountId, accountType, date);
        
        // Fetch the specific day's balance history
        BalanceHistoryData historyData = 
            balanceHistoryRepository.getBalanceForDate(accountId, accountType, date);
            
        // If no balance history found, return zeros
        if (historyData == null) {
            log.warn("No balance history found for account {} on {}, returning zeros", accountId, date);
            return InterestCalculationData.create(
                date, date, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        
        // Convert to InterestCalculationData
        return InterestCalculationData.create(
            date,
            date,
            historyData.getOpeningBalance(),
            historyData.getClosingBalance(),
            historyData.getAverageBalance(),
            historyData.getMinimumBalance()
        );
    }

    @Override
    @Transactional
    public InterestCalculationData updateBalanceHistory(UUID accountId, String accountType, LocalDate date) {
        log.debug("Updating balance history for account {} of type {} on {}", accountId, accountType, date);
        
        // This would typically calculate the balance for the specified date
        // and save it to the balance_history table
        
        // For this implementation, we'll assume transaction data is processed elsewhere
        // and we just need to ensure a record exists for this date
        
        // Check if we already have a balance record for this date
        BalanceHistoryData existingBalance = 
            balanceHistoryRepository.getBalanceForDate(accountId, accountType, date);
            
        if (existingBalance != null) {
            log.debug("Balance history already exists for {} on {}", accountId, date);
            
            // Return existing balance data
            return InterestCalculationData.create(
                date,
                date,
                existingBalance.getOpeningBalance(),
                existingBalance.getClosingBalance(),
                existingBalance.getAverageBalance(),
                existingBalance.getMinimumBalance()
            );
        }
        
        // If no balance exists, we need to calculate it based on transactions
        // This would typically involve fetching transactions for the day and
        // calculating opening/closing/average/minimum balances
        
        // For now, we'll use a previous day's balance (if available) or zeros
        BalanceHistoryData previousDayBalance = 
            balanceHistoryRepository.getBalanceForDate(accountId, accountType, date.minusDays(1));
            
        BigDecimal openingBalance = BigDecimal.ZERO;
        BigDecimal closingBalance = BigDecimal.ZERO;
        
        if (previousDayBalance != null) {
            // Use previous day's closing balance as today's opening balance
            openingBalance = previousDayBalance.getClosingBalance();
            closingBalance = openingBalance; // Assuming no transactions for now
        }
        
        // Save the new balance history record
        UUID newBalanceHistoryId = balanceHistoryRepository.saveBalanceHistory(
            accountId,
            accountType,
            date,
            openingBalance,
            closingBalance,
            closingBalance, // Use closing as minimum for simplicity
            closingBalance, // Use closing as average for simplicity
            0              // No transactions
        );
        
        log.info("Created new balance history record {} for account {} on {}", 
                newBalanceHistoryId, accountId, date);
                
        // Return the newly created balance data
        return InterestCalculationData.create(
            date,
            date,
            openingBalance,
            closingBalance,
            closingBalance, // Average
            closingBalance  // Minimum
        );
    }
}

/**
 * Data class for holding balance history information.
 */
@lombok.Value
class BalanceHistoryData {
    UUID id;
    UUID accountId;
    String accountType;
    LocalDate balanceDate;
    BigDecimal openingBalance;
    BigDecimal closingBalance;
    BigDecimal minimumBalance;
    BigDecimal averageBalance;
    int numberOfTransactions;
}