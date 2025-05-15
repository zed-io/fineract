/**
 * Routes for consolidated reporting endpoints
 */

import { Router } from 'express';
import { ConsolidatedReportingHandler } from '../handlers/consolidatedReporting';

const router = Router();
const handler = new ConsolidatedReportingHandler();

// Create consolidated report endpoint
router.post('/generate', (req, res) => handler.generateConsolidatedReport(req, res));

// Get cross-module dashboard endpoint
router.post('/dashboard', (req, res) => handler.getCrossModuleDashboard(req, res));

// Sync data sources endpoint
router.post('/sync-datasources', (req, res) => handler.syncDataSources(req, res));

// Get analytics insights endpoint
router.post('/insights', (req, res) => handler.getAnalyticsInsights(req, res));

export const consolidatedReportingRoutes = router;