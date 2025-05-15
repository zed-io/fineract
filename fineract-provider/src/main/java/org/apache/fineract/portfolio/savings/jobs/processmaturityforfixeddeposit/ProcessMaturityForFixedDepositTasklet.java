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
package org.apache.fineract.portfolio.savings.jobs.processmaturityforfixeddeposit;

import java.time.LocalDate;
import java.util.Collection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.service.FixedDepositAccountInterestPostingService;
import org.springframework.batch.core.StepContribution;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.stereotype.Component;

/**
 * Tasklet for processing matured fixed deposit accounts.
 * This job identifies fixed deposit accounts that have reached their maturity date
 * and processes them according to their maturity instructions (either automatic renewal,
 * transfer to linked account, or transition to matured state waiting for further instructions).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProcessMaturityForFixedDepositTasklet implements Tasklet {

    private final FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService;

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) throws Exception {
        final LocalDate businessDate = DateUtils.getBusinessLocalDate();
        
        log.info("Running fixed deposit maturity processing job for date: {}", businessDate);
        
        try {
            // Get all accounts due for maturity
            final Collection<FixedDepositAccountData> accounts = 
                    this.fixedDepositAccountInterestPostingService.getAccountsDueForMaturityProcessing(businessDate);
            
            log.info("Found {} fixed deposit accounts due for maturity processing", accounts.size());
            
            // Process matured accounts
            int processedCount = this.fixedDepositAccountInterestPostingService.processMaturedAccounts(businessDate);
            
            log.info("Successfully processed {} matured fixed deposit accounts", processedCount);
            
            return RepeatStatus.FINISHED;
            
        } catch (Exception e) {
            log.error("Error processing matured fixed deposit accounts", e);
            throw e;
        }
    }
}