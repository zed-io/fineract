/**
 * Group API handlers for Fineract Hasura actions
 * Provides endpoints for group management
 */

import { Request, Response } from 'express';
import { groupService } from '../services/groupService';
import { groupLoanService } from '../services/groupLoanService';
import { logger } from '../utils/logger';

/**
 * Group API handlers
 */
export const groupHandlers = {
  
  /**
   * Create a new group
   */
  async createGroup(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.createGroup(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error creating group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update an existing group
   */
  async updateGroup(req: Request, res: Response) {
    try {
      const { groupId, ...updateData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.updateGroup(groupId, updateData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error updating group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get a group by ID
   */
  async getGroup(req: Request, res: Response) {
    try {
      const { groupId, includeMembers, includeRoles, includeNotes } = req.body.input;
      const result = await groupService.getGroup(
        groupId, 
        includeMembers !== false, 
        includeRoles !== false, 
        includeNotes === true
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete a group
   */
  async deleteGroup(req: Request, res: Response) {
    try {
      const result = await groupService.deleteGroup(req.body.input);
      res.json({ success: result });
    } catch (error: any) {
      logger.error('Error deleting group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Activate a group
   */
  async activateGroup(req: Request, res: Response) {
    try {
      const { groupId, activationDate } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.activateGroup(
        groupId, 
        { activationDate }, 
        userId
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error activating group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Close a group
   */
  async closeGroup(req: Request, res: Response) {
    try {
      const { groupId, closureDate, closureReason } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.closeGroup(
        groupId, 
        { closureDate, closureReason }, 
        userId
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error closing group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Search for groups
   */
  async searchGroups(req: Request, res: Response) {
    try {
      const { criteria, limit, offset } = req.body.input;
      const result = await groupService.searchGroups(criteria, limit, offset);
      res.json(result);
    } catch (error: any) {
      logger.error('Error searching groups', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Add members to a group
   */
  async addGroupMembers(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.assignMembers(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error adding members to group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Remove a member from a group
   */
  async removeGroupMember(req: Request, res: Response) {
    try {
      const { groupId, clientId } = req.body.input;
      const result = await groupService.removeMember(groupId, clientId);
      res.json({ success: result });
    } catch (error: any) {
      logger.error('Error removing member from group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Assign a role to a client in a group
   */
  async assignGroupRole(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.assignRole(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error assigning role in group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Remove a role from a client in a group
   */
  async removeGroupRole(req: Request, res: Response) {
    try {
      const { groupId, clientId, roleId } = req.body.input;
      const result = await groupService.removeRole(groupId, clientId, roleId);
      res.json({ success: result });
    } catch (error: any) {
      logger.error('Error removing role from client in group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Add a note to a group
   */
  async addGroupNote(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.addNote(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error adding note to group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Transfer a group to another office
   */
  async transferGroup(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupService.transferGroup(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error transferring group', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // Group loan handlers
  
  /**
   * Create a loan for a group
   */
  async createGroupLoan(req: Request, res: Response) {
    try {
      const { groupId, ...loanData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await groupLoanService.createGroupLoan(groupId, loanData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error creating group loan', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get all loans for a group
   */
  async getGroupLoans(req: Request, res: Response) {
    try {
      const { groupId } = req.body.input;
      const result = await groupLoanService.getGroupLoans(groupId);
      res.json({ loans: result });
    } catch (error: any) {
      logger.error('Error getting group loans', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get details of a specific group loan
   */
  async getGroupLoanDetails(req: Request, res: Response) {
    try {
      const { groupId, loanId } = req.body.input;
      const result = await groupLoanService.getGroupLoanDetails(groupId, loanId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting group loan details', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get loan summary statistics for a group
   */
  async getGroupLoanSummary(req: Request, res: Response) {
    try {
      const { groupId } = req.body.input;
      const result = await groupLoanService.getGroupLoanSummary(groupId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting group loan summary', { error });
      res.status(400).json({ message: error.message });
    }
  }
};