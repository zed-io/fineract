import { interestCalculationService, AccountType } from '../../../services/interestCalculationService';
import { query, transaction } from '../../../utils/db';
import Decimal from 'decimal.js';

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

describe('InterestCalculationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFixedDepositInterest', () => {
    it('should calculate simple interest correctly for fixed deposit', async () => {
      // Mock data
      const accountId = 'test-account-id';
      const calculationDate = '2023-01-31';
      const fromDate = '2023-01-01';
      
      // Mock account details
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            account_no: 'FD-001',
            currency_code: 'USD',
            currency_digits: 2,
            deposit_amount: 1000,
            deposit_period: 12,
            deposit_period_frequency_type_enum: 'months',
            interest_rate: 5,
            interest_compounding_period_type: 'none', // Simple interest
            interest_posting_period_type: 'monthly',
            interest_calculation_type: 'daily_balance',
            interest_calculation_days_in_year_type: '365_days',
            status: 'active',
            activated_on_date: new Date('2023-01-01'),
          },
        ],
      };
      
      // Set up mock responses
      (query as jest.Mock).mockImplementation((sql, params) => {
        if (sql.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountResult);
        }
        if (sql.includes('FROM interest_posting_history')) {
          return Promise.resolve({ rowCount: 0, rows: [{ last_posting_date: null }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });
      
      // Execute the function
      const result = await interestCalculationService.calculateInterest(
        accountId,
        AccountType.FIXED_DEPOSIT,
        calculationDate,
        fromDate,
        calculationDate
      );

      // Verify the results
      expect(result).toBeDefined();
      expect(result.accountId).toBe(accountId);
      expect(result.accountType).toBe(AccountType.FIXED_DEPOSIT);
      expect(result.balance).toBe('1000');
      expect(result.interestRate).toBe('5');
      
      // 30 days simple interest at 5% per year on $1000
      // 1000 * 0.05 * (30/365) = 4.11 (rounded to 2 decimal places)
      expect(parseFloat(result.interestEarned)).toBeCloseTo(4.11, 2);
      
      expect(result.fromDate).toBe(fromDate);
      expect(result.toDate).toBe(calculationDate);
      expect(result.daysInPeriod).toBe(30); // Days between Jan 1 and Jan 31
    });

    it('should calculate compound interest correctly for fixed deposit', async () => {
      // Mock data
      const accountId = 'test-account-id';
      const calculationDate = '2023-04-01';
      const fromDate = '2023-01-01';
      
      // Mock account details
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            account_no: 'FD-001',
            currency_code: 'USD',
            currency_digits: 2,
            deposit_amount: 10000,
            deposit_period: 12,
            deposit_period_frequency_type_enum: 'months',
            interest_rate: 6,
            interest_compounding_period_type: 'monthly', // Monthly compounding
            interest_posting_period_type: 'monthly',
            interest_calculation_type: 'daily_balance',
            interest_calculation_days_in_year_type: '365_days',
            status: 'active',
            activated_on_date: new Date('2023-01-01'),
          },
        ],
      };
      
      // Set up mock responses
      (query as jest.Mock).mockImplementation((sql, params) => {
        if (sql.includes('FROM fixed_deposit_account fda')) {
          return Promise.resolve(accountResult);
        }
        if (sql.includes('FROM interest_posting_history')) {
          return Promise.resolve({ rowCount: 0, rows: [{ last_posting_date: null }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });
      
      // Execute the function
      const result = await interestCalculationService.calculateInterest(
        accountId,
        AccountType.FIXED_DEPOSIT,
        calculationDate,
        fromDate,
        calculationDate
      );

      // Verify the results
      expect(result).toBeDefined();
      expect(result.accountId).toBe(accountId);
      expect(result.accountType).toBe(AccountType.FIXED_DEPOSIT);
      expect(result.balance).toBe('10000');
      expect(result.interestRate).toBe('6');
      
      // 3 months of monthly compounding at 6% per year on $10000
      // Principal * (1 + rate/periods)^(periods*time) - Principal
      // 10000 * (1 + 0.06/12)^(12*0.25) - 10000 = 150.76 (rounded to 2 decimal places)
      expect(parseFloat(result.interestEarned)).toBeCloseTo(150.76, 2);
      
      expect(result.fromDate).toBe(fromDate);
      expect(result.toDate).toBe(calculationDate);
      expect(result.daysInPeriod).toBe(90); // Days between Jan 1 and Apr 1
    });
    
    it('should throw an error for inactive accounts', async () => {
      // Mock data
      const accountId = 'test-account-id';
      const calculationDate = '2023-01-31';
      
      // Mock account details with inactive status
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            account_no: 'FD-001',
            currency_code: 'USD',
            status: 'pending_approval', // Inactive status
          },
        ],
      };
      
      // Set up mock responses
      (query as jest.Mock).mockImplementation(() => {
        return Promise.resolve(accountResult);
      });
      
      // Execute and verify the function throws appropriate error
      await expect(
        interestCalculationService.calculateInterest(
          accountId,
          AccountType.FIXED_DEPOSIT,
          calculationDate
        )
      ).rejects.toThrow('Cannot calculate interest for account with status pending_approval');
    });
  });

  describe('postFixedDepositInterest', () => {
    it('should post interest to fixed deposit account correctly', async () => {
      // Mock data
      const accountId = 'test-account-id';
      const interestAmount = 50.25;
      const postingDate = '2023-01-31';
      const fromDate = '2023-01-01';
      const toDate = '2023-01-31';
      
      // Mock account details
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            savings_account_id: 'savings-account-id',
            status: 'active',
            currency_code: 'USD',
            accrued_interest: 100.50,
            deposit_amount: 10000,
          },
        ],
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockImplementation(() => Promise.resolve(accountResult)),
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute the function
      const result = await interestCalculationService.postInterest(
        accountId,
        AccountType.FIXED_DEPOSIT,
        interestAmount,
        postingDate,
        fromDate,
        toDate
      );

      // Verify results
      expect(result).toBeDefined();
      expect(result.accountId).toBe(accountId);
      expect(result.accountType).toBe(AccountType.FIXED_DEPOSIT);
      expect(result.amount).toBe(interestAmount.toString());
      expect(result.date).toBe(postingDate);
      expect(result.fromDate).toBe(fromDate);
      expect(result.toDate).toBe(toDate);
      
      // Verify DB interactions
      expect(mockClient.query).toHaveBeenCalledTimes(6);
      
      // 1. Get account details
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM fixed_deposit_account fda'),
        [accountId]
      );
      
      // 2. Insert savings account transaction
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO savings_account_transaction'),
        expect.arrayContaining([
          expect.any(String), // Transaction ID
          'savings-account-id',
          'interest_posting',
          expect.any(Date), // Transaction date
          interestAmount,
          'USD',
          expect.any(Date), // Submitted on date
          null, // User ID (null in test)
        ])
      );
      
      // 3. Insert fixed deposit transaction
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO fixed_deposit_transaction'),
        expect.arrayContaining([
          expect.any(String), // Transaction ID
          expect.any(String), // Savings transaction ID
          accountId,
          'INTEREST_POSTING',
          interestAmount,
          null, // User ID (null in test)
        ])
      );
      
      // 4. Update fixed deposit account
      expect(mockClient.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('UPDATE fixed_deposit_account'),
        [
          100.50 + interestAmount, // New accrued interest
          null, // User ID (null in test)
          accountId,
        ]
      );
      
      // 5. Insert interest posting history
      expect(mockClient.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('INSERT INTO interest_posting_history'),
        expect.arrayContaining([
          expect.any(String), // History ID
          accountId,
          AccountType.FIXED_DEPOSIT,
          expect.any(String), // Transaction ID
          expect.any(Date), // Posting date
          expect.any(Date), // From date
          expect.any(Date), // To date
          interestAmount,
          10000, // Account deposit amount
          null, // User ID (null in test)
        ])
      );
      
      // 6. Update accrual records
      expect(mockClient.query).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('UPDATE interest_accrual'),
        expect.arrayContaining([
          expect.any(Date), // Posting date
          expect.any(String), // Transaction ID
          null, // User ID (null in test)
          accountId,
          AccountType.FIXED_DEPOSIT,
          expect.any(Date), // From date
          expect.any(Date), // To date
        ])
      );
    });
    
    it('should throw an error for invalid account status', async () => {
      // Mock data
      const accountId = 'test-account-id';
      const interestAmount = 50.25;
      const postingDate = '2023-01-31';
      const fromDate = '2023-01-01';
      const toDate = '2023-01-31';
      
      // Mock account details with inactive status
      const accountResult = {
        rowCount: 1,
        rows: [
          {
            id: accountId,
            status: 'closed', // Inactive status
          },
        ],
      };
      
      // Set up mock DB client
      const mockClient = {
        query: jest.fn().mockImplementation(() => Promise.resolve(accountResult)),
      };
      
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockClient);
      });
      
      // Execute and verify the function throws appropriate error
      await expect(
        interestCalculationService.postInterest(
          accountId,
          AccountType.FIXED_DEPOSIT,
          interestAmount,
          postingDate,
          fromDate,
          toDate
        )
      ).rejects.toThrow('Cannot post interest to account with status closed');
    });
  });
  
  describe('getDaysInYear', () => {
    it('should return correct days in year based on calculation type', () => {
      // This is testing a private method, so we need to use any to access it
      const service = interestCalculationService as any;
      
      // Test for "actual" type in a leap year
      const originalDateNow = Date.now;
      const mockDate = new Date(2020, 1, 1); // February 1, 2020 (leap year)
      global.Date.now = jest.fn(() => mockDate.getTime());
      
      expect(service.getDaysInYear('actual')).toBe(366);
      
      // Test for "actual" type in a non-leap year
      mockDate.setFullYear(2021); // 2021 is not a leap year
      expect(service.getDaysInYear('actual')).toBe(365);
      
      // Test for "360_days" type
      expect(service.getDaysInYear('360_days')).toBe(360);
      
      // Test for "365_days" type
      expect(service.getDaysInYear('365_days')).toBe(365);
      
      // Test default case
      expect(service.getDaysInYear(undefined)).toBe(365);
      expect(service.getDaysInYear('invalid_type')).toBe(365);
      
      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
  });
  
  describe('getCompoundingPeriodsPerYear', () => {
    it('should return correct compounding periods per year', () => {
      // This is testing a private method, so we need to use any to access it
      const service = interestCalculationService as any;
      
      expect(service.getCompoundingPeriodsPerYear('daily')).toBe(365);
      expect(service.getCompoundingPeriodsPerYear('weekly')).toBe(52);
      expect(service.getCompoundingPeriodsPerYear('biweekly')).toBe(26);
      expect(service.getCompoundingPeriodsPerYear('monthly')).toBe(12);
      expect(service.getCompoundingPeriodsPerYear('quarterly')).toBe(4);
      expect(service.getCompoundingPeriodsPerYear('semiannual')).toBe(2);
      expect(service.getCompoundingPeriodsPerYear('annual')).toBe(1);
      expect(service.getCompoundingPeriodsPerYear('none')).toBe(0);
      
      // Test default case
      expect(service.getCompoundingPeriodsPerYear('invalid_frequency')).toBe(12);
    });
  });
});