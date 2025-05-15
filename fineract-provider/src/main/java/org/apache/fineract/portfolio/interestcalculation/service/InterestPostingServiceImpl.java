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
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationEngine;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategyType;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestPostingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of the InterestPostingService interface.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InterestPostingServiceImpl implements InterestPostingService {

    private final InterestCalculationEngine interestCalculationEngine;
    private final AccountDataProvider accountDataProvider;

    @Override
    @Transactional
    public Money postInterest(UUID accountId, String accountType, LocalDate postingDate) {
        log.info("Posting interest for account {} of type {} as of {}", 
                accountId, accountType, postingDate);
                
        // Get account configuration
        AccountConfigurationData accountConfig = 
            accountDataProvider.getAccountConfiguration(accountId, accountType);
            
        // Get the last interest posting date for this account
        LocalDate lastPostingDate = accountDataProvider.getLastInterestPostingDate(accountId, accountType);
        
        // If no previous posting, use account activation date
        if (lastPostingDate == null) {
            lastPostingDate = accountConfig.getActivationDate();
        } else {
            // Add one day to last posting date to avoid double counting
            lastPostingDate = lastPostingDate.plusDays(1);
        }
        
        // Ensure posting date is not in the future
        LocalDate today = DateUtils.getBusinessLocalDate();
        if (postingDate.isAfter(today)) {
            postingDate = today;
        }
        
        // Calculate interest for the period
        Money interestAmount = interestCalculationEngine.calculateInterest(
            accountId,
            accountType,
            lastPostingDate,
            postingDate,
            accountConfig.getInterestRate(),
            accountConfig.getInterestCalculationStrategyType(),
            accountConfig.getDaysInYear(),
            accountConfig.getMinimumBalanceForInterestCalculation()
        );
        
        if (interestAmount.isGreaterThanZero()) {
            // Create interest posting transaction
            UUID transactionId = accountDataProvider.createInterestPostingTransaction(
                accountId, 
                accountType, 
                postingDate, 
                interestAmount
            );
            
            // Record the interest posting in the interest calculation engine
            interestCalculationEngine.recordInterestPosting(
                accountId, 
                accountType, 
                postingDate, 
                interestAmount, 
                transactionId
            );
            
            log.info("Posted interest of {} to account {} with transaction {}", 
                    interestAmount, accountId, transactionId);
        } else {
            log.info("No interest to post for account {} (amount: {})", 
                    accountId, interestAmount);
        }
        
        return interestAmount;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInterestPostingDue(UUID accountId, String accountType, LocalDate asOfDate) {
        log.debug("Checking if interest posting is due for account {} as of {}", 
                 accountId, asOfDate);
                 
        // Get account configuration
        AccountConfigurationData accountConfig = 
            accountDataProvider.getAccountConfiguration(accountId, accountType);
            
        // Get the last interest posting date
        LocalDate lastPostingDate = accountDataProvider.getLastInterestPostingDate(accountId, accountType);
        
        // If never posted interest before, check against account activation date
        if (lastPostingDate == null) {
            lastPostingDate = accountConfig.getActivationDate();
        }
        
        // Get next posting date based on posting period
        LocalDate nextPostingDate = getNextPostingDate(lastPostingDate, accountConfig.getInterestPostingPeriodType());
        
        // Interest posting is due if the next posting date is on or before the as-of date
        return !nextPostingDate.isAfter(asOfDate);
    }

    @Override
    @Transactional(readOnly = true)
    public LocalDate getNextInterestPostingDate(UUID accountId, String accountType) {
        log.debug("Getting next interest posting date for account {}", accountId);
        
        // Get account configuration
        AccountConfigurationData accountConfig = 
            accountDataProvider.getAccountConfiguration(accountId, accountType);
            
        // Get the last interest posting date
        LocalDate lastPostingDate = accountDataProvider.getLastInterestPostingDate(accountId, accountType);
        
        // If never posted interest before, use account activation date
        if (lastPostingDate == null) {
            lastPostingDate = accountConfig.getActivationDate();
        }
        
        // Calculate next posting date based on posting period
        return getNextPostingDate(lastPostingDate, accountConfig.getInterestPostingPeriodType());
    }
    
    /**
     * Helper method to calculate the next interest posting date based on the posting period.
     * 
     * @param lastPostingDate The last interest posting date
     * @param postingPeriodType The interest posting period type
     * @return The next interest posting date
     */
    private LocalDate getNextPostingDate(LocalDate lastPostingDate, InterestPostingPeriodType postingPeriodType) {
        LocalDate nextPostingDate;
        
        switch (postingPeriodType) {
            case MONTHLY:
                nextPostingDate = lastPostingDate.plusMonths(1);
                break;
                
            case QUARTERLY:
                nextPostingDate = lastPostingDate.plusMonths(3);
                break;
                
            case BIANNUAL:
                nextPostingDate = lastPostingDate.plusMonths(6);
                break;
                
            case ANNUAL:
                nextPostingDate = lastPostingDate.plusYears(1);
                break;
                
            default:
                // Default to monthly if the posting period type is unknown
                nextPostingDate = lastPostingDate.plusMonths(1);
                break;
        }
        
        // Adjust to end of month if the last posting date was at end of month
        // and the current month has fewer days
        if (lastPostingDate.getDayOfMonth() == lastPostingDate.lengthOfMonth() &&
            nextPostingDate.getDayOfMonth() < nextPostingDate.lengthOfMonth()) {
            nextPostingDate = nextPostingDate.with(TemporalAdjusters.lastDayOfMonth());
        }
        
        return nextPostingDate;
    }
}

/**
 * Enum for interest posting period types.
 */
enum InterestPostingPeriodType {
    MONTHLY,
    QUARTERLY,
    BIANNUAL,
    ANNUAL
}

/**
 * Data class for account configuration.
 */
@lombok.Value
class AccountConfigurationData {
    UUID accountId;
    String accountType;
    LocalDate activationDate;
    BigDecimal interestRate;
    InterestCalculationStrategyType interestCalculationStrategyType;
    InterestPostingPeriodType interestPostingPeriodType;
    int daysInYear;
    Money minimumBalanceForInterestCalculation;
}