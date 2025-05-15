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
import org.apache.fineract.portfolio.loanaccount.data.HolidayDetailDTO;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanApplicationTerms;

/**
 * Strategy interface for handling loan repayment dates that fall on holidays or non-working days.
 */
public interface HolidayStrategy {

    /**
     * Adjusts a repayment date if it falls on a holiday or non-working day based on the strategy.
     *
     * @param repaymentDate The original repayment date to check
     * @param holidays List of applicable holidays
     * @param workingDays Working days configuration
     * @param nextRepaymentDate The next scheduled repayment date after the current one
     * @param loanApplicationTerms The loan application terms
     * @return AdjustedDateDetailsDTO containing the adjusted date and related information
     */
    AdjustedDateDetailsDTO adjustRepaymentDate(LocalDate repaymentDate, List<Holiday> holidays, WorkingDays workingDays, 
                                              LocalDate nextRepaymentDate, LoanApplicationTerms loanApplicationTerms);

    /**
     * Checks if a date falls on a holiday.
     *
     * @param date The date to check
     * @param holidays List of applicable holidays
     * @return true if the date is a holiday, false otherwise
     */
    boolean isHoliday(LocalDate date, List<Holiday> holidays);

    /**
     * Gets the specific holiday that a date falls on, if any.
     *
     * @param date The date to check
     * @param holidays List of applicable holidays
     * @return The Holiday object if the date is a holiday, null otherwise
     */
    Holiday getApplicableHoliday(LocalDate date, List<Holiday> holidays);

    /**
     * Recalculates interest when a repayment date has been shifted.
     *
     * @param originalDate The original repayment date
     * @param adjustedDate The adjusted repayment date
     * @param loanApplicationTerms The loan application terms
     * @param holidayDetailDTO Holiday details
     * @return true if interest needs to be recalculated, false otherwise
     */
    boolean shouldRecalculateInterest(LocalDate originalDate, LocalDate adjustedDate, 
                                     LoanApplicationTerms loanApplicationTerms, HolidayDetailDTO holidayDetailDTO);
}