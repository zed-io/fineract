/**
 * Accounting model interfaces for Fineract
 * Provides type-safe structures for GL accounts, journal entries, and accounting rules
 */

/**
 * GL Account types
 */
export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  INCOME = 'income',
  EXPENSE = 'expense'
}

/**
 * Account usage types
 */
export enum AccountUsage {
  DETAIL = 'detail',
  HEADER = 'header'
}

/**
 * Journal entry types
 */
export enum JournalEntryType {
  CREDIT = 'credit',
  DEBIT = 'debit'
}

/**
 * Product type for account mappings
 */
export enum ProductType {
  LOAN = 'loan',
  SAVINGS = 'savings',
  SHARE = 'share'
}

/**
 * Standard account mapping types for loan products
 */
export enum LoanAccountMappingType {
  FUND_SOURCE = 'fund_source',
  LOAN_PORTFOLIO = 'loan_portfolio',
  INTEREST_RECEIVABLE = 'interest_receivable',
  INTEREST_INCOME = 'interest_income',
  FEE_INCOME = 'fee_income',
  PENALTY_INCOME = 'penalty_income',
  LOSSES_WRITTEN_OFF = 'losses_written_off',
  OVERPAYMENT = 'overpayment',
  INCOME_FROM_RECOVERY = 'income_from_recovery',
  GOODWILL_CREDIT = 'goodwill_credit',
  INCOME_FROM_CHARGE_OFF = 'income_from_charge_off',
  CHARGE_OFF_EXPENSE = 'charge_off_expense',
  CHARGE_OFF_FRAUD_EXPENSE = 'charge_off_fraud_expense'
}

/**
 * Standard account mapping types for savings products
 */
export enum SavingsAccountMappingType {
  SAVINGS_CONTROL = 'savings_control',
  SAVINGS_REFERENCE = 'savings_reference',
  INTEREST_ON_SAVINGS = 'interest_on_savings',
  FEE_INCOME = 'fee_income',
  PENALTY_INCOME = 'penalty_income',
  INCOME_FROM_FEES = 'income_from_fees',
  OVERDRAFT_PORTFOLIO = 'overdraft_portfolio',
  INCOME_FROM_INTEREST = 'income_from_interest'
}

/**
 * GL Account interface
 */
export interface GLAccount {
  id: string;
  name: string;
  parentId?: string;
  hierarchy?: string;
  glCode: string;
  disabled: boolean;
  manualEntriesAllowed: boolean;
  accountType: AccountType;
  accountUsage: AccountUsage;
  description?: string;
  tagId?: string;
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * GL Account creation input
 */
export interface GLAccountCreateInput {
  name: string;
  parentId?: string;
  glCode: string;
  disabled?: boolean;
  manualEntriesAllowed?: boolean;
  accountType: AccountType;
  accountUsage: AccountUsage;
  description?: string;
  tagId?: string;
}

/**
 * GL Account update input
 */
export interface GLAccountUpdateInput {
  id: string;
  name?: string;
  parentId?: string;
  glCode?: string;
  disabled?: boolean;
  manualEntriesAllowed?: boolean;
  description?: string;
  tagId?: string;
}

/**
 * Journal Entry interface
 */
export interface JournalEntry {
  id: string;
  accountId: string;
  officeId: string;
  reversalId?: string;
  transactionId: string;
  reversed: boolean;
  manualEntry: boolean;
  entryDate: string;
  type: JournalEntryType;
  amount: number;
  description?: string;
  entityType?: string;
  entityId?: string;
  currencyCode: string;
  paymentDetailsId?: string;
  submittedOnDate: string;
  submittedByUserId?: string;
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * Single journal entry input for creating journal entries
 */
export interface SingleJournalEntryInput {
  glAccountId: string;
  amount: number;
  type: JournalEntryType;
  comments?: string;
}

/**
 * Journal entry creation input
 */
export interface JournalEntryCreateInput {
  officeId: string;
  transactionDate: string;
  currencyCode: string;
  comments?: string;
  referenceNumber?: string;
  accountingRule?: string;
  credits: SingleJournalEntryInput[];
  debits: SingleJournalEntryInput[];
  paymentTypeId?: string;
  accountNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  receiptNumber?: string;
  bankNumber?: string;
}

/**
 * Journal entry reversal input
 */
export interface JournalEntryReversalInput {
  transactionId: string;
  comments?: string;
}

/**
 * GL Closure interface
 */
export interface GLClosure {
  id: string;
  officeId: string;
  closingDate: string;
  deleted: boolean;
  comments?: string;
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * GL Closure creation input
 */
export interface GLClosureCreateInput {
  officeId: string;
  closingDate: string;
  comments?: string;
}

/**
 * Product to GL Account Mapping interface
 */
export interface ProductAccountMapping {
  id: string;
  productId: string;
  productType: ProductType;
  accountMappingType: string;
  glAccountId: string;
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * Product to GL Account Mapping creation input
 */
export interface ProductAccountMappingCreateInput {
  productId: string;
  productType: ProductType;
  accountMappingType: string;
  glAccountId: string;
}

/**
 * Accounting Rule interface
 */
export interface AccountingRule {
  id: string;
  name: string;
  officeId?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  description?: string;
  systemDefined: boolean;
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * Accounting Rule creation input
 */
export interface AccountingRuleCreateInput {
  name: string;
  officeId?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  description?: string;
}

/**
 * Transaction details for creating journal entries for financial transactions
 */
export interface TransactionDetails {
  transactionId: string;
  transactionDate: string;
  amount: number;
  transactionType: string;
  paymentTypeId?: string;
  currencyCode: string;
  notes?: string;
}

/**
 * Loan Transaction Journal Entry Mapping
 * Defines mappings between transaction types and account mappings
 */
export interface LoanTransactionJournalEntryMap {
  [transactionType: string]: {
    debit?: LoanAccountMappingType[];
    credit?: LoanAccountMappingType[];
  };
}

/**
 * Savings Transaction Journal Entry Mapping
 * Defines mappings between transaction types and account mappings
 */
export interface SavingsTransactionJournalEntryMap {
  [transactionType: string]: {
    debit?: SavingsAccountMappingType[];
    credit?: SavingsAccountMappingType[];
  };
}

/**
 * Trial balance search criteria
 */
export interface TrialBalanceSearchCriteria {
  officeId?: string;
  runningBalanceOnly?: boolean;
  closingBalanceOnly?: boolean;
  asOnDate?: string;
  includeAccumulated?: boolean;
}

/**
 * Trial balance entry
 */
export interface TrialBalanceEntry {
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType: AccountType;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  closingBalance?: number;
}

/**
 * Trial balance result
 */
export interface TrialBalanceResult {
  office: string;
  asOnDate: string;
  entries: TrialBalanceEntry[];
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
}

/**
 * Financial statement type
 */
export enum FinancialStatementType {
  BALANCE_SHEET = 'balance_sheet',
  INCOME_STATEMENT = 'income_statement',
  CASH_FLOW = 'cash_flow'
}

/**
 * Financial statement section
 */
export interface FinancialStatementSection {
  name: string;
  total: number;
  accounts: {
    id: string;
    name: string;
    amount: number;
  }[];
}

/**
 * Financial statement result
 */
export interface FinancialStatementResult {
  type: FinancialStatementType;
  office: string;
  fromDate?: string;
  toDate: string;
  sections: FinancialStatementSection[];
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  totalRevenueAndExpense?: number;
}

/**
 * Account balance
 */
export interface AccountBalance {
  id: string;
  name: string;
  glCode: string;
  balance: number;
}

/**
 * Provisioning category
 */
export interface ProvisioningCategory {
  id: string;
  categoryName: string;
  categoryDescription?: string;
  minAge: number;
  maxAge: number;
  provisioningPercentage: number;
  liabilityAccount?: string;
  expenseAccount?: string;
}

/**
 * Provisioning category create/update input
 */
export interface ProvisioningCategoryRequest {
  categoryName: string;
  categoryDescription?: string;
  minAge: number;
  maxAge: number;
  provisioningPercentage: number;
  liabilityAccountId?: string;
  expenseAccountId?: string;
}

/**
 * Provisioning category response
 */
export interface ProvisioningCategoryResponse extends ProvisioningCategory {
  liabilityAccountName?: string;
  expenseAccountName?: string;
}

/**
 * Provisioning entry
 */
export interface ProvisioningEntry {
  id: string;
  journalEntryId?: string;
  createdDate: string;
  entryDate: string;
  comments?: string;
  provisioningAmount: number;
  status: ProvisioningEntryStatus;
}

/**
 * Provisioning entry status
 */
export enum ProvisioningEntryStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * Provisioning entry request
 */
export interface ProvisioningEntryRequest {
  entryDate: string;
  comments?: string;
  createJournalEntries?: boolean;
}

/**
 * Provisioning entry response
 */
export interface ProvisioningEntryResponse extends ProvisioningEntry {
  details?: ProvisioningEntryDetail[];
  createdBy?: string;
  approvedBy?: string;
  approvedDate?: string;
}

/**
 * Provisioning entry detail
 */
export interface ProvisioningEntryDetail {
  id: string;
  provisioningEntryId: string;
  officeId: string;
  officeName?: string;
  loanProductId: string;
  loanProductName?: string;
  currencyCode: string;
  categoryId: string;
  categoryName?: string;
  amountOutstanding: number;
  amountProvisioned: number;
}

/**
 * Provisioning entries response
 */
export interface ProvisioningEntriesResponse {
  entries: ProvisioningEntryResponse[];
  totalCount: number;
}

/**
 * Provisioning categories response
 */
export interface ProvisioningCategoriesResponse {
  categories: ProvisioningCategoryResponse[];
}