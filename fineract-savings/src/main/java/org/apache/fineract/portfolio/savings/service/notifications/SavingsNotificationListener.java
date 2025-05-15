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

import java.math.BigDecimal;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.event.business.BusinessEventListener;
import org.apache.fineract.infrastructure.event.business.domain.deposit.FixedDepositAccountBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.deposit.RecurringDepositAccountBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.SavingsAccountBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.SavingsActivateBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.SavingsApproveBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.SavingsCloseBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.SavingsCreateBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.SavingsPostInterestBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.SavingsRejectBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.transaction.SavingsAccountTransactionBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.transaction.SavingsDepositBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.savings.transaction.SavingsWithdrawalBusinessEvent;
import org.apache.fineract.portfolio.savings.data.SavingsAccountConstant;
import org.apache.fineract.portfolio.savings.domain.SavingsAccount;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransaction;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SavingsNotificationListener implements 
    BusinessEventListener<SavingsAccountBusinessEvent>,
    BusinessEventListener<SavingsAccountTransactionBusinessEvent>,
    BusinessEventListener<FixedDepositAccountBusinessEvent>,
    BusinessEventListener<RecurringDepositAccountBusinessEvent> {

    private final SavingsNotificationService savingsNotificationService;

    @Override
    public void onBusinessEvent(SavingsAccountBusinessEvent event) {
        SavingsAccount savingsAccount = event.get();
        
        if (event instanceof SavingsCreateBusinessEvent) {
            savingsNotificationService.sendSavingsAccountCreationNotification(savingsAccount);
        } else if (event instanceof SavingsApproveBusinessEvent) {
            savingsNotificationService.sendSavingsAccountApprovalNotification(savingsAccount);
        } else if (event instanceof SavingsActivateBusinessEvent) {
            savingsNotificationService.sendSavingsAccountActivationNotification(savingsAccount);
        } else if (event instanceof SavingsRejectBusinessEvent) {
            savingsNotificationService.sendSavingsAccountRejectionNotification(savingsAccount);
        } else if (event instanceof SavingsCloseBusinessEvent) {
            savingsNotificationService.sendSavingsAccountClosureNotification(savingsAccount);
        } else if (event instanceof SavingsPostInterestBusinessEvent) {
            savingsNotificationService.sendInterestPostingNotification(savingsAccount);
        }
    }

    @Override
    public void onBusinessEvent(SavingsAccountTransactionBusinessEvent event) {
        SavingsAccountTransaction transaction = event.get();
        SavingsAccount savingsAccount = transaction.getSavingsAccount();
        
        if (event instanceof SavingsDepositBusinessEvent) {
            savingsNotificationService.sendDepositNotification(savingsAccount, transaction);
        } else if (event instanceof SavingsWithdrawalBusinessEvent) {
            savingsNotificationService.sendWithdrawalNotification(savingsAccount, transaction);
        }
    }

    @Override
    public void onBusinessEvent(FixedDepositAccountBusinessEvent event) {
        SavingsAccount fixedDepositAccount = event.get();
        // Handle Fixed Deposit events
        savingsNotificationService.sendFixedDepositNotification(fixedDepositAccount, event.getType());
    }

    @Override
    public void onBusinessEvent(RecurringDepositAccountBusinessEvent event) {
        SavingsAccount recurringDepositAccount = event.get();
        // Handle Recurring Deposit events
        savingsNotificationService.sendRecurringDepositNotification(recurringDepositAccount, event.getType());
    }

    @Override
    public Set<Class<? extends SavingsAccountBusinessEvent>> getBusinessEventTypes() {
        return Set.of(
            SavingsCreateBusinessEvent.class,
            SavingsApproveBusinessEvent.class,
            SavingsActivateBusinessEvent.class,
            SavingsRejectBusinessEvent.class,
            SavingsCloseBusinessEvent.class,
            SavingsPostInterestBusinessEvent.class
        );
    }

    @Override
    public Set<Class<? extends SavingsAccountTransactionBusinessEvent>> getBusinessEventTypes() {
        return Set.of(
            SavingsDepositBusinessEvent.class,
            SavingsWithdrawalBusinessEvent.class
        );
    }

    @Override
    public Set<Class<? extends FixedDepositAccountBusinessEvent>> getBusinessEventTypes() {
        return Set.of(FixedDepositAccountBusinessEvent.class);
    }

    @Override
    public Set<Class<? extends RecurringDepositAccountBusinessEvent>> getBusinessEventTypes() {
        return Set.of(RecurringDepositAccountBusinessEvent.class);
    }
}