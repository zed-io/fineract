import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export class ValidationError extends Error {
  statusCode: number;
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class BusinessRuleError extends Error {
  statusCode: number;
  details: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'BusinessRuleError';
    this.statusCode = 422; // Unprocessable Entity
    this.details = details;
  }
}

export class DatabaseError extends Error {
  statusCode: number;
  details: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.details = details;
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', { 
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method 
    });
  } else {
    logger.warn('Client error:', { 
      error: err.message,
      path: req.path,
      method: req.method,
      details: err.details || {} 
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};