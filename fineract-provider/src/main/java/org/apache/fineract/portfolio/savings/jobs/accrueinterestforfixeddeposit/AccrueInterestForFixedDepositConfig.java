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

import org.apache.fineract.infrastructure.jobs.service.JobName;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Configuration class for the fixed deposit interest accrual job.
 * This job is responsible for accruing interest on fixed deposit accounts.
 */
@Configuration
public class AccrueInterestForFixedDepositConfig {

    @Autowired
    private JobRepository jobRepository;
    
    @Autowired
    private PlatformTransactionManager transactionManager;
    
    @Autowired
    private AccrueInterestForFixedDepositTasklet accrueInterestForFixedDepositTasklet;

    /**
     * Creates the fixed deposit interest accrual job.
     * 
     * @return the configured Job
     */
    @Bean
    protected Job accrueInterestForFixedDepositJob() {
        return new JobBuilder(JobName.ACCRUE_INTEREST_FOR_FIXED_DEPOSIT.name(), jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(accrueInterestForFixedDepositStep())
                .build();
    }

    /**
     * Creates the fixed deposit interest accrual step.
     * 
     * @return the configured Step
     */
    @Bean
    protected Step accrueInterestForFixedDepositStep() {
        return new StepBuilder(JobName.ACCRUE_INTEREST_FOR_FIXED_DEPOSIT.name(), jobRepository)
                .tasklet(accrueInterestForFixedDepositTasklet, transactionManager)
                .build();
    }
}