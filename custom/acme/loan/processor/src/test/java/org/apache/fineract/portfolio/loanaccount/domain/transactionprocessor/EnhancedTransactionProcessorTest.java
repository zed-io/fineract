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
package org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.fineract.infrastructure.core.domain.ExternalId;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.loanaccount.domain.Loan;
import org.apache.fineract.portfolio.loanaccount.domain.LoanCharge;
import org.apache.fineract.portfolio.loanaccount.domain.LoanRepaymentScheduleInstallment;
import org.apache.fineract.portfolio.loanaccount.domain.LoanRepaymentScheduleProcessingWrapper;
import org.apache.fineract.portfolio.loanaccount.domain.LoanTransaction;
import org.apache.fineract.portfolio.loanaccount.domain.LoanTransactionType;
import org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.impl.DuePenIntPriFeeInAdvancePenIntPriFeeLoanRepaymentScheduleTransactionProcessor;
import org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.impl.FineractStyleLoanRepaymentScheduleTransactionProcessor;
import org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.impl.HeavensFamilyLoanRepaymentScheduleTransactionProcessor;
import org.apache.fineract.portfolio.loanproduct.domain.LoanPaymentAllocationRule;
import org.apache.fineract.portfolio.loanproduct.domain.LoanProductRelatedDetail;
import org.apache.fineract.portfolio.loanproduct.domain.PaymentAllocationTransactionType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Unit tests for the EnhancedTransactionProcessor component.
 */
public class EnhancedTransactionProcessorTest {

    private LoanRepaymentScheduleTransactionProcessor transactionProcessor;
    private Loan loan;
    private MonetaryCurrency currency;
    private LoanProductRelatedDetail loanProductRelatedDetail;
    private List<LoanRepaymentScheduleInstallment> installments;
    private Set<LoanCharge> charges;
    private LoanRepaymentScheduleProcessingWrapper wrapper;

    @BeforeEach
    public void setup() {
        // For this test, we'll use the DuePenIntPriFeeInAdvancePenIntPriFeeLoanRepaymentScheduleTransactionProcessor
        // as our "enhanced" processor
        transactionProcessor = new DuePenIntPriFeeInAdvancePenIntPriFeeLoanRepaymentScheduleTransactionProcessor();
        
        // Setup test data
        currency = new MonetaryCurrency("USD", 2, 0);
        installments = new ArrayList<>();
        charges = new HashSet<>();
        wrapper = mock(LoanRepaymentScheduleProcessingWrapper.class);
        
        loanProductRelatedDetail = mock(LoanProductRelatedDetail.class);
        when(loanProductRelatedDetail.getCurrency()).thenReturn(currency);
        
        loan = mock(Loan.class);
        when(loan.getCurrency()).thenReturn(currency);
        when(loan.getLoanSummary()).thenReturn(null);
        when(loan.getRepaymentScheduleInstallments()).thenReturn(installments);
        when(loan.getCharges()).thenReturn(charges);
    }

    @Test
    public void testHandleTransactionThatIsARepayment() {
        // Setup
        BigDecimal repaymentAmount = BigDecimal.valueOf(500);
        LocalDate transactionDate = LocalDate.now();
        
        // Setup installments
        createThreeInstallments();
        
        // Setup transaction
        Money transactionAmount = Money.of(currency, repaymentAmount);
        LoanTransaction transaction = LoanTransaction.repayment(null, transactionAmount, null, transactionDate, 
                ExternalId.empty(), false);
        
        // Execute
        transactionProcessor.handleTransaction(transaction, currency, installments, charges);
        
        // Verify
        assertNotNull(transaction.getLoanTransactionToRepaymentScheduleMappings());
        
        // Verify the amount is correctly allocated according to the strategy
        BigDecimal totalAllocated = transaction.getLoanTransactionToRepaymentScheduleMappings().stream()
                .map(mapping -> mapping.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        assertEquals(repaymentAmount, totalAllocated);
    }

    @Test
    public void testPartialRepayment() {
        // Setup
        BigDecimal principalAmount = BigDecimal.valueOf(1000);
        BigDecimal interestAmount = BigDecimal.valueOf(100);
        BigDecimal feeAmount = BigDecimal.valueOf(50);
        BigDecimal penaltyAmount = BigDecimal.valueOf(25);
        
        // Total installment due: 1000 (principal) + 100 (interest) + 50 (fee) + 25 (penalty) = 1175
        BigDecimal installmentTotal = principalAmount.add(interestAmount).add(feeAmount).add(penaltyAmount);
        
        // Partial payment of 600 (covers penalties, interest, and some principal)
        BigDecimal repaymentAmount = BigDecimal.valueOf(600);
        LocalDate transactionDate = LocalDate.now();
        
        // Setup installment (with due amounts)
        LoanRepaymentScheduleInstallment installment = createInstallment(
                1, LocalDate.now().minusDays(10), principalAmount, interestAmount, feeAmount, penaltyAmount);
        installments.add(installment);
        
        // Setup transaction
        Money transactionAmount = Money.of(currency, repaymentAmount);
        LoanTransaction transaction = LoanTransaction.repayment(null, transactionAmount, null, transactionDate, 
                ExternalId.empty(), false);
        
        // Execute
        transactionProcessor.handleTransaction(transaction, currency, installments, charges);
        
        // Verify
        assertNotNull(transaction.getLoanTransactionToRepaymentScheduleMappings());
        
        // Verify the amount is correctly allocated according to the DuePenIntPriFeeInAdvance strategy
        // The allocation should prioritize penalties, then interest, then principal, then fees (for due amounts)
        
        // Test total allocated amount
        BigDecimal totalAllocated = transaction.getLoanTransactionToRepaymentScheduleMappings().stream()
                .map(mapping -> mapping.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        assertEquals(repaymentAmount, totalAllocated);
        
        // Test that the installment outstanding amounts were updated properly
        Money outstandingPenalty = installment.getPenaltyChargesOutstanding(currency);
        Money outstandingInterest = installment.getInterestOutstanding(currency);
        Money outstandingPrincipal = installment.getPrincipalOutstanding(currency);
        Money outstandingFee = installment.getFeeChargesOutstanding(currency);
        
        // Assert based on expected behavior of DuePenIntPriFeeInAdvance strategy:
        // - Penalties (25) should be fully paid
        assertEquals(BigDecimal.ZERO, outstandingPenalty.getAmount());
        
        // - Interest (100) should be fully paid
        assertEquals(BigDecimal.ZERO, outstandingInterest.getAmount());
        
        // - Principal (1000) should be partially paid (600 - 25 - 100 = 475 paid)
        assertEquals(principalAmount.subtract(BigDecimal.valueOf(475)), outstandingPrincipal.getAmount());
        
        // - Fees (50) should remain unpaid
        assertEquals(feeAmount, outstandingFee.getAmount());
        
        // Total outstanding = 525 + 50 = 575
        Money totalOutstanding = outstandingPrincipal.plus(outstandingInterest).plus(outstandingPenalty).plus(outstandingFee);
        assertEquals(installmentTotal.subtract(repaymentAmount), totalOutstanding.getAmount());
    }

    @Test
    public void testFullAdvancePayment() {
        // Setup
        BigDecimal principalAmount = BigDecimal.valueOf(1000);
        BigDecimal interestAmount = BigDecimal.valueOf(100);
        BigDecimal feeAmount = BigDecimal.valueOf(50);
        BigDecimal penaltyAmount = BigDecimal.valueOf(25);
        
        // Create a future installment (not yet due)
        LocalDate futureDate = LocalDate.now().plusMonths(1);
        
        LoanRepaymentScheduleInstallment installment = createInstallment(
                1, futureDate, principalAmount, interestAmount, feeAmount, penaltyAmount);
        installments.add(installment);
        
        // Setup an advance payment that covers the entire future installment
        BigDecimal advanceAmount = principalAmount.add(interestAmount).add(feeAmount).add(penaltyAmount);
        LocalDate transactionDate = LocalDate.now();
        
        // Setup transaction
        Money transactionAmount = Money.of(currency, advanceAmount);
        LoanTransaction transaction = LoanTransaction.repayment(null, transactionAmount, null, transactionDate, 
                ExternalId.empty(), false);
        
        // Execute
        transactionProcessor.handleTransaction(transaction, currency, installments, charges);
        
        // Verify
        assertNotNull(transaction.getLoanTransactionToRepaymentScheduleMappings());
        
        // Verify the amount is correctly allocated in advance according to the strategy
        BigDecimal totalAllocated = transaction.getLoanTransactionToRepaymentScheduleMappings().stream()
                .map(mapping -> mapping.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        assertEquals(advanceAmount, totalAllocated);
        
        // All components should be paid off
        Money outstandingPenalty = installment.getPenaltyChargesOutstanding(currency);
        Money outstandingInterest = installment.getInterestOutstanding(currency);
        Money outstandingPrincipal = installment.getPrincipalOutstanding(currency);
        Money outstandingFee = installment.getFeeChargesOutstanding(currency);
        
        assertEquals(BigDecimal.ZERO, outstandingPenalty.getAmount());
        assertEquals(BigDecimal.ZERO, outstandingInterest.getAmount());
        assertEquals(BigDecimal.ZERO, outstandingPrincipal.getAmount());
        assertEquals(BigDecimal.ZERO, outstandingFee.getAmount());
    }

    @Test
    public void testMultipleInstallmentPayment() {
        // Setup
        BigDecimal installment1Principal = BigDecimal.valueOf(1000);
        BigDecimal installment1Interest = BigDecimal.valueOf(100);
        BigDecimal installment1Fees = BigDecimal.valueOf(50);
        BigDecimal installment1Penalties = BigDecimal.valueOf(25);
        
        BigDecimal installment2Principal = BigDecimal.valueOf(1000);
        BigDecimal installment2Interest = BigDecimal.valueOf(90);
        BigDecimal installment2Fees = BigDecimal.valueOf(50);
        BigDecimal installment2Penalties = BigDecimal.valueOf(0);
        
        BigDecimal installment3Principal = BigDecimal.valueOf(1000);
        BigDecimal installment3Interest = BigDecimal.valueOf(80);
        BigDecimal installment3Fees = BigDecimal.valueOf(50);
        BigDecimal installment3Penalties = BigDecimal.valueOf(0);
        
        // Create installments
        LoanRepaymentScheduleInstallment installment1 = createInstallment(
                1, LocalDate.now().minusDays(30), installment1Principal, installment1Interest, 
                installment1Fees, installment1Penalties);
        
        LoanRepaymentScheduleInstallment installment2 = createInstallment(
                2, LocalDate.now(), installment2Principal, installment2Interest, 
                installment2Fees, installment2Penalties);
        
        LoanRepaymentScheduleInstallment installment3 = createInstallment(
                3, LocalDate.now().plusDays(30), installment3Principal, installment3Interest, 
                installment3Fees, installment3Penalties);
        
        installments.add(installment1);
        installments.add(installment2);
        installments.add(installment3);
        
        // Setup a large payment that will cover multiple installments
        // Total for installment 1 and 2: 1175 + 1140 = 2315
        BigDecimal totalPaymentAmount = BigDecimal.valueOf(2500);
        LocalDate transactionDate = LocalDate.now();
        
        // Setup transaction
        Money transactionAmount = Money.of(currency, totalPaymentAmount);
        LoanTransaction transaction = LoanTransaction.repayment(null, transactionAmount, null, transactionDate, 
                ExternalId.empty(), false);
        
        // Execute
        transactionProcessor.handleTransaction(transaction, currency, installments, charges);
        
        // Verify
        assertNotNull(transaction.getLoanTransactionToRepaymentScheduleMappings());
        
        // Verify the amount is correctly allocated across multiple installments
        BigDecimal totalAllocated = transaction.getLoanTransactionToRepaymentScheduleMappings().stream()
                .map(mapping -> mapping.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        assertEquals(totalPaymentAmount, totalAllocated);
        
        // First installment should be fully paid
        Money installment1OutstandingTotal = installment1.getTotalOutstanding(currency);
        assertEquals(BigDecimal.ZERO, installment1OutstandingTotal.getAmount());
        
        // Second installment should be fully paid
        Money installment2OutstandingTotal = installment2.getTotalOutstanding(currency);
        assertEquals(BigDecimal.ZERO, installment2OutstandingTotal.getAmount());
        
        // Third installment should be partially paid (2500 - 2315 = 185 remaining for 3rd installment)
        Money installment3OutstandingTotal = installment3.getTotalOutstanding(currency);
        
        // Total of 3rd installment: 1000 + 80 + 50 = 1130
        // Expected outstanding: 1130 - 185 = 945
        BigDecimal installment3Total = installment3Principal.add(installment3Interest).add(installment3Fees);
        assertEquals(installment3Total.subtract(BigDecimal.valueOf(185)), installment3OutstandingTotal.getAmount());
    }
    
    @Test
    public void testWaiverTransaction() {
        // Setup
        BigDecimal principalAmount = BigDecimal.valueOf(1000);
        BigDecimal interestAmount = BigDecimal.valueOf(100);
        BigDecimal feeAmount = BigDecimal.valueOf(50);
        BigDecimal penaltyAmount = BigDecimal.valueOf(25);
        
        // Create an installment
        LoanRepaymentScheduleInstallment installment = createInstallment(
                1, LocalDate.now().minusDays(10), principalAmount, interestAmount, feeAmount, penaltyAmount);
        installments.add(installment);
        
        // Setup a waiver transaction for interest
        BigDecimal waiverAmount = interestAmount;
        LocalDate transactionDate = LocalDate.now();
        
        // Setup transaction
        Money transactionAmount = Money.of(currency, waiverAmount);
        LoanTransaction transaction = LoanTransaction.waiver(null, transactionAmount, null, transactionDate, 
                ExternalId.empty());
        
        // Execute
        transactionProcessor.handleTransaction(transaction, currency, installments, charges);
        
        // Verify
        assertNotNull(transaction.getLoanTransactionToRepaymentScheduleMappings());
        
        // Verify the interest was waived
        Money outstandingInterest = installment.getInterestOutstanding(currency);
        assertEquals(BigDecimal.ZERO, outstandingInterest.getAmount());
        
        // Verify other components remain unchanged
        Money outstandingPrincipal = installment.getPrincipalOutstanding(currency);
        Money outstandingFee = installment.getFeeChargesOutstanding(currency);
        Money outstandingPenalty = installment.getPenaltyChargesOutstanding(currency);
        
        assertEquals(principalAmount, outstandingPrincipal.getAmount());
        assertEquals(feeAmount, outstandingFee.getAmount());
        assertEquals(penaltyAmount, outstandingPenalty.getAmount());
    }
    
    @Test
    public void testChargebackTransaction() {
        // Setup
        BigDecimal principalAmount = BigDecimal.valueOf(1000);
        BigDecimal interestAmount = BigDecimal.valueOf(100);
        BigDecimal feeAmount = BigDecimal.valueOf(50);
        BigDecimal penaltyAmount = BigDecimal.valueOf(25);
        
        // Create an installment that's already been paid
        LoanRepaymentScheduleInstallment installment = createInstallment(
                1, LocalDate.now().minusDays(30), principalAmount, interestAmount, feeAmount, penaltyAmount);
        installment.payPrincipalComponent(Money.of(currency, principalAmount));
        installment.payInterestComponent(Money.of(currency, interestAmount));
        installment.payFeeChargesComponent(Money.of(currency, feeAmount));
        installment.payPenaltyChargesComponent(Money.of(currency, penaltyAmount));
        installments.add(installment);
        
        // Setup an original payment transaction
        BigDecimal paymentAmount = principalAmount.add(interestAmount).add(feeAmount).add(penaltyAmount);
        LocalDate paymentDate = LocalDate.now().minusDays(15);
        
        Money transactionAmount = Money.of(currency, paymentAmount);
        LoanTransaction paymentTransaction = LoanTransaction.repayment(null, transactionAmount, null, paymentDate, 
                ExternalId.empty(), false);
        
        // Setup chargeback transaction
        BigDecimal chargebackAmount = BigDecimal.valueOf(200); // Partial chargeback
        LocalDate chargebackDate = LocalDate.now();
        
        Money chargebackTransactionAmount = Money.of(currency, chargebackAmount);
        LoanTransaction chargebackTransaction = LoanTransaction.chargeback(null, chargebackTransactionAmount, null, 
                chargebackDate, ExternalId.empty());
        chargebackTransaction.updateLoanRepaymentTransaction(paymentTransaction);
        
        // Execute
        transactionProcessor.handleChargebackTransaction(loan, chargebackTransaction, paymentTransaction, 
                installments, charges, Money.of(currency, chargebackAmount));
        
        // Verify
        assertNotNull(chargebackTransaction.getLoanTransactionToRepaymentScheduleMappings());
        
        // Verify the chargeback affected the installment
        Money outstandingTotal = installment.getTotalOutstanding(currency);
        assertEquals(chargebackAmount, outstandingTotal.getAmount());
    }

    @Test
    public void testComparisonWithDifferentProcessors() {
        // Setup
        BigDecimal principalAmount = BigDecimal.valueOf(1000);
        BigDecimal interestAmount = BigDecimal.valueOf(100);
        BigDecimal feeAmount = BigDecimal.valueOf(50);
        BigDecimal penaltyAmount = BigDecimal.valueOf(25);
        
        // Create installment
        LoanRepaymentScheduleInstallment installment = createInstallment(
                1, LocalDate.now().minusDays(10), principalAmount, interestAmount, feeAmount, penaltyAmount);
        
        // Setup a partial payment
        BigDecimal partialAmount = BigDecimal.valueOf(500);
        LocalDate transactionDate = LocalDate.now();
        
        // Create multiple processors for comparison
        LoanRepaymentScheduleTransactionProcessor advancedProcessor = 
                new DuePenIntPriFeeInAdvancePenIntPriFeeLoanRepaymentScheduleTransactionProcessor();
        
        LoanRepaymentScheduleTransactionProcessor heavensProcessor = 
                new HeavensFamilyLoanRepaymentScheduleTransactionProcessor();
        
        LoanRepaymentScheduleTransactionProcessor fineractProcessor = 
                new FineractStyleLoanRepaymentScheduleTransactionProcessor();
        
        // Process with each and compare results
        List<LoanRepaymentScheduleInstallment> installments1 = new ArrayList<>();
        installments1.add(createInstallment(1, LocalDate.now().minusDays(10), 
                principalAmount, interestAmount, feeAmount, penaltyAmount));
        
        List<LoanRepaymentScheduleInstallment> installments2 = new ArrayList<>();
        installments2.add(createInstallment(1, LocalDate.now().minusDays(10), 
                principalAmount, interestAmount, feeAmount, penaltyAmount));
        
        List<LoanRepaymentScheduleInstallment> installments3 = new ArrayList<>();
        installments3.add(createInstallment(1, LocalDate.now().minusDays(10), 
                principalAmount, interestAmount, feeAmount, penaltyAmount));
        
        // Setup transactions
        Money transactionAmount = Money.of(currency, partialAmount);
        
        LoanTransaction transaction1 = LoanTransaction.repayment(null, transactionAmount, null, transactionDate, 
                ExternalId.empty(), false);
        
        LoanTransaction transaction2 = LoanTransaction.repayment(null, transactionAmount, null, transactionDate, 
                ExternalId.empty(), false);
        
        LoanTransaction transaction3 = LoanTransaction.repayment(null, transactionAmount, null, transactionDate, 
                ExternalId.empty(), false);
        
        // Process with each processor
        advancedProcessor.handleTransaction(transaction1, currency, installments1, charges);
        heavensProcessor.handleTransaction(transaction2, currency, installments2, charges);
        fineractProcessor.handleTransaction(transaction3, currency, installments3, charges);
        
        // Verify differences in allocation based on strategy
        LoanRepaymentScheduleInstallment advancedInstallment = installments1.get(0);
        LoanRepaymentScheduleInstallment heavensInstallment = installments2.get(0);
        LoanRepaymentScheduleInstallment fineractInstallment = installments3.get(0);
        
        // The processors should have different allocation strategies
        // Just verify they processed successfully - actual differences would vary
        assertNotNull(transaction1.getLoanTransactionToRepaymentScheduleMappings());
        assertNotNull(transaction2.getLoanTransactionToRepaymentScheduleMappings());
        assertNotNull(transaction3.getLoanTransactionToRepaymentScheduleMappings());
        
        // Each processor should have allocated the full amount
        BigDecimal totalAllocated1 = transaction1.getLoanTransactionToRepaymentScheduleMappings().stream()
                .map(mapping -> mapping.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalAllocated2 = transaction2.getLoanTransactionToRepaymentScheduleMappings().stream()
                .map(mapping -> mapping.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalAllocated3 = transaction3.getLoanTransactionToRepaymentScheduleMappings().stream()
                .map(mapping -> mapping.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        assertEquals(partialAmount, totalAllocated1);
        assertEquals(partialAmount, totalAllocated2);
        assertEquals(partialAmount, totalAllocated3);
        
        // The remaining outstanding amounts should differ based on allocation strategy
        // We don't test specific values since that depends on each processor's implementation
    }

    // Helper methods
    
    private void createThreeInstallments() {
        LoanRepaymentScheduleInstallment installment1 = createInstallment(
                1, LocalDate.now().minusDays(30), BigDecimal.valueOf(300), 
                BigDecimal.valueOf(30), BigDecimal.valueOf(15), BigDecimal.valueOf(0));
        
        LoanRepaymentScheduleInstallment installment2 = createInstallment(
                2, LocalDate.now(), BigDecimal.valueOf(300), 
                BigDecimal.valueOf(30), BigDecimal.valueOf(15), BigDecimal.valueOf(0));
        
        LoanRepaymentScheduleInstallment installment3 = createInstallment(
                3, LocalDate.now().plusDays(30), BigDecimal.valueOf(400), 
                BigDecimal.valueOf(40), BigDecimal.valueOf(20), BigDecimal.valueOf(0));
        
        installments.add(installment1);
        installments.add(installment2);
        installments.add(installment3);
    }
    
    private LoanRepaymentScheduleInstallment createInstallment(
            int installmentNumber, LocalDate dueDate, 
            BigDecimal principal, BigDecimal interest, 
            BigDecimal fee, BigDecimal penalty) {
        
        return new LoanRepaymentScheduleInstallment(
                loan, installmentNumber, 
                dueDate.minusMonths(1), dueDate, 
                principal, interest, fee, penalty, 
                false, null);
    }
}