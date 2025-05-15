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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.notification.data.NotificationData;
import org.apache.fineract.notification.eventandlistener.NotificationEventPublisher;
import org.apache.fineract.organisation.office.domain.Office;
import org.apache.fineract.portfolio.client.domain.Client;
import org.apache.fineract.portfolio.group.domain.Group;
import org.apache.fineract.portfolio.savings.DepositAccountType;
import org.apache.fineract.portfolio.savings.domain.SavingsAccount;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransaction;
import org.apache.fineract.portfolio.savings.service.notifications.config.SavingsNotificationConfigService;
import org.springframework.stereotype.Service;

/**
 * Implementation of the SavingsNotificationService
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SavingsNotificationServiceImpl implements SavingsNotificationService {

    private static final String OBJECT_TYPE = "SAVINGS";
    private static final String FIXED_DEPOSIT_OBJECT_TYPE = "FIXED_DEPOSIT";
    private static final String RECURRING_DEPOSIT_OBJECT_TYPE = "RECURRING_DEPOSIT";
    
    private final NotificationEventPublisher notificationEventPublisher;
    private final SavingsNotificationConfigService configService;
    private final SavingsNotificationTemplateService templateService;

    @Override
    public void sendSavingsAccountCreationNotification(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.ACCOUNT_CREATED)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.ACCOUNT_CREATED, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("CREATE")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendSavingsAccountApprovalNotification(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.ACCOUNT_APPROVED)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("approvedBy", savingsAccount.getApproviedUser() != null ? 
                savingsAccount.getApproviedUser().getUsername() : "System");
        templateParams.put("approvedOn", savingsAccount.getApprovedOnDate());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.ACCOUNT_APPROVED, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("APPROVE")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendSavingsAccountActivationNotification(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.ACCOUNT_ACTIVATED)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("activatedBy", savingsAccount.getActivatedUser() != null ? 
                savingsAccount.getActivatedUser().getUsername() : "System");
        templateParams.put("activatedOn", savingsAccount.getActivatedOnDate());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.ACCOUNT_ACTIVATED, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("ACTIVATE")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendSavingsAccountRejectionNotification(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.ACCOUNT_REJECTED)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("rejectedBy", savingsAccount.getRejectedUser() != null ? 
                savingsAccount.getRejectedUser().getUsername() : "System");
        templateParams.put("rejectedOn", savingsAccount.getRejectedOnDate());
        templateParams.put("rejectionReason", savingsAccount.getRejectionReason());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.ACCOUNT_REJECTED, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("REJECT")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendSavingsAccountClosureNotification(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.ACCOUNT_CLOSED)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("closedBy", savingsAccount.getClosedUser() != null ? 
                savingsAccount.getClosedUser().getUsername() : "System");
        templateParams.put("closedOn", savingsAccount.getClosedOnDate());
        templateParams.put("closureReason", savingsAccount.getClosureReason());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.ACCOUNT_CLOSED, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("CLOSE")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendInterestPostingNotification(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.INTEREST_POSTING)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("interestPosted", savingsAccount.getSummary().getTotalInterestPosted());
        templateParams.put("interestPostingDate", DateUtils.getLocalDateTimeOfTenant());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.INTEREST_POSTING, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("INTEREST_POSTING")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendDepositNotification(SavingsAccount savingsAccount, SavingsAccountTransaction transaction) {
        // Check if notification should be sent based on threshold
        if (!shouldSendTransactionNotification(SavingsNotificationEvent.DEPOSIT, transaction.getAmount())) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("transactionAmount", transaction.getAmount());
        templateParams.put("transactionDate", transaction.getTransactionLocalDate());
        templateParams.put("transactionId", transaction.getId());
        templateParams.put("paymentType", transaction.getPaymentDetail() != null ? 
                transaction.getPaymentDetail().getPaymentType().getName() : "N/A");
        templateParams.put("newBalance", savingsAccount.getSummary().getAccountBalance());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.DEPOSIT, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("DEPOSIT")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendWithdrawalNotification(SavingsAccount savingsAccount, SavingsAccountTransaction transaction) {
        // Check if notification should be sent based on threshold
        if (!shouldSendTransactionNotification(SavingsNotificationEvent.WITHDRAWAL, transaction.getAmount())) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("transactionAmount", transaction.getAmount());
        templateParams.put("transactionDate", transaction.getTransactionLocalDate());
        templateParams.put("transactionId", transaction.getId());
        templateParams.put("paymentType", transaction.getPaymentDetail() != null ? 
                transaction.getPaymentDetail().getPaymentType().getName() : "N/A");
        templateParams.put("newBalance", savingsAccount.getSummary().getAccountBalance());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.WITHDRAWAL, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("WITHDRAWAL")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
        
        // Check if low balance alert should be sent after withdrawal
        checkAndSendLowBalanceAlert(savingsAccount);
    }

    @Override
    public void sendLowBalanceAlertNotification(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.LOW_BALANCE_ALERT)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("currentBalance", savingsAccount.getSummary().getAccountBalance());
        templateParams.put("thresholdAmount", configService.getLowBalanceThreshold(savingsAccount.getProduct().getId()));
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.LOW_BALANCE_ALERT, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("LOW_BALANCE_ALERT")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendDormancyNotification(SavingsAccount savingsAccount, boolean isDormant) {
        SavingsNotificationEvent event = isDormant ? 
                SavingsNotificationEvent.ACCOUNT_DORMANT : 
                SavingsNotificationEvent.DORMANCY_WARNING;
                
        if (!configService.isEnabledForEvent(event)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("dormancyDate", DateUtils.getLocalDateTimeOfTenant());
        if (!isDormant) {
            templateParams.put("daysToInactivity", configService.getDaysToInactivity());
            templateParams.put("lastActivityDate", savingsAccount.getLastTransactionDate());
        }
        
        String content = templateService.generateContentFromTemplate(event, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction(isDormant ? "ACCOUNT_DORMANT" : "DORMANCY_WARNING")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendAccountHoldNotification(SavingsAccount savingsAccount, boolean isHoldPlaced, String reason) {
        SavingsNotificationEvent event = isHoldPlaced ? 
                SavingsNotificationEvent.ACCOUNT_HOLD_PLACED : 
                SavingsNotificationEvent.ACCOUNT_HOLD_RELEASED;
                
        if (!configService.isEnabledForEvent(event)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("holdDate", DateUtils.getLocalDateTimeOfTenant());
        templateParams.put("holdReason", reason);
        
        String content = templateService.generateContentFromTemplate(event, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction(isHoldPlaced ? "HOLD_PLACED" : "HOLD_RELEASED")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendStatementGenerationNotification(SavingsAccount savingsAccount, Long statementId) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.STATEMENT_GENERATED)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(savingsAccount);
        templateParams.put("statementId", statementId);
        templateParams.put("statementDate", DateUtils.getLocalDateTimeOfTenant());
        
        String content = templateService.generateContentFromTemplate(SavingsNotificationEvent.STATEMENT_GENERATED, templateParams);
        
        NotificationData notificationData = createBaseNotification(savingsAccount)
                .setAction("STATEMENT_GENERATED")
                .setContent(content)
                .setObjectType(getObjectType(savingsAccount));
        
        publish(notificationData);
    }

    @Override
    public void sendFixedDepositNotification(SavingsAccount fixedDepositAccount, String eventType) {
        if (!configService.isEnabledForDepositAccounts()) {
            return;
        }

        SavingsNotificationEvent notificationEvent;
        String action;
        
        switch (eventType) {
            case "FixedDepositAccountCreateBusinessEvent":
                notificationEvent = SavingsNotificationEvent.FD_ACCOUNT_CREATED;
                action = "CREATE";
                break;
            case "FixedDepositAccountActivateBusinessEvent":
                notificationEvent = SavingsNotificationEvent.FD_ACCOUNT_ACTIVATED;
                action = "ACTIVATE";
                break;
            case "FixedDepositAccountCloseBusinessEvent":
                notificationEvent = SavingsNotificationEvent.FD_ACCOUNT_CLOSED;
                action = "CLOSE";
                break;
            case "FixedDepositAccountMaturityBusinessEvent":
                notificationEvent = SavingsNotificationEvent.FD_ACCOUNT_MATURED;
                action = "MATURED";
                break;
            case "FixedDepositAccountPreClosureBusinessEvent":
                notificationEvent = SavingsNotificationEvent.FD_ACCOUNT_PREMATURELY_CLOSED;
                action = "PREMATURELY_CLOSED";
                break;
            default:
                // Unknown event type, skip notification
                return;
        }
        
        if (!configService.isEnabledForEvent(notificationEvent)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(fixedDepositAccount);
        // Add deposit-specific parameters like maturity date, interest rate, etc.
        if (fixedDepositAccount.getDepositTermDetail() != null) {
            templateParams.put("depositAmount", fixedDepositAccount.getDepositAmount());
            templateParams.put("depositPeriod", fixedDepositAccount.getDepositTermDetail().getTerm());
            templateParams.put("depositPeriodFrequency", fixedDepositAccount.getDepositTermDetail().getTermPeriodFrequencyType().getValue());
            templateParams.put("maturityDate", fixedDepositAccount.getMaturityDate());
            templateParams.put("interestRate", fixedDepositAccount.getNominalAnnualInterestRate());
            templateParams.put("maturityAmount", fixedDepositAccount.getAccountTermAndPreClosure().getMaturityAmount());
        }
        
        String content = templateService.generateContentFromTemplate(notificationEvent, templateParams);
        
        NotificationData notificationData = createBaseNotification(fixedDepositAccount)
                .setAction(action)
                .setContent(content)
                .setObjectType(FIXED_DEPOSIT_OBJECT_TYPE);
        
        publish(notificationData);
    }

    @Override
    public void sendRecurringDepositNotification(SavingsAccount recurringDepositAccount, String eventType) {
        if (!configService.isEnabledForDepositAccounts()) {
            return;
        }

        SavingsNotificationEvent notificationEvent;
        String action;
        
        switch (eventType) {
            case "RecurringDepositAccountCreateBusinessEvent":
                notificationEvent = SavingsNotificationEvent.RD_ACCOUNT_CREATED;
                action = "CREATE";
                break;
            case "RecurringDepositAccountActivateBusinessEvent":
                notificationEvent = SavingsNotificationEvent.RD_ACCOUNT_ACTIVATED;
                action = "ACTIVATE";
                break;
            case "RecurringDepositAccountCloseBusinessEvent":
                notificationEvent = SavingsNotificationEvent.RD_ACCOUNT_CLOSED;
                action = "CLOSE";
                break;
            case "RecurringDepositAccountMaturityBusinessEvent":
                notificationEvent = SavingsNotificationEvent.RD_ACCOUNT_MATURED;
                action = "MATURED";
                break;
            case "RecurringDepositAccountPreClosureBusinessEvent":
                notificationEvent = SavingsNotificationEvent.RD_ACCOUNT_PREMATURELY_CLOSED;
                action = "PREMATURELY_CLOSED";
                break;
            case "RecurringDepositAccountScheduleInstallmentMissedBusinessEvent":
                notificationEvent = SavingsNotificationEvent.RD_INSTALLMENT_MISSED;
                action = "INSTALLMENT_MISSED";
                break;
            default:
                // Unknown event type, skip notification
                return;
        }
        
        if (!configService.isEnabledForEvent(notificationEvent)) {
            return;
        }

        Map<String, Object> templateParams = buildBaseTemplateParameters(recurringDepositAccount);
        // Add deposit-specific parameters
        if (recurringDepositAccount.getDepositTermDetail() != null) {
            templateParams.put("depositAmount", recurringDepositAccount.getDepositAmount());
            templateParams.put("depositPeriod", recurringDepositAccount.getDepositTermDetail().getTerm());
            templateParams.put("depositPeriodFrequency", recurringDepositAccount.getDepositTermDetail().getTermPeriodFrequencyType().getValue());
            templateParams.put("maturityDate", recurringDepositAccount.getMaturityDate());
            templateParams.put("interestRate", recurringDepositAccount.getNominalAnnualInterestRate());
            templateParams.put("maturityAmount", recurringDepositAccount.getAccountTermAndPreClosure().getMaturityAmount());
            
            // Add recurring deposit specific parameters
            if (recurringDepositAccount.getRecurringDetail() != null) {
                templateParams.put("recurringDepositAmount", recurringDepositAccount.getRecurringDetail().getMandatoryRecommendedDepositAmount());
                templateParams.put("recurringDepositFrequency", recurringDepositAccount.getRecurringDetail().getRecurringFrequency());
                templateParams.put("recurringDepositFrequencyType", recurringDepositAccount.getRecurringDetail().getRecurringFrequencyType().getValue());
            }
        }
        
        String content = templateService.generateContentFromTemplate(notificationEvent, templateParams);
        
        NotificationData notificationData = createBaseNotification(recurringDepositAccount)
                .setAction(action)
                .setContent(content)
                .setObjectType(RECURRING_DEPOSIT_OBJECT_TYPE);
        
        publish(notificationData);
    }

    /**
     * Builds base template parameters that are common to all notification types
     */
    private Map<String, Object> buildBaseTemplateParameters(SavingsAccount savingsAccount) {
        Map<String, Object> params = new HashMap<>();
        
        params.put("accountId", savingsAccount.getId());
        params.put("accountNo", savingsAccount.getAccountNumber());
        params.put("productName", savingsAccount.getProduct().getName());
        params.put("currency", savingsAccount.getCurrency().getCode());
        params.put("balance", savingsAccount.getSummary().getAccountBalance());
        
        // Add client or group information
        if (savingsAccount.getClient() != null) {
            Client client = savingsAccount.getClient();
            params.put("clientId", client.getId());
            params.put("clientName", client.getDisplayName());
            params.put("clientMobileNo", client.getMobileNo());
            params.put("clientEmail", client.getEmailAddress());
        } else if (savingsAccount.getGroup() != null) {
            Group group = savingsAccount.getGroup();
            params.put("groupId", group.getId());
            params.put("groupName", group.getName());
        }
        
        // Add office information
        Office office = savingsAccount.getOffice();
        if (office != null) {
            params.put("officeName", office.getName());
            params.put("officeId", office.getId());
        }
        
        return params;
    }

    /**
     * Creates a base notification data object with common properties
     */
    private NotificationData createBaseNotification(SavingsAccount savingsAccount) {
        NotificationData notificationData = new NotificationData()
                .setObjectId(savingsAccount.getId())
                .setIsSystemGenerated(true)
                .setCreatedAt(LocalDateTime.now().toString());
        
        // Set user IDs based on client or group members
        Set<Long> userIds = new HashSet<>();
        
        if (savingsAccount.getClient() != null && savingsAccount.getClient().getStaff() != null) {
            // Add staff assigned to client
            userIds.add(savingsAccount.getClient().getStaff().getId());
        } else if (savingsAccount.getGroup() != null && savingsAccount.getGroup().getStaff() != null) {
            // Add staff assigned to group
            userIds.add(savingsAccount.getGroup().getStaff().getId());
        }
        
        // Always include the loan officer if assigned
        if (savingsAccount.getSavingsOfficer() != null) {
            userIds.add(savingsAccount.getSavingsOfficer().getId());
        }
        
        // Add office ID if available
        if (savingsAccount.getOffice() != null) {
            notificationData.setOfficeId(savingsAccount.getOffice().getId());
        }
        
        notificationData.setUserIds(userIds);
        
        return notificationData;
    }

    /**
     * Publishes a notification event
     */
    private void publish(NotificationData notificationData) {
        try {
            notificationEventPublisher.broadcastNotification(notificationData);
        } catch (Exception e) {
            log.error("Error publishing savings notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Determines if a transaction notification should be sent based on configured thresholds
     */
    private boolean shouldSendTransactionNotification(SavingsNotificationEvent event, BigDecimal amount) {
        if (!configService.isEnabledForEvent(event)) {
            return false;
        }
        
        BigDecimal threshold = event == SavingsNotificationEvent.DEPOSIT ? 
                configService.getDepositThreshold() : 
                configService.getWithdrawalThreshold();
        
        // If threshold is zero or null, all transactions should trigger notifications
        if (threshold == null || threshold.compareTo(BigDecimal.ZERO) == 0) {
            return true;
        }
        
        // Otherwise, only transactions above threshold should trigger notifications
        return amount.compareTo(threshold) >= 0;
    }

    /**
     * Checks if a low balance alert should be sent and sends it if needed
     */
    private void checkAndSendLowBalanceAlert(SavingsAccount savingsAccount) {
        if (!configService.isEnabledForEvent(SavingsNotificationEvent.LOW_BALANCE_ALERT)) {
            return;
        }
        
        BigDecimal threshold = configService.getLowBalanceThreshold(savingsAccount.getProduct().getId());
        BigDecimal currentBalance = savingsAccount.getSummary().getAccountBalance();
        
        if (threshold != null && currentBalance.compareTo(threshold) <= 0) {
            sendLowBalanceAlertNotification(savingsAccount);
        }
    }

    /**
     * Gets the appropriate object type based on account type
     */
    private String getObjectType(SavingsAccount savingsAccount) {
        if (savingsAccount.getDepositAccountType() != null) {
            if (savingsAccount.getDepositAccountType().equals(DepositAccountType.FIXED_DEPOSIT)) {
                return FIXED_DEPOSIT_OBJECT_TYPE;
            } else if (savingsAccount.getDepositAccountType().equals(DepositAccountType.RECURRING_DEPOSIT)) {
                return RECURRING_DEPOSIT_OBJECT_TYPE;
            }
        }
        return OBJECT_TYPE;
    }
}