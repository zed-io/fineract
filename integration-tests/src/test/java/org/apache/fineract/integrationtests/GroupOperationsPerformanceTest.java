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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.GroupHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Performance tests for Group operations in Apache Fineract.
 * Note: These tests are marked with the "performance" tag and should be run separately
 * from the regular unit and integration tests, typically in a performance testing environment.
 */
@Tag("performance")
public class GroupOperationsPerformanceTest {

    private static final Logger LOG = LoggerFactory.getLogger(GroupOperationsPerformanceTest.class);
    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;

    // Test configuration
    private static final int SMALL_GROUP_SIZE = 10;
    private static final int MEDIUM_GROUP_SIZE = 50;
    private static final int LARGE_GROUP_SIZE = 100;
    
    // Performance thresholds in milliseconds
    private static final long GROUP_CREATION_THRESHOLD_MS = 1000;
    private static final long CLIENT_ASSOCIATION_THRESHOLD_MS = 5000;
    private static final long GROUP_SEARCH_THRESHOLD_MS = 2000;

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        this.requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        this.requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        this.responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();
    }

    @Test
    public void testGroupCreationPerformance() {
        LOG.info("Testing group creation performance");
        
        // Create multiple groups and measure performance
        final int numberOfGroups = 10;
        List<Long> creationTimes = new ArrayList<>();
        
        for (int i = 0; i < numberOfGroups; i++) {
            // Measure time to create a group
            long startTime = System.nanoTime();
            
            Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec);
            assertNotNull(groupId, "Group was not created successfully");
            
            long endTime = System.nanoTime();
            long durationMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
            creationTimes.add(durationMs);
            
            LOG.info("Group {} creation time: {} ms", groupId, durationMs);
        }
        
        // Calculate average creation time
        double averageCreationTime = creationTimes.stream().mapToLong(Long::longValue).average().orElse(0);
        LOG.info("Average group creation time: {} ms", averageCreationTime);
        
        // Check if performance meets threshold
        assertTrue(averageCreationTime < GROUP_CREATION_THRESHOLD_MS, 
                "Group creation performance exceeds threshold: " + averageCreationTime + " ms > " + GROUP_CREATION_THRESHOLD_MS + " ms");
    }

    @Test
    public void testLargeGroupMembershipPerformance() {
        LOG.info("Testing large group membership performance");
        
        // Create a group
        Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec);
        assertNotNull(groupId, "Group was not created successfully");
        
        // Activate group
        groupId = GroupHelper.activateGroup(this.requestSpec, this.responseSpec, groupId.toString());
        
        // Prepare client association tests for different group sizes
        runClientAssociationTest(groupId, SMALL_GROUP_SIZE, "small");
        runClientAssociationTest(groupId, MEDIUM_GROUP_SIZE, "medium");
        runClientAssociationTest(groupId, LARGE_GROUP_SIZE, "large");
    }

    @Test
    public void testGroupSearchPerformance() {
        LOG.info("Testing group search performance");
        
        // Create multiple groups with different names for search
        final int numberOfGroups = 20;
        List<Integer> groupIds = new ArrayList<>();
        
        // Create groups with searchable names
        for (int i = 0; i < numberOfGroups; i++) {
            String groupName = "SearchPerf_" + (i % 5) + "_Group_" + i;
            String groupJson = "{\"officeId\": 1, \"name\": \"" + groupName + "\", " +
                    "\"dateFormat\": \"dd MMMM yyyy\", \"locale\": \"en\", " +
                    "\"active\": false}";
            
            Integer groupId = Utils.performServerPost(this.requestSpec, this.responseSpec,
                    "/fineract-provider/api/v1/groups?" + Utils.TENANT_IDENTIFIER,
                    groupJson, "resourceId");
            
            groupIds.add(groupId);
        }
        
        // Perform different search queries and measure performance
        Map<String, Long> searchTimes = new HashMap<>();
        
        // Test 1: Search by exact name
        long startTime = System.nanoTime();
        Utils.performServerGet(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups?name=SearchPerf_0_Group_0&" + Utils.TENANT_IDENTIFIER, "");
        long endTime = System.nanoTime();
        searchTimes.put("Exact name search", TimeUnit.NANOSECONDS.toMillis(endTime - startTime));
        
        // Test 2: Search by partial name
        startTime = System.nanoTime();
        Utils.performServerGet(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups?name=SearchPerf_1&" + Utils.TENANT_IDENTIFIER, "");
        endTime = System.nanoTime();
        searchTimes.put("Partial name search", TimeUnit.NANOSECONDS.toMillis(endTime - startTime));
        
        // Test 3: Search with paging
        startTime = System.nanoTime();
        Utils.performServerGet(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups?offset=0&limit=10&" + Utils.TENANT_IDENTIFIER, "");
        endTime = System.nanoTime();
        searchTimes.put("Paged search", TimeUnit.NANOSECONDS.toMillis(endTime - startTime));
        
        // Test 4: Search by office
        startTime = System.nanoTime();
        Utils.performServerGet(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups?officeId=1&" + Utils.TENANT_IDENTIFIER, "");
        endTime = System.nanoTime();
        searchTimes.put("Office search", TimeUnit.NANOSECONDS.toMillis(endTime - startTime));
        
        // Log search performance
        searchTimes.forEach((searchType, durationMs) -> {
            LOG.info("{} time: {} ms", searchType, durationMs);
            assertTrue(durationMs < GROUP_SEARCH_THRESHOLD_MS, 
                    searchType + " performance exceeds threshold: " + durationMs + " ms > " + GROUP_SEARCH_THRESHOLD_MS + " ms");
        });
    }

    @Test
    public void testConcurrentGroupOperationsPerformance() {
        LOG.info("Testing concurrent group operations performance");
        
        // First, create a group
        Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec);
        assertNotNull(groupId, "Group was not created successfully");
        
        // Activate group
        groupId = GroupHelper.activateGroup(this.requestSpec, this.responseSpec, groupId.toString());
        
        // Create clients
        List<Integer> clientIds = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Integer clientId = ClientHelper.createClient(this.requestSpec, this.responseSpec);
            clientIds.add(clientId);
        }
        
        // Simulate concurrent operations (in a synchronized way since we're not using separate threads)
        long startTime = System.nanoTime();
        
        // Operation 1: Associate clients
        for (Integer clientId : clientIds) {
            GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId.toString());
        }
        
        // Operation 2: Get group details
        Utils.performServerGet(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?associations=clientMembers&" + Utils.TENANT_IDENTIFIER, "");
        
        // Operation 3: Update group
        String updateGroupJson = "{\"name\": \"Updated_Group_" + System.currentTimeMillis() + "\"}";
        Utils.performServerPut(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?" + Utils.TENANT_IDENTIFIER,
                updateGroupJson, "resourceId");
        
        long endTime = System.nanoTime();
        long totalDurationMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        LOG.info("Concurrent operations total time: {} ms", totalDurationMs);
    }

    // Helper methods
    
    /**
     * Runs a client association performance test with the specified number of clients
     */
    private void runClientAssociationTest(Integer groupId, int numberOfClients, String sizeDescription) {
        LOG.info("Testing {} group ({} clients) membership performance", sizeDescription, numberOfClients);
        
        // Create clients
        List<Integer> clientIds = new ArrayList<>();
        for (int i = 0; i < numberOfClients; i++) {
            Integer clientId = ClientHelper.createClient(this.requestSpec, this.responseSpec);
            clientIds.add(clientId);
        }
        
        // Build batch association JSON
        StringBuilder clientMembersJson = new StringBuilder("{\"clientMembers\": [");
        for (int i = 0; i < clientIds.size(); i++) {
            clientMembersJson.append(clientIds.get(i));
            if (i < clientIds.size() - 1) {
                clientMembersJson.append(",");
            }
        }
        clientMembersJson.append("]}");
        
        // Measure association time
        long startTime = System.nanoTime();
        
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?command=associateClients&" + Utils.TENANT_IDENTIFIER,
                clientMembersJson.toString(), "groupId");
        
        long endTime = System.nanoTime();
        long associationTimeMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        LOG.info("{} group client association time: {} ms", sizeDescription, associationTimeMs);
        assertTrue(associationTimeMs < CLIENT_ASSOCIATION_THRESHOLD_MS, 
                sizeDescription + " group association performance exceeds threshold: " + associationTimeMs + " ms > " + CLIENT_ASSOCIATION_THRESHOLD_MS + " ms");
        
        // Measure retrieval time with all clients
        startTime = System.nanoTime();
        
        Utils.performServerGet(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?associations=clientMembers&" + Utils.TENANT_IDENTIFIER, "");
        
        endTime = System.nanoTime();
        long retrievalTimeMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        
        LOG.info("{} group client retrieval time: {} ms", sizeDescription, retrievalTimeMs);
        assertTrue(retrievalTimeMs < CLIENT_ASSOCIATION_THRESHOLD_MS, 
                sizeDescription + " group retrieval performance exceeds threshold: " + retrievalTimeMs + " ms > " + CLIENT_ASSOCIATION_THRESHOLD_MS + " ms");
        
        // Clean up by disassociating clients
        Utils.performServerPost(this.requestSpec, this.responseSpec,
                "/fineract-provider/api/v1/groups/" + groupId + "?command=disassociateClients&" + Utils.TENANT_IDENTIFIER,
                clientMembersJson.toString(), "groupId");
    }
}