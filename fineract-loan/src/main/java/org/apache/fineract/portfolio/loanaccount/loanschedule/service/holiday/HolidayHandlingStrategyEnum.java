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
package org.apache.fineract.portfolio.loanaccount.loanschedule.service.holiday;

import java.util.HashMap;
import java.util.Map;
import lombok.Getter;

/**
 * Enum representing different holiday handling strategies for loan repayment schedules.
 */
@Getter
public enum HolidayHandlingStrategyEnum {

    SAME_DAY(1, "HolidayHandlingStrategy.same.day", "Don't change repayment date, keep on holiday"),
    NEXT_WORKING_DAY(2, "HolidayHandlingStrategy.next.working.day", "Move to next working day"),
    PREVIOUS_WORKING_DAY(3, "HolidayHandlingStrategy.previous.working.day", "Move to previous working day"),
    NEXT_REPAYMENT_DAY(4, "HolidayHandlingStrategy.next.repayment.day", "Move to next repayment day (combine with next repayment)"),
    EXTEND_TERM(5, "HolidayHandlingStrategy.extend.term", "Extend the loan term for each holiday");

    private final Integer value;
    private final String code;
    private final String description;

    HolidayHandlingStrategyEnum(final Integer value, final String code, final String description) {
        this.value = value;
        this.code = code;
        this.description = description;
    }

    /**
     * Get the holiday handling strategy from its value.
     *
     * @param value The integer value representing the strategy
     * @return The HolidayHandlingStrategyEnum object, or NEXT_WORKING_DAY if the value is not recognized
     */
    public static HolidayHandlingStrategyEnum fromInt(Integer value) {
        if (value == null) {
            return NEXT_WORKING_DAY; // Default behavior
        }
        
        for (HolidayHandlingStrategyEnum strategyEnum : HolidayHandlingStrategyEnum.values()) {
            if (strategyEnum.getValue().equals(value)) {
                return strategyEnum;
            }
        }
        
        return NEXT_WORKING_DAY; // Default fallback
    }
    
    /**
     * Get a map of all holiday handling strategies.
     *
     * @return A map of strategy values to strategy descriptions
     */
    public static Map<Integer, String> getAllStrategies() {
        Map<Integer, String> strategyMap = new HashMap<>();
        
        for (HolidayHandlingStrategyEnum strategyEnum : HolidayHandlingStrategyEnum.values()) {
            strategyMap.put(strategyEnum.getValue(), strategyEnum.getDescription());
        }
        
        return strategyMap;
    }
}