/**
 * Group management service for Fineract
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import {
  Group,
  GroupStatus,
  GroupCreateRequest,
  GroupUpdateRequest,
  GroupActivationRequest,
  GroupCloseRequest,
  GroupMember,
  GroupRole,
  GroupMemberAssignRequest,
  GroupRoleAssignRequest,
  GroupNote,
  GroupNoteCreateRequest,
  GroupTransfer,
  GroupTransferRequest,
  GroupSearchCriteria,
  GroupListResponse,
  GroupSummary,
  GroupDetailResponse,
  GroupCreateResponse,
  GroupDeleteRequest
} from '../models/group';

/**
 * Group service for managing group-related operations
 */
export class GroupService {
  
  /**
   * Create a new group
   * @param request Group creation request
   * @param userId Current user ID
   * @returns Group creation response
   */
  async createGroup(request: GroupCreateRequest, userId?: string): Promise<GroupCreateResponse> {
    logger.info('Creating new group', { groupName: request.groupName });
    
    try {
      return await transaction(async (client) => {
        // Check if office exists
        const officeResult = await client.query(
          'SELECT id FROM office WHERE id = $1',
          [request.officeId]
        );
        
        if (officeResult.rowCount === 0) {
          throw new Error(`Office with ID ${request.officeId} not found`);
        }
        
        // Check staff if provided
        if (request.staffId) {
          const staffResult = await client.query(
            'SELECT id FROM staff WHERE id = $1',
            [request.staffId]
          );
          
          if (staffResult.rowCount === 0) {
            throw new Error(`Staff with ID ${request.staffId} not found`);
          }
        }
        
        // Check parent group if provided
        if (request.parentId) {
          const parentResult = await client.query(
            'SELECT id FROM client_group WHERE id = $1',
            [request.parentId]
          );
          
          if (parentResult.rowCount === 0) {
            throw new Error(`Parent group with ID ${request.parentId} not found`);
          }
        }
        
        // Generate a unique ID for the group
        const groupId = uuidv4();
        
        // Insert new group record
        await client.query(
          `INSERT INTO client_group (
            id, office_id, staff_id, parent_id, level_id, group_name, 
            external_id, status, activation_date, submitted_date, 
            submitter_user_id, is_centralized_group, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            groupId,
            request.officeId,
            request.staffId || null,
            request.parentId || null,
            request.levelId || null,
            request.groupName,
            request.externalId || null,
            request.activationDate ? GroupStatus.ACTIVE : GroupStatus.PENDING,
            request.activationDate ? new Date(request.activationDate) : null,
            request.submittedDate ? new Date(request.submittedDate) : new Date(),
            userId || null,
            request.isCentralizedGroup || false,
            userId || null
          ]
        );
        
        // Add client members if provided
        if (request.clientMembers && request.clientMembers.length > 0) {
          // Verify that all clients exist
          const clientIds = request.clientMembers;
          const clientsResult = await client.query(
            'SELECT id FROM client WHERE id = ANY($1)',
            [clientIds]
          );
          
          if (clientsResult.rowCount !== clientIds.length) {
            throw new Error('One or more clients not found');
          }
          
          // Add clients to the group
          for (const clientId of clientIds) {
            await client.query(
              `INSERT INTO client_group_member (
                id, group_id, client_id, created_by, created_date
              ) VALUES ($1, $2, $3, $4, NOW())`,
              [uuidv4(), groupId, clientId, userId || null]
            );
          }
        }
        
        return {
          officeId: request.officeId,
          groupId: groupId,
          resourceId: groupId
        };
      });
    } catch (error) {
      logger.error('Error creating group', { error, request });
      throw error;
    }
  }
  
  /**
   * Update an existing group
   * @param groupId Group ID to update
   * @param request Group update request
   * @param userId Current user ID
   * @returns Updated group
   */
  async updateGroup(groupId: string, request: GroupUpdateRequest, userId?: string): Promise<Group> {
    logger.info('Updating group', { groupId, request });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        // Cannot update a closed group
        if (group.status === GroupStatus.CLOSED) {
          throw new Error('Cannot update a closed group');
        }
        
        // Check office if provided
        if (request.officeId) {
          const officeResult = await client.query(
            'SELECT id FROM office WHERE id = $1',
            [request.officeId]
          );
          
          if (officeResult.rowCount === 0) {
            throw new Error(`Office with ID ${request.officeId} not found`);
          }
        }
        
        // Check staff if provided
        if (request.staffId) {
          const staffResult = await client.query(
            'SELECT id FROM staff WHERE id = $1',
            [request.staffId]
          );
          
          if (staffResult.rowCount === 0) {
            throw new Error(`Staff with ID ${request.staffId} not found`);
          }
        }
        
        // Build the update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        if (request.groupName !== undefined) {
          updates.push(`group_name = $${paramIndex++}`);
          values.push(request.groupName);
        }
        
        if (request.officeId !== undefined) {
          updates.push(`office_id = $${paramIndex++}`);
          values.push(request.officeId);
        }
        
        if (request.staffId !== undefined) {
          updates.push(`staff_id = $${paramIndex++}`);
          values.push(request.staffId || null);
        }
        
        if (request.externalId !== undefined) {
          updates.push(`external_id = $${paramIndex++}`);
          values.push(request.externalId || null);
        }
        
        if (request.isCentralizedGroup !== undefined) {
          updates.push(`is_centralized_group = $${paramIndex++}`);
          values.push(request.isCentralizedGroup);
        }
        
        // Add audit fields
        updates.push(`last_modified_by = $${paramIndex++}`);
        values.push(userId || null);
        
        updates.push(`last_modified_date = $${paramIndex++}`);
        values.push(new Date());
        
        // Add the group ID as the last parameter
        values.push(groupId);
        
        // Execute update
        const updateResult = await client.query(
          `UPDATE client_group 
           SET ${updates.join(', ')} 
           WHERE id = $${paramIndex} 
           RETURNING *`,
          values
        );
        
        const updatedGroup = updateResult.rows[0];
        
        // Map to Group interface
        return {
          id: updatedGroup.id,
          officeId: updatedGroup.office_id,
          staffId: updatedGroup.staff_id,
          parentId: updatedGroup.parent_id,
          levelId: updatedGroup.level_id,
          groupName: updatedGroup.group_name,
          externalId: updatedGroup.external_id,
          status: updatedGroup.status,
          activationDate: updatedGroup.activation_date,
          submittedDate: updatedGroup.submitted_date,
          submitterUserId: updatedGroup.submitter_user_id,
          isCentralizedGroup: updatedGroup.is_centralized_group,
          hierarchy: updatedGroup.hierarchy,
          createdDate: updatedGroup.created_date,
          createdBy: updatedGroup.created_by,
          lastModifiedDate: updatedGroup.last_modified_date,
          lastModifiedBy: updatedGroup.last_modified_by,
          closedDate: updatedGroup.closed_date,
          closedByUserId: updatedGroup.closed_by_userid
        };
      });
    } catch (error) {
      logger.error('Error updating group', { error, groupId, request });
      throw error;
    }
  }
  
  /**
   * Get a group by ID with optional details
   * @param groupId Group ID
   * @param includeMembers Whether to include member details
   * @param includeRoles Whether to include role assignments
   * @param includeNotes Whether to include notes
   * @returns Group detail response
   */
  async getGroup(
    groupId: string, 
    includeMembers: boolean = true, 
    includeRoles: boolean = true, 
    includeNotes: boolean = false
  ): Promise<GroupDetailResponse> {
    logger.info('Getting group by ID', { groupId });
    
    try {
      return await transaction(async (client) => {
        // Get group details
        const groupResult = await client.query(
          `SELECT g.*, o.name as office_name, s.display_name as staff_name
           FROM client_group g
           LEFT JOIN office o ON g.office_id = o.id
           LEFT JOIN staff s ON g.staff_id = s.id
           WHERE g.id = $1`,
          [groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${groupId} not found`);
        }
        
        const groupData = groupResult.rows[0];
        
        // Map to Group interface
        const group: Group = {
          id: groupData.id,
          officeId: groupData.office_id,
          officeName: groupData.office_name,
          staffId: groupData.staff_id,
          staffName: groupData.staff_name,
          parentId: groupData.parent_id,
          levelId: groupData.level_id,
          groupName: groupData.group_name,
          externalId: groupData.external_id,
          status: groupData.status,
          activationDate: groupData.activation_date,
          submittedDate: groupData.submitted_date,
          submitterUserId: groupData.submitter_user_id,
          isCentralizedGroup: groupData.is_centralized_group,
          hierarchy: groupData.hierarchy,
          createdDate: groupData.created_date,
          createdBy: groupData.created_by,
          lastModifiedDate: groupData.last_modified_date,
          lastModifiedBy: groupData.last_modified_by,
          closedDate: groupData.closed_date,
          closedByUserId: groupData.closed_by_userid
        };
        
        const response: GroupDetailResponse = { group, members: [], roles: [] };
        
        // Get group members if requested
        if (includeMembers) {
          const membersResult = await client.query(
            `SELECT gm.*, c.display_name as client_name, c.account_no
             FROM client_group_member gm
             JOIN client c ON gm.client_id = c.id
             WHERE gm.group_id = $1`,
            [groupId]
          );
          
          response.members = membersResult.rows.map(row => ({
            id: row.id,
            groupId: row.group_id,
            clientId: row.client_id,
            clientName: row.client_name,
            accountNo: row.account_no,
            createdDate: row.created_date,
            createdBy: row.created_by,
            lastModifiedDate: row.last_modified_date,
            lastModifiedBy: row.last_modified_by
          }));
        }
        
        // Get role assignments if requested
        if (includeRoles) {
          const rolesResult = await client.query(
            `SELECT gr.*, c.display_name as client_name, cv.code_value as role_name
             FROM client_group_role gr
             JOIN client c ON gr.client_id = c.id
             JOIN code_value cv ON gr.role_id = cv.id
             WHERE gr.group_id = $1`,
            [groupId]
          );
          
          response.roles = rolesResult.rows.map(row => ({
            id: row.id,
            groupId: row.group_id,
            clientId: row.client_id,
            clientName: row.client_name,
            roleId: row.role_id,
            roleName: row.role_name,
            createdDate: row.created_date,
            createdBy: row.created_by,
            lastModifiedDate: row.last_modified_date,
            lastModifiedBy: row.last_modified_by
          }));
        }
        
        // Get notes if requested
        if (includeNotes) {
          const notesResult = await client.query(
            `SELECT * FROM group_note WHERE group_id = $1 ORDER BY created_date DESC`,
            [groupId]
          );
          
          response.notes = notesResult.rows.map(row => ({
            id: row.id,
            groupId: row.group_id,
            note: row.note,
            createdDate: row.created_date,
            createdBy: row.created_by,
            lastModifiedDate: row.last_modified_date,
            lastModifiedBy: row.last_modified_by
          }));
        }
        
        // Get parent group if exists
        if (group.parentId) {
          const parentResult = await client.query(
            `SELECT g.*, o.name as office_name, s.display_name as staff_name,
             (SELECT COUNT(*) FROM client_group_member WHERE group_id = g.id) as member_count
             FROM client_group g
             LEFT JOIN office o ON g.office_id = o.id
             LEFT JOIN staff s ON g.staff_id = s.id
             WHERE g.id = $1`,
            [group.parentId]
          );
          
          if (parentResult.rowCount > 0) {
            const parent = parentResult.rows[0];
            response.parentGroup = {
              id: parent.id,
              accountNo: parent.account_no || '',
              name: parent.group_name,
              status: parent.status,
              activationDate: parent.activation_date,
              officeId: parent.office_id,
              officeName: parent.office_name,
              staffId: parent.staff_id,
              staffName: parent.staff_name,
              hierarchy: parent.hierarchy,
              levelId: parent.level_id,
              memberCount: parseInt(parent.member_count),
              externalId: parent.external_id
            };
          }
        }
        
        // Get child groups
        const childrenResult = await client.query(
          `SELECT g.*, o.name as office_name, s.display_name as staff_name,
           (SELECT COUNT(*) FROM client_group_member WHERE group_id = g.id) as member_count
           FROM client_group g
           LEFT JOIN office o ON g.office_id = o.id
           LEFT JOIN staff s ON g.staff_id = s.id
           WHERE g.parent_id = $1`,
          [groupId]
        );
        
        if (childrenResult.rowCount > 0) {
          response.childGroups = childrenResult.rows.map(child => ({
            id: child.id,
            accountNo: child.account_no || '',
            name: child.group_name,
            status: child.status,
            activationDate: child.activation_date,
            officeId: child.office_id,
            officeName: child.office_name,
            staffId: child.staff_id,
            staffName: child.staff_name,
            hierarchy: child.hierarchy,
            levelId: child.level_id,
            parentId: child.parent_id,
            memberCount: parseInt(child.member_count),
            externalId: child.external_id
          }));
        }
        
        return response;
      });
    } catch (error) {
      logger.error('Error getting group', { error, groupId });
      throw error;
    }
  }
  
  /**
   * Activate a group
   * @param groupId Group ID to activate
   * @param request Activation request with date
   * @param userId Current user ID
   * @returns Activated group
   */
  async activateGroup(groupId: string, request: GroupActivationRequest, userId?: string): Promise<Group> {
    logger.info('Activating group', { groupId, activationDate: request.activationDate });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists and is in pending status
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        if (group.status === GroupStatus.ACTIVE) {
          throw new Error('Group is already active');
        }
        
        if (group.status === GroupStatus.CLOSED) {
          throw new Error('Cannot activate a closed group');
        }
        
        // Parse activation date
        const activationDate = new Date(request.activationDate);
        
        // Execute activation
        const updateResult = await client.query(
          `UPDATE client_group
           SET status = $1, activation_date = $2, last_modified_by = $3, last_modified_date = NOW()
           WHERE id = $4
           RETURNING *`,
          [GroupStatus.ACTIVE, activationDate, userId || null, groupId]
        );
        
        const updatedGroup = updateResult.rows[0];
        
        // Map to Group interface
        return {
          id: updatedGroup.id,
          officeId: updatedGroup.office_id,
          staffId: updatedGroup.staff_id,
          parentId: updatedGroup.parent_id,
          levelId: updatedGroup.level_id,
          groupName: updatedGroup.group_name,
          externalId: updatedGroup.external_id,
          status: updatedGroup.status,
          activationDate: updatedGroup.activation_date,
          submittedDate: updatedGroup.submitted_date,
          submitterUserId: updatedGroup.submitter_user_id,
          isCentralizedGroup: updatedGroup.is_centralized_group,
          hierarchy: updatedGroup.hierarchy,
          createdDate: updatedGroup.created_date,
          createdBy: updatedGroup.created_by,
          lastModifiedDate: updatedGroup.last_modified_date,
          lastModifiedBy: updatedGroup.last_modified_by,
          closedDate: updatedGroup.closed_date,
          closedByUserId: updatedGroup.closed_by_userid
        };
      });
    } catch (error) {
      logger.error('Error activating group', { error, groupId, request });
      throw error;
    }
  }
  
  /**
   * Close a group
   * @param groupId Group ID to close
   * @param request Close request with date and reason
   * @param userId Current user ID
   * @returns Closed group
   */
  async closeGroup(groupId: string, request: GroupCloseRequest, userId?: string): Promise<Group> {
    logger.info('Closing group', { groupId, closureDate: request.closureDate });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists and is active
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        if (group.status === GroupStatus.CLOSED) {
          throw new Error('Group is already closed');
        }
        
        if (group.status !== GroupStatus.ACTIVE) {
          throw new Error('Only active groups can be closed');
        }
        
        // Check for active loans or savings
        const activeLoansResult = await client.query(
          `SELECT COUNT(*) FROM loan 
           WHERE group_id = $1 AND status IN ('active', 'approved')`,
          [groupId]
        );
        
        if (parseInt(activeLoansResult.rows[0].count) > 0) {
          throw new Error('Cannot close group with active loans');
        }
        
        const activeSavingsResult = await client.query(
          `SELECT COUNT(*) FROM savings_account 
           WHERE group_id = $1 AND status IN ('active', 'approved')`,
          [groupId]
        );
        
        if (parseInt(activeSavingsResult.rows[0].count) > 0) {
          throw new Error('Cannot close group with active savings accounts');
        }
        
        // Parse closure date
        const closureDate = new Date(request.closureDate);
        
        // Execute closure
        const updateResult = await client.query(
          `UPDATE client_group
           SET status = $1, closed_date = $2, closed_by_userid = $3, 
               last_modified_by = $3, last_modified_date = NOW()
           WHERE id = $4
           RETURNING *`,
          [GroupStatus.CLOSED, closureDate, userId || null, groupId]
        );
        
        const updatedGroup = updateResult.rows[0];
        
        // Add a note if reason is provided
        if (request.closureReason) {
          await client.query(
            `INSERT INTO group_note (id, group_id, note, created_by, created_date)
             VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), groupId, `Group closed: ${request.closureReason}`, userId || null]
          );
        }
        
        // Map to Group interface
        return {
          id: updatedGroup.id,
          officeId: updatedGroup.office_id,
          staffId: updatedGroup.staff_id,
          parentId: updatedGroup.parent_id,
          levelId: updatedGroup.level_id,
          groupName: updatedGroup.group_name,
          externalId: updatedGroup.external_id,
          status: updatedGroup.status,
          activationDate: updatedGroup.activation_date,
          submittedDate: updatedGroup.submitted_date,
          submitterUserId: updatedGroup.submitter_user_id,
          isCentralizedGroup: updatedGroup.is_centralized_group,
          hierarchy: updatedGroup.hierarchy,
          createdDate: updatedGroup.created_date,
          createdBy: updatedGroup.created_by,
          lastModifiedDate: updatedGroup.last_modified_date,
          lastModifiedBy: updatedGroup.last_modified_by,
          closedDate: updatedGroup.closed_date,
          closedByUserId: updatedGroup.closed_by_userid
        };
      });
    } catch (error) {
      logger.error('Error closing group', { error, groupId, request });
      throw error;
    }
  }
  
  /**
   * Delete a group
   * @param request Group deletion request
   * @returns True if deletion succeeded
   */
  async deleteGroup(request: GroupDeleteRequest): Promise<boolean> {
    logger.info('Deleting group', { groupId: request.groupId });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [request.groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${request.groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        // Cannot delete a group with active loans or savings
        const activeLoansResult = await client.query(
          `SELECT COUNT(*) FROM loan WHERE group_id = $1`,
          [request.groupId]
        );
        
        if (parseInt(activeLoansResult.rows[0].count) > 0) {
          throw new Error('Cannot delete group with loans');
        }
        
        const activeSavingsResult = await client.query(
          `SELECT COUNT(*) FROM savings_account WHERE group_id = $1`,
          [request.groupId]
        );
        
        if (parseInt(activeSavingsResult.rows[0].count) > 0) {
          throw new Error('Cannot delete group with savings accounts');
        }
        
        // Check if this group has child groups
        const childGroupsResult = await client.query(
          'SELECT COUNT(*) FROM client_group WHERE parent_id = $1',
          [request.groupId]
        );
        
        if (parseInt(childGroupsResult.rows[0].count) > 0) {
          throw new Error('Cannot delete group with child groups');
        }
        
        // Delete all related records first
        await client.query('DELETE FROM client_group_role WHERE group_id = $1', [request.groupId]);
        await client.query('DELETE FROM client_group_member WHERE group_id = $1', [request.groupId]);
        await client.query('DELETE FROM group_note WHERE group_id = $1', [request.groupId]);
        
        // Delete the group
        const deleteResult = await client.query(
          'DELETE FROM client_group WHERE id = $1',
          [request.groupId]
        );
        
        return deleteResult.rowCount > 0;
      });
    } catch (error) {
      logger.error('Error deleting group', { error, groupId: request.groupId });
      throw error;
    }
  }
  
  /**
   * Search for groups with various criteria
   * @param criteria Search criteria
   * @param limit Maximum number of items to return
   * @param offset Pagination offset
   * @returns List of groups matching criteria
   */
  async searchGroups(
    criteria: GroupSearchCriteria, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<GroupListResponse> {
    logger.info('Searching groups', { criteria, limit, offset });
    
    try {
      // Build WHERE clause based on criteria
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      if (criteria.name) {
        whereConditions.push(`g.group_name ILIKE $${paramIndex++}`);
        queryParams.push(`%${criteria.name}%`);
      }
      
      if (criteria.officeId) {
        whereConditions.push(`g.office_id = $${paramIndex++}`);
        queryParams.push(criteria.officeId);
      }
      
      if (criteria.staffId) {
        whereConditions.push(`g.staff_id = $${paramIndex++}`);
        queryParams.push(criteria.staffId);
      }
      
      if (criteria.status) {
        whereConditions.push(`g.status = $${paramIndex++}`);
        queryParams.push(criteria.status);
      }
      
      if (criteria.externalId) {
        whereConditions.push(`g.external_id = $${paramIndex++}`);
        queryParams.push(criteria.externalId);
      }
      
      if (criteria.parentId) {
        whereConditions.push(`g.parent_id = $${paramIndex++}`);
        queryParams.push(criteria.parentId);
      }
      
      if (criteria.isParent !== undefined) {
        if (criteria.isParent) {
          whereConditions.push(`EXISTS (SELECT 1 FROM client_group cg WHERE cg.parent_id = g.id)`);
        } else {
          whereConditions.push(`NOT EXISTS (SELECT 1 FROM client_group cg WHERE cg.parent_id = g.id)`);
        }
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM client_group g
        ${whereClause}
      `;
      
      const countResult = await query(countQuery, queryParams);
      const totalCount = parseInt(countResult.rows[0].total);
      
      // Get paginated results
      queryParams.push(limit, offset);
      
      const groupsQuery = `
        SELECT g.*, o.name as office_name, s.display_name as staff_name,
          l.code_value as level_name, pg.group_name as parent_name,
          (SELECT COUNT(*) FROM client_group_member WHERE group_id = g.id) as member_count
        FROM client_group g
        LEFT JOIN office o ON g.office_id = o.id
        LEFT JOIN staff s ON g.staff_id = s.id
        LEFT JOIN code_value l ON g.level_id = l.id
        LEFT JOIN client_group pg ON g.parent_id = pg.id
        ${whereClause}
        ORDER BY g.created_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      const groupsResult = await query(groupsQuery, queryParams);
      
      // Map results to GroupSummary objects
      const groups: GroupSummary[] = groupsResult.rows.map(row => ({
        id: row.id,
        accountNo: row.account_no || '',
        name: row.group_name,
        status: row.status,
        activationDate: row.activation_date,
        officeId: row.office_id,
        officeName: row.office_name,
        staffId: row.staff_id,
        staffName: row.staff_name,
        hierarchy: row.hierarchy,
        levelId: row.level_id,
        levelName: row.level_name,
        parentId: row.parent_id,
        parentName: row.parent_name,
        memberCount: parseInt(row.member_count),
        externalId: row.external_id
      }));
      
      return {
        totalFilteredRecords: totalCount,
        pageItems: groups
      };
    } catch (error) {
      logger.error('Error searching groups', { error, criteria });
      throw error;
    }
  }
  
  /**
   * Assign clients to a group
   * @param request Member assignment request
   * @param userId Current user ID
   * @returns List of added members
   */
  async assignMembers(request: GroupMemberAssignRequest, userId?: string): Promise<GroupMember[]> {
    logger.info('Assigning members to group', { groupId: request.groupId, clientCount: request.clientIds.length });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [request.groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${request.groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        if (group.status === GroupStatus.CLOSED) {
          throw new Error('Cannot add members to a closed group');
        }
        
        // Verify that clients exist
        const clientsResult = await client.query(
          'SELECT id, display_name, account_no FROM client WHERE id = ANY($1)',
          [request.clientIds]
        );
        
        if (clientsResult.rowCount !== request.clientIds.length) {
          throw new Error('One or more clients not found');
        }
        
        // Check for existing members to avoid duplicates
        const existingMembersResult = await client.query(
          'SELECT client_id FROM client_group_member WHERE group_id = $1 AND client_id = ANY($2)',
          [request.groupId, request.clientIds]
        );
        
        const existingClientIds = existingMembersResult.rows.map(row => row.client_id);
        const newClientIds = request.clientIds.filter(id => !existingClientIds.includes(id));
        
        if (newClientIds.length === 0) {
          throw new Error('All specified clients are already members of this group');
        }
        
        // Add new members
        const addedMembers: GroupMember[] = [];
        
        for (const clientData of clientsResult.rows) {
          if (newClientIds.includes(clientData.id)) {
            const memberId = uuidv4();
            
            await client.query(
              `INSERT INTO client_group_member (
                id, group_id, client_id, created_by, created_date
              ) VALUES ($1, $2, $3, $4, NOW())`,
              [memberId, request.groupId, clientData.id, userId || null]
            );
            
            addedMembers.push({
              id: memberId,
              groupId: request.groupId,
              clientId: clientData.id,
              clientName: clientData.display_name,
              accountNo: clientData.account_no,
              createdBy: userId || undefined,
              createdDate: new Date()
            });
          }
        }
        
        return addedMembers;
      });
    } catch (error) {
      logger.error('Error assigning members to group', { error, request });
      throw error;
    }
  }
  
  /**
   * Remove a client from a group
   * @param groupId Group ID
   * @param clientId Client ID to remove
   * @returns True if removal succeeded
   */
  async removeMember(groupId: string, clientId: string): Promise<boolean> {
    logger.info('Removing member from group', { groupId, clientId });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        if (group.status === GroupStatus.CLOSED) {
          throw new Error('Cannot remove members from a closed group');
        }
        
        // Verify membership exists
        const membershipResult = await client.query(
          'SELECT * FROM client_group_member WHERE group_id = $1 AND client_id = $2',
          [groupId, clientId]
        );
        
        if (membershipResult.rowCount === 0) {
          throw new Error(`Client with ID ${clientId} is not a member of this group`);
        }
        
        // Check if client has any roles in the group
        await client.query(
          'DELETE FROM client_group_role WHERE group_id = $1 AND client_id = $2',
          [groupId, clientId]
        );
        
        // Remove from group
        const deleteResult = await client.query(
          'DELETE FROM client_group_member WHERE group_id = $1 AND client_id = $2',
          [groupId, clientId]
        );
        
        return deleteResult.rowCount > 0;
      });
    } catch (error) {
      logger.error('Error removing member from group', { error, groupId, clientId });
      throw error;
    }
  }
  
  /**
   * Assign a role to a client in a group
   * @param request Role assignment request
   * @param userId Current user ID
   * @returns Assigned role
   */
  async assignRole(request: GroupRoleAssignRequest, userId?: string): Promise<GroupRole> {
    logger.info('Assigning role in group', { groupId: request.groupId, clientId: request.clientId, roleId: request.roleId });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [request.groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${request.groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        if (group.status === GroupStatus.CLOSED) {
          throw new Error('Cannot assign roles in a closed group');
        }
        
        // Verify client is a member of the group
        const membershipResult = await client.query(
          'SELECT * FROM client_group_member WHERE group_id = $1 AND client_id = $2',
          [request.groupId, request.clientId]
        );
        
        if (membershipResult.rowCount === 0) {
          throw new Error(`Client with ID ${request.clientId} is not a member of this group`);
        }
        
        // Verify role exists
        const roleResult = await client.query(
          'SELECT * FROM code_value WHERE id = $1 AND code_id = (SELECT id FROM code WHERE name = \'GroupRole\')',
          [request.roleId]
        );
        
        if (roleResult.rowCount === 0) {
          throw new Error(`Role with ID ${request.roleId} not found`);
        }
        
        // Check if this role is already assigned to this client in this group
        const existingRoleResult = await client.query(
          'SELECT * FROM client_group_role WHERE group_id = $1 AND client_id = $2 AND role_id = $3',
          [request.groupId, request.clientId, request.roleId]
        );
        
        if (existingRoleResult.rowCount > 0) {
          throw new Error('This role is already assigned to this client in this group');
        }
        
        // For unique roles like leader, check if another client already has this role
        const uniqueRoles = ['Leader', 'Secretary', 'Treasurer'];
        const roleName = roleResult.rows[0].code_value;
        
        if (uniqueRoles.includes(roleName)) {
          const duplicateRoleResult = await client.query(
            `SELECT cgr.* 
             FROM client_group_role cgr
             JOIN code_value cv ON cgr.role_id = cv.id
             WHERE cgr.group_id = $1 AND cv.code_value = $2`,
            [request.groupId, roleName]
          );
          
          if (duplicateRoleResult.rowCount > 0) {
            throw new Error(`This group already has a ${roleName}`);
          }
        }
        
        // Assign the role
        const roleId = uuidv4();
        
        await client.query(
          `INSERT INTO client_group_role (
            id, group_id, client_id, role_id, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [roleId, request.groupId, request.clientId, request.roleId, userId || null]
        );
        
        // Get client name
        const clientResult = await client.query(
          'SELECT display_name FROM client WHERE id = $1',
          [request.clientId]
        );
        
        return {
          id: roleId,
          groupId: request.groupId,
          clientId: request.clientId,
          clientName: clientResult.rows[0].display_name,
          roleId: request.roleId,
          roleName: roleName,
          createdBy: userId || undefined,
          createdDate: new Date()
        };
      });
    } catch (error) {
      logger.error('Error assigning role in group', { error, request });
      throw error;
    }
  }
  
  /**
   * Remove a role from a client in a group
   * @param groupId Group ID
   * @param clientId Client ID
   * @param roleId Role ID
   * @returns True if removal succeeded
   */
  async removeRole(groupId: string, clientId: string, roleId: string): Promise<boolean> {
    logger.info('Removing role from client in group', { groupId, clientId, roleId });
    
    try {
      // Verify role assignment exists
      const roleResult = await query(
        'SELECT * FROM client_group_role WHERE group_id = $1 AND client_id = $2 AND role_id = $3',
        [groupId, clientId, roleId]
      );
      
      if (roleResult.rowCount === 0) {
        throw new Error('Role assignment not found');
      }
      
      // Remove the role
      const deleteResult = await query(
        'DELETE FROM client_group_role WHERE group_id = $1 AND client_id = $2 AND role_id = $3',
        [groupId, clientId, roleId]
      );
      
      return deleteResult.rowCount > 0;
    } catch (error) {
      logger.error('Error removing role from client in group', { error, groupId, clientId, roleId });
      throw error;
    }
  }
  
  /**
   * Add a note to a group
   * @param request Note creation request
   * @param userId Current user ID
   * @returns Created note
   */
  async addNote(request: GroupNoteCreateRequest, userId?: string): Promise<GroupNote> {
    logger.info('Adding note to group', { groupId: request.groupId });
    
    try {
      // Verify group exists
      const groupResult = await query(
        'SELECT * FROM client_group WHERE id = $1',
        [request.groupId]
      );
      
      if (groupResult.rowCount === 0) {
        throw new Error(`Group with ID ${request.groupId} not found`);
      }
      
      // Add the note
      const noteId = uuidv4();
      
      const noteResult = await query(
        `INSERT INTO group_note (
          id, group_id, note, created_by, created_date
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING created_date`,
        [noteId, request.groupId, request.note, userId || null]
      );
      
      return {
        id: noteId,
        groupId: request.groupId,
        note: request.note,
        createdBy: userId || undefined,
        createdDate: noteResult.rows[0].created_date
      };
    } catch (error) {
      logger.error('Error adding note to group', { error, request });
      throw error;
    }
  }
  
  /**
   * Transfer a group to another office
   * @param request Group transfer request
   * @param userId Current user ID
   * @returns Transfer record
   */
  async transferGroup(request: GroupTransferRequest, userId?: string): Promise<GroupTransfer> {
    logger.info('Transferring group to another office', { 
      groupId: request.groupId, 
      destinationOfficeId: request.destinationOfficeId 
    });
    
    try {
      return await transaction(async (client) => {
        // Verify group exists and is active
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [request.groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${request.groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        if (group.status !== GroupStatus.ACTIVE) {
          throw new Error('Only active groups can be transferred');
        }
        
        // Verify destination office exists
        const officeResult = await client.query(
          'SELECT * FROM office WHERE id = $1',
          [request.destinationOfficeId]
        );
        
        if (officeResult.rowCount === 0) {
          throw new Error(`Destination office with ID ${request.destinationOfficeId} not found`);
        }
        
        // Cannot transfer to the same office
        if (group.office_id === request.destinationOfficeId) {
          throw new Error('Group is already assigned to this office');
        }
        
        // Create transfer record
        const transferId = uuidv4();
        const transferDate = new Date(request.transferDate);
        
        await client.query(
          `INSERT INTO group_transfer (
            id, group_id, from_office_id, to_office_id, transfer_date, 
            submitted_date, submitted_by, status, description, 
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            transferId,
            request.groupId,
            group.office_id,
            request.destinationOfficeId,
            transferDate,
            new Date(),
            userId,
            GroupStatus.ACTIVE, // Transfer is immediately processed
            request.note || null,
            userId || null
          ]
        );
        
        // Update the group's office
        await client.query(
          `UPDATE client_group 
           SET office_id = $1, last_modified_by = $2, last_modified_date = NOW()
           WHERE id = $3`,
          [request.destinationOfficeId, userId || null, request.groupId]
        );
        
        // Add a note about the transfer if note is provided
        if (request.note) {
          await client.query(
            `INSERT INTO group_note (id, group_id, note, created_by, created_date)
             VALUES ($1, $2, $3, $4, NOW())`,
            [
              uuidv4(), 
              request.groupId, 
              `Group transferred to office ID ${request.destinationOfficeId}: ${request.note}`, 
              userId || null
            ]
          );
        }
        
        return {
          id: transferId,
          groupId: request.groupId,
          fromOfficeId: group.office_id,
          toOfficeId: request.destinationOfficeId,
          transferDate: transferDate,
          submittedDate: new Date(),
          submittedBy: userId || '',
          status: GroupStatus.ACTIVE,
          description: request.note,
          createdBy: userId || undefined,
          createdDate: new Date()
        };
      });
    } catch (error) {
      logger.error('Error transferring group', { error, request });
      throw error;
    }
  }
}

// Export a singleton instance
export const groupService = new GroupService();