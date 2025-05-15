import { 
  Job, 
  JobWorker, 
  JobType, 
  JobParameters 
} from '../models/job';
import { db } from '../utils/db';
import { createContextLogger } from '../utils/logger';
import axios from 'axios';

/**
 * Interface for Recurring Deposit Metrics Job Parameters
 */
export interface RecurringDepositMetricsJobParameters extends JobParameters {
  cacheMetrics?: boolean; // Whether to cache metrics for faster retrieval
  refreshAll?: boolean; // Whether to refresh all metrics (not just summary)
}

/**
 * Recurring Deposit Metrics Job Worker
 * Calculates and caches performance metrics for recurring deposits
 */
export class RecurringDepositMetricsJobWorker implements JobWorker {
  private logger = createContextLogger('RecurringDepositMetrics');
  private actionsUrl = process.env.ACTIONS_SERVICE_URL || 'http://hasura-actions:3000';
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Processing results
   */
  async process(job: Job, parameters?: RecurringDepositMetricsJobParameters): Promise<any> {
    this.logger.info('Starting recurring deposit metrics job', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    try {
      // Use parameters if provided, otherwise use the job parameters
      const jobParams = parameters || job.parameters as RecurringDepositMetricsJobParameters || {};
      
      // Default parameters
      const cacheMetrics = jobParams.cacheMetrics !== undefined ? jobParams.cacheMetrics : true;
      const refreshAll = jobParams.refreshAll !== undefined ? jobParams.refreshAll : false;
      
      this.logger.info('Processing with parameters', { 
        cacheMetrics, 
        refreshAll 
      });
      
      // Get metrics from API
      const response = await axios.post(`${this.actionsUrl}/api/recurring-deposit/dashboard/metrics`, {
        input: {},
        request_query: "",
        session_variables: {
          'x-hasura-role': 'admin'
        }
      });
      
      if (!response.data || !response.data.success) {
        throw new Error('Failed to get metrics from API');
      }
      
      const metrics = response.data.metrics;
      
      // Cache the metrics if enabled
      if (cacheMetrics) {
        const metricsId = uuidv4();
        const now = new Date();
        
        // Insert into cache table
        await db.query(
          `INSERT INTO recurring_deposit_metrics_cache (
            id, metrics_data, generated_date, total_accounts, active_accounts, 
            total_deposits, total_interest_earned, compliance_rate
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            metricsId,
            JSON.stringify(metrics),
            now,
            metrics.stats.totalAccounts,
            metrics.stats.activeAccounts,
            metrics.stats.totalDeposits,
            metrics.stats.totalInterestPosted,
            metrics.installmentCompliance.complianceRate
          ]
        );
        
        // Delete old cache entries (keep last 10)
        await db.query(
          `DELETE FROM recurring_deposit_metrics_cache
           WHERE id NOT IN (
             SELECT id FROM recurring_deposit_metrics_cache
             ORDER BY generated_date DESC
             LIMIT 10
           )`
        );
        
        this.logger.info('Cached metrics', { metricsId });
      }
      
      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;
      
      // Compile results
      const results = {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        cached: cacheMetrics,
        metricsGenerated: true,
        status: 'completed',
        message: `Generated and cached metrics with ${metrics.stats.totalAccounts} total accounts and ${metrics.stats.activeAccounts} active accounts`
      };
      
      this.logger.info('Recurring deposit metrics job completed', { 
        executionTimeMs,
        totalAccounts: metrics.stats.totalAccounts,
        activeAccounts: metrics.stats.activeAccounts
      });
      
      return results;
    } catch (error) {
      this.logger.error('Recurring deposit metrics job failed', { error });
      
      // Calculate execution time even for failures
      const executionTimeMs = Date.now() - startTime;
      
      return {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        status: 'failed',
        error: error.message,
        stack: error.stack
      };
    }
  }
  
  /**
   * Get job type handled by this worker
   */
  getJobType(): JobType {
    return JobType.CUSTOM;
  }
  
  /**
   * Check if worker can handle the job
   * @param job The job to check
   */
  canHandle(job: Job): boolean {
    return job.jobType === JobType.CUSTOM && 
           job.name === 'Recurring Deposit Metrics Generation';
  }
}

// Helper function to generate UUIDs
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}