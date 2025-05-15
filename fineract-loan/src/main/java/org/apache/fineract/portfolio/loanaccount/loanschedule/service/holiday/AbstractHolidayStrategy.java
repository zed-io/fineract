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
import org.apache.fineract.organisation.holiday.service.HolidayUtil;
import org.apache.fineract.organisation.workingdays.data.AdjustedDateDetailsDTO;
import org.apache.fineract.organisation.workingdays.domain.WorkingDays;
import org.apache.fineract.organisation.workingdays.service.WorkingDaysUtil;
import org.apache.fineract.portfolio.loanaccount.data.HolidayDetailDTO;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanApplicationTerms;

/**
 * Base implementation of holiday strategy providing common functionality across strategies.
 */
public abstract class AbstractHolidayStrategy implements HolidayStrategy {

    @Override
    public boolean isHoliday(LocalDate date, List<Holiday> holidays) {
        return HolidayUtil.isHoliday(date, holidays);
    }

    @Override
    public Holiday getApplicableHoliday(LocalDate date, List<Holiday> holidays) {
        return HolidayUtil.getApplicableHoliday(date, holidays);
    }
    
    @Override
    public boolean shouldRecalculateInterest(LocalDate originalDate, LocalDate adjustedDate, 
                                           LoanApplicationTerms loanApplicationTerms, HolidayDetailDTO holidayDetailDTO) {
        if (DateUtils.isEqual(originalDate, adjustedDate)) {
            return false; // No date shift, no need for recalculation
        }
        
        // Default implementation - recalculate interest if the date has shifted by more than one day
        return Math.abs(ChronoUnit.DAYS.between(originalDate, adjustedDate)) > 1;
    }
    
    /**
     * Helper method to check if a date is a working day
     */
    protected boolean isWorkingDay(WorkingDays workingDays, LocalDate date) {
        return WorkingDaysUtil.isWorkingDay(workingDays, date);
    }
    
    /**
     * Helper method to check if a date falls on a non-working day
     */
    protected boolean isNonWorkingDay(WorkingDays workingDays, LocalDate date) {
        return WorkingDaysUtil.isNonWorkingDay(workingDays, date);
    }
    
    /**
     * Helper method to create a new adjusted date details object
     */
    protected AdjustedDateDetailsDTO createAdjustedDateDetailsDTO(LocalDate originalDate, LocalDate adjustedDate, LocalDate nextRepaymentDate) {
        return new AdjustedDateDetailsDTO(adjustedDate, originalDate, nextRepaymentDate);
    }
}