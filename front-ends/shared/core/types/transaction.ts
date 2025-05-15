import { BaseEntity, ID } from './common';

export enum TransactionType {
  DISBURSEMENT = 'disbursement',
  REPAYMENT = 'repayment',
  WAIVE_INTEREST = 'waive_interest',
  WRITE_OFF = 'write_off',
  CONTRA = 'contra',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  CHARGE_PAYMENT = 'charge_payment',
  INTEREST_POSTING = 'interest_posting',
  DIVIDEND_PAYOUT = 'dividend_payout',
  FEE = 'fee',
  WITHDRAWAL_FEE = 'withdrawal_fee',
  ANNUAL_FEE = 'annual_fee',
  WAIVE_CHARGES = 'waive_charges',
  PAY_CHARGE = 'pay_charge',
  ACCRUAL = 'accrual',
}

export enum PaymentMethod {
  CASH = 'cash',
  CHEQUE = 'cheque',
  BANK_TRANSFER = 'bank_transfer',
  STANDING_ORDER = 'standing_order',
  MOBILE_MONEY = 'mobile_money',
  ONLINE = 'online',
  OTHER = 'other',
}

export interface Transaction extends BaseEntity {
  accountId: ID;
  accountType: string;
  transactionType: TransactionType;
  transactionDate: Date | string;
  submittedOnDate: Date | string;
  reversedOnDate?: Date | string;
  reversed: boolean;
  amount: number;
  principalPortion?: number;
  interestPortion?: number;
  feePortion?: number;
  penaltyPortion?: number;
  overpaymentPortion?: number;
  outstandingLoanBalance?: number;
  paymentDetailData?: PaymentDetail;
  currency: {
    code: string;
    name?: string;
    decimalPlaces?: number;
    inMultiplesOf?: number;
    displaySymbol?: string;
    nameCode?: string;
    displayLabel?: string;
  };
}

export interface PaymentDetail {
  id?: ID;
  paymentType: PaymentMethod;
  accountNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  receiptNumber?: string;
  bankNumber?: string;
  transactionReference?: string;
  paymentDate?: Date | string;
  note?: string;
}

export interface LoanTransaction extends Transaction {
  loanId: ID;
  loanStatus?: string;
}

export interface SavingsTransaction extends Transaction {
  savingsId: ID;
  savingsStatus?: string;
  runningBalance?: number;
}

export interface TransferTransaction extends Transaction {
  fromAccountId: ID;
  fromAccountType: string;
  toAccountId: ID;
  toAccountType: string;
  transferDescription?: string;
}

export interface JournalEntry extends BaseEntity {
  officeId: ID;
  officeName?: string;
  glAccountId: ID;
  glAccountName?: string;
  glAccountCode?: string;
  transactionId?: ID;
  transactionDate: Date | string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: {
    code: string;
    name?: string;
    decimalPlaces?: number;
    inMultiplesOf?: number;
    displaySymbol?: string;
    nameCode?: string;
    displayLabel?: string;
  };
  description?: string;
  referenceNumber?: string;
  manualEntry: boolean;
  submittedOnDate: Date | string;
  createdByUserId?: ID;
  createdByUserName?: string;
}