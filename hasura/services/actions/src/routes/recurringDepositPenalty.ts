/**
 * Routes for recurring deposit penalty features
 */
import express from 'express';
import { recurringDepositPenaltyHandlers } from '../handlers/recurringDepositPenalty';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Authenticate all routes
router.use(authMiddleware());

// Apply penalties for missed installments
router.post('/apply', recurringDepositPenaltyHandlers.applyPenalties);

// Get penalty configuration for a product
router.post('/config/get', recurringDepositPenaltyHandlers.getPenaltyConfig);

// Create or update penalty configuration
router.post('/config/create-update', recurringDepositPenaltyHandlers.createOrUpdatePenaltyConfig);

// Delete penalty configuration
router.post('/config/delete', recurringDepositPenaltyHandlers.deletePenaltyConfig);

// Get penalty history for an account
router.post('/history/account', recurringDepositPenaltyHandlers.getPenaltyHistory);

// Search penalty history with criteria
router.post('/history/search', recurringDepositPenaltyHandlers.searchPenaltyHistory);

// Waive a penalty
router.post('/waive', recurringDepositPenaltyHandlers.waivePenalty);

export const recurringDepositPenaltyRoutes = router;