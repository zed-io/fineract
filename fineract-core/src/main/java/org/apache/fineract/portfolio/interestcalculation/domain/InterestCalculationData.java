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
import java.time.LocalDate;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Data object containing the necessary information for calculating interest.
 */
@Getter
@RequiredArgsConstructor
public class InterestCalculationData {

    private final LocalDate fromDate;
    private final LocalDate toDate;
    private final BigDecimal openingBalance;
    private final BigDecimal closingBalance;
    private final BigDecimal averageBalance;
    private final BigDecimal minimumBalance;
    private final int daysInPeriod;
    
    /**
     * Factory method to create an interest calculation data object.
     */
    public static InterestCalculationData create(LocalDate fromDate, LocalDate toDate, 
                                                BigDecimal openingBalance, BigDecimal closingBalance,
                                                BigDecimal averageBalance, BigDecimal minimumBalance) {
        // Calculate days in period (inclusive of both start and end date)
        int daysInPeriod = toDate.getDayOfYear() - fromDate.getDayOfYear() + 1;
        if (toDate.getYear() > fromDate.getYear()) {
            // Adjust for year boundary crossing
            daysInPeriod += (toDate.getYear() - fromDate.getYear()) * 365;
            // Further adjust for leap years if necessary
            for (int year = fromDate.getYear(); year <= toDate.getYear(); year++) {
                if (isLeapYear(year) && 
                    ((year == fromDate.getYear() && fromDate.getDayOfYear() <= 59) || 
                     (year == toDate.getYear() && toDate.getDayOfYear() >= 60) ||
                     (year > fromDate.getYear() && year < toDate.getYear()))) {
                    daysInPeriod += 1;
                }
            }
        }
        
        return new InterestCalculationData(fromDate, toDate, openingBalance, closingBalance, 
                                          averageBalance, minimumBalance, daysInPeriod);
    }
    
    private static boolean isLeapYear(int year) {
        return (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
    }
}