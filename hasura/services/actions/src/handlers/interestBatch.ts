/**
 * Handler for interest batch processing GraphQL actions
 */
import { Request, Response } from 'express';
import { InterestBatchService } from '../services/interestBatchService';
import logger from '../utils/logger';
import { authMiddleware } from '../utils/authMiddleware';

const interestBatchService = new InterestBatchService();

/**
 * Get all batch configurations
 */
export const getInterestBatchConfigs = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const configs = await interestBatchService.getBatchConfigs();
      return res.json(configs);
    } catch (error) {
      logger.error('Error fetching batch configs:', error);
      return res.status(500).json({ message: 'Error fetching batch configurations', error: error.message });
    }
  }
];

/**
 * Get a specific batch configuration
 */
export const getInterestBatchConfig = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const config = await interestBatchService.getBatchConfig(id);
      
      if (!config) {
        return res.status(404).json({ message: 'Batch configuration not found' });
      }
      
      return res.json(config);
    } catch (error) {
      logger.error('Error fetching batch config:', error);
      return res.status(500).json({ message: 'Error fetching batch configuration', error: error.message });
    }
  }
];

/**
 * Create a new batch configuration
 */
export const createInterestBatchConfig = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      const config = await interestBatchService.createBatchConfig({
        jobType: input.jobType,
        batchSize: input.batchSize,
        maxRetries: input.maxRetries,
        retryIntervalMinutes: input.retryIntervalMinutes,
        timeoutSeconds: input.timeoutSeconds,
        parallelThreads: input.parallelThreads,
        enabled: input.enabled,
        description: input.description,
        accountTypes: input.accountTypes,
        parameters: input.parameters
      });
      
      return res.json(config);
    } catch (error) {
      logger.error('Error creating batch config:', error);
      return res.status(500).json({ message: 'Error creating batch configuration', error: error.message });
    }
  }
];

/**
 * Update a batch configuration
 */
export const updateInterestBatchConfig = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { input } = req.body;
      
      const config = await interestBatchService.updateBatchConfig(id, {
        batchSize: input.batchSize,
        maxRetries: input.maxRetries,
        retryIntervalMinutes: input.retryIntervalMinutes,
        timeoutSeconds: input.timeoutSeconds,
        parallelThreads: input.parallelThreads,
        enabled: input.enabled,
        description: input.description,
        accountTypes: input.accountTypes,
        parameters: input.parameters
      });
      
      if (!config) {
        return res.status(404).json({ message: 'Batch configuration not found' });
      }
      
      return res.json(config);
    } catch (error) {
      logger.error('Error updating batch config:', error);
      return res.status(500).json({ message: 'Error updating batch configuration', error: error.message });
    }
  }
];

/**
 * Trigger a batch job
 */
export const triggerInterestBatchJob = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      
      const execution = await interestBatchService.triggerInterestBatchJob({
        jobType: input.jobType,
        parameters: input.parameters,
        accountIds: input.accountIds
      });
      
      return res.json(execution);
    } catch (error) {
      logger.error('Error triggering batch job:', error);
      return res.status(500).json({ message: 'Error triggering batch job', error: error.message });
    }
  }
];

/**
 * Get batch executions
 */
export const getInterestBatchExecutions = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      
      const executions = await interestBatchService.getBatchExecutions({
        jobType: input?.jobType,
        dateFrom: input?.dateFrom,
        dateTo: input?.dateTo,
        status: input?.status,
        limit: input?.limit,
        offset: input?.offset
      });
      
      return res.json(executions);
    } catch (error) {
      logger.error('Error fetching batch executions:', error);
      return res.status(500).json({ message: 'Error fetching batch executions', error: error.message });
    }
  }
];

/**
 * Get a specific batch execution
 */
export const getInterestBatchExecution = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const execution = await interestBatchService.getBatchExecution(id);
      
      if (!execution) {
        return res.status(404).json({ message: 'Batch execution not found' });
      }
      
      return res.json(execution);
    } catch (error) {
      logger.error('Error fetching batch execution:', error);
      return res.status(500).json({ message: 'Error fetching batch execution', error: error.message });
    }
  }
];

/**
 * Get batch account results
 */
export const getInterestBatchAccountResults = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      
      const results = await interestBatchService.getBatchAccountResults({
        batchExecutionId: input.batchExecutionId,
        status: input.status,
        limit: input.limit,
        offset: input.offset
      });
      
      return res.json(results);
    } catch (error) {
      logger.error('Error fetching batch account results:', error);
      return res.status(500).json({ message: 'Error fetching batch account results', error: error.message });
    }
  }
];

/**
 * Get batch summary
 */
export const getInterestBatchSummary = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const summary = await interestBatchService.getBatchSummary();
      return res.json(summary);
    } catch (error) {
      logger.error('Error fetching batch summary:', error);
      return res.status(500).json({ message: 'Error fetching batch summary', error: error.message });
    }
  }
];

/**
 * Cancel a batch execution
 */
export const cancelInterestBatchExecution = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const execution = await interestBatchService.cancelBatchExecution(id);
      
      if (!execution) {
        return res.status(404).json({ message: 'Batch execution not found' });
      }
      
      return res.json(execution);
    } catch (error) {
      logger.error('Error cancelling batch execution:', error);
      return res.status(500).json({ message: 'Error cancelling batch execution', error: error.message });
    }
  }
];