import express from 'express';
import { authMiddleware } from '../utils/authMiddleware';
import * as customReportingHandler from '../handlers/customReporting';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Visualization Component routes
router.post('/components/create', customReportingHandler.createVisualizationComponent);
router.post('/components/update', customReportingHandler.updateVisualizationComponent);
router.post('/components/get', customReportingHandler.getVisualizationComponent);
router.post('/components/list', customReportingHandler.listVisualizationComponents);
router.post('/components/delete', customReportingHandler.deleteVisualizationComponent);
router.post('/components/render', customReportingHandler.renderVisualization);

export default router;