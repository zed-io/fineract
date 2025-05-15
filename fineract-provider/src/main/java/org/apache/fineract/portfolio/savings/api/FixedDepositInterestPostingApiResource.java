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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.apache.commons.lang3.StringUtils;
import org.apache.fineract.commands.domain.CommandWrapper;
import org.apache.fineract.commands.service.CommandWrapperBuilder;
import org.apache.fineract.commands.service.PortfolioCommandSourceWritePlatformService;
import org.apache.fineract.infrastructure.core.api.ApiRequestParameterHelper;
import org.apache.fineract.infrastructure.core.api.JsonCommand;
import org.apache.fineract.infrastructure.core.data.CommandProcessingResult;
import org.apache.fineract.infrastructure.core.serialization.ApiRequestJsonSerializationSettings;
import org.apache.fineract.infrastructure.core.serialization.DefaultToApiJsonSerializer;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.security.service.PlatformSecurityContext;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccountRepository;
import org.apache.fineract.portfolio.savings.exception.FixedDepositAccountNotFoundException;
import org.apache.fineract.portfolio.savings.service.FixedDepositAccountInterestPostingService;
import org.apache.fineract.portfolio.savings.service.FixedDepositInterestPostingIntegrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/fixeddeposits")
@Component
@Scope("singleton")
@Tag(name = "Fixed Deposit Interest", description = "API for fixed deposit interest operations")
public class FixedDepositInterestPostingApiResource {

    private final PlatformSecurityContext context;
    private final DefaultToApiJsonSerializer<FixedDepositAccountData> toApiJsonSerializer;
    private final ApiRequestParameterHelper apiRequestParameterHelper;
    private final PortfolioCommandSourceWritePlatformService commandsSourceWritePlatformService;
    private final FixedDepositInterestPostingIntegrationService integrationService;
    private final FixedDepositAccountInterestPostingService interestPostingService;
    private final FixedDepositAccountRepository fixedDepositAccountRepository;

    @Autowired
    public FixedDepositInterestPostingApiResource(
            final PlatformSecurityContext context,
            final DefaultToApiJsonSerializer<FixedDepositAccountData> toApiJsonSerializer,
            final ApiRequestParameterHelper apiRequestParameterHelper,
            final PortfolioCommandSourceWritePlatformService commandsSourceWritePlatformService,
            final FixedDepositInterestPostingIntegrationService integrationService,
            final FixedDepositAccountInterestPostingService interestPostingService,
            final FixedDepositAccountRepository fixedDepositAccountRepository) {
        this.context = context;
        this.toApiJsonSerializer = toApiJsonSerializer;
        this.apiRequestParameterHelper = apiRequestParameterHelper;
        this.commandsSourceWritePlatformService = commandsSourceWritePlatformService;
        this.integrationService = integrationService;
        this.interestPostingService = interestPostingService;
        this.fixedDepositAccountRepository = fixedDepositAccountRepository;
    }

    @PostMapping("/{accountId}/postinterest")
    @Operation(summary = "Post Interest", description = "Posts interest to a fixed deposit account")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = FixedDepositInterestPostingApiResourceSwagger.PostInterestResponse.class))),
        @ApiResponse(responseCode = "404", description = "Fixed Deposit Account not found")
    })
    public ResponseEntity<String> postInterest(
            @PathVariable("accountId") @Parameter(description = "accountId") final Long accountId,
            @RequestParam(value = "postingDate", required = false) @Parameter(description = "Posting date (optional, defaults to current date)") final String postingDateParam) {

        this.context.authenticatedUser().validateHasReadPermission("FIXEDDEPOSITACCOUNT");

        LocalDate postingDate = StringUtils.isNotBlank(postingDateParam) ? 
                LocalDate.parse(postingDateParam) : DateUtils.getBusinessLocalDate();

        try {
            // Convert to UUID for new service
            FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountId)
                .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountId));
            UUID uuid = UUID.fromString(account.getId().toString());
            
            // Post interest
            Money interestPosted = this.interestPostingService.postInterest(uuid, postingDate);
            
            // Prepare response
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("accountId", accountId);
            responseMap.put("interestPosted", interestPosted.getAmount());
            responseMap.put("postingDate", postingDate.toString());
            
            return ResponseEntity.ok(this.toApiJsonSerializer.serialize(responseMap));
        } catch (FixedDepositAccountNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error posting interest: " + e.getMessage());
        }
    }
    
    @PostMapping("/{accountId}/calculatematurity")
    @Operation(summary = "Calculate Maturity Amount", description = "Calculates the maturity amount for a fixed deposit account")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = FixedDepositInterestPostingApiResourceSwagger.MaturityResponse.class))),
        @ApiResponse(responseCode = "404", description = "Fixed Deposit Account not found")
    })
    public ResponseEntity<String> calculateMaturity(
            @PathVariable("accountId") @Parameter(description = "accountId") final Long accountId,
            @org.springframework.web.bind.annotation.RequestBody(required = false) @Parameter(description = "isPreMatureClosure") final String apiRequestBodyAsJson) {

        this.context.authenticatedUser().validateHasReadPermission("FIXEDDEPOSITACCOUNT");

        boolean isPreMatureClosure = false;
        if (StringUtils.isNotBlank(apiRequestBodyAsJson)) {
            final CommandWrapper wrapper = new CommandWrapperBuilder().withJson(apiRequestBodyAsJson).build();
            final JsonCommand command = JsonCommand.from(apiRequestBodyAsJson, wrapper.getJson(), wrapper.getJsonCommand().parsedJson(),
                    null, null, null, null, null, null, null, null, null, null, null, null, null);
            
            if (command.parameterExists("isPreMatureClosure")) {
                isPreMatureClosure = command.booleanPrimitiveValueOfParameterNamed("isPreMatureClosure");
            }
        }

        try {
            FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountId)
                .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountId));
            
            // Calculate maturity amount
            Money maturityAmount = this.integrationService.calculateMaturityAmount(account, isPreMatureClosure);
            
            // Prepare response
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("accountId", accountId);
            responseMap.put("maturityAmount", maturityAmount.getAmount());
            responseMap.put("maturityDate", account.maturityDate().toString());
            responseMap.put("isPreMatureClosure", isPreMatureClosure);
            
            return ResponseEntity.ok(this.toApiJsonSerializer.serialize(responseMap));
        } catch (FixedDepositAccountNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error calculating maturity: " + e.getMessage());
        }
    }
    
    @PostMapping("/{accountId}/processmaturity")
    @Operation(summary = "Process Maturity", description = "Processes maturity for a fixed deposit account")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = FixedDepositInterestPostingApiResourceSwagger.ProcessMaturityResponse.class))),
        @ApiResponse(responseCode = "404", description = "Fixed Deposit Account not found")
    })
    public ResponseEntity<String> processMaturity(
            @PathVariable("accountId") @Parameter(description = "accountId") final Long accountId) {

        this.context.authenticatedUser().validateHasReadPermission("FIXEDDEPOSITACCOUNT");

        try {
            FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountId)
                .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountId));
            
            // Process maturity
            boolean success = this.integrationService.processMaturity(account);
            
            // Prepare response
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("accountId", accountId);
            responseMap.put("success", success);
            
            return ResponseEntity.ok(this.toApiJsonSerializer.serialize(responseMap));
        } catch (FixedDepositAccountNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing maturity: " + e.getMessage());
        }
    }
}

/**
 * Swagger documentation class
 */
final class FixedDepositInterestPostingApiResourceSwagger {
    private FixedDepositInterestPostingApiResourceSwagger() {}
    
    @Schema(description = "PostInterestResponse")
    public static final class PostInterestResponse {
        private PostInterestResponse() {}
        
        @Schema(example = "1")
        public Long accountId;
        
        @Schema(example = "100.00")
        public BigDecimal interestPosted;
        
        @Schema(example = "2023-01-31")
        public String postingDate;
    }
    
    @Schema(description = "MaturityResponse")
    public static final class MaturityResponse {
        private MaturityResponse() {}
        
        @Schema(example = "1")
        public Long accountId;
        
        @Schema(example = "1100.00")
        public BigDecimal maturityAmount;
        
        @Schema(example = "2023-12-31")
        public String maturityDate;
        
        @Schema(example = "false")
        public boolean isPreMatureClosure;
    }
    
    @Schema(description = "ProcessMaturityResponse")
    public static final class ProcessMaturityResponse {
        private ProcessMaturityResponse() {}
        
        @Schema(example = "1")
        public Long accountId;
        
        @Schema(example = "true")
        public boolean success;
    }
}