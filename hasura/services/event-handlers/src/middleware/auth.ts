import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to validate Hasura webhook secret
 */
export const validateWebhookSecret = (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.headers['x-hasura-webhook-secret'];
    const expectedSecret = process.env.WEBHOOK_SECRET;
    
    if (!secret) {
      logger.warn('Missing webhook secret header');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing webhook secret'
      });
    }
    
    if (secret !== expectedSecret) {
      logger.warn('Invalid webhook secret');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid webhook secret'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error in webhook authentication middleware', { error });
    next(error);
  }
};