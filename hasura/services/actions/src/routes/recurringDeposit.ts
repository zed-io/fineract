/**
 * Recurring Deposit API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { recurringDepositHandlers } from '../handlers/recurringDeposit';
import { recurringDepositInterestHandlers } from '../handlers/recurringDepositInterest';
import { recurringDepositMaturityHandlers } from '../handlers/recurringDepositMaturity';
import { recurringDepositStatementHandlers } from '../handlers/recurringDepositStatement';
import { recurringDepositMetricsHandlers } from '../handlers/recurringDepositMetrics';
import { recurringDepositPrematureClosureHandlers } from '../handlers/recurringDepositPrematureClosure';

export const recurringDepositRoutes = Router();

// Recurring Deposit Product routes
recurringDepositRoutes.post('/product/create', recurringDepositHandlers.createProduct);
recurringDepositRoutes.post('/product/get', recurringDepositHandlers.getProduct);
recurringDepositRoutes.post('/products', recurringDepositHandlers.getProducts);

// Recurring Deposit Account routes
recurringDepositRoutes.post('/account/create', recurringDepositHandlers.createAccount);
recurringDepositRoutes.post('/account/get', recurringDepositHandlers.getAccount);
recurringDepositRoutes.post('/account/deposit', recurringDepositHandlers.makeDeposit);
recurringDepositRoutes.post('/account/withdraw', recurringDepositHandlers.makeWithdrawal);
recurringDepositRoutes.post('/account/approve', recurringDepositHandlers.approveAccount);
recurringDepositRoutes.post('/account/premature-close', recurringDepositHandlers.prematureClose);
recurringDepositRoutes.post('/account/update-maturity-instructions', recurringDepositHandlers.updateMaturityInstructions);

// Client recurring deposit accounts
recurringDepositRoutes.post('/client/accounts', recurringDepositHandlers.getClientAccounts);

// Recurring Deposit template
recurringDepositRoutes.post('/template', recurringDepositHandlers.getTemplate);

// Installment tracking and penalties
recurringDepositRoutes.post('/track-installments', recurringDepositHandlers.trackInstallments);
recurringDepositRoutes.post('/configure-penalties', recurringDepositHandlers.configurePenalties);

// Interest calculation and posting routes
recurringDepositRoutes.post('/calculate-interest', recurringDepositInterestHandlers.calculateInterest);
recurringDepositRoutes.post('/post-interest', recurringDepositInterestHandlers.postInterest);
recurringDepositRoutes.post('/interest-history', recurringDepositInterestHandlers.getInterestPostingHistory);

// Maturity processing routes
recurringDepositRoutes.post('/account/mature', recurringDepositMaturityHandlers.processMaturity);
recurringDepositRoutes.post('/account/renew', recurringDepositMaturityHandlers.renewAccount);
recurringDepositRoutes.post('/upcoming-maturities', recurringDepositMaturityHandlers.getUpcomingMaturities);
recurringDepositRoutes.post('/account/update-maturity-options', recurringDepositMaturityHandlers.updateMaturityOptions);

// Statement routes
recurringDepositRoutes.post('/account/generate-statement', recurringDepositStatementHandlers.generateStatement);
recurringDepositRoutes.post('/account/statement-history', recurringDepositStatementHandlers.getStatementHistory);
recurringDepositRoutes.get('/account/download-statement/:statementId', recurringDepositStatementHandlers.downloadStatement);

// Dashboard metrics routes
recurringDepositRoutes.post('/dashboard/metrics', recurringDepositMetricsHandlers.getDashboardMetrics);
recurringDepositRoutes.post('/dashboard/general-stats', recurringDepositMetricsHandlers.getGeneralStats);
recurringDepositRoutes.post('/dashboard/recent-activity', recurringDepositMetricsHandlers.getRecentActivity);
recurringDepositRoutes.post('/dashboard/product-performance', recurringDepositMetricsHandlers.getProductPerformance);
recurringDepositRoutes.post('/dashboard/deposit-trends', recurringDepositMetricsHandlers.getDepositTrends);
recurringDepositRoutes.post('/dashboard/maturity-forecast', recurringDepositMetricsHandlers.getMaturityForecast);
recurringDepositRoutes.post('/dashboard/installment-compliance', recurringDepositMetricsHandlers.getInstallmentCompliance);

// Premature Closure routes
recurringDepositRoutes.post('/premature-closure/calculate', recurringDepositPrematureClosureHandlers.calculatePrematureClosure);
recurringDepositRoutes.post('/premature-closure/process', recurringDepositPrematureClosureHandlers.processPrematureClosure);
recurringDepositRoutes.post('/premature-closure/history', recurringDepositPrematureClosureHandlers.getPrematureClosureHistory);