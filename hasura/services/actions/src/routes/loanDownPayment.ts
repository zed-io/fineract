import { Router } from 'express';
import { authMiddleware } from '../utils/authMiddleware';
import { 
  handleCalculateLoanScheduleWithDownPayment,
  handleDisburseLoanWithDownPayment,
  handleProcessDownPayment,
  handleCalculateDownPayment
} from '../handlers/loanDownPayment';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Calculate loan schedule with down payment
router.post('/calculate-schedule', handleCalculateLoanScheduleWithDownPayment);

// Disburse loan with down payment
router.post('/disburse', handleDisburseLoanWithDownPayment);

// Process down payment
router.post('/process', handleProcessDownPayment);

// Calculate down payment details
router.post('/calculate', handleCalculateDownPayment);

export const loanDownPaymentRoutes = router;