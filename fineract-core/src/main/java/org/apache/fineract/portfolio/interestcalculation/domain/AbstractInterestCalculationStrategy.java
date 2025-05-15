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
import java.math.MathContext;
import java.math.RoundingMode;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;

/**
 * Abstract base class for interest calculation strategies providing common functionality.
 */
public abstract class AbstractInterestCalculationStrategy implements InterestCalculationStrategy {

    protected final MathContext mathContext;
    protected static final int DEFAULT_PRECISION = 19;
    protected static final int DEFAULT_SCALE = 6;
    
    protected AbstractInterestCalculationStrategy() {
        this.mathContext = new MathContext(DEFAULT_PRECISION, RoundingMode.HALF_EVEN);
    }
    
    /**
     * Helper method to calculate daily interest based on an annual rate.
     * 
     * @param balance The balance to calculate interest on
     * @param annualInterestRate The annual interest rate as a decimal (e.g., 0.05 for 5%)
     * @param daysInPeriod The number of days in the period
     * @param daysInYear The number of days in the year (365 or 360)
     * @return The interest amount as a BigDecimal
     */
    protected BigDecimal calculateDailyInterest(BigDecimal balance, BigDecimal annualInterestRate, 
                                             int daysInPeriod, int daysInYear) {
        // Formula: interest = principal * rate * (daysInPeriod / daysInYear)
        BigDecimal dailyInterestRate = annualInterestRate.divide(
            new BigDecimal(daysInYear), mathContext);
        
        return balance.multiply(dailyInterestRate)
                     .multiply(new BigDecimal(daysInPeriod), mathContext);
    }
    
    @Override
    public boolean isEligibleForInterestCalculation(Money balance, Money minimumBalanceForInterestCalculation) {
        if (minimumBalanceForInterestCalculation == null || minimumBalanceForInterestCalculation.isZero()) {
            return true;
        }
        return balance.isGreaterThanOrEqualTo(minimumBalanceForInterestCalculation);
    }
}