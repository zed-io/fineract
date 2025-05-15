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
package org.apache.fineract.portfolio.loanaccount.loanschedule;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.fineract.infrastructure.core.domain.LocalDateInterval;
import org.apache.fineract.organisation.holiday.domain.Holiday;
import org.apache.fineract.organisation.holiday.service.HolidayUtil;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.workingdays.data.WorkingDaysData;
import org.apache.fineract.organisation.workingdays.domain.RepaymentRescheduleType;
import org.apache.fineract.portfolio.calendar.domain.Calendar;
import org.apache.fineract.portfolio.calendar.domain.CalendarFrequencyType;
import org.apache.fineract.portfolio.calendar.domain.CalendarHistory;
import org.apache.fineract.portfolio.calendar.domain.CalendarType;
import org.apache.fineract.portfolio.common.domain.PeriodFrequencyType;
import org.apache.fineract.portfolio.loanaccount.data.LoanTermVariationsData;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.DefaultScheduledDateGenerator;
import org.apache.fineract.portfolio.loanaccount.loanschedule.service.holiday.HolidayAwareScheduleService;
import org.apache.fineract.portfolio.loanaccount.loanschedule.service.holiday.HolidayAwareScheduleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the HolidayAwareScheduleGenerator component.
 */
public class HolidayAwareScheduleGeneratorTest {

    private HolidayAwareScheduleService holidayAwareScheduleService;
    private DefaultScheduledDateGenerator scheduledDateGenerator;

    @BeforeEach
    public void setup() {
        // Initialize components
        scheduledDateGenerator = new DefaultScheduledDateGenerator();
        holidayAwareScheduleService = new HolidayAwareScheduleServiceImpl();
    }

    @Test
    public void testGenerateDateWithNoHolidays() {
        // Setup
        LocalDate startDate = LocalDate.of(2023, 1, 15);
        int numberOfRepayments = 12;
        int repaymentEvery = 1;
        PeriodFrequencyType repaymentPeriodFrequencyType = PeriodFrequencyType.MONTHS;
        
        List<Holiday> holidays = new ArrayList<>();
        WorkingDaysData workingDaysData = mockWorkingDays();
        LocalDate seed = startDate;
        
        // Execute - generate a schedule without holidays
        List<LocalDate> dates = scheduledDateGenerator.generate(startDate, numberOfRepayments, repaymentEvery, 
                repaymentPeriodFrequencyType, seed, workingDaysData);
        
        // Verify
        assertNotNull(dates);
        assertEquals(12, dates.size());
        assertEquals(LocalDate.of(2023, 2, 15), dates.get(0));
        assertEquals(LocalDate.of(2023, 3, 15), dates.get(1));
        assertEquals(LocalDate.of(2024, 1, 15), dates.get(dates.size() - 1));
    }

    @Test
    public void testGenerateDateWithHolidays() {
        // Setup
        LocalDate startDate = LocalDate.of(2023, 1, 15);
        int numberOfRepayments = 12;
        int repaymentEvery = 1;
        PeriodFrequencyType repaymentPeriodFrequencyType = PeriodFrequencyType.MONTHS;
        
        // Create a holiday on March 15, 2023
        List<Holiday> holidays = createHolidays(
                LocalDate.of(2023, 3, 15), 
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY
        );
        
        WorkingDaysData workingDaysData = mockWorkingDays();
        LocalDate seedDate = startDate;
        
        // Execute - generate a schedule with the configured holiday
        List<LocalDate> originalDates = scheduledDateGenerator.generate(startDate, numberOfRepayments, repaymentEvery, 
                repaymentPeriodFrequencyType, seedDate, workingDaysData);
        
        List<LocalDate> adjustedDates = holidayAwareScheduleService.generateScheduleDates(
                originalDates,
                holidays, 
                workingDaysData, 
                null,
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY.getValue(),
                null);
        
        // Verify
        assertNotNull(adjustedDates);
        assertEquals(12, adjustedDates.size());
        assertEquals(LocalDate.of(2023, 2, 15), adjustedDates.get(0));
        // March 15 should be moved to March 16 due to holiday
        assertEquals(LocalDate.of(2023, 3, 16), adjustedDates.get(1));
        assertEquals(LocalDate.of(2024, 1, 15), adjustedDates.get(adjustedDates.size() - 1));
    }

    @Test
    public void testGenerateDateWithWeekendRescheduling() {
        // Setup
        LocalDate startDate = LocalDate.of(2023, 1, 15); // Sunday
        int numberOfRepayments = 12;
        int repaymentEvery = 1;
        PeriodFrequencyType repaymentPeriodFrequencyType = PeriodFrequencyType.MONTHS;
        
        // Configure working days - weekends (Saturday, Sunday) rescheduled to Monday
        WorkingDaysData workingDaysData = mockNonWorkingWeekends();
        
        List<Holiday> holidays = new ArrayList<>();
        LocalDate seedDate = startDate;
        
        // Execute - generate a schedule
        List<LocalDate> originalDates = scheduledDateGenerator.generate(startDate, numberOfRepayments, repaymentEvery, 
                repaymentPeriodFrequencyType, seedDate, workingDaysData);
        
        List<LocalDate> adjustedDates = holidayAwareScheduleService.generateScheduleDates(
                originalDates,
                holidays, 
                workingDaysData, 
                null,
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY.getValue(),
                null);
        
        // Verify
        assertNotNull(adjustedDates);
        assertEquals(12, adjustedDates.size());
        
        // February 15, 2023 is a Wednesday, so not moved
        assertEquals(LocalDate.of(2023, 2, 15), adjustedDates.get(0));
        
        // April 15, 2023 is a Saturday, should be moved to Monday, April 17
        assertEquals(LocalDate.of(2023, 4, 17), adjustedDates.get(2));
        
        // May 15, 2023 is a Monday, should remain as is
        assertEquals(LocalDate.of(2023, 5, 15), adjustedDates.get(3));
    }
    
    @Test
    public void testHolidayWithDifferentRescheduleTypes() {
        // Setup
        LocalDate startDate = LocalDate.of(2023, 1, 15);
        int numberOfRepayments = 12;
        int repaymentEvery = 1;
        PeriodFrequencyType repaymentPeriodFrequencyType = PeriodFrequencyType.MONTHS;
        
        // Create a holiday on March 15, 2023 with move to previous working day
        List<Holiday> holidaysPrevious = createHolidays(
                LocalDate.of(2023, 3, 15), 
                RepaymentRescheduleType.MOVE_TO_PREVIOUS_WORKING_DAY
        );
        
        // Create a holiday on April 15, 2023 with move to next working day
        List<Holiday> holidaysNext = createHolidays(
                LocalDate.of(2023, 4, 15), 
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY
        );
        
        // Create a holiday on May 15, 2023 with reschedule the entire balance
        List<Holiday> holidaysReschedule = createHolidays(
                LocalDate.of(2023, 5, 15), 
                RepaymentRescheduleType.RESCHEDULE_FUTURE_INSTALLMENTS
        );
        
        // Combine all holidays
        List<Holiday> allHolidays = new ArrayList<>();
        allHolidays.addAll(holidaysPrevious);
        allHolidays.addAll(holidaysNext);
        allHolidays.addAll(holidaysReschedule);
        
        WorkingDaysData workingDaysData = mockWorkingDays();
        LocalDate seedDate = startDate;
        
        // Execute - generate a schedule with different holiday reschedule types
        List<LocalDate> originalDates = scheduledDateGenerator.generate(startDate, numberOfRepayments, repaymentEvery, 
                repaymentPeriodFrequencyType, seedDate, workingDaysData);
        
        List<LocalDate> adjustedDates = holidayAwareScheduleService.generateScheduleDates(
                originalDates,
                allHolidays, 
                workingDaysData, 
                null,
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY.getValue(),
                null);
        
        // Verify
        assertNotNull(adjustedDates);
        assertEquals(12, adjustedDates.size());
        
        // March 15 with move to previous should be March 14
        assertEquals(LocalDate.of(2023, 3, 14), adjustedDates.get(1));
        
        // April 15 with move to next should be April 17 (assuming April 16 is a Sunday)
        assertEquals(LocalDate.of(2023, 4, 17), adjustedDates.get(2));
        
        // Remaining dates should be adjusted based on reschedule future installments
        // The actual implementation details would need to match whatever the real implementation does
    }
    
    @Test
    public void testScheduleWithCalendarEvents() {
        // Setup
        LocalDate startDate = LocalDate.of(2023, 1, 15);
        int numberOfRepayments = 12;
        int repaymentEvery = 1;
        PeriodFrequencyType repaymentPeriodFrequencyType = PeriodFrequencyType.MONTHS;
        
        // Create a meeting calendar for the loan (e.g., group meeting on 20th of every month)
        Calendar calendar = createMeetingCalendar(20); // Meeting on 20th of every month
        
        List<Holiday> holidays = new ArrayList<>();
        WorkingDaysData workingDaysData = mockWorkingDays();
        LocalDate seedDate = startDate;
        
        // Execute - generate a schedule with calendar events
        List<LocalDate> originalDates = scheduledDateGenerator.generate(startDate, numberOfRepayments, repaymentEvery, 
                repaymentPeriodFrequencyType, seedDate, workingDaysData);
        
        List<LocalDate> adjustedDates = holidayAwareScheduleService.generateScheduleDates(
                originalDates,
                holidays, 
                workingDaysData, 
                calendar,
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY.getValue(),
                null);
        
        // Verify
        assertNotNull(adjustedDates);
        assertEquals(12, adjustedDates.size());
        
        // All dates should be on the 20th of each month due to the calendar
        assertEquals(LocalDate.of(2023, 2, 20), adjustedDates.get(0));
        assertEquals(LocalDate.of(2023, 3, 20), adjustedDates.get(1));
        assertEquals(LocalDate.of(2023, 4, 20), adjustedDates.get(2));
    }
    
    // Helper methods
    
    private List<Holiday> createHolidays(LocalDate holidayDate, RepaymentRescheduleType rescheduleType) {
        Holiday holiday = mock(Holiday.class);
        when(holiday.getFromDate()).thenReturn(holidayDate);
        when(holiday.getToDate()).thenReturn(holidayDate);
        when(holiday.getRepaymentsRescheduledTo()).thenReturn(rescheduleType.getValue());
        
        LocalDateInterval interval = new LocalDateInterval(holidayDate, holidayDate);
        when(holiday.occursOnDate(holidayDate)).thenReturn(true);
        when(holiday.toStandardHoliday()).thenReturn(interval);
        
        return Arrays.asList(holiday);
    }
    
    private WorkingDaysData mockWorkingDays() {
        return new WorkingDaysData(1, "MONDAY", "FRIDAY", 
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY.getValue(), 
                false, Arrays.asList(6, 7));
    }
    
    private WorkingDaysData mockNonWorkingWeekends() {
        return new WorkingDaysData(1, "MONDAY", "FRIDAY", 
                RepaymentRescheduleType.MOVE_TO_NEXT_WORKING_DAY.getValue(), 
                false, Arrays.asList(6, 7));
    }
    
    private Calendar createMeetingCalendar(int dayOfMonth) {
        Calendar calendar = mock(Calendar.class);
        when(calendar.getStartDate()).thenReturn(LocalDate.of(2023, 1, 1));
        when(calendar.getFrequency()).thenReturn(CalendarFrequencyType.MONTHLY.getValue());
        when(calendar.getInterval()).thenReturn(1);
        when(calendar.getCalendarType()).thenReturn(CalendarType.COLLECTION.getValue());
        
        // Additional configuration to make calendar return predefined meeting dates
        // This is a simplification for the test - real implementation would be more complex
        when(calendar.isValidRecurringDate(any())).thenReturn(true);
        
        // Adjust the date to the nearest calendar date (20th of the month in our case)
        when(calendar.getNextRecurringDate(any())).thenAnswer(invocation -> {
            LocalDate date = invocation.getArgument(0);
            return LocalDate.of(date.getYear(), date.getMonth(), dayOfMonth);
        });
        
        Set<CalendarHistory> history = new HashSet<>();
        when(calendar.getCalendarHistory()).thenReturn(history);
        
        return calendar;
    }
}