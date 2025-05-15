/**
 * Unit tests for Account Handler
 */

import * as accountHandler from '../../../handlers/accounting/accountHandler';
import { accountingService } from '../../../services/accountingService';
import { createMockRequest, createMockResponse } from '../../test-utils';

// Mock the accountingService
jest.mock('../../../services/accountingService', () => ({
  accountingService: {
    createGLAccount: jest.fn(),
    updateGLAccount: jest.fn(),
    deleteGLAccount: jest.fn(),
    getGLAccount: jest.fn(),
    getGLAccounts: jest.fn(),
    getGLAccountsTree: jest.fn()
  }
}));

describe('Account Handler', () => {
  // Test createGLAccount handler
  describe('createGLAccount', () => {
    it('should create a GL account and return success response', async () => {
      // Mock the service function
      (accountingService.createGLAccount as jest.Mock).mockResolvedValueOnce('123');
      
      // Create mock request and response
      const req = createMockRequest({
        input: {
          name: 'Test Account',
          glCode: 'TEST001',
          type: 'ASSET',
          usage: 'DETAIL',
          description: 'Test account',
          manualEntriesAllowed: true
        }
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.createGLAccount(req as any, res as any);
      
      // Verify the service was called correctly
      expect(accountingService.createGLAccount).toHaveBeenCalledWith(
        {
          name: 'Test Account',
          glCode: 'TEST001',
          type: 'ASSET',
          usage: 'DETAIL',
          description: 'Test account',
          manualEntriesAllowed: true
        },
        'test-user-id'
      );
      
      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        accountId: '123',
        message: 'GL account created successfully'
      });
    });
    
    it('should handle errors and return error response', async () => {
      // Mock the service function to throw an error
      (accountingService.createGLAccount as jest.Mock).mockRejectedValueOnce(new Error('Service error'));
      
      // Create mock request and response
      const req = createMockRequest({
        input: {
          name: 'Test Account',
          glCode: 'TEST001',
          type: 'ASSET',
          usage: 'DETAIL'
        }
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.createGLAccount(req as any, res as any);
      
      // Verify the error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service error'
      });
    });
  });
  
  // Test updateGLAccount handler
  describe('updateGLAccount', () => {
    it('should update a GL account and return success response', async () => {
      // Mock the service function
      const updatedAccount = {
        id: '123',
        name: 'Updated Account',
        glCode: 'TEST001',
        type: 'asset',
        usage: 'detail',
        description: 'Updated description',
        manualEntriesAllowed: true,
        disabled: false,
        parentId: null
      };
      (accountingService.updateGLAccount as jest.Mock).mockResolvedValueOnce(updatedAccount);
      
      // Create mock request and response
      const req = createMockRequest({
        input: {
          accountId: '123',
          name: 'Updated Account',
          description: 'Updated description'
        }
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.updateGLAccount(req as any, res as any);
      
      // Verify the service was called correctly
      expect(accountingService.updateGLAccount).toHaveBeenCalledWith(
        '123',
        {
          name: 'Updated Account',
          description: 'Updated description'
        },
        'test-user-id'
      );
      
      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        account: updatedAccount,
        message: 'GL account updated successfully'
      });
    });
  });
  
  // Test deleteGLAccount handler
  describe('deleteGLAccount', () => {
    it('should delete a GL account and return success response', async () => {
      // Mock the service function
      (accountingService.deleteGLAccount as jest.Mock).mockResolvedValueOnce();
      
      // Create mock request and response
      const req = createMockRequest({
        input: {
          accountId: '123'
        }
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.deleteGLAccount(req as any, res as any);
      
      // Verify the service was called correctly
      expect(accountingService.deleteGLAccount).toHaveBeenCalledWith('123');
      
      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'GL account deleted successfully'
      });
    });
  });
  
  // Test getGLAccount handler
  describe('getGLAccount', () => {
    it('should retrieve a GL account and return success response', async () => {
      // Mock the service function
      const account = {
        id: '123',
        name: 'Test Account',
        glCode: 'TEST001',
        type: 'asset',
        usage: 'detail',
        description: 'Test account',
        manualEntriesAllowed: true,
        disabled: false,
        parentId: null
      };
      (accountingService.getGLAccount as jest.Mock).mockResolvedValueOnce(account);
      
      // Create mock request and response
      const req = createMockRequest({
        input: {
          accountId: '123'
        }
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.getGLAccount(req as any, res as any);
      
      // Verify the service was called correctly
      expect(accountingService.getGLAccount).toHaveBeenCalledWith('123');
      
      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        account
      });
    });
  });
  
  // Test getGLAccounts handler
  describe('getGLAccounts', () => {
    it('should retrieve GL accounts and return success response', async () => {
      // Mock the service function
      const accounts = {
        accounts: [
          {
            id: '123',
            name: 'Test Account',
            glCode: 'TEST001',
            type: 'asset',
            usage: 'detail',
            description: 'Test account',
            manualEntriesAllowed: true,
            disabled: false,
            parentId: null
          }
        ],
        totalCount: 1
      };
      (accountingService.getGLAccounts as jest.Mock).mockResolvedValueOnce(accounts);
      
      // Create mock request and response
      const req = createMockRequest({
        input: {
          type: 'asset',
          usage: 'detail',
          disabled: false,
          manualEntriesAllowed: true
        }
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.getGLAccounts(req as any, res as any);
      
      // Verify the service was called correctly
      expect(accountingService.getGLAccounts).toHaveBeenCalledWith(
        'asset',
        'detail',
        false,
        true
      );
      
      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...accounts
      });
    });
    
    it('should handle empty input and use defaults', async () => {
      // Mock the service function
      const accounts = {
        accounts: [],
        totalCount: 0
      };
      (accountingService.getGLAccounts as jest.Mock).mockResolvedValueOnce(accounts);
      
      // Create mock request and response with empty input
      const req = createMockRequest({
        input: {}
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.getGLAccounts(req as any, res as any);
      
      // Verify the service was called with undefined parameters
      expect(accountingService.getGLAccounts).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined
      );
    });
  });
  
  // Test getGLAccountsTree handler
  describe('getGLAccountsTree', () => {
    it('should retrieve GL accounts tree and return success response', async () => {
      // Mock the service function
      const accountsTree = [
        {
          id: '100',
          name: 'Assets',
          glCode: 'A100',
          type: 'asset',
          usage: 'header',
          disabled: false,
          parentId: null,
          children: [
            {
              id: '101',
              name: 'Cash',
              glCode: 'A101',
              type: 'asset',
              usage: 'detail',
              disabled: false,
              parentId: '100',
              children: []
            }
          ]
        }
      ];
      (accountingService.getGLAccountsTree as jest.Mock).mockResolvedValueOnce(accountsTree);
      
      // Create mock request and response
      const req = createMockRequest({
        input: {
          type: 'asset'
        }
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.getGLAccountsTree(req as any, res as any);
      
      // Verify the service was called correctly
      expect(accountingService.getGLAccountsTree).toHaveBeenCalledWith('asset');
      
      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        glAccountsTree: accountsTree
      });
    });
    
    it('should handle empty input and use defaults', async () => {
      // Mock the service function
      const accountsTree = [];
      (accountingService.getGLAccountsTree as jest.Mock).mockResolvedValueOnce(accountsTree);
      
      // Create mock request and response with empty input
      const req = createMockRequest({
        input: {}
      });
      const res = createMockResponse();
      
      // Call the handler
      await accountHandler.getGLAccountsTree(req as any, res as any);
      
      // Verify the service was called with undefined type
      expect(accountingService.getGLAccountsTree).toHaveBeenCalledWith(undefined);
    });
  });
});