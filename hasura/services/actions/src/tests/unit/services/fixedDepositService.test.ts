import { fixedDepositService } from '../../../services/fixedDepositService';
import { query, transaction } from '../../../utils/db';
import { 
  FixedDepositProductCreateRequest, 
  FixedDepositAccountCreateRequest,
  FixedDepositAccountApprovalRequest,
  FixedDepositAccountActivateRequest
} from '../../../models/fixedDeposit';

// Mock the database functions
jest.mock('../../../utils/db', () => ({
  query: jest.fn(),
  transaction: jest.fn(async (callback) => await callback({ query: jest.fn() })),
}));

// Mock the logger to avoid console output during tests
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock uuid generation to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn().mockImplementation(() => 'mocked-uuid'),
}));

// Mock the generateAccountNumber function
jest.mock('../../../utils/accountUtils', () => ({
  generateAccountNumber: jest.fn().mockImplementation(() => 'FD-001'),
}));

describe('FixedDepositService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a fixed deposit product successfully', async () => {
      // Mock data
      const request: FixedDepositProductCreateRequest = {
        name: 'Test FD Product',
        shortName: 'TestFD',
        description: 'Test Fixed Deposit Product',
        currencyCode: 'USD',
        currencyDigits: 2,
        interestRate: 5.5,
        interestCompoundingPeriodType: 'monthly',
        interestPostingPeriodType: 'quarterly',
        interestCalculationType: 'daily_balance',
        interestCalculationDaysInYearType: '365_days',
        minDepositTerm: 3,
        maxDepositTerm: 60,
        minDepositTermType: 'months',
        maxDepositTermType: 'months',
        isPrematureClosureAllowed: true,
        preClosurePenalApplicable: true,
        preClosurePenalInterest: 1.0,
        preClosurePenalInterestOnType: 'whole_term',
        accountingRule: 'cash_based',
        minDepositAmount: 1000,
        maxDepositAmount: 1000000,
        charts: [
          {
            name: 'Default Chart',
            fromDate: '2023-01-01',
            isPrimaryGroupingByAmount: false,
            chartSlabs: [
              {
                periodType: 'months',
                fromPeriod: 3,
                toPeriod: 6,
                annualInterestRate: 5.0,
                currencyCode: 'USD'
              },
              {
                periodType: 'months',
                fromPeriod: 7,
                toPeriod: 12,
                annualInterestRate: 5.5,
                currencyCode: 'USD'
              }
            ]
          }
        ]
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] })
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute the function
      const result = await fixedDepositService.createProduct(request);

      // Verify results
      expect(result).toBe('mocked-uuid');
      
      // Verify DB interactions
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      
      // 1. Insert savings product
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO savings_product'),
        expect.arrayContaining([
          'mocked-uuid', // Product ID
          'Test FD Product',
          'TestFD',
          'Test Fixed Deposit Product',
          'USD',
          2,
          5.5 // Interest rate
        ])
      );
      
      // 2. Insert fixed deposit product
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO fixed_deposit_product'),
        expect.arrayContaining([
          'mocked-uuid', // FD Product ID
          'mocked-uuid', // Savings Product ID
          3, // Min deposit term
          60, // Max deposit term
          'months',
          'months',
          null, // In multiples of term
          null, // In multiples of term type
          true, // Is premature closure allowed
          true, // Pre closure penal applicable
          1.0, // Pre closure penal interest
          'whole_term' // Pre closure penal interest on type
        ])
      );
      
      // 3. Insert interest rate chart
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO fixed_deposit_interest_rate_chart'),
        expect.arrayContaining([
          'mocked-uuid', // Chart ID
          'mocked-uuid', // Product ID
          'Default Chart',
          null, // Description
          expect.any(Date), // From date
          null, // End date
          false // Is primary grouping by amount
        ])
      );
      
      // 4 & 5. Insert interest rate slabs
      expect(mockClient.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO fixed_deposit_interest_rate_slab'),
        expect.arrayContaining([
          'mocked-uuid', // Slab ID
          'mocked-uuid', // Chart ID
          null, // Description
          'months',
          3, // From period
          6, // To period
          null, // Amount range from
          null, // Amount range to
          5.0, // Annual interest rate
          'USD' // Currency code
        ])
      );
      
      expect(mockClient.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('INSERT INTO fixed_deposit_interest_rate_slab'),
        expect.arrayContaining([
          'mocked-uuid', // Slab ID
          'mocked-uuid', // Chart ID
          null, // Description
          'months',
          7, // From period
          12, // To period
          null, // Amount range from
          null, // Amount range to
          5.5, // Annual interest rate
          'USD' // Currency code
        ])
      );
    });
  });

  describe('createAccount', () => {
    it('should create a fixed deposit account successfully', async () => {
      // Mock data
      const request: FixedDepositAccountCreateRequest = {
        productId: 'fd-product-id',
        clientId: 'client-id',
        submittedOnDate: '2023-01-01',
        depositAmount: 10000,
        depositPeriod: 12,
        depositPeriodFrequencyType: 'months',
        interestRate: 5.0,
        expectedFirstDepositOnDate: '2023-01-15'
      };
      
      // Mock product query result
      const productResult = {
        rowCount: 1,
        rows: [
          {
            id: 'fd-product-id',
            savings_product_id: 'savings-product-id',
            currency_code: 'USD',
            nominal_annual_interest_rate: 5.0,
            is_premature_closure_allowed: true,
            pre_closure_penal_applicable: true,
            pre_closure_penal_interest: 1.0,
            pre_closure_penal_interest_on_type_enum: 'whole_term'
          }
        ]
      };
      
      // Mock client query result
      const clientResult = {
        rowCount: 1,
        rows: [
          {
            id: 'client-id',
            display_name: 'Test Client'
          }
        ]
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('FROM fixed_deposit_product')) {
            return Promise.resolve(productResult);
          }
          if (sql.includes('FROM client')) {
            return Promise.resolve(clientResult);
          }
          return Promise.resolve({ rowCount: 0, rows: [] });
        })
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute the function
      const result = await fixedDepositService.createAccount(request);

      // Verify results
      expect(result).toBe('mocked-uuid');
      
      // Verify DB interactions
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      
      // 1. Get product details
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM fixed_deposit_product fdp'),
        ['fd-product-id']
      );
      
      // 2. Validate client
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM client'),
        ['client-id']
      );
      
      // 3. Insert savings account
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO savings_account'),
        expect.arrayContaining([
          'mocked-uuid', // Savings account ID
          'FD-001', // Account number
          null, // External ID
          'client-id',
          null, // Group ID
          'savings-product-id',
          null, // Field officer ID
          'submitted_and_pending_approval',
          'individual',
          5.0, // Interest rate
          10000, // Deposit amount
          null, // User ID
          expect.any(Date), // Submitted on date
          'fd-product-id'
        ])
      );
      
      // 4. Insert fixed deposit account
      expect(mockClient.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO fixed_deposit_account'),
        expect.arrayContaining([
          'mocked-uuid', // FD account ID
          'mocked-uuid', // Savings account ID
          'fd-product-id',
          10000, // Deposit amount
          12, // Deposit period
          'months',
          5.0, // Interest rate
          false, // Is renewal allowed
          true, // Is premature closure allowed
          true, // Pre closure penal applicable
          1.0, // Pre closure penal interest
          'whole_term',
          'withdraw_deposit', // Default closure type
          null, // Transfer to savings account ID
          null, // Linked account ID
          false, // Transfer interest to linked account
          expect.any(Date), // Expected first deposit on date
          null // User ID
        ])
      );
    });
    
    it('should throw an error if neither clientId nor groupId is provided', async () => {
      // Mock request without client or group
      const request: FixedDepositAccountCreateRequest = {
        productId: 'fd-product-id',
        submittedOnDate: '2023-01-01',
        depositAmount: 10000,
        depositPeriod: 12,
        depositPeriodFrequencyType: 'months'
      };
      
      // Execute and verify the function throws appropriate error
      await expect(fixedDepositService.createAccount(request))
        .rejects.toThrow('Either clientId or groupId must be provided');
    });
  });

  describe('approveAccount', () => {
    it('should approve a fixed deposit account and calculate maturity correctly', async () => {
      // Mock data
      const accountId = 'fd-account-id';
      const request: FixedDepositAccountApprovalRequest = {
        approvedOnDate: '2023-01-15',
        note: 'Approved after verification'
      };
      
      // Mock account query result
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            status: 'submitted_and_pending_approval',
            deposit_amount: 10000,
            deposit_period: 12,
            deposit_period_frequency_type_enum: 'months',
            interest_rate: 5.0,
            interest_compounding_period_type: 'monthly'
          }
        ]
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockResolvedValue(accountResult)
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute the function
      const result = await fixedDepositService.approveAccount(accountId, request);

      // Verify results
      expect(result).toBeDefined();
      expect(result.accountId).toBe(accountId);
      expect(result.savingsAccountId).toBe('savings-account-id');
      expect(result.approvedOnDate).toBe('2023-01-15');
      
      // Maturity date should be 2024-01-15 (1 year later)
      expect(result.maturityDate).toBe('2024-01-15');
      
      // Maturity amount should be calculated with compound interest
      // For 12 months at 5% with monthly compounding: P * (1 + r/n)^(nt)
      // 10000 * (1 + 0.05/12)^(12*1) = 10511.62 approximately
      expect(result.maturityAmount).toBeCloseTo(10511.62, 2);
      
      // Verify DB interactions
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      
      // 1. Get account details
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM fixed_deposit_account fda'),
        [accountId]
      );
      
      // 2. Update savings account status
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE savings_account'),
        expect.arrayContaining([
          expect.any(Date), // Approval date
          null, // User ID
          'savings-account-id'
        ])
      );
      
      // 3. Update fixed deposit account
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE fixed_deposit_account'),
        expect.arrayContaining([
          expect.any(Number), // Maturity amount
          expect.any(Date), // Maturity date
          expect.any(Number), // Interest earned
          null, // User ID
          accountId
        ])
      );
      
      // 4. Insert note
      expect(mockClient.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO savings_account_note'),
        expect.arrayContaining([
          'mocked-uuid', // Note ID
          'savings-account-id',
          'Approved after verification',
          null // User ID
        ])
      );
    });
    
    it('should throw an error for invalid account status', async () => {
      // Mock data
      const accountId = 'fd-account-id';
      const request: FixedDepositAccountApprovalRequest = {
        approvedOnDate: '2023-01-15'
      };
      
      // Mock account with invalid status
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            status: 'active' // Already active status
          }
        ]
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockResolvedValue(accountResult)
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute and verify the function throws appropriate error
      await expect(fixedDepositService.approveAccount(accountId, request))
        .rejects.toThrow('Cannot approve account with status active');
    });
  });

  describe('activateAccount', () => {
    it('should activate a fixed deposit account by creating initial deposit transaction', async () => {
      // Mock data
      const accountId = 'fd-account-id';
      const request: FixedDepositAccountActivateRequest = {
        activatedOnDate: '2023-01-20',
        note: 'Account activated with initial deposit'
      };
      
      // Mock account query result
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            status: 'approved',
            deposit_amount: 10000,
            currency_code: 'USD'
          }
        ]
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockResolvedValue(accountResult)
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute the function
      const result = await fixedDepositService.activateAccount(accountId, request);

      // Verify results
      expect(result).toBeDefined();
      expect(result.accountId).toBe(accountId);
      expect(result.savingsAccountId).toBe('savings-account-id');
      expect(result.activatedOnDate).toBe('2023-01-20');
      expect(result.transactionId).toBe('mocked-uuid');
      
      // Verify DB interactions
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      
      // 1. Get account details
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM fixed_deposit_account fda'),
        [accountId]
      );
      
      // 2. Create savings account transaction (deposit)
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO savings_account_transaction'),
        expect.arrayContaining([
          'mocked-uuid', // Transaction ID
          'savings-account-id',
          'deposit',
          expect.any(Date), // Activation date
          10000, // Deposit amount
          'USD',
          10000, // Running balance
          expect.any(Date), // Activation date
          null // User ID
        ])
      );
      
      // 3. Create fixed deposit transaction
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO fixed_deposit_transaction'),
        expect.arrayContaining([
          'mocked-uuid', // FD transaction ID
          'mocked-uuid', // Savings transaction ID
          accountId,
          'deposit',
          10000, // Deposit amount
          10000, // Balance after transaction
          null // User ID
        ])
      );
      
      // 4. Update savings account status
      expect(mockClient.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('UPDATE savings_account'),
        expect.arrayContaining([
          expect.any(Date), // Activation date
          null, // User ID
          'savings-account-id'
        ])
      );
    });
    
    it('should throw an error for invalid account status', async () => {
      // Mock data
      const accountId = 'fd-account-id';
      const request: FixedDepositAccountActivateRequest = {
        activatedOnDate: '2023-01-20'
      };
      
      // Mock account with invalid status
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            status: 'pending_approval' // Wrong status
          }
        ]
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockResolvedValue(accountResult)
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute and verify the function throws appropriate error
      await expect(fixedDepositService.activateAccount(accountId, request))
        .rejects.toThrow('Cannot activate account with status pending_approval');
    });
  });
});