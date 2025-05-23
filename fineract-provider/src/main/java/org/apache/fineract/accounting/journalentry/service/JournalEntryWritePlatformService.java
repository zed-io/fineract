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
package org.apache.fineract.accounting.journalentry.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Map;
import org.apache.fineract.accounting.provisioning.domain.ProvisioningEntry;
import org.apache.fineract.infrastructure.core.api.JsonCommand;
import org.apache.fineract.infrastructure.core.data.CommandProcessingResult;
import org.apache.fineract.portfolio.loanaccount.data.AccountingBridgeDataDTO;

public interface JournalEntryWritePlatformService {

    CommandProcessingResult createJournalEntry(JsonCommand command);

    CommandProcessingResult revertJournalEntry(JsonCommand command);

    void createJournalEntriesForLoan(AccountingBridgeDataDTO accountingBridgeData);

    void createJournalEntriesForSavings(Map<String, Object> accountingBridgeData);

    void createJournalEntriesForClientTransactions(Map<String, Object> accountingBridgeData);

    CommandProcessingResult defineOpeningBalance(JsonCommand command);

    void createJournalEntryForReversedLoanTransaction(LocalDate transactionDate, String loanTransactionId, Long officeId);

    String revertProvisioningJournalEntries(LocalDate reversalTransactionDate, Long entityId, Integer entityType);

    String createProvisioningJournalEntries(ProvisioningEntry entry);

    void createJournalEntriesForShares(Map<String, Object> accountingBridgeData);

    void revertShareAccountJournalEntries(ArrayList<Long> transactionId, LocalDate transactionDate);

}
