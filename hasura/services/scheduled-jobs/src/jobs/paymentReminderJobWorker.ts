/**
 * Payment Reminder Job Worker
 * Processes payment reminders for loans and recurring deposits
 */

import { JobWorker, Job, JobType } from '../models/job';
import { Pool } from 'pg';
import { db } from '../utils/db';
import { createContextLogger } from '../utils/logger';
import { ActionServiceClient } from '../utils/actionServiceClient';
import { runPaymentReminderJob } from './paymentReminderJob';

// Create logger
const logger = createContextLogger('PaymentReminderJobWorker');

// Create DB pool
const pool = db.getPool();

// Create Action Service client
const actionServiceClient = new ActionServiceClient(
  process.env.ACTIONS_SERVICE_URL || 'http://actions-server:3000'
);

/**
 * Worker implementation for payment reminder jobs
 */
export class PaymentReminderJobWorker implements JobWorker {
  /**
   * Get the job type this worker handles
   */
  getJobType(): JobType {
    return 'payment_reminder_processing' as JobType;
  }
  
  /**
   * Process a payment reminder job
   * @param job The job to process
   * @param parameters Optional parameters to override job parameters
   */
  async process(job: Job, parameters?: any): Promise<any> {
    logger.info('Processing payment reminder job', {
      jobId: job.id,
      jobName: job.name
    });
    
    // Merge job parameters with override parameters
    const jobConfig = {
      ...job,
      parameters: { ...job.parameters, ...(parameters || {}) }
    };
    
    // Run payment reminder job
    return await runPaymentReminderJob(pool, jobConfig, actionServiceClient);
  }
}

export default PaymentReminderJobWorker;