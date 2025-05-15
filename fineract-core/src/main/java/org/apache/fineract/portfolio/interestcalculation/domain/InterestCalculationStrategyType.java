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

import java.util.Arrays;

/**
 * Different methods to calculate interest on an account:
 * <ul>
 * <li>Daily Balance</li>
 * <li>Average Daily Balance</li>
 * <li>Minimum Balance</li>
 * <li>Tiered Balance</li>
 * <li>Bonus Interest</li>
 * <li>Youth Account</li>
 * <li>Promotional Interest</li>
 * </ul>
 */
public enum InterestCalculationStrategyType {

    INVALID(0, "interestCalculationStrategyType.invalid"), //
    DAILY_BALANCE(1, "interestCalculationStrategyType.dailyBalance"), //
    AVERAGE_DAILY_BALANCE(2, "interestCalculationStrategyType.averageDailyBalance"), //
    MINIMUM_BALANCE(3, "interestCalculationStrategyType.minimumBalance"), //
    TIERED_BALANCE(4, "interestCalculationStrategyType.tieredBalance"), //
    BONUS_INTEREST(5, "interestCalculationStrategyType.bonusInterest"), //
    YOUTH_ACCOUNT(6, "interestCalculationStrategyType.youthAccount"), //
    PROMOTIONAL_INTEREST(7, "interestCalculationStrategyType.promotionalInterest");

    private final Integer value;
    private final String code;

    InterestCalculationStrategyType(final Integer value, final String code) {
        this.value = value;
        this.code = code;
    }

    public Integer getValue() {
        return this.value;
    }

    public String getCode() {
        return this.code;
    }

    public static Object[] integerValues() {
        return Arrays.stream(values()).filter(value -> !INVALID.equals(value)).map(value -> value.value).toList().toArray();
    }

    public static InterestCalculationStrategyType fromInt(final Integer v) {
        if (v == null) {
            return INVALID;
        }

        switch (v) {
            case 1:
                return DAILY_BALANCE;
            case 2:
                return AVERAGE_DAILY_BALANCE;
            case 3:
                return MINIMUM_BALANCE;
            case 4:
                return TIERED_BALANCE;
            case 5:
                return BONUS_INTEREST;
            case 6:
                return YOUTH_ACCOUNT;
            case 7:
                return PROMOTIONAL_INTEREST;
            default:
                return INVALID;
        }
    }
}