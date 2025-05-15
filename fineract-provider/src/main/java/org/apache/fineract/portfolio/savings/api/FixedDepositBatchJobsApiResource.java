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
package org.apache.fineract.portfolio.savings.api;

import java.util.Collection;
import lombok.RequiredArgsConstructor;
import org.apache.fineract.infrastructure.core.data.CommandProcessingResult;
import org.apache.fineract.infrastructure.core.serialization.DefaultToApiJsonSerializer;
import org.apache.fineract.infrastructure.jobs.data.JobDetailDataValidator;
import org.apache.fineract.infrastructure.jobs.service.JobExecuterService;
import org.apache.fineract.infrastructure.jobs.service.JobName;
import org.apache.fineract.infrastructure.security.service.PlatformSecurityContext;
import org.apache.fineract.portfolio.savings.data.BatchJobHistoryData;
import org.apache.fineract.portfolio.savings.service.FixedDepositBatchJobsService;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

/**
 * REST API controller for managing fixed deposit batch jobs.
 * This controller provides endpoints to manually trigger batch jobs 
 * and view job execution history.
 */
@Path("/v1/fixeddeposit/batchjobs")
@Component
@Scope("singleton")
@Tag(name = "Fixed Deposit Batch Jobs", description = "Endpoints for managing fixed deposit batch operations")
@RequiredArgsConstructor
public class FixedDepositBatchJobsApiResource {

    private final PlatformSecurityContext context;
    private final JobExecuterService jobExecuterService;
    private final FixedDepositBatchJobsService fixedDepositBatchJobsService;
    private final DefaultToApiJsonSerializer<BatchJobHistoryData> toApiJsonSerializer;
    private final JobDetailDataValidator dataValidator;

    @POST
    @Path("executeAccrueInterestJob")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    @Operation(summary = "Execute accrue interest job for fixed deposits", description = "Manually triggers the job to accrue interest for fixed deposit accounts.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = CommandProcessingResult.class))) })
    public String executeAccrueInterestJob() {
        // Check permissions
        this.context.authenticatedUser().validateHasReadPermission(SavingsApiConstants.FIXED_DEPOSIT_ACCOUNT_RESOURCE_NAME);
        
        // Trigger the job execution
        CommandProcessingResult result = this.jobExecuterService.executeJobWithParameters(
                JobName.ACCRUE_INTEREST_FOR_FIXED_DEPOSIT.name(), null);
        
        return this.toApiJsonSerializer.serialize(result);
    }

    @POST
    @Path("executePostInterestJob")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    @Operation(summary = "Execute post interest job for fixed deposits", description = "Manually triggers the job to post interest for fixed deposit accounts.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = CommandProcessingResult.class))) })
    public String executePostInterestJob() {
        // Check permissions
        this.context.authenticatedUser().validateHasReadPermission(SavingsApiConstants.FIXED_DEPOSIT_ACCOUNT_RESOURCE_NAME);
        
        // Trigger the job execution
        CommandProcessingResult result = this.jobExecuterService.executeJobWithParameters(
                JobName.POST_INTEREST_FOR_FIXED_DEPOSIT.name(), null);
        
        return this.toApiJsonSerializer.serialize(result);
    }

    @POST
    @Path("executeProcessMaturityJob")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    @Operation(summary = "Execute process maturity job for fixed deposits", description = "Manually triggers the job to process matured fixed deposit accounts.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = CommandProcessingResult.class))) })
    public String executeProcessMaturityJob() {
        // Check permissions
        this.context.authenticatedUser().validateHasReadPermission(SavingsApiConstants.FIXED_DEPOSIT_ACCOUNT_RESOURCE_NAME);
        
        // Trigger the job execution
        CommandProcessingResult result = this.jobExecuterService.executeJobWithParameters(
                JobName.PROCESS_MATURED_FIXED_DEPOSITS.name(), null);
        
        return this.toApiJsonSerializer.serialize(result);
    }

    @POST
    @Path("executePreMaturityNotificationJob")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    @Operation(summary = "Execute pre-maturity notification job for fixed deposits", description = "Manually triggers the job to send pre-maturity notifications for fixed deposit accounts.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = CommandProcessingResult.class))) })
    public String executePreMaturityNotificationJob() {
        // Check permissions
        this.context.authenticatedUser().validateHasReadPermission(SavingsApiConstants.FIXED_DEPOSIT_ACCOUNT_RESOURCE_NAME);
        
        // Trigger the job execution
        CommandProcessingResult result = this.jobExecuterService.executeJobWithParameters(
                JobName.FIXED_DEPOSIT_PRE_MATURITY_NOTIFICATION.name(), null);
        
        return this.toApiJsonSerializer.serialize(result);
    }

    @GET
    @Path("history")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    @Operation(summary = "Retrieve job execution history", description = "Returns the execution history of fixed deposit batch jobs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = BatchJobHistoryData.class))) })
    public String retrieveJobHistory() {
        // Check permissions
        this.context.authenticatedUser().validateHasReadPermission(SavingsApiConstants.FIXED_DEPOSIT_ACCOUNT_RESOURCE_NAME);
        
        // Get job history
        Collection<BatchJobHistoryData> jobHistory = this.fixedDepositBatchJobsService.retrieveJobHistory();
        
        return this.toApiJsonSerializer.serialize(jobHistory);
    }
}