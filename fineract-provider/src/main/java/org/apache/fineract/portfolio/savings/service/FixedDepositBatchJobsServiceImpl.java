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

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.database.DatabaseSpecificSQLGenerator;
import org.apache.fineract.infrastructure.jobs.service.JobName;
import org.apache.fineract.portfolio.savings.data.BatchJobHistoryData;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

/**
 * Implementation of the fixed deposit batch jobs service.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FixedDepositBatchJobsServiceImpl implements FixedDepositBatchJobsService {

    private final JdbcTemplate jdbcTemplate;
    private final DatabaseSpecificSQLGenerator sqlGenerator;
    
    // List of fixed deposit job names
    private static final List<String> FIXED_DEPOSIT_JOB_NAMES = Arrays.asList(
            JobName.ACCRUE_INTEREST_FOR_FIXED_DEPOSIT.name(),
            JobName.POST_INTEREST_FOR_FIXED_DEPOSIT.name(),
            JobName.PROCESS_MATURED_FIXED_DEPOSITS.name(),
            JobName.FIXED_DEPOSIT_PRE_MATURITY_NOTIFICATION.name()
    );

    /**
     * Batch job history row mapper class to convert database rows to BatchJobHistoryData objects.
     */
    private static final class BatchJobHistoryMapper implements RowMapper<BatchJobHistoryData> {
        @Override
        public BatchJobHistoryData mapRow(final ResultSet rs, @SuppressWarnings("unused") final int rowNum) throws SQLException {
            final Long id = rs.getLong("id");
            final String jobName = rs.getString("job_name");
            final String status = rs.getString("status");
            final LocalDateTime startTime = rs.getTimestamp("start_time") != null ? 
                    rs.getTimestamp("start_time").toLocalDateTime() : null;
            final LocalDateTime endTime = rs.getTimestamp("end_time") != null ? 
                    rs.getTimestamp("end_time").toLocalDateTime() : null;
            final String errorMessage = rs.getString("error_message");
            final Integer processedCount = rs.getInt("processed_count");
            final Integer successCount = rs.getInt("success_count");
            final Integer failCount = rs.getInt("fail_count");
            final LocalDateTime runDate = rs.getTimestamp("run_date") != null ? 
                    rs.getTimestamp("run_date").toLocalDateTime() : null;
            
            return new BatchJobHistoryData(id, jobName, status, startTime, endTime, 
                    errorMessage, processedCount, successCount, failCount, runDate);
        }
    }

    @Override
    public Collection<BatchJobHistoryData> retrieveJobHistory() {
        try {
            final StringBuilder sqlBuilder = new StringBuilder(200);
            sqlBuilder.append("SELECT ");
            sqlBuilder.append("bjh.id, ");
            sqlBuilder.append("bjh.job_name, ");
            sqlBuilder.append("bjh.status, ");
            sqlBuilder.append("bjh.start_time, ");
            sqlBuilder.append("bjh.end_time, ");
            sqlBuilder.append("bjh.error_message, ");
            sqlBuilder.append("bjh.processed_count, ");
            sqlBuilder.append("bjh.success_count, ");
            sqlBuilder.append("bjh.fail_count, ");
            sqlBuilder.append("bjh.run_date ");
            sqlBuilder.append("FROM batch_job_history bjh ");
            sqlBuilder.append("WHERE bjh.job_name IN (");
            
            // Add parameters for job names
            List<Object> params = new ArrayList<>();
            for (int i = 0; i < FIXED_DEPOSIT_JOB_NAMES.size(); i++) {
                sqlBuilder.append("?");
                if (i < FIXED_DEPOSIT_JOB_NAMES.size() - 1) {
                    sqlBuilder.append(", ");
                }
                params.add(FIXED_DEPOSIT_JOB_NAMES.get(i));
            }
            
            sqlBuilder.append(") ");
            sqlBuilder.append("ORDER BY bjh.run_date DESC ");
            sqlBuilder.append("LIMIT 100"); // Limit to the most recent 100 executions
            
            return this.jdbcTemplate.query(sqlBuilder.toString(), new BatchJobHistoryMapper(), params.toArray());
        } catch (Exception e) {
            log.error("Error retrieving batch job history", e);
            return new ArrayList<>();
        }
    }

    @Override
    public Collection<BatchJobHistoryData> retrieveJobHistoryByName(String jobName) {
        // Verify the job name is a fixed deposit job
        if (!FIXED_DEPOSIT_JOB_NAMES.contains(jobName)) {
            return new ArrayList<>();
        }
        
        try {
            final StringBuilder sqlBuilder = new StringBuilder(200);
            sqlBuilder.append("SELECT ");
            sqlBuilder.append("bjh.id, ");
            sqlBuilder.append("bjh.job_name, ");
            sqlBuilder.append("bjh.status, ");
            sqlBuilder.append("bjh.start_time, ");
            sqlBuilder.append("bjh.end_time, ");
            sqlBuilder.append("bjh.error_message, ");
            sqlBuilder.append("bjh.processed_count, ");
            sqlBuilder.append("bjh.success_count, ");
            sqlBuilder.append("bjh.fail_count, ");
            sqlBuilder.append("bjh.run_date ");
            sqlBuilder.append("FROM batch_job_history bjh ");
            sqlBuilder.append("WHERE bjh.job_name = ? ");
            sqlBuilder.append("ORDER BY bjh.run_date DESC ");
            sqlBuilder.append("LIMIT 50"); // Limit to the most recent 50 executions
            
            return this.jdbcTemplate.query(sqlBuilder.toString(), new BatchJobHistoryMapper(), jobName);
        } catch (Exception e) {
            log.error("Error retrieving batch job history for job: {}", jobName, e);
            return new ArrayList<>();
        }
    }
}