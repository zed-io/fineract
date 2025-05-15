import { Router } from 'express';
import {
  createJournalEntries,
  reverseJournalEntries,
  getJournalEntries,
  getTrialBalance
} from '../services/journalEntryService';
import {
  createProductAccountMapping,
  updateProductAccountMapping,
  deleteProductAccountMapping,
  getProductAccountMappings,
  setupDefaultLoanProductMappings,
  setupDefaultSavingsProductMappings
} from '../services/productAccountMappingService';
import {
  postLoanTransactionToAccounting,
  postSavingsTransactionToAccounting,
  processPendingAccountingTransactions
} from '../services/transactionPostingService';
import { provisioningRoutes } from './accounting/provisioningHandler';
import { logger } from '../utils/logger';

const router = Router();

// Journal Entry routes
router.post('/journal-entries/create', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Create journal entries request received');
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await createJournalEntries(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error creating journal entries', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/journal-entries/reverse', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Reverse journal entry request received', { transactionId: input.transactionId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await reverseJournalEntries(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error reversing journal entries', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/journal-entries/search', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Search journal entries request received');
    
    const result = await getJournalEntries(input);
    
    res.json(result);
  } catch (error) {
    logger.error('Error searching journal entries', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/trial-balance', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Generate trial balance request received');
    
    const result = await getTrialBalance(input);
    
    res.json({
      success: true,
      trialBalance: result
    });
  } catch (error) {
    logger.error('Error generating trial balance', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Product Account Mapping routes
router.post('/product-mapping/get', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Get product account mappings request received', { 
      productId: input.productId, 
      productType: input.productType 
    });
    
    const result = await getProductAccountMappings(input.productId, input.productType);
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting product account mappings', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/product-mapping/create', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Create product account mapping request received', { 
      productId: input.productId, 
      productType: input.productType,
      accountMappingType: input.accountMappingType
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await createProductAccountMapping(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error creating product account mapping', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/product-mapping/update', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Update product account mapping request received', { 
      mappingId: input.mappingId, 
      glAccountId: input.glAccountId 
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await updateProductAccountMapping(input.mappingId, input.glAccountId, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error updating product account mapping', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/product-mapping/delete', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Delete product account mapping request received', { mappingId: input.mappingId });
    
    const result = await deleteProductAccountMapping(input.mappingId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error deleting product account mapping', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/product-mapping/setup-loan-defaults', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Setup default loan product mappings request received', { productId: input.productId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await setupDefaultLoanProductMappings(input.productId, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error setting up default loan product mappings', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/product-mapping/setup-savings-defaults', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Setup default savings product mappings request received', { productId: input.productId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await setupDefaultSavingsProductMappings(input.productId, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error setting up default savings product mappings', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Transaction Posting routes
router.post('/post-loan-transaction', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Post loan transaction to accounting request received', { 
      loanId: input.loanId, 
      transactionId: input.transactionDetails.transactionId 
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await postLoanTransactionToAccounting(
      input.loanId, 
      input.transactionDetails, 
      userId
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error posting loan transaction to accounting', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/post-savings-transaction', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Post savings transaction to accounting request received', { 
      savingsId: input.savingsId, 
      transactionId: input.transactionDetails.transactionId 
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await postSavingsTransactionToAccounting(
      input.savingsId, 
      input.transactionDetails, 
      userId
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error posting savings transaction to accounting', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/process-pending-transactions', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Process pending accounting transactions request received', { 
      type: input.type, 
      batchSize: input.batchSize 
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await processPendingAccountingTransactions(
      input.type, 
      input.batchSize, 
      userId
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error processing pending accounting transactions', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Use provisioning routes
router.use('/provisioning', provisioningRoutes);

export const accountingRoutes = router;