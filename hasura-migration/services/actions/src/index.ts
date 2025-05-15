import express from 'express';
import { json } from 'body-parser';
import { loanRoutes } from './handlers/loan';
import { clientRoutes } from './handlers/client';
import { savingsRoutes } from './handlers/savings';
import { savingsBeneficiaryRoutes } from './handlers/savings_beneficiary';
import { authRoutes } from './handlers/auth';
import { trinidadRoutes } from './handlers/trinidad_routes';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { authMiddleware } from './utils/authMiddleware';

const app = express();

// Parse JSON request body
app.use(json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/loan', authMiddleware, loanRoutes);
app.use('/api/client', authMiddleware, clientRoutes);
app.use('/api/savings', authMiddleware, savingsRoutes);
app.use('/api/v1/savings/beneficiary', authMiddleware, savingsBeneficiaryRoutes);

// Trinidad and Tobago Credit Union specific routes
app.use('/api/v1', authMiddleware, trinidadRoutes);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Fineract Hasura Action server running on port ${PORT}`);
});