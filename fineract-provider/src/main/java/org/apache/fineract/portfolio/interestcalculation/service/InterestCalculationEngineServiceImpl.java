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
import java.math.MathContext;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.core.service.MathUtil;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.interestcalculation.domain.BalanceHistoryProvider;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationData;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationEngine;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategy;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationStrategyType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default implementation of the interest calculation engine.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InterestCalculationEngineServiceImpl implements InterestCalculationEngine {

    private final Map<InterestCalculationStrategyType, InterestCalculationStrategy> strategies;
    private final BalanceHistoryProvider balanceHistoryProvider;
    private final InterestCalculationRepository interestCalculationRepository;
    private final InterestDailyAccrualRepository dailyAccrualRepository;
    private final MathContext mathContext;
    
    @Override
    @Transactional
    public Money calculateInterest(UUID accountId, String accountType, LocalDate fromDate, LocalDate toDate,
                                 BigDecimal interestRate, InterestCalculationStrategyType strategyType,
                                 int daysInYear, Money minBalanceForInterestCalculation) {
    
        log.debug("Calculating interest for account {} of type {} from {} to {}", 
                 accountId, accountType, fromDate, toDate);
        
        // Get the appropriate calculation strategy
        InterestCalculationStrategy strategy = getCalculationStrategy(strategyType);
        
        // Get balance history for the calculation period
        List<InterestCalculationData> balanceHistory = 
            balanceHistoryProvider.getBalanceHistory(accountId, accountType, fromDate, toDate);
        
        // Currency to use for the calculations
        MonetaryCurrency currency = minBalanceForInterestCalculation.getCurrency();
        
        // Calculate interest for each day/period in the balance history
        Money totalInterest = Money.zero(currency);
        
        for (InterestCalculationData balanceData : balanceHistory) {
            // Convert balance to Money for eligibility check
            Money balance = Money.of(currency, balanceData.getClosingBalance());
            
            // Check if balance is eligible for interest
            if (strategy.isEligibleForInterestCalculation(balance, minBalanceForInterestCalculation)) {
                // Calculate interest for this period
                Money periodInterest = strategy.calculateInterest(
                    currency, balanceData, interestRate, daysInYear);
                
                // Add to total
                totalInterest = totalInterest.plus(periodInterest);
            }
        }
        
        // Record calculation in history
        recordInterestCalculation(accountId, accountType, fromDate, toDate, 
                                 interestRate, strategyType, daysInYear, totalInterest);
        
        return totalInterest;
    }
    
    @Override
    @Transactional
    public Money processAccruals(UUID accountId, String accountType, LocalDate accrualDate,
                               BigDecimal interestRate, InterestCalculationStrategyType strategyType,
                               int daysInYear, Money minBalanceForInterestCalculation) {
    
        log.debug("Processing accruals for account {} of type {} as of {}", 
                 accountId, accountType, accrualDate);
    
        // Get the daily balance for the accrual date
        InterestCalculationData dailyBalance = 
            balanceHistoryProvider.getDailyBalance(accountId, accountType, accrualDate);
            
        if (dailyBalance == null) {
            log.warn("No balance data found for account {} on {}", accountId, accrualDate);
            return Money.zero(minBalanceForInterestCalculation.getCurrency());
        }
        
        // Get the calculation strategy
        InterestCalculationStrategy strategy = getCalculationStrategy(strategyType);
        
        // Currency for calculations
        MonetaryCurrency currency = minBalanceForInterestCalculation.getCurrency();
        
        // Calculate the daily interest
        Money balance = Money.of(currency, dailyBalance.getClosingBalance());
        Money dailyInterest = Money.zero(currency);
        
        if (strategy.isEligibleForInterestCalculation(balance, minBalanceForInterestCalculation)) {
            dailyInterest = strategy.calculateInterest(
                currency, dailyBalance, interestRate, daysInYear);
        }
        
        // Record the daily accrual
        recordDailyAccrual(accountId, accountType, accrualDate, balance.getAmount(), 
                          dailyInterest.getAmount(), interestRate, daysInYear);
        
        // Return the accrued interest for the day
        return dailyInterest;
    }
    
    @Override
    @Transactional(readOnly = true)
    public Money getAccruedInterest(UUID accountId, String accountType, LocalDate asOfDate) {
        BigDecimal totalAccrued = dailyAccrualRepository.getAccruedInterestTotal(
            accountId, accountType, asOfDate);
            
        // Get currency from the latest accrual record
        MonetaryCurrency currency = 
            dailyAccrualRepository.getLatestAccrualCurrency(accountId, accountType);
            
        if (currency == null) {
            log.warn("No currency found for account {} accruals, using default", accountId);
            // Fallback to a default currency if none found
            currency = new MonetaryCurrency("USD", 2, 0);
        }
        
        return Money.of(currency, totalAccrued != null ? totalAccrued : BigDecimal.ZERO);
    }
    
    @Override
    @Transactional
    public void recordInterestPosting(UUID accountId, String accountType, LocalDate postingDate,
                                    Money interestAmount, UUID transactionId) {
        
        log.debug("Recording interest posting of {} for account {} on {}",
                 interestAmount, accountId, postingDate);
                 
        // Mark interest calculation records as posted
        interestCalculationRepository.markAsPosted(
            accountId, accountType, postingDate, transactionId);
            
        // Mark daily accruals as processed up to the posting date
        dailyAccrualRepository.markAsProcessed(accountId, accountType, postingDate);
    }
    
    private InterestCalculationStrategy getCalculationStrategy(InterestCalculationStrategyType strategyType) {
        InterestCalculationStrategy strategy = strategies.get(strategyType);
        
        if (strategy == null) {
            throw new IllegalArgumentException(
                "No strategy implementation found for: " + strategyType);
        }
        
        return strategy;
    }
    
    private void recordInterestCalculation(UUID accountId, String accountType, LocalDate fromDate, 
                                         LocalDate toDate, BigDecimal interestRate, 
                                         InterestCalculationStrategyType strategyType, 
                                         int daysInYear, Money interestAmount) {
                                         
        // Create calculation metadata
        Map<String, Object> calculationData = new HashMap<>();
        calculationData.put("calculationMethod", strategyType.getCode());
        calculationData.put("daysInPeriod", toDate.toEpochDay() - fromDate.toEpochDay() + 1);
        
        // Get average balance for the period
        InterestCalculationData overallBalance = 
            balanceHistoryProvider.getBalanceHistory(accountId, accountType, fromDate, toDate)
                                 .get(0); // this will need refinement for multiple periods
        
        interestCalculationRepository.saveCalculationHistory(
            accountId, 
            accountType, 
            DateUtils.getBusinessLocalDate(), // calculation date is today
            fromDate,
            toDate, 
            interestAmount.getAmount(),
            overallBalance.getAverageBalance(), // using average balance for the record
            interestRate,
            strategyType,
            daysInYear,
            false, // not posted yet
            null,  // no transaction ID yet
            calculationData
        );
    }
    
    private void recordDailyAccrual(UUID accountId, String accountType, LocalDate accrualDate,
                                  BigDecimal balanceAmount, BigDecimal accruedInterest, 
                                  BigDecimal interestRate, int daysInYear) {
                                  
        dailyAccrualRepository.saveDailyAccrual(
            accountId,
            accountType,
            accrualDate,
            balanceAmount,
            accruedInterest,
            interestRate,
            daysInYear,
            false, // not processed yet
            null   // no processing date yet
        );
    }
}