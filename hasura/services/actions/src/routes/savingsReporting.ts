/**
 * Savings Reporting Routes
 * Routes for the savings reporting endpoints
 */

import { Router } from 'express';
import * as savingsReportingHandlers from '../handlers/savingsReporting';

export const savingsReportingRoutes = Router();

// Product Performance Report
savingsReportingRoutes.post('/product-performance', savingsReportingHandlers.handleProductPerformanceReport);

// Dormancy Analysis Report
savingsReportingRoutes.post('/dormancy-analysis', savingsReportingHandlers.handleDormancyAnalysisReport);

// Interest Distribution Report
savingsReportingRoutes.post('/interest-distribution', savingsReportingHandlers.handleInterestDistributionReport);

// Account Activity Report
savingsReportingRoutes.post('/account-activity', savingsReportingHandlers.handleAccountActivityReport);

// Financial Projection Report
savingsReportingRoutes.post('/financial-projection', savingsReportingHandlers.handleFinancialProjectionReport);