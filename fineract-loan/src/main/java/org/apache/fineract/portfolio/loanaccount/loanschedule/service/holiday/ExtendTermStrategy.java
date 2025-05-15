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
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.organisation.holiday.domain.Holiday;
import org.apache.fineract.organisation.workingdays.data.AdjustedDateDetailsDTO;
import org.apache.fineract.organisation.workingdays.domain.WorkingDays;
import org.apache.fineract.portfolio.loanaccount.data.HolidayDetailDTO;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanApplicationTerms;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.ScheduledDateGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Strategy that extends the loan term when a repayment falls on a holiday or non-working day.
 * Each repayment is shifted to the next working day, effectively extending the overall loan term.
 */
@Component
public class ExtendTermStrategy extends AbstractHolidayStrategy {

    private final ScheduledDateGenerator scheduledDateGenerator;

    @Autowired
    public ExtendTermStrategy(ScheduledDateGenerator scheduledDateGenerator) {
        this.scheduledDateGenerator = scheduledDateGenerator;
    }

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
                // Move to next working day
                adjustedDate = adjustedDate.plusDays(1);
                // Recursively check if the new date also falls on a holiday or non-working day
                while (isHoliday(adjustedDate, holidays) || isNonWorkingDay(workingDays, adjustedDate)) {
                    adjustedDate = adjustedDate.plusDays(1);
                }
            }
        }
        
        // Then check if it falls on a non-working day
        if (isNonWorkingDay(workingDays, adjustedDate)) {
            adjustedDate = adjustedDate.plusDays(1);
            // Recursively check if the new date also falls on a holiday or non-working day
            while (isHoliday(adjustedDate, holidays) || isNonWorkingDay(workingDays, adjustedDate)) {
                adjustedDate = adjustedDate.plusDays(1);
            }
        }
        
        // For extend term strategy, we need to adjust all subsequent repayment dates
        // We'll return the adjusted date, and the caller should handle shifting all future dates
        LocalDate adjustedNextRepaymentDate = nextRepaymentDate;
        if (nextRepaymentDate != null && !DateUtils.isEqual(adjustedDate, repaymentDate)) {
            // Calculate how many days were shifted
            long daysShifted = ChronoUnit.DAYS.between(repaymentDate, adjustedDate);
            // Shift the next repayment date by the same number of days
            adjustedNextRepaymentDate = nextRepaymentDate.plusDays(daysShifted);
        }
        
        return new AdjustedDateDetailsDTO(adjustedDate, repaymentDate, adjustedNextRepaymentDate);
    }
    
    @Override
    public boolean shouldRecalculateInterest(LocalDate originalDate, LocalDate adjustedDate, 
                                           LoanApplicationTerms loanApplicationTerms, HolidayDetailDTO holidayDetailDTO) {
        // For extend term strategy, always recalculate interest for the extended period
        return !DateUtils.isEqual(originalDate, adjustedDate);
    }
}