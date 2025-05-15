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

import org.apache.fineract.organisation.workingdays.domain.RepaymentRescheduleType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Factory for creating appropriate holiday handling strategies based on configuration.
 */
@Component
public class HolidayStrategyFactory {

    private final NextWorkingDayStrategy nextWorkingDayStrategy;
    private final PreviousWorkingDayStrategy previousWorkingDayStrategy;
    private final NextRepaymentDateStrategy nextRepaymentDateStrategy;
    private final ExtendTermStrategy extendTermStrategy;

    @Autowired
    public HolidayStrategyFactory(NextWorkingDayStrategy nextWorkingDayStrategy,
                                 PreviousWorkingDayStrategy previousWorkingDayStrategy,
                                 NextRepaymentDateStrategy nextRepaymentDateStrategy,
                                 ExtendTermStrategy extendTermStrategy) {
        this.nextWorkingDayStrategy = nextWorkingDayStrategy;
        this.previousWorkingDayStrategy = previousWorkingDayStrategy;
        this.nextRepaymentDateStrategy = nextRepaymentDateStrategy;
        this.extendTermStrategy = extendTermStrategy;
    }

    /**
     * Creates a holiday handling strategy based on the repayment reschedule type.
     *
     * @param rescheduleType The repayment reschedule type
     * @return The appropriate holiday handling strategy
     */
    public HolidayStrategy createStrategy(RepaymentRescheduleType rescheduleType) {
        switch (rescheduleType) {
            case MOVE_TO_NEXT_WORKING_DAY:
                return nextWorkingDayStrategy;
            case MOVE_TO_PREVIOUS_WORKING_DAY:
                return previousWorkingDayStrategy;
            case MOVE_TO_NEXT_REPAYMENT_MEETING_DAY:
                return nextRepaymentDateStrategy;
            case SAME_DAY:
                // No adjustment needed, but we'll use next working day as a fallback
                return nextWorkingDayStrategy;
            case MOVE_TO_NEXT_MEETING_DAY:
                // Similar to next repayment date but for meetings
                return nextRepaymentDateStrategy;
            default:
                // Default to next working day
                return nextWorkingDayStrategy;
        }
    }
    
    /**
     * Creates an extend term strategy when term extension is enabled.
     *
     * @return The extend term strategy
     */
    public HolidayStrategy createExtendTermStrategy() {
        return extendTermStrategy;
    }
}