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
package org.apache.fineract.portfolio.loanaccount.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

/**
 * Represents a request for multiple disbursements in a loan.
 */
@Data
@NoArgsConstructor
@Accessors(chain = true)
@JsonIgnoreProperties(ignoreUnknown = true)
public class MultipleDisbursementRequest {

    /**
     * Individual disbursement details.
     */
    @JsonProperty("disbursementData")
    private Collection<DisbursementRequestData> disbursements = new ArrayList<>();

    /**
     * Flag to indicate if the schedule should be recalculated.
     */
    @JsonProperty("recalculateSchedule")
    private Boolean recalculateSchedule;

    /**
     * Class representing a single disbursement within a multiple disbursement request.
     */
    @Data
    @NoArgsConstructor
    @Accessors(chain = true)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DisbursementRequestData {

        /**
         * The expected disbursement date.
         */
        @JsonProperty("expectedDisbursementDate")
        private LocalDate expectedDisbursementDate;

        /**
         * The principal amount to disburse.
         */
        @JsonProperty("principal")
        private BigDecimal principal;

        /**
         * Optional comment for the disbursement.
         */
        @JsonProperty("comment")
        private String comment;
    }
}