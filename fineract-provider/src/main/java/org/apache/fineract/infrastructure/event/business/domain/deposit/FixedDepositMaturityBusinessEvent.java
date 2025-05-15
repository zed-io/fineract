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

/**
 * Business event fired when a fixed deposit account reaches maturity.
 */
public class FixedDepositMaturityBusinessEvent extends AbstractBusinessEvent<FixedDepositMaturityBusinessEventData> {

    private static final String CATEGORY = "Fixed Deposit";
    private static final String TYPE = "Maturity";

    public FixedDepositMaturityBusinessEvent(FixedDepositAccount account) {
        super(new FixedDepositMaturityBusinessEventData(account.getId()));
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
     * Data class for fixed deposit maturity business events.
     */
    public static class FixedDepositMaturityBusinessEventData {

        private final Long accountId;

        public FixedDepositMaturityBusinessEventData(Long accountId) {
            this.accountId = accountId;
        }

        public Long getAccountId() {
            return accountId;
        }
    }
}