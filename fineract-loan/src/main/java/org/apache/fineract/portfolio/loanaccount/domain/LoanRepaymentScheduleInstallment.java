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

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.apache.commons.lang3.StringUtils;
import org.apache.fineract.infrastructure.core.domain.AbstractAuditableWithUTCDateTimeCustom;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.core.service.MathUtil;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanScheduleModelPeriod;
import org.apache.fineract.portfolio.loanproduct.domain.AllocationType;
import org.apache.fineract.portfolio.repaymentwithpostdatedchecks.domain.PostDatedChecks;

@Getter
@Setter
@Entity
@Table(name = "m_loan_repayment_schedule")
public class LoanRepaymentScheduleInstallment extends AbstractAuditableWithUTCDateTimeCustom<Long>
        implements Comparable<LoanRepaymentScheduleInstallment> {

    @ManyToOne(optional = false)
    @JoinColumn(name = "loan_id", referencedColumnName = "id")
    private Loan loan;

    @Column(name = "installment", nullable = false)
    private Integer installmentNumber;

    @Column(name = "fromdate")
    private LocalDate fromDate;

    @Column(name = "duedate", nullable = false)
    private LocalDate dueDate;

    @Column(name = "principal_amount", scale = 6, precision = 19)
    private BigDecimal principal;

    @Column(name = "principal_completed_derived", scale = 6, precision = 19)
    private BigDecimal principalCompleted;

    @Column(name = "principal_writtenoff_derived", scale = 6, precision = 19)
    private BigDecimal principalWrittenOff;

    @Column(name = "interest_amount", scale = 6, precision = 19)
    private BigDecimal interestCharged;

    @Column(name = "interest_completed_derived", scale = 6, precision = 19)
    private BigDecimal interestPaid;

    @Column(name = "interest_waived_derived", scale = 6, precision = 19)
    private BigDecimal interestWaived;

    @Column(name = "interest_writtenoff_derived", scale = 6, precision = 19)
    private BigDecimal interestWrittenOff;

    @Column(name = "accrual_interest_derived", scale = 6, precision = 19)
    private BigDecimal interestAccrued;

    @Column(name = "reschedule_interest_portion", scale = 6, precision = 19)
    private BigDecimal rescheduleInterestPortion;

    @Column(name = "fee_charges_amount", scale = 6, precision = 19)
    private BigDecimal feeChargesCharged;

    @Column(name = "fee_charges_completed_derived", scale = 6, precision = 19)
    private BigDecimal feeChargesPaid;

    @Column(name = "fee_charges_writtenoff_derived", scale = 6, precision = 19)
    private BigDecimal feeChargesWrittenOff;

    @Column(name = "fee_charges_waived_derived", scale = 6, precision = 19)
    private BigDecimal feeChargesWaived;

    @Column(name = "accrual_fee_charges_derived", scale = 6, precision = 19)
    private BigDecimal feeAccrued;

    @Column(name = "penalty_charges_amount", scale = 6, precision = 19)
    private BigDecimal penaltyCharges;

    @Column(name = "penalty_charges_completed_derived", scale = 6, precision = 19)
    private BigDecimal penaltyChargesPaid;

    @Column(name = "penalty_charges_writtenoff_derived", scale = 6, precision = 19)
    private BigDecimal penaltyChargesWrittenOff;

    @Column(name = "penalty_charges_waived_derived", scale = 6, precision = 19)
    private BigDecimal penaltyChargesWaived;

    @Column(name = "accrual_penalty_charges_derived", scale = 6, precision = 19)
    private BigDecimal penaltyAccrued;

    @Column(name = "total_paid_in_advance_derived", scale = 6, precision = 19)
    private BigDecimal totalPaidInAdvance;

    @Column(name = "total_paid_late_derived", scale = 6, precision = 19)
    private BigDecimal totalPaidLate;

    @Column(name = "completed_derived", nullable = false)
    private boolean obligationsMet;

    @Column(name = "obligations_met_on_date")
    private LocalDate obligationsMetOnDate;

    @Column(name = "recalculated_interest_component", nullable = false)
    private boolean recalculatedInterestComponent;

    @Column(name = "is_additional", nullable = false)
    private boolean additional;

    // TODO: At some point in time this database column needs to be renamed to credited_principal using the following
    // approach
    // https://blog.thepete.net/blog/2023/12/05/expand/contract-making-a-breaking-change-without-a-big-bang/
    @Column(name = "credits_amount", scale = 6, precision = 19)
    private BigDecimal creditedPrincipal;

    @Column(name = "credited_interest", scale = 6, precision = 19)
    private BigDecimal creditedInterest;

    @Column(name = "credited_fee", scale = 6, precision = 19)
    private BigDecimal creditedFee;

    @Column(name = "credited_penalty", scale = 6, precision = 19)
    private BigDecimal creditedPenalty;

    @Column(name = "is_down_payment", nullable = false)
    private boolean isDownPayment;

    @Column(name = "is_re_aged", nullable = false)
    private boolean isReAged;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "loanRepaymentScheduleInstallment")
    private Set<LoanInterestRecalcualtionAdditionalDetails> loanCompoundingDetails = new HashSet<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "loanRepaymentScheduleInstallment")
    private Set<PostDatedChecks> postDatedChecks = new HashSet<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "installment")
    private Set<LoanInstallmentCharge> installmentCharges = new HashSet<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "installment")
    private Set<LoanTransactionToRepaymentScheduleMapping> loanTransactionToRepaymentScheduleMappings = new HashSet<>();

    public LoanRepaymentScheduleInstallment() {
        this.installmentNumber = null;
        this.fromDate = null;
        this.dueDate = null;
        this.obligationsMet = false;
    }

    public LoanRepaymentScheduleInstallment(final Loan loan, final Integer installmentNumber, final LocalDate fromDate,
            final LocalDate dueDate, final BigDecimal principal, final BigDecimal interest, final BigDecimal feeCharges,
            final BigDecimal penaltyCharges, final boolean recalculatedInterestComponent,
            final Set<LoanInterestRecalcualtionAdditionalDetails> compoundingDetails, final BigDecimal rescheduleInterestPortion) {
        this(loan, installmentNumber, fromDate, dueDate, principal, interest, feeCharges, penaltyCharges, recalculatedInterestComponent,
                compoundingDetails, rescheduleInterestPortion, false);
    }

    public LoanRepaymentScheduleInstallment(final Loan loan, final Integer installmentNumber, final LocalDate fromDate,
            final LocalDate dueDate, final BigDecimal principal, final BigDecimal interest, final BigDecimal feeCharges,
            final BigDecimal penaltyCharges, final boolean recalculatedInterestComponent,
            final Set<LoanInterestRecalcualtionAdditionalDetails> compoundingDetails, final BigDecimal rescheduleInterestPortion,
            final boolean isDownPayment) {
        this.loan = loan;
        this.installmentNumber = installmentNumber;
        this.fromDate = fromDate;
        this.dueDate = dueDate;
        this.principal = defaultToNullIfZero(principal);
        this.interestCharged = defaultToNullIfZero(interest);
        this.feeChargesCharged = defaultToNullIfZero(feeCharges);
        this.penaltyCharges = defaultToNullIfZero(penaltyCharges);
        this.obligationsMet = false;
        this.recalculatedInterestComponent = recalculatedInterestComponent;
        if (compoundingDetails != null) {
            compoundingDetails.forEach(cd -> cd.setLoanRepaymentScheduleInstallment(this));
        }
        this.loanCompoundingDetails = compoundingDetails;
        this.rescheduleInterestPortion = rescheduleInterestPortion;
        this.isDownPayment = isDownPayment;
    }

    public LoanRepaymentScheduleInstallment(final Loan loan, final Integer installmentNumber, final LocalDate fromDate,
            final LocalDate dueDate, final BigDecimal principal, final BigDecimal interest, final BigDecimal feeCharges,
            final BigDecimal penaltyCharges, final boolean recalculatedInterestComponent,
            final Set<LoanInterestRecalcualtionAdditionalDetails> compoundingDetails) {
        this.loan = loan;
        this.installmentNumber = installmentNumber;
        this.fromDate = fromDate;
        this.dueDate = dueDate;
        this.principal = defaultToNullIfZero(principal);
        this.interestCharged = defaultToNullIfZero(interest);
        this.feeChargesCharged = defaultToNullIfZero(feeCharges);
        this.penaltyCharges = defaultToNullIfZero(penaltyCharges);
        this.obligationsMet = false;
        this.recalculatedInterestComponent = recalculatedInterestComponent;
        if (compoundingDetails != null) {
            compoundingDetails.forEach(cd -> cd.setLoanRepaymentScheduleInstallment(this));
        }
        this.loanCompoundingDetails = compoundingDetails;
    }

    public LoanRepaymentScheduleInstallment(final Loan loan) {
        this.loan = loan;
        this.installmentNumber = null;
        this.fromDate = null;
        this.dueDate = null;
        this.obligationsMet = false;
    }

    public LoanRepaymentScheduleInstallment(Loan loan, Integer installmentNumber, LocalDate fromDate, LocalDate dueDate,
            BigDecimal principal, BigDecimal interestCharged, BigDecimal feeChargesCharged, BigDecimal penaltyCharges,
            BigDecimal creditedPrincipal, BigDecimal creditedInterest, BigDecimal creditedFee, BigDecimal creditedPenalty,
            boolean additional, boolean isDownPayment, boolean isReAged) {
        this.loan = loan;
        this.installmentNumber = installmentNumber;
        this.fromDate = fromDate;
        this.dueDate = dueDate;
        this.principal = principal;
        this.interestCharged = interestCharged;
        this.feeChargesCharged = feeChargesCharged;
        this.penaltyCharges = penaltyCharges;
        this.creditedPrincipal = creditedPrincipal;
        this.creditedInterest = creditedInterest;
        this.creditedFee = creditedFee;
        this.creditedPenalty = creditedPenalty;
        this.additional = additional;
        this.isDownPayment = isDownPayment;
        this.isReAged = isReAged;
    }

    public static LoanRepaymentScheduleInstallment newReAgedInstallment(final Loan loan, final Integer installmentNumber,
            final LocalDate fromDate, final LocalDate dueDate, final BigDecimal principal) {
        return new LoanRepaymentScheduleInstallment(loan, installmentNumber, fromDate, dueDate, principal, null, null, null, null, null,
                null, null, false, false, true);
    }

    public static LoanRepaymentScheduleInstallment getLastNonDownPaymentInstallment(List<LoanRepaymentScheduleInstallment> installments) {
        return installments.stream().filter(i -> !i.isDownPayment()).reduce((first, second) -> second).orElseThrow();
    }

    private BigDecimal defaultToNullIfZero(final BigDecimal value) {
        BigDecimal result = value;
        if (BigDecimal.ZERO.compareTo(value) == 0) {
            result = null;
        }
        return result;
    }

    public Money getCreditedPrincipal(final MonetaryCurrency currency) {
        return Money.of(currency, this.creditedPrincipal);
    }

    public Money getCreditedFee(final MonetaryCurrency currency) {
        return Money.of(currency, this.creditedFee);
    }

    public Money getCreditedPenalty(final MonetaryCurrency currency) {
        return Money.of(currency, this.creditedPenalty);
    }

    public Money getPrincipal(final MonetaryCurrency currency) {
        return Money.of(currency, this.principal);
    }

    public Money getPrincipalCompleted(final MonetaryCurrency currency) {
        return Money.of(currency, this.principalCompleted);
    }

    public Money getPrincipalWrittenOff(final MonetaryCurrency currency) {
        return Money.of(currency, this.principalWrittenOff);
    }

    public Money getPrincipalOutstanding(final MonetaryCurrency currency) {
        final Money principalAccountedFor = getPrincipalCompleted(currency).plus(getPrincipalWrittenOff(currency));
        return getPrincipal(currency).minus(principalAccountedFor);
    }

    public Money getInterestCharged(final MonetaryCurrency currency) {
        return Money.of(currency, this.interestCharged);
    }

    public Money getInterestPaid(final MonetaryCurrency currency) {
        return Money.of(currency, this.interestPaid);
    }

    public Money getInterestWaived(final MonetaryCurrency currency) {
        return Money.of(currency, this.interestWaived);
    }

    public Money getInterestWrittenOff(final MonetaryCurrency currency) {
        return Money.of(currency, this.interestWrittenOff);
    }

    public Money getInterestOutstanding(final MonetaryCurrency currency) {
        final Money interestAccountedFor = getInterestPaid(currency).plus(getInterestWaived(currency))
                .plus(getInterestWrittenOff(currency));
        return getInterestCharged(currency).minus(interestAccountedFor);
    }

    public Money getInterestAccrued(final MonetaryCurrency currency) {
        return Money.of(currency, this.interestAccrued);
    }

    public Money getFeeChargesCharged(final MonetaryCurrency currency) {
        return Money.of(currency, this.feeChargesCharged);
    }

    public Money getFeeChargesPaid(final MonetaryCurrency currency) {
        return Money.of(currency, this.feeChargesPaid);
    }

    public Money getFeeChargesWaived(final MonetaryCurrency currency) {
        return Money.of(currency, this.feeChargesWaived);
    }

    public Money getFeeChargesWrittenOff(final MonetaryCurrency currency) {
        return Money.of(currency, this.feeChargesWrittenOff);
    }

    public Money getFeeChargesOutstanding(final MonetaryCurrency currency) {
        final Money feeChargesAccountedFor = getFeeChargesPaid(currency).plus(getFeeChargesWaived(currency))
                .plus(getFeeChargesWrittenOff(currency));
        return getFeeChargesCharged(currency).minus(feeChargesAccountedFor);
    }

    public Money getFeeAccrued(final MonetaryCurrency currency) {
        return Money.of(currency, this.feeAccrued);
    }

    public Money getPenaltyChargesCharged(final MonetaryCurrency currency) {
        return Money.of(currency, this.penaltyCharges);
    }

    public Money getPenaltyChargesPaid(final MonetaryCurrency currency) {
        return Money.of(currency, this.penaltyChargesPaid);
    }

    public Money getPenaltyChargesWaived(final MonetaryCurrency currency) {
        return Money.of(currency, this.penaltyChargesWaived);
    }

    public Money getPenaltyChargesWrittenOff(final MonetaryCurrency currency) {
        return Money.of(currency, this.penaltyChargesWrittenOff);
    }

    public Money getPenaltyChargesOutstanding(final MonetaryCurrency currency) {
        final Money feeChargesAccountedFor = getPenaltyChargesPaid(currency).plus(getPenaltyChargesWaived(currency))
                .plus(getPenaltyChargesWrittenOff(currency));
        return getPenaltyChargesCharged(currency).minus(feeChargesAccountedFor);
    }

    public Money getPenaltyAccrued(final MonetaryCurrency currency) {
        return Money.of(currency, this.penaltyAccrued);
    }

    public boolean isInterestDue(final MonetaryCurrency currency) {
        return getInterestOutstanding(currency).isGreaterThanZero();
    }

    public Money getTotalOutstanding(final MonetaryCurrency currency) {
        return getPrincipalOutstanding(currency).plus(getInterestOutstanding(currency)).plus(getFeeChargesOutstanding(currency))
                .plus(getPenaltyChargesOutstanding(currency));
    }

    void updateLoan(final Loan loan) {
        this.loan = loan;
    }

    public boolean isNotFullyPaidOff() {
        return !this.obligationsMet;
    }

    @Override
    public int compareTo(LoanRepaymentScheduleInstallment o) {
        return this.installmentNumber.compareTo(o.installmentNumber);
    }

    public int compareToByDueDate(LoanRepaymentScheduleInstallment o) {
        return this.dueDate.compareTo(o.dueDate);
    }

    public boolean isPrincipalNotCompleted(final MonetaryCurrency currency) {
        return !isPrincipalCompleted(currency);
    }

    public boolean isPrincipalCompleted(final MonetaryCurrency currency) {
        return getPrincipalOutstanding(currency).isZero();
    }

    public void resetDerivedComponents() {
        this.principalCompleted = null;
        this.principalWrittenOff = null;
        this.interestPaid = null;
        this.interestWaived = null;
        this.interestWrittenOff = null;
        this.feeChargesPaid = null;
        this.feeChargesWaived = null;
        this.feeChargesWrittenOff = null;
        this.penaltyChargesPaid = null;
        this.penaltyChargesWaived = null;
        this.penaltyChargesWrittenOff = null;
        this.totalPaidInAdvance = null;
        this.totalPaidLate = null;

        this.obligationsMet = false;
        this.obligationsMetOnDate = null;
        if (this.creditedPrincipal != null) {
            this.principal = this.principal.subtract(this.creditedPrincipal);
            this.creditedPrincipal = null;
        }
        if (this.creditedInterest != null) {
            this.interestCharged = this.interestCharged.subtract(this.creditedInterest);
            this.creditedInterest = null;
        }
        if (this.creditedFee != null) {
            this.feeChargesCharged = this.feeChargesCharged.subtract(this.creditedFee);
            this.creditedFee = null;
        }
        if (this.creditedPenalty != null) {
            this.penaltyCharges = this.penaltyCharges.subtract(this.creditedPenalty);
            this.creditedPenalty = null;
        }
    }

    public void resetAccrualComponents() {
        this.interestAccrued = null;
        this.feeAccrued = null;
        this.penaltyAccrued = null;
    }

    public void resetChargesCharged() {
        this.feeChargesCharged = null;
        this.penaltyCharges = null;
    }

    public interface PaymentFunction {

        Money accept(LocalDate transactionDate, Money transactionAmountRemaining);
    }

    public PaymentFunction getPaymentFunction(AllocationType allocationType, PaymentAction action) {
        return switch (allocationType) {
            case PENALTY -> PaymentAction.PAY.equals(action) ? this::payPenaltyChargesComponent
                    : PaymentAction.UNPAY.equals(action) ? this::unpayPenaltyChargesComponent : null;
            case FEE -> PaymentAction.PAY.equals(action) ? this::payFeeChargesComponent
                    : PaymentAction.UNPAY.equals(action) ? this::unpayFeeChargesComponent : null;
            case INTEREST -> PaymentAction.PAY.equals(action) ? this::payInterestComponent
                    : PaymentAction.UNPAY.equals(action) ? this::unpayInterestComponent : null;
            case PRINCIPAL -> PaymentAction.PAY.equals(action) ? this::payPrincipalComponent
                    : PaymentAction.UNPAY.equals(action) ? this::unpayPrincipalComponent : null;
        };
    }

    public Money payPenaltyChargesComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {

        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money penaltyPortionOfTransaction = Money.zero(currency);

        if (transactionAmountRemaining.isZero()) {
            return penaltyPortionOfTransaction;
        }

        final Money penaltyChargesDue = getPenaltyChargesOutstanding(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(penaltyChargesDue)) {
            this.penaltyChargesPaid = getPenaltyChargesPaid(currency).plus(penaltyChargesDue).getAmount();
            penaltyPortionOfTransaction = penaltyPortionOfTransaction.plus(penaltyChargesDue);
        } else {
            this.penaltyChargesPaid = getPenaltyChargesPaid(currency).plus(transactionAmountRemaining).getAmount();
            penaltyPortionOfTransaction = penaltyPortionOfTransaction.plus(transactionAmountRemaining);
        }

        this.penaltyChargesPaid = defaultToNullIfZero(this.penaltyChargesPaid);

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        trackAdvanceAndLateTotalsForRepaymentPeriod(transactionDate, currency, penaltyPortionOfTransaction);

        return penaltyPortionOfTransaction;
    }

    public Money payFeeChargesComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {

        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money feePortionOfTransaction = Money.zero(currency);
        if (transactionAmountRemaining.isZero()) {
            return feePortionOfTransaction;
        }
        final Money feeChargesDue = getFeeChargesOutstanding(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(feeChargesDue)) {
            this.feeChargesPaid = getFeeChargesPaid(currency).plus(feeChargesDue).getAmount();
            feePortionOfTransaction = feePortionOfTransaction.plus(feeChargesDue);
        } else {
            this.feeChargesPaid = getFeeChargesPaid(currency).plus(transactionAmountRemaining).getAmount();
            feePortionOfTransaction = feePortionOfTransaction.plus(transactionAmountRemaining);
        }

        this.feeChargesPaid = defaultToNullIfZero(this.feeChargesPaid);

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        trackAdvanceAndLateTotalsForRepaymentPeriod(transactionDate, currency, feePortionOfTransaction);

        return feePortionOfTransaction;
    }

    public Money payInterestComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {

        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money interestPortionOfTransaction = Money.zero(currency);
        if (transactionAmountRemaining.isZero()) {
            return interestPortionOfTransaction;
        }
        final Money interestDue = getInterestOutstanding(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(interestDue)) {
            this.interestPaid = getInterestPaid(currency).plus(interestDue).getAmount();
            interestPortionOfTransaction = interestPortionOfTransaction.plus(interestDue);
        } else {
            this.interestPaid = getInterestPaid(currency).plus(transactionAmountRemaining).getAmount();
            interestPortionOfTransaction = interestPortionOfTransaction.plus(transactionAmountRemaining);
        }

        this.interestPaid = defaultToNullIfZero(this.interestPaid);

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        trackAdvanceAndLateTotalsForRepaymentPeriod(transactionDate, currency, interestPortionOfTransaction);

        return interestPortionOfTransaction;
    }

    public Money payPrincipalComponent(final LocalDate transactionDate, final Money transactionAmount) {

        final MonetaryCurrency currency = transactionAmount.getCurrency();
        Money principalPortionOfTransaction = Money.zero(currency);
        if (transactionAmount.isZero()) {
            return principalPortionOfTransaction;
        }
        final Money principalDue = getPrincipalOutstanding(currency);
        if (transactionAmount.isGreaterThanOrEqualTo(principalDue)) {
            this.principalCompleted = getPrincipalCompleted(currency).plus(principalDue).getAmount();
            principalPortionOfTransaction = principalPortionOfTransaction.plus(principalDue);
        } else {
            this.principalCompleted = getPrincipalCompleted(currency).plus(transactionAmount).getAmount();
            principalPortionOfTransaction = principalPortionOfTransaction.plus(transactionAmount);
        }

        this.principalCompleted = defaultToNullIfZero(this.principalCompleted);

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        trackAdvanceAndLateTotalsForRepaymentPeriod(transactionDate, currency, principalPortionOfTransaction);

        return principalPortionOfTransaction;
    }

    public Money waiveInterestComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {
        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money waivedInterestPortionOfTransaction = Money.zero(currency);
        if (transactionAmountRemaining.isZero()) {
            return waivedInterestPortionOfTransaction;
        }
        final Money interestDue = getInterestOutstanding(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(interestDue)) {
            this.interestWaived = getInterestWaived(currency).plus(interestDue).getAmount();
            waivedInterestPortionOfTransaction = waivedInterestPortionOfTransaction.plus(interestDue);
        } else {
            this.interestWaived = getInterestWaived(currency).plus(transactionAmountRemaining).getAmount();
            waivedInterestPortionOfTransaction = waivedInterestPortionOfTransaction.plus(transactionAmountRemaining);
        }

        this.interestWaived = defaultToNullIfZero(this.interestWaived);

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return waivedInterestPortionOfTransaction;
    }

    public Money waivePenaltyChargesComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {
        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money waivedPenaltyChargesPortionOfTransaction = Money.zero(currency);
        if (transactionAmountRemaining.isZero()) {
            return waivedPenaltyChargesPortionOfTransaction;
        }
        final Money penanltiesDue = getPenaltyChargesOutstanding(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(penanltiesDue)) {
            this.penaltyChargesWaived = getPenaltyChargesWaived(currency).plus(penanltiesDue).getAmount();
            waivedPenaltyChargesPortionOfTransaction = waivedPenaltyChargesPortionOfTransaction.plus(penanltiesDue);
        } else {
            this.penaltyChargesWaived = getPenaltyChargesWaived(currency).plus(transactionAmountRemaining).getAmount();
            waivedPenaltyChargesPortionOfTransaction = waivedPenaltyChargesPortionOfTransaction.plus(transactionAmountRemaining);
        }

        this.penaltyChargesWaived = defaultToNullIfZero(this.penaltyChargesWaived);

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return waivedPenaltyChargesPortionOfTransaction;
    }

    public Money waiveFeeChargesComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {
        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money waivedFeeChargesPortionOfTransaction = Money.zero(currency);
        if (transactionAmountRemaining.isZero()) {
            return waivedFeeChargesPortionOfTransaction;
        }
        final Money feesDue = getFeeChargesOutstanding(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(feesDue)) {
            this.feeChargesWaived = getFeeChargesWaived(currency).plus(feesDue).getAmount();
            waivedFeeChargesPortionOfTransaction = waivedFeeChargesPortionOfTransaction.plus(feesDue);
        } else {
            this.feeChargesWaived = getFeeChargesWaived(currency).plus(transactionAmountRemaining).getAmount();
            waivedFeeChargesPortionOfTransaction = waivedFeeChargesPortionOfTransaction.plus(transactionAmountRemaining);
        }

        this.feeChargesWaived = defaultToNullIfZero(this.feeChargesWaived);

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return waivedFeeChargesPortionOfTransaction;
    }

    public Money writeOffOutstandingPrincipal(final LocalDate transactionDate, final MonetaryCurrency currency) {

        final Money principalDue = getPrincipalOutstanding(currency);
        this.principalWrittenOff = defaultToNullIfZero(principalDue.getAmount());

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return principalDue;
    }

    public Money writeOffOutstandingInterest(final LocalDate transactionDate, final MonetaryCurrency currency) {

        final Money interestDue = getInterestOutstanding(currency);
        this.interestWrittenOff = defaultToNullIfZero(interestDue.getAmount());

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return interestDue;
    }

    public Money writeOffOutstandingFeeCharges(final LocalDate transactionDate, final MonetaryCurrency currency) {
        final Money feeChargesOutstanding = getFeeChargesOutstanding(currency);
        this.feeChargesWrittenOff = defaultToNullIfZero(feeChargesOutstanding.getAmount());

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return feeChargesOutstanding;
    }

    public Money writeOffOutstandingPenaltyCharges(final LocalDate transactionDate, final MonetaryCurrency currency) {
        final Money penaltyChargesOutstanding = getPenaltyChargesOutstanding(currency);
        this.penaltyChargesWrittenOff = defaultToNullIfZero(penaltyChargesOutstanding.getAmount());

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return penaltyChargesOutstanding;
    }

    public boolean isOverdueOn(final LocalDate date) {
        return DateUtils.isAfter(date, getDueDate());
    }

    public void updateChargePortion(final Money feeChargesDue, final Money feeChargesWaived, final Money feeChargesWrittenOff,
            final Money penaltyChargesDue, final Money penaltyChargesWaived, final Money penaltyChargesWrittenOff) {
        this.feeChargesCharged = MathUtil.zeroToNull(MathUtil.toBigDecimal(feeChargesDue));
        this.feeChargesWaived = MathUtil.zeroToNull(MathUtil.toBigDecimal(feeChargesWaived));
        this.feeChargesWrittenOff = MathUtil.zeroToNull(MathUtil.toBigDecimal(feeChargesWrittenOff));
        this.penaltyCharges = MathUtil.zeroToNull(MathUtil.toBigDecimal(penaltyChargesDue));
        this.penaltyChargesWaived = MathUtil.zeroToNull(MathUtil.toBigDecimal(penaltyChargesWaived));
        this.penaltyChargesWrittenOff = MathUtil.zeroToNull(MathUtil.toBigDecimal(penaltyChargesWrittenOff));
    }

    public void addToChargePortion(final Money feeChargesDue, final Money feeChargesWaived, final Money feeChargesWrittenOff,
            final Money penaltyChargesDue, final Money penaltyChargesWaived, final Money penaltyChargesWrittenOff) {
        this.feeChargesCharged = MathUtil.zeroToNull(MathUtil.add(MathUtil.toBigDecimal(feeChargesDue), this.feeChargesCharged));
        this.feeChargesWaived = MathUtil.zeroToNull(MathUtil.add(MathUtil.toBigDecimal(feeChargesWaived), this.feeChargesWaived));
        this.feeChargesWrittenOff = MathUtil
                .zeroToNull(MathUtil.add(MathUtil.toBigDecimal(feeChargesWrittenOff), this.feeChargesWrittenOff));
        this.penaltyCharges = MathUtil.zeroToNull(MathUtil.add(MathUtil.toBigDecimal(penaltyChargesDue), this.penaltyCharges));
        this.penaltyChargesWaived = MathUtil
                .zeroToNull(MathUtil.add(MathUtil.toBigDecimal(penaltyChargesWaived), this.penaltyChargesWaived));
        this.penaltyChargesWrittenOff = MathUtil
                .zeroToNull(MathUtil.add(MathUtil.toBigDecimal(penaltyChargesWrittenOff), this.penaltyChargesWrittenOff));
        checkIfRepaymentPeriodObligationsAreMet(getObligationsMetOnDate(), feeChargesDue.getCurrency());
    }

    public void updateAccrualPortion(final Money interest, final Money feeCharges, final Money penalityCharges) {
        this.interestAccrued = MathUtil.zeroToNull(MathUtil.toBigDecimal(interest));
        this.feeAccrued = MathUtil.zeroToNull(MathUtil.toBigDecimal(feeCharges));
        this.penaltyAccrued = MathUtil.zeroToNull(MathUtil.toBigDecimal(penalityCharges));
    }

    public void updateObligationsMet(final MonetaryCurrency currency, final LocalDate transactionDate) {
        if (!this.obligationsMet && getTotalOutstanding(currency).isZero()) {
            this.obligationsMet = true;
            this.obligationsMetOnDate = transactionDate;
        } else if (this.obligationsMet && !getTotalOutstanding(currency).isZero()) {
            this.obligationsMet = false;
            this.obligationsMetOnDate = null;
        }
    }

    private void trackAdvanceAndLateTotalsForRepaymentPeriod(final LocalDate transactionDate, final MonetaryCurrency currency,
            final Money amountPaidInRepaymentPeriod) {
        if (isInAdvance(transactionDate)) {
            this.totalPaidInAdvance = asMoney(this.totalPaidInAdvance, currency).plus(amountPaidInRepaymentPeriod).getAmount();
        } else if (isLatePayment(transactionDate)) {
            this.totalPaidLate = asMoney(this.totalPaidLate, currency).plus(amountPaidInRepaymentPeriod).getAmount();
        }
    }

    private Money asMoney(final BigDecimal decimal, final MonetaryCurrency currency) {
        return Money.of(currency, decimal);
    }

    private boolean isInAdvance(final LocalDate transactionDate) {
        return DateUtils.isBefore(transactionDate, getDueDate());
    }

    private boolean isLatePayment(final LocalDate transactionDate) {
        return DateUtils.isAfter(transactionDate, getDueDate());
    }

    public void checkIfRepaymentPeriodObligationsAreMet(final LocalDate transactionDate, final MonetaryCurrency currency) {
        this.obligationsMet = getTotalOutstanding(currency).isZero();
        if (this.obligationsMet) {
            this.obligationsMetOnDate = transactionDate;
        } else {
            this.obligationsMetOnDate = null;
        }
    }

    public void updateDueDate(final LocalDate newDueDate) {
        if (newDueDate != null) {
            this.dueDate = newDueDate;
        }
    }

    public void updateFromDate(final LocalDate newFromDate) {
        if (newFromDate != null) {
            this.fromDate = newFromDate;
        }
    }

    public Money getTotalPaidInAdvance(final MonetaryCurrency currency) {
        return Money.of(currency, this.totalPaidInAdvance);
    }

    public void updateInstallmentNumber(final Integer installmentNumber) {
        if (installmentNumber != null) {
            this.installmentNumber = installmentNumber;
        }
    }

    public void updateInterestCharged(final BigDecimal interestCharged) {
        this.interestCharged = interestCharged;
    }

    public void updateObligationMet(final Boolean obligationMet) {
        this.obligationsMet = obligationMet;
    }

    public void updateObligationMetOnDate(final LocalDate obligationsMetOnDate) {
        this.obligationsMetOnDate = obligationsMetOnDate;
    }

    public void updatePrincipal(final BigDecimal principal) {
        this.principal = principal;
    }

    public void addToPrincipal(final LocalDate transactionDate, final Money transactionAmount) {
        if (this.principal == null) {
            this.principal = transactionAmount.getAmount();
        } else {
            this.principal = this.principal.add(transactionAmount.getAmount());
        }
        checkIfRepaymentPeriodObligationsAreMet(transactionDate, transactionAmount.getCurrency());
    }

    public void addToInterest(final LocalDate transactionDate, final Money transactionAmount) {
        if (this.interestCharged == null) {
            this.interestCharged = transactionAmount.getAmount();
        } else {
            this.interestCharged = this.interestCharged.add(transactionAmount.getAmount());
        }
        checkIfRepaymentPeriodObligationsAreMet(transactionDate, transactionAmount.getCurrency());
    }

    public void addToCreditedInterest(final BigDecimal amount) {
        if (this.creditedInterest == null) {
            this.creditedInterest = amount;
        } else {
            this.creditedInterest = this.creditedInterest.add(amount);
        }
    }

    public void addToCreditedPrincipal(final BigDecimal amount) {
        if (this.creditedPrincipal == null) {
            this.creditedPrincipal = amount;
        } else {
            this.creditedPrincipal = this.creditedPrincipal.add(amount);
        }
    }

    public void addToCreditedFee(final BigDecimal amount) {
        if (this.creditedFee == null) {
            this.creditedFee = amount;
        } else {
            this.creditedFee = this.creditedFee.add(amount);
        }
    }

    public void addToCreditedPenalty(final BigDecimal amount) {
        if (this.creditedPenalty == null) {
            this.creditedPenalty = amount;
        } else {
            this.creditedPenalty = this.creditedPenalty.add(amount);
        }
    }

    /********** UNPAY COMPONENTS ****/

    public Money unpayPenaltyChargesComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {

        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money penaltyPortionOfTransactionDeducted;

        final Money penaltyChargesCompleted = getPenaltyChargesPaid(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(penaltyChargesCompleted)) {
            this.penaltyChargesPaid = Money.zero(currency).getAmount();
            penaltyPortionOfTransactionDeducted = penaltyChargesCompleted;
        } else {
            this.penaltyChargesPaid = penaltyChargesCompleted.minus(transactionAmountRemaining).getAmount();
            penaltyPortionOfTransactionDeducted = transactionAmountRemaining;
        }

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        return penaltyPortionOfTransactionDeducted;
    }

    public Money unpayFeeChargesComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {

        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money feePortionOfTransactionDeducted;

        final Money feeChargesCompleted = getFeeChargesPaid(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(feeChargesCompleted)) {
            this.feeChargesPaid = Money.zero(currency).getAmount();
            feePortionOfTransactionDeducted = feeChargesCompleted;
        } else {
            this.feeChargesPaid = feeChargesCompleted.minus(transactionAmountRemaining).getAmount();
            feePortionOfTransactionDeducted = transactionAmountRemaining;
        }

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        reduceAdvanceAndLateTotalsForRepaymentPeriod(transactionDate, currency, feePortionOfTransactionDeducted);

        return feePortionOfTransactionDeducted;
    }

    public Money unpayInterestComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {

        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money interestPortionOfTransactionDeducted;

        final Money interestCompleted = getInterestPaid(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(interestCompleted)) {
            this.interestPaid = Money.zero(currency).getAmount();
            interestPortionOfTransactionDeducted = interestCompleted;
        } else {
            this.interestPaid = interestCompleted.minus(transactionAmountRemaining).getAmount();
            interestPortionOfTransactionDeducted = transactionAmountRemaining;
        }

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        reduceAdvanceAndLateTotalsForRepaymentPeriod(transactionDate, currency, interestPortionOfTransactionDeducted);

        return interestPortionOfTransactionDeducted;
    }

    public Money unpayPrincipalComponent(final LocalDate transactionDate, final Money transactionAmountRemaining) {

        final MonetaryCurrency currency = transactionAmountRemaining.getCurrency();
        Money principalPortionOfTransactionDeducted;

        final Money principalCompleted = getPrincipalCompleted(currency);
        if (transactionAmountRemaining.isGreaterThanOrEqualTo(principalCompleted)) {
            this.principalCompleted = Money.zero(currency).getAmount();
            principalPortionOfTransactionDeducted = principalCompleted;
        } else {
            this.principalCompleted = principalCompleted.minus(transactionAmountRemaining).getAmount();
            principalPortionOfTransactionDeducted = transactionAmountRemaining;
        }

        checkIfRepaymentPeriodObligationsAreMet(transactionDate, currency);

        reduceAdvanceAndLateTotalsForRepaymentPeriod(transactionDate, currency, principalPortionOfTransactionDeducted);

        return principalPortionOfTransactionDeducted;
    }

    private void reduceAdvanceAndLateTotalsForRepaymentPeriod(final LocalDate transactionDate, final MonetaryCurrency currency,
            final Money amountDeductedInRepaymentPeriod) {

        if (isInAdvance(transactionDate)) {
            Money mTotalPaidInAdvance = Money.of(currency, this.totalPaidInAdvance);

            if (mTotalPaidInAdvance.isLessThan(amountDeductedInRepaymentPeriod)
                    || mTotalPaidInAdvance.isEqualTo(amountDeductedInRepaymentPeriod)) {
                this.totalPaidInAdvance = Money.zero(currency).getAmount();
            } else {
                this.totalPaidInAdvance = mTotalPaidInAdvance.minus(amountDeductedInRepaymentPeriod).getAmount();
            }
        } else if (isLatePayment(transactionDate)) {
            Money mTotalPaidLate = Money.of(currency, this.totalPaidLate);

            if (mTotalPaidLate.isLessThan(amountDeductedInRepaymentPeriod) || mTotalPaidLate.isEqualTo(amountDeductedInRepaymentPeriod)) {
                this.totalPaidLate = Money.zero(currency).getAmount();
            } else {
                this.totalPaidLate = mTotalPaidLate.minus(amountDeductedInRepaymentPeriod).getAmount();
            }
        }
    }

    public void updateCredits(final LocalDate transactionDate, final Money transactionAmount) {
        addToCreditedPrincipal(transactionAmount.getAmount());
        addToPrincipal(transactionDate, transactionAmount);
    }

    public Money getDue(MonetaryCurrency currency) {
        return getPrincipal(currency).plus(getInterestCharged(currency)).plus(getFeeChargesCharged(currency))
                .plus(getPenaltyChargesCharged(currency));
    }

    public Money getTotalPaid(final MonetaryCurrency currency) {
        return getPenaltyChargesPaid(currency).plus(getFeeChargesPaid(currency)).plus(getInterestPaid(currency))
                .plus(getPrincipalCompleted(currency));
    }

    public void markAsAdditional() {
        this.additional = true;
    }

    public void resetBalances() {
        resetDerivedComponents();
        resetPrincipalDue();
        resetChargesCharged();
        resetInterestDue();
    }

    public void resetInterestDue() {
        this.interestCharged = null;
    }

    public void resetPrincipalDue() {
        this.principal = null;
    }

    public enum PaymentAction {
        PAY, UNPAY
    }

    public boolean isTransactionDateWithinPeriod(LocalDate referenceDate) {
        return DateUtils.isAfter(referenceDate, getFromDate()) && !DateUtils.isAfter(referenceDate, getDueDate());
    }

    public boolean isDueBalanceZero() {
        return MathUtil.isZero(
                MathUtil.nullToZero(MathUtil.add(getPrincipal(), getInterestCharged(), getFeeChargesCharged(), getPenaltyCharges())));
    }

    public void copyFrom(final LoanScheduleModelPeriod period) {
        // Reset fields and relations
        resetBalances();
        updateLoanCompoundingDetails(period.getLoanCompoundingDetails());
        getInstallmentCharges().clear();
        getPostDatedChecks().clear();
        getLoanTransactionToRepaymentScheduleMappings().clear();
        // Update fields
        setFromDate(period.periodFromDate());
        setDueDate(period.periodDueDate());
        setPrincipal(period.principalDue());
        setInterestCharged(period.interestDue());
        setFeeChargesCharged(period.feeChargesDue());
        setPenaltyCharges(period.penaltyChargesDue());
        setRecalculatedInterestComponent(period.isRecalculatedInterestComponent());
        setRescheduleInterestPortion(period.rescheduleInterestPortion());
        setDownPayment(period.isDownPaymentPeriod());
        setAdditional(false);
        setReAged(false);
    }

    public void copyFrom(final LoanRepaymentScheduleInstallment installment) {
        if (getId().equals(installment.getId())) {
            return;
        }
        // Reset balances
        resetBalances();
        // Dates
        setFromDate(installment.getFromDate());
        setDueDate(installment.getDueDate());
        setObligationsMetOnDate(installment.getObligationsMetOnDate());
        // Flags
        setObligationsMet(installment.isObligationsMet());
        setAdditional(installment.isAdditional());
        setReAged(installment.isReAged());
        setDownPayment(installment.isDownPayment());
        // Principal
        setPrincipal(installment.getPrincipal());
        setPrincipalCompleted(installment.getPrincipalCompleted());
        setPrincipalWrittenOff(installment.getPrincipalWrittenOff());
        // Interest
        setInterestCharged(installment.getInterestCharged());
        setInterestAccrued(installment.getInterestAccrued());
        setInterestPaid(installment.getInterestPaid());
        setInterestWaived(installment.getInterestWaived());
        setInterestWrittenOff(installment.getInterestWrittenOff());
        setRescheduleInterestPortion(installment.getRescheduleInterestPortion());
        setRecalculatedInterestComponent(installment.isRecalculatedInterestComponent());
        // Fee
        setFeeChargesCharged(installment.getFeeChargesCharged());
        setFeeChargesPaid(installment.getFeeChargesPaid());
        setFeeAccrued(installment.getFeeAccrued());
        setFeeChargesWaived(installment.getFeeChargesWaived());
        setFeeChargesWrittenOff(installment.getFeeChargesWrittenOff());
        // Penalty
        setPenaltyCharges(installment.getPenaltyCharges());
        setPenaltyAccrued(installment.getPenaltyAccrued());
        setPenaltyChargesWaived(installment.getPenaltyChargesWaived());
        setPenaltyChargesPaid(installment.getPenaltyChargesPaid());
        setPenaltyChargesWrittenOff(installment.getPenaltyChargesWrittenOff());
        // paid in advance / late
        setTotalPaidInAdvance(installment.getTotalPaidInAdvance());
        setTotalPaidLate(installment.getTotalPaidLate());
        // Credits (Chargeback)
        setCreditedFee(installment.getCreditedFee());
        setCreditedPenalty(installment.getCreditedPenalty());
        setCreditedInterest(installment.getCreditedInterest());
        setCreditedPrincipal(installment.getCreditedPrincipal());
        // Compounding details
        updateLoanCompoundingDetails(installment.getLoanCompoundingDetails());
        // Installment charges
        updateLoaInstallmentCharges(installment.getInstallmentCharges());
        // Post dated checks
        updatePostDatedChecks(installment.getPostDatedChecks());
        // Loan transaction repayment schedule mapping
        updateTransactionRepaymentScheduleMapping(installment.getLoanTransactionToRepaymentScheduleMappings());
    }

    private void updateLoanCompoundingDetails(Set<LoanInterestRecalcualtionAdditionalDetails> loanCompoundingDetails) {
        Set<LoanInterestRecalcualtionAdditionalDetails> retainedLoanCompoundingDetails = new HashSet<>();
        if (loanCompoundingDetails != null) {
            loanCompoundingDetails.forEach(nlcd -> {
                nlcd.setLoanRepaymentScheduleInstallment(this);
                getLoanCompoundingDetails().stream().filter(lcd -> MathUtil.isEqualTo(lcd.getAmount(), nlcd.getAmount()) //
                        && DateUtils.isEqual(lcd.getEffectiveDate(), nlcd.getEffectiveDate())) //
                        .findAny().ifPresentOrElse(retainedLoanCompoundingDetails::add, () -> retainedLoanCompoundingDetails.add(nlcd));
            });
        }
        setLoanCompoundingDetails(retainedLoanCompoundingDetails);
    }

    private void updateLoaInstallmentCharges(Set<LoanInstallmentCharge> installmentCharges) {
        Set<LoanInstallmentCharge> retainedInstallmentCharges = new HashSet<>();
        if (installmentCharges != null) {
            installmentCharges.forEach(nic -> {
                nic.setInstallment(this);
                getInstallmentCharges().stream().filter(ic -> MathUtil.isEqualTo(ic.getAmountOutstanding(), nic.getAmountOutstanding()) //
                        && MathUtil.isEqualTo(ic.getAmountWrittenOff(), nic.getAmountWrittenOff()) //
                        && MathUtil.isEqualTo(ic.getAmountPaid(), nic.getAmountPaid()) //
                        && MathUtil.isEqualTo(ic.getAmountThroughChargePayment(), nic.getAmountThroughChargePayment()) //
                        && MathUtil.isEqualTo(ic.getAmountWaived(), nic.getAmountWaived()) //
                        && MathUtil.isEqualTo(ic.getAmount(), nic.getAmount()) //
                        && Boolean.logicalAnd(ic.isPaid(), nic.isPaid()) //
                        && Boolean.logicalAnd(ic.isWaived(), nic.isWaived()) //
                        && Boolean.logicalAnd(ic.isPending(), nic.isPending())) //
                        .findAny().ifPresentOrElse(retainedInstallmentCharges::add, () -> retainedInstallmentCharges.add(nic));
            });
        }
        setInstallmentCharges(retainedInstallmentCharges);
    }

    private void updatePostDatedChecks(Set<PostDatedChecks> postDatedChecks) {
        Set<PostDatedChecks> retainedPostDatedChecks = new HashSet<>();
        if (postDatedChecks != null) {
            postDatedChecks.forEach(npdc -> {
                npdc.setLoanRepaymentScheduleInstallment(this);
                getPostDatedChecks().stream().filter(pdc -> MathUtil.isEqualTo(pdc.getCheckNo(), npdc.getCheckNo()) //
                        && MathUtil.isEqualTo(pdc.getAccountNo(), npdc.getAccountNo()) //
                        && MathUtil.isEqualTo(pdc.getAmount(), npdc.getAmount()) //
                        && StringUtils.equals(pdc.getBankName(), npdc.getBankName()) //
                        && MathUtil.isEqualTo(pdc.getStatus(), npdc.getStatus()) //
                        && DateUtils.isEqual(pdc.getRepaymentDate(), npdc.getRepaymentDate())) //
                        .findAny().ifPresentOrElse(retainedPostDatedChecks::add, () -> retainedPostDatedChecks.add(npdc));
            });
        }
        setPostDatedChecks(retainedPostDatedChecks);
    }

    private void updateTransactionRepaymentScheduleMapping(
            Set<LoanTransactionToRepaymentScheduleMapping> transactionToRepaymentScheduleMappings) {
        Set<LoanTransactionToRepaymentScheduleMapping> retainedTransactionRepaymentScheduleMapping = new HashSet<>();
        if (transactionToRepaymentScheduleMappings != null) {
            transactionToRepaymentScheduleMappings.forEach(ntrsm -> {
                ntrsm.setInstallment(this);
                getLoanTransactionToRepaymentScheduleMappings().stream()
                        .filter(trsm -> MathUtil.isEqualTo(trsm.getAmount(), ntrsm.getAmount()) //
                                && MathUtil.isEqualTo(trsm.getFeeChargesPortion(), ntrsm.getFeeChargesPortion()) //
                                && MathUtil.isEqualTo(trsm.getInterestPortion(), ntrsm.getInterestPortion()) //
                                && MathUtil.isEqualTo(trsm.getPrincipalPortion(), ntrsm.getPrincipalPortion()) //
                                && MathUtil.isEqualTo(trsm.getPenaltyChargesPortion(), ntrsm.getPenaltyChargesPortion())) //
                        .findAny().ifPresentOrElse(retainedTransactionRepaymentScheduleMapping::add,
                                () -> retainedTransactionRepaymentScheduleMapping.add(ntrsm));
            });
        }
        setLoanTransactionToRepaymentScheduleMappings(retainedTransactionRepaymentScheduleMapping);
    }
}
