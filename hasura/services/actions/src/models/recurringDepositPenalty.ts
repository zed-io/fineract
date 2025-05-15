/**
 * Recurring Deposit Penalty models for Fineract
 */

/**
 * Deposit penalty type
 */
export enum DepositPenaltyType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage'
}

/**
 * Recurring Deposit Penalty Config
 */
export interface RecurringDepositPenaltyConfig {
  id?: string;
  productId: string;
  isPenaltyEnabled: boolean;
  penaltyType: DepositPenaltyType;
  penaltyAmount: number;
  gracePeriodDays: number;
  maxPenaltyOccurrences: number;
  advancedPenaltyConfig?: any;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Tiered Penalty
 */
export interface RecurringDepositTieredPenalty {
  id?: string;
  configId: string;
  tierNumber: number;
  daysOverdueStart: number;
  daysOverdueEnd?: number;
  occurrencesStart: number;
  occurrencesEnd?: number;
  penaltyType: DepositPenaltyType;
  penaltyAmount: number;
  maxPenaltyAmount?: number;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Penalty History
 */
export interface RecurringDepositPenaltyHistory {
  id?: string;
  accountId: string;
  savingsAccountChargeId: string;
  installmentId: string;
  installmentNumber: number;
  dueDate: Date;
  penaltyDate: Date;
  daysOverdue: number;
  missedOccurrences: number;
  penaltyType: DepositPenaltyType;
  penaltyAmount: number;
  isWaived: boolean;
  waivedDate?: Date;
  waivedBy?: string;
  waiverReason?: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Penalty Config Create/Update Request
 */
export interface RecurringDepositPenaltyConfigRequest {
  productId: string;
  isPenaltyEnabled: boolean;
  penaltyType: string;
  penaltyAmount: number;
  gracePeriodDays: number;
  maxPenaltyOccurrences: number;
  tieredPenalties?: RecurringDepositTieredPenaltyRequest[];
}

/**
 * Recurring Deposit Tiered Penalty Request
 */
export interface RecurringDepositTieredPenaltyRequest {
  tierNumber: number;
  daysOverdueStart: number;
  daysOverdueEnd?: number;
  occurrencesStart: number;
  occurrencesEnd?: number;
  penaltyType: string;
  penaltyAmount: number;
  maxPenaltyAmount?: number;
}

/**
 * Recurring Deposit Penalty Waiver Request
 */
export interface RecurringDepositPenaltyWaiverRequest {
  penaltyId: string;
  waiverReason: string;
  waiveDate: string;
}

/**
 * Penalty application result for a single account installment
 */
export interface PenaltyApplicationResult {
  accountId: string;
  accountNo: string;
  installmentNumber: number;
  overdueAmount: number;
  penaltyAmount: number;
  dueDate: string;
  penaltyDate: string;
  chargeId?: string;
  transactionId?: string;
  penaltyHistoryId?: string;
  daysOverdue: number;
  missedOccurrences: number;
  penaltyType: string;
  tierApplied?: number;
}

/**
 * Penalty application summary for all accounts
 */
export interface PenaltyApplicationSummary {
  totalAccountsProcessed: number;
  accountsWithPenalties: number;
  totalPenaltiesApplied: number;
  totalPenaltyAmount: number;
  processedOn: string;
  penalties: PenaltyApplicationResult[];
}

/**
 * Penalty configuration response
 */
export interface PenaltyConfigResponse {
  id: string;
  productId: string;
  productName: string;
  isPenaltyEnabled: boolean;
  penaltyType: string;
  penaltyAmount: number;
  gracePeriodDays: number;
  maxPenaltyOccurrences: number;
  tieredPenalties: TieredPenaltyResponse[];
}

/**
 * Tiered penalty response
 */
export interface TieredPenaltyResponse {
  id: string;
  tierNumber: number;
  daysOverdueStart: number;
  daysOverdueEnd?: number;
  occurrencesStart: number;
  occurrencesEnd?: number;
  penaltyType: string;
  penaltyAmount: number;
  maxPenaltyAmount?: number;
}

/**
 * Penalty history response
 */
export interface PenaltyHistoryResponse {
  id: string;
  accountId: string;
  accountNo: string;
  clientId?: string;
  clientName?: string;
  installmentNumber: number;
  dueDate: string;
  penaltyDate: string;
  daysOverdue: number;
  missedOccurrences: number;
  penaltyType: string;
  penaltyAmount: number;
  isWaived: boolean;
  waivedDate?: string;
  waivedByUsername?: string;
  waiverReason?: string;
}

/**
 * Penalty history search criteria
 */
export interface PenaltyHistorySearchCriteria {
  accountId?: string;
  clientId?: string;
  fromDate?: string;
  toDate?: string;
  isWaived?: boolean;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}