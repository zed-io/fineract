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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;
import lombok.RequiredArgsConstructor;
import org.apache.fineract.commands.domain.CommandWrapper;
import org.apache.fineract.commands.service.CommandWrapperBuilder;
import org.apache.fineract.commands.service.PortfolioCommandSourceWritePlatformService;
import org.apache.fineract.infrastructure.core.api.ApiRequestParameterHelper;
import org.apache.fineract.infrastructure.core.data.CommandProcessingResult;
import org.apache.fineract.infrastructure.core.serialization.ApiRequestJsonSerializationSettings;
import org.apache.fineract.infrastructure.core.serialization.DefaultToApiJsonSerializer;
import org.apache.fineract.infrastructure.security.service.PlatformSecurityContext;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationEvent;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationTemplateService;
import org.apache.fineract.portfolio.savings.service.notifications.config.SavingsNotificationConfigService;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

/**
 * REST API resource for managing savings notifications
 */
@Path("/savingsnotifications")
@Component
@Scope("singleton")
@RequiredArgsConstructor
public class SavingsNotificationsApiResource {

    private final PlatformSecurityContext context;
    private final SavingsNotificationConfigService configService;
    private final SavingsNotificationTemplateService templateService;
    private final ApiRequestParameterHelper apiRequestParameterHelper;
    private final DefaultToApiJsonSerializer<Map<String, Object>> toApiJsonSerializer;
    private final PortfolioCommandSourceWritePlatformService commandsSourceWritePlatformService;

    /**
     * Gets all notification configurations
     */
    @GET
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String retrieveAll(@Context final UriInfo uriInfo) {
        context.authenticatedUser().validateHasReadPermission("SAVINGSNOTIFICATION");
        
        final ApiRequestJsonSerializationSettings settings = apiRequestParameterHelper.process(uriInfo.getQueryParameters());
        
        Map<String, Object> response = new HashMap<>();
        
        // Get configurations for all events
        List<Map<String, Object>> eventConfigs = new ArrayList<>();
        for (SavingsNotificationEvent event : SavingsNotificationEvent.values()) {
            Map<String, Object> eventConfig = new HashMap<>();
            eventConfig.put("eventCode", event.getEventCode());
            eventConfig.put("enabled", configService.isEnabledForEvent(event));
            eventConfigs.add(eventConfig);
        }
        response.put("events", eventConfigs);
        
        // Get threshold configurations
        Map<String, Object> thresholds = new HashMap<>();
        thresholds.put("depositThreshold", configService.getDepositThreshold());
        thresholds.put("withdrawalThreshold", configService.getWithdrawalThreshold());
        thresholds.put("daysToInactivity", configService.getDaysToInactivity());
        response.put("thresholds", thresholds);
        
        // Get deposit account settings
        response.put("depositAccountsEnabled", configService.isEnabledForDepositAccounts());
        
        return toApiJsonSerializer.serialize(settings, response);
    }

    /**
     * Gets the template for a specific notification event
     */
    @GET
    @Path("template/{eventCode}")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String retrieveTemplate(@PathParam("eventCode") final String eventCode, @Context final UriInfo uriInfo) {
        context.authenticatedUser().validateHasReadPermission("SAVINGSNOTIFICATION");
        
        final ApiRequestJsonSerializationSettings settings = apiRequestParameterHelper.process(uriInfo.getQueryParameters());
        
        SavingsNotificationEvent event = SavingsNotificationEvent.fromEventCode(eventCode);
        if (event == null) {
            throw new IllegalArgumentException("Invalid event code: " + eventCode);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("eventCode", event.getEventCode());
        response.put("template", templateService.getDefaultTemplate(event));
        
        return toApiJsonSerializer.serialize(settings, response);
    }

    /**
     * Updates the configuration for a specific notification event
     */
    @PUT
    @Path("event/{eventCode}")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String updateEventConfiguration(@PathParam("eventCode") final String eventCode, final String apiRequestBodyAsJson) {
        context.authenticatedUser().validateHasUpdatePermission("SAVINGSNOTIFICATION");
        
        SavingsNotificationEvent event = SavingsNotificationEvent.fromEventCode(eventCode);
        if (event == null) {
            throw new IllegalArgumentException("Invalid event code: " + eventCode);
        }
        
        final CommandWrapper commandRequest = new CommandWrapperBuilder()
                .updateSavingsNotificationEvent(event.getEventCode())
                .withJson(apiRequestBodyAsJson)
                .build();
        
        final CommandProcessingResult result = commandsSourceWritePlatformService.logCommandSource(commandRequest);
        
        return toApiJsonSerializer.serialize(result);
    }

    /**
     * Updates a notification template
     */
    @PUT
    @Path("template/{eventCode}")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String updateTemplate(@PathParam("eventCode") final String eventCode, final String apiRequestBodyAsJson) {
        context.authenticatedUser().validateHasUpdatePermission("SAVINGSNOTIFICATION");
        
        SavingsNotificationEvent event = SavingsNotificationEvent.fromEventCode(eventCode);
        if (event == null) {
            throw new IllegalArgumentException("Invalid event code: " + eventCode);
        }
        
        final CommandWrapper commandRequest = new CommandWrapperBuilder()
                .updateSavingsNotificationTemplate(event.getEventCode())
                .withJson(apiRequestBodyAsJson)
                .build();
        
        final CommandProcessingResult result = commandsSourceWritePlatformService.logCommandSource(commandRequest);
        
        return toApiJsonSerializer.serialize(result);
    }

    /**
     * Updates the deposit threshold configuration
     */
    @PUT
    @Path("threshold/deposit")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String updateDepositThreshold(final String apiRequestBodyAsJson) {
        context.authenticatedUser().validateHasUpdatePermission("SAVINGSNOTIFICATION");
        
        final CommandWrapper commandRequest = new CommandWrapperBuilder()
                .updateSavingsNotificationDepositThreshold()
                .withJson(apiRequestBodyAsJson)
                .build();
        
        final CommandProcessingResult result = commandsSourceWritePlatformService.logCommandSource(commandRequest);
        
        return toApiJsonSerializer.serialize(result);
    }

    /**
     * Updates the withdrawal threshold configuration
     */
    @PUT
    @Path("threshold/withdrawal")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String updateWithdrawalThreshold(final String apiRequestBodyAsJson) {
        context.authenticatedUser().validateHasUpdatePermission("SAVINGSNOTIFICATION");
        
        final CommandWrapper commandRequest = new CommandWrapperBuilder()
                .updateSavingsNotificationWithdrawalThreshold()
                .withJson(apiRequestBodyAsJson)
                .build();
        
        final CommandProcessingResult result = commandsSourceWritePlatformService.logCommandSource(commandRequest);
        
        return toApiJsonSerializer.serialize(result);
    }

    /**
     * Updates the low balance threshold for a specific savings product
     */
    @PUT
    @Path("threshold/lowbalance/{productId}")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String updateLowBalanceThreshold(@PathParam("productId") final Long productId, final String apiRequestBodyAsJson) {
        context.authenticatedUser().validateHasUpdatePermission("SAVINGSNOTIFICATION");
        
        final CommandWrapper commandRequest = new CommandWrapperBuilder()
                .updateSavingsNotificationLowBalanceThreshold(productId)
                .withJson(apiRequestBodyAsJson)
                .build();
        
        final CommandProcessingResult result = commandsSourceWritePlatformService.logCommandSource(commandRequest);
        
        return toApiJsonSerializer.serialize(result);
    }

    /**
     * Updates the days to inactivity configuration
     */
    @PUT
    @Path("threshold/inactivity")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String updateDaysToInactivity(final String apiRequestBodyAsJson) {
        context.authenticatedUser().validateHasUpdatePermission("SAVINGSNOTIFICATION");
        
        final CommandWrapper commandRequest = new CommandWrapperBuilder()
                .updateSavingsNotificationInactivityDays()
                .withJson(apiRequestBodyAsJson)
                .build();
        
        final CommandProcessingResult result = commandsSourceWritePlatformService.logCommandSource(commandRequest);
        
        return toApiJsonSerializer.serialize(result);
    }

    /**
     * Sends a test notification
     */
    @POST
    @Path("test/{eventCode}")
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public String sendTestNotification(@PathParam("eventCode") final String eventCode, final String apiRequestBodyAsJson) {
        context.authenticatedUser().validateHasUpdatePermission("SAVINGSNOTIFICATION");
        
        SavingsNotificationEvent event = SavingsNotificationEvent.fromEventCode(eventCode);
        if (event == null) {
            throw new IllegalArgumentException("Invalid event code: " + eventCode);
        }
        
        final CommandWrapper commandRequest = new CommandWrapperBuilder()
                .sendTestSavingsNotification(event.getEventCode())
                .withJson(apiRequestBodyAsJson)
                .build();
        
        final CommandProcessingResult result = commandsSourceWritePlatformService.logCommandSource(commandRequest);
        
        return toApiJsonSerializer.serialize(result);
    }
}