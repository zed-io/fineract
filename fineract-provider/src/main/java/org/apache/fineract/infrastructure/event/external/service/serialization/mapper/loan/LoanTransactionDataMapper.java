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
package org.apache.fineract.infrastructure.event.external.service.serialization.mapper.loan;

import org.apache.fineract.avro.loan.v1.LoanTransactionDataV1;
import org.apache.fineract.infrastructure.event.external.service.serialization.mapper.support.AvroMapperConfig;
import org.apache.fineract.portfolio.loanaccount.data.LoanTransactionData;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = AvroMapperConfig.class)
public interface LoanTransactionDataMapper {

    // unpaidCharges are calculated and set explicitly based on if needed (only for charge-off transaction yet)
    @Mapping(target = "unpaidCharges", ignore = true)
    @Mapping(target = "externalOwnerId", ignore = true)
    @Mapping(target = "customData", ignore = true)
    @Mapping(target = "reversed", expression = "java(isReversed(source))")
    LoanTransactionDataV1 map(LoanTransactionData source);

    default boolean isReversed(LoanTransactionData source) {
        return source.isManuallyReversed() || source.getReversedOnDate() != null;
    }
}
