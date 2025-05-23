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

import java.time.LocalDate;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.core.service.ThreadLocalContextUtil;
import org.apache.fineract.portfolio.savings.domain.SavingsAccount;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountRepositoryWrapper;
import org.apache.fineract.portfolio.savings.service.notifications.config.SavingsNotificationConfigService;
import org.springframework.batch.core.StepContribution;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.stereotype.Component;

/**
 * Task that sends dormancy-related notifications for savings accounts
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SavingsDormancyNotificationTask implements Tasklet {

    private final SavingsAccountRepositoryWrapper savingsAccountRepository;
    private final SavingsNotificationService notificationService;
    private final SavingsNotificationConfigService configService;

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) throws Exception {
        int daysToInactivity = configService.getDaysToInactivity();
        
        // Process accounts that will become dormant soon
        processAccountsNearingDormancy(daysToInactivity);
        
        // Process accounts becoming dormant today
        processAccountsBecomingDormant(daysToInactivity);
        
        return RepeatStatus.FINISHED;
    }
    
    /**
     * Sends warnings for accounts that are approaching dormancy
     */
    private void processAccountsNearingDormancy(int daysToInactivity) {
        final int warningDays = 14; // Send warning 14 days before dormancy
        
        LocalDate businessDate = DateUtils.getBusinessLocalDate();
        LocalDate cutoffDate = businessDate.minusDays(daysToInactivity - warningDays);
        
        try {
            List<SavingsAccount> accounts = savingsAccountRepository.findActiveAccountsWithLastActivityBeforeDate(cutoffDate);
            
            log.info("Found {} savings accounts nearing dormancy", accounts.size());
            
            for (SavingsAccount account : accounts) {
                try {
                    notificationService.sendDormancyNotification(account, false);
                } catch (Exception e) {
                    log.error("Error sending dormancy warning for account {}: {}", account.getId(), e.getMessage(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error processing accounts nearing dormancy: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Marks accounts as dormant and sends notifications
     */
    private void processAccountsBecomingDormant(int daysToInactivity) {
        LocalDate businessDate = DateUtils.getBusinessLocalDate();
        LocalDate dormancyDate = businessDate.minusDays(daysToInactivity);
        
        try {
            List<SavingsAccount> accounts = savingsAccountRepository.findActiveAccountsWithLastActivityBeforeDate(dormancyDate);
            
            log.info("Found {} savings accounts to mark as dormant", accounts.size());
            
            for (SavingsAccount account : accounts) {
                try {
                    // Mark the account as dormant
                    account.setDormancyStatus(true);
                    savingsAccountRepository.save(account);
                    
                    // Send notification
                    notificationService.sendDormancyNotification(account, true);
                } catch (Exception e) {
                    log.error("Error marking account {} as dormant: {}", account.getId(), e.getMessage(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error processing accounts becoming dormant: {}", e.getMessage(), e);
        }
    }
}