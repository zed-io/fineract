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
package org.apache.fineract.portfolio.loanaccount.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.loanaccount.command.LoanUpdateCommand;
import org.apache.fineract.portfolio.loanaccount.data.LoanTermVariationsData;
import org.apache.fineract.portfolio.loanaccount.data.ScheduleGeneratorDTO;
import org.apache.fineract.portfolio.loanaccount.loanschedule.data.LoanScheduleDTO;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanScheduleGenerator;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanScheduleModel;
import org.apache.fineract.portfolio.loanaccount.service.MultiDisbursementScheduleGenerationService;
import org.apache.fineract.portfolio.loanproduct.domain.LoanProductRelatedDetail;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Unit tests for the MultiDisbursementHandler component.
 */
public class MultiDisbursementHandlerTest {

    private MultiDisbursementHandler handler;
    private Loan loan;
    private MonetaryCurrency currency;
    private LoanScheduleGenerator loanScheduleGenerator;
    private MultiDisbursementScheduleGenerationService multiDisbursementScheduleGenerationService;

    @BeforeEach
    public void setup() {
        // Mock dependencies
        loanScheduleGenerator = mock(LoanScheduleGenerator.class);
        multiDisbursementScheduleGenerationService = mock(MultiDisbursementScheduleGenerationService.class);
        
        // Initialize handler
        handler = new MultiDisbursementHandler(loanScheduleGenerator, multiDisbursementScheduleGenerationService);
        
        // Setup test data
        currency = new MonetaryCurrency("USD", 2, 0);
        loan = mock(Loan.class);
        
        when(loan.getCurrency()).thenReturn(currency);
    }

    @Test
    public void testHandleMultiDisbursementWithInitialDisbursement() {
        // Setup
        BigDecimal loanAmount = BigDecimal.valueOf(10000);
        BigDecimal firstDisbursementAmount = BigDecimal.valueOf(5000);
        LocalDate disbursementDate = LocalDate.now();
        
        when(loan.isMultiDisburmentLoan()).thenReturn(true);
        when(loan.getApprovedPrincipal()).thenReturn(Money.of(currency, loanAmount));
        when(loan.getDisbursedAmount()).thenReturn(Money.of(currency, BigDecimal.ZERO));
        when(loan.getRepaymentScheduleInstallments()).thenReturn(new ArrayList<>());
        
        LoanScheduleModel scheduleModel = mock(LoanScheduleModel.class);
        when(loanScheduleGenerator.rescheduleNextInstallments(any(), any(), any())).thenReturn(scheduleModel);
        
        // Execute
        LoanUpdateCommand command = mock(LoanUpdateCommand.class);
        when(command.getPrincipalAmount()).thenReturn(firstDisbursementAmount);
        when(command.getExecutionDate()).thenReturn(disbursementDate);
        
        ScheduleGeneratorDTO scheduleGeneratorDTO = new ScheduleGeneratorDTO(
                loanScheduleGenerator,
                loan,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
                
        handler.handleMultiDisbursement(loan, command, scheduleGeneratorDTO);
        
        // Verify
        ArgumentCaptor<BigDecimal> amountCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(loan).disburse(any(), amountCaptor.capture(), any(), any());
        
        BigDecimal disbursedAmount = amountCaptor.getValue();
        assertEquals(firstDisbursementAmount, disbursedAmount);
    }

    @Test
    public void testHandleSubsequentDisbursement() {
        // Setup
        BigDecimal loanAmount = BigDecimal.valueOf(10000);
        BigDecimal firstDisbursementAmount = BigDecimal.valueOf(5000);
        BigDecimal secondDisbursementAmount = BigDecimal.valueOf(3000);
        LocalDate disbursementDate = LocalDate.now();
        
        when(loan.isMultiDisburmentLoan()).thenReturn(true);
        when(loan.getApprovedPrincipal()).thenReturn(Money.of(currency, loanAmount));
        when(loan.getDisbursedAmount()).thenReturn(Money.of(currency, firstDisbursementAmount));
        when(loan.getRepaymentScheduleInstallments()).thenReturn(createScheduleInstallments());
        
        LoanScheduleModel scheduleModel = mock(LoanScheduleModel.class);
        when(loanScheduleGenerator.rescheduleNextInstallments(any(), any(), any())).thenReturn(scheduleModel);
        when(multiDisbursementScheduleGenerationService.regenerateScheduleForDisburse(any())).thenReturn(new LoanScheduleDTO(scheduleModel, null));
        
        // Execute
        LoanUpdateCommand command = mock(LoanUpdateCommand.class);
        when(command.getPrincipalAmount()).thenReturn(secondDisbursementAmount);
        when(command.getExecutionDate()).thenReturn(disbursementDate);
        
        ScheduleGeneratorDTO scheduleGeneratorDTO = new ScheduleGeneratorDTO(
                loanScheduleGenerator,
                loan,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
                
        handler.handleMultiDisbursement(loan, command, scheduleGeneratorDTO);
        
        // Verify
        ArgumentCaptor<BigDecimal> amountCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(loan).disburse(any(), amountCaptor.capture(), any(), any());
        
        BigDecimal disbursedAmount = amountCaptor.getValue();
        assertEquals(secondDisbursementAmount, disbursedAmount);
        
        // Verify schedule regeneration
        verify(multiDisbursementScheduleGenerationService, times(1)).regenerateScheduleForDisburse(any());
    }

    @Test
    public void testHandleExceedingApprovedAmount() {
        // Setup
        BigDecimal loanAmount = BigDecimal.valueOf(10000);
        BigDecimal firstDisbursementAmount = BigDecimal.valueOf(5000);
        BigDecimal secondDisbursementAmount = BigDecimal.valueOf(6000); // Exceeds remaining amount
        LocalDate disbursementDate = LocalDate.now();
        
        when(loan.isMultiDisburmentLoan()).thenReturn(true);
        when(loan.getApprovedPrincipal()).thenReturn(Money.of(currency, loanAmount));
        when(loan.getDisbursedAmount()).thenReturn(Money.of(currency, firstDisbursementAmount));
        when(loan.getRepaymentScheduleInstallments()).thenReturn(createScheduleInstallments());
        
        LoanScheduleModel scheduleModel = mock(LoanScheduleModel.class);
        when(loanScheduleGenerator.rescheduleNextInstallments(any(), any(), any())).thenReturn(scheduleModel);
        
        // Execute
        LoanUpdateCommand command = mock(LoanUpdateCommand.class);
        when(command.getPrincipalAmount()).thenReturn(secondDisbursementAmount);
        when(command.getExecutionDate()).thenReturn(disbursementDate);
        
        ScheduleGeneratorDTO scheduleGeneratorDTO = new ScheduleGeneratorDTO(
                loanScheduleGenerator,
                loan,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        
        // Expect an exception or handling for exceeding amount
        // For this test, we're assuming the implementation restricts to the remaining available amount
        handler.handleMultiDisbursement(loan, command, scheduleGeneratorDTO);
        
        // Verify
        ArgumentCaptor<BigDecimal> amountCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(loan).disburse(any(), amountCaptor.capture(), any(), any());
        
        BigDecimal disbursedAmount = amountCaptor.getValue();
        // Should be limited to remaining amount (10000 - 5000 = 5000)
        assertEquals(BigDecimal.valueOf(5000), disbursedAmount);
    }

    @Test
    public void testHandleTermVariationWithMultiDisbursement() {
        // Setup
        BigDecimal loanAmount = BigDecimal.valueOf(10000);
        BigDecimal firstDisbursementAmount = BigDecimal.valueOf(5000);
        BigDecimal secondDisbursementAmount = BigDecimal.valueOf(3000);
        LocalDate disbursementDate = LocalDate.now();
        
        when(loan.isMultiDisburmentLoan()).thenReturn(true);
        when(loan.getApprovedPrincipal()).thenReturn(Money.of(currency, loanAmount));
        when(loan.getDisbursedAmount()).thenReturn(Money.of(currency, firstDisbursementAmount));
        when(loan.getRepaymentScheduleInstallments()).thenReturn(createScheduleInstallments());
        
        // Create term variations for this test
        List<LoanTermVariationsData> termVariations = new ArrayList<>();
        Map<LocalDate, BigDecimal> disbursementVariations = new HashMap<>();
        disbursementVariations.put(disbursementDate, secondDisbursementAmount);
        when(loan.getDisbursementDates()).thenReturn(disbursementVariations);
        
        LoanScheduleModel scheduleModel = mock(LoanScheduleModel.class);
        when(loanScheduleGenerator.rescheduleNextInstallments(any(), any(), any())).thenReturn(scheduleModel);
        when(multiDisbursementScheduleGenerationService.regenerateScheduleForDisburse(any())).thenReturn(new LoanScheduleDTO(scheduleModel, null));
        
        // Execute
        LoanUpdateCommand command = mock(LoanUpdateCommand.class);
        when(command.getPrincipalAmount()).thenReturn(secondDisbursementAmount);
        when(command.getExecutionDate()).thenReturn(disbursementDate);
        
        ScheduleGeneratorDTO scheduleGeneratorDTO = new ScheduleGeneratorDTO(
                loanScheduleGenerator,
                loan,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
                
        handler.handleMultiDisbursement(loan, command, scheduleGeneratorDTO);
        
        // Verify
        ArgumentCaptor<BigDecimal> amountCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(loan).disburse(any(), amountCaptor.capture(), any(), any());
        
        BigDecimal disbursedAmount = amountCaptor.getValue();
        assertEquals(secondDisbursementAmount, disbursedAmount);
        
        // Verify schedule regeneration considering term variations
        verify(multiDisbursementScheduleGenerationService, times(1)).regenerateScheduleForDisburse(any());
    }
    
    @Test
    public void testHandleFinalDisbursement() {
        // Setup
        BigDecimal loanAmount = BigDecimal.valueOf(10000);
        BigDecimal firstDisbursementAmount = BigDecimal.valueOf(5000);
        BigDecimal secondDisbursementAmount = BigDecimal.valueOf(5000); // Completes the loan amount
        LocalDate disbursementDate = LocalDate.now();
        
        when(loan.isMultiDisburmentLoan()).thenReturn(true);
        when(loan.getApprovedPrincipal()).thenReturn(Money.of(currency, loanAmount));
        when(loan.getDisbursedAmount()).thenReturn(Money.of(currency, firstDisbursementAmount));
        when(loan.getRepaymentScheduleInstallments()).thenReturn(createScheduleInstallments());
        
        LoanScheduleModel scheduleModel = mock(LoanScheduleModel.class);
        when(loanScheduleGenerator.rescheduleNextInstallments(any(), any(), any())).thenReturn(scheduleModel);
        when(multiDisbursementScheduleGenerationService.regenerateScheduleForDisburse(any())).thenReturn(new LoanScheduleDTO(scheduleModel, null));
        
        // Execute
        LoanUpdateCommand command = mock(LoanUpdateCommand.class);
        when(command.getPrincipalAmount()).thenReturn(secondDisbursementAmount);
        when(command.getExecutionDate()).thenReturn(disbursementDate);
        
        ScheduleGeneratorDTO scheduleGeneratorDTO = new ScheduleGeneratorDTO(
                loanScheduleGenerator,
                loan,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
                
        handler.handleMultiDisbursement(loan, command, scheduleGeneratorDTO);
        
        // Verify
        ArgumentCaptor<BigDecimal> amountCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(loan).disburse(any(), amountCaptor.capture(), any(), any());
        
        BigDecimal disbursedAmount = amountCaptor.getValue();
        assertEquals(secondDisbursementAmount, disbursedAmount);
        
        // Verify schedule regeneration
        verify(multiDisbursementScheduleGenerationService, times(1)).regenerateScheduleForDisburse(any());
        
        // Verify that the loan is fully disbursed
        verify(loan).setActualDisbursedAmount(Money.of(currency, loanAmount));
    }
    
    // Helper methods
    
    private List<LoanRepaymentScheduleInstallment> createScheduleInstallments() {
        List<LoanRepaymentScheduleInstallment> installments = new ArrayList<>();
        
        LoanRepaymentScheduleInstallment installment1 = mock(LoanRepaymentScheduleInstallment.class);
        when(installment1.getDueDate()).thenReturn(LocalDate.now().plusMonths(1));
        when(installment1.getPrincipal()).thenReturn(BigDecimal.valueOf(800));
        
        LoanRepaymentScheduleInstallment installment2 = mock(LoanRepaymentScheduleInstallment.class);
        when(installment2.getDueDate()).thenReturn(LocalDate.now().plusMonths(2));
        when(installment2.getPrincipal()).thenReturn(BigDecimal.valueOf(800));
        
        LoanRepaymentScheduleInstallment installment3 = mock(LoanRepaymentScheduleInstallment.class);
        when(installment3.getDueDate()).thenReturn(LocalDate.now().plusMonths(3));
        when(installment3.getPrincipal()).thenReturn(BigDecimal.valueOf(800));
        
        installments.add(installment1);
        installments.add(installment2);
        installments.add(installment3);
        
        return installments;
    }
}