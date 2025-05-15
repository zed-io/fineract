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
package org.apache.fineract.portfolio.savings.data;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data object representing batch job execution history.
 * This class is used to transfer job execution data between the service and API layers.
 */
@Data
@NoArgsConstructor
public class BatchJobHistoryData {

    /**
     * Unique identifier for the job execution.
     */
    private Long id;
    
    /**
     * Name of the batch job.
     */
    private String jobName;
    
    /**
     * Status of the job execution (e.g., COMPLETED, FAILED, STARTING, etc.).
     */
    private String status;
    
    /**
     * When the job execution started.
     */
    private LocalDateTime startTime;
    
    /**
     * When the job execution ended.
     */
    private LocalDateTime endTime;
    
    /**
     * Error message if the job failed.
     */
    private String errorMessage;
    
    /**
     * Number of records processed by the job.
     */
    private Integer processedCount;
    
    /**
     * Number of records successfully processed by the job.
     */
    private Integer successCount;
    
    /**
     * Number of records that failed during processing.
     */
    private Integer failCount;
    
    /**
     * Date when the job was executed.
     */
    private LocalDateTime runDate;
    
    /**
     * Constructs a new batch job history data object with the specified values.
     * 
     * @param id the job execution ID
     * @param jobName the name of the job
     * @param status the execution status
     * @param startTime when the job started
     * @param endTime when the job ended
     * @param errorMessage error message if job failed
     * @param processedCount number of records processed
     * @param successCount number of records successfully processed
     * @param failCount number of records that failed
     * @param runDate date when the job was executed
     */
    public BatchJobHistoryData(Long id, String jobName, String status, LocalDateTime startTime, LocalDateTime endTime,
            String errorMessage, Integer processedCount, Integer successCount, Integer failCount, LocalDateTime runDate) {
        this.id = id;
        this.jobName = jobName;
        this.status = status;
        this.startTime = startTime;
        this.endTime = endTime;
        this.errorMessage = errorMessage;
        this.processedCount = processedCount;
        this.successCount = successCount;
        this.failCount = failCount;
        this.runDate = runDate;
    }
}