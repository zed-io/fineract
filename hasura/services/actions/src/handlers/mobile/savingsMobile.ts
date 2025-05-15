import { Router } from 'express';
import { 
  getMobileSavingsAccountSummary,
  getMobileSavingsTransactionHistory,
  processOfflineDeposit,
  processOfflineWithdrawal,
  syncOfflineTransactions,
  executeBatchOperations
} from '../../services/mobile/savingsMobileService';
import { logger } from '../../utils/logger';
import compression from 'compression';
import { response } from 'express';

const router = Router();

// Enable compression for all mobile endpoints
router.use(compression({
  // Compress only for gzip/deflate-compatible clients
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return true;
  },
  // Use a higher compression level for mobile APIs
  level: 6
}));

// Middleware to add cache headers
const addCacheHeaders = (req, res, next) => {
  // Generate ETag based on request
  const etag = require('crypto')
    .createHash('md5')
    .update(JSON.stringify(req.body) || '')
    .digest('hex');
  
  const clientEtag = req.headers['if-none-match'];
  
  // If client provided etag matches current etag, return 304
  if (clientEtag === etag) {
    return res.status(304).end();
  }
  
  // Setup ETag, cache-control headers
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'private, max-age=300');
  
  next();
};

// Mobile-optimized savings account summary
router.post('/summary', addCacheHeaders, async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Mobile savings account summary request', { accountId: input.accountId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await getMobileSavingsAccountSummary(input, userId);
    
    // Only add metadata if requested
    if (!input.includeMetadata) {
      delete result.metadata;
    }
    
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving mobile savings summary', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Optimized transaction history with cursor-based pagination
router.post('/transactions', addCacheHeaders, async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Mobile savings transactions request', { 
      accountId: input.accountId,
      limit: input.limit,
      cursor: input.cursor
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await getMobileSavingsTransactionHistory(input, userId);
    
    // Only include metadata if requested
    if (!input.includeRunningBalances) {
      result.transactions.forEach(transaction => {
        delete transaction.runningBalance;
      });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving mobile savings transactions', { error });
    res.status(400).json({
      success: false,
      message: error.message,
      transactions: [],
      hasMore: false
    });
  }
});

// Mobile-optimized deposit with offline support
router.post('/deposit', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Mobile savings deposit request', { 
      accountId: input.accountId,
      offlineId: input.offlineId
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await processOfflineDeposit(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error processing mobile savings deposit', { error });
    res.status(400).json({
      success: false,
      message: error.message,
      accountId: req.body.input.accountId,
      transactionDate: req.body.input.transactionDate,
      amount: req.body.input.transactionAmount,
      status: 'ERROR',
      processingStatus: 'FAILED',
      pendingSync: true,
      offlineId: req.body.input.offlineId
    });
  }
});

// Mobile-optimized withdrawal with offline support
router.post('/withdraw', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Mobile savings withdrawal request', { 
      accountId: input.accountId,
      offlineId: input.offlineId
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await processOfflineWithdrawal(input, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error processing mobile savings withdrawal', { error });
    res.status(400).json({
      success: false,
      message: error.message,
      accountId: req.body.input.accountId,
      transactionDate: req.body.input.transactionDate,
      amount: req.body.input.transactionAmount,
      status: 'ERROR',
      processingStatus: 'FAILED',
      pendingSync: true,
      offlineId: req.body.input.offlineId
    });
  }
});

// Sync multiple offline transactions in a batch
router.post('/sync', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Mobile savings sync request', { 
      transactionCount: input.transactions.length
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await syncOfflineTransactions(input.transactions, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error syncing mobile savings transactions', { error });
    res.status(400).json({
      success: false,
      message: error.message,
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      results: []
    });
  }
});

// Execute multiple operations in a single batch for efficiency
router.post('/batch', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Mobile savings batch operations request', { 
      operationCount: input.operations.length
    });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await executeBatchOperations(input.operations, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('Error executing batch operations', { error });
    res.status(400).json({
      success: false,
      message: error.message,
      results: []
    });
  }
});

export const savingsMobileRoutes = router;