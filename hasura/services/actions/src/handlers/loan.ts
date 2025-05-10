import { Router } from 'express';
import { approveLoan, calculateLoanSchedule, disburseLoan, makeLoanRepayment, writeOffLoan } from '../services/loanService';
import { logger } from '../utils/logger';

const router = Router();

router.post('/approve', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Approve loan request received', { loanId: input.loanId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await approveLoan(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error approving loan', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/disburse', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Disburse loan request received', { loanId: input.loanId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await disburseLoan(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error disbursing loan', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/repayment', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Loan repayment request received', { loanId: input.loanId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await makeLoanRepayment(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error processing loan repayment', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/writeoff', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Write off loan request received', { loanId: input.loanId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await writeOffLoan(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error writing off loan', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/calculate-schedule', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Calculate loan schedule request received');
    
    const result = await calculateLoanSchedule(input);
    
    res.json(result);
  } catch (error) {
    logger.error('Error calculating loan schedule', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export const loanRoutes = router;