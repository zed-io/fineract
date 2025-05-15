import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from './errorHandler';
import { logger } from './logger';

export interface JwtUser {
  id: string;
  username: string;
  roles: string[];
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
    'x-hasura-user-id': string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('Authentication required');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AuthenticationError('Invalid authorization header format');
    }
    
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      logger.error('JWT_SECRET environment variable not set');
      throw new Error('Internal server configuration error');
    }
    
    const decoded = jwt.verify(token, secret) as JwtUser;
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
};