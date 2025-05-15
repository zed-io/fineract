import { Router } from 'express';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errorHandler';
import db from '../utils/db';

const router = Router();

// Calculate loan schedule
router.post('/calculate-schedule', async (req, res, next) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Calculate loan schedule request received', { input });
    
    // Validate input
    if (!input || !input.productId || !input.principalAmount || !input.numberOfRepayments) {
      throw new ValidationError('Missing required fields for loan schedule calculation');
    }
    
    // Placeholder for actual loan calculation logic
    // This is where we would port the Java calculation logic to TypeScript
    const result = {
      success: true,
      currency: 'USD',
      periods: Array.from({ length: input.numberOfRepayments }, (_, i) => ({
        periodNumber: i + 1,
        dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        principalAmount: input.principalAmount / input.numberOfRepayments,
        interestAmount: (input.principalAmount * (input.interestRatePerPeriod / 100)) / input.numberOfRepayments,
        feeAmount: 0,
        penaltyAmount: 0,
        totalDue: (input.principalAmount / input.numberOfRepayments) + 
                 ((input.principalAmount * (input.interestRatePerPeriod / 100)) / input.numberOfRepayments),
        outstandingBalance: input.principalAmount - ((i + 1) * (input.principalAmount / input.numberOfRepayments))
      })),
      totalPrincipal: input.principalAmount,
      totalInterest: input.principalAmount * (input.interestRatePerPeriod / 100),
      totalFees: 0,
      totalRepayment: input.principalAmount + (input.principalAmount * (input.interestRatePerPeriod / 100)),
      message: 'Loan schedule calculated successfully'
    };
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Approve loan
router.post('/approve', async (req, res, next) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Approve loan request received', { loanId: input.loanId });
    
    const userId = req.user?.id;
    
    // Validate input
    if (!input || !input.loanId || !input.approvedOnDate) {
      throw new ValidationError('Missing required fields for loan approval');
    }
    
    // Check if loan exists and can be approved
    const loanResult = await db.query(
      'SELECT id, loan_status FROM fineract_default.loan WHERE id = $1',
      [input.loanId]
    );
    
    if (loanResult.rows.length === 0) {
      throw new NotFoundError(`Loan with ID ${input.loanId} not found`);
    }
    
    const loan = loanResult.rows[0];
    
    if (loan.loan_status !== 'submitted_and_pending_approval') {
      throw new ValidationError(`Loan with ID ${input.loanId} cannot be approved in its current status`);
    }
    
    // Update loan status (simplified for example)
    await db.query(
      'UPDATE fineract_default.loan SET loan_status = $1, approved_on_date = $2, approved_by_user_id = $3, approved_principal_amount = $4, approved_note = $5 WHERE id = $6',
      ['approved', input.approvedOnDate, userId, input.approvedAmount || loan.principal_amount, input.note || null, input.loanId]
    );
    
    // Return response
    res.json({
      success: true,
      loanId: input.loanId,
      message: 'Loan approved successfully',
      approvedOnDate: input.approvedOnDate,
      approvedAmount: input.approvedAmount || loan.principal_amount
    });
  } catch (error) {
    next(error);
  }
});

// Disburse loan
router.post('/disburse', async (req, res, next) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Disburse loan request received', { loanId: input.loanId });
    
    // Validate input
    if (!input || !input.loanId || !input.disbursementDate || !input.transactionAmount) {
      throw new ValidationError('Missing required fields for loan disbursement');
    }
    
    // Placeholder implementation
    const transactionId = 'txn-' + Math.random().toString(36).substring(2, 15);
    
    // Return response
    res.json({
      success: true,
      loanId: input.loanId,
      message: 'Loan disbursed successfully',
      transactionId,
      disbursementDate: input.disbursementDate,
      disbursedAmount: input.transactionAmount
    });
  } catch (error) {
    next(error);
  }
});

// Record loan repayment
router.post('/repayment', async (req, res, next) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Loan repayment request received', { loanId: input.loanId });
    
    // Validate input
    if (!input || !input.loanId || !input.transactionDate || !input.transactionAmount) {
      throw new ValidationError('Missing required fields for loan repayment');
    }
    
    // Placeholder implementation
    const transactionId = 'txn-' + Math.random().toString(36).substring(2, 15);
    
    // For demonstration purposes only
    const principalPortion = input.transactionAmount * 0.8;
    const interestPortion = input.transactionAmount * 0.2;
    
    // Return response
    res.json({
      success: true,
      loanId: input.loanId,
      message: 'Loan repayment processed successfully',
      transactionId,
      transactionDate: input.transactionDate,
      amount: input.transactionAmount,
      principalPortion,
      interestPortion,
      feesPortion: 0,
      penaltyPortion: 0,
      outstandingBalance: 1000 // Placeholder value
    });
  } catch (error) {
    next(error);
  }
});

export const loanRoutes = router;