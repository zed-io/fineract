/**
 * Scheduled Jobs Service
 * 
 * This service manages scheduled jobs for the Fineract Hasura integration,
 * including job registration, scheduling, and execution.
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { JobManager, Job, JobType, JobStatus, JobExecutionInterval, JobPriority } from './models/job';
import { createJobManager } from './managers/jobManager';
import { RecurringDepositInstallmentTrackingJobWorker } from './jobs/recurringDepositInstallmentTrackingJob';
import { RecurringDepositReminderJobWorker } from './jobs/recurringDepositReminderJob';
import { RecurringDepositInterestCalculationJobWorker } from './jobs/recurringDepositInterestCalculationJob';
import { RecurringDepositMaturityJobWorker } from './jobs/recurringDepositMaturityJob';
import { RecurringDepositStatementJobWorker } from './jobs/recurringDepositStatementJob';
import { RecurringDepositMetricsJobWorker } from './jobs/recurringDepositMetricsJob';
import { RecurringDepositPrematureClosureNotificationJobWorker } from './jobs/recurringDepositPrematureClosureNotificationJob';
import { FixedDepositMaturityNotificationJobWorker } from './jobs/fixedDepositMaturityNotificationJob';
import { PaymentReminderJobWorker } from './jobs/paymentReminderJobWorker';
import { createRecurringDepositInterestCalculationJob } from './jobs/createRecurringDepositInterestCalculationJob';
import { createRecurringDepositMaturityJob } from './jobs/createRecurringDepositMaturityJob';
import { createRecurringDepositStatementJob } from './jobs/createRecurringDepositStatementJob';
import { createRecurringDepositMetricsJob } from './jobs/createRecurringDepositMetricsJob';
import { createRecurringDepositPrematureClosureNotificationJob } from './jobs/createRecurringDepositPrematureClosureNotificationJob';
import { createRecurringDepositInstallmentTrackingJob } from './jobs/createRecurringDepositInstallmentTrackingJob';
import { createFixedDepositMaturityNotificationJob } from './jobs/createFixedDepositMaturityNotificationJob';
import { createPaymentReminderJob } from './jobs/createPaymentReminderJob';
import { createContextLogger } from './utils/logger';

// Create logger
const logger = createContextLogger('ScheduledJobsService');

// Create job manager
const jobManager = createJobManager();

// Register job workers
jobManager.registerWorker(new RecurringDepositInstallmentTrackingJobWorker());
jobManager.registerWorker(new RecurringDepositReminderJobWorker());
jobManager.registerWorker(new RecurringDepositInterestCalculationJobWorker());
jobManager.registerWorker(new RecurringDepositMaturityJobWorker());
jobManager.registerWorker(new RecurringDepositStatementJobWorker());
jobManager.registerWorker(new RecurringDepositMetricsJobWorker());
jobManager.registerWorker(new RecurringDepositPrematureClosureNotificationJobWorker());
jobManager.registerWorker(new FixedDepositMaturityNotificationJobWorker());
jobManager.registerWorker(new PaymentReminderJobWorker());


// Create recurring deposit reminder job
async function createRecurringDepositReminderJob() {
  try {
    // Check if job already exists
    const existingJobs = await jobManager.getAllJobs();
    const existingJob = existingJobs.find(j => j.name === 'Recurring Deposit Reminder');
    
    if (existingJob) {
      logger.info('Recurring deposit reminder job already exists', { jobId: existingJob.id });
      return;
    }
    
    logger.info('Creating recurring deposit reminder job');
    
    const job: Job = {
      id: undefined,
      name: 'Recurring Deposit Reminder',
      description: 'Sends reminders for upcoming recurring deposit installments',
      jobType: JobType.CUSTOM,
      cronExpression: '0 8 * * *', // Run at 8 AM every day
      executionInterval: JobExecutionInterval.DAILY,
      status: JobStatus.SCHEDULED,
      priority: JobPriority.MEDIUM,
      parameters: {
        daysInAdvance: 3, // Send reminders 3 days before due date
        notificationTypes: ['email', 'sms'], // Send both email and SMS
        testMode: false // Set to true for testing
      },
      nextRunTime: new Date(Date.now() + 7 * 60000), // Start in 7 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      retryCount: 0,
      maxRetries: 2,
      timeoutSeconds: 600, // 10 minutes timeout
      version: 1
    };
    
    const createdJob = await jobManager.scheduleJob(job);
    logger.info('Created recurring deposit reminder job', { jobId: createdJob.id });
  } catch (error) {
    logger.error('Failed to create recurring deposit reminder job:', error);
  }
}

// Initialize API server
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scheduled-jobs', timestamp: new Date().toISOString() });
});

// Jobs API endpoints
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await jobManager.getAllJobs();
    res.json(jobs);
  } catch (error) {
    logger.error('Failed to get jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    logger.error(`Failed to get job ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

app.post('/api/jobs/execute/:id', async (req, res) => {
  try {
    const job = await jobManager.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Execute job with optional override parameters
    const result = await jobManager.executeJob({
      ...job,
      parameters: {
        ...job.parameters,
        ...(req.body.parameters || {})
      }
    });
    
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Failed to execute job ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to execute job', message: error.message });
  }
});

app.post('/api/jobs/:id/pause', async (req, res) => {
  try {
    const success = await jobManager.pauseJob(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Job not found or could not be paused' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error(`Failed to pause job ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to pause job' });
  }
});

app.post('/api/jobs/:id/resume', async (req, res) => {
  try {
    const success = await jobManager.resumeJob(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Job not found or could not be resumed' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error(`Failed to resume job ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to resume job' });
  }
});

app.get('/api/jobs/:id/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await jobManager.getJobExecutionHistory(req.params.id, limit);
    res.json(history);
  } catch (error) {
    logger.error(`Failed to get job history for ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get job history' });
  }
});

// Initialize the service
async function initialize() {
  try {
    logger.info('Initializing scheduled jobs service');
    
    // Initialize job manager
    await jobManager.initialize();
    
    // Create standard jobs
    await createRecurringDepositInstallmentTrackingJob();
    await createRecurringDepositReminderJob();
    await createRecurringDepositInterestCalculationJob(jobManager);
    await createRecurringDepositMaturityJob(jobManager);
    await createRecurringDepositStatementJob(jobManager);
    await createRecurringDepositMetricsJob(jobManager);
    await createRecurringDepositPrematureClosureNotificationJob(jobManager);
    await createFixedDepositMaturityNotificationJob(jobManager);
    await createPaymentReminderJob(jobManager);
    
    // Start API server
    const port = process.env.PORT || 3100;
    app.listen(port, () => {
      logger.info(`Scheduled jobs service listening on port ${port}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to initialize scheduled jobs service:', error);
    process.exit(1);
  }
}

// Shutdown function
async function shutdown() {
  logger.info('Shutting down scheduled jobs service');
  try {
    await jobManager.shutdown();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the service
initialize();