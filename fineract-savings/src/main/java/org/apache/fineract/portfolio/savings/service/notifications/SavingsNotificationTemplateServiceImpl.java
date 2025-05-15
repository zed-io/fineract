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
package org.apache.fineract.portfolio.savings.service.notifications;

import com.github.mustachejava.DefaultMustacheFactory;
import com.github.mustachejava.Mustache;
import com.github.mustachejava.MustacheFactory;

import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.configuration.domain.ConfigurationDomainService;
import org.apache.fineract.infrastructure.core.service.ThreadLocalContextUtil;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

/**
 * Implementation of the SavingsNotificationTemplateService that manages
 * templates for savings notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SavingsNotificationTemplateServiceImpl implements SavingsNotificationTemplateService {

    private final ResourceLoader resourceLoader;
    private final ConfigurationDomainService configurationDomainService;
    
    private final Map<SavingsNotificationEvent, Mustache> compiledTemplates = new ConcurrentHashMap<>();
    private final MustacheFactory mustacheFactory = new DefaultMustacheFactory();

    @Override
    public String generateContentFromTemplate(SavingsNotificationEvent event, Map<String, Object> parameters) {
        try {
            // Get the template content
            String templateContent = getEffectiveTemplate(event);
            
            // Add global parameters
            parameters = enrichWithGlobalParameters(parameters);
            
            // Compile the template if not already compiled, or if it has changed
            Mustache mustache = compiledTemplates.computeIfAbsent(event, e -> 
                mustacheFactory.compile(new StringReader(templateContent), event.getEventCode())
            );
            
            // Execute the template with parameters
            StringWriter writer = new StringWriter();
            mustache.execute(writer, parameters);
            writer.flush();
            
            return writer.toString();
            
        } catch (IOException e) {
            log.error("Error generating notification content from template for event {}: {}", 
                    event.getEventCode(), e.getMessage(), e);
            return getFallbackMessage(event, parameters);
        }
    }

    @Cacheable(value = "savingsNotificationTemplates", key = "#event.eventCode")
    @Override
    public String getDefaultTemplate(SavingsNotificationEvent event) {
        // First check if there is a custom template file in the filesystem
        try {
            String templatePath = "classpath:templates/notification/savings/" + event.getEventCode() + ".mustache";
            Resource resource = resourceLoader.getResource(templatePath);
            
            if (resource.exists()) {
                return new String(resource.getInputStream().readAllBytes());
            }
        } catch (IOException e) {
            log.warn("Error loading notification template file for event {}: {}", event.getEventCode(), e.getMessage());
        }
        
        // If no custom template is found, return a default template
        return getDefaultTemplateForEvent(event);
    }

    @CacheEvict(value = "savingsNotificationTemplates", key = "#event.eventCode")
    @Override
    public boolean updateTemplate(SavingsNotificationEvent event, String templateContent) {
        // In a real implementation, this would save the template to a database or file
        // For now, we'll just invalidate the cache and return success
        
        // Also invalidate the compiled template
        compiledTemplates.remove(event);
        
        return true;
    }

    /**
     * Gets the effective template to use for a notification event
     */
    private String getEffectiveTemplate(SavingsNotificationEvent event) {
        // In a real implementation, this would check for a custom template in database
        // and fall back to the default if none is found
        
        return getDefaultTemplate(event);
    }

    /**
     * Adds global parameters to the template parameters
     */
    private Map<String, Object> enrichWithGlobalParameters(Map<String, Object> parameters) {
        Map<String, Object> enrichedParams = new HashMap<>(parameters);
        
        // Add tenant details
        enrichedParams.put("tenantName", ThreadLocalContextUtil.getTenant().getName());
        enrichedParams.put("tenantId", ThreadLocalContextUtil.getTenant().getId());
        
        // Add platform name - this could come from configuration
        enrichedParams.put("platformName", "Apache Fineract");
        
        return enrichedParams;
    }

    /**
     * Gets a fallback message if template rendering fails
     */
    private String getFallbackMessage(SavingsNotificationEvent event, Map<String, Object> parameters) {
        StringBuilder sb = new StringBuilder();
        
        switch (event) {
            case ACCOUNT_CREATED:
                sb.append("Savings account created");
                if (parameters.containsKey("accountNo")) {
                    sb.append(": ").append(parameters.get("accountNo"));
                }
                break;
                
            case ACCOUNT_APPROVED:
                sb.append("Savings account approved");
                if (parameters.containsKey("accountNo")) {
                    sb.append(": ").append(parameters.get("accountNo"));
                }
                break;
                
            case DEPOSIT:
                sb.append("Deposit made to savings account");
                if (parameters.containsKey("accountNo")) {
                    sb.append(" ").append(parameters.get("accountNo"));
                }
                if (parameters.containsKey("transactionAmount")) {
                    sb.append(": ").append(parameters.get("transactionAmount"));
                }
                break;
                
            case WITHDRAWAL:
                sb.append("Withdrawal made from savings account");
                if (parameters.containsKey("accountNo")) {
                    sb.append(" ").append(parameters.get("accountNo"));
                }
                if (parameters.containsKey("transactionAmount")) {
                    sb.append(": ").append(parameters.get("transactionAmount"));
                }
                break;
                
            default:
                sb.append("Savings account notification: ").append(event.getEventCode());
        }
        
        return sb.toString();
    }

    /**
     * Provides default templates for each notification event
     */
    private String getDefaultTemplateForEvent(SavingsNotificationEvent event) {
        switch (event) {
            case ACCOUNT_CREATED:
                return "Savings Account #{{accountNo}} has been created for {{clientName}}. Product: {{productName}}";
            
            case ACCOUNT_APPROVED:
                return "Savings Account #{{accountNo}} has been approved for {{clientName}}. You can now activate it.";
            
            case ACCOUNT_ACTIVATED:
                return "Savings Account #{{accountNo}} has been activated for {{clientName}}. The account is now ready for transactions.";
            
            case ACCOUNT_REJECTED:
                return "Savings Account #{{accountNo}} for {{clientName}} has been rejected. Reason: {{rejectionReason}}";
            
            case ACCOUNT_CLOSED:
                return "Savings Account #{{accountNo}} for {{clientName}} has been closed. Reason: {{closureReason}}";
            
            case DEPOSIT:
                return "A deposit of {{currency}} {{transactionAmount}} has been made to Savings Account #{{accountNo}}. " +
                       "New balance: {{currency}} {{newBalance}}";
            
            case WITHDRAWAL:
                return "A withdrawal of {{currency}} {{transactionAmount}} has been made from Savings Account #{{accountNo}}. " +
                       "New balance: {{currency}} {{newBalance}}";
            
            case INTEREST_POSTING:
                return "Interest of {{currency}} {{interestPosted}} has been posted to Savings Account #{{accountNo}}. " +
                       "Current balance: {{currency}} {{balance}}";
            
            case LOW_BALANCE_ALERT:
                return "LOW BALANCE ALERT: Your Savings Account #{{accountNo}} balance ({{currency}} {{currentBalance}}) " +
                       "is below the minimum threshold of {{currency}} {{thresholdAmount}}.";
            
            case DORMANCY_WARNING:
                return "INACTIVITY WARNING: Your Savings Account #{{accountNo}} has been inactive since {{lastActivityDate}}. " +
                       "It will be marked as dormant in {{daysToInactivity}} days if no activity occurs.";
            
            case ACCOUNT_DORMANT:
                return "Your Savings Account #{{accountNo}} has been marked as DORMANT due to inactivity. " +
                       "Please contact your branch to reactivate it.";
            
            case ACCOUNT_REACTIVATED:
                return "Your Savings Account #{{accountNo}} has been reactivated. " +
                       "It is now fully operational again.";
            
            case ACCOUNT_HOLD_PLACED:
                return "A hold has been placed on your Savings Account #{{accountNo}}. " +
                       "Reason: {{holdReason}}. Please contact your branch for more information.";
            
            case ACCOUNT_HOLD_RELEASED:
                return "The hold on your Savings Account #{{accountNo}} has been released. " +
                       "The account is now fully operational again.";
            
            case STATEMENT_GENERATED:
                return "Your statement for Savings Account #{{accountNo}} has been generated. " +
                       "Please check your online banking portal or visit your branch to get a copy.";
            
            case FD_ACCOUNT_CREATED:
                return "Fixed Deposit Account #{{accountNo}} has been created for {{clientName}}. " +
                       "Deposit amount: {{currency}} {{depositAmount}}. Term: {{depositPeriod}} {{depositPeriodFrequency}}.";
            
            case FD_ACCOUNT_ACTIVATED:
                return "Fixed Deposit Account #{{accountNo}} for {{clientName}} has been activated. " +
                       "Maturity date: {{maturityDate}}. Projected maturity amount: {{currency}} {{maturityAmount}}.";
            
            case FD_ACCOUNT_MATURED:
                return "Your Fixed Deposit Account #{{accountNo}} has matured. " +
                       "Maturity amount: {{currency}} {{maturityAmount}}. Please contact your branch for further instructions.";
            
            case RD_ACCOUNT_CREATED:
                return "Recurring Deposit Account #{{accountNo}} has been created for {{clientName}}. " +
                       "Recurring deposit amount: {{currency}} {{recurringDepositAmount}}. " +
                       "Frequency: Every {{recurringDepositFrequency}} {{recurringDepositFrequencyType}}.";
            
            case RD_INSTALLMENT_MISSED:
                return "REMINDER: Your scheduled deposit for Recurring Deposit Account #{{accountNo}} is due. " +
                       "Please make a deposit of {{currency}} {{recurringDepositAmount}} to keep your account on track.";
            
            default:
                return "Notification regarding your Savings Account #{{accountNo}} with {{platformName}}.";
        }
    }
}