/**
 * Closure Handler
 * Provides API handlers for GL closure operations
 */

import { Request, Response } from 'express';
import { accountingService } from '../../services/accountingService';
import { logger } from '../../utils/logger';

/**
 * Create a new GL closure
 */
export const createGLClosure = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    
    const closureId = await accountingService.createGLClosure(input, userId);
    
    res.json({
      success: true,
      closureId,
      message: 'GL closure created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating GL closure', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a GL closure
 */
export const deleteGLClosure = async (req: Request, res: Response) => {
  try {
    const { closureId } = req.body.input;
    
    await accountingService.deleteGLClosure(closureId);
    
    res.json({
      success: true,
      message: 'GL closure deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting GL closure', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a GL closure by ID
 */
export const getGLClosure = async (req: Request, res: Response) => {
  try {
    const { closureId } = req.body.input;
    
    const closure = await accountingService.getGLClosure(closureId);
    
    res.json({
      success: true,
      closure
    });
  } catch (error: any) {
    logger.error('Error getting GL closure', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all GL closures, optionally filtered by office
 */
export const getGLClosures = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.body.input || {};
    
    const closures = await accountingService.getGLClosures(officeId);
    
    res.json({
      success: true,
      ...closures
    });
  } catch (error: any) {
    logger.error('Error getting GL closures', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};