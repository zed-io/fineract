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

import org.apache.fineract.portfolio.savings.domain.SavingsAccount;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransaction;

/**
 * Service interface for sending savings account related notifications
 */
public interface SavingsNotificationService {

    /**
     * Sends a notification when a savings account is created
     *
     * @param savingsAccount The savings account that was created
     */
    void sendSavingsAccountCreationNotification(SavingsAccount savingsAccount);

    /**
     * Sends a notification when a savings account is approved
     *
     * @param savingsAccount The savings account that was approved
     */
    void sendSavingsAccountApprovalNotification(SavingsAccount savingsAccount);

    /**
     * Sends a notification when a savings account is activated
     *
     * @param savingsAccount The savings account that was activated
     */
    void sendSavingsAccountActivationNotification(SavingsAccount savingsAccount);

    /**
     * Sends a notification when a savings account is rejected
     *
     * @param savingsAccount The savings account that was rejected
     */
    void sendSavingsAccountRejectionNotification(SavingsAccount savingsAccount);

    /**
     * Sends a notification when a savings account is closed
     *
     * @param savingsAccount The savings account that was closed
     */
    void sendSavingsAccountClosureNotification(SavingsAccount savingsAccount);

    /**
     * Sends a notification when interest is posted to a savings account
     *
     * @param savingsAccount The savings account that had interest posted
     */
    void sendInterestPostingNotification(SavingsAccount savingsAccount);

    /**
     * Sends a notification when a deposit is made to a savings account
     *
     * @param savingsAccount The savings account
     * @param transaction The deposit transaction
     */
    void sendDepositNotification(SavingsAccount savingsAccount, SavingsAccountTransaction transaction);

    /**
     * Sends a notification when a withdrawal is made from a savings account
     *
     * @param savingsAccount The savings account
     * @param transaction The withdrawal transaction
     */
    void sendWithdrawalNotification(SavingsAccount savingsAccount, SavingsAccountTransaction transaction);

    /**
     * Sends a notification when the account balance falls below a configurable threshold
     *
     * @param savingsAccount The savings account
     */
    void sendLowBalanceAlertNotification(SavingsAccount savingsAccount);

    /**
     * Sends a notification when an account becomes dormant or is about to become dormant
     *
     * @param savingsAccount The savings account
     * @param isDormant True if the account is now dormant, false if it's a warning
     */
    void sendDormancyNotification(SavingsAccount savingsAccount, boolean isDormant);

    /**
     * Sends a notification when a hold is placed on or removed from an account
     *
     * @param savingsAccount The savings account
     * @param isHoldPlaced True if a hold was placed, false if removed
     * @param reason The reason for the hold placement or removal
     */
    void sendAccountHoldNotification(SavingsAccount savingsAccount, boolean isHoldPlaced, String reason);

    /**
     * Sends a notification when a statement is generated for an account
     *
     * @param savingsAccount The savings account
     * @param statementId The ID of the generated statement
     */
    void sendStatementGenerationNotification(SavingsAccount savingsAccount, Long statementId);

    /**
     * Sends a notification for fixed deposit accounts based on the event type
     *
     * @param fixedDepositAccount The fixed deposit account
     * @param eventType The type of event
     */
    void sendFixedDepositNotification(SavingsAccount fixedDepositAccount, String eventType);

    /**
     * Sends a notification for recurring deposit accounts based on the event type
     *
     * @param recurringDepositAccount The recurring deposit account
     * @param eventType The type of event
     */
    void sendRecurringDepositNotification(SavingsAccount recurringDepositAccount, String eventType);
}