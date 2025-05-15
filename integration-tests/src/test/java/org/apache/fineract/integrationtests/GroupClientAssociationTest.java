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
package org.apache.fineract.integrationtests;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import java.util.HashMap;
import java.util.List;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.GroupHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Integration test for {@link org.apache.fineract.portfolio.group.api.GroupsApiResource} covering
 * client association and disassociation functionality.
 */
public class GroupClientAssociationTest {

    private static final Logger LOG = LoggerFactory.getLogger(GroupClientAssociationTest.class);
    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        this.requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        this.requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        this.responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();
    }

    @Test
    public void testCreateGroupAssociateClientsAndVerifyMembership() {
        // Create clients
        final Integer client1ID = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer client2ID = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        LOG.info("--------------------------Creating clients {} and {}--------------------------", client1ID, client2ID);
        
        // Verify clients were created
        ClientHelper.verifyClientCreatedOnServer(this.requestSpec, this.responseSpec, client1ID);
        ClientHelper.verifyClientCreatedOnServer(this.requestSpec, this.responseSpec, client2ID);

        // Create group
        final Integer groupID = GroupHelper.createGroup(this.requestSpec, this.responseSpec);
        LOG.info("--------------------------Creating group {}--------------------------", groupID);
        GroupHelper.verifyGroupCreatedOnServer(this.requestSpec, this.responseSpec, groupID);

        // Activate group
        final Integer activeGroupID = GroupHelper.activateGroup(this.requestSpec, this.responseSpec, groupID.toString());
        LOG.info("--------------------------Activating group {}--------------------------", activeGroupID);
        GroupHelper.verifyGroupActivatedOnServer(this.requestSpec, this.responseSpec, activeGroupID, true);

        // Associate first client
        final Integer groupIDAfterAssociate1 = GroupHelper.associateClient(this.requestSpec, this.responseSpec, 
                groupID.toString(), client1ID.toString());
        LOG.info("--------------------------Associating client {} with group {}--------------------------", client1ID, groupIDAfterAssociate1);
        GroupHelper.verifyGroupMembers(this.requestSpec, this.responseSpec, groupIDAfterAssociate1, client1ID);

        // Associate second client
        final Integer groupIDAfterAssociate2 = GroupHelper.associateClient(this.requestSpec, this.responseSpec, 
                groupID.toString(), client2ID.toString());
        LOG.info("--------------------------Associating client {} with group {}--------------------------", client2ID, groupIDAfterAssociate2);
        
        // Verify both clients are associated
        final List<HashMap> clientList = GroupHelper.getAllGroupClients(this.requestSpec, this.responseSpec, groupID.toString());
        assertNotNull(clientList);
        assertEquals(2, clientList.size());
        
        boolean foundClient1 = false;
        boolean foundClient2 = false;
        
        for (HashMap clientMap : clientList) {
            Integer clientId = (Integer) clientMap.get("id");
            if (clientId.equals(client1ID)) {
                foundClient1 = true;
            } else if (clientId.equals(client2ID)) {
                foundClient2 = true;
            }
        }
        
        assertTrue(foundClient1, "Client 1 should be a member of the group");
        assertTrue(foundClient2, "Client 2 should be a member of the group");

        // Disassociate client 1
        final Integer groupIDAfterDisassociate = GroupHelper.disAssociateClient(this.requestSpec, this.responseSpec, 
                groupID.toString(), client1ID.toString());
        LOG.info("--------------------------Disassociating client {} from group {}--------------------------", client1ID, groupIDAfterDisassociate);

        // Verify only client 2 remains in group
        final List<HashMap> remainingClients = GroupHelper.getAllGroupClients(this.requestSpec, this.responseSpec, groupID.toString());
        assertNotNull(remainingClients);
        assertEquals(1, remainingClients.size());
        assertEquals(client2ID, remainingClients.get(0).get("id"));
    }

    @Test
    public void testAssociateDisassociateMultipleClients() {
        // Create clients
        final Integer client1ID = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer client2ID = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer client3ID = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        LOG.info("--------------------------Creating clients {}, {}, and {}--------------------------", client1ID, client2ID, client3ID);
        
        // Create group
        final Integer groupID = GroupHelper.createGroup(this.requestSpec, this.responseSpec);
        LOG.info("--------------------------Creating group {}--------------------------", groupID);
        GroupHelper.verifyGroupCreatedOnServer(this.requestSpec, this.responseSpec, groupID);

        // Activate group
        final Integer activeGroupID = GroupHelper.activateGroup(this.requestSpec, this.responseSpec, groupID.toString());
        LOG.info("--------------------------Activating group {}--------------------------", activeGroupID);
        
        // Associate all clients at once (using batch API)
        final String batchAssociateJson = "{\"clientMembers\": [" + client1ID + ", " + client2ID + ", " + client3ID + "]}";
        final Integer groupIDAfterBatchAssociate = Utils.performServerPost(
                this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupID + "?command=associateClients&" + Utils.TENANT_IDENTIFIER,
                batchAssociateJson, "groupId");
        
        LOG.info("--------------------------Batch associating clients with group {}--------------------------", groupIDAfterBatchAssociate);
        
        // Verify all three clients are associated
        final List<HashMap> allClients = GroupHelper.getAllGroupClients(this.requestSpec, this.responseSpec, groupID.toString());
        assertNotNull(allClients);
        assertEquals(3, allClients.size());
        
        // Batch disassociate clients 1 and 3
        final String batchDisassociateJson = "{\"clientMembers\": [" + client1ID + ", " + client3ID + "]}";
        final Integer groupIDAfterBatchDisassociate = Utils.performServerPost(
                this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupID + "?command=disassociateClients&" + Utils.TENANT_IDENTIFIER,
                batchDisassociateJson, "groupId");
        
        LOG.info("--------------------------Batch disassociating clients from group {}--------------------------", groupIDAfterBatchDisassociate);
        
        // Verify only client 2 remains
        final List<HashMap> remainingClients = GroupHelper.getAllGroupClients(this.requestSpec, this.responseSpec, groupID.toString());
        assertNotNull(remainingClients);
        assertEquals(1, remainingClients.size());
        assertEquals(client2ID, remainingClients.get(0).get("id"));
    }

    @Test
    public void testAssociationWithStaffInheritance() {
        // Create a client
        final Integer clientID = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        // Create staff
        final Integer staffID = Utils.performServerPost(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/staff?" + Utils.TENANT_IDENTIFIER,
                "{\"officeId\": 1, \"firstname\": \"TestStaff\", \"lastname\": \"Member\", \"isLoanOfficer\": true}",
                "resourceId");
        
        // Create group with staff
        final String groupJson = "{\"officeId\": 1, \"name\": \"TestGroupWithStaff\", \"active\": true, " +
                "\"activationDate\": \"" + Utils.getLocalDateOfTenant() + "\", \"staffId\": " + staffID + "}";
        
        final Integer groupID = Utils.performServerPost(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups?" + Utils.TENANT_IDENTIFIER,
                groupJson, "resourceId");
        
        LOG.info("--------------------------Creating group {} with staff {}--------------------------", groupID, staffID);
        
        // Associate client with group
        GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupID.toString(), clientID.toString());
        
        // Assign different staff to client
        final Integer clientStaffID = Utils.performServerPost(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/staff?" + Utils.TENANT_IDENTIFIER,
                "{\"officeId\": 1, \"firstname\": \"ClientStaff\", \"lastname\": \"Member\", \"isLoanOfficer\": true}",
                "resourceId");
        
        ClientHelper.assignStaffToClient(this.requestSpec, this.responseSpec, clientID.toString(), clientStaffID.toString());
        
        // Verify different staff is assigned to client
        final Integer clientAssignedStaff = ClientHelper.getClientsStaffId(this.requestSpec, this.responseSpec, clientID.toString());
        assertEquals(clientStaffID, clientAssignedStaff, "Client should have its own staff assigned");
        
        // Use inherit staff flag when updating staff for group
        final HashMap inheritStaffChanges = (HashMap) GroupHelper.assignStaffInheritStaffForClientAccounts(
                this.requestSpec, this.responseSpec, groupID.toString(), staffID.toString());
                
        LOG.info("--------------------------Inheriting staff to client accounts--------------------------");
        
        // Verify client now has the group's staff
        final Integer clientNewStaff = ClientHelper.getClientsStaffId(this.requestSpec, this.responseSpec, clientID.toString());
        assertEquals(staffID, clientNewStaff, "Client should now have group's staff inherited");
    }
}