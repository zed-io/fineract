import express from 'express';
import { RegulatoryReportingHandler } from '../handlers/regulatoryReporting';

// Create router instance
const regulatoryReportingRoutes = express.Router();

// Initialize handler
const regulatoryReportingHandlers = new RegulatoryReportingHandler();

// Route definitions for regulatory reporting
regulatoryReportingRoutes.post('/definitions', regulatoryReportingHandlers.getReportDefinitions);
regulatoryReportingRoutes.post('/definition', regulatoryReportingHandlers.getReportDefinition);
regulatoryReportingRoutes.post('/generate', regulatoryReportingHandlers.generateReport);
regulatoryReportingRoutes.post('/instances', regulatoryReportingHandlers.getReportInstances);
regulatoryReportingRoutes.post('/instance', regulatoryReportingHandlers.getReportInstance);
regulatoryReportingRoutes.post('/updateStatus', regulatoryReportingHandlers.updateReportStatus);
regulatoryReportingRoutes.post('/deadlines', regulatoryReportingHandlers.getUpcomingDeadlines);
regulatoryReportingRoutes.post('/schedules', regulatoryReportingHandlers.getReportSchedules);
regulatoryReportingRoutes.post('/schedule', regulatoryReportingHandlers.createReportSchedule);
regulatoryReportingRoutes.post('/runScheduled', regulatoryReportingHandlers.runScheduledReports);

export { regulatoryReportingRoutes };