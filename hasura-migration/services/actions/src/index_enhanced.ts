import express from 'express';
import { json } from 'body-parser';
import { loanRoutes } from './handlers/loan';
import { clientRoutes } from './handlers/client';
import { savingsRoutes } from './handlers/savings';
import { savingsEnhancedRoutes } from './handlers/savings_enhanced';
import { authRoutes } from './handlers/auth';
import { trinidadRoutes } from './handlers/trinidad_routes';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { authMiddleware } from './utils/authMiddleware';

const app = express();

// Parse JSON request body with larger limit for document uploads
app.use(json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes - original Fineract API
app.use('/api/loan', authMiddleware, loanRoutes);
app.use('/api/client', authMiddleware, clientRoutes);
app.use('/api/savings', authMiddleware, savingsRoutes);

// Protected routes - Trinidad and Tobago Credit Union enhanced API
app.use('/api/v1', authMiddleware, trinidadRoutes);

// Enhanced savings API for Credit Unions
app.use('/api/v1/savings', authMiddleware, savingsEnhancedRoutes);

// Global error handler
app.use(errorHandler);

// Configure logging format
logger.configure({
  levels: {
    info: { color: 'blue', level: 2 },
    warn: { color: 'yellow', level: 3 },
    error: { color: 'red', level: 4 }
  },
  format: [
    '{{timestamp}} [{{level}}] {{message}}',
    {
      timestamp: {
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }
    }
  ]
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Credit Union Core Banking API server running on port ${PORT}`);
});