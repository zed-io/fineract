import { jest } from '@jest/globals';
import axios from 'axios';
import { RecurringDepositPenaltyJobWorker } from '../../../hasura/services/scheduled-jobs/src/jobs/recurringDepositPenaltyJob';
import { RecurringDepositInstallmentTrackingJobWorker } from '../../../hasura/services/scheduled-jobs/src/jobs/recurringDepositInstallmentTrackingJob';
import { JobType } from '../../../hasura/services/scheduled-jobs/src/models/job';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../../hasura/services/scheduled-jobs/src/utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })
}));

describe('RecurringDeposit Scheduled Jobs Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('RecurringDepositPenaltyJobWorker', () => {
    it('should execute the penalty job and apply penalties', async () => {
      // Create test job worker
      const jobWorker = new RecurringDepositPenaltyJobWorker();
      
      // Mock successful penalty application response
      const penaltyResponse = {
        data: {
          totalAccountsProcessed: 5,
          accountsWithPenalties: 2,
          totalPenaltiesApplied: 3,
          totalPenaltyAmount: 30,
          processedOn: '2023-02-15',
          penalties: [
            {
              accountId: 'rd-account-1',
              accountNo: 'RD00001',
              clientId: 'client-1',
              clientName: 'John Doe',
              installmentNumber: 1,
              overdueAmount: 100,
              penaltyAmount: 10,
              dueDate: '2023-01-15',
              penaltyDate: '2023-02-15'
            },
            {
              accountId: 'rd-account-1',
              accountNo: 'RD00001',
              clientId: 'client-1',
              clientName: 'John Doe',
              installmentNumber: 2,
              overdueAmount: 100,
              penaltyAmount: 10,
              dueDate: '2023-02-01',
              penaltyDate: '2023-02-15'
            },
            {
              accountId: 'rd-account-2',
              accountNo: 'RD00002',
              clientId: 'client-2',
              clientName: 'Jane Smith',
              installmentNumber: 1,
              overdueAmount: 100,
              penaltyAmount: 10,
              dueDate: '2023-01-20',
              penaltyDate: '2023-02-15'
            }
          ]
        }
      };
      
      // Mock successful notification responses
      const notificationResponses = [
        { data: { id: 'notification-1' } },
        { data: { id: 'notification-2' } }
      ];
      
      // Set up axios mock to return test responses
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('recurring-deposit-penalty/apply')) {
          return Promise.resolve(penaltyResponse);
        } else if (url.includes('notifications/send')) {
          return Promise.resolve(notificationResponses.shift());
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      
      // Create test job
      const testJob = {
        id: 'job-1',
        name: 'Recurring Deposit Penalty Application',
        jobType: JobType.CUSTOM,
        scheduleType: 'cron',
        schedule: '0 0 * * *',
        parameters: {
          asOfDate: '2023-02-15',
          notifyOnPenalty: true
        },
        status: 'pending',
        createdBy: 'system',
        createdAt: new Date()
      };
      
      // Run the job
      const result = await jobWorker.process(testJob);
      
      // Verify results
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.penaltyResults.totalPenaltiesApplied).toBe(3);
      expect(result.penaltyResults.totalPenaltyAmount).toBe(30);
      
      // Verify the API calls
      expect(mockedAxios.post).toHaveBeenCalledTimes(3); // One penalty apply, two notifications
      
      // Verify penalty apply call
      const penaltyCall = mockedAxios.post.mock.calls.find(call => 
        call[0].includes('recurring-deposit-penalty/apply')
      );
      expect(penaltyCall).toBeDefined();
      expect(penaltyCall[1].input.asOfDate).toBe('2023-02-15');
      
      // Verify notification calls
      const notificationCalls = mockedAxios.post.mock.calls.filter(call => 
        call[0].includes('notifications/send')
      );
      expect(notificationCalls.length).toBe(2); // One for each account with penalties
      
      // Verify notification data format
      expect(notificationCalls[0][1].input.notificationType).toBe('email');
      expect(notificationCalls[0][1].input.templateType).toBe('recurring_deposit_penalty_applied');
      expect(notificationCalls[0][1].input.priority).toBe('high');
    });
    
    it('should handle dry-run mode correctly', async () => {
      // Create test job worker
      const jobWorker = new RecurringDepositPenaltyJobWorker();
      
      // Create test job with dry-run flag
      const testJob = {
        id: 'job-1',
        name: 'Recurring Deposit Penalty Application',
        jobType: JobType.CUSTOM,
        scheduleType: 'cron',
        schedule: '0 0 * * *',
        parameters: {
          asOfDate: '2023-02-15',
          dryRun: true
        },
        status: 'pending',
        createdBy: 'system',
        createdAt: new Date()
      };
      
      // Run the job
      const result = await jobWorker.process(testJob);
      
      // Verify results
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.dryRun).toBe(true);
      expect(result.message).toContain('Dry run completed');
      
      // Verify no API calls were made
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      // Create test job worker
      const jobWorker = new RecurringDepositPenaltyJobWorker();
      
      // Mock API failure
      mockedAxios.post.mockRejectedValue(new Error('Service unavailable'));
      
      // Create test job
      const testJob = {
        id: 'job-1',
        name: 'Recurring Deposit Penalty Application',
        jobType: JobType.CUSTOM,
        scheduleType: 'cron',
        schedule: '0 0 * * *',
        parameters: {
          asOfDate: '2023-02-15'
        },
        status: 'pending',
        createdBy: 'system',
        createdAt: new Date()
      };
      
      // Run the job
      const result = await jobWorker.process(testJob);
      
      // Verify error handling
      expect(result).toBeDefined();
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Service unavailable');
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });
    
    it('should verify if it can handle a job', () => {
      const jobWorker = new RecurringDepositPenaltyJobWorker();
      
      // Should handle penalty jobs
      const penaltyJob = {
        id: 'job-1',
        name: 'Recurring Deposit Penalty Application',
        jobType: JobType.CUSTOM,
        status: 'pending'
      };
      expect(jobWorker.canHandle(penaltyJob)).toBe(true);
      
      // Should not handle other job types
      const otherJob = {
        id: 'job-2',
        name: 'Some Other Job',
        jobType: JobType.CUSTOM,
        status: 'pending'
      };
      expect(jobWorker.canHandle(otherJob)).toBe(false);
      
      const nonCustomJob = {
        id: 'job-3',
        name: 'Recurring Deposit Penalty Application',
        jobType: JobType.SCHEDULED,
        status: 'pending'
      };
      expect(jobWorker.canHandle(nonCustomJob)).toBe(false);
    });
  });
  
  describe('RecurringDepositInstallmentTrackingJobWorker', () => {
    it('should track installments and optionally send notifications', async () => {
      // Create test job worker
      const jobWorker = new RecurringDepositInstallmentTrackingJobWorker();
      
      // Mock successful tracking response
      const trackingResponse = {
        data: {
          totalAccountsChecked: 5,
          accountsWithOverdueInstallments: 2,
          totalOverdueInstallments: 3,
          totalOverdueAmount: 300,
          processedOn: '2023-02-15',
          accounts: [
            {
              accountId: 'rd-account-1',
              accountNo: 'RD00001',
              overdueInstallments: 2,
              totalOverdueAmount: 200,
              clientId: 'client-1',
              clientName: 'John Doe',
              lastCheckedDate: '2023-02-15',
              penaltyApplied: false
            },
            {
              accountId: 'rd-account-2',
              accountNo: 'RD00002',
              overdueInstallments: 1,
              totalOverdueAmount: 100,
              clientId: 'client-2',
              clientName: 'Jane Smith',
              lastCheckedDate: '2023-02-15',
              penaltyApplied: true,
              penaltyAmount: 10
            }
          ]
        }
      };
      
      // Mock successful notification responses
      const notificationResponses = [
        { data: { id: 'notification-1' } },
        { data: { id: 'notification-2' } }
      ];
      
      // Set up axios mock to return test responses
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('recurring-deposit/track-installments')) {
          return Promise.resolve(trackingResponse);
        } else if (url.includes('notifications/send')) {
          return Promise.resolve(notificationResponses.shift());
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      
      // Create test job with notifications enabled
      const testJob = {
        id: 'job-1',
        name: 'Recurring Deposit Installment Tracking',
        jobType: JobType.CUSTOM,
        scheduleType: 'cron',
        schedule: '0 0 * * *',
        parameters: {
          asOfDate: '2023-02-15',
          sendNotifications: true,
          applyPenalties: false
        },
        status: 'pending',
        createdBy: 'system',
        createdAt: new Date()
      };
      
      // Run the job
      const result = await jobWorker.process(testJob);
      
      // Verify results
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.trackingResults.totalAccountsChecked).toBe(5);
      expect(result.trackingResults.accountsWithOverdueInstallments).toBe(2);
      expect(result.notificationResults.sent).toBe(2);
      
      // Verify the API calls
      expect(mockedAxios.post).toHaveBeenCalledTimes(3); // One tracking, two notifications
      
      // Verify tracking call
      const trackingCall = mockedAxios.post.mock.calls.find(call => 
        call[0].includes('recurring-deposit/track-installments')
      );
      expect(trackingCall).toBeDefined();
      expect(trackingCall[1].input.asOfDate).toBe('2023-02-15');
      expect(trackingCall[1].input.applyPenalties).toBe(false);
      
      // Verify notification calls - should choose right template based on penalty status
      const notificationCalls = mockedAxios.post.mock.calls.filter(call => 
        call[0].includes('notifications/send')
      );
      expect(notificationCalls.length).toBe(2);
      
      // First account had no penalty
      expect(notificationCalls[0][1].input.templateType).toBe('recurring_deposit_overdue');
      
      // Second account had penalty
      expect(notificationCalls[1][1].input.templateType).toBe('recurring_deposit_penalty_applied');
    });
    
    it('should handle test mode for notifications', async () => {
      // Create test job worker
      const jobWorker = new RecurringDepositInstallmentTrackingJobWorker();
      
      // Mock successful tracking response
      const trackingResponse = {
        data: {
          totalAccountsChecked: 5,
          accountsWithOverdueInstallments: 1,
          totalOverdueInstallments: 1,
          totalOverdueAmount: 100,
          processedOn: '2023-02-15',
          accounts: [
            {
              accountId: 'rd-account-1',
              accountNo: 'RD00001',
              overdueInstallments: 1,
              totalOverdueAmount: 100,
              clientId: 'client-1',
              clientName: 'John Doe',
              lastCheckedDate: '2023-02-15',
              penaltyApplied: false
            }
          ]
        }
      };
      
      // Set up axios mock
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('recurring-deposit/track-installments')) {
          return Promise.resolve(trackingResponse);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      
      // Create test job with test mode enabled
      const testJob = {
        id: 'job-1',
        name: 'Recurring Deposit Installment Tracking',
        jobType: JobType.CUSTOM,
        scheduleType: 'cron',
        schedule: '0 0 * * *',
        parameters: {
          asOfDate: '2023-02-15',
          sendNotifications: true,
          testMode: true
        },
        status: 'pending',
        createdBy: 'system',
        createdAt: new Date()
      };
      
      // Run the job
      const result = await jobWorker.process(testJob);
      
      // Verify results
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.notificationResults.sent).toBe(1);
      
      // In test mode, we simulate notifications without sending them
      expect(result.notificationResults.details[0].testMode).toBe(true);
      
      // Verify only the tracking API was called, no notification API calls
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post.mock.calls[0][0]).toContain('track-installments');
    });
    
    it('should handle errors in notification sending', async () => {
      // Create test job worker
      const jobWorker = new RecurringDepositInstallmentTrackingJobWorker();
      
      // Mock successful tracking response
      const trackingResponse = {
        data: {
          totalAccountsChecked: 5,
          accountsWithOverdueInstallments: 1,
          totalOverdueInstallments: 1,
          totalOverdueAmount: 100,
          processedOn: '2023-02-15',
          accounts: [
            {
              accountId: 'rd-account-1',
              accountNo: 'RD00001',
              overdueInstallments: 1,
              totalOverdueAmount: 100,
              clientId: 'client-1',
              clientName: 'John Doe',
              lastCheckedDate: '2023-02-15',
              penaltyApplied: false
            }
          ]
        }
      };
      
      // Set up axios mock - tracking succeeds but notification fails
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('recurring-deposit/track-installments')) {
          return Promise.resolve(trackingResponse);
        } else if (url.includes('notifications/send')) {
          return Promise.reject(new Error('Notification service unavailable'));
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      
      // Create test job
      const testJob = {
        id: 'job-1',
        name: 'Recurring Deposit Installment Tracking',
        jobType: JobType.CUSTOM,
        scheduleType: 'cron',
        schedule: '0 0 * * *',
        parameters: {
          asOfDate: '2023-02-15',
          sendNotifications: true
        },
        status: 'pending',
        createdBy: 'system',
        createdAt: new Date()
      };
      
      // Run the job
      const result = await jobWorker.process(testJob);
      
      // Verify results - job should complete even if notifications fail
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      
      // Notification should be marked as failed
      expect(result.notificationResults.details[0].success).toBe(false);
      expect(result.notificationResults.details[0].error).toBe('Notification service unavailable');
      
      // Both API calls should have been attempted
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
    
    it('should verify if it can handle a job', () => {
      const jobWorker = new RecurringDepositInstallmentTrackingJobWorker();
      
      // Should handle tracking jobs
      const trackingJob = {
        id: 'job-1',
        name: 'Recurring Deposit Installment Tracking',
        jobType: JobType.CUSTOM,
        status: 'pending'
      };
      expect(jobWorker.canHandle(trackingJob)).toBe(true);
      
      // Should not handle other job types
      const otherJob = {
        id: 'job-2',
        name: 'Some Other Job',
        jobType: JobType.CUSTOM,
        status: 'pending'
      };
      expect(jobWorker.canHandle(otherJob)).toBe(false);
    });
  });
});