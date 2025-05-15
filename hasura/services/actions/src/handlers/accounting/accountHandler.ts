/**
 * Account Handler
 * Provides API handlers for GL account operations
 */

import { Request, Response } from 'express';
import { accountingService } from '../../services/accountingService';
import { logger } from '../../utils/logger';

/**
 * Create a new GL account
 */
export const createGLAccount = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    
    const accountId = await accountingService.createGLAccount(input, userId);
    
    res.json({
      success: true,
      accountId,
      message: 'GL account created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating GL account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update an existing GL account
 */
export const updateGLAccount = async (req: Request, res: Response) => {
  try {
    const { accountId, ...updateData } = req.body.input;
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    
    const updatedAccount = await accountingService.updateGLAccount(accountId, updateData, userId);
    
    res.json({
      success: true,
      account: updatedAccount,
      message: 'GL account updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating GL account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a GL account
 */
export const deleteGLAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body.input;
    
    await accountingService.deleteGLAccount(accountId);
    
    res.json({
      success: true,
      message: 'GL account deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting GL account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a GL account by ID
 */
export const getGLAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body.input;
    
    const account = await accountingService.getGLAccount(accountId);
    
    res.json({
      success: true,
      account
    });
  } catch (error: any) {
    logger.error('Error getting GL account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all GL accounts, optionally filtered
 */
export const getGLAccounts = async (req: Request, res: Response) => {
  try {
    const { type, usage, disabled, manualEntriesAllowed } = req.body.input || {};
    
    const accounts = await accountingService.getGLAccounts(
      type, 
      usage, 
      disabled, 
      manualEntriesAllowed
    );
    
    res.json({
      success: true,
      ...accounts
    });
  } catch (error: any) {
    logger.error('Error getting GL accounts', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get GL account tree
 */
export const getGLAccountsTree = async (req: Request, res: Response) => {
  try {
    const { type } = req.body.input || {};
    
    const accountsTree = await accountingService.getGLAccountsTree(type);
    
    res.json({
      success: true,
      glAccountsTree: accountsTree
    });
  } catch (error: any) {
    logger.error('Error getting GL account tree', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};