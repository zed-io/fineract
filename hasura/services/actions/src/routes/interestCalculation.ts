import { Router } from 'express';
import { interestCalculationHandlers } from '../handlers/interestCalculation';
import { authenticateRequest } from '../utils/authMiddleware';

/**
 * Router for interest calculation endpoints
 */
const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateRequest);

// Calculate interest (preview without posting)
router.post('/calculate', interestCalculationHandlers.calculateInterest);

// Post interest
router.post('/post', interestCalculationHandlers.postInterest);

// Record daily interest accrual
router.post('/accrual/record', interestCalculationHandlers.recordDailyAccrual);

// Get daily interest accruals
router.post('/accruals', interestCalculationHandlers.getDailyAccruals);

// Get interest posting history
router.post('/history', interestCalculationHandlers.getInterestPostingHistory);

export default router;