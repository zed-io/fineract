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
package org.apache.fineract.portfolio.savings.event;

import org.apache.fineract.infrastructure.event.business.domain.AbstractBusinessEvent;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;

/**
 * Business event fired when a fixed deposit account is approaching maturity.
 * This event is used to trigger notifications to clients or staff.
 */
public class FixedDepositPreMaturityNotificationBusinessEvent extends AbstractBusinessEvent<FixedDepositAccountPreMaturityNotificationData> {
    
    private static final String TYPE = "FixedDepositPreMaturityNotificationBusinessEvent";

    /**
     * Create a new instance of the event.
     * 
     * @param account the fixed deposit account
     * @param daysToMaturity the number of days remaining until maturity
     */
    public FixedDepositPreMaturityNotificationBusinessEvent(FixedDepositAccount account, int daysToMaturity) {
        super(new FixedDepositAccountPreMaturityNotificationData(account, daysToMaturity));
    }

    @Override
    public String getType() {
        return TYPE;
    }
    
    /**
     * Data class containing information about the fixed deposit account approaching maturity.
     */
    public static class FixedDepositAccountPreMaturityNotificationData {
        private final FixedDepositAccount account;
        private final int daysToMaturity;
        
        public FixedDepositAccountPreMaturityNotificationData(FixedDepositAccount account, int daysToMaturity) {
            this.account = account;
            this.daysToMaturity = daysToMaturity;
        }
        
        public FixedDepositAccount getAccount() {
            return account;
        }
        
        public int getDaysToMaturity() {
            return daysToMaturity;
        }
    }
}