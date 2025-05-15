import express from 'express';
import { FraudDetectionHandler } from '../handlers/fraudDetection';

// Create router instance
const fraudDetectionRoutes = express.Router();

// Initialize handler
const fraudDetectionHandlers = new FraudDetectionHandler();

// Route definitions for fraud detection
fraudDetectionRoutes.post('/perform', fraudDetectionHandlers.performFraudDetection);
fraudDetectionRoutes.post('/history', fraudDetectionHandlers.getFraudDetectionHistory);
fraudDetectionRoutes.post('/byId', fraudDetectionHandlers.getFraudDetectionById);
fraudDetectionRoutes.post('/resolve', fraudDetectionHandlers.resolveManualReview);
fraudDetectionRoutes.post('/pendingReviews', fraudDetectionHandlers.getPendingManualReviews);

export { fraudDetectionRoutes };