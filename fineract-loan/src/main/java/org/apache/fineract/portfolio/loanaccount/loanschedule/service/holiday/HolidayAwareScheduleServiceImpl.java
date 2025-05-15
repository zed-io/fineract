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
import org.apache.fineract.infrastructure.configuration.domain.ConfigurationDomainService;
import org.apache.fineract.organisation.holiday.domain.Holiday;
import org.apache.fineract.organisation.holiday.service.HolidayUtil;
import org.apache.fineract.organisation.workingdays.data.AdjustedDateDetailsDTO;
import org.apache.fineract.organisation.workingdays.domain.RepaymentRescheduleType;
import org.apache.fineract.organisation.workingdays.service.WorkingDaysUtil;
import org.apache.fineract.portfolio.loanaccount.data.HolidayDetailDTO;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanApplicationTerms;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Implementation of the holiday-aware schedule service.
 */
@Service
public class HolidayAwareScheduleServiceImpl implements HolidayAwareScheduleService {

    private final HolidayStrategyFactory holidayStrategyFactory;
    private final ConfigurationDomainService configurationDomainService;

    @Autowired
    public HolidayAwareScheduleServiceImpl(HolidayStrategyFactory holidayStrategyFactory,
                                          ConfigurationDomainService configurationDomainService) {
        this.holidayStrategyFactory = holidayStrategyFactory;
        this.configurationDomainService = configurationDomainService;
    }

    @Override
    public AdjustedDateDetailsDTO adjustRepaymentDate(LocalDate repaymentDate, LoanApplicationTerms loanApplicationTerms,
                                                    HolidayDetailDTO holidayDetailDTO, LocalDate nextRepaymentDate) {
        
        if (holidayDetailDTO == null || (holidayDetailDTO.getWorkingDays() == null && holidayDetailDTO.getHolidays() == null)) {
            // No holiday or working day configuration, return original date
            return new AdjustedDateDetailsDTO(repaymentDate, repaymentDate, nextRepaymentDate);
        }
        
        HolidayStrategy strategy;
        
        // Check if we should extend the term for this loan
        boolean extendTermForDailyRepayments = holidayDetailDTO.getWorkingDays() != null 
                && holidayDetailDTO.getWorkingDays().getExtendTermForDailyRepayments() != null
                && holidayDetailDTO.getWorkingDays().getExtendTermForDailyRepayments();
                
        boolean extendTermForRepaymentsOnHolidays = holidayDetailDTO.getWorkingDays() != null 
                && holidayDetailDTO.getWorkingDays().getExtendTermForRepaymentsOnHolidays() != null
                && holidayDetailDTO.getWorkingDays().getExtendTermForRepaymentsOnHolidays();
        
        // Use extend term strategy if configured
        if ((loanApplicationTerms.getRepaymentPeriodFrequencyType().isDaily() && extendTermForDailyRepayments) 
                || extendTermForRepaymentsOnHolidays) {
            strategy = holidayStrategyFactory.createExtendTermStrategy();
        } else {
            // Otherwise use the configured reschedule strategy
            RepaymentRescheduleType rescheduleType = WorkingDaysUtil.getRepaymentRescheduleType(holidayDetailDTO.getWorkingDays());
            strategy = holidayStrategyFactory.createStrategy(rescheduleType);
        }
        
        return strategy.adjustRepaymentDate(repaymentDate, holidayDetailDTO.getHolidays(), 
                                           holidayDetailDTO.getWorkingDays(), nextRepaymentDate, loanApplicationTerms);
    }

    @Override
    public boolean isHoliday(LocalDate date, HolidayDetailDTO holidayDetailDTO) {
        if (holidayDetailDTO == null || holidayDetailDTO.getHolidays() == null) {
            return false;
        }
        return HolidayUtil.isHoliday(date, holidayDetailDTO.getHolidays());
    }

    @Override
    public Holiday getApplicableHoliday(LocalDate date, HolidayDetailDTO holidayDetailDTO) {
        if (holidayDetailDTO == null || holidayDetailDTO.getHolidays() == null) {
            return null;
        }
        return HolidayUtil.getApplicableHoliday(date, holidayDetailDTO.getHolidays());
    }

    @Override
    public boolean isNonWorkingDay(LocalDate date, HolidayDetailDTO holidayDetailDTO) {
        if (holidayDetailDTO == null || holidayDetailDTO.getWorkingDays() == null) {
            return false;
        }
        return WorkingDaysUtil.isNonWorkingDay(holidayDetailDTO.getWorkingDays(), date);
    }

    @Override
    public boolean shouldRecalculateInterest(LocalDate originalDate, LocalDate adjustedDate, 
                                           LoanApplicationTerms loanApplicationTerms, HolidayDetailDTO holidayDetailDTO) {
        
        if (holidayDetailDTO == null || (holidayDetailDTO.getWorkingDays() == null && holidayDetailDTO.getHolidays() == null)) {
            return false; // No adjustments needed
        }
        
        HolidayStrategy strategy;
        
        // Check if we should extend the term for this loan
        boolean extendTermForDailyRepayments = holidayDetailDTO.getWorkingDays() != null 
                && holidayDetailDTO.getWorkingDays().getExtendTermForDailyRepayments() != null
                && holidayDetailDTO.getWorkingDays().getExtendTermForDailyRepayments();
                
        boolean extendTermForRepaymentsOnHolidays = holidayDetailDTO.getWorkingDays() != null 
                && holidayDetailDTO.getWorkingDays().getExtendTermForRepaymentsOnHolidays() != null
                && holidayDetailDTO.getWorkingDays().getExtendTermForRepaymentsOnHolidays();
        
        // Use extend term strategy if configured
        if ((loanApplicationTerms.getRepaymentPeriodFrequencyType().isDaily() && extendTermForDailyRepayments) 
                || extendTermForRepaymentsOnHolidays) {
            strategy = holidayStrategyFactory.createExtendTermStrategy();
        } else {
            // Otherwise use the configured reschedule strategy
            RepaymentRescheduleType rescheduleType = WorkingDaysUtil.getRepaymentRescheduleType(holidayDetailDTO.getWorkingDays());
            strategy = holidayStrategyFactory.createStrategy(rescheduleType);
        }
        
        return strategy.shouldRecalculateInterest(originalDate, adjustedDate, loanApplicationTerms, holidayDetailDTO);
    }
}