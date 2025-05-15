import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

/**
 * Verify JWT for socket connections
 */
export const verifySocketAuth = (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Get token from handshake auth or from query parameter
    const token = 
      socket.handshake.auth?.token || 
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;
    
    if (!token) {
      logger.warn('No authentication token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-for-development';
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      if (typeof decoded === 'string') {
        return next(new Error('Invalid token format'));
      }
      
      // Set user data on socket
      socket.data.userId = decoded.userId || decoded.sub;
      socket.data.tenant = decoded.tenant || 'default';
      socket.data.role = decoded.role;
      
      if (!socket.data.userId) {
        logger.warn('JWT token missing user ID', { decoded });
        return next(new Error('Authentication error: Invalid token'));
      }
      
      next();
    } catch (error) {
      logger.warn('JWT verification failed', { error: error.message });
      next(new Error('Authentication error: Invalid token'));
    }
  } catch (error) {
    logger.error('Authentication middleware error', { error });
    next(new Error('Authentication error'));
  }
};