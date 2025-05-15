/**
 * Types for loan decisioning in Fineract
 * This module provides interfaces for working with loan decisions, 
 * decision rules, and automated credit scoring
 */

import { BaseAuditModel } from './common';

/**
 * Decision result enum
 */
export enum DecisionResult {
  APPROVED = 'approved',
  CONDITIONALLY_APPROVED = 'conditionally_approved',
  DECLINED = 'declined',
  MANUAL_REVIEW = 'manual_review'
}

/**
 * Decision factor type enum
 */
export enum DecisionFactorType {
  CREDIT_SCORE = 'credit_score',
  INCOME = 'income',
  DEBT_RATIO = 'debt_ratio',
  EMPLOYMENT = 'employment',
  COLLATERAL = 'collateral',
  SAVINGS_HISTORY = 'savings_history',
  REPAYMENT_CAPACITY = 'repayment_capacity',
  CUSTOM = 'custom'
}

/**
 * Risk level enum
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Loan decision interface
 */
export interface LoanDecision extends BaseAuditModel {
  id: string;
  loanId: string;
  decisionTimestamp: Date;
  decisionResult: DecisionResult;
  decisionSource: string; // 'automated', 'manual', 'hybrid'
  decisionBy?: string; // User ID
  riskScore?: number;
  riskLevel?: RiskLevel;
  decisionFactors?: any; // JSONB in database
  notes?: string;
  approvalLevel: number;
  nextApprovalLevel?: number;
  isFinal: boolean;
  approvalConditions?: any; // JSONB in database
  expiryDate?: Date;
  manualOverride: boolean;
  overrideReason?: string;
  previousDecisionId?: string;
}

/**
 * Decisioning ruleset interface
 */
export interface DecisioningRuleset extends BaseAuditModel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  version: string;
  effectiveFromDate: Date;
  effectiveToDate?: Date;
}

/**
 * Decisioning rule interface
 */
export interface DecisioningRule extends BaseAuditModel {
  id: string;
  rulesetId: string;
  ruleName: string;
  ruleType: string; // 'eligibility', 'pricing', 'limit', etc.
  ruleDefinition: any; // JSONB in database
  ruleLogic?: string;
  actionOnTrigger: string;
  riskScoreAdjustment?: number;
  priority: number;
  isActive: boolean;
}

/**
 * Decision factor used in the decision process
 */
export interface DecisionFactor {
  type: DecisionFactorType;
  name: string;
  value: any;
  threshold?: any;
  impact: 'positive' | 'negative' | 'neutral';
  weight?: number;
  details?: string;
}

/**
 * Approval condition for conditional approvals
 */
export interface ApprovalCondition {
  id: string;
  description: string;
  type: string;
  requiredBy: Date;
  isMandatory: boolean;
  status: 'pending' | 'met' | 'waived';
  satisfiedOn?: Date;
  satisfiedBy?: string;
  notes?: string;
}

/**
 * Request body for loan application assessment
 */
export interface LoanAssessmentRequest {
  loanId: string;
  assessmentDate: string;
  includeDocumentVerification?: boolean;
  includeEmploymentVerification?: boolean;
  includeCreditCheck?: boolean;
  forceReevaluation?: boolean;
}

/**
 * Response from loan assessment
 */
export interface LoanAssessmentResponse {
  loanId: string;
  decisionId: string;
  result: DecisionResult;
  riskScore?: number;
  riskLevel?: RiskLevel;
  factors: DecisionFactor[];
  conditions?: ApprovalCondition[];
  isFinal: boolean;
  nextApprovalLevel?: number;
  assessmentDate: string;
  assessedBy?: string;
  notes?: string;
}

/**
 * Request to make a loan decision
 */
export interface MakeLoanDecisionRequest {
  loanId: string;
  decisionResult: DecisionResult;
  riskScore?: number;
  riskLevel?: RiskLevel;
  factors?: DecisionFactor[];
  conditions?: ApprovalCondition[];
  notes?: string;
  approvalLevel?: number;
  isFinal?: boolean;
  expiryDate?: string;
  manualOverride?: boolean;
  overrideReason?: string;
}

/**
 * Response from making a loan decision
 */
export interface MakeLoanDecisionResponse {
  decisionId: string;
  loanId: string;
  result: DecisionResult;
  timestamp: string;
  decisionBy: string;
  isFinal: boolean;
}

/**
 * Request to override a loan decision
 */
export interface OverrideLoanDecisionRequest {
  decisionId: string;
  newResult: DecisionResult;
  overrideReason: string;
  conditions?: ApprovalCondition[];
  notes?: string;
}

/**
 * Response from overriding a loan decision
 */
export interface OverrideLoanDecisionResponse {
  newDecisionId: string;
  previousDecisionId: string;
  loanId: string;
  result: DecisionResult;
  overrideTimestamp: string;
  overrideBy: string;
}

/**
 * Request to get decision history for a loan
 */
export interface GetLoanDecisionHistoryRequest {
  loanId: string;
  includeDetails?: boolean;
}

/**
 * Response with loan decision history
 */
export interface LoanDecisionHistoryResponse {
  loanId: string;
  decisions: LoanDecision[];
  count: number;
}

/**
 * Request to evaluate a ruleset against loan data
 */
export interface EvaluateRulesetRequest {
  rulesetId: string;
  loanData: any;
}

/**
 * Response from ruleset evaluation
 */
export interface RulesetEvaluationResponse {
  rulesetId: string;
  result: DecisionResult;
  riskScore: number;
  riskLevel: RiskLevel;
  triggeredRules: {
    ruleId: string;
    ruleName: string;
    action: string;
  }[];
  conditions?: ApprovalCondition[];
}