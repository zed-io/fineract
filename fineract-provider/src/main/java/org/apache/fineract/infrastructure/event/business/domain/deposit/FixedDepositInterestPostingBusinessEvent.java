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
package org.apache.fineract.infrastructure.event.business.domain.deposit;

import org.apache.fineract.infrastructure.event.business.domain.AbstractBusinessEvent;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransaction;

/**
 * Business event fired when interest is posted to a fixed deposit account.
 */
public class FixedDepositInterestPostingBusinessEvent extends AbstractBusinessEvent<FixedDepositInterestPostingBusinessEventData> {

    private static final String CATEGORY = "Fixed Deposit";
    private static final String TYPE = "Interest Posting";

    public FixedDepositInterestPostingBusinessEvent(FixedDepositAccount account, SavingsAccountTransaction transaction) {
        super(new FixedDepositInterestPostingBusinessEventData(account.getId(), transaction.getId()));
    }

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public String getCategory() {
        return CATEGORY;
    }

    /**
     * Data class for fixed deposit interest posting business events.
     */
    public static class FixedDepositInterestPostingBusinessEventData {

        private final Long accountId;
        private final Long transactionId;

        public FixedDepositInterestPostingBusinessEventData(Long accountId, Long transactionId) {
            this.accountId = accountId;
            this.transactionId = transactionId;
        }

        public Long getAccountId() {
            return accountId;
        }

        public Long getTransactionId() {
            return transactionId;
        }
    }
}