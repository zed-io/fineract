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
package org.apache.fineract.portfolio.savings.jobs.prematuritynotificationforfixeddeposit;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.core.service.ThreadLocalContextUtil;
import org.apache.fineract.infrastructure.event.business.domain.BulkBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.BusinessEvent;
import org.apache.fineract.infrastructure.event.business.service.BusinessEventNotifierService;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccountRepository;
import org.apache.fineract.portfolio.savings.domain.SavingsAccount;
import org.apache.fineract.portfolio.savings.event.FixedDepositPreMaturityNotificationBusinessEvent;
import org.springframework.batch.core.StepContribution;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.stereotype.Component;

/**
 * Tasklet for sending pre-maturity notifications for fixed deposit accounts.
 * This job identifies fixed deposit accounts that are approaching their maturity date 
 * within a configurable notification period and sends appropriate notifications.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PreMaturityNotificationForFixedDepositTasklet implements Tasklet {

    // Default notification days before maturity (can be made configurable)
    private static final int[] NOTIFICATION_DAYS = {30, 15, 7, 1};
    
    private final FixedDepositAccountRepository fixedDepositAccountRepository;
    private final BusinessEventNotifierService businessEventNotifierService;

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) throws Exception {
        final LocalDate businessDate = DateUtils.getBusinessLocalDate();
        
        log.info("Running fixed deposit pre-maturity notification job for date: {}", businessDate);
        
        try {
            Map<Integer, Collection<FixedDepositAccount>> notificationMap = new HashMap<>();
            
            // Find accounts approaching maturity at different notification periods
            for (int daysBeforeMaturity : NOTIFICATION_DAYS) {
                LocalDate futureMaturityDate = businessDate.plusDays(daysBeforeMaturity);
                Collection<FixedDepositAccount> accounts = fixedDepositAccountRepository.findByMaturityDateAndStatus(
                        futureMaturityDate, SavingsAccount.Status.ACTIVE.getValue());
                
                if (!accounts.isEmpty()) {
                    notificationMap.put(daysBeforeMaturity, accounts);
                    log.info("Found {} fixed deposit accounts maturing in {} days", accounts.size(), daysBeforeMaturity);
                }
            }
            
            // Send notifications for all periods
            int totalNotificationsSent = 0;
            for (Map.Entry<Integer, Collection<FixedDepositAccount>> entry : notificationMap.entrySet()) {
                int daysRemaining = entry.getKey();
                Collection<FixedDepositAccount> accounts = entry.getValue();
                
                for (FixedDepositAccount account : accounts) {
                    try {
                        // Create and publish event for this account's pre-maturity notification
                        businessEventNotifierService.notifyPostBusinessEvent(
                                new FixedDepositPreMaturityNotificationBusinessEvent(account, daysRemaining));
                        totalNotificationsSent++;
                    } catch (Exception e) {
                        log.error("Failed to send pre-maturity notification for account {}: {}", 
                                account.getAccountNumber(), e.getMessage());
                    }
                }
            }
            
            log.info("Successfully sent {} pre-maturity notifications for fixed deposit accounts", totalNotificationsSent);
            
            return RepeatStatus.FINISHED;
            
        } catch (Exception e) {
            log.error("Error processing fixed deposit pre-maturity notifications", e);
            throw e;
        }
    }
}