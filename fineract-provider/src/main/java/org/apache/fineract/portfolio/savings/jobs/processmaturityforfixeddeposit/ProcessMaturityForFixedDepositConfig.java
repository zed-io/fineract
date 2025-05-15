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

import lombok.RequiredArgsConstructor;
import org.apache.fineract.infrastructure.jobs.service.JobName;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Configuration class for the fixed deposit maturity processing job.
 * This job is responsible for processing fixed deposit accounts that have reached their maturity date.
 */
@Configuration
@RequiredArgsConstructor
public class ProcessMaturityForFixedDepositConfig {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final ProcessMaturityForFixedDepositTasklet processMaturityForFixedDepositTasklet;

    /**
     * Creates the fixed deposit maturity processing job.
     * 
     * @return the configured Job
     */
    @Bean
    protected Job processMaturityForFixedDepositJob() {
        return new JobBuilder(JobName.PROCESS_MATURED_FIXED_DEPOSITS.name(), jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(processMaturityForFixedDepositStep())
                .build();
    }

    /**
     * Creates the fixed deposit maturity processing step.
     * 
     * @return the configured Step
     */
    @Bean
    protected Step processMaturityForFixedDepositStep() {
        return new StepBuilder(JobName.PROCESS_MATURED_FIXED_DEPOSITS.name(), jobRepository)
                .tasklet(processMaturityForFixedDepositTasklet, transactionManager)
                .build();
    }
}