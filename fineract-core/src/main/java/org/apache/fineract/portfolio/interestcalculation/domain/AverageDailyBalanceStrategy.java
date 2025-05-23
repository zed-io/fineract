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

import java.math.BigDecimal;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.springframework.stereotype.Component;

/**
 * Average daily balance interest calculation strategy.
 * <p>
 * This strategy calculates interest based on the average of the daily balances over the period.
 */
@Component
public class AverageDailyBalanceStrategy extends AbstractInterestCalculationStrategy {

    @Override
    public Money calculateInterest(MonetaryCurrency currency, InterestCalculationData balanceData, 
                                  BigDecimal annualInterestRate, int daysInYear) {
        
        // For average daily balance, we use the average balance for the period
        BigDecimal balanceAmount = balanceData.getAverageBalance();
        
        BigDecimal interestAmount = BigDecimal.ZERO;
        if (balanceAmount.compareTo(BigDecimal.ZERO) > 0) {
            interestAmount = calculateDailyInterest(
                balanceAmount, 
                annualInterestRate, 
                balanceData.getDaysInPeriod(), 
                daysInYear
            );
        }
        
        return Money.of(currency, interestAmount);
    }

    @Override
    public InterestCalculationStrategyType getType() {
        return InterestCalculationStrategyType.AVERAGE_DAILY_BALANCE;
    }
}