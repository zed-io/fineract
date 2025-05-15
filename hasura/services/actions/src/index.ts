import express from 'express';
import { json } from 'body-parser';
import { loanRoutes } from './handlers/loan';
import { loanAdvancedRoutes } from './handlers/loanAdvanced';
import { savingsRoutes } from './handlers/savings';
import { savingsMobileRoutes } from './handlers/mobile/savingsMobile';
import { clientRoutes } from './handlers/client';
import { accountingRoutes } from './routes/accounting';
import { authRoutes } from './handlers/auth';
import { reportingRoutes } from './handlers/reporting';
import { integrationRoutes } from './routes/integration';
import { groupRoutes } from './routes/group';
import { fixedDepositRoutes } from './routes/fixedDeposit';
import { recurringDepositRoutes } from './routes/recurringDeposit';
import { recurringDepositBeneficiaryRoutes } from './routes/recurringDepositBeneficiary';
import { shareRoutes } from './routes/share';
import { notificationRoutes } from './routes/notification';
import { beneficiaryNotificationRoutes } from './routes/beneficiaryNotification';
import { loanDecisionRoutes } from './routes/loanDecision';
import { creditCheckRoutes } from './routes/creditCheck';
import { fraudDetectionRoutes } from './routes/fraudDetection';
import { regulatoryReportingRoutes } from './routes/regulatoryReporting';
import { savingsStatementRoutes } from './routes/savingsStatement';
import { savingsDormancyRoutes } from './routes/savingsDormancy';
import { savingsHoldsRoutes } from './routes/savingsHolds';
import { savingsReportingRoutes } from './routes/savingsReporting';
import interestCalculationRoutes from './routes/interestCalculation';
import { interestBatchRoutes } from './routes/interestBatch';
import { recurringDepositPenaltyRoutes } from './routes/recurringDepositPenalty';
import { loanDownPaymentRoutes } from './routes/loanDownPayment';
import { consolidatedReportingRoutes } from './routes/consolidatedReporting';
import { paymentGatewayRoutes } from './routes/paymentGateway';
import customReportingRoutes from './routes/customReporting';
import visualizationRoutes from './routes/visualization';
import dashboardRoutes from './routes/dashboards';
import { logger } from './utils/logger';
import { initDatabase } from './utils/db';
import compression from 'compression';

const app = express();
app.use(json());

// Enable global compression for all responses
app.use(compression({
  // Don't compress responses with this request header
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  // Compression level (0-9)
  level: 4
}));

// Health check endpoint
app.get('/health', async (_, res) => {
  try {
    const dbConnection = await initDatabase();
    res.json({
      status: 'ok',
      database: dbConnection ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount action handlers
app.use('/api/loan', loanRoutes);
app.use('/api/loan-advanced', loanAdvancedRoutes);
app.use('/api/loan-decision', loanDecisionRoutes);
app.use('/api/loan/down-payment', loanDownPaymentRoutes);
app.use('/api/credit-check', creditCheckRoutes);
app.use('/api/fraud-detection', fraudDetectionRoutes);
app.use('/api/savings-dormancy', savingsDormancyRoutes);
app.use('/api/regulatory-reporting', regulatoryReportingRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/mobile/savings', savingsMobileRoutes);
app.use('/api/savings-statement', savingsStatementRoutes);
app.use('/api/savings/holds', savingsHoldsRoutes);
app.use('/api/reporting/savings', savingsReportingRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/fixed-deposit', fixedDepositRoutes);
app.use('/api/recurring-deposit', recurringDepositRoutes);
app.use('/api/recurring-deposit/beneficiaries', recurringDepositBeneficiaryRoutes);
app.use('/api/recurring-deposit-penalty', recurringDepositPenaltyRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/beneficiary-notifications', beneficiaryNotificationRoutes);
app.use('/api/interest-calculation', interestCalculationRoutes);
app.use('/api/interest-batch', interestBatchRoutes);
app.use('/api/reporting/consolidated', consolidatedReportingRoutes);
app.use('/api/payment-gateway', paymentGatewayRoutes);

// Custom Reporting and Visualization routes
app.use('/api/reporting/custom', customReportingRoutes);
app.use('/api/visualization', visualizationRoutes);
app.use('/api/dashboards', dashboardRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;

initDatabase()
  .then(connected => {
    if (connected) {
      app.listen(PORT, () => {
        logger.info(`Fineract Hasura Action server running on port ${PORT}`);
      });
    } else {
      logger.error('Failed to initialize database connection. Exiting.');
      process.exit(1);
    }
  })
  .catch(err => {
    logger.error('Error during initialization:', err);
    process.exit(1);
  });