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
package org.apache.fineract.portfolio.loanaccount.calculation.domain;

import org.apache.fineract.organisation.monetary.domain.Money;

/**
 * The result of a loan installment calculation
 */
public class LoanScheduleResult {
    
    private final Money principal;
    private final Money interest;
    private final Money fee;
    private final Money penalty;
    private final Money totalDue;

    /**
     * Constructor for loan schedule result
     */
    public LoanScheduleResult(Money principal, Money interest, Money fee, Money penalty) {
        this.principal = principal;
        this.interest = interest;
        this.fee = fee;
        this.penalty = penalty;
        this.totalDue = principal.plus(interest).plus(fee).plus(penalty);
    }

    public Money getPrincipal() {
        return principal;
    }

    public Money getInterest() {
        return interest;
    }

    public Money getFee() {
        return fee;
    }

    public Money getPenalty() {
        return penalty;
    }

    public Money getTotalDue() {
        return totalDue;
    }
    
    /**
     * Builder for loan schedule result
     */
    public static class Builder {
        private Money principal;
        private Money interest;
        private Money fee;
        private Money penalty;
        
        public Builder() {
            // Initialize with zero values
            this.principal = Money.zero(null);
            this.interest = Money.zero(null);
            this.fee = Money.zero(null);
            this.penalty = Money.zero(null);
        }
        
        public Builder withPrincipal(Money principal) {
            this.principal = principal;
            return this;
        }
        
        public Builder withInterest(Money interest) {
            this.interest = interest;
            return this;
        }
        
        public Builder withFee(Money fee) {
            this.fee = fee;
            return this;
        }
        
        public Builder withPenalty(Money penalty) {
            this.penalty = penalty;
            return this;
        }
        
        public LoanScheduleResult build() {
            return new LoanScheduleResult(principal, interest, fee, penalty);
        }
    }
}