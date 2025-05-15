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

import java.util.List;

/**
 * Represents a payment allocation rule that defines how payments are allocated to different components.
 */
public class AllocationRule {
    private final List<PaymentAllocationOrder> allocationOrder;
    private final boolean applyExcessToNextInstallment;
    private final boolean applyPaymentInChronologicalOrder;
    private final boolean treatOverpaymentAsAdvancePayment;
    
    public AllocationRule(List<PaymentAllocationOrder> allocationOrder, boolean applyExcessToNextInstallment,
                         boolean applyPaymentInChronologicalOrder, boolean treatOverpaymentAsAdvancePayment) {
        this.allocationOrder = allocationOrder;
        this.applyExcessToNextInstallment = applyExcessToNextInstallment;
        this.applyPaymentInChronologicalOrder = applyPaymentInChronologicalOrder;
        this.treatOverpaymentAsAdvancePayment = treatOverpaymentAsAdvancePayment;
    }
    
    public List<PaymentAllocationOrder> getAllocationOrder() {
        return allocationOrder;
    }
    
    public boolean isApplyExcessToNextInstallment() {
        return applyExcessToNextInstallment;
    }
    
    public boolean isApplyPaymentInChronologicalOrder() {
        return applyPaymentInChronologicalOrder;
    }
    
    public boolean isTreatOverpaymentAsAdvancePayment() {
        return treatOverpaymentAsAdvancePayment;
    }
}