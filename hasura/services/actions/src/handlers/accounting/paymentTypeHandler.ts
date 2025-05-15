/**
 * Payment Type Handler
 * Provides API handlers for payment type operations
 */

import { Request, Response } from 'express';
import { accountingService } from '../../services/accountingService';
import { logger } from '../../utils/logger';

/**
 * Create a new payment type
 */
export const createPaymentType = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    
    const paymentTypeId = await accountingService.createPaymentType(input, userId);
    
    res.json({
      success: true,
      paymentTypeId,
      message: 'Payment type created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating payment type', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update an existing payment type
 */
export const updatePaymentType = async (req: Request, res: Response) => {
  try {
    const { paymentTypeId, ...updateData } = req.body.input;
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    
    const updatedType = await accountingService.updatePaymentType(paymentTypeId, updateData, userId);
    
    res.json({
      success: true,
      paymentType: updatedType,
      message: 'Payment type updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating payment type', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a payment type
 */
export const deletePaymentType = async (req: Request, res: Response) => {
  try {
    const { paymentTypeId } = req.body.input;
    
    await accountingService.deletePaymentType(paymentTypeId);
    
    res.json({
      success: true,
      message: 'Payment type deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting payment type', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a payment type by ID
 */
export const getPaymentType = async (req: Request, res: Response) => {
  try {
    const { paymentTypeId } = req.body.input;
    
    const paymentType = await accountingService.getPaymentType(paymentTypeId);
    
    res.json({
      success: true,
      paymentType
    });
  } catch (error: any) {
    logger.error('Error getting payment type', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all payment types
 */
export const getPaymentTypes = async (req: Request, res: Response) => {
  try {
    const { onlyEnabled } = req.body.input || {};
    
    const paymentTypes = await accountingService.getPaymentTypes(onlyEnabled);
    
    res.json({
      success: true,
      ...paymentTypes
    });
  } catch (error: any) {
    logger.error('Error getting payment types', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};