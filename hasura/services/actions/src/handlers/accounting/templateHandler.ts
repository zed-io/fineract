/**
 * Template Handler
 * Provides API handlers for accounting template operations
 */

import { Request, Response } from 'express';
import { accountingService } from '../../services/accountingService';
import { logger } from '../../utils/logger';

/**
 * Get accounting template data
 */
export const getAccountingTemplate = async (req: Request, res: Response) => {
  try {
    const template = await accountingService.getAccountingTemplate();
    
    res.json({
      success: true,
      template
    });
  } catch (error: any) {
    logger.error('Error getting accounting template', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};