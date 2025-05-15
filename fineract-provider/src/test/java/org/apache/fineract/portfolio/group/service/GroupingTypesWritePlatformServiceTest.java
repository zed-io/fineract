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
package org.apache.fineract.portfolio.group.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.apache.fineract.infrastructure.core.api.JsonCommand;
import org.apache.fineract.infrastructure.core.data.CommandProcessingResult;
import org.apache.fineract.infrastructure.core.data.CommandProcessingResultBuilder;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.security.service.PlatformSecurityContext;
import org.apache.fineract.organisation.office.domain.Office;
import org.apache.fineract.organisation.office.domain.OfficeRepository;
import org.apache.fineract.organisation.office.exception.OfficeNotFoundException;
import org.apache.fineract.organisation.staff.domain.Staff;
import org.apache.fineract.organisation.staff.domain.StaffRepository;
import org.apache.fineract.portfolio.calendar.domain.Calendar;
import org.apache.fineract.portfolio.calendar.domain.CalendarEntityType;
import org.apache.fineract.portfolio.calendar.domain.CalendarRepository;
import org.apache.fineract.portfolio.calendar.service.CalendarWritePlatformService;
import org.apache.fineract.portfolio.client.domain.Client;
import org.apache.fineract.portfolio.client.domain.ClientRepositoryWrapper;
import org.apache.fineract.portfolio.group.api.GroupingTypesApiConstants;
import org.apache.fineract.portfolio.group.domain.Group;
import org.apache.fineract.portfolio.group.domain.GroupLevel;
import org.apache.fineract.portfolio.group.domain.GroupLevelRepository;
import org.apache.fineract.portfolio.group.domain.GroupRepositoryWrapper;
import org.apache.fineract.portfolio.group.domain.GroupingTypeStatus;
import org.apache.fineract.portfolio.group.exception.GroupNotFoundException;
import org.apache.fineract.portfolio.group.serialization.GroupingTypesDataValidator;
import org.apache.fineract.portfolio.note.service.NoteWritePlatformService;
import org.apache.fineract.useradministration.domain.AppUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Unit tests for {@link GroupingTypesWritePlatformServiceJpaRepositoryImpl}
 */
public class GroupingTypesWritePlatformServiceTest {

    private GroupingTypesWritePlatformService groupingTypesWritePlatformService;

    @Mock
    private PlatformSecurityContext context;
    
    @Mock
    private GroupRepositoryWrapper groupRepository;
    
    @Mock
    private ClientRepositoryWrapper clientRepositoryWrapper;
    
    @Mock
    private OfficeRepository officeRepository;
    
    @Mock
    private StaffRepository staffRepository;
    
    @Mock
    private GroupLevelRepository groupLevelRepository;
    
    @Mock
    private GroupingTypesDataValidator fromApiJsonDeserializer;
    
    @Mock
    private CalendarRepository calendarRepository;
    
    @Mock
    private CalendarWritePlatformService calendarWritePlatformService;
    
    @Mock
    private NoteWritePlatformService noteWritePlatformService;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        
        groupingTypesWritePlatformService = new GroupingTypesWritePlatformServiceJpaRepositoryImpl(
                context, groupRepository, clientRepositoryWrapper, officeRepository, 
                staffRepository, groupLevelRepository, fromApiJsonDeserializer, 
                calendarRepository, calendarWritePlatformService, noteWritePlatformService);
    }

    @Test
    public void testCreateGroup() {
        // Given
        AppUser user = mock(AppUser.class);
        Office office = mock(Office.class);
        Staff staff = mock(Staff.class);
        GroupLevel groupLevel = mock(GroupLevel.class);
        JsonCommand command = mock(JsonCommand.class);
        Group savedGroup = mock(Group.class);
        
        // Setup command
        when(command.longValueOfParameterNamed(GroupingTypesApiConstants.officeIdParamName)).thenReturn(1L);
        when(command.longValueOfParameterNamed(GroupingTypesApiConstants.staffIdParamName)).thenReturn(1L);
        when(command.longValueOfParameterNamed(GroupingTypesApiConstants.centerIdParamName)).thenReturn(null);
        when(command.longValueOfParameterNamed(GroupingTypesApiConstants.levelIdParamName)).thenReturn(2L);
        when(command.booleanPrimitiveValueOfParameterNamed(GroupingTypesApiConstants.activeParamName)).thenReturn(true);
        when(command.localDateValueOfParameterNamed(GroupingTypesApiConstants.activationDateParamName)).thenReturn(LocalDate.now());
        when(command.stringValueOfParameterNamed(GroupingTypesApiConstants.nameParamName)).thenReturn("Test Group");
        when(command.stringValueOfParameterNamed(GroupingTypesApiConstants.externalIdParamName)).thenReturn("EXT-123");
        
        // Setup mocks
        when(context.authenticatedUser()).thenReturn(user);
        when(officeRepository.findById(1L)).thenReturn(java.util.Optional.of(office));
        when(staffRepository.findById(1L)).thenReturn(java.util.Optional.of(staff));
        when(groupLevelRepository.findById(2L)).thenReturn(java.util.Optional.of(groupLevel));
        
        // Group creation
        when(savedGroup.getId()).thenReturn(1L);
        when(groupRepository.saveAndFlush(any(Group.class))).thenReturn(savedGroup);
        
        // When
        CommandProcessingResult result = groupingTypesWritePlatformService.createGroup(command);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getGroupId());
        verify(groupRepository, times(1)).saveAndFlush(any(Group.class));
        verify(fromApiJsonDeserializer, times(1)).validateForCreateGroup(command.json());
    }

    @Test
    public void testUpdateGroup() {
        // Given
        AppUser user = mock(AppUser.class);
        Group group = mock(Group.class);
        JsonCommand command = mock(JsonCommand.class);
        
        // Setup command with changes
        when(command.json()).thenReturn("{\"name\":\"Updated Group Name\",\"externalId\":\"EXT-456\"}");
        
        // Setup mocks
        when(context.authenticatedUser()).thenReturn(user);
        when(groupRepository.findOneWithNotFoundDetection(1L)).thenReturn(group);
        when(group.getId()).thenReturn(1L);
        
        // Group update
        Map<String, Object> changes = mock(Map.class);
        when(group.update(any(JsonCommand.class))).thenReturn(changes);
        when(changes.isEmpty()).thenReturn(false);
        
        // When
        CommandProcessingResult result = groupingTypesWritePlatformService.updateGroup(1L, command);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getGroupId());
        verify(groupRepository, times(1)).findOneWithNotFoundDetection(1L);
        verify(group, times(1)).update(command);
        verify(groupRepository, times(1)).saveAndFlush(group);
        verify(fromApiJsonDeserializer, times(1)).validateForUpdateGroup(command.json());
    }

    @Test
    public void testActivateGroup() {
        // Given
        AppUser user = mock(AppUser.class);
        Group group = mock(Group.class);
        JsonCommand command = mock(JsonCommand.class);
        
        // Setup command
        when(command.json()).thenReturn("{\"activationDate\":\"" + DateUtils.getBusinessLocalDate().toString() + "\"}");
        LocalDate activationDate = DateUtils.getBusinessLocalDate();
        when(command.localDateValueOfParameterNamed(GroupingTypesApiConstants.activationDateParamName)).thenReturn(activationDate);
        
        // Setup mocks
        when(context.authenticatedUser()).thenReturn(user);
        when(groupRepository.findOneWithNotFoundDetection(1L)).thenReturn(group);
        when(group.getId()).thenReturn(1L);
        when(group.isActive()).thenReturn(false);
        
        // Calendar mocking
        Collection<Calendar> calendars = new ArrayList<>();
        when(calendarRepository.findByEntityIdAndEntityTypeId(1L, CalendarEntityType.GROUPS.getValue())).thenReturn(calendars);
        
        // When
        CommandProcessingResult result = groupingTypesWritePlatformService.activateGroup(1L, command);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getGroupId());
        verify(groupRepository, times(1)).findOneWithNotFoundDetection(1L);
        verify(group, times(1)).activate(user, activationDate);
        verify(groupRepository, times(1)).saveAndFlush(group);
        verify(fromApiJsonDeserializer, times(1)).validateForActivation(command.json());
    }

    @Test
    public void testUnassignGroupStaff() {
        // Given
        AppUser user = mock(AppUser.class);
        Group group = mock(Group.class);
        JsonCommand command = mock(JsonCommand.class);
        
        // Setup mocks
        when(context.authenticatedUser()).thenReturn(user);
        when(groupRepository.findOneWithNotFoundDetection(1L)).thenReturn(group);
        when(group.getId()).thenReturn(1L);
        
        // When
        CommandProcessingResult result = groupingTypesWritePlatformService.unassignGroupStaff(1L, command);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getGroupId());
        verify(groupRepository, times(1)).findOneWithNotFoundDetection(1L);
        verify(group, times(1)).unassignStaff();
        verify(groupRepository, times(1)).saveAndFlush(group);
    }

    @Test
    public void testAssociateClientsToGroup() {
        // Given
        Group group = mock(Group.class);
        JsonCommand command = mock(JsonCommand.class);
        
        // Setup command
        when(command.arrayValueOfParameterNamed(GroupingTypesApiConstants.clientMembersParamName))
            .thenReturn(new Long[] {1L, 2L});
        
        // Setup client mocks
        Client client1 = mock(Client.class);
        Client client2 = mock(Client.class);
        when(clientRepositoryWrapper.findOneWithNotFoundDetection(1L)).thenReturn(client1);
        when(clientRepositoryWrapper.findOneWithNotFoundDetection(2L)).thenReturn(client2);
        
        // Setup group mock
        when(groupRepository.findOneWithNotFoundDetection(1L)).thenReturn(group);
        when(group.getId()).thenReturn(1L);
        
        // Setup client association
        HashSet<Client> clientMembers = new HashSet<>();
        clientMembers.add(client1);
        clientMembers.add(client2);
        when(group.associateClients(clientMembers)).thenReturn(List.of("1", "2"));
        
        // When
        CommandProcessingResult result = groupingTypesWritePlatformService.associateClientsToGroup(1L, command);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getGroupId());
        verify(groupRepository, times(1)).findOneWithNotFoundDetection(1L);
        verify(group, times(1)).associateClients(clientMembers);
        verify(groupRepository, times(1)).saveAndFlush(group);
    }

    @Test
    public void testCloseGroup() {
        // Given
        AppUser user = mock(AppUser.class);
        Group group = mock(Group.class);
        JsonCommand command = mock(JsonCommand.class);
        
        // Setup command
        LocalDate closureDate = DateUtils.getBusinessLocalDate();
        when(command.localDateValueOfParameterNamed(GroupingTypesApiConstants.closureDateParamName)).thenReturn(closureDate);
        
        // Setup mocks
        when(context.authenticatedUser()).thenReturn(user);
        when(groupRepository.findOneWithNotFoundDetection(1L)).thenReturn(group);
        when(group.getId()).thenReturn(1L);
        
        // Closure mocking
        when(group.hasActiveClients()).thenReturn(false);
        when(group.hasActiveGroups()).thenReturn(false);
        doNothing().when(group).close(eq(user), any(), eq(closureDate));
        
        // When
        CommandProcessingResult result = groupingTypesWritePlatformService.closeGroup(1L, command);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getGroupId());
        verify(groupRepository, times(1)).findOneWithNotFoundDetection(1L);
        verify(group, times(1)).close(eq(user), any(), eq(closureDate));
        verify(groupRepository, times(1)).saveAndFlush(group);
        verify(fromApiJsonDeserializer, times(1)).validateForGroupClose(command.json());
    }

    @Test
    public void testDeleteGroup() {
        // Given
        Group group = mock(Group.class);
        
        // Setup mocks
        when(groupRepository.findOneWithNotFoundDetection(1L)).thenReturn(group);
        when(group.getId()).thenReturn(1L);
        
        // Setup group status
        when(group.hasActiveClients()).thenReturn(false);
        when(group.hasActiveGroups()).thenReturn(false);
        when(group.isNotPending()).thenReturn(false);
        
        // When
        CommandProcessingResult result = groupingTypesWritePlatformService.deleteGroup(1L);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getGroupId());
        verify(groupRepository, times(1)).findOneWithNotFoundDetection(1L);
        verify(groupRepository, times(1)).delete(group);
    }

    @Test
    public void testGroupNotFound() {
        // Given
        when(groupRepository.findOneWithNotFoundDetection(anyLong())).thenThrow(new GroupNotFoundException(1L));
        
        // When/Then
        assertThrows(GroupNotFoundException.class, () -> {
            groupingTypesWritePlatformService.updateGroup(1L, mock(JsonCommand.class));
        });
    }

    @Test
    public void testOfficeNotFound() {
        // Given
        JsonCommand command = mock(JsonCommand.class);
        when(command.longValueOfParameterNamed(GroupingTypesApiConstants.officeIdParamName)).thenReturn(1L);
        when(officeRepository.findById(1L)).thenReturn(java.util.Optional.empty());
        
        // When/Then
        assertThrows(OfficeNotFoundException.class, () -> {
            groupingTypesWritePlatformService.createGroup(command);
        });
    }
}