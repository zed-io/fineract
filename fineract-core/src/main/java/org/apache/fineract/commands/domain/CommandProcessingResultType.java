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
package org.apache.fineract.commands.domain;

import jakarta.validation.constraints.NotNull;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommandProcessingResultType {

    INVALID(0, "commandProcessingResultType.invalid"), //
    PROCESSED(1, "commandProcessingResultType.processed"), //
    AWAITING_APPROVAL(2, "commandProcessingResultType.awaiting.approval"), //
    REJECTED(3, "commandProcessingResultType.rejected"), //
    UNDER_PROCESSING(4, "commandProcessingResultType.underProcessing"), //
    ERROR(5, "commandProcessingResultType.error");

    private static final Map<Integer, CommandProcessingResultType> BY_ID = Arrays.stream(values())
            .collect(Collectors.toMap(CommandProcessingResultType::getValue, v -> v));

    private final Integer value;
    private final String code;

    @NotNull
    public static CommandProcessingResultType fromInt(final Integer value) {
        CommandProcessingResultType transactionType = BY_ID.get(value);
        return transactionType == null ? INVALID : transactionType;
    }

    public boolean isProcessed() {
        return this == PROCESSED;
    }

    public boolean isAwaitingApproval() {
        return this == AWAITING_APPROVAL;
    }

    public boolean isRejected() {
        return this == REJECTED;
    }
}
