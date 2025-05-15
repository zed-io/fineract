import { v4 as uuidv4 } from 'uuid';
import { JobStatus, JobType } from '../models/job';
import { db } from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Creates the Recurring Deposit Installment Tracking job
 * This job tracks installments for recurring deposits, identifying overdue installments,
 * updating account statistics, and optionally applying penalties and sending notifications
 * @returns Created job ID
 */
export async function createRecurringDepositInstallmentTrackingJob(): Promise<string> {
  try {
    logger.info('Creating recurring deposit installment tracking job');

    // Check if job already exists
    const existingJobResult = await db.query(
      `SELECT id FROM job 
       WHERE name = 'Recurring Deposit Installment Tracking'
       AND is_active = true
       LIMIT 1`
    );

    if (existingJobResult.rowCount > 0) {
      const jobId = existingJobResult.rows[0].id;
      logger.info('Recurring deposit installment tracking job already exists', { jobId });
      return jobId;
    }

    // Get job configuration from job_config table
    const configResult = await db.query(
      `SELECT * FROM job_config 
       WHERE job_type = 'recurring_deposit_installment_tracking'
       LIMIT 1`
    );

    let cronExpression = '0 3 * * *'; // Default to 3 AM daily
    let maxRetries = 3;
    let timeoutSeconds = 3600; // 1 hour
    let priority = 'high';
    let executionInterval = 'daily';
    let concurrencyLimit = 1;

    // If configuration exists, use it
    if (configResult.rowCount > 0) {
      const config = configResult.rows[0];
      cronExpression = config.cron_expression || cronExpression;
      maxRetries = config.max_retries || maxRetries;
      timeoutSeconds = config.timeout_seconds || timeoutSeconds;
      priority = config.priority || priority;
      executionInterval = config.execution_interval || executionInterval;
      concurrencyLimit = config.concurrency_limit || concurrencyLimit;
    } else {
      // Create default configuration
      await db.query(
        `INSERT INTO job_config (
          job_type, enabled, cron_expression, execution_interval, 
          priority, max_retries, timeout_seconds, is_system_job, 
          concurrency_limit, description, parameters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          'recurring_deposit_installment_tracking',
          true,
          cronExpression,
          executionInterval,
          priority,
          maxRetries,
          timeoutSeconds,
          true, // is_system_job
          concurrencyLimit,
          'Track recurring deposit installments and identify overdue accounts',
          JSON.stringify({
            applyPenalties: true,
            sendNotifications: true,
            trackOverdueOnly: false,
            testMode: false
          })
        ]
      );
    }

    // Create job
    const jobId = uuidv4();
    const now = new Date();

    // Calculate initial next run time based on cron
    // For simplicity, we'll set it to tomorrow at 3 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);

    await db.query(
      `INSERT INTO job (
        id, name, description, job_type, cron_expression, 
        execution_interval, status, priority, parameters, 
        next_run_time, created_at, updated_at, created_by,
        is_active, retry_count, max_retries, timeout_seconds, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        jobId,
        'Recurring Deposit Installment Tracking',
        'Track recurring deposit installments, update overdue information, and optionally apply penalties and send notifications',
        'recurring_deposit_installment_tracking',
        cronExpression,
        executionInterval,
        JobStatus.SCHEDULED,
        priority,
        JSON.stringify({
          applyPenalties: true,
          sendNotifications: true,
          trackOverdueOnly: false,
          testMode: false
        }),
        tomorrow,
        now,
        now,
        'system',
        true, // is_active
        0, // retry_count
        maxRetries,
        timeoutSeconds,
        1 // version
      ]
    );

    logger.info('Recurring deposit installment tracking job created', { jobId });
    return jobId;
  } catch (error) {
    logger.error('Failed to create recurring deposit installment tracking job', { error });
    throw error;
  }
}