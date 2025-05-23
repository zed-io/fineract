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
package org.apache.fineract.portfolio.client.service;

import java.time.LocalDate;
import java.util.Collection;
import org.apache.fineract.infrastructure.core.domain.ExternalId;
import org.apache.fineract.infrastructure.core.service.Page;
import org.apache.fineract.infrastructure.core.service.SearchParameters;
import org.apache.fineract.portfolio.client.data.ClientData;

public interface ClientReadPlatformService {

    Page<ClientData> retrieveAll(SearchParameters searchParameters);

    ClientData retrieveOne(Long clientId);

    Collection<ClientData> retrieveAllForLookup(String extraCriteria);

    Collection<ClientData> retrieveAllForLookupByOfficeId(Long officeId);

    ClientData retrieveClientByIdentifier(Long identifierTypeId, String identifierKey);

    Collection<ClientData> retrieveClientMembersOfGroup(Long groupId);

    Collection<ClientData> retrieveActiveClientMembersOfGroup(Long groupId);

    Collection<ClientData> retrieveActiveClientMembersOfCenter(Long centerId);

    ClientData retrieveAllNarrations(String clientNarrations);

    /**
     * Gets a list of Client IDs associated with a user ID.
     * <p>
     * This is used in self service authentication
     *
     * @param aUserID
     *            the user id (not null)
     * @return client IDs listing (may be null)
     */
    Collection<Long> retrieveUserClients(Long aUserID);

    LocalDate retrieveClientTransferProposalDate(Long clientId);

    Long retrieveClientIdByExternalId(ExternalId externalId);

}
