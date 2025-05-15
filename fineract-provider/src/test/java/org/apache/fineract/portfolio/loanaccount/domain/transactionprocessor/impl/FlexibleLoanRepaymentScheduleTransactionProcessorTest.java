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
package org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;

import org.apache.fineract.infrastructure.core.service.ExternalIdFactory;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.loanaccount.domain.LoanRepaymentScheduleInstallment;
import org.apache.fineract.portfolio.loanaccount.domain.LoanTransaction;
import org.apache.fineract.portfolio.loanaccount.domain.LoanTransactionToRepaymentScheduleMapping;
import org.apache.fineract.portfolio.loanaccount.domain.PaymentAllocationOrder;
import org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.MoneyHolder;
import org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.TransactionCtx;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class FlexibleLoanRepaymentScheduleTransactionProcessorTest {

    private FlexibleLoanRepaymentScheduleTransactionProcessor processor;
    private MonetaryCurrency currency;
    private ExternalIdFactory externalIdFactory;
    
    @BeforeEach
    public void setup() {
        externalIdFactory = mock(ExternalIdFactory.class);
        processor = new FlexibleLoanRepaymentScheduleTransactionProcessor(externalIdFactory);
        currency = new MonetaryCurrency("USD", 2, 1);
    }
    
    @Test
    public void testProcessPaymentWithDefaultOrderOnTimePayment() {
        // Create installment with outstanding balances
        LoanRepaymentScheduleInstallment installment = mock(LoanRepaymentScheduleInstallment.class);
        when(installment.getDueDate()).thenReturn(LocalDate.now());
        
        // Mock the component payment methods
        when(installment.payPenaltyChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("10.00")));
        when(installment.payFeeChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("15.00")));
        when(installment.payInterestComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("25.00")));
        when(installment.payPrincipalComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("50.00")));
        
        // Create transaction
        LoanTransaction transaction = mock(LoanTransaction.class);
        when(transaction.getTransactionDate()).thenReturn(LocalDate.now());
        
        // Process payment
        Money paymentAmount = Money.of(currency, new BigDecimal("100.00"));
        List<LoanTransactionToRepaymentScheduleMapping> mappings = new ArrayList<>();
        
        Money remainingAmount = processor.handleTransactionThatIsOnTimePaymentOfInstallment(
                installment, transaction, paymentAmount, mappings, new HashSet<>());
        
        // Verify result
        assertEquals(BigDecimal.ZERO.setScale(2), remainingAmount.getAmount());
    }
    
    @Test
    public void testProcessPaymentWithCustomOrderPrincipalFirst() {
        // Configure custom allocation order: Principal, Interest, Fee, Penalty
        List<PaymentAllocationOrder> customOrder = Arrays.asList(
                PaymentAllocationOrder.PRINCIPAL,
                PaymentAllocationOrder.INTEREST,
                PaymentAllocationOrder.FEE,
                PaymentAllocationOrder.PENALTY
        );
        processor.configure(customOrder, true, true, true);
        
        // Create installment with outstanding balances
        LoanRepaymentScheduleInstallment installment = mock(LoanRepaymentScheduleInstallment.class);
        when(installment.getDueDate()).thenReturn(LocalDate.now());
        
        // Mock the component payment methods - will be called in custom order
        when(installment.payPrincipalComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("50.00")));
        when(installment.payInterestComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("25.00")));
        when(installment.payFeeChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("15.00")));
        when(installment.payPenaltyChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("10.00")));
        
        // Create transaction
        LoanTransaction transaction = mock(LoanTransaction.class);
        when(transaction.getTransactionDate()).thenReturn(LocalDate.now());
        
        // Process payment
        Money paymentAmount = Money.of(currency, new BigDecimal("100.00"));
        List<LoanTransactionToRepaymentScheduleMapping> mappings = new ArrayList<>();
        
        Money remainingAmount = processor.handleTransactionThatIsOnTimePaymentOfInstallment(
                installment, transaction, paymentAmount, mappings, new HashSet<>());
        
        // Verify result
        assertEquals(BigDecimal.ZERO.setScale(2), remainingAmount.getAmount());
    }
    
    @Test
    public void testProcessPartialPaymentWithDefaultOrder() {
        // Create installment with outstanding balances
        LoanRepaymentScheduleInstallment installment = mock(LoanRepaymentScheduleInstallment.class);
        when(installment.getDueDate()).thenReturn(LocalDate.now());
        
        // Mock the component payment methods
        when(installment.payPenaltyChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("10.00")));
        when(installment.payFeeChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("15.00")));
        when(installment.payInterestComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("25.00")));
        when(installment.payPrincipalComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("0.00"))); // No principal paid
        
        // Create transaction
        LoanTransaction transaction = mock(LoanTransaction.class);
        when(transaction.getTransactionDate()).thenReturn(LocalDate.now());
        
        // Process payment - only partial payment of 50 (enough for penalties, fees, and interest but not principal)
        Money paymentAmount = Money.of(currency, new BigDecimal("50.00"));
        List<LoanTransactionToRepaymentScheduleMapping> mappings = new ArrayList<>();
        
        Money remainingAmount = processor.handleTransactionThatIsOnTimePaymentOfInstallment(
                installment, transaction, paymentAmount, mappings, new HashSet<>());
        
        // Verify result - no remaining amount
        assertEquals(BigDecimal.ZERO.setScale(2), remainingAmount.getAmount());
    }
    
    @Test
    public void testProcessOverpaymentWithExcessAppliedToNextInstallment() {
        // Setup for excess payment to next installment
        processor.configure(null, true, true, true);
        
        // Create first installment
        LoanRepaymentScheduleInstallment installment1 = mock(LoanRepaymentScheduleInstallment.class);
        when(installment1.getDueDate()).thenReturn(LocalDate.now());
        when(installment1.isNotFullyPaidOff()).thenReturn(false); // After payment this installment is fully paid
        
        // Mock the component payment methods for first installment
        when(installment1.payPenaltyChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("10.00")));
        when(installment1.payFeeChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("15.00")));
        when(installment1.payInterestComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("25.00")));
        when(installment1.payPrincipalComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("50.00")));
        
        // Create second installment
        LoanRepaymentScheduleInstallment installment2 = mock(LoanRepaymentScheduleInstallment.class);
        when(installment2.getDueDate()).thenReturn(LocalDate.now().plusMonths(1));
        when(installment2.isNotFullyPaidOff()).thenReturn(true);
        
        // Mock the component payment methods for second installment
        when(installment2.payPenaltyChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("5.00")));
        when(installment2.payFeeChargesComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("10.00")));
        when(installment2.payInterestComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("15.00")));
        when(installment2.payPrincipalComponent(any(LocalDate.class), any(Money.class)))
            .thenReturn(Money.of(currency, new BigDecimal("20.00")));
        
        // Create transaction
        LoanTransaction transaction = mock(LoanTransaction.class);
        when(transaction.getTransactionDate()).thenReturn(LocalDate.now());
        
        // Process payment with 150 (excess of 50 beyond first installment needs)
        Money paymentAmount = Money.of(currency, new BigDecimal("150.00"));
        List<LoanTransactionToRepaymentScheduleMapping> mappings = new ArrayList<>();
        List<LoanRepaymentScheduleInstallment> installments = Arrays.asList(installment1, installment2);
        
        Money remainingAmount = processor.processFlexiblePayment(
                installment1, installments, transaction, paymentAmount, mappings, new HashSet<>());
        
        // Should have 0 remaining since 100 was applied to installment1 and 50 to installment2
        assertEquals(BigDecimal.ZERO.setScale(2), remainingAmount.getAmount());
    }
}