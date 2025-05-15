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
package org.apache.fineract.portfolio.savings.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.apache.fineract.infrastructure.core.domain.AbstractAuditableWithUTCDateTimeCustom;
import org.apache.fineract.infrastructure.core.service.DateUtils;

/**
 * Entity representing a fixed deposit transaction, which is linked to a savings account transaction
 * and provides additional fixed deposit specific transaction details.
 */
@Entity
@Table(name = "fixed_deposit_transaction")
@Getter
@Setter
@NoArgsConstructor
public class FixedDepositTransaction extends AbstractAuditableWithUTCDateTimeCustom {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "savings_account_transaction_id", nullable = false)
    private SavingsAccountTransaction savingsAccountTransaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fixed_deposit_account_id", nullable = false)
    private FixedDepositAccount fixedDepositAccount;

    @Column(name = "transaction_type", nullable = false)
    private String transactionType;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "interest_portion")
    private BigDecimal interestPortion;

    @Column(name = "fee_charges_portion")
    private BigDecimal feeChargesPortion;

    @Column(name = "penalty_charges_portion")
    private BigDecimal penaltyChargesPortion;
    
    @Column(name = "overpayment_portion")
    private BigDecimal overpaymentPortion;

    @Column(name = "balance_after_transaction")
    private BigDecimal balanceAfterTransaction;

    @Column(name = "is_reversed", nullable = false)
    private boolean reversed;

    /**
     * Creates a new fixed deposit transaction.
     * 
     * @param savingsAccountTransaction The linked savings account transaction
     * @param fixedDepositAccount The fixed deposit account
     * @param transactionType The type of transaction (deposit, withdrawal, interest_posting, etc.)
     * @param amount The total transaction amount
     * @param interestPortion The interest portion of the transaction
     * @param feeChargesPortion The fee charges portion of the transaction
     * @param penaltyChargesPortion The penalty charges portion of the transaction
     * @param overpaymentPortion The overpayment portion of the transaction
     * @param balanceAfterTransaction The account balance after the transaction
     * @param isReversed Whether the transaction is reversed
     * @return A new FixedDepositTransaction instance
     */
    public static FixedDepositTransaction createNew(
            SavingsAccountTransaction savingsAccountTransaction,
            FixedDepositAccount fixedDepositAccount,
            String transactionType,
            BigDecimal amount,
            BigDecimal interestPortion,
            BigDecimal feeChargesPortion,
            BigDecimal penaltyChargesPortion,
            BigDecimal overpaymentPortion,
            BigDecimal balanceAfterTransaction,
            boolean isReversed) {
        
        FixedDepositTransaction transaction = new FixedDepositTransaction();
        transaction.id = UUID.randomUUID().toString();
        transaction.savingsAccountTransaction = savingsAccountTransaction;
        transaction.fixedDepositAccount = fixedDepositAccount;
        transaction.transactionType = transactionType;
        transaction.amount = amount;
        transaction.interestPortion = interestPortion;
        transaction.feeChargesPortion = feeChargesPortion;
        transaction.penaltyChargesPortion = penaltyChargesPortion;
        transaction.overpaymentPortion = overpaymentPortion;
        transaction.balanceAfterTransaction = balanceAfterTransaction;
        transaction.reversed = isReversed;
        
        transaction.setCreatedDate(DateUtils.getLocalDateTimeOfTenant());
        transaction.setLastModifiedDate(DateUtils.getLocalDateTimeOfTenant());
        
        return transaction;
    }
    
    /**
     * Reverses this transaction.
     */
    public void reverse() {
        this.reversed = true;
        this.setLastModifiedDate(DateUtils.getLocalDateTimeOfTenant());
    }
    
    /**
     * Gets the transaction date from the underlying savings account transaction.
     * 
     * @return The transaction date
     */
    public LocalDate getTransactionDate() {
        return this.savingsAccountTransaction != null ? 
                this.savingsAccountTransaction.getTransactionLocalDate() : 
                null;
    }
    
    /**
     * Determines if this is an interest posting transaction.
     * 
     * @return true if the transaction is for interest posting, false otherwise
     */
    public boolean isInterestPosting() {
        return "interest_posting".equalsIgnoreCase(this.transactionType);
    }
    
    /**
     * Determines if this is a maturity transaction.
     * 
     * @return true if the transaction is for maturity, false otherwise
     */
    public boolean isMaturity() {
        return "maturity".equalsIgnoreCase(this.transactionType);
    }
    
    /**
     * Determines if this is a deposit transaction.
     * 
     * @return true if the transaction is for deposit, false otherwise
     */
    public boolean isDeposit() {
        return "deposit".equalsIgnoreCase(this.transactionType);
    }
    
    /**
     * Determines if this is a withdrawal transaction.
     * 
     * @return true if the transaction is for withdrawal, false otherwise
     */
    public boolean isWithdrawal() {
        return "withdrawal".equalsIgnoreCase(this.transactionType);
    }
    
    /**
     * Determines if this is a premature closure transaction.
     * 
     * @return true if the transaction is for premature closure, false otherwise
     */
    public boolean isPrematureClosure() {
        return "premature_closure".equalsIgnoreCase(this.transactionType);
    }
}