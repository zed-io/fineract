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
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationEvent;

/**
 * Service interface for managing savings notification configuration
 */
public interface SavingsNotificationConfigService {

    /**
     * Checks if notifications are enabled for a specific event
     *
     * @param event The notification event
     * @return True if notifications are enabled for the event
     */
    boolean isEnabledForEvent(SavingsNotificationEvent event);

    /**
     * Checks if notifications are enabled for deposit accounts (fixed and recurring)
     *
     * @return True if notifications are enabled for deposit accounts
     */
    boolean isEnabledForDepositAccounts();

    /**
     * Gets the threshold amount for deposit notifications
     * Only deposits above this amount will trigger notifications
     *
     * @return The deposit threshold amount
     */
    BigDecimal getDepositThreshold();

    /**
     * Gets the threshold amount for withdrawal notifications
     * Only withdrawals above this amount will trigger notifications
     *
     * @return The withdrawal threshold amount
     */
    BigDecimal getWithdrawalThreshold();

    /**
     * Gets the threshold amount for low balance alerts
     * When account balance falls below this amount, a notification will be sent
     *
     * @param productId The ID of the savings product
     * @return The low balance threshold amount
     */
    BigDecimal getLowBalanceThreshold(Long productId);

    /**
     * Gets the number of days of inactivity before an account is considered dormant
     *
     * @return The number of days
     */
    Integer getDaysToInactivity();

    /**
     * Updates the notification configuration for a specific event
     *
     * @param event The notification event
     * @param enabled Whether notifications should be enabled for this event
     * @return True if the configuration was updated successfully
     */
    boolean updateEventConfiguration(SavingsNotificationEvent event, boolean enabled);

    /**
     * Updates the deposit threshold configuration
     *
     * @param threshold The new threshold amount
     * @return True if the configuration was updated successfully
     */
    boolean updateDepositThreshold(BigDecimal threshold);

    /**
     * Updates the withdrawal threshold configuration
     *
     * @param threshold The new threshold amount
     * @return True if the configuration was updated successfully
     */
    boolean updateWithdrawalThreshold(BigDecimal threshold);

    /**
     * Updates the low balance threshold configuration for a specific product
     *
     * @param productId The ID of the savings product
     * @param threshold The new threshold amount
     * @return True if the configuration was updated successfully
     */
    boolean updateLowBalanceThreshold(Long productId, BigDecimal threshold);

    /**
     * Updates the days to inactivity configuration
     *
     * @param days The new number of days
     * @return True if the configuration was updated successfully
     */
    boolean updateDaysToInactivity(Integer days);
}