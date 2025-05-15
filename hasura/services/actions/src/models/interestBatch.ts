/**
 * Models for interest batch processing
 */
import { v4 as uuidv4 } from 'uuid';

export interface InterestBatchConfig {
  id: string;
  jobType: string;
  batchSize: number;
  maxRetries: number;
  retryIntervalMinutes: number;
  timeoutSeconds: number;
  parallelThreads: number;
  enabled: boolean;
  description?: string;
  accountTypes: string[];
  parameters?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterestBatchExecution {
  id: string;
  jobType: string;
  startedAt: Date;
  completedAt?: Date;
  status: BatchExecutionStatus;
  totalAccounts: number;
  processedAccounts: number;
  successfulAccounts: number;
  failedAccounts: number;
  executionTimeMs?: number;
  batchParameters?: any;
  errorDetails?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterestBatchAccountResult {
  id: string;
  batchExecutionId: string;
  accountId: string;
  accountNumber?: string;
  accountType: string;
  interestCalculated?: number;
  interestPosted?: number;
  taxAmount?: number;
  processingTimeMs?: number;
  status: BatchAccountResultStatus;
  errorMessage?: string;
  errorDetails?: any;
  createdAt: Date;
}

export interface InterestBatchAccountStatus {
  id: string;
  accountId: string;
  accountType: string;
  accountNumber?: string;
  lastAccrualDate?: Date;
  lastPostingDate?: Date;
  nextPostingDate?: Date;
  accrualFrequency: string;
  postingFrequency?: string;
  status: string;
  errorCount: number;
  lastErrorMessage?: string;
  lastSuccessfulRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterestBatchSummary {
  totalAccountsProcessedToday: number;
  totalInterestPostedToday: number;
  failedAccountsToday: number;
  avgProcessingTimeMs?: number;
  lastCompletedRun?: InterestBatchExecution;
  currentRunningJobs: number;
  jobConfigurations: InterestBatchConfig[];
}

export enum BatchExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum BatchAccountResultStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export enum InterestBatchJobType {
  DAILY_INTEREST_ACCRUAL = 'daily_interest_accrual',
  INTEREST_POSTING = 'interest_posting'
}

export enum AccountType {
  SAVINGS = 'SAVINGS',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  RECURRING_DEPOSIT = 'RECURRING_DEPOSIT'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  CLOSED = 'CLOSED'
}

export enum AccrualFrequency {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY'
}

export enum PostingFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUAL = 'BIANNUAL',
  ANNUAL = 'ANNUAL'
}

export interface InterestCalculationResult {
  accountId: string;
  interestCalculated: number;
  calculationDate: Date;
  fromDate: Date;
  toDate: Date;
  success: boolean;
  errorMessage?: string;
}

export interface InterestPostingResult {
  accountId: string;
  interestPosted: number;
  taxAmount: number;
  postingDate: Date;
  fromDate: Date;
  toDate: Date;
  success: boolean;
  errorMessage?: string;
}

// Helper functions
export function createNewBatchExecution(jobType: string, batchParameters?: any): InterestBatchExecution {
  return {
    id: uuidv4(),
    jobType,
    startedAt: new Date(),
    status: BatchExecutionStatus.RUNNING,
    totalAccounts: 0,
    processedAccounts: 0,
    successfulAccounts: 0,
    failedAccounts: 0,
    batchParameters,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createBatchAccountResult(
  batchExecutionId: string,
  accountId: string,
  accountType: string,
  accountNumber?: string
): InterestBatchAccountResult {
  return {
    id: uuidv4(),
    batchExecutionId,
    accountId,
    accountType,
    accountNumber,
    status: BatchAccountResultStatus.SKIPPED,
    createdAt: new Date()
  };
}