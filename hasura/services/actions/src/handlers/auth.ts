import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validateRequest } from '../utils/validator';
import { logger } from '../utils/logger';
import { 
  authenticateUser, 
  refreshTokens, 
  createUser, 
  changePassword,
  validateUserPermissions
} from '../services/authService';
import {
  AuthenticationError,
  AccountLockError,
  AccountNotActiveError,
  TokenExpiredError,
  InvalidTokenError,
  PasswordRequirementsError,
  PasswordMismatchError,
  TenantNotFoundError
} from '../models/auth';

// Create router
export const authRoutes = Router();

/**
 * Login endpoint
 * Authenticates a user and returns tokens
 */
authRoutes.post('/login', validateRequest(['username', 'password']), async (req: Request, res: Response) => {
  try {
    const { username, password, tenantId } = req.body.input;
    
    const tokenResponse = await authenticateUser(
      { username, password },
      tenantId
    );
    
    return res.json({
      success: true,
      message: 'Authentication successful',
      ...tokenResponse
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    let statusCode = 401;
    let message = 'Authentication failed';
    
    if (error instanceof AuthenticationError) {
      message = error.message;
    } else if (error instanceof AccountLockError) {
      message = 'Account is locked. Please contact an administrator.';
    } else if (error instanceof AccountNotActiveError) {
      message = 'Account is not active. Please contact an administrator.';
    } else if (error instanceof TenantNotFoundError) {
      statusCode = 404;
      message = error.message;
    }
    
    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

/**
 * Token refresh endpoint
 * Refreshes access token using refresh token
 */
authRoutes.post('/refresh-token', validateRequest(['refreshToken']), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body.input;
    
    const tokenResponse = await refreshTokens(refreshToken);
    
    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokenResponse
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    
    let statusCode = 401;
    let message = 'Failed to refresh token';
    
    if (error instanceof TokenExpiredError) {
      message = 'Refresh token has expired. Please log in again.';
    } else if (error instanceof InvalidTokenError) {
      message = error.message;
    }
    
    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

/**
 * Create user endpoint
 * Creates a new user account
 */
authRoutes.post('/create-user', validateRequest([
  'username', 'password', 'repeatPassword', 'officeId', 'roles'
]), async (req: Request, res: Response) => {
  try {
    const userInput = req.body.input;
    const createdBy = req.body.session_variables['x-hasura-user-id'];
    const tenantId = req.body.session_variables['x-hasura-tenant-id'];
    
    // Check for user management permission
    const hasPermission = await validateUserPermissions(
      createdBy,
      ['CREATE_USER']
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create users'
      });
    }
    
    const userId = await createUser(userInput, createdBy, tenantId);
    
    return res.json({
      success: true,
      message: 'User created successfully',
      userId
    });
  } catch (error) {
    logger.error('User creation error:', error);
    
    let statusCode = 400;
    let message = 'Failed to create user';
    
    if (error instanceof PasswordMismatchError) {
      message = 'Passwords do not match';
    } else if (error instanceof PasswordRequirementsError) {
      message = error.message;
    } else if (error.message.includes('username already exists')) {
      message = 'Username already exists';
    }
    
    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

/**
 * Change password endpoint
 * Allows a user to change their password
 */
authRoutes.post('/change-password', validateRequest([
  'oldPassword', 'newPassword', 'repeatPassword'
]), async (req: Request, res: Response) => {
  try {
    const passwordInput = req.body.input;
    const userId = req.body.session_variables['x-hasura-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not authenticated'
      });
    }
    
    const success = await changePassword(userId, passwordInput);
    
    return res.json({
      success,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change error:', error);
    
    let statusCode = 400;
    let message = 'Failed to change password';
    
    if (error instanceof AuthenticationError) {
      statusCode = 401;
      message = error.message;
    } else if (error instanceof PasswordMismatchError) {
      message = 'Passwords do not match';
    } else if (error instanceof PasswordRequirementsError) {
      message = error.message;
    }
    
    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

/**
 * Validate token endpoint
 * Validates a JWT token and returns decoded information
 */
authRoutes.post('/validate-token', validateRequest(['token']), async (req: Request, res: Response) => {
  try {
    const { token } = req.body.input;
    
    // This will throw an error if token is invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fineract-hasura-jwt-secret');
    
    return res.json({
      success: true,
      message: 'Token is valid',
      decoded
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    
    let statusCode = 401;
    let message = 'Invalid token';
    
    if (error instanceof jwt.TokenExpiredError) {
      message = 'Token has expired';
    } else if (error instanceof jwt.JsonWebTokenError) {
      message = error.message;
    }
    
    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

// Export the router
export default authRoutes;