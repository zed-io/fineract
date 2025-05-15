/**
 * Rule Handler
 * Provides API handlers for accounting rule operations
 */

import { Request, Response } from 'express';
import { accountingService } from '../../services/accountingService';
import { logger } from '../../utils/logger';

/**
 * Create a new accounting rule
 */
export const createAccountingRule = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    
    const ruleId = await accountingService.createAccountingRule(input, userId);
    
    res.json({
      success: true,
      ruleId,
      message: 'Accounting rule created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating accounting rule', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update an existing accounting rule
 */
export const updateAccountingRule = async (req: Request, res: Response) => {
  try {
    const { ruleId, ...updateData } = req.body.input;
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    
    const updatedRule = await accountingService.updateAccountingRule(ruleId, updateData, userId);
    
    res.json({
      success: true,
      rule: updatedRule,
      message: 'Accounting rule updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating accounting rule', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete an accounting rule
 */
export const deleteAccountingRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.body.input;
    
    await accountingService.deleteAccountingRule(ruleId);
    
    res.json({
      success: true,
      message: 'Accounting rule deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting accounting rule', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get an accounting rule by ID
 */
export const getAccountingRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.body.input;
    
    const rule = await accountingService.getAccountingRule(ruleId);
    
    res.json({
      success: true,
      rule
    });
  } catch (error: any) {
    logger.error('Error getting accounting rule', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all accounting rules
 */
export const getAccountingRules = async (req: Request, res: Response) => {
  try {
    const rules = await accountingService.getAccountingRules();
    
    res.json({
      success: true,
      ...rules
    });
  } catch (error: any) {
    logger.error('Error getting accounting rules', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};