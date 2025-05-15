import express from 'express';
import { authMiddleware } from '../utils/authMiddleware';
import * as customReportingHandler from '../handlers/customReporting';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Custom Report Template routes
router.post('/templates/create', customReportingHandler.createCustomReportTemplate);
router.post('/templates/update', customReportingHandler.updateCustomReportTemplate);
router.post('/templates/get', customReportingHandler.getCustomReportTemplate);
router.post('/templates/list', customReportingHandler.listCustomReportTemplates);
router.post('/templates/delete', customReportingHandler.deleteCustomReportTemplate);

// Custom Report Parameter routes
router.post('/parameters/add', customReportingHandler.addCustomReportParameter);
router.post('/parameters/update', customReportingHandler.updateCustomReportParameter);
router.post('/parameters/delete', customReportingHandler.deleteCustomReportParameter);

// Custom Report Execution routes
router.post('/execute', customReportingHandler.executeCustomReport);
router.post('/executions/history', customReportingHandler.getCustomReportExecutionHistory);

// Custom Report Saved Query routes
router.post('/queries/save', customReportingHandler.saveCustomReportQuery);
router.post('/queries/list', customReportingHandler.getSavedCustomReportQueries);
router.post('/queries/delete', customReportingHandler.deleteSavedCustomReportQuery);

// Export route
router.post('/export', customReportingHandler.exportCustomReport);

export default router;