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
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import java.util.HashMap;
import java.util.List;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.GroupHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.organisation.StaffHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsProductHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsStatusChecker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * E2E integration tests for Group lifecycle operations in Apache Fineract.
 * This test covers the complete lifecycle of a group from creation to closure,
 * including intermediary operations like activation, client association,
 * staff assignment, and account creation.
 */
public class GroupLifecycleE2ETest {

    private static final Logger LOG = LoggerFactory.getLogger(GroupLifecycleE2ETest.class);
    private static final String ACCOUNT_TYPE_GROUP = "GROUP";
    private static final String MINIMUM_OPENING_BALANCE = "1000.0";
    
    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private SavingsAccountHelper savingsAccountHelper;

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        this.requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        this.requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        this.responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();
        this.savingsAccountHelper = new SavingsAccountHelper(this.requestSpec, this.responseSpec);
    }

    @Test
    public void testGroupFullLifecycle() {
        // 1. Create a staff member
        LOG.info("Creating staff member");
        Integer staffId = StaffHelper.createStaff(this.requestSpec, this.responseSpec);
        assertNotNull(staffId);
        
        // 2. Create and verify group in pending status
        LOG.info("Creating group");
        final String groupName = GroupHelper.randomNameGenerator("E2EGroup_", 5);
        final String groupExternalId = Utils.randomStringGenerator("EXT_", 8);
        
        // Generate JSON for group creation with staff and name
        final String groupJson = "{\"officeId\": 1, \"name\": \"" + groupName + "\", " +
                "\"externalId\": \"" + groupExternalId + "\", " +
                "\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                "\"active\": false, \"staffId\": " + staffId + "}";
        
        final Integer groupId = Utils.performServerPost(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups?" + Utils.TENANT_IDENTIFIER, groupJson, "groupId");
        
        LOG.info("Created group with ID: {}", groupId);
        assertNotNull(groupId);
        
        // Verify group status is pending
        HashMap<String, Object> groupStatusHashMap = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupId + "?" + Utils.TENANT_IDENTIFIER, "");
        
        assertEquals("clientMembers", groupStatusHashMap.get("clientMembers").getClass().getSimpleName(), 
                "Checking clientMembers is present in group details");
        assertEquals("groupMembers", groupStatusHashMap.get("groupMembers").getClass().getSimpleName(), 
                "Checking groupMembers is present in group details");
        assertEquals("pending", groupStatusHashMap.get("status").toString(), 
                "Checking group status is pending");
        assertEquals(groupName, groupStatusHashMap.get("name").toString(), 
                "Checking group name is correct");
        assertEquals(groupExternalId, groupStatusHashMap.get("externalId").toString(), 
                "Checking group external ID is correct");
        
        // 3. Create clients to associate with group
        LOG.info("Creating clients");
        final Integer client1Id = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer client2Id = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        // 4. Activate group
        LOG.info("Activating group");
        final String activationDate = Utils.getJsonDateFormatForDB();
        final String activateGroupJson = "{\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                "\"activationDate\": \"" + activationDate + "\"}";
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?command=activate&" + Utils.TENANT_IDENTIFIER,
                activateGroupJson, "groupId");
        
        // Verify group is active
        groupStatusHashMap = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupId + "?" + Utils.TENANT_IDENTIFIER, "");
        assertEquals("active", groupStatusHashMap.get("status").toString(), 
                "Checking group status is active");
        
        // 5. Associate clients with group
        LOG.info("Associating clients with group");
        final String associateClientsJson = "{\"clientMembers\": [" + client1Id + ", " + client2Id + "]}";
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?command=associateClients&" + Utils.TENANT_IDENTIFIER,
                associateClientsJson, "groupId");
        
        // Verify clients are associated
        final List<HashMap> clientMembers = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupId + "?associations=clientMembers&" + Utils.TENANT_IDENTIFIER,
                "clientMembers");
        
        assertEquals(2, clientMembers.size(), "Group should have 2 clients");
        
        // 6. Create a savings product and apply for group savings account
        LOG.info("Creating savings product");
        final Integer savingsProductId = createSavingsProduct(this.requestSpec, this.responseSpec, MINIMUM_OPENING_BALANCE);
        assertNotNull(savingsProductId);
        
        LOG.info("Applying for savings account");
        final Integer savingsId = this.savingsAccountHelper.applyForSavingsApplication(groupId, savingsProductId, ACCOUNT_TYPE_GROUP);
        assertNotNull(savingsId);
        
        // 7. Approve savings account
        LOG.info("Approving savings account");
        HashMap<String, Object> savingsStatusHashMap = this.savingsAccountHelper.approveSavings(savingsId);
        SavingsStatusChecker.verifySavingsIsApproved(savingsStatusHashMap);
        
        // 8. Activate savings account
        LOG.info("Activating savings account");
        savingsStatusHashMap = this.savingsAccountHelper.activateSavings(savingsId);
        SavingsStatusChecker.verifySavingsIsActive(savingsStatusHashMap);
        
        // 9. Make a deposit to savings account
        LOG.info("Depositing to savings account");
        final Integer depositTransactionId = (Integer) this.savingsAccountHelper.depositToSavingsAccount(savingsId, "2000",
                Utils.getJsonDateFormatForDB(), CommonConstants.RESPONSE_RESOURCE_ID);
        assertNotNull(depositTransactionId);
        
        // 10. Update group (change name)
        LOG.info("Updating group");
        final String updatedGroupName = groupName + "_Updated";
        final String updateGroupJson = "{\"name\": \"" + updatedGroupName + "\"}";
        
        Utils.performServerPut(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?" + Utils.TENANT_IDENTIFIER,
                updateGroupJson, "resourceId");
        
        // Verify name is updated
        groupStatusHashMap = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupId + "?" + Utils.TENANT_IDENTIFIER, "");
        assertEquals(updatedGroupName, groupStatusHashMap.get("name").toString(), 
                "Checking group name is updated");
        
        // 11. Disassociate a client
        LOG.info("Disassociating a client");
        final String disassociateClientJson = "{\"clientMembers\": [" + client1Id + "]}";
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?command=disassociateClients&" + Utils.TENANT_IDENTIFIER,
                disassociateClientJson, "groupId");
        
        // Verify only one client remains
        final List<HashMap> remainingClientMembers = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupId + "?associations=clientMembers&" + Utils.TENANT_IDENTIFIER,
                "clientMembers");
        
        assertEquals(1, remainingClientMembers.size(), "Group should have 1 client remaining");
        assertEquals(client2Id, remainingClientMembers.get(0).get("id"), "Remaining client should be client2");
        
        // 12. Close savings account
        LOG.info("Closing savings account");
        final String closeSavingsJson = "{\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                "\"closedOnDate\": \"" + Utils.getJsonDateFormatForDB() + "\", \"withdrawBalance\": true}";
        
        savingsStatusHashMap = this.savingsAccountHelper.closeSavingsAccountAndGetBackRequiredField(savingsId, closeSavingsJson, "status");
        SavingsStatusChecker.verifySavingsAccountIsClosed(savingsStatusHashMap);
        
        // 13. Close group
        LOG.info("Closing group");
        final String closeGroupJson = "{\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                "\"closureDate\": \"" + Utils.getJsonDateFormatForDB() + "\"}";
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?command=close&" + Utils.TENANT_IDENTIFIER,
                closeGroupJson, "resourceId");
        
        // Verify group is closed
        groupStatusHashMap = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + groupId + "?" + Utils.TENANT_IDENTIFIER, "");
        assertEquals("closed", groupStatusHashMap.get("status").toString(), 
                "Checking group status is closed");
        
        LOG.info("Full group lifecycle test completed successfully");
    }
    
    @Test
    public void testGroupHierarchyOperations() {
        // 1. Create a center
        LOG.info("Creating center");
        final String centerName = GroupHelper.randomNameGenerator("E2ECenter_", 5);
        final String centerJson = "{\"officeId\": 1, \"name\": \"" + centerName + "\", " +
                "\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                "\"active\": true, \"activationDate\": \"" + Utils.getJsonDateFormatForDB() + "\"," +
                "\"groupMembers\": [], \"clientMembers\": []}";
        
        final Integer centerId = Utils.performServerPost(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/centers?" + Utils.TENANT_IDENTIFIER, centerJson, "resourceId");
        
        LOG.info("Created center with ID: {}", centerId);
        assertNotNull(centerId);
        
        // 2. Create groups
        LOG.info("Creating groups");
        final String group1Name = GroupHelper.randomNameGenerator("E2EGroup1_", 5);
        final String group2Name = GroupHelper.randomNameGenerator("E2EGroup2_", 5);
        
        // Create groups as independent entities first
        final String groupJson1 = "{\"officeId\": 1, \"name\": \"" + group1Name + "\", " +
                "\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                "\"active\": false}";
        
        final String groupJson2 = "{\"officeId\": 1, \"name\": \"" + group2Name + "\", " +
                "\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                "\"active\": false}";
        
        final Integer group1Id = Utils.performServerPost(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups?" + Utils.TENANT_IDENTIFIER, groupJson1, "resourceId");
        
        final Integer group2Id = Utils.performServerPost(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups?" + Utils.TENANT_IDENTIFIER, groupJson2, "resourceId");
        
        LOG.info("Created groups with IDs: {} and {}", group1Id, group2Id);
        
        // 3. Associate groups with center
        LOG.info("Associating groups with center");
        final String associateGroupsJson = "{\"groupMembers\": [" + group1Id + ", " + group2Id + "]}";
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/centers/" + centerId + "?command=associateGroups&" + Utils.TENANT_IDENTIFIER,
                associateGroupsJson, "resourceId");
        
        // Verify groups are associated with center
        final List<HashMap> groupMembers = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/centers/" + centerId + "?associations=groupMembers&" + Utils.TENANT_IDENTIFIER,
                "groupMembers");
        
        assertEquals(2, groupMembers.size(), "Center should have 2 groups");
        
        // 4. Activate groups
        LOG.info("Activating groups");
        for (Integer groupId : List.of(group1Id, group2Id)) {
            final String activateGroupJson = "{\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                    "\"activationDate\": \"" + Utils.getJsonDateFormatForDB() + "\"}";
            
            Utils.performServerPost(this.requestSpec, this.responseSpec,
                    "/fineract-provider/api/v1/groups/" + groupId + "?command=activate&" + Utils.TENANT_IDENTIFIER,
                    activateGroupJson, "groupId");
        }
        
        // 5. Create clients and associate with groups
        LOG.info("Creating clients and associating with groups");
        final Integer client1Id = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer client2Id = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer client3Id = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer client4Id = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        // Associate clients with each group
        final String associateClientsToGroup1Json = "{\"clientMembers\": [" + client1Id + ", " + client2Id + "]}";
        final String associateClientsToGroup2Json = "{\"clientMembers\": [" + client3Id + ", " + client4Id + "]}";
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + group1Id + "?command=associateClients&" + Utils.TENANT_IDENTIFIER,
                associateClientsToGroup1Json, "groupId");
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + group2Id + "?command=associateClients&" + Utils.TENANT_IDENTIFIER,
                associateClientsToGroup2Json, "groupId");
        
        // 6. Verify client association through hierarchical relationships
        LOG.info("Verifying hierarchical relationships");
        
        // Check that center has correct child groups
        final List<HashMap> centerGroupMembers = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/centers/" + centerId + "?associations=groupMembers&" + Utils.TENANT_IDENTIFIER,
                "groupMembers");
        
        assertEquals(2, centerGroupMembers.size(), "Center should have 2 groups");
        
        // Find specific group by ID in the returned list
        boolean foundGroup1 = false;
        boolean foundGroup2 = false;
        
        for (HashMap group : centerGroupMembers) {
            Integer id = (Integer) group.get("id");
            if (id.equals(group1Id)) {
                foundGroup1 = true;
            } else if (id.equals(group2Id)) {
                foundGroup2 = true;
            }
        }
        
        assertTrue(foundGroup1, "Group 1 should be associated with center");
        assertTrue(foundGroup2, "Group 2 should be associated with center");
        
        // 7. Check hierarchy information for groups
        for (Integer groupId : List.of(group1Id, group2Id)) {
            HashMap groupDetails = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                    "/fineract-provider/api/v1/groups/" + groupId + "?" + Utils.TENANT_IDENTIFIER, "");
            
            assertEquals(centerId, groupDetails.get("centerId"), 
                    "Group should have correct center ID as parent");
            
            // Verify hierarchy string format (should contain center ID and group ID)
            String hierarchy = (String) groupDetails.get("hierarchy");
            assertTrue(hierarchy.contains("." + centerId + "."), 
                    "Hierarchy should contain center ID: " + hierarchy);
            assertTrue(hierarchy.contains("." + groupId + "."), 
                    "Hierarchy should contain group ID: " + hierarchy);
        }
        
        // 8. Disassociate a group from center
        LOG.info("Disassociating group from center");
        final String disassociateGroupJson = "{\"groupMembers\": [" + group1Id + "]}";
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/centers/" + centerId + "?command=disassociateGroups&" + Utils.TENANT_IDENTIFIER,
                disassociateGroupJson, "resourceId");
        
        // Verify only one group remains associated with center
        final List<HashMap> remainingGroups = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/centers/" + centerId + "?associations=groupMembers&" + Utils.TENANT_IDENTIFIER,
                "groupMembers");
        
        assertEquals(1, remainingGroups.size(), "Center should have 1 group remaining");
        assertEquals(group2Id, remainingGroups.get(0).get("id"), "Remaining group should be group2");
        
        // Check that the disassociated group no longer has center as parent
        HashMap group1Details = Utils.performServerGet(this.requestSpec, this.responseSpec, 
                "/fineract-provider/api/v1/groups/" + group1Id + "?" + Utils.TENANT_IDENTIFIER, "");
        
        assertEquals(null, group1Details.get("centerId"), 
                "Disassociated group should not have a center ID");
        
        LOG.info("Group hierarchy operations test completed successfully");
    }

    // Helper methods
    private static Integer createSavingsProduct(final RequestSpecification requestSpec, final ResponseSpecification responseSpec,
            final String minOpeningBalance) {
        LOG.info("Creating savings product");
        SavingsProductHelper savingsProductHelper = new SavingsProductHelper();
        final String savingsProductJSON = savingsProductHelper
                .withInterestCompoundingPeriodTypeAsDaily()
                .withInterestPostingPeriodTypeAsMonthly()
                .withInterestCalculationPeriodTypeAsDailyBalance()
                .withMinimumOpenningBalance(minOpeningBalance).build();
        return SavingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
    }
    
    // Constants needed for the test
    private static class CommonConstants {
        public static final String RESPONSE_RESOURCE_ID = "resourceId";
    }
}