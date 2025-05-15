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
package org.apache.fineract.portfolio.savings.jobs.accrueinterestforfixeddeposit;

import java.time.LocalDate;
import java.util.Collection;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.service.FixedDepositAccountInterestPostingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.StepContribution;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Tasklet for accruing interest on fixed deposit accounts.
 */
@Component
public class AccrueInterestForFixedDepositTasklet implements Tasklet {

    private static final Logger LOG = LoggerFactory.getLogger(AccrueInterestForFixedDepositTasklet.class);

    private final FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService;

    @Autowired
    public AccrueInterestForFixedDepositTasklet(
            final FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService) {
        this.fixedDepositAccountInterestPostingService = fixedDepositAccountInterestPostingService;
    }

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) throws Exception {
        final LocalDate businessDate = DateUtils.getBusinessLocalDate();
        
        LOG.info("Running fixed deposit interest accrual job for date: {}", businessDate);
        
        try {
            // Get all accounts due for interest posting (we'll use the same accounts for accrual)
            final Collection<FixedDepositAccountData> accounts = 
                    this.fixedDepositAccountInterestPostingService.getAccountsDueForInterestPosting(businessDate);
            
            LOG.info("Found {} fixed deposit accounts for interest accrual", accounts.size());
            
            // Accrue interest for eligible accounts
            int successCount = this.fixedDepositAccountInterestPostingService.accrueInterestForAccounts(accounts, businessDate);
            
            LOG.info("Successfully accrued interest for {} fixed deposit accounts", successCount);
            
            return RepeatStatus.FINISHED;
            
        } catch (Exception e) {
            LOG.error("Error accruing interest for fixed deposit accounts", e);
            throw e;
        }
    }
}