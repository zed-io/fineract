import { Request, Response } from 'express';
import {
  getFixedDepositPrematureClosureDetails,
  prematureCloseFixedDepositAccount
} from '../../../handlers/fixedDepositPrematureClosure';
import db from '../../../utils/db';
import { handleError } from '../../../utils/errorHandler';

// Mock database and error handler
jest.mock('../../../utils/db', () => ({
  query: jest.fn()
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleError: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Mock auth middleware (bypass it for testing)
jest.mock('../../../utils/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => next()
}));

describe('Fixed Deposit Premature Closure Handlers', () => {
  // Setup mocks for request and response
  let req: Partial<Request>;
  let res: Partial<Response>;
  
  beforeEach(() => {
    req = {
      body: { input: {} },
      user: { id: 'test-user-id' }
    };
    
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    jest.clearAllMocks();
  });
  
  describe('getFixedDepositPrematureClosureDetails', () => {
    it('should return premature closure details with flat penalty amount', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closureDate: '2023-06-30' // Halfway through a 12-month term
      };
      
      // Mock account data with flat penalty
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          deposit_start_date: '2023-01-01',
          original_maturity_date: '2024-01-01',
          deposit_amount: 10000,
          interest_earned: 300, // Accrued interest up to closure date
          is_premature_closure_allowed: true,
          pre_closure_penal_applicable: true,
          pre_closure_penal_interest: 100, // Flat amount of 100
          pre_closure_penal_interest_on_type_enum: 'whole_term',
          pre_closure_penal_calculation_method: 'flat_amount'
        }],
        rowCount: 1
      };
      
      // Mock transaction data (interest posted)
      const transactionData = {
        rows: [{
          interest_posted: 200 // Posted interest so far
        }]
      };
      
      // Mock available savings accounts
      const savingsData = {
        rows: [
          {
            id: 'savings-1',
            account_no: 'SA-001',
            product_name: 'Basic Savings',
            status: 300
          }
        ]
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SUM(CASE WHEN transaction_type')) {
          return Promise.resolve(transactionData);
        }
        if (query.includes('FROM savings_account sa')) {
          return Promise.resolve(savingsData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await getFixedDepositPrematureClosureDetails[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        accountNo: 'FD-001',
        closureDate: '2023-06-30',
        depositStartDate: '2023-01-01',
        originalMaturityDate: '2024-01-01',
        depositPeriodInDays: 365, // Full year term
        completedPeriodInDays: 180, // About half a year (approximate, will be actual days)
        depositAmount: 10000,
        interestAccrued: 300,
        interestPosted: 200,
        penaltyAmount: 100, // Flat penalty amount
        penaltyCalculationMethod: 'Flat Amount',
        totalPayoutAmount: 10100, // 10000 + 200 - 100
        availableSavingsAccounts: [
          {
            id: 'savings-1',
            accountNo: 'SA-001',
            productName: 'Basic Savings',
            status: 'Active'
          }
        ]
      });
      
      // Verify DB interactions
      expect(db.query).toHaveBeenCalledTimes(3);
    });
    
    it('should return premature closure details with percentage of interest penalty', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closureDate: '2023-06-30'
      };
      
      // Mock account data with percentage penalty
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          deposit_start_date: '2023-01-01',
          original_maturity_date: '2024-01-01',
          deposit_amount: 10000,
          interest_earned: 300,
          is_premature_closure_allowed: true,
          pre_closure_penal_applicable: true,
          pre_closure_penal_interest: 20, // 20% penalty
          pre_closure_penal_interest_on_type_enum: 'whole_term',
          pre_closure_penal_calculation_method: 'percentage_of_interest'
        }],
        rowCount: 1
      };
      
      // Mock transaction data (interest posted)
      const transactionData = {
        rows: [{
          interest_posted: 200
        }]
      };
      
      // Mock available savings accounts
      const savingsData = {
        rows: [
          {
            id: 'savings-1',
            account_no: 'SA-001',
            product_name: 'Basic Savings',
            status: 300
          }
        ]
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SUM(CASE WHEN transaction_type')) {
          return Promise.resolve(transactionData);
        }
        if (query.includes('FROM savings_account sa')) {
          return Promise.resolve(savingsData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await getFixedDepositPrematureClosureDetails[1](req as Request, res as Response);
      
      // Verify response including penalty calculation
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        penaltyAmount: 60, // 20% of 300 interest earned
        penaltyCalculationMethod: 'Percentage of Interest',
        totalPayoutAmount: 10140 // 10000 + 200 - 60
      }));
    });
    
    it('should return 404 if account not found', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'invalid-id',
        closureDate: '2023-06-30'
      };
      
      // Mock empty database response
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      
      // Execute handler
      await getFixedDepositPrematureClosureDetails[1](req as Request, res as Response);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Fixed deposit account not found'
      });
    });
    
    it('should reject if premature closure is not allowed', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closureDate: '2023-06-30'
      };
      
      // Mock account with premature closure disabled
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          is_premature_closure_allowed: false
        }],
        rowCount: 1
      };
      
      // Setup DB response
      (db.query as jest.Mock).mockResolvedValue(accountData);
      
      // Execute handler
      await getFixedDepositPrematureClosureDetails[1](req as Request, res as Response);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Premature closure is not allowed for this account'
      });
    });
    
    it('should handle unexpected errors', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closureDate: '2023-06-30'
      };
      
      // Mock database error
      const error = new Error('Database connection error');
      (db.query as jest.Mock).mockRejectedValue(error);
      
      // Execute handler
      await getFixedDepositPrematureClosureDetails[1](req as Request, res as Response);
      
      // Verify error handling
      expect(handleError).toHaveBeenCalledWith(error, res);
    });
  });
  
  describe('prematureCloseFixedDepositAccount', () => {
    beforeEach(() => {
      // Setup BEGIN and COMMIT/ROLLBACK mocks
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });
    });
    
    it('should process premature closure with withdraw_deposit option', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closedOnDate: '2023-06-30',
        note: 'Emergency withdrawal needed',
        onAccountClosureType: 'withdraw_deposit'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          status_enum: 300, // Active
          deposit_amount: 10000,
          is_premature_closure_allowed: true,
          pre_closure_penal_applicable: true,
          pre_closure_penal_interest: 100,
          pre_closure_penal_interest_on_type_enum: 'whole_term',
          pre_closure_penal_calculation_method: 'flat_amount'
        }],
        rowCount: 1
      };
      
      // Mock transaction data (interest posted)
      const transactionData = {
        rows: [{
          interest_posted: 200
        }]
      };
      
      // Mock transaction ID
      const txnResult = {
        rows: [{ id: 'txn-id' }]
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return Promise.resolve();
        }
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SUM(CASE WHEN transaction_type')) {
          return Promise.resolve(transactionData);
        }
        if (query.includes('INSERT INTO fixed_deposit_transaction') && 
            query.includes('RETURNING id')) {
          return Promise.resolve(txnResult);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        savingsAccountId: null,
        closedOnDate: '2023-06-30',
        totalAmount: 10100, // 10000 deposit + 200 interest - 100 penalty
        penaltyAmount: 100,
        transactionId: 'txn-id',
        message: 'Fixed deposit has been prematurely closed and funds have been withdrawn'
      });
      
      // Verify DB interactions
      expect(db.query).toHaveBeenCalledWith('BEGIN');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
      
      // Verify penalty transaction created
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fixed_deposit_transaction') &&
        expect.stringContaining('penalty_charge'),
        expect.arrayContaining([
          'fd-account-id',
          100, // Penalty amount
          'test-user-id'
        ])
      );
      
      // Verify withdrawal transaction created
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fixed_deposit_transaction') &&
        expect.stringContaining('premature_closure'),
        expect.arrayContaining([
          'fd-account-id',
          10100, // Total amount
          'test-user-id'
        ])
      );
      
      // Verify account status updated
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE savings_account'),
        expect.arrayContaining([
          '2023-06-30', // Closure date
          'test-user-id',
          'fd-account-id'
        ])
      );
      
      // Verify premature closure record created
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fixed_deposit_premature_closure'),
        expect.arrayContaining([
          'fd-account-id',
          '2023-06-30',
          10000, // Deposit amount
          100, // Penalty
          200, // Interest
          10100, // Total paid
          'test-user-id',
          null, // No transfer account
          'txn-id',
          'Emergency withdrawal needed' // Note
        ])
      );
    });
    
    it('should process premature closure with transfer_to_savings option', async () => {
      // Mock input with savings transfer
      req.body.input = { 
        accountId: 'fd-account-id',
        closedOnDate: '2023-06-30',
        note: 'Transfer to savings needed',
        onAccountClosureType: 'transfer_to_savings',
        toSavingsAccountId: 'savings-id'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          status_enum: 300, // Active
          deposit_amount: 10000,
          is_premature_closure_allowed: true,
          pre_closure_penal_applicable: false // No penalty
        }],
        rowCount: 1
      };
      
      // Mock transaction data (interest posted)
      const transactionData = {
        rows: [{
          interest_posted: 200
        }]
      };
      
      // Mock transaction ID
      const txnResult = {
        rows: [{ id: 'txn-id' }]
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return Promise.resolve();
        }
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SUM(CASE WHEN transaction_type')) {
          return Promise.resolve(transactionData);
        }
        if (query.includes('INSERT INTO fixed_deposit_transaction') && 
            query.includes('RETURNING id')) {
          return Promise.resolve(txnResult);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        savingsAccountId: 'savings-id',
        closedOnDate: '2023-06-30',
        totalAmount: 10200, // 10000 deposit + 200 interest (no penalty)
        penaltyAmount: 0,
        transactionId: 'txn-id',
        message: 'Fixed deposit has been prematurely closed and funds have been transferred to savings account'
      });
      
      // Verify DB interactions
      expect(db.query).toHaveBeenCalledWith('BEGIN');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
      
      // Verify transfer transaction created
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fixed_deposit_transaction') &&
        expect.stringContaining('premature_closure'),
        expect.arrayContaining([
          'fd-account-id',
          10200, // Total amount
          'test-user-id'
        ])
      );
      
      // Verify savings account balance updated
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE savings_account') &&
        expect.stringContaining('account_balance'),
        expect.arrayContaining([
          10200, // Total amount
          'test-user-id',
          'savings-id'
        ])
      );
      
      // Verify premature closure record created with transfer account
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fixed_deposit_premature_closure'),
        expect.arrayContaining([
          'fd-account-id',
          '2023-06-30',
          10000, // Deposit amount
          0, // No penalty
          200, // Interest
          10200, // Total paid
          'test-user-id',
          'savings-id', // Transfer account
          'txn-id',
          'Transfer to savings needed' // Note
        ])
      );
    });
    
    it('should return 404 if account not found', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'invalid-id',
        closedOnDate: '2023-06-30',
        onAccountClosureType: 'withdraw_deposit'
      };
      
      // Mock empty database response
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Fixed deposit account not found'
      });
    });
    
    it('should reject if account is not active', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closedOnDate: '2023-06-30',
        onAccountClosureType: 'withdraw_deposit'
      };
      
      // Mock non-active account
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          status_enum: 200 // Approved but not active
        }],
        rowCount: 1
      };
      
      // Setup DB response
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Cannot process premature closure for a non-active account'
      });
    });
    
    it('should reject if premature closure is not allowed', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closedOnDate: '2023-06-30',
        onAccountClosureType: 'withdraw_deposit'
      };
      
      // Mock account with premature closure not allowed
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          status_enum: 300, // Active
          is_premature_closure_allowed: false
        }],
        rowCount: 1
      };
      
      // Setup DB response
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Premature closure is not allowed for this account'
      });
    });
    
    it('should require savings account for transfer_to_savings option', async () => {
      // Mock input without savings account
      req.body.input = { 
        accountId: 'fd-account-id',
        closedOnDate: '2023-06-30',
        onAccountClosureType: 'transfer_to_savings',
        toSavingsAccountId: null
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          status_enum: 300, // Active
          is_premature_closure_allowed: true
        }],
        rowCount: 1
      };
      
      // Mock transaction data
      const transactionData = {
        rows: [{ interest_posted: 200 }]
      };
      
      // Setup DB response
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SUM(CASE WHEN transaction_type')) {
          return Promise.resolve(transactionData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No transfer savings account specified for closure'
      });
    });
    
    it('should reject invalid closure type', async () => {
      // Mock input with invalid closure type
      req.body.input = { 
        accountId: 'fd-account-id',
        closedOnDate: '2023-06-30',
        onAccountClosureType: 'invalid_type'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          status_enum: 300, // Active
          is_premature_closure_allowed: true
        }],
        rowCount: 1
      };
      
      // Mock transaction data
      const transactionData = {
        rows: [{ interest_posted: 200 }]
      };
      
      // Setup DB response
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SUM(CASE WHEN transaction_type')) {
          return Promise.resolve(transactionData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid closure instruction specified'
      });
    });
    
    it('should handle unexpected errors', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        closedOnDate: '2023-06-30',
        onAccountClosureType: 'withdraw_deposit'
      };
      
      // Mock database error
      const error = new Error('Database error');
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.reject(error);
      });
      
      // Execute handler
      await prematureCloseFixedDepositAccount[1](req as Request, res as Response);
      
      // Verify error handling
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(handleError).toHaveBeenCalledWith(error, res);
    });
  });
});