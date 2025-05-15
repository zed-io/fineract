import { jest } from '@jest/globals';
import { RecurringDepositPenaltyService } from '../../services/recurringDepositPenaltyService';
import { query, transaction } from '../../utils/db';

// Mock the database module
jest.mock('../../utils/db', () => ({
  query: jest.fn(),
  transaction: jest.fn((callback) => callback({ query: jest.fn() }))
}));

describe('RecurringDeposit Penalty Calculation Tests', () => {
  let service: RecurringDepositPenaltyService;
  
  beforeEach(() => {
    service = new RecurringDepositPenaltyService();
    jest.clearAllMocks();
  });
  
  describe('applyPenalties', () => {
    it('should correctly apply fixed penalties to overdue installments', async () => {
      // Mock account data
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
      
      // Mock overdue installment data
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
      
      // Mock penalty configuration data
      const mockPenaltyConfig = {
        id: 'penalty-config-1',
        product_id: 'prod-1',
        is_penalty_enabled: true,
        penalty_type: 'fixed',
        penalty_amount: 10,
        grace_period_days: 5,
        max_penalty_occurrences: 3
      };
      
      // Mock existing penalties check
      const mockExistingPenalties = { count: '0' };
      
      // Mock getPenaltyChargeType to return a charge ID
      const getPenaltyChargeTypeSpy = jest.spyOn(service as any, 'getPenaltyChargeType');
      getPenaltyChargeTypeSpy.mockResolvedValue('charge-1');
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_penalty_config')) {
          return { rowCount: 1, rows: [mockPenaltyConfig] };
        } else if (sql.includes('FROM recurring_deposit_tiered_penalty')) {
          return { rowCount: 0, rows: [] };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('COUNT(*) FROM recurring_deposit_penalty_history')) {
          return { rowCount: 1, rows: [mockExistingPenalties] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Set up client with a mocked query function
      const mockClientQuery = jest.fn().mockReturnValue({ rowCount: 0, rows: [] });
      const mockClient = { query: mockClientQuery };
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        // Use the standard mock for most queries
        mockClientQuery.mockImplementation((sql, params) => queryMock(sql, params));
        return await callback(mockClient);
      });
      
      // Run the test function
      const result = await service.applyPenalties('2023-02-15');
      
      // Verify the results
      expect(result).toBeDefined();
      expect(result.totalAccountsProcessed).toBe(1);
      expect(result.totalPenaltiesApplied).toBe(1);
      expect(result.totalPenaltyAmount).toBe(10);
      expect(result.penalties.length).toBe(1);
      expect(result.penalties[0].penaltyAmount).toBe(10);
      expect(result.penalties[0].penaltyType).toBe('fixed');
      
      // Verify the database calls for applying penalties
      const insertChargeCalls = mockClientQuery.mock.calls.filter(call => 
        call[0].includes('INSERT INTO savings_account_charge')
      );
      
      expect(insertChargeCalls.length).toBe(1);
      expect(insertChargeCalls[0][1][3]).toBe(10); // Amount should be 10
      expect(insertChargeCalls[0][1][10]).toBe(true); // is_penalty should be true
    });
    
    it('should correctly apply percentage-based penalties', async () => {
      // Mock account data
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
      
      // Mock overdue installment data - higher amount to test percentage calculation
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
      
      // Mock penalty configuration with percentage type
      const mockPenaltyConfig = {
        id: 'penalty-config-1',
        product_id: 'prod-1',
        is_penalty_enabled: true,
        penalty_type: 'percentage',
        penalty_amount: 5, // 5% of deposit amount
        grace_period_days: 5,
        max_penalty_occurrences: 3
      };
      
      // Mock existing penalties check
      const mockExistingPenalties = { count: '0' };
      
      // Mock getPenaltyChargeType to return a charge ID
      const getPenaltyChargeTypeSpy = jest.spyOn(service as any, 'getPenaltyChargeType');
      getPenaltyChargeTypeSpy.mockResolvedValue('charge-1');
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_penalty_config')) {
          return { rowCount: 1, rows: [mockPenaltyConfig] };
        } else if (sql.includes('FROM recurring_deposit_tiered_penalty')) {
          return { rowCount: 0, rows: [] };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('COUNT(*) FROM recurring_deposit_penalty_history')) {
          return { rowCount: 1, rows: [mockExistingPenalties] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Set up client with a mocked query function
      const mockClientQuery = jest.fn().mockReturnValue({ rowCount: 0, rows: [] });
      const mockClient = { query: mockClientQuery };
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        // Use the standard mock for most queries
        mockClientQuery.mockImplementation((sql, params) => queryMock(sql, params));
        return await callback(mockClient);
      });
      
      // Run the test function
      const result = await service.applyPenalties('2023-02-15');
      
      // Verify the results - should be 5% of 200 = 10
      expect(result).toBeDefined();
      expect(result.totalPenaltiesApplied).toBe(1);
      expect(result.totalPenaltyAmount).toBe(10);
      expect(result.penalties[0].penaltyAmount).toBe(10);
      expect(result.penalties[0].penaltyType).toBe('percentage');
      
      // Verify the database calls for applying penalties
      const insertChargeCalls = mockClientQuery.mock.calls.filter(call => 
        call[0].includes('INSERT INTO savings_account_charge')
      );
      
      expect(insertChargeCalls.length).toBe(1);
      expect(insertChargeCalls[0][1][3]).toBe(10); // Amount should be 10 (5% of 200)
      expect(insertChargeCalls[0][1][7]).toBe('percent_of_amount'); // charge_calculation_type should reflect percentage
    });
    
    it('should apply tiered penalties based on days overdue and occurrences', async () => {
      // Mock account data
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
      
      // Mock overdue installment data
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: new Date('2023-01-01'), // 45 days overdue from test date
          deposit_amount: 100,
          deposit_amount_completed: 0,
          overdue_amount: 100
        }
      ];
      
      // Mock penalty configuration
      const mockPenaltyConfig = {
        id: 'penalty-config-1',
        product_id: 'prod-1',
        is_penalty_enabled: true,
        penalty_type: 'fixed',
        penalty_amount: 5, // Default amount, should use tiered instead
        grace_period_days: 5,
        max_penalty_occurrences: 3
      };
      
      // Mock tiered penalties with different levels based on days overdue
      const mockTieredPenalties = [
        {
          id: 'tier-1',
          config_id: 'penalty-config-1',
          tier_number: 1,
          days_overdue_start: 1,
          days_overdue_end: 15,
          occurrences_start: 1,
          occurrences_end: 3,
          penalty_type: 'fixed',
          penalty_amount: 10,
          max_penalty_amount: null
        },
        {
          id: 'tier-2',
          config_id: 'penalty-config-1',
          tier_number: 2,
          days_overdue_start: 16,
          days_overdue_end: 30,
          occurrences_start: 1,
          occurrences_end: 3,
          penalty_type: 'fixed',
          penalty_amount: 20,
          max_penalty_amount: null
        },
        {
          id: 'tier-3',
          config_id: 'penalty-config-1',
          tier_number: 3,
          days_overdue_start: 31,
          days_overdue_end: null, // No upper limit
          occurrences_start: 1,
          occurrences_end: 3,
          penalty_type: 'percentage',
          penalty_amount: 10, // 10% of deposit amount
          max_penalty_amount: 50
        }
      ];
      
      // Mock existing penalties check
      const mockExistingPenalties = { count: '0' };
      
      // Mock getPenaltyChargeType to return a charge ID
      const getPenaltyChargeTypeSpy = jest.spyOn(service as any, 'getPenaltyChargeType');
      getPenaltyChargeTypeSpy.mockResolvedValue('charge-1');
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_penalty_config')) {
          return { rowCount: 1, rows: [mockPenaltyConfig] };
        } else if (sql.includes('FROM recurring_deposit_tiered_penalty')) {
          return { rowCount: mockTieredPenalties.length, rows: mockTieredPenalties };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('COUNT(*) FROM recurring_deposit_penalty_history')) {
          return { rowCount: 1, rows: [mockExistingPenalties] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Set up client with a mocked query function
      const mockClientQuery = jest.fn().mockReturnValue({ rowCount: 0, rows: [] });
      const mockClient = { query: mockClientQuery };
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        // Use the standard mock for most queries
        mockClientQuery.mockImplementation((sql, params) => queryMock(sql, params));
        return await callback(mockClient);
      });
      
      // Run the test function with a specific date (Feb 15, 2023 - which is 45 days after Jan 1)
      const result = await service.applyPenalties('2023-02-15');
      
      // Verify the results - should use tier 3 (percentage-based, 10% of 100 = 10)
      expect(result).toBeDefined();
      expect(result.totalPenaltiesApplied).toBe(1);
      expect(result.penalties[0].penaltyType).toBe('percentage');
      expect(result.penalties[0].penaltyAmount).toBe(10);
      expect(result.penalties[0].tierApplied).toBe(3);
      
      // Verify charge DB insert uses the right values
      const insertChargeCalls = mockClientQuery.mock.calls.filter(call => 
        call[0].includes('INSERT INTO savings_account_charge')
      );
      expect(insertChargeCalls.length).toBe(1);
      
      // Additional data should include tier information
      const additionalData = JSON.parse(insertChargeCalls[0][1][11]);
      expect(additionalData.tierApplied).toBe(3);
    });
    
    it('should respect max penalty amounts for percentage-based calculations', async () => {
      // Mock account data
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
      
      // Mock overdue installment data with high amount to test max cap
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: new Date('2023-01-01'), // 45 days overdue from test date
          deposit_amount: 1000,
          deposit_amount_completed: 0,
          overdue_amount: 1000
        }
      ];
      
      // Mock tier that should apply with a max penalty amount
      const mockTieredPenalty = {
        id: 'tier-3',
        config_id: 'penalty-config-1',
        tier_number: 3,
        days_overdue_start: 31,
        days_overdue_end: null, // No upper limit
        occurrences_start: 1,
        occurrences_end: 3,
        penalty_type: 'percentage',
        penalty_amount: 10, // 10% of deposit amount would be 100, but max is 50
        max_penalty_amount: 50
      };
      
      // Mock penalty configuration
      const mockPenaltyConfig = {
        id: 'penalty-config-1',
        product_id: 'prod-1',
        is_penalty_enabled: true,
        penalty_type: 'fixed',
        penalty_amount: 5,
        grace_period_days: 5,
        max_penalty_occurrences: 3
      };
      
      // Mock existing penalties check
      const mockExistingPenalties = { count: '0' };
      
      // Mock getPenaltyChargeType to return a charge ID
      const getPenaltyChargeTypeSpy = jest.spyOn(service as any, 'getPenaltyChargeType');
      getPenaltyChargeTypeSpy.mockResolvedValue('charge-1');
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_penalty_config')) {
          return { rowCount: 1, rows: [mockPenaltyConfig] };
        } else if (sql.includes('FROM recurring_deposit_tiered_penalty')) {
          return { rowCount: 1, rows: [mockTieredPenalty] };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('COUNT(*) FROM recurring_deposit_penalty_history')) {
          return { rowCount: 1, rows: [mockExistingPenalties] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Set up client with a mocked query function
      const mockClientQuery = jest.fn().mockReturnValue({ rowCount: 0, rows: [] });
      const mockClient = { query: mockClientQuery };
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        // Use the standard mock for most queries
        mockClientQuery.mockImplementation((sql, params) => queryMock(sql, params));
        return await callback(mockClient);
      });
      
      // Run the test function with a specific date (Feb 15, 2023 - which is 45 days after Jan 1)
      const result = await service.applyPenalties('2023-02-15');
      
      // Verify the results - should be capped at 50 instead of 100 (10% of 1000)
      expect(result).toBeDefined();
      expect(result.totalPenaltiesApplied).toBe(1);
      expect(result.penalties[0].penaltyType).toBe('percentage');
      expect(result.penalties[0].penaltyAmount).toBe(50); // Should be capped at max
      
      // Verify database call with capped amount
      const insertChargeCalls = mockClientQuery.mock.calls.filter(call => 
        call[0].includes('INSERT INTO savings_account_charge')
      );
      expect(insertChargeCalls.length).toBe(1);
      expect(insertChargeCalls[0][1][3]).toBe(50); // Amount should be capped at 50
    });
    
    it('should not apply penalties within grace period', async () => {
      // Mock account data
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
      
      // Mock installment that is overdue but within grace period
      const mockOverdueInstallments = [
        {
          installment_id: 'inst-1',
          installment_number: 1,
          due_date: new Date('2023-02-13'), // Only 2 days overdue from test date (Feb 15)
          deposit_amount: 100,
          deposit_amount_completed: 0,
          overdue_amount: 100
        }
      ];
      
      // Mock penalty configuration with 5-day grace period
      const mockPenaltyConfig = {
        id: 'penalty-config-1',
        product_id: 'prod-1',
        is_penalty_enabled: true,
        penalty_type: 'fixed',
        penalty_amount: 10,
        grace_period_days: 5, // 5-day grace period
        max_penalty_occurrences: 3
      };
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_penalty_config')) {
          return { rowCount: 1, rows: [mockPenaltyConfig] };
        } else if (sql.includes('FROM recurring_deposit_tiered_penalty')) {
          return { rowCount: 0, rows: [] };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
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
      
      // Run the test
      const result = await service.applyPenalties('2023-02-15');
      
      // Verify no penalties were applied since it's within grace period
      expect(result).toBeDefined();
      expect(result.totalPenaltiesApplied).toBe(0);
      expect(result.penalties.length).toBe(0);
    });
    
    it('should respect maximum penalty occurrences limit', async () => {
      // Mock account data
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
      
      // Mock overdue installment data
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
      
      // Mock penalty configuration
      const mockPenaltyConfig = {
        id: 'penalty-config-1',
        product_id: 'prod-1',
        is_penalty_enabled: true,
        penalty_type: 'fixed',
        penalty_amount: 10,
        grace_period_days: 5,
        max_penalty_occurrences: 2 // Max 2 penalties per installment
      };
      
      // Mock existing penalties to be at the max limit already
      const mockExistingPenalties = { count: '2' };
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('FROM recurring_deposit_account rda')) {
          return { rowCount: mockAccounts.length, rows: mockAccounts };
        } else if (sql.includes('FROM recurring_deposit_penalty_config')) {
          return { rowCount: 1, rows: [mockPenaltyConfig] };
        } else if (sql.includes('FROM recurring_deposit_tiered_penalty')) {
          return { rowCount: 0, rows: [] };
        } else if (sql.includes('FROM recurring_deposit_schedule_installment rdsi')) {
          return { rowCount: mockOverdueInstallments.length, rows: mockOverdueInstallments };
        } else if (sql.includes('COUNT(*) FROM recurring_deposit_penalty_history')) {
          return { rowCount: 1, rows: [mockExistingPenalties] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Mock getPenaltyChargeType to verify it's not called
      const getPenaltyChargeTypeSpy = jest.spyOn(service as any, 'getPenaltyChargeType');
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: queryMock
        };
        return await callback(mockClient);
      });
      
      // Run the test
      const result = await service.applyPenalties('2023-02-15');
      
      // Verify no penalties were applied since max occurrences is reached
      expect(result).toBeDefined();
      expect(result.totalPenaltiesApplied).toBe(0);
      expect(result.penalties.length).toBe(0);
      
      // Verify getPenaltyChargeType was not called
      expect(getPenaltyChargeTypeSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('waivePenalty', () => {
    it('should correctly waive a penalty', async () => {
      // Mock penalty history data
      const mockPenalty = {
        id: 'penalty-1',
        account_id: 'rd-account-1',
        savings_account_charge_id: 'charge-1',
        charge_id: 'charge-1', // Used in the join
        installment_id: 'inst-1',
        installment_number: 1,
        due_date: new Date('2023-01-15'),
        penalty_date: new Date('2023-01-21'),
        days_overdue: 6,
        missed_occurrences: 1,
        penalty_type: 'fixed',
        penalty_amount: 10,
        is_waived: false,
        waived_date: null,
        waived_by: null,
        waiver_reason: null
      };
      
      // Mock database query responses
      const queryMock = query as jest.Mock;
      queryMock.mockImplementation((sql, params) => {
        if (sql.includes('SELECT rdph.*, sac.id as charge_id')) {
          return { rowCount: 1, rows: [mockPenalty] };
        }
        return { rowCount: 0, rows: [] };
      });
      
      // Set up client with a mocked query function
      const mockClientQuery = jest.fn().mockReturnValue({ rowCount: 0, rows: [] });
      const mockClient = { query: mockClientQuery };
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        // For the first query to get the penalty info, use our mock data
        mockClientQuery.mockImplementationOnce(() => ({ rowCount: 1, rows: [mockPenalty] }));
        
        // For subsequent updates, return successful update
        mockClientQuery.mockImplementation(() => ({ rowCount: 1, rows: [] }));
        
        return await callback(mockClient);
      });
      
      // Create test waiver request
      const waiverRequest = {
        penaltyId: 'penalty-1',
        waiverReason: 'Client hardship',
        waiveDate: '2023-02-15'
      };
      
      // Run the test
      const result = await service.waivePenalty(waiverRequest, 'user-1');
      
      // Verify the result
      expect(result).toBe(true);
      
      // Verify penalty history and charge updates
      const updatePenaltyCall = mockClientQuery.mock.calls.find(call => 
        call[0].includes('UPDATE recurring_deposit_penalty_history')
      );
      
      expect(updatePenaltyCall).toBeDefined();
      expect(updatePenaltyCall[1]).toEqual([
        new Date('2023-02-15'), // waived_date
        'user-1', // waived_by
        'Client hardship', // waiver_reason
        'penalty-1' // penalty id
      ]);
      
      const updateChargeCall = mockClientQuery.mock.calls.find(call => 
        call[0].includes('UPDATE savings_account_charge')
      );
      
      expect(updateChargeCall).toBeDefined();
      expect(updateChargeCall[1]).toEqual([
        new Date('2023-02-15'), // waived_on_date
        'user-1', // modified_by
        'charge-1' // charge id
      ]);
    });
    
    it('should throw error when trying to waive already waived penalty', async () => {
      // Mock already waived penalty
      const mockPenalty = {
        id: 'penalty-1',
        account_id: 'rd-account-1',
        savings_account_charge_id: 'charge-1',
        charge_id: 'charge-1',
        is_waived: true, // Already waived
        waived_date: new Date('2023-02-01'),
        waived_by: 'other-user',
        waiver_reason: 'Previous waiver'
      };
      
      // Mock client query function
      const mockClientQuery = jest.fn().mockResolvedValue({ rowCount: 1, rows: [mockPenalty] });
      
      // Mock the transaction function
      (transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = { query: mockClientQuery };
        return await callback(mockClient);
      });
      
      // Create test waiver request
      const waiverRequest = {
        penaltyId: 'penalty-1',
        waiverReason: 'Client hardship',
        waiveDate: '2023-02-15'
      };
      
      // Run the test and expect it to throw
      await expect(service.waivePenalty(waiverRequest, 'user-1'))
        .rejects.toThrow('This penalty has already been waived');
    });
  });
});