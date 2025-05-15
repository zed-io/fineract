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

import java.time.LocalDate;
import java.util.List;
import org.apache.fineract.organisation.holiday.domain.Holiday;
import org.apache.fineract.organisation.workingdays.data.AdjustedDateDetailsDTO;
import org.apache.fineract.organisation.workingdays.domain.WorkingDays;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanApplicationTerms;
import org.springframework.stereotype.Component;

/**
 * Strategy that moves repayment dates that fall on holidays or non-working days to the previous working day.
 */
@Component
public class PreviousWorkingDayStrategy extends AbstractHolidayStrategy {

    @Override
    public AdjustedDateDetailsDTO adjustRepaymentDate(LocalDate repaymentDate, List<Holiday> holidays, WorkingDays workingDays,
                                                   LocalDate nextRepaymentDate, LoanApplicationTerms loanApplicationTerms) {
        
        LocalDate adjustedDate = repaymentDate;
        
        // First check if it falls on a holiday
        Holiday applicableHoliday = getApplicableHoliday(adjustedDate, holidays);
        if (applicableHoliday != null) {
            if (applicableHoliday.getReScheduleType().isRescheduleToSpecificDate()) {
                // The holiday has a specific reschedule date
                adjustedDate = applicableHoliday.getRepaymentsRescheduledTo();
            } else {
                // Move to previous working day
                adjustedDate = adjustedDate.minusDays(1);
                // Recursively check if the new date also falls on a holiday or non-working day
                while (isHoliday(adjustedDate, holidays) || isNonWorkingDay(workingDays, adjustedDate)) {
                    adjustedDate = adjustedDate.minusDays(1);
                }
            }
        }
        
        // Then check if it falls on a non-working day
        if (isNonWorkingDay(workingDays, adjustedDate)) {
            adjustedDate = adjustedDate.minusDays(1);
            // Recursively check if the new date also falls on a holiday or non-working day
            while (isHoliday(adjustedDate, holidays) || isNonWorkingDay(workingDays, adjustedDate)) {
                adjustedDate = adjustedDate.minusDays(1);
            }
        }
        
        return createAdjustedDateDetailsDTO(repaymentDate, adjustedDate, nextRepaymentDate);
    }
}