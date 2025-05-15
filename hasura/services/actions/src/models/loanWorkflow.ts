/**
 * Types for loan application workflow in Fineract
 * This module provides interfaces for tracking loan applications
 * through various stages of the approval process
 */

import { BaseAuditModel } from './common';

/**
 * Workflow stage enum
 */
export enum WorkflowStage {
  APPLICATION = 'application',
  DOCUMENT_VERIFICATION = 'document_verification',
  CREDIT_CHECK = 'credit_check',
  EMPLOYMENT_VERIFICATION = 'employment_verification',
  DECISIONING = 'decisioning',
  COMMITTEE_REVIEW = 'committee_review',
  APPROVAL = 'approval',
  DISBURSEMENT = 'disbursement',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  CLOSED = 'closed'
}

/**
 * Workflow status enum
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

/**
 * Loan application workflow interface
 */
export interface LoanApplicationWorkflow extends BaseAuditModel {
  id: string;
  loanId: string;
  currentStage: WorkflowStage | string;
  stageStartDate: Date;
  stageEndDate?: Date;
  stageStatus: WorkflowStatus;
  assignedTo?: string;
  assignedDate?: Date;
  notes?: string;
  dueDate?: Date;
  isOverdue: boolean;
}

/**
 * Loan audit interface
 */
export interface LoanAudit {
  id: string;
  loanId: string;
  actionType: string;
  actionTimestamp: Date;
  performedBy?: string;
  changes: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Request to update workflow stage
 */
export interface UpdateWorkflowStageRequest {
  loanId: string;
  newStage: WorkflowStage | string;
  notes?: string;
  assignTo?: string;
  dueDate?: string;
}

/**
 * Response from workflow stage update
 */
export interface UpdateWorkflowStageResponse {
  workflowId: string;
  loanId: string;
  previousStage: WorkflowStage | string;
  newStage: WorkflowStage | string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Request to assign workflow to staff
 */
export interface AssignWorkflowRequest {
  workflowId: string;
  assignTo: string;
  notes?: string;
  dueDate?: string;
}

/**
 * Response from workflow assignment
 */
export interface AssignWorkflowResponse {
  workflowId: string;
  loanId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
}

/**
 * Request to get workflow history
 */
export interface GetWorkflowHistoryRequest {
  loanId: string;
  includeNotes?: boolean;
  includePending?: boolean;
}

/**
 * Response with workflow history
 */
export interface WorkflowHistoryResponse {
  loanId: string;
  currentStage: WorkflowStage | string;
  currentStatus: WorkflowStatus;
  assignedTo?: string;
  dueDate?: string;
  isOverdue: boolean;
  stages: {
    stage: WorkflowStage | string;
    startDate: string;
    endDate?: string;
    status: WorkflowStatus;
    duration?: number; // in minutes
    assignedTo?: string;
    notes?: string;
  }[];
}

/**
 * Request to get audit trail
 */
export interface GetAuditTrailRequest {
  loanId: string;
  startDate?: string;
  endDate?: string;
  actionTypes?: string[];
  performedBy?: string;
}

/**
 * Response with audit trail
 */
export interface AuditTrailResponse {
  loanId: string;
  auditEntries: LoanAudit[];
  count: number;
}

/**
 * Task item for workflow dashboard
 */
export interface WorkflowTask {
  workflowId: string;
  loanId: string;
  customerName: string;
  loanAmount: number;
  currency: string;
  productName: string;
  stage: WorkflowStage | string;
  status: WorkflowStatus;
  assignedTo?: string;
  dueDate?: string;
  isOverdue: boolean;
  daysInStage: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Request to search workflow tasks
 */
export interface SearchWorkflowTasksRequest {
  stage?: WorkflowStage | string;
  status?: WorkflowStatus;
  assignedTo?: string;
  isOverdue?: boolean;
  dueFrom?: string;
  dueTo?: string;
  loanProductId?: string;
  minAmount?: number;
  maxAmount?: number;
  customerName?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Response with workflow tasks
 */
export interface WorkflowTasksResponse {
  tasks: WorkflowTask[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}