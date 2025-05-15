import { BaseEntity, ID, Status } from './common';

export enum LoanStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  ACTIVE = 'active',
  CLOSED = 'closed',
  OVERPAID = 'overpaid',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  WRITTEN_OFF = 'writtenoff',
}

export enum InterestType {
  FLAT = 'flat',
  DECLINING_BALANCE = 'declining_balance',
}

export enum RepaymentFrequency {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

export enum AmortizationType {
  EQUAL_INSTALLMENTS = 'equal_installments',
  EQUAL_PRINCIPAL = 'equal_principal',
}

export interface LoanProduct extends BaseEntity {
  name: string;
  shortName: string;
  description?: string;
  fundId?: number;
  fundName?: string;
  includeInBorrowerCycle: boolean;
  useBorrowerCycle: boolean;
  startDate?: Date | string;
  closeDate?: Date | string;
  status: Status;
  externalId?: string;
  
  // Interest and term details
  minInterestRatePerPeriod: number;
  interestRatePerPeriod: number;
  maxInterestRatePerPeriod: number;
  interestRateFrequencyType: RepaymentFrequency;
  annualInterestRate: number;
  interestType: InterestType;
  interestCalculationPeriodType: string;
  
  // Terms
  minPrincipal: number;
  principal: number;
  maxPrincipal: number;
  minNumberOfRepayments: number;
  numberOfRepayments: number;
  maxNumberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: RepaymentFrequency;
  amortizationType: AmortizationType;
  inArrearsTolerance: number;
  graceOnPrincipalPayment: number;
  graceOnInterestPayment: number;
  graceOnInterestCharged: number;
  
  // Additional configuration
  allowPartialPeriodInterestCalcualtion: boolean;
  transactionProcessingStrategyId: number;
  transactionProcessingStrategyName?: string;
  daysInYearType: string;
  daysInMonthType: string;
  canDefineInstallmentAmount: boolean;
  installmentAmountInMultiplesOf?: number;
  accountingRule: string;
}

export interface LoanApplication extends BaseEntity {
  clientId: ID;
  clientName?: string;
  clientAccountNo?: string;
  groupId?: ID;
  groupName?: string;
  loanProductId: ID;
  loanProductName?: string;
  loanOfficerId?: ID;
  loanOfficerName?: string;
  loanPurposeId?: ID;
  loanPurposeName?: string;
  fundId?: ID;
  fundName?: string;
  externalId?: string;
  
  // Application details
  submittedOnDate: Date | string;
  submittedByUsername?: string;
  submittedByFirstname?: string;
  submittedByLastname?: string;
  approvedOnDate?: Date | string;
  expectedDisbursementDate?: Date | string;
  actualDisbursementDate?: Date | string;
  disbursedByUsername?: string;
  disbursedByFirstname?: string;
  disbursedByLastname?: string;
  
  // Loan terms
  principal: number;
  approvedPrincipal?: number;
  termFrequency: number;
  termFrequencyType: RepaymentFrequency;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: RepaymentFrequency;
  interestRatePerPeriod: number;
  interestRateFrequencyType: RepaymentFrequency;
  annualInterestRate: number;
  interestType: InterestType;
  amortizationType: AmortizationType;
  interestCalculationPeriodType: string;
  inArrearsTolerance?: number;
  graceOnPrincipalPayment?: number;
  graceOnInterestPayment?: number;
  graceOnInterestCharged?: number;
  
  // Status
  status: LoanStatus;
}

export interface LoanRepaymentSchedule {
  id?: ID;
  loanId: ID;
  dueDate: Date | string;
  installmentNumber: number;
  principal: number;
  interest: number;
  fee: number;
  penalty: number;
  totalDue: number;
  totalPaid?: number;
  totalOutstanding?: number;
  paid?: boolean;
  fromDate?: Date | string;
  toDate?: Date | string;
  obligations?: number;
}

export interface LoanSearchParams {
  accountNo?: string;
  externalId?: string;
  status?: LoanStatus;
  clientId?: ID;
  groupId?: ID;
  loanProductId?: ID;
  loanOfficerId?: ID;
  loanPurposeId?: ID;
  fundId?: ID;
  fromDate?: Date | string;
  toDate?: Date | string;
}