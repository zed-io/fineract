import express from 'express';
import { json } from 'body-parser';
import { loanRoutes } from './handlers/loan';
import { savingsRoutes } from './handlers/savings';
import { logger } from './utils/logger';

const app = express();
app.use(json());

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Mount action handlers
app.use('/api/loan', loanRoutes);
app.use('/api/savings', savingsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Fineract Hasura Action server running on port ${PORT}`);
});