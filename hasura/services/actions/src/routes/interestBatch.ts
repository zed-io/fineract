/**
 * Routes for interest batch processing API endpoints
 */
import { Router } from 'express';
import {
  getInterestBatchConfigs,
  getInterestBatchConfig,
  createInterestBatchConfig,
  updateInterestBatchConfig,
  triggerInterestBatchJob,
  getInterestBatchExecutions,
  getInterestBatchExecution,
  getInterestBatchAccountResults,
  getInterestBatchSummary,
  cancelInterestBatchExecution
} from '../handlers/interestBatch';

const router = Router();

// Batch configuration endpoints
router.get('/configs', getInterestBatchConfigs);
router.get('/config/:id', getInterestBatchConfig);
router.post('/config', createInterestBatchConfig);
router.put('/config/:id', updateInterestBatchConfig);

// Batch execution endpoints
router.post('/trigger', triggerInterestBatchJob);
router.post('/executions', getInterestBatchExecutions);
router.get('/execution/:id', getInterestBatchExecution);
router.post('/execution/:id/cancel', cancelInterestBatchExecution);

// Batch results endpoints
router.post('/results', getInterestBatchAccountResults);
router.get('/summary', getInterestBatchSummary);

export const interestBatchRoutes = router;