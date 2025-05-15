/**
 * Service layer for interest batch processing
 */
import { pool } from '../utils/db';
import logger from '../utils/logger';
import { 
  InterestBatchConfig, 
  InterestBatchExecution, 
  InterestBatchAccountResult, 
  InterestBatchAccountStatus,
  InterestBatchSummary,
  BatchExecutionStatus,
  BatchAccountResultStatus,
  InterestBatchJobType,
  createNewBatchExecution,
  createBatchAccountResult
} from '../models/interestBatch';
import { SavingsAccount } from '../models/savings';
import { SavingsService } from './savingsService';

export class InterestBatchService {
  private savingsService: SavingsService;

  constructor() {
    this.savingsService = new SavingsService();
  }

  /**
   * Get all batch job configurations
   */
  async getBatchConfigs(): Promise<InterestBatchConfig[]> {
    const query = `
      SELECT * FROM interest_batch_config
      ORDER BY job_type
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get a specific batch configuration by ID
   */
  async getBatchConfig(id: string): Promise<InterestBatchConfig | null> {
    const query = `
      SELECT * FROM interest_batch_config
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get batch configuration by job type
   */
  async getBatchConfigByType(jobType: string): Promise<InterestBatchConfig | null> {
    const query = `
      SELECT * FROM interest_batch_config
      WHERE job_type = $1
    `;
    const result = await pool.query(query, [jobType]);
    return result.rows[0] || null;
  }

  /**
   * Create new batch configuration
   */
  async createBatchConfig(config: Partial<InterestBatchConfig>): Promise<InterestBatchConfig> {
    const query = `
      INSERT INTO interest_batch_config (
        job_type, batch_size, max_retries, retry_interval_minutes,
        timeout_seconds, parallel_threads, enabled, description,
        account_types, parameters
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      config.jobType,
      config.batchSize || 1000,
      config.maxRetries || 3,
      config.retryIntervalMinutes || 15,
      config.timeoutSeconds || 3600,
      config.parallelThreads || 4,
      config.enabled !== undefined ? config.enabled : true,
      config.description || null,
      config.accountTypes || ['SAVINGS', 'FIXED_DEPOSIT', 'RECURRING_DEPOSIT'],
      config.parameters || {}
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update batch configuration
   */
  async updateBatchConfig(id: string, updates: Partial<InterestBatchConfig>): Promise<InterestBatchConfig | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current config first
      const getCurrentConfig = 'SELECT * FROM interest_batch_config WHERE id = $1';
      const currentConfig = await client.query(getCurrentConfig, [id]);
      
      if (currentConfig.rows.length === 0) {
        return null;
      }
      
      const query = `
        UPDATE interest_batch_config
        SET 
          batch_size = $1,
          max_retries = $2,
          retry_interval_minutes = $3,
          timeout_seconds = $4,
          parallel_threads = $5,
          enabled = $6,
          description = $7,
          account_types = $8,
          parameters = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `;
      
      const values = [
        updates.batchSize || currentConfig.rows[0].batch_size,
        updates.maxRetries || currentConfig.rows[0].max_retries,
        updates.retryIntervalMinutes || currentConfig.rows[0].retry_interval_minutes,
        updates.timeoutSeconds || currentConfig.rows[0].timeout_seconds,
        updates.parallelThreads || currentConfig.rows[0].parallel_threads,
        updates.enabled !== undefined ? updates.enabled : currentConfig.rows[0].enabled,
        updates.description || currentConfig.rows[0].description,
        updates.accountTypes || currentConfig.rows[0].account_types,
        updates.parameters || currentConfig.rows[0].parameters,
        id
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating batch config', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get batch executions with pagination
   */
  async getBatchExecutions(
    params: {
      jobType?: string;
      dateFrom?: Date;
      dateTo?: Date;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: InterestBatchExecution[], totalCount: number }> {
    let whereClause = '';
    const conditions = [];
    const values = [];
    let paramCount = 1;
    
    if (params.jobType) {
      conditions.push(`job_type = $${paramCount++}`);
      values.push(params.jobType);
    }
    
    if (params.dateFrom) {
      conditions.push(`started_at >= $${paramCount++}`);
      values.push(params.dateFrom);
    }
    
    if (params.dateTo) {
      conditions.push(`started_at <= $${paramCount++}`);
      values.push(params.dateTo);
    }
    
    if (params.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(params.status);
    }
    
    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM interest_batch_execution
      ${whereClause}
    `;
    
    // Data query
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    
    const dataQuery = `
      SELECT *
      FROM interest_batch_execution
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    
    values.push(limit, offset);
    
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, values.slice(0, values.length - 2)),
      pool.query(dataQuery, values)
    ]);
    
    return {
      data: dataResult.rows,
      totalCount: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Get a specific batch execution by ID
   */
  async getBatchExecution(id: string): Promise<InterestBatchExecution | null> {
    const query = `
      SELECT * FROM interest_batch_execution
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get account results for a batch execution
   */
  async getBatchAccountResults(
    params: {
      batchExecutionId: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: InterestBatchAccountResult[], totalCount: number }> {
    let whereClause = 'WHERE batch_execution_id = $1';
    const values = [params.batchExecutionId];
    let paramCount = 2;
    
    if (params.status) {
      whereClause += ` AND status = $${paramCount++}`;
      values.push(params.status);
    }
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM interest_batch_account_result
      ${whereClause}
    `;
    
    // Data query
    const limit = params.limit || 100;
    const offset = params.offset || 0;
    
    const dataQuery = `
      SELECT *
      FROM interest_batch_account_result
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    
    values.push(limit, offset);
    
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, values.slice(0, values.length - 2)),
      pool.query(dataQuery, values)
    ]);
    
    return {
      data: dataResult.rows,
      totalCount: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Get the batch processing summary
   */
  async getBatchSummary(): Promise<InterestBatchSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const accountsProcessedQuery = `
      SELECT COUNT(*) as total
      FROM interest_batch_account_result
      WHERE created_at >= $1 AND status = $2
    `;
    
    const interestPostedQuery = `
      SELECT COALESCE(SUM(interest_posted), 0) as total
      FROM interest_batch_account_result
      WHERE created_at >= $1 AND status = $2
    `;
    
    const failedAccountsQuery = `
      SELECT COUNT(*) as total
      FROM interest_batch_account_result
      WHERE created_at >= $1 AND status = $3
    `;
    
    const avgProcessingTimeQuery = `
      SELECT AVG(processing_time_ms) as avg_time
      FROM interest_batch_account_result
      WHERE created_at >= $1 AND status = $2
    `;
    
    const lastCompletedRunQuery = `
      SELECT *
      FROM interest_batch_execution
      WHERE status = $1
      ORDER BY completed_at DESC
      LIMIT 1
    `;
    
    const currentRunningJobsQuery = `
      SELECT COUNT(*) as count
      FROM interest_batch_execution
      WHERE status = $1
    `;
    
    const jobConfigurationsQuery = `
      SELECT *
      FROM interest_batch_config
      ORDER BY job_type
    `;
    
    const [
      accountsProcessed,
      interestPosted,
      failedAccounts,
      avgProcessingTime,
      lastCompletedRun,
      currentRunningJobs,
      jobConfigurations
    ] = await Promise.all([
      pool.query(accountsProcessedQuery, [today, BatchAccountResultStatus.SUCCESS]),
      pool.query(interestPostedQuery, [today, BatchAccountResultStatus.SUCCESS]),
      pool.query(failedAccountsQuery, [today, BatchAccountResultStatus.FAILED]),
      pool.query(avgProcessingTimeQuery, [today, BatchAccountResultStatus.SUCCESS]),
      pool.query(lastCompletedRunQuery, [BatchExecutionStatus.COMPLETED]),
      pool.query(currentRunningJobsQuery, [BatchExecutionStatus.RUNNING]),
      pool.query(jobConfigurationsQuery)
    ]);
    
    return {
      totalAccountsProcessedToday: parseInt(accountsProcessed.rows[0].total),
      totalInterestPostedToday: parseFloat(interestPosted.rows[0].total) || 0,
      failedAccountsToday: parseInt(failedAccounts.rows[0].total),
      avgProcessingTimeMs: avgProcessingTime.rows[0].avg_time ? Math.round(parseFloat(avgProcessingTime.rows[0].avg_time)) : undefined,
      lastCompletedRun: lastCompletedRun.rows[0] || undefined,
      currentRunningJobs: parseInt(currentRunningJobs.rows[0].count),
      jobConfigurations: jobConfigurations.rows
    };
  }

  /**
   * Cancel a running batch execution
   */
  async cancelBatchExecution(id: string): Promise<InterestBatchExecution | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if the execution exists and is running
      const checkQuery = `
        SELECT * FROM interest_batch_execution
        WHERE id = $1
      `;
      
      const execution = await client.query(checkQuery, [id]);
      
      if (execution.rows.length === 0) {
        return null;
      }
      
      if (execution.rows[0].status !== BatchExecutionStatus.RUNNING) {
        return execution.rows[0];
      }
      
      // Update the execution to cancelled
      const updateQuery = `
        UPDATE interest_batch_execution
        SET 
          status = $1,
          completed_at = NOW(),
          updated_at = NOW(),
          execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
          error_details = jsonb_build_object('message', 'Execution cancelled by user', 'timestamp', NOW())
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [BatchExecutionStatus.CANCELLED, id]);
      
      // Update any in-progress account results to skipped
      const updateResultsQuery = `
        UPDATE interest_batch_account_result
        SET 
          status = $1,
          error_message = 'Batch execution cancelled by user'
        WHERE batch_execution_id = $2
        AND status NOT IN ($3, $4)
      `;
      
      await client.query(updateResultsQuery, [
        BatchAccountResultStatus.SKIPPED,
        id,
        BatchAccountResultStatus.SUCCESS,
        BatchAccountResultStatus.FAILED
      ]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error cancelling batch execution', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Trigger an interest batch job
   */
  async triggerInterestBatchJob(
    params: {
      jobType: string;
      parameters?: any;
      accountIds?: string[];
    }
  ): Promise<InterestBatchExecution> {
    // Validate job type
    if (
      params.jobType !== InterestBatchJobType.DAILY_INTEREST_ACCRUAL &&
      params.jobType !== InterestBatchJobType.INTEREST_POSTING
    ) {
      throw new Error(`Invalid job type: ${params.jobType}`);
    }
    
    // Get the configuration for this job type
    const config = await this.getBatchConfigByType(params.jobType);
    if (!config) {
      throw new Error(`No configuration found for job type: ${params.jobType}`);
    }
    
    // Check if there's already a running job of this type
    const runningJobs = await pool.query(
      'SELECT COUNT(*) as count FROM interest_batch_execution WHERE job_type = $1 AND status = $2',
      [params.jobType, BatchExecutionStatus.RUNNING]
    );
    
    if (parseInt(runningJobs.rows[0].count) > 0) {
      throw new Error(`A job of type ${params.jobType} is already running`);
    }
    
    // Create a new batch execution record
    const batchParams = {
      ...config.parameters,
      ...params.parameters,
      specific_account_ids: params.accountIds
    };
    
    const execution = createNewBatchExecution(params.jobType, batchParams);
    
    // Insert the execution record
    const insertQuery = `
      INSERT INTO interest_batch_execution (
        id, job_type, started_at, status, batch_parameters, 
        total_accounts, processed_accounts, successful_accounts, failed_accounts,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      execution.id,
      execution.jobType,
      execution.startedAt,
      execution.status,
      execution.batchParameters,
      execution.totalAccounts,
      execution.processedAccounts,
      execution.successfulAccounts,
      execution.failedAccounts,
      execution.createdAt,
      execution.updatedAt
    ];
    
    const result = await pool.query(insertQuery, values);
    const savedExecution = result.rows[0];
    
    // Start the job processing in the background
    this.processInterestBatchJob(savedExecution, config)
      .catch(error => logger.error(`Error processing batch job ${savedExecution.id}:`, error));
    
    return savedExecution;
  }

  /**
   * Process the batch job (runs asynchronously)
   */
  private async processInterestBatchJob(
    execution: InterestBatchExecution,
    config: InterestBatchConfig
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Determine which accounts to process
      let accountQuery = '';
      const queryParams = [];
      
      if (execution.jobType === InterestBatchJobType.DAILY_INTEREST_ACCRUAL) {
        // For daily accrual, process all active accounts
        accountQuery = `
          SELECT 
            a.id, a.account_number, a.account_type,
            COALESCE(s.id, NULL) as status_id
          FROM savings_account a
          LEFT JOIN interest_batch_account_status s ON a.id = s.account_id
          WHERE a.status = 'ACTIVE'
          AND a.account_type = ANY($1)
        `;
        queryParams.push(config.accountTypes);
      } else if (execution.jobType === InterestBatchJobType.INTEREST_POSTING) {
        // For interest posting, only process accounts due for posting
        const today = new Date();
        
        accountQuery = `
          SELECT 
            a.id, a.account_number, a.account_type,
            COALESCE(s.id, NULL) as status_id
          FROM savings_account a
          LEFT JOIN interest_batch_account_status s ON a.id = s.account_id
          WHERE a.status = 'ACTIVE'
          AND a.account_type = ANY($1)
          AND (
            s.next_posting_date IS NULL 
            OR s.next_posting_date <= $2
          )
        `;
        queryParams.push(config.accountTypes, today);
      }
      
      // Handle specific accounts if provided
      if (
        execution.batchParameters && 
        execution.batchParameters.specific_account_ids && 
        execution.batchParameters.specific_account_ids.length > 0
      ) {
        accountQuery = `
          SELECT 
            a.id, a.account_number, a.account_type,
            COALESCE(s.id, NULL) as status_id
          FROM savings_account a
          LEFT JOIN interest_batch_account_status s ON a.id = s.account_id
          WHERE a.id = ANY($1)
          AND a.status = 'ACTIVE'
        `;
        queryParams.push(execution.batchParameters.specific_account_ids);
      }
      
      const accountsResult = await client.query(accountQuery, queryParams);
      const accounts = accountsResult.rows;
      
      // Update the execution record with the total number of accounts
      await client.query(
        'UPDATE interest_batch_execution SET total_accounts = $1, updated_at = NOW() WHERE id = $2',
        [accounts.length, execution.id]
      );
      
      // Process accounts in batches
      const batchSize = config.batchSize;
      const promises = [];
      
      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        promises.push(this.processBatch(execution, batch, client));
      }
      
      await Promise.all(promises);
      
      // Update the execution record with completed status
      const completedAt = new Date();
      const executionTimeMs = completedAt.getTime() - execution.startedAt.getTime();
      
      await client.query(
        `UPDATE interest_batch_execution 
         SET status = $1, completed_at = $2, updated_at = NOW(), execution_time_ms = $3
         WHERE id = $4`,
        [BatchExecutionStatus.COMPLETED, completedAt, executionTimeMs, execution.id]
      );
      
      logger.info(`Batch job ${execution.id} completed successfully`);
    } catch (error) {
      logger.error(`Error processing batch job ${execution.id}:`, error);
      
      // Update the execution record with failed status
      const completedAt = new Date();
      const executionTimeMs = completedAt.getTime() - execution.startedAt.getTime();
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        timestamp: completedAt
      };
      
      await client.query(
        `UPDATE interest_batch_execution 
         SET status = $1, completed_at = $2, updated_at = NOW(), 
         execution_time_ms = $3, error_details = $4
         WHERE id = $5`,
        [
          BatchExecutionStatus.FAILED, 
          completedAt, 
          executionTimeMs, 
          JSON.stringify(errorDetails),
          execution.id
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Process a batch of accounts
   */
  private async processBatch(
    execution: InterestBatchExecution, 
    accounts: any[], 
    client: any
  ): Promise<void> {
    // Process each account in parallel, up to the configured thread limit
    const parallelLimit = execution.batchParameters?.parallel_threads || 4;
    const chunks = [];
    
    for (let i = 0; i < accounts.length; i += parallelLimit) {
      chunks.push(accounts.slice(i, i + parallelLimit));
    }
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(account => this.processAccount(execution, account, client))
      );
    }
  }

  /**
   * Process a single account
   */
  private async processAccount(
    execution: InterestBatchExecution, 
    account: any, 
    client: any
  ): Promise<void> {
    const accountResult = createBatchAccountResult(
      execution.id,
      account.id,
      account.account_type,
      account.account_number
    );
    
    const startTime = Date.now();
    
    try {
      // Insert the account result record to track this processing
      await client.query(
        `INSERT INTO interest_batch_account_result (
          id, batch_execution_id, account_id, account_number, account_type,
          status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          accountResult.id,
          accountResult.batchExecutionId,
          accountResult.accountId,
          accountResult.accountNumber,
          accountResult.accountType,
          accountResult.status,
          accountResult.createdAt
        ]
      );
      
      // Determine which operation to perform
      if (execution.jobType === InterestBatchJobType.DAILY_INTEREST_ACCRUAL) {
        const result = await this.savingsService.calculateDailyInterest(account.id);
        
        // Update the account result record
        await client.query(
          `UPDATE interest_batch_account_result 
           SET status = $1, interest_calculated = $2, 
           processing_time_ms = $3, error_message = $4
           WHERE id = $5`,
          [
            result.success ? BatchAccountResultStatus.SUCCESS : BatchAccountResultStatus.FAILED,
            result.interestCalculated,
            Date.now() - startTime,
            result.errorMessage,
            accountResult.id
          ]
        );
        
        // Update the account status record
        if (account.status_id) {
          await client.query(
            `UPDATE interest_batch_account_status 
             SET last_accrual_date = $1, error_count = $2, 
             last_error_message = $3, updated_at = NOW()
             WHERE id = $4`,
            [
              result.success ? result.calculationDate : null,
              result.success ? 0 : (account.error_count || 0) + 1,
              result.errorMessage,
              account.status_id
            ]
          );
        } else {
          // Create a new account status record
          await client.query(
            `INSERT INTO interest_batch_account_status (
              account_id, account_type, account_number, 
              last_accrual_date, accrual_frequency, status, 
              error_count, last_error_message, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [
              account.id,
              account.account_type,
              account.account_number,
              result.success ? result.calculationDate : null,
              'DAILY',
              'ACTIVE',
              result.success ? 0 : 1,
              result.errorMessage
            ]
          );
        }
      } else if (execution.jobType === InterestBatchJobType.INTEREST_POSTING) {
        const result = await this.savingsService.postInterest(account.id);
        
        // Update the account result record
        await client.query(
          `UPDATE interest_batch_account_result 
           SET status = $1, interest_posted = $2, tax_amount = $3,
           processing_time_ms = $4, error_message = $5
           WHERE id = $6`,
          [
            result.success ? BatchAccountResultStatus.SUCCESS : BatchAccountResultStatus.FAILED,
            result.interestPosted,
            result.taxAmount,
            Date.now() - startTime,
            result.errorMessage,
            accountResult.id
          ]
        );
        
        // Calculate next posting date based on posting frequency
        const nextPostingDate = this.calculateNextPostingDate(
          result.postingDate,
          account.posting_frequency || 'MONTHLY'
        );
        
        // Update the account status record
        if (account.status_id) {
          await client.query(
            `UPDATE interest_batch_account_status 
             SET last_posting_date = $1, next_posting_date = $2,
             error_count = $3, last_error_message = $4, 
             last_successful_run = $5, updated_at = NOW()
             WHERE id = $6`,
            [
              result.success ? result.postingDate : null,
              nextPostingDate,
              result.success ? 0 : (account.error_count || 0) + 1,
              result.errorMessage,
              result.success ? new Date() : null,
              account.status_id
            ]
          );
        } else {
          // Create a new account status record
          await client.query(
            `INSERT INTO interest_batch_account_status (
              account_id, account_type, account_number, 
              last_posting_date, next_posting_date, accrual_frequency,
              posting_frequency, status, error_count, last_error_message,
              last_successful_run, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
            [
              account.id,
              account.account_type,
              account.account_number,
              result.success ? result.postingDate : null,
              nextPostingDate,
              'DAILY',
              account.posting_frequency || 'MONTHLY',
              'ACTIVE',
              result.success ? 0 : 1,
              result.errorMessage,
              result.success ? new Date() : null
            ]
          );
        }
      }
      
      // Update batch execution counts
      await client.query(
        `UPDATE interest_batch_execution 
         SET processed_accounts = processed_accounts + 1,
         successful_accounts = successful_accounts + CASE WHEN $1 THEN 1 ELSE 0 END,
         failed_accounts = failed_accounts + CASE WHEN $1 THEN 0 ELSE 1 END,
         updated_at = NOW()
         WHERE id = $2`,
        [
          accountResult.status === BatchAccountResultStatus.SUCCESS,
          execution.id
        ]
      );
    } catch (error) {
      logger.error(`Error processing account ${account.id} in batch ${execution.id}:`, error);
      
      // Update the account result record with the error
      await client.query(
        `UPDATE interest_batch_account_result 
         SET status = $1, processing_time_ms = $2, 
         error_message = $3, error_details = $4
         WHERE id = $5`,
        [
          BatchAccountResultStatus.FAILED,
          Date.now() - startTime,
          error.message,
          JSON.stringify({ stack: error.stack }),
          accountResult.id
        ]
      );
      
      // Update batch execution counts
      await client.query(
        `UPDATE interest_batch_execution 
         SET processed_accounts = processed_accounts + 1,
         failed_accounts = failed_accounts + 1,
         updated_at = NOW()
         WHERE id = $1`,
        [execution.id]
      );
      
      // Update account status error count
      if (account.status_id) {
        await client.query(
          `UPDATE interest_batch_account_status 
           SET error_count = error_count + 1, 
           last_error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [error.message, account.status_id]
        );
      }
    }
  }

  /**
   * Calculate the next posting date based on frequency
   */
  private calculateNextPostingDate(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);
    
    switch (frequency.toUpperCase()) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'BIWEEKLY':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'BIANNUAL':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'ANNUAL':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
    }
    
    return nextDate;
  }
}