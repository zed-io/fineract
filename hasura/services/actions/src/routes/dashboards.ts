import express from 'express';
import { authMiddleware } from '../utils/authMiddleware';
import * as customReportingHandler from '../handlers/customReporting';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Dashboard routes
router.post('/create', customReportingHandler.createDashboard);
router.post('/update', customReportingHandler.updateDashboard);
router.post('/get', customReportingHandler.getDashboard);
router.post('/list', customReportingHandler.listDashboards);
router.post('/delete', customReportingHandler.deleteDashboard);
router.post('/data', customReportingHandler.getDashboardWithData);

// Dashboard Panel routes
router.post('/panels/add', customReportingHandler.addDashboardPanel);
router.post('/panels/update', customReportingHandler.updateDashboardPanel);
router.post('/panels/delete', customReportingHandler.deleteDashboardPanel);

// User Dashboard Preferences routes
router.post('/preferences/set', customReportingHandler.setUserDashboardPreference);
router.post('/preferences/get', customReportingHandler.getUserDashboardPreferences);

// Scheduled Dashboard routes
router.post('/schedule/create', customReportingHandler.scheduleReportDashboard);
router.post('/schedule/update', customReportingHandler.updateScheduledDashboard);
router.post('/schedule/list', customReportingHandler.getScheduledDashboards);
router.post('/schedule/delete', customReportingHandler.deleteScheduledDashboard);

// Export route
router.post('/export', customReportingHandler.exportDashboard);

export default router;