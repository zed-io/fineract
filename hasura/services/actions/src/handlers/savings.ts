import { Router } from 'express';
import { 
  createSavingsAccount,
  approveSavingsAccount, 
  activateSavingsAccount, 
  depositToSavings, 
  withdrawFromSavings,
  postInterestToSavings,
  calculateSavingsInterest,
  closeSavingsAccount,
  searchSavingsAccounts
} from '../services/savingsService';
import { savingsStatementService } from '../services/savingsStatementService';
import { logger } from '../utils/logger';

const router = Router();

router.post('/create', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Create savings account request received', { 
      clientId: input.clientId, 
      groupId: input.groupId,
      productId: input.productId
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await createSavingsAccount(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error creating savings account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/approve', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Approve savings account request received', { accountId: input.accountId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await approveSavingsAccount(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error approving savings account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/activate', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Activate savings account request received', { accountId: input.accountId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await activateSavingsAccount(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error activating savings account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/deposit', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Savings deposit request received', { accountId: input.accountId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await depositToSavings(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error processing savings deposit', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/withdraw', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Savings withdrawal request received', { accountId: input.accountId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await withdrawFromSavings(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error processing savings withdrawal', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/post-interest', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Post interest request received');
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await postInterestToSavings(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error posting interest', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/calculate-interest', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Calculate interest request received', { accountId: input.accountId });
    
    const result = await calculateSavingsInterest(input);
    
    res.json(result);
  } catch (error) {
    logger.error('Error calculating interest', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/close', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Close savings account request received', { accountId: input.accountId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await closeSavingsAccount(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error closing savings account', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/generate-statement', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Generate savings statement request received', { accountId: input.accountId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await savingsStatementService.generateStatement(input, userId);
    
    res.json({
      success: true,
      statement: {
        ...result,
        // Remove file path from response for security
        filePath: undefined
      }
    });
  } catch (error) {
    logger.error('Error generating savings statement', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Savings account search request received', input);
    
    const result = await searchSavingsAccounts(input);
    
    res.json(result);
  } catch (error) {
    logger.error('Error searching savings accounts', { error });
    res.status(400).json({
      success: false,
      message: error.message,
      totalCount: 0,
      page: input?.page || 1,
      pageSize: input?.pageSize || 10,
      totalPages: 0,
      results: []
    });
  }
});

export const savingsRoutes = router;