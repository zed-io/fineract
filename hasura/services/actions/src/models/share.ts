/**
 * Share Account Domain Models
 * 
 * These models represent the share account domain entities including:
 * - Share products and product settings
 * - Share accounts and their status
 * - Share transactions and purchase requests
 * - Dividends and charges
 */

import { Money } from './money';

/**
 * Share Product model
 */
export interface ShareProduct {
  id?: string;
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  currencyDigits: number;
  currencyMultiplesOf?: number;
  externalId?: string;
  
  totalShares: number;
  issuedShares: number;
  totalSharesToBeIssued: number;
  nominalPrice: number;
  marketPrice?: number;
  
  shareCapitalType: ShareCapitalType;
  shareValueCalculationType: ShareValueCalculationType;
  
  allowDividendsForInactiveClients: boolean;
  lockinPeriod?: number;
  lockinPeriodType?: string;
  
  minimumShares?: number;
  nominateSharesDefault?: number;
  maximumShares?: number;
  
  accountingRule: string;
  
  isActive: boolean;
  
  charges?: ShareProductCharge[];
  marketPrices?: ShareProductMarketPrice[];
}

/**
 * Share Product creation request
 */
export interface ShareProductCreateRequest {
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  currencyDigits?: number;
  currencyMultiplesOf?: number;
  externalId?: string;
  
  totalShares: number;
  totalSharesToBeIssued: number;
  nominalPrice: number;
  marketPrice?: number;
  
  shareCapitalType?: ShareCapitalType;
  shareValueCalculationType?: ShareValueCalculationType;
  
  allowDividendsForInactiveClients?: boolean;
  lockinPeriod?: number;
  lockinPeriodType?: string;
  
  minimumShares?: number;
  nominateSharesDefault?: number;
  maximumShares?: number;
  
  accountingRule: string;
  
  charges?: string[];
  marketPrices?: ShareProductMarketPriceInput[];
}

/**
 * Share Product charge
 */
export interface ShareProductCharge {
  id?: string;
  productId: string;
  chargeId: string;
  chargeName?: string;
  chargeType?: string;
  chargeCalculationType?: string;
  chargeTimeType?: string;
  amount?: number;
}

/**
 * Share Product market price
 */
export interface ShareProductMarketPrice {
  id?: string;
  productId: string;
  fromDate: string;
  price: number;
}

/**
 * Share Product market price input
 */
export interface ShareProductMarketPriceInput {
  fromDate: string;
  price: number;
}

/**
 * Share Product dividend
 */
export interface ShareProductDividend {
  id?: string;
  productId: string;
  dividendPeriodStartDate: string;
  dividendPeriodEndDate: string;
  dividendAmount: number;
  status: string;
}

/**
 * Share Account model
 */
export interface ShareAccount {
  id?: string;
  accountNo: string;
  externalId?: string;
  clientId?: string;
  clientName?: string;
  groupId?: string;
  groupName?: string;
  productId: string;
  productName?: string;
  fieldOfficerId?: string;
  fieldOfficerName?: string;
  officeId: string;
  officeName?: string;
  
  status: ShareAccountStatus;
  
  submittedDate: string;
  submittedByUsername?: string;
  submittedByFirstname?: string;
  submittedByLastname?: string;
  
  approvedDate?: string;
  approvedByUsername?: string;
  approvedByFirstname?: string;
  approvedByLastname?: string;
  
  rejectedDate?: string;
  rejectedByUsername?: string;
  rejectedByFirstname?: string;
  rejectedByLastname?: string;
  
  activatedDate?: string;
  activatedByUsername?: string;
  activatedByFirstname?: string;
  activatedByLastname?: string;
  
  closedDate?: string;
  closedByUsername?: string;
  closedByFirstname?: string;
  closedByLastname?: string;
  
  totalApprovedShares: number;
  totalPendingShares: number;
  
  lockinPeriod?: number;
  lockinPeriodType?: string;
  
  isDividendPosted: boolean;
  
  currency?: Money;
  summary?: ShareAccountSummary;
  charges?: ShareAccountCharge[];
  purchaseRequests?: SharePurchaseRequest[];
  transactions?: ShareAccountTransaction[];
  dividends?: ShareAccountDividend[];
}

/**
 * Share Account creation request
 */
export interface ShareAccountCreateRequest {
  clientId?: string;
  groupId?: string;
  productId: string;
  submittedDate: string;
  externalId?: string;
  savingsAccountId?: string;
  applicationDate?: string;
  fieldOfficerId?: string;
  
  requestedShares: number;
  
  lockinPeriod?: number;
  lockinPeriodFrequencyType?: string;
  
  charges?: ShareAccountChargeInput[];
  
  dateFormat?: string;
  locale?: string;
}

/**
 * Share Account summary
 */
export interface ShareAccountSummary {
  totalApprovedShares: number;
  totalPendingShares: number;
  totalRejectedShares: number;
  totalActive: number;
  
  totalShareValue: number;
  
  totalDividends?: number;
  totalCharges?: number;
}

/**
 * Share Account charge
 */
export interface ShareAccountCharge {
  id?: string;
  accountId: string;
  chargeId: string;
  chargeName?: string;
  chargeTimeType?: string;
  chargeCalculationType?: string;
  
  amount: number;
  amountPaid: number;
  amountWaived: number;
  amountOutstanding: number;
  
  isPaid: boolean;
  isWaived: boolean;
  isActive: boolean;
  isPenalty: boolean;
  
  dueDate?: string;
}

/**
 * Share Account charge input
 */
export interface ShareAccountChargeInput {
  chargeId: string;
  amount: number;
  dueDate?: string;
}

/**
 * Share Purchase Request
 */
export interface SharePurchaseRequest {
  id?: string;
  accountId: string;
  requestDate: string;
  requestedShares: number;
  status: SharePurchaseRequestStatus;
  
  requestedDate: string;
  requestedByUsername?: string;
  requestedByFirstname?: string;
  requestedByLastname?: string;
  
  processedDate?: string;
  processedByUsername?: string;
  processedByFirstname?: string;
  processedByLastname?: string;
}

/**
 * Share Account transaction
 */
export interface ShareAccountTransaction {
  id?: string;
  accountId: string;
  purchaseRequestId?: string;
  
  transactionDate: string;
  transactionType: ShareTransactionType;
  sharesQuantity: number;
  unitPrice: number;
  totalAmount: number;
  
  chargedAmount: number;
  
  isReversed: boolean;
}

/**
 * Share Account dividend
 */
export interface ShareAccountDividend {
  id?: string;
  accountId: string;
  dividendPayOutId: string;
  
  amount: number;
  status: ShareDividendStatus;
  
  processedDate?: string;
  
  savingsTransactionId?: string;
}

/**
 * Share Account approval request
 */
export interface ShareAccountApprovalRequest {
  approvedDate: string;
  approvedShares: number;
  note?: string;
}

/**
 * Share Account reject request
 */
export interface ShareAccountRejectRequest {
  rejectedDate: string;
  note?: string;
}

/**
 * Share Account activate request
 */
export interface ShareAccountActivateRequest {
  activatedDate: string;
  note?: string;
}

/**
 * Share Account close request
 */
export interface ShareAccountCloseRequest {
  closedDate: string;
  note?: string;
}

/**
 * Share Purchase request
 */
export interface SharePurchaseSubmitRequest {
  requestedDate: string;
  requestedShares: number;
}

/**
 * Share Purchase approval request
 */
export interface SharePurchaseApprovalRequest {
  purchaseRequestId: string;
  processedDate: string;
  approvedShares: number;
}

/**
 * Share Purchase rejection request
 */
export interface SharePurchaseRejectRequest {
  purchaseRequestId: string;
  processedDate: string;
  note?: string;
}

/**
 * Share Redeem request
 */
export interface ShareRedeemRequest {
  transactionDate: string;
  sharesQuantity: number;
}

/**
 * Share Product dividend declaration request
 */
export interface ShareProductDividendDeclareRequest {
  dividendPeriodStartDate: string;
  dividendPeriodEndDate: string;
  dividendAmount: number;
}

/**
 * Share Account dividend processing request
 */
export interface ShareAccountDividendProcessRequest {
  dividendPayOutId: string;
  savingsAccountId?: string;
}

/**
 * Request response types
 */
export interface ShareProductResponse {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  externalId?: string;
  
  totalShares: number;
  issuedShares: number;
  totalSharesToBeIssued: number;
  nominalPrice: number;
  marketPrice?: number;
  
  shareCapitalType: ShareCapitalType;
  shareValueCalculationType: ShareValueCalculationType;
  
  allowDividendsForInactiveClients: boolean;
  lockinPeriod?: number;
  lockinPeriodType?: string;
  
  minimumShares?: number;
  nominateSharesDefault?: number;
  maximumShares?: number;
  
  accountingRule: string;
  
  isActive: boolean;
  
  charges: ShareProductCharge[];
  marketPrices: ShareProductMarketPrice[];
  
  currency: Money;
}

export interface ShareProductsResponse {
  products: ShareProductResponse[];
}

export interface ShareProductCreateResponse {
  productId: string;
}

export interface ShareAccountResponse extends ShareAccount {}

export interface ShareAccountCreateResponse {
  accountId: string;
}

export interface ShareAccountsResponse {
  accounts: ShareAccountResponse[];
}

export interface ShareAccountApprovalResponse {
  accountId: string;
  approvedDate: string;
  approvedShares: number;
}

export interface ShareAccountRejectResponse {
  accountId: string;
  rejectedDate: string;
}

export interface ShareAccountActivateResponse {
  accountId: string;
  activatedDate: string;
}

export interface ShareAccountCloseResponse {
  accountId: string;
  closedDate: string;
}

export interface SharePurchaseSubmitResponse {
  accountId: string;
  purchaseRequestId: string;
  requestedDate: string;
  requestedShares: number;
}

export interface SharePurchaseApprovalResponse {
  accountId: string;
  purchaseRequestId: string;
  processedDate: string;
  approvedShares: number;
  transactionId: string;
}

export interface SharePurchaseRejectResponse {
  accountId: string;
  purchaseRequestId: string;
  processedDate: string;
}

export interface ShareRedeemResponse {
  accountId: string;
  transactionId: string;
  transactionDate: string;
  sharesQuantity: number;
  totalAmount: number;
}

export interface ShareProductDividendDeclareResponse {
  productId: string;
  dividendId: string;
  dividendPeriodStartDate: string;
  dividendPeriodEndDate: string;
  dividendAmount: number;
}

export interface ShareAccountDividendProcessResponse {
  accountId: string;
  dividendId: string;
  processedDate: string;
  amount: number;
  savingsTransactionId?: string;
}

export interface ShareTemplateResponse {
  productOptions: ShareProductTemplateOption[];
  chargeOptions: ChargeTemplateOption[];
  savingsAccountOptions: SavingsAccountOption[];
}

export interface ShareProductTemplateOption {
  id: string;
  name: string;
  shortName: string;
  totalShares: number;
  totalSharesToBeIssued: number;
  nominalPrice: number;
  marketPrice?: number;
  currency: Money;
}

export interface ChargeTemplateOption {
  id: string;
  name: string;
  active: boolean;
  chargeTimeType: string;
  chargeCalculationType: string;
  currencyCode: string;
  amount: number;
}

export interface SavingsAccountOption {
  id: string;
  accountNo: string;
  productName: string;
  status: string;
}

/**
 * Enum types
 */
export enum ShareCapitalType {
  PAID_UP = 'paid_up',
  AUTHORIZED = 'authorized'
}

export enum ShareValueCalculationType {
  NOMINAL = 'nominal',
  MARKET = 'market'
}

export enum ShareAccountStatus {
  SUBMITTED_AND_PENDING_APPROVAL = 'submitted_and_pending_approval',
  APPROVED = 'approved',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  CLOSED = 'closed'
}

export enum SharePurchaseRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum ShareTransactionType {
  PURCHASE = 'purchase',
  REDEEM = 'redeem',
  APPROVE = 'approve',
  REJECT = 'reject',
  CHARGE_PAYMENT = 'charge_payment',
  DIVIDEND_PAYMENT = 'dividend_payment',
  INTEREST_PAYMENT = 'interest_payment'
}

export enum ShareDividendStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  REJECTED = 'rejected'
}