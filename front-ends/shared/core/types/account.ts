import { BaseEntity, ID, Status } from './common';

export enum AccountType {
  LOAN = 'loan',
  SAVINGS = 'savings',
  SHARES = 'shares',
  FIXED_DEPOSIT = 'fixed_deposit',
  RECURRING_DEPOSIT = 'recurring_deposit',
}

export enum SavingsAccountType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
  JLG = 'jlg',
}

export enum SavingsStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  ACTIVE = 'active',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum InterestCompoundingPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
}

export enum InterestPostingPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  BIANNUAL = 'biannual',
  ANNUAL = 'annual',
}

export interface SavingsProduct extends BaseEntity {
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  currencyDigits?: number;
  currencyMultiple?: number;
  
  nominalAnnualInterestRate: number;
  interestCompoundingPeriodType: InterestCompoundingPeriod;
  interestPostingPeriodType: InterestPostingPeriod;
  interestCalculationType: string;
  interestCalculationDaysInYearType: string;
  
  minRequiredOpeningBalance?: number;
  lockinPeriodFrequency?: number;
  lockinPeriodFrequencyType?: string;
  withdrawalFeeForTransfers?: boolean;
  allowOverdraft?: boolean;
  overdraftLimit?: number;
  
  withHoldTax?: boolean;
  taxGroupId?: number;
  taxGroupName?: string;
  
  // Accounting
  accountingRule: string;
  accountingMappings?: any;
}

export interface SavingsAccount extends BaseEntity {
  accountNo: string;
  externalId?: string;
  clientId: ID;
  clientName?: string;
  savingsProductId: ID;
  savingsProductName?: string;
  fieldOfficerId?: ID;
  status: SavingsStatus;
  
  accountType: SavingsAccountType;
  depositType?: string;
  submittedOnDate: Date | string;
  approvedOnDate?: Date | string;
  rejectedOnDate?: Date | string;
  withdrawnOnDate?: Date | string;
  activatedOnDate?: Date | string;
  closedOnDate?: Date | string;
  
  currency: {
    code: string;
    name?: string;
    decimalPlaces?: number;
    inMultiplesOf?: number;
    displaySymbol?: string;
    nameCode?: string;
    displayLabel?: string;
  };
  
  nominalAnnualInterestRate: number;
  interestCompoundingPeriodType: InterestCompoundingPeriod;
  interestPostingPeriodType: InterestPostingPeriod;
  interestCalculationType: string;
  interestCalculationDaysInYearType: string;
  
  minRequiredOpeningBalance?: number;
  minRequiredBalance?: number;
  enforceMinRequiredBalance?: boolean;
  maxAllowedBalance?: number;
  
  summary?: {
    accountBalance?: number;
    availableBalance?: number;
    interestEarned?: number;
    totalDeposits?: number;
    totalWithdrawals?: number;
    totalCharges?: number;
  };
}

export interface SavingsAccountTransaction extends BaseEntity {
  accountId: ID;
  transactionType: string;
  transactionDate: Date | string;
  amount: number;
  runningBalance: number;
  reversed: boolean;
  submittedByUsername?: string;
  payload?: any;
}