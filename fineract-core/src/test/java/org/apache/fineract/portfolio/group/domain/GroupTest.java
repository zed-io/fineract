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
package org.apache.fineract.portfolio.group.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import org.apache.fineract.infrastructure.core.exception.GeneralPlatformDomainRuleException;
import org.apache.fineract.infrastructure.core.exception.PlatformApiDataValidationException;
import org.apache.fineract.infrastructure.security.service.RandomPasswordGenerator;
import org.apache.fineract.organisation.office.domain.Office;
import org.apache.fineract.organisation.staff.domain.Staff;
import org.apache.fineract.portfolio.client.domain.Client;
import org.apache.fineract.portfolio.group.exception.ClientExistInGroupException;
import org.apache.fineract.portfolio.group.exception.ClientNotInGroupException;
import org.apache.fineract.portfolio.group.exception.GroupExistsInCenterException;
import org.apache.fineract.portfolio.group.exception.GroupNotExistsInCenterException;
import org.apache.fineract.useradministration.domain.AppUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the {@link Group} domain entity.
 */
public class GroupTest {

    private Office office;
    private Staff staff;
    private GroupLevel groupLevel;
    private GroupLevel centerLevel;
    private AppUser user;
    private LocalDate activationDate;
    private LocalDate submittedOnDate;

    @BeforeEach
    public void setup() {
        office = mock(Office.class);
        staff = mock(Staff.class);
        groupLevel = mock(GroupLevel.class);
        centerLevel = mock(GroupLevel.class);
        user = mock(AppUser.class);

        when(office.getId()).thenReturn(1L);
        when(staff.getId()).thenReturn(1L);
        when(groupLevel.getId()).thenReturn(2L);
        when(groupLevel.isCenter()).thenReturn(false);
        when(groupLevel.isGroup()).thenReturn(true);
        when(centerLevel.getId()).thenReturn(1L);
        when(centerLevel.isCenter()).thenReturn(true);
        when(centerLevel.isGroup()).thenReturn(false);
        when(office.isOpeningDateAfter(LocalDate.now().minusDays(1))).thenReturn(false);

        activationDate = LocalDate.now();
        submittedOnDate = LocalDate.now().minusDays(1);
    }

    @Test
    public void testCreateNewGroup() {
        // Given
        String name = "Test Group";
        String externalId = "EXT-123";
        boolean active = false;
        Set<Client> clientMembers = new HashSet<>();
        Set<Group> groupMembers = new HashSet<>();
        String accountNo = new RandomPasswordGenerator(19).generate();

        // When
        Group group = Group.newGroup(office, staff, null, groupLevel, name, externalId, active, activationDate, clientMembers,
                groupMembers, submittedOnDate, user, accountNo);

        // Then
        assertNotNull(group);
        assertEquals(name, group.getName());
        assertEquals(externalId, group.getExternalId());
        assertEquals(office, group.getOffice());
        assertEquals(staff, group.getStaff());
        assertEquals(groupLevel, group.getGroupLevel());
        assertEquals(submittedOnDate, group.getSubmittedOnDate());
        assertTrue(group.isPending());
        assertFalse(group.isActive());
    }

    @Test
    public void testCreateActiveGroup() {
        // Given
        String name = "Test Active Group";
        String externalId = "EXT-123-ACT";
        boolean active = true;
        Set<Client> clientMembers = new HashSet<>();
        Set<Group> groupMembers = new HashSet<>();
        String accountNo = new RandomPasswordGenerator(19).generate();

        // When
        Group group = Group.newGroup(office, staff, null, groupLevel, name, externalId, active, activationDate, clientMembers,
                groupMembers, submittedOnDate, user, accountNo);

        // Then
        assertNotNull(group);
        assertEquals(name, group.getName());
        assertEquals(externalId, group.getExternalId());
        assertEquals(activationDate, group.getActivationDate());
        assertTrue(group.isActive());
        assertFalse(group.isPending());
    }

    @Test
    public void testActivateGroup() {
        // Given
        Group group = createTestGroup(false);
        assertFalse(group.isActive());
        assertTrue(group.isPending());

        // When
        group.activate(user, activationDate);

        // Then
        assertTrue(group.isActive());
        assertFalse(group.isPending());
        assertEquals(activationDate, group.getActivationDate());
    }

    @Test
    public void testActivateAlreadyActiveGroup() {
        // Given
        Group group = createTestGroup(true);
        assertTrue(group.isActive());

        // When/Then
        assertThrows(PlatformApiDataValidationException.class, () -> {
            group.activate(user, activationDate.plusDays(1));
        });
    }

    @Test
    public void testAssociateClients() {
        // Given
        Group group = createTestGroup(false);
        Client client1 = createMockClient(1L);
        Client client2 = createMockClient(2L);
        Set<Client> clientsToAdd = new HashSet<>();
        clientsToAdd.add(client1);
        clientsToAdd.add(client2);

        // When
        group.associateClients(clientsToAdd);

        // Then
        assertEquals(2, group.getClientMembers().size());
        assertTrue(group.hasClientAsMember(client1));
        assertTrue(group.hasClientAsMember(client2));
    }

    @Test
    public void testAssociateClientAlreadyInGroup() {
        // Given
        Group group = createTestGroup(false);
        Client client = createMockClient(1L);
        Set<Client> clientsToAdd = new HashSet<>();
        clientsToAdd.add(client);
        group.associateClients(clientsToAdd);
        assertTrue(group.hasClientAsMember(client));

        // When/Then
        assertThrows(ClientExistInGroupException.class, () -> {
            group.associateClients(clientsToAdd);
        });
    }

    @Test
    public void testDisassociateClients() {
        // Given
        Group group = createTestGroup(false);
        Client client1 = createMockClient(1L);
        Client client2 = createMockClient(2L);
        Set<Client> clientsToAdd = new HashSet<>();
        clientsToAdd.add(client1);
        clientsToAdd.add(client2);
        group.associateClients(clientsToAdd);

        Set<Client> clientsToRemove = new HashSet<>();
        clientsToRemove.add(client1);

        // When
        group.disassociateClients(clientsToRemove);

        // Then
        assertEquals(1, group.getClientMembers().size());
        assertFalse(group.hasClientAsMember(client1));
        assertTrue(group.hasClientAsMember(client2));
    }

    @Test
    public void testDisassociateClientNotInGroup() {
        // Given
        Group group = createTestGroup(false);
        Client client1 = createMockClient(1L);
        Client client2 = createMockClient(2L);
        Set<Client> clientsToAdd = new HashSet<>();
        clientsToAdd.add(client1);
        group.associateClients(clientsToAdd);

        Set<Client> clientsToRemove = new HashSet<>();
        clientsToRemove.add(client2);

        // When/Then
        assertThrows(ClientNotInGroupException.class, () -> {
            group.disassociateClients(clientsToRemove);
        });
    }

    @Test
    public void testAssociateGroups() {
        // Given
        Group center = createTestCenter();
        Group group1 = createTestGroup(false);
        Group group2 = createTestGroup(false);
        
        Set<Group> groupsToAdd = new HashSet<>();
        groupsToAdd.add(group1);
        groupsToAdd.add(group2);

        // When
        center.associateGroups(groupsToAdd);

        // Then
        assertEquals(2, center.getGroupMembers().size());
        assertTrue(center.hasGroupAsMember(group1));
        assertTrue(center.hasGroupAsMember(group2));
        assertEquals(center, group1.getParent());
        assertEquals(center, group2.getParent());
    }

    @Test
    public void testAssociateCenterAsChild() {
        // Given
        Group center1 = createTestCenter();
        Group center2 = createTestCenter();
        
        Set<Group> groupsToAdd = new HashSet<>();
        groupsToAdd.add(center2);

        // When/Then
        assertThrows(GeneralPlatformDomainRuleException.class, () -> {
            center1.associateGroups(groupsToAdd);
        });
    }

    @Test
    public void testAssociateGroupAlreadyInCenter() {
        // Given
        Group center1 = createTestCenter();
        Group center2 = createTestCenter();
        Group group = createTestGroup(false);
        
        Set<Group> groupsToAdd = new HashSet<>();
        groupsToAdd.add(group);
        
        center1.associateGroups(groupsToAdd);
        
        // When/Then
        assertThrows(GroupExistsInCenterException.class, () -> {
            center2.associateGroups(groupsToAdd);
        });
    }

    @Test
    public void testDisassociateGroups() {
        // Given
        Group center = createTestCenter();
        Group group1 = createTestGroup(false);
        Group group2 = createTestGroup(false);
        
        Set<Group> groupsToAdd = new HashSet<>();
        groupsToAdd.add(group1);
        groupsToAdd.add(group2);
        center.associateGroups(groupsToAdd);
        
        Set<Group> groupsToRemove = new HashSet<>();
        groupsToRemove.add(group1);

        // When
        center.disassociateGroups(groupsToRemove);

        // Then
        assertEquals(1, center.getGroupMembers().size());
        assertFalse(center.hasGroupAsMember(group1));
        assertTrue(center.hasGroupAsMember(group2));
    }

    @Test
    public void testDisassociateGroupNotInCenter() {
        // Given
        Group center = createTestCenter();
        Group group1 = createTestGroup(false);
        Group group2 = createTestGroup(false);
        
        Set<Group> groupsToAdd = new HashSet<>();
        groupsToAdd.add(group1);
        center.associateGroups(groupsToAdd);
        
        Set<Group> groupsToRemove = new HashSet<>();
        groupsToRemove.add(group2);

        // When/Then
        assertThrows(GroupNotExistsInCenterException.class, () -> {
            center.disassociateGroups(groupsToRemove);
        });
    }

    @Test
    public void testCloseGroup() {
        // Given
        Group group = createTestGroup(true);
        assertTrue(group.isActive());
        
        // When
        group.close(user, null, LocalDate.now());
        
        // Then
        assertTrue(group.isClosed());
        assertFalse(group.isActive());
    }

    @Test
    public void testIsGroupsClientCountWithinMinMaxRange() {
        // Given
        Group group = createTestGroup(true);
        Client client1 = createMockClient(1L);
        Client client2 = createMockClient(2L);
        Set<Client> clientsToAdd = new HashSet<>();
        clientsToAdd.add(client1);
        clientsToAdd.add(client2);
        
        when(client1.isActive()).thenReturn(true);
        when(client2.isActive()).thenReturn(true);
        
        group.associateClients(clientsToAdd);
        
        // When/Then
        assertTrue(group.isGroupsClientCountWithinMinMaxRange(1, 5));
        assertTrue(group.isGroupsClientCountWithinMinMaxRange(2, 2));
        assertFalse(group.isGroupsClientCountWithinMinMaxRange(3, 5));
        assertFalse(group.isGroupsClientCountWithinMinMaxRange(0, 1));
    }

    // Helper methods
    private Group createTestGroup(boolean active) {
        String name = "Test Group";
        String externalId = "EXT-123";
        Set<Client> clientMembers = new HashSet<>();
        Set<Group> groupMembers = new HashSet<>();
        String accountNo = new RandomPasswordGenerator(19).generate();
        
        return Group.newGroup(office, staff, null, groupLevel, name, externalId, active, activationDate, clientMembers,
                groupMembers, submittedOnDate, user, accountNo);
    }
    
    private Group createTestCenter() {
        String name = "Test Center";
        String externalId = "EXT-CENTER-123";
        boolean active = true;
        Set<Client> clientMembers = new HashSet<>();
        Set<Group> groupMembers = new HashSet<>();
        String accountNo = new RandomPasswordGenerator(19).generate();
        
        return Group.newGroup(office, staff, null, centerLevel, name, externalId, active, activationDate, clientMembers,
                groupMembers, submittedOnDate, user, accountNo);
    }
    
    private Client createMockClient(Long id) {
        Client client = mock(Client.class);
        when(client.getId()).thenReturn(id);
        return client;
    }
}