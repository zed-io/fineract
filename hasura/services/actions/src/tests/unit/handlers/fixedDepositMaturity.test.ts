import { Request, Response } from 'express';
import {
  getFixedDepositMaturityDetails,
  processFixedDepositMaturity,
  updateFixedDepositMaturityInstructions
} from '../../../handlers/fixedDepositMaturity';
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

describe('Fixed Deposit Maturity Handlers', () => {
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
  
  describe('getFixedDepositMaturityDetails', () => {
    it('should return maturity details for a valid account', async () => {
      // Mock input
      req.body.input = { accountId: 'fd-account-id' };
      
      // Mock database responses
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          maturity_date: '2023-12-31',
          maturity_amount: 10500,
          on_account_closure_type: 'withdraw_deposit',
          transfer_to_savings_account_id: null,
          transfer_to_savings_account_no: null,
          renewal_term: 12,
          renewal_term_frequency_type: 'months',
          interest_at_maturity: 500,
          total_principal: 10000
        }],
        length: 1
      };
      
      const savingsData = {
        rows: [
          {
            id: 'savings-1',
            account_no: 'SA-001',
            product_name: 'Basic Savings',
            status: 300
          },
          {
            id: 'savings-2',
            account_no: 'SA-002',
            product_name: 'Premium Savings',
            status: 300
          }
        ]
      };
      
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SELECT sa.id')) {
          return Promise.resolve(savingsData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler (first middleware is auth, second is handler)
      await getFixedDepositMaturityDetails[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        accountNo: 'FD-001',
        maturityDate: '2023-12-31',
        maturityAmount: 10500,
        currentMaturityInstructions: {
          id: expect.any(Number),
          code: 'withdraw_deposit',
          value: 'Withdraw deposit'
        },
        transferToSavingsAccountId: null,
        transferToSavingsAccountNo: null,
        renewalTerm: 12,
        renewalTermFrequencyType: {
          id: expect.any(Number),
          code: 'months',
          value: 'Months'
        },
        interestAtMaturity: 500,
        totalPrincipal: 10000,
        availableSavingsAccounts: [
          {
            id: 'savings-1',
            accountNo: 'SA-001',
            productName: 'Basic Savings',
            status: 'Active'
          },
          {
            id: 'savings-2',
            accountNo: 'SA-002',
            productName: 'Premium Savings',
            status: 'Active'
          }
        ]
      });
      
      // Verify DB interactions
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM fixed_deposit_account fda'),
        ['fd-account-id']
      );
    });
    
    it('should return 404 if account not found', async () => {
      // Mock input
      req.body.input = { accountId: 'invalid-id' };
      
      // Mock empty database response
      (db.query as jest.Mock).mockResolvedValue({ rows: [], length: 0 });
      
      // Execute handler
      await getFixedDepositMaturityDetails[1](req as Request, res as Response);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Fixed deposit account not found'
      });
    });
    
    it('should handle unexpected errors', async () => {
      // Mock input
      req.body.input = { accountId: 'fd-account-id' };
      
      // Mock database error
      const error = new Error('Database connection error');
      (db.query as jest.Mock).mockRejectedValue(error);
      
      // Execute handler
      await getFixedDepositMaturityDetails[1](req as Request, res as Response);
      
      // Verify error handling
      expect(handleError).toHaveBeenCalledWith(error, res);
    });
  });
  
  describe('processFixedDepositMaturity', () => {
    beforeEach(() => {
      // Setup BEGIN and COMMIT mocks
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });
    });
    
    it('should process maturity with withdraw_deposit option', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        processDate: '2023-12-31'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          maturity_date: '2023-12-31',
          maturity_amount: 10500,
          on_account_closure_type: 'withdraw_deposit',
          transfer_to_savings_account_id: null,
          deposit_period: 12,
          deposit_period_frequency_type_enum: 'months',
          interest_rate: 5.0,
          product_id: 'fd-product-id',
          client_id: 'client-id',
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Mock transaction data
      const transactionData = {
        rows: [{ id: 'txn-id' }]
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query, params) => {
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('INSERT INTO fixed_deposit_transaction') && query.includes('RETURNING id')) {
          return Promise.resolve(transactionData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await processFixedDepositMaturity[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        processedDate: '2023-12-31',
        maturityAmount: 10500,
        processingResult: 'withdrawn',
        renewedAccountId: null,
        renewedAccountNo: null,
        transactionId: 'txn-id',
        message: 'Fixed deposit has matured and funds have been withdrawn'
      });
      
      // Verify DB interactions
      expect(db.query).toHaveBeenCalledWith('BEGIN');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE savings_account'),
        expect.arrayContaining([
          '2023-12-31', // Processed date
          'test-user-id', // User ID
          'fd-account-id' // Account ID
        ])
      );
    });
    
    it('should process maturity with transfer_to_savings option', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        processDate: '2023-12-31'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          maturity_date: '2023-12-31',
          maturity_amount: 10500,
          on_account_closure_type: 'transfer_to_savings',
          transfer_to_savings_account_id: 'savings-id',
          deposit_period: 12,
          deposit_period_frequency_type_enum: 'months',
          interest_rate: 5.0,
          product_id: 'fd-product-id',
          client_id: 'client-id',
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Mock transaction data
      const transactionData = {
        rows: [{ id: 'txn-id' }]
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query, params) => {
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('INSERT INTO fixed_deposit_transaction') && query.includes('RETURNING id')) {
          return Promise.resolve(transactionData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await processFixedDepositMaturity[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        processedDate: '2023-12-31',
        maturityAmount: 10500,
        processingResult: 'transferred_to_savings',
        renewedAccountId: null,
        renewedAccountNo: null,
        transactionId: 'txn-id',
        message: 'Fixed deposit has matured and funds have been transferred to savings account'
      });
      
      // Verify DB interactions for savings balance update
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE savings_account'),
        expect.arrayContaining([
          10500, // Maturity amount
          'test-user-id', // User ID
          'savings-id' // Savings account ID
        ])
      );
    });
    
    it('should process maturity with reinvest option', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        processDate: '2023-12-31'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          maturity_date: '2023-12-31',
          maturity_amount: 10500,
          on_account_closure_type: 'reinvest',
          transfer_to_savings_account_id: null,
          deposit_period: 12,
          deposit_period_frequency_type_enum: 'months',
          interest_rate: 5.0,
          product_id: 'fd-product-id',
          client_id: 'client-id',
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Mock new account number
      const newAccountNoData = {
        rows: [{ next_no: 2 }]
      };
      
      // Mock new savings account ID
      const newSavingsAccountData = {
        rows: [{ id: 'new-savings-id' }]
      };
      
      // Mock new fixed deposit ID
      const newFixedDepositData = {
        rows: [{ id: 'new-fd-id' }]
      };
      
      // Mock transaction ID
      const transactionData = {
        rows: [{ id: 'txn-id' }]
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query, params) => {
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        if (query.includes('SELECT COALESCE')) {
          return Promise.resolve(newAccountNoData);
        }
        if (query.includes('INSERT INTO savings_account') && query.includes('RETURNING id')) {
          return Promise.resolve(newSavingsAccountData);
        }
        if (query.includes('INSERT INTO fixed_deposit_account') && query.includes('RETURNING id')) {
          return Promise.resolve(newFixedDepositData);
        }
        if (query.includes('INSERT INTO fixed_deposit_transaction') && query.includes('RETURNING id')) {
          return Promise.resolve(transactionData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await processFixedDepositMaturity[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        processedDate: '2023-12-31',
        maturityAmount: 10500,
        processingResult: 'renewed',
        renewedAccountId: 'new-fd-id',
        renewedAccountNo: 'FD000002',
        transactionId: 'txn-id',
        message: 'Fixed deposit has matured and been renewed with a new account'
      });
      
      // Verify DB interactions for creating new account
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO savings_account'),
        expect.arrayContaining([
          'FD000002', // New account number
          '2023-12-31', // Process date
          'test-user-id', // User ID
          10500, // Maturity amount (deposit amount for new account)
          'fd-account-id' // Original account ID
        ])
      );
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fixed_deposit_account'),
        expect.arrayContaining([
          'new-savings-id', // New savings account ID
          10500, // Maturity amount (deposit amount for new account)
          expect.any(String), // New maturity date
          'test-user-id', // User ID
          'fd-account-id' // Original account ID
        ])
      );
    });
    
    it('should return 404 if account not found', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'invalid-id',
        processDate: '2023-12-31'
      };
      
      // Mock empty database response
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      
      // Execute handler
      await processFixedDepositMaturity[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Fixed deposit account not found'
      });
    });
    
    it('should reject processing before maturity date', async () => {
      // Mock input with process date before maturity
      req.body.input = { 
        accountId: 'fd-account-id',
        processDate: '2023-11-30' // Before maturity
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          maturity_date: '2023-12-31', // Maturity date is after process date
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await processFixedDepositMaturity[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Cannot process maturity before the maturity date'
      });
    });
    
    it('should handle unexpected errors', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        processDate: '2023-12-31'
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
      await processFixedDepositMaturity[1](req as Request, res as Response);
      
      // Verify error handling
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(handleError).toHaveBeenCalledWith(error, res);
    });
  });
  
  describe('updateFixedDepositMaturityInstructions', () => {
    beforeEach(() => {
      // Setup BEGIN and COMMIT mocks
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });
    });
    
    it('should update maturity instructions successfully', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
        onAccountClosureType: 'transfer_to_savings',
        transferToSavingsAccountId: 'savings-id'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return Promise.resolve();
        }
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await updateFixedDepositMaturityInstructions[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        onAccountClosureType: 'transfer_to_savings',
        transferToSavingsAccountId: 'savings-id'
      });
      
      // Verify DB interactions
      expect(db.query).toHaveBeenCalledWith('BEGIN');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fixed_deposit_account'),
        expect.arrayContaining([
          'transfer_to_savings', // Closure type
          'savings-id', // Transfer account ID
          'test-user-id', // User ID
          'fd-account-id' // Account ID
        ])
      );
    });
    
    it('should handle renewal period updates', async () => {
      // Mock input with renewal details
      req.body.input = { 
        accountId: 'fd-account-id',
        onAccountClosureType: 'reinvest',
        renewalPeriod: 24,
        renewalPeriodFrequencyType: 'months'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          account_no: 'FD-001',
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return Promise.resolve();
        }
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await updateFixedDepositMaturityInstructions[1](req as Request, res as Response);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        accountId: 'fd-account-id',
        onAccountClosureType: 'reinvest',
        transferToSavingsAccountId: null
      });
      
      // Verify DB interactions include renewal period details
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fixed_deposit_account'),
        expect.arrayContaining([
          'reinvest', // Closure type
          null, // Transfer account ID (null for reinvest)
          'test-user-id', // User ID
          24, // Renewal period
          'months', // Renewal period frequency type
          'fd-account-id' // Account ID
        ])
      );
    });
    
    it('should return 404 if account not found', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'invalid-id',
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
      await updateFixedDepositMaturityInstructions[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Fixed deposit account not found'
      });
    });
    
    it('should reject invalid closure type', async () => {
      // Mock input with invalid closure type
      req.body.input = { 
        accountId: 'fd-account-id',
        onAccountClosureType: 'invalid_type'
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await updateFixedDepositMaturityInstructions[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid account closure type'
      });
    });
    
    it('should require transfer account for transfer_to_savings type', async () => {
      // Mock input without transfer account
      req.body.input = { 
        accountId: 'fd-account-id',
        onAccountClosureType: 'transfer_to_savings',
        transferToSavingsAccountId: null
      };
      
      // Mock account data
      const accountData = {
        rows: [{
          id: 'fd-account-id',
          status_enum: 300 // Active
        }],
        rowCount: 1
      };
      
      // Setup DB responses
      (db.query as jest.Mock).mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (query.includes('SELECT fda.id')) {
          return Promise.resolve(accountData);
        }
        return Promise.resolve({ rows: [] });
      });
      
      // Execute handler
      await updateFixedDepositMaturityInstructions[1](req as Request, res as Response);
      
      // Verify response
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Transfer savings account must be specified for transfer to savings maturity option'
      });
    });
    
    it('should handle unexpected errors', async () => {
      // Mock input
      req.body.input = { 
        accountId: 'fd-account-id',
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
      await updateFixedDepositMaturityInstructions[1](req as Request, res as Response);
      
      // Verify error handling
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(handleError).toHaveBeenCalledWith(error, res);
    });
  });
});