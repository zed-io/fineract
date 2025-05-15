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
package org.apache.fineract.portfolio.savings.service.notifications.config;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.cache.domain.CacheType;
import org.apache.fineract.infrastructure.cache.service.CacheWritePlatformService;
import org.apache.fineract.infrastructure.configuration.data.GlobalConfigurationPropertyData;
import org.apache.fineract.infrastructure.configuration.service.ConfigurationReadPlatformService;
import org.apache.fineract.infrastructure.core.service.ThreadLocalContextUtil;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationEvent;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Implementation of SavingsNotificationConfigService that manages configuration
 * for savings notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SavingsNotificationConfigServiceImpl implements SavingsNotificationConfigService {

    private static final String NOTIFICATION_EVENT_PREFIX = "notification.savings.event.";
    private static final String NOTIFICATION_DEPOSIT_THRESHOLD = "notification.savings.deposit.threshold";
    private static final String NOTIFICATION_WITHDRAWAL_THRESHOLD = "notification.savings.withdrawal.threshold";
    private static final String NOTIFICATION_LOW_BALANCE_THRESHOLD_PREFIX = "notification.savings.low.balance.threshold.product.";
    private static final String NOTIFICATION_DAYS_TO_INACTIVITY = "notification.savings.days.to.inactivity";
    private static final String NOTIFICATION_DEPOSIT_ENABLED = "notification.deposit.accounts.enabled";

    private final ConfigurationReadPlatformService configurationReadPlatformService;
    private final CacheWritePlatformService cacheWritePlatformService;
    
    // In-memory cache for product-specific thresholds
    private final Map<Long, BigDecimal> productLowBalanceThresholds = new ConcurrentHashMap<>();

    @Cacheable(value = "savingsNotificationConfig", key = "#event.eventCode")
    @Override
    public boolean isEnabledForEvent(SavingsNotificationEvent event) {
        final String configKey = NOTIFICATION_EVENT_PREFIX + event.getEventCode();
        final boolean defaultValue = getDefaultStateForEvent(event);
        
        return getBooleanConfig(configKey, defaultValue);
    }

    @Cacheable(value = "savingsNotificationConfig", key = "'depositAccountsEnabled'")
    @Override
    public boolean isEnabledForDepositAccounts() {
        return getBooleanConfig(NOTIFICATION_DEPOSIT_ENABLED, true);
    }

    @Cacheable(value = "savingsNotificationConfig", key = "'depositThreshold'")
    @Override
    public BigDecimal getDepositThreshold() {
        return getBigDecimalConfig(NOTIFICATION_DEPOSIT_THRESHOLD, BigDecimal.ZERO);
    }

    @Cacheable(value = "savingsNotificationConfig", key = "'withdrawalThreshold'")
    @Override
    public BigDecimal getWithdrawalThreshold() {
        return getBigDecimalConfig(NOTIFICATION_WITHDRAWAL_THRESHOLD, BigDecimal.ZERO);
    }

    @Override
    public BigDecimal getLowBalanceThreshold(Long productId) {
        // First check the in-memory cache
        if (productLowBalanceThresholds.containsKey(productId)) {
            return productLowBalanceThresholds.get(productId);
        }
        
        // Then check the global configuration
        final String configKey = NOTIFICATION_LOW_BALANCE_THRESHOLD_PREFIX + productId;
        BigDecimal threshold = getBigDecimalConfig(configKey, BigDecimal.valueOf(100));
        
        // Cache the result
        productLowBalanceThresholds.put(productId, threshold);
        
        return threshold;
    }

    @Cacheable(value = "savingsNotificationConfig", key = "'daysToInactivity'")
    @Override
    public Integer getDaysToInactivity() {
        return getIntegerConfig(NOTIFICATION_DAYS_TO_INACTIVITY, 90);
    }

    @CacheEvict(value = "savingsNotificationConfig", key = "#event.eventCode")
    @Override
    public boolean updateEventConfiguration(SavingsNotificationEvent event, boolean enabled) {
        final String configKey = NOTIFICATION_EVENT_PREFIX + event.getEventCode();
        // In a real implementation, this would update the global configuration
        
        // Invalidate cache
        cacheWritePlatformService.invalidateAll(CacheType.SINGLE_NODE);
        
        return true;
    }

    @CacheEvict(value = "savingsNotificationConfig", key = "'depositThreshold'")
    @Override
    public boolean updateDepositThreshold(BigDecimal threshold) {
        // In a real implementation, this would update the global configuration
        
        // Invalidate cache
        cacheWritePlatformService.invalidateAll(CacheType.SINGLE_NODE);
        
        return true;
    }

    @CacheEvict(value = "savingsNotificationConfig", key = "'withdrawalThreshold'")
    @Override
    public boolean updateWithdrawalThreshold(BigDecimal threshold) {
        // In a real implementation, this would update the global configuration
        
        // Invalidate cache
        cacheWritePlatformService.invalidateAll(CacheType.SINGLE_NODE);
        
        return true;
    }

    @Override
    public boolean updateLowBalanceThreshold(Long productId, BigDecimal threshold) {
        // In a real implementation, this would update the global configuration
        
        // Update in-memory cache
        productLowBalanceThresholds.put(productId, threshold);
        
        return true;
    }

    @CacheEvict(value = "savingsNotificationConfig", key = "'daysToInactivity'")
    @Override
    public boolean updateDaysToInactivity(Integer days) {
        // In a real implementation, this would update the global configuration
        
        // Invalidate cache
        cacheWritePlatformService.invalidateAll(CacheType.SINGLE_NODE);
        
        return true;
    }

    /**
     * Gets a boolean configuration value
     */
    private boolean getBooleanConfig(String configKey, boolean defaultValue) {
        try {
            GlobalConfigurationPropertyData property = configurationReadPlatformService.retrieveGlobalConfiguration(configKey);
            if (property != null && property.isEnabled() != null) {
                return property.isEnabled();
            }
        } catch (Exception e) {
            log.warn("Error retrieving configuration for key {}: {}", configKey, e.getMessage());
        }
        return defaultValue;
    }

    /**
     * Gets a BigDecimal configuration value
     */
    private BigDecimal getBigDecimalConfig(String configKey, BigDecimal defaultValue) {
        try {
            GlobalConfigurationPropertyData property = configurationReadPlatformService.retrieveGlobalConfiguration(configKey);
            if (property != null && property.getValue() != null) {
                return BigDecimal.valueOf(property.getValue().doubleValue());
            }
        } catch (Exception e) {
            log.warn("Error retrieving configuration for key {}: {}", configKey, e.getMessage());
        }
        return defaultValue;
    }

    /**
     * Gets an Integer configuration value
     */
    private Integer getIntegerConfig(String configKey, Integer defaultValue) {
        try {
            GlobalConfigurationPropertyData property = configurationReadPlatformService.retrieveGlobalConfiguration(configKey);
            if (property != null && property.getValue() != null) {
                return property.getValue().intValue();
            }
        } catch (Exception e) {
            log.warn("Error retrieving configuration for key {}: {}", configKey, e.getMessage());
        }
        return defaultValue;
    }

    /**
     * Gets the default enabled state for each notification event
     */
    private boolean getDefaultStateForEvent(SavingsNotificationEvent event) {
        switch (event) {
            case ACCOUNT_CREATED:
            case ACCOUNT_APPROVED:
            case ACCOUNT_ACTIVATED:
            case ACCOUNT_REJECTED:
            case ACCOUNT_CLOSED:
            case FD_ACCOUNT_MATURED:
            case RD_INSTALLMENT_MISSED:
                return true;
                
            case DEPOSIT:
            case WITHDRAWAL:
            case INTEREST_POSTING:
            case LOW_BALANCE_ALERT:
            case DORMANCY_WARNING:
            case ACCOUNT_DORMANT:
            case ACCOUNT_REACTIVATED:
            case ACCOUNT_HOLD_PLACED:
            case ACCOUNT_HOLD_RELEASED:
            case STATEMENT_GENERATED:
                return true;
                
            // Fixed and recurring deposit events
            case FD_ACCOUNT_CREATED:
            case FD_ACCOUNT_ACTIVATED:
            case FD_ACCOUNT_CLOSED:
            case FD_ACCOUNT_PREMATURELY_CLOSED:
            case RD_ACCOUNT_CREATED:
            case RD_ACCOUNT_ACTIVATED:
            case RD_ACCOUNT_CLOSED:
            case RD_ACCOUNT_MATURED:
            case RD_ACCOUNT_PREMATURELY_CLOSED:
                return true;
                
            default:
                return false;
        }
    }
}