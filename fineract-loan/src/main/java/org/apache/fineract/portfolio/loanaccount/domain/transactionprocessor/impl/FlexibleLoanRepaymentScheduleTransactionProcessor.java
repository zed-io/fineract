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

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.fineract.infrastructure.core.service.ExternalIdFactory;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.loanaccount.domain.LoanCharge;
import org.apache.fineract.portfolio.loanaccount.domain.LoanRepaymentScheduleInstallment;
import org.apache.fineract.portfolio.loanaccount.domain.LoanTransaction;
import org.apache.fineract.portfolio.loanaccount.domain.LoanTransactionToRepaymentScheduleMapping;
import org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.AbstractLoanRepaymentScheduleTransactionProcessor;
import org.apache.fineract.portfolio.loanaccount.domain.transactionprocessor.LoanRepaymentScheduleTransactionProcessor;
import org.apache.fineract.portfolio.loanaccount.domain.AllocationRule;
import org.apache.fineract.portfolio.loanaccount.domain.PaymentAllocationOrder;

/**
 * Enhanced {@link LoanRepaymentScheduleTransactionProcessor} that supports flexible payment allocation strategies.
 * 
 * This processor supports:
 * 1. Custom allocation rules based on configurable payment allocation order
 * 2. Advanced handling of over/underpayments
 * 3. Support for multiple allocation strategies within a single transaction
 */
public class FlexibleLoanRepaymentScheduleTransactionProcessor extends AbstractLoanRepaymentScheduleTransactionProcessor {

    public static final String STRATEGY_CODE = "flexible-allocation-strategy";
    public static final String STRATEGY_NAME = "Flexible Payment Allocation Strategy";

    // Default allocation order (penalties, fees, interest, principal)
    private static final List<PaymentAllocationOrder> DEFAULT_ALLOCATION_ORDER = Arrays.asList(
            PaymentAllocationOrder.PENALTY, 
            PaymentAllocationOrder.FEE, 
            PaymentAllocationOrder.INTEREST, 
            PaymentAllocationOrder.PRINCIPAL);

    private List<PaymentAllocationOrder> allocationOrder;
    private boolean applyExcessToNextInstallment;
    private boolean applyPaymentInChronologicalOrder;
    private boolean treatOverpaymentAsAdvancePayment;

    public FlexibleLoanRepaymentScheduleTransactionProcessor(ExternalIdFactory externalIdFactory) {
        super(externalIdFactory);
        this.allocationOrder = DEFAULT_ALLOCATION_ORDER;
        this.applyExcessToNextInstallment = true;
        this.applyPaymentInChronologicalOrder = true;
        this.treatOverpaymentAsAdvancePayment = true;
    }

    @Override
    public String getCode() {
        return STRATEGY_CODE;
    }

    @Override
    public String getName() {
        return STRATEGY_NAME;
    }

    /**
     * Configure the processor with custom allocation rules.
     * 
     * @param allocationOrder The order in which payment components should be allocated
     * @param applyExcessToNextInstallment Whether excess payment should be applied to future installments
     * @param applyPaymentInChronologicalOrder Whether to process installments in chronological order
     * @param treatOverpaymentAsAdvancePayment Whether to treat overpayments as advance payments
     */
    public void configure(List<PaymentAllocationOrder> allocationOrder, boolean applyExcessToNextInstallment,
            boolean applyPaymentInChronologicalOrder, boolean treatOverpaymentAsAdvancePayment) {
        this.allocationOrder = allocationOrder != null && !allocationOrder.isEmpty() ? allocationOrder : DEFAULT_ALLOCATION_ORDER;
        this.applyExcessToNextInstallment = applyExcessToNextInstallment;
        this.applyPaymentInChronologicalOrder = applyPaymentInChronologicalOrder;
        this.treatOverpaymentAsAdvancePayment = treatOverpaymentAsAdvancePayment;
    }

    /**
     * For early/'in advance' repayments, applies the flexible allocation strategy.
     */
    @Override
    protected Money handleTransactionThatIsPaymentInAdvanceOfInstallment(final LoanRepaymentScheduleInstallment currentInstallment,
            final List<LoanRepaymentScheduleInstallment> installments, final LoanTransaction loanTransaction, final Money paymentInAdvance,
            List<LoanTransactionToRepaymentScheduleMapping> transactionMappings, Set<LoanCharge> charges) {

        if (treatOverpaymentAsAdvancePayment) {
            return processFlexiblePayment(currentInstallment, installments, loanTransaction, paymentInAdvance, transactionMappings, charges);
        } else {
            // If not treating advance payments specially, use standard processing
            return handleTransactionThatIsOnTimePaymentOfInstallment(currentInstallment, loanTransaction, paymentInAdvance,
                    transactionMappings, charges);
        }
    }

    /**
     * For late repayments, applies the flexible allocation strategy.
     */
    @Override
    protected Money handleTransactionThatIsALateRepaymentOfInstallment(final LoanRepaymentScheduleInstallment currentInstallment,
            final List<LoanRepaymentScheduleInstallment> installments, final LoanTransaction loanTransaction,
            final Money transactionAmountUnprocessed, List<LoanTransactionToRepaymentScheduleMapping> transactionMappings,
            Set<LoanCharge> charges) {

        return processFlexiblePayment(currentInstallment, installments, loanTransaction, transactionAmountUnprocessed, transactionMappings, charges);
    }

    /**
     * For on-time repayments, applies the flexible allocation strategy.
     */
    @Override
    protected Money handleTransactionThatIsOnTimePaymentOfInstallment(final LoanRepaymentScheduleInstallment currentInstallment,
            final LoanTransaction loanTransaction, final Money transactionAmountUnprocessed,
            List<LoanTransactionToRepaymentScheduleMapping> transactionMappings, Set<LoanCharge> charges) {

        // For simple on-time payments with no other installments, we don't need the full list
        return processFlexiblePayment(currentInstallment, null, loanTransaction, transactionAmountUnprocessed, transactionMappings, charges);
    }

    @Override
    protected Money handleRefundTransactionPaymentOfInstallment(final LoanRepaymentScheduleInstallment currentInstallment,
            final LoanTransaction loanTransaction, final Money transactionAmountUnprocessed,
            List<LoanTransactionToRepaymentScheduleMapping> transactionMappings) {

        final LocalDate transactionDate = loanTransaction.getTransactionDate();
        final MonetaryCurrency currency = transactionAmountUnprocessed.getCurrency();
        Money transactionAmountRemaining = transactionAmountUnprocessed;
        Money principalPortion = Money.zero(currency);
        Money interestPortion = Money.zero(currency);
        Money feeChargesPortion = Money.zero(currency);
        Money penaltyChargesPortion = Money.zero(currency);

        // For refunds, process in reverse order of the allocation strategy
        List<PaymentAllocationOrder> reverseOrder = allocationOrder.stream()
                .sorted((a, b) -> -a.compareTo(b))
                .collect(Collectors.toList());

        for (PaymentAllocationOrder component : reverseOrder) {
            switch (component) {
                case PRINCIPAL:
                    principalPortion = currentInstallment.unpayPrincipalComponent(transactionDate, transactionAmountRemaining);
                    transactionAmountRemaining = transactionAmountRemaining.minus(principalPortion);
                    break;
                case INTEREST:
                    interestPortion = currentInstallment.unpayInterestComponent(transactionDate, transactionAmountRemaining);
                    transactionAmountRemaining = transactionAmountRemaining.minus(interestPortion);
                    break;
                case FEE:
                    feeChargesPortion = currentInstallment.unpayFeeChargesComponent(transactionDate, transactionAmountRemaining);
                    transactionAmountRemaining = transactionAmountRemaining.minus(feeChargesPortion);
                    break;
                case PENALTY:
                    penaltyChargesPortion = currentInstallment.unpayPenaltyChargesComponent(transactionDate, transactionAmountRemaining);
                    transactionAmountRemaining = transactionAmountRemaining.minus(penaltyChargesPortion);
                    break;
            }
        }

        loanTransaction.updateComponents(principalPortion, interestPortion, feeChargesPortion, penaltyChargesPortion);
        
        if (principalPortion.plus(interestPortion).plus(feeChargesPortion).plus(penaltyChargesPortion).isGreaterThanZero()) {
            transactionMappings.add(LoanTransactionToRepaymentScheduleMapping.createFrom(loanTransaction, currentInstallment,
                    principalPortion, interestPortion, feeChargesPortion, penaltyChargesPortion));
        }
        
        return transactionAmountRemaining;
    }

    /**
     * Core logic for processing payments using the flexible allocation strategy.
     */
    private Money processFlexiblePayment(final LoanRepaymentScheduleInstallment currentInstallment,
            final List<LoanRepaymentScheduleInstallment> installments, final LoanTransaction loanTransaction,
            final Money transactionAmountUnprocessed, List<LoanTransactionToRepaymentScheduleMapping> transactionMappings,
            Set<LoanCharge> charges) {

        final LocalDate transactionDate = loanTransaction.getTransactionDate();
        final MonetaryCurrency currency = transactionAmountUnprocessed.getCurrency();
        Money transactionAmountRemaining = transactionAmountUnprocessed;
        Money principalPortion = Money.zero(currency);
        Money interestPortion = Money.zero(currency);
        Money feeChargesPortion = Money.zero(currency);
        Money penaltyChargesPortion = Money.zero(currency);

        if (loanTransaction.isChargesWaiver()) {
            // Handle charges waiver
            if (allocationOrder.contains(PaymentAllocationOrder.PENALTY)) {
                penaltyChargesPortion = currentInstallment.waivePenaltyChargesComponent(transactionDate,
                        loanTransaction.getPenaltyChargesPortion(currency));
                transactionAmountRemaining = transactionAmountRemaining.minus(penaltyChargesPortion);
            }

            if (allocationOrder.contains(PaymentAllocationOrder.FEE)) {
                feeChargesPortion = currentInstallment.waiveFeeChargesComponent(transactionDate,
                        loanTransaction.getFeeChargesPortion(currency));
                transactionAmountRemaining = transactionAmountRemaining.minus(feeChargesPortion);
            }
        } else if (loanTransaction.isInterestWaiver()) {
            // Handle interest waiver
            if (allocationOrder.contains(PaymentAllocationOrder.INTEREST)) {
                interestPortion = currentInstallment.waiveInterestComponent(transactionDate, transactionAmountRemaining);
                transactionAmountRemaining = transactionAmountRemaining.minus(interestPortion);
            }
        } else if (loanTransaction.isChargePayment()) {
            // Handle charge payment
            if (loanTransaction.isPenaltyPayment() && allocationOrder.contains(PaymentAllocationOrder.PENALTY)) {
                penaltyChargesPortion = currentInstallment.payPenaltyChargesComponent(transactionDate, transactionAmountRemaining);
                transactionAmountRemaining = transactionAmountRemaining.minus(penaltyChargesPortion);
            } else if (allocationOrder.contains(PaymentAllocationOrder.FEE)) {
                feeChargesPortion = currentInstallment.payFeeChargesComponent(transactionDate, transactionAmountRemaining);
                transactionAmountRemaining = transactionAmountRemaining.minus(feeChargesPortion);
            }
        } else {
            // Regular payment - process according to the configured allocation order
            for (PaymentAllocationOrder component : allocationOrder) {
                switch (component) {
                    case PENALTY:
                        penaltyChargesPortion = currentInstallment.payPenaltyChargesComponent(transactionDate, transactionAmountRemaining);
                        transactionAmountRemaining = transactionAmountRemaining.minus(penaltyChargesPortion);
                        break;
                    case FEE:
                        feeChargesPortion = currentInstallment.payFeeChargesComponent(transactionDate, transactionAmountRemaining);
                        transactionAmountRemaining = transactionAmountRemaining.minus(feeChargesPortion);
                        break;
                    case INTEREST:
                        interestPortion = currentInstallment.payInterestComponent(transactionDate, transactionAmountRemaining);
                        transactionAmountRemaining = transactionAmountRemaining.minus(interestPortion);
                        break;
                    case PRINCIPAL:
                        principalPortion = currentInstallment.payPrincipalComponent(transactionDate, transactionAmountRemaining);
                        transactionAmountRemaining = transactionAmountRemaining.minus(principalPortion);
                        break;
                }
            }
        }

        loanTransaction.updateComponents(principalPortion, interestPortion, feeChargesPortion, penaltyChargesPortion);
        
        if (principalPortion.plus(interestPortion).plus(feeChargesPortion).plus(penaltyChargesPortion).isGreaterThanZero()) {
            transactionMappings.add(LoanTransactionToRepaymentScheduleMapping.createFrom(loanTransaction, currentInstallment,
                    principalPortion, interestPortion, feeChargesPortion, penaltyChargesPortion));
        }

        // If we have excess payment and configured to apply to future installments
        if (transactionAmountRemaining.isGreaterThanZero() && applyExcessToNextInstallment && installments != null && !installments.isEmpty()) {
            // Find next installment that has outstanding amounts
            for (LoanRepaymentScheduleInstallment installment : installments) {
                if (installment.isNotFullyPaidOff() && 
                    !installment.equals(currentInstallment) && 
                    (applyPaymentInChronologicalOrder || installment.getDueDate().isAfter(currentInstallment.getDueDate()))) {
                    
                    // Apply remaining amount to the next installment
                    transactionAmountRemaining = processFlexiblePayment(installment, installments, loanTransaction, 
                            transactionAmountRemaining, transactionMappings, charges);
                    
                    if (transactionAmountRemaining.isZero()) {
                        break;
                    }
                }
            }
        }
        
        return transactionAmountRemaining;
    }
}