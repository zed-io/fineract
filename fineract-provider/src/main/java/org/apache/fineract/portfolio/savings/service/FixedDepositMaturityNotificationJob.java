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
package org.apache.fineract.portfolio.savings.service;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.apache.fineract.infrastructure.configuration.domain.ConfigurationDomainService;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.jobs.annotation.CronTarget;
import org.apache.fineract.infrastructure.jobs.service.JobName;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccountRepository;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationEvent;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

/**
 * Job for sending notifications for upcoming fixed deposit maturities.
 * 
 * This job is scheduled to run regularly (e.g., daily) and sends notifications to clients
 * with fixed deposit accounts that are approaching maturity within a configured period.
 */
@Component
@Scope("prototype")
public class FixedDepositMaturityNotificationJob {

    private static final Logger LOG = LoggerFactory.getLogger(FixedDepositMaturityNotificationJob.class);
    
    // Default advance notification days if not configured
    private static final int DEFAULT_NOTIFICATION_DAYS_IN_ADVANCE = 7;
    
    private final FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService;
    private final FixedDepositAccountRepository fixedDepositAccountRepository;
    private final FixedDepositAccountReadPlatformService fixedDepositAccountReadPlatformService;
    private final SavingsNotificationService savingsNotificationService;
    private final ConfigurationDomainService configurationDomainService;
    
    @Autowired
    public FixedDepositMaturityNotificationJob(
            final FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService,
            final FixedDepositAccountRepository fixedDepositAccountRepository,
            final FixedDepositAccountReadPlatformService fixedDepositAccountReadPlatformService,
            final SavingsNotificationService savingsNotificationService,
            final ConfigurationDomainService configurationDomainService) {
        this.fixedDepositAccountInterestPostingService = fixedDepositAccountInterestPostingService;
        this.fixedDepositAccountRepository = fixedDepositAccountRepository;
        this.fixedDepositAccountReadPlatformService = fixedDepositAccountReadPlatformService;
        this.savingsNotificationService = savingsNotificationService;
        this.configurationDomainService = configurationDomainService;
    }
    
    /**
     * Executes the job to send maturity notifications for fixed deposit accounts.
     * 
     * This job sends notifications to clients with fixed deposit accounts that are
     * approaching maturity within a configured number of days.
     */
    @CronTarget(jobName = JobName.SEND_FIXED_DEPOSIT_MATURITY_NOTIFICATIONS)
    public void sendFixedDepositMaturityNotifications() {
        final LocalDate businessDate = DateUtils.getBusinessLocalDate();
        
        LOG.info("Starting Fixed Deposit Maturity Notification Job for business date: {}", businessDate);
        
        try {
            // Get the number of days in advance to send notifications
            int daysInAdvance = getDaysInAdvanceForNotification();
            
            // Calculate the date for which to send notifications (e.g., accounts maturing in 7 days)
            LocalDate targetMaturityDate = businessDate.plusDays(daysInAdvance);
            
            LOG.info("Sending notifications for fixed deposits maturing on: {}", targetMaturityDate);
            
            // Find accounts due to mature on the target date
            Collection<FixedDepositAccountData> accountsApproachingMaturity = 
                    this.fixedDepositAccountReadPlatformService.retrieveAccountsApproachingMaturity(targetMaturityDate);
            
            if (accountsApproachingMaturity != null && !accountsApproachingMaturity.isEmpty()) {
                LOG.info("Found {} fixed deposit accounts approaching maturity", accountsApproachingMaturity.size());
                
                // Send notifications for each account
                int successCount = sendMaturityNotifications(accountsApproachingMaturity, daysInAdvance);
                
                LOG.info("Successfully sent notifications for {} fixed deposit accounts", successCount);
            } else {
                LOG.info("No fixed deposit accounts found approaching maturity on {}", targetMaturityDate);
            }
            
        } catch (Exception e) {
            LOG.error("Error occurred during fixed deposit maturity notification job", e);
        }
        
        LOG.info("Completed Fixed Deposit Maturity Notification Job");
    }
    
    /**
     * Gets the configured number of days in advance to send maturity notifications.
     * 
     * @return The number of days in advance to send notifications
     */
    private int getDaysInAdvanceForNotification() {
        // This could be a global configuration setting
        // For now, returning a default value
        return DEFAULT_NOTIFICATION_DAYS_IN_ADVANCE;
    }
    
    /**
     * Sends maturity notifications for the specified accounts.
     * 
     * @param accounts The accounts approaching maturity
     * @param daysInAdvance The number of days before maturity
     * @return The number of notifications successfully sent
     */
    private int sendMaturityNotifications(Collection<FixedDepositAccountData> accounts, int daysInAdvance) {
        int successCount = 0;
        
        for (FixedDepositAccountData accountData : accounts) {
            try {
                if (accountData.getId() != null) {
                    // Get the full account entity
                    FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountData.getId().toString())
                            .orElse(null);
                    
                    if (account != null && account.isActive()) {
                        // Set up notification data
                        Map<String, Object> notificationData = new HashMap<>();
                        notificationData.put("daysToMaturity", daysInAdvance);
                        notificationData.put("maturityDate", account.maturityDate());
                        notificationData.put("maturityAmount", account.maturityAmount());
                        
                        // Send the notification
                        this.savingsNotificationService.notifyAccountOwnerOfMaturityPending(
                                account, 
                                notificationData, 
                                SavingsNotificationEvent.DEPOSIT_APPROACHING_MATURITY);
                        
                        successCount++;
                    }
                }
            } catch (Exception e) {
                LOG.error("Error sending maturity notification for account {}: {}", accountData.getAccountNo(), e.getMessage());
                // Continue with the next account even if there's an error
            }
        }
        
        return successCount;
    }
}