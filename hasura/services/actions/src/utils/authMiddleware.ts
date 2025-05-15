import { Request, Response, NextFunction } from 'express';
import { expressjwt } from 'express-jwt';
import { logger } from './logger';
import { validateUserPermissions } from '../services/authService';

// JWT secret should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'fineract-hasura-jwt-secret';

/**
 * JWT Authentication middleware
 * Validates JWT tokens in Authorization header
 */
export const requireAuth = expressjwt({
  secret: JWT_SECRET,
  algorithms: ['HS256'],
  requestProperty: 'auth',
  getToken: (req) => {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check for token in request body
    if (req.body && req.body.token) {
      return req.body.token;
    }
    
    return null;
  }
});

/**
 * Error handler for JWT authentication errors
 */
export const handleAuthErrors = (err, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    logger.warn('Authentication error:', { message: err.message, path: req.path });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
  
  next(err);
};

/**
 * Middleware to check if user has required permissions
 * @param permissions Array of permission codes
 */
export const requirePermissions = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth.sub;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
      
      // Check if user has required permissions
      const hasPermission = await validateUserPermissions(userId, permissions);
      
      if (!hasPermission) {
        logger.warn('Permission denied:', { 
          userId, 
          requiredPermissions: permissions, 
          path: req.path 
        });
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Helper to extract user ID from request
 */
export const extractUserId = (req: Request): string | null => {
  // From JWT auth
  if (req.auth && req.auth.sub) {
    return req.auth.sub;
  }
  
  // From Hasura session variables
  if (req.body && req.body.session_variables && req.body.session_variables['x-hasura-user-id']) {
    return req.body.session_variables['x-hasura-user-id'];
  }
  
  return null;
};

/**
 * Helper to extract tenant ID from request
 */
export const extractTenantId = (req: Request): string | null => {
  // From JWT auth
  if (req.auth && req.auth.tn) {
    return req.auth.tn;
  }
  
  // From Hasura session variables
  if (req.body && req.body.session_variables && req.body.session_variables['x-hasura-tenant-id']) {
    return req.body.session_variables['x-hasura-tenant-id'];
  }
  
  return null;
};