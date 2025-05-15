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
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.jobs.annotation.CronTarget;
import org.apache.fineract.infrastructure.jobs.service.JobName;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

/**
 * Job for posting interest to fixed deposit accounts.
 * 
 * This job is scheduled to run on a regular basis (e.g., daily) and handles:
 * 1. Posting interest to matured accounts
 * 2. Processing maturity actions for accounts that have reached maturity
 */
@Component
@Scope("prototype")
public class FixedDepositInterestPostingJob {

    private static final Logger LOG = LoggerFactory.getLogger(FixedDepositInterestPostingJob.class);
    
    private final FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService;
    
    @Autowired
    public FixedDepositInterestPostingJob(final FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService) {
        this.fixedDepositAccountInterestPostingService = fixedDepositAccountInterestPostingService;
    }
    
    /**
     * Executes the job to post interest for fixed deposit accounts that require it.
     * 
     * This job identifies fixed deposit accounts that are due for interest posting
     * (typically those that have matured) and posts interest to them.
     */
    @CronTarget(jobName = JobName.POST_FIXED_DEPOSIT_INTEREST)
    public void postInterestToFixedDepositAccounts() {
        final LocalDate businessDate = DateUtils.getBusinessLocalDate();
        
        LOG.info("Starting Fixed Deposit Interest Posting Job for date: {}", businessDate);
        
        try {
            // Find accounts due for interest posting
            Collection<FixedDepositAccountData> accountsForPosting = this.fixedDepositAccountInterestPostingService
                    .getAccountsDueForInterestPosting(businessDate);
            
            if (accountsForPosting != null && !accountsForPosting.isEmpty()) {
                LOG.info("Found {} fixed deposit accounts due for interest posting", accountsForPosting.size());
                
                // Post interest to accounts
                int successCount = this.fixedDepositAccountInterestPostingService.postInterestForAccounts(accountsForPosting, businessDate);
                
                LOG.info("Successfully posted interest to {} fixed deposit accounts", successCount);
            } else {
                LOG.info("No fixed deposit accounts found due for interest posting");
            }
            
        } catch (Exception e) {
            LOG.error("Error occurred during fixed deposit interest posting job", e);
        }
        
        LOG.info("Completed Fixed Deposit Interest Posting Job");
    }
    
    /**
     * Executes the job to process maturity for fixed deposit accounts.
     * 
     * This job identifies fixed deposit accounts that have reached maturity 
     * and processes them according to their maturity instructions.
     */
    @CronTarget(jobName = JobName.PROCESS_FIXED_DEPOSIT_MATURITY)
    public void processFixedDepositMaturity() {
        final LocalDate businessDate = DateUtils.getBusinessLocalDate();
        
        LOG.info("Starting Fixed Deposit Maturity Processing Job for date: {}", businessDate);
        
        try {
            // Process accounts that have reached maturity
            int successCount = this.fixedDepositAccountInterestPostingService.processMaturedAccounts(businessDate);
            
            LOG.info("Successfully processed maturity for {} fixed deposit accounts", successCount);
            
        } catch (Exception e) {
            LOG.error("Error occurred during fixed deposit maturity processing job", e);
        }
        
        LOG.info("Completed Fixed Deposit Maturity Processing Job");
    }
}