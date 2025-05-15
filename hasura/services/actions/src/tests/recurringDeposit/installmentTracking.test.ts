import { jest } from '@jest/globals';
import { RecurringDepositService } from '../../services/recurringDepositService';
import { query, transaction } from '../../utils/db';

// Mock the database module
jest.mock('../../utils/db', () => ({
  query: jest.fn(),
  transaction: jest.fn((callback) => callback({ query: jest.fn() }))
}));

describe('RecurringDeposit Installment Tracking Tests', () => {
  let service: RecurringDepositService;
  
  beforeEach(() => {
    service = new RecurringDepositService();
    jest.clearAllMocks();
  });
  
  describe('trackInstallments', () => {
    it('should correctly track installments and identify overdue ones', async () => {
      const mockAccounts = [
        { 
          id: 'rd-account-1', 
          savings_account_id: 'sa-1', 
          product_id: 'prod-1', 
          account_no: 'RD00001',
          client_id: 'client-1',
          currency_code: 'USD',
          client_name: 'John Doe',
          mandatory_recommended_deposit_amount: 100
        }
      ];
      
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: '2023-01-15',
          deposit_amount: 100,
          deposit_amount_completed: 0,
          overdue_amount: 100
        },
        {
          installment_id: 'inst-2',
          installment_number: 2,
          due_date: '2023-02-15',
          deposit_amount: 100,
          deposit_amount_completed: 50,
          overdue_amount: 50
        }
      ];
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('FROM savings_account_charge sac')) {
          return { rowCount: 0, rows: [{ count: '0' }] };
        } else if (sql.includes('SELECT id FROM recurring_deposit_schedule_installment')) {
          return { rowCount: 1, rows: [{ id: 'inst-1' }] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: queryMock
        };
        return await callback(mockClient);
      });
      
      // Test without applying penalties
      const trackingResult = await service.trackInstallments('2023-03-01', false, 'user-1');
      
      // Verify the results
      expect(trackingResult).toBeDefined();
      expect(trackingResult.totalAccountsChecked).toBe(1);
      expect(trackingResult.accountsWithOverdueInstallments).toBe(1);
      expect(trackingResult.totalOverdueInstallments).toBe(2);
      expect(trackingResult.totalOverdueAmount).toBe(150);
      expect(trackingResult.accounts.length).toBe(1);
      expect(trackingResult.accounts[0].accountId).toBe('rd-account-1');
      expect(trackingResult.accounts[0].overdueInstallments).toBe(2);
      expect(trackingResult.accounts[0].totalOverdueAmount).toBe(150);
      expect(trackingResult.accounts[0].penaltyApplied).toBe(false);
    });
    
    it('should apply penalties to overdue installments when enabled', async () => {
      const mockAccounts = [
        { 
          id: 'rd-account-1', 
          savings_account_id: 'sa-1', 
          product_id: 'prod-1', 
          account_no: 'RD00001',
          client_id: 'client-1',
          currency_code: 'USD',
          client_name: 'John Doe',
          mandatory_recommended_deposit_amount: 100
        }
      ];
      
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: new Date('2023-01-15'),
          deposit_amount: 100,
          deposit_amount_completed: 0,
          overdue_amount: 100
        }
      ];
      
      // Mock getPenaltyConfig to return test config
      const getPenaltyConfigSpy = jest.spyOn(service as any, 'getPenaltyConfig');
      getPenaltyConfigSpy.mockResolvedValue({
        enableAutoPenalty: true,
        penaltyType: 'fixed',
        penaltyAmount: 10,
        gracePeriodDays: 5,
        maxPenaltiesPerInstallment: 1
      });
      
      // Mock applyPenaltyCharge to return a charge ID
      const applyPenaltyChargeSpy = jest.spyOn(service as any, 'applyPenaltyCharge');
      applyPenaltyChargeSpy.mockResolvedValue('charge-1');
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('FROM savings_account_charge sac')) {
          return { rowCount: 0, rows: [{ count: '0' }] };
        } else if (sql.includes('SELECT id FROM recurring_deposit_schedule_installment')) {
          return { rowCount: 1, rows: [{ id: 'inst-1' }] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: queryMock
        };
        return await callback(mockClient);
      });
      
      // Test with penalty application enabled
      const trackingResult = await service.trackInstallments('2023-03-01', true, 'user-1');
      
      // Verify the results
      expect(trackingResult).toBeDefined();
      expect(trackingResult.totalAccountsChecked).toBe(1);
      expect(trackingResult.accountsWithOverdueInstallments).toBe(1);
      expect(trackingResult.totalOverdueInstallments).toBe(1);
      expect(trackingResult.totalPenaltiesApplied).toBe(1);
      expect(trackingResult.totalPenaltyAmount).toBe(10);
      expect(trackingResult.accounts[0].penaltyApplied).toBe(true);
      expect(trackingResult.accounts[0].penaltyAmount).toBe(10);
      
      // Verify penalty was applied
      expect(applyPenaltyChargeSpy).toHaveBeenCalledWith(
        expect.anything(), // client
        'rd-account-1', // accountId
        'sa-1', // savingsAccountId
        'USD', // currencyCode
        1, // installmentNumber
        10, // penaltyAmount
        expect.any(Date), // penaltyDate
        'user-1' // userId
      );
    });
    
    it('should respect the maximum penalties per installment limit', async () => {
      const mockAccounts = [
        { 
          id: 'rd-account-1', 
          savings_account_id: 'sa-1', 
          product_id: 'prod-1', 
          account_no: 'RD00001',
          client_id: 'client-1',
          currency_code: 'USD',
          client_name: 'John Doe',
          mandatory_recommended_deposit_amount: 100
        }
      ];
      
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: new Date('2023-01-15'),
          deposit_amount: 100,
          deposit_amount_completed: 0,
          overdue_amount: 100
        }
      ];
      
      // Mock getPenaltyConfig to return test config
      const getPenaltyConfigSpy = jest.spyOn(service as any, 'getPenaltyConfig');
      getPenaltyConfigSpy.mockResolvedValue({
        enableAutoPenalty: true,
        penaltyType: 'fixed',
        penaltyAmount: 10,
        gracePeriodDays: 5,
        maxPenaltiesPerInstallment: 1
      });
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('FROM savings_account_charge sac')) {
          // Simulate existing penalty
          return { rowCount: 1, rows: [{ count: '1' }] };
        } else if (sql.includes('SELECT id FROM recurring_deposit_schedule_installment')) {
          return { rowCount: 1, rows: [{ id: 'inst-1' }] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: queryMock
        };
        return await callback(mockClient);
      });
      
      // Mock applyPenaltyCharge to verify it's not called
      const applyPenaltyChargeSpy = jest.spyOn(service as any, 'applyPenaltyCharge');
      
      // Test with penalty application enabled but max penalties reached
      const trackingResult = await service.trackInstallments('2023-03-01', true, 'user-1');
      
      // Verify no new penalties were applied
      expect(trackingResult.totalPenaltiesApplied).toBe(0);
      expect(applyPenaltyChargeSpy).not.toHaveBeenCalled();
    });
    
    it('should calculate percentage-based penalties correctly', async () => {
      const mockAccounts = [
        { 
          id: 'rd-account-1', 
          savings_account_id: 'sa-1', 
          product_id: 'prod-1', 
          account_no: 'RD00001',
          client_id: 'client-1',
          currency_code: 'USD',
          client_name: 'John Doe',
          mandatory_recommended_deposit_amount: 100
        }
      ];
      
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: new Date('2023-01-15'),
          deposit_amount: 200,
          deposit_amount_completed: 0,
          overdue_amount: 200
        }
      ];
      
      // Mock getPenaltyConfig to return test config with percentage-based penalty
      const getPenaltyConfigSpy = jest.spyOn(service as any, 'getPenaltyConfig');
      getPenaltyConfigSpy.mockResolvedValue({
        enableAutoPenalty: true,
        penaltyType: 'percentage',
        penaltyAmount: 5, // 5% of installment amount
        gracePeriodDays: 5,
        maxPenaltiesPerInstallment: 1
      });
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('FROM savings_account_charge sac')) {
          return { rowCount: 0, rows: [{ count: '0' }] };
        } else if (sql.includes('SELECT id FROM recurring_deposit_schedule_installment')) {
          return { rowCount: 1, rows: [{ id: 'inst-1' }] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: queryMock
        };
        return await callback(mockClient);
      });
      
      // Mock applyPenaltyCharge to capture the penalty amount
      const applyPenaltyChargeSpy = jest.spyOn(service as any, 'applyPenaltyCharge');
      applyPenaltyChargeSpy.mockResolvedValue('charge-1');
      
      // Test with percentage-based penalty
      await service.trackInstallments('2023-03-01', true, 'user-1');
      
      // Verify penalty amount was calculated correctly (5% of 200 = 10)
      expect(applyPenaltyChargeSpy).toHaveBeenCalledWith(
        expect.anything(), // client
        'rd-account-1', // accountId
        'sa-1', // savingsAccountId
        'USD', // currencyCode
        1, // installmentNumber
        10, // penaltyAmount (5% of 200)
        expect.any(Date), // penaltyDate
        'user-1' // userId
      );
    });
    
    it('should update account overdue information', async () => {
      const mockAccounts = [
        { 
          id: 'rd-account-1', 
          savings_account_id: 'sa-1', 
          product_id: 'prod-1', 
          account_no: 'RD00001',
          client_id: 'client-1',
          currency_code: 'USD',
          client_name: 'John Doe',
          mandatory_recommended_deposit_amount: 100
        }
      ];
      
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: new Date('2023-01-15'),
          deposit_amount: 100,
          deposit_amount_completed: 0,
          overdue_amount: 100
        },
        {
          installment_id: 'inst-2',
          installment_number: 2,
          due_date: new Date('2023-02-15'),
          deposit_amount: 100,
          deposit_amount_completed: 0,
          overdue_amount: 100
        }
      ];
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('FROM savings_account_charge sac')) {
          return { rowCount: 0, rows: [{ count: '0' }] };
        } else if (sql.includes('SELECT id FROM recurring_deposit_schedule_installment')) {
          return { rowCount: 1, rows: [{ id: 'inst-1' }] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Set up client with a mocked query function that we can track
      const mockClientQuery = jest.fn().mockReturnValue({ rowCount: 0, rows: [] });
      const mockClient = { query: mockClientQuery };
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        // Use the standard mock for most queries
        mockClientQuery.mockImplementation((sql, params) => queryMock(sql, params));
        return await callback(mockClient);
      });
      
      // Mock getPenaltyConfig to return test config
      const getPenaltyConfigSpy = jest.spyOn(service as any, 'getPenaltyConfig');
      getPenaltyConfigSpy.mockResolvedValue({
        enableAutoPenalty: false,
        penaltyType: 'fixed',
        penaltyAmount: 10,
        gracePeriodDays: 5,
        maxPenaltiesPerInstallment: 1
      });
      
      // Test tracking functionality
      await service.trackInstallments('2023-03-01', false, 'user-1');
      
      // Verify the account was updated with overdue information
      const updateCalls = mockClientQuery.mock.calls.filter(call => 
        call[0].includes('UPDATE recurring_deposit_account_recurring_detail')
      );
      
      expect(updateCalls.length).toBe(1);
      expect(updateCalls[0][1]).toEqual([
        200, // total_overdue_amount (100 + 100)
        2,   // no_of_overdue_installments
        'user-1',
        'rd-account-1'
      ]);
    });
  });
});