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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import org.apache.fineract.infrastructure.configuration.domain.ConfigurationDomainService;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccountRepository;
import org.apache.fineract.portfolio.savings.domain.FixedDepositInterestCalculationEngine;
import org.apache.fineract.portfolio.savings.exception.FixedDepositAccountNotFoundException;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationEvent;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class FixedDepositInterestPostingIntegrationServiceTest {

    @Mock
    private FixedDepositAccountRepository fixedDepositAccountRepository;
    
    @Mock
    private FixedDepositInterestCalculationEngine fixedDepositInterestCalculationEngine;
    
    @Mock
    private FixedDepositAccountInterestPostingService fixedDepositAccountInterestPostingService;
    
    @Mock
    private ConfigurationDomainService configurationDomainService;
    
    @Mock
    private SavingsNotificationService savingsNotificationService;
    
    @Mock
    private FixedDepositAccountReadPlatformService fixedDepositAccountReadPlatformService;
    
    @InjectMocks
    private FixedDepositInterestPostingIntegrationService service;
    
    private FixedDepositAccount testAccount;
    private Long accountId;
    private UUID accountUuid;
    private LocalDate businessDate;
    private final MonetaryCurrency currency = new MonetaryCurrency("USD", 2, 0);
    private Money interestAmount;

    @BeforeEach
    public void setUp() {
        accountId = 123L;
        accountUuid = UUID.randomUUID();
        businessDate = LocalDate.of(2023, 1, 31);
        interestAmount = Money.of(currency, BigDecimal.valueOf(100.0));
        
        // Set up test account
        testAccount = mock(FixedDepositAccount.class);
        
        // Common setup for test account
        when(testAccount.getId()).thenReturn(accountId);
        when(testAccount.isActive()).thenReturn(true);
        when(testAccount.getCurrency()).thenReturn(currency);
        when(testAccount.maturityDate()).thenReturn(businessDate.plusMonths(6));
    }

    @Test
    public void testPostInterest_Success() {
        // Arrange
        when(fixedDepositAccountRepository.findById(accountId)).thenReturn(Optional.of(testAccount));
        when(fixedDepositAccountInterestPostingService.postInterest(any(UUID.class), eq(businessDate)))
            .thenReturn(interestAmount);
        
        // Act
        Money result = service.postInterest(accountId, businessDate);
        
        // Assert
        assertNotNull(result);
        assertEquals(interestAmount, result);
        verify(fixedDepositAccountInterestPostingService, times(1)).postInterest(any(UUID.class), eq(businessDate));
    }
    
    @Test
    public void testCalculateMaturityAmount_Success() {
        // Arrange
        when(fixedDepositInterestCalculationEngine.calculateMaturityAmount(eq(testAccount), any(MathContext.class), eq(false)))
            .thenReturn(Money.of(currency, BigDecimal.valueOf(10500.0)));
        
        // Act
        Money result = service.calculateMaturityAmount(testAccount, false);
        
        // Assert
        assertNotNull(result);
        assertEquals(BigDecimal.valueOf(10500.0), result.getAmount());
        verify(fixedDepositInterestCalculationEngine, times(1)).calculateMaturityAmount(eq(testAccount), any(MathContext.class), eq(false));
    }
    
    @Test
    public void testUpdateMaturityDetails_Success() {
        // Arrange
        when(configurationDomainService.isSavingsInterestPostingAtCurrentPeriodEnd()).thenReturn(true);
        when(configurationDomainService.retrieveFinancialYearBeginningMonth()).thenReturn(1);
        doNothing().when(fixedDepositAccountRepository).saveAndFlush(testAccount);
        
        // Act
        service.updateMaturityDetails(testAccount);
        
        // Assert
        verify(testAccount, times(1)).updateMaturityDateAndAmount(any(MathContext.class), eq(false), eq(true), eq(1));
        verify(fixedDepositAccountRepository, times(1)).saveAndFlush(testAccount);
    }
    
    @Test
    public void testProcessMaturity_AccountNotMaturedYet() {
        // Arrange
        when(configurationDomainService.isSavingsInterestPostingAtCurrentPeriodEnd()).thenReturn(true);
        when(configurationDomainService.retrieveFinancialYearBeginningMonth()).thenReturn(1);
        when(testAccount.isMatured()).thenReturn(false);
        doNothing().when(fixedDepositAccountRepository).saveAndFlush(testAccount);
        
        // Act
        boolean result = service.processMaturity(testAccount);
        
        // Assert
        assertFalse(result, "Should return false if account is not matured after processing");
        verify(testAccount, times(1)).updateMaturityStatus(eq(true), eq(1));
        verify(fixedDepositAccountRepository, times(1)).saveAndFlush(testAccount);
    }
    
    @Test
    public void testProcessMaturity_AccountMatured() {
        // Arrange
        when(configurationDomainService.isSavingsInterestPostingAtCurrentPeriodEnd()).thenReturn(true);
        when(configurationDomainService.retrieveFinancialYearBeginningMonth()).thenReturn(1);
        
        // After updating maturity status, the account becomes matured
        when(testAccount.isMatured()).thenReturn(false).thenReturn(true);
        doNothing().when(fixedDepositAccountRepository).saveAndFlush(testAccount);
        doNothing().when(savingsNotificationService)
            .notifyAccountOwnerOfMaturity(eq(testAccount), eq(SavingsNotificationEvent.DEPOSIT_MATURED));
        
        // Act
        boolean result = service.processMaturity(testAccount);
        
        // Assert
        assertTrue(result, "Should return true if account is matured after processing");
        verify(testAccount, times(1)).updateMaturityStatus(eq(true), eq(1));
        verify(fixedDepositAccountRepository, times(1)).saveAndFlush(testAccount);
        verify(savingsNotificationService, times(1))
            .notifyAccountOwnerOfMaturity(eq(testAccount), eq(SavingsNotificationEvent.DEPOSIT_MATURED));
    }
    
    @Test
    public void testGetAccountsApproachingMaturity() {
        // Arrange
        Collection<FixedDepositAccountData> expectedAccounts = Collections.singletonList(mock(FixedDepositAccountData.class));
        when(fixedDepositAccountReadPlatformService.retrieveAccountsApproachingMaturity(businessDate))
            .thenReturn(expectedAccounts);
        
        // Act
        Collection<FixedDepositAccountData> result = service.getAccountsApproachingMaturity(businessDate);
        
        // Assert
        assertEquals(expectedAccounts, result);
        verify(fixedDepositAccountReadPlatformService, times(1)).retrieveAccountsApproachingMaturity(businessDate);
    }
}