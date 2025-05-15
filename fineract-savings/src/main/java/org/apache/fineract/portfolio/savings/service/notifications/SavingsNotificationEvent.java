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
package org.apache.fineract.portfolio.savings.service.notifications;

/**
 * Enumerates all possible savings account notification events
 */
public enum SavingsNotificationEvent {
    // Savings account lifecycle events
    ACCOUNT_CREATED("savings.account.created"),
    ACCOUNT_APPROVED("savings.account.approved"),
    ACCOUNT_ACTIVATED("savings.account.activated"),
    ACCOUNT_REJECTED("savings.account.rejected"),
    ACCOUNT_CLOSED("savings.account.closed"),
    
    // Transaction events
    DEPOSIT("savings.deposit"),
    WITHDRAWAL("savings.withdrawal"),
    INTEREST_POSTING("savings.interest.posting"),
    
    // Alert events
    LOW_BALANCE_ALERT("savings.low.balance.alert"),
    DORMANCY_WARNING("savings.dormancy.warning"),
    ACCOUNT_DORMANT("savings.account.dormant"),
    ACCOUNT_REACTIVATED("savings.account.reactivated"),
    
    // Hold events
    ACCOUNT_HOLD_PLACED("savings.hold.placed"),
    ACCOUNT_HOLD_RELEASED("savings.hold.released"),
    
    // Statement events
    STATEMENT_GENERATED("savings.statement.generated"),
    
    // Fixed deposit specific events
    FD_ACCOUNT_CREATED("fixed.deposit.account.created"),
    FD_ACCOUNT_ACTIVATED("fixed.deposit.account.activated"),
    FD_ACCOUNT_CLOSED("fixed.deposit.account.closed"),
    FD_ACCOUNT_MATURED("fixed.deposit.account.matured"),
    FD_ACCOUNT_PREMATURELY_CLOSED("fixed.deposit.account.prematurely.closed"),
    
    // Recurring deposit specific events
    RD_ACCOUNT_CREATED("recurring.deposit.account.created"),
    RD_ACCOUNT_ACTIVATED("recurring.deposit.account.activated"),
    RD_ACCOUNT_CLOSED("recurring.deposit.account.closed"),
    RD_ACCOUNT_MATURED("recurring.deposit.account.matured"),
    RD_ACCOUNT_PREMATURELY_CLOSED("recurring.deposit.account.prematurely.closed"),
    RD_INSTALLMENT_MISSED("recurring.deposit.installment.missed");
    
    private final String eventCode;
    
    SavingsNotificationEvent(String eventCode) {
        this.eventCode = eventCode;
    }
    
    public String getEventCode() {
        return eventCode;
    }
    
    /**
     * Gets a SavingsNotificationEvent by its event code
     * 
     * @param eventCode The event code to search for
     * @return The corresponding SavingsNotificationEvent, or null if not found
     */
    public static SavingsNotificationEvent fromEventCode(String eventCode) {
        for (SavingsNotificationEvent event : values()) {
            if (event.getEventCode().equals(eventCode)) {
                return event;
            }
        }
        return null;
    }
}