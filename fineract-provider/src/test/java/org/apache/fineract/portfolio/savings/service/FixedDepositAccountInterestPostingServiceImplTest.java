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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.apache.fineract.infrastructure.configuration.domain.ConfigurationDomainService;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.event.business.domain.deposit.FixedDepositInterestPostingBusinessEvent;
import org.apache.fineract.infrastructure.event.business.service.BusinessEventNotifierService;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.account.service.AccountTransfersWritePlatformService;
import org.apache.fineract.portfolio.interestcalculation.domain.InterestCalculationEngine;
import org.apache.fineract.portfolio.savings.SavingsCompoundingInterestPeriodType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationDaysInYearType;
import org.apache.fineract.portfolio.savings.SavingsInterestCalculationType;
import org.apache.fineract.portfolio.savings.SavingsPostingInterestPeriodType;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccountRepository;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransaction;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransactionRepository;
import org.apache.fineract.portfolio.savings.exception.FixedDepositAccountNotFoundException;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationEvent;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class FixedDepositAccountInterestPostingServiceImplTest {

    @Mock
    private FixedDepositAccountRepository fixedDepositAccountRepository;
    
    @Mock
    private SavingsAccountTransactionRepository savingsAccountTransactionRepository;
    
    @Mock
    private InterestCalculationEngine interestCalculationEngine;
    
    @Mock
    private ConfigurationDomainService configurationDomainService;
    
    @Mock
    private BusinessEventNotifierService businessEventNotifierService;
    
    @Mock
    private SavingsNotificationService savingsNotificationService;
    
    @Mock
    private AccountTransfersWritePlatformService accountTransfersWritePlatformService;
    
    @Mock
    private FixedDepositAccountReadPlatformService fixedDepositAccountReadPlatformService;
    
    @InjectMocks
    private FixedDepositAccountInterestPostingServiceImpl service;
    
    private FixedDepositAccount testAccount;
    private UUID accountId;
    private LocalDate businessDate;

    @BeforeEach
    public void setUp() {
        accountId = UUID.randomUUID();
        businessDate = LocalDate.of(2023, 1, 31);
        
        // Set up test account
        testAccount = mock(FixedDepositAccount.class);
        
        // Common setup for test account
        when(testAccount.isActive()).thenReturn(true);
        when(testAccount.getCurrency()).thenReturn(new MonetaryCurrency("USD", 2, 5));
        when(testAccount.getInterestCompoundingPeriodType()).thenReturn(SavingsCompoundingInterestPeriodType.DAILY.getValue());
        when(testAccount.getInterestPostingPeriodType()).thenReturn(SavingsPostingInterestPeriodType.MONTHLY.getValue());
        when(testAccount.getInterestCalculationType()).thenReturn(SavingsInterestCalculationType.DAILY_BALANCE.getValue());
        when(testAccount.getInterestCalculationDaysInYearType())
                .thenReturn(SavingsInterestCalculationDaysInYearType.DAYS_365.getValue());
        when(testAccount.maturityDate()).thenReturn(businessDate.plusMonths(6));
    }

    @Test
    public void testPostInterest_AccountNotFound() {
        // Arrange
        when(fixedDepositAccountRepository.findById(anyString())).thenReturn(Optional.empty());
        
        // Act & Assert
        try {
            service.postInterest(accountId, businessDate);
        } catch (FixedDepositAccountNotFoundException e) {
            // Expected exception
            assertEquals(accountId, e.getAccountId());
        }
    }
    
    @Test
    public void testPostInterest_Success() {
        // Arrange
        SavingsAccountTransaction interestPostingTxn = mock(SavingsAccountTransaction.class);
        List<SavingsAccountTransaction> transactions = new ArrayList<>();
        transactions.add(interestPostingTxn);
        
        when(fixedDepositAccountRepository.findById(accountId.toString())).thenReturn(Optional.of(testAccount));
        when(configurationDomainService.isSavingsInterestPostingAtCurrentPeriodEnd()).thenReturn(true);
        when(configurationDomainService.retrieveFinancialYearBeginningMonth()).thenReturn(1);
        when(testAccount.getTransactions()).thenReturn(transactions);
        when(interestPostingTxn.isInterestPostingAndNotReversed()).thenReturn(true);
        when(interestPostingTxn.getTransactionLocalDate()).thenReturn(businessDate);
        when(interestPostingTxn.getAmount(any())).thenReturn(BigDecimal.valueOf(100.0));
        
        doNothing().when(fixedDepositAccountRepository).saveAndFlush(testAccount);
        doNothing().when(businessEventNotifierService).notifyPostBusinessEvent(any(FixedDepositInterestPostingBusinessEvent.class));
        doNothing().when(savingsNotificationService).notifyAccountOwnerOfInterestPosting(eq(testAccount), any(BigDecimal.class), 
                eq(SavingsNotificationEvent.INTEREST_POSTING));
        
        // Act
        Money result = service.postInterest(accountId, businessDate);
        
        // Assert
        assertNotNull(result);
        verify(testAccount, times(1)).postInterest(any(), any(LocalDate.class), anyBoolean(), anyBoolean(), any(), any(LocalDate.class), anyBoolean());
        verify(fixedDepositAccountRepository, times(1)).saveAndFlush(testAccount);
        verify(businessEventNotifierService, times(1)).notifyPostBusinessEvent(any(FixedDepositInterestPostingBusinessEvent.class));
        verify(savingsNotificationService, times(1)).notifyAccountOwnerOfInterestPosting(eq(testAccount), any(BigDecimal.class), 
                eq(SavingsNotificationEvent.INTEREST_POSTING));
    }
    
    @Test
    public void testPostInterestForAccounts_EmptyList() {
        // Act
        int result = service.postInterestForAccounts(new ArrayList<>(), businessDate);
        
        // Assert
        assertEquals(0, result);
    }
    
    @Test
    public void testPostInterestForAccounts_Success() {
        // Arrange
        List<FixedDepositAccountData> accounts = new ArrayList<>();
        FixedDepositAccountData accountData = mock(FixedDepositAccountData.class);
        accounts.add(accountData);
        
        when(accountData.getId()).thenReturn(1L); // Long ID
        when(fixedDepositAccountRepository.findById(any())).thenReturn(Optional.of(testAccount));
        
        // Configure the account to succeed with interest posting
        SavingsAccountTransaction interestPostingTxn = mock(SavingsAccountTransaction.class);
        List<SavingsAccountTransaction> transactions = new ArrayList<>();
        transactions.add(interestPostingTxn);
        
        when(testAccount.getTransactions()).thenReturn(transactions);
        when(interestPostingTxn.isInterestPostingAndNotReversed()).thenReturn(true);
        when(interestPostingTxn.getTransactionLocalDate()).thenReturn(businessDate);
        when(interestPostingTxn.getAmount(any())).thenReturn(BigDecimal.valueOf(100.0));
        
        // Act
        int result = service.postInterestForAccounts(accounts, businessDate);
        
        // Assert
        assertEquals(1, result);
    }
    
    @Test
    public void testGetAccountsDueForMaturityProcessing() {
        // Arrange
        Collection<FixedDepositAccountData> expectedAccounts = new ArrayList<>();
        expectedAccounts.add(mock(FixedDepositAccountData.class));
        
        when(fixedDepositAccountReadPlatformService.retrieveMaturedDepositAccounts(businessDate))
            .thenReturn(expectedAccounts);
        
        // Act
        Collection<FixedDepositAccountData> result = service.getAccountsDueForMaturityProcessing(businessDate);
        
        // Assert
        assertEquals(expectedAccounts, result);
        verify(fixedDepositAccountReadPlatformService, times(1)).retrieveMaturedDepositAccounts(businessDate);
    }
    
    @Test
    public void testProcessMaturedAccounts_NoAccounts() {
        // Arrange
        when(fixedDepositAccountReadPlatformService.retrieveMaturedDepositAccounts(businessDate))
            .thenReturn(new ArrayList<>());
        
        // Act
        int result = service.processMaturedAccounts(businessDate);
        
        // Assert
        assertEquals(0, result);
    }
    
    @Test
    public void testProcessMaturedAccounts_Success() {
        // Arrange
        List<FixedDepositAccountData> accounts = new ArrayList<>();
        FixedDepositAccountData accountData = mock(FixedDepositAccountData.class);
        accounts.add(accountData);
        
        when(accountData.getId()).thenReturn(1L);
        when(fixedDepositAccountReadPlatformService.retrieveMaturedDepositAccounts(businessDate))
            .thenReturn(accounts);
        
        // Set up the account to successfully process maturity
        when(fixedDepositAccountRepository.findById(anyString())).thenReturn(Optional.of(testAccount));
        when(testAccount.isActive()).thenReturn(true);
        when(testAccount.isMatured()).thenReturn(false).thenReturn(true); // Not matured initially, then matured after processing
        
        // Act
        int result = service.processMaturedAccounts(businessDate);
        
        // Assert
        assertEquals(1, result);
        
        // Verify the account was processed
        ArgumentCaptor<FixedDepositAccount> accountCaptor = ArgumentCaptor.forClass(FixedDepositAccount.class);
        verify(fixedDepositAccountRepository, times(1)).saveAndFlush(accountCaptor.capture());
        verify(businessEventNotifierService, times(1)).notifyPostBusinessEvent(any());
        verify(savingsNotificationService, times(1)).notifyAccountOwnerOfMaturity(any(), any());
    }
}