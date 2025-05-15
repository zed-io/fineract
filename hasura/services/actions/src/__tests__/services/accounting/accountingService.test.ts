/**
 * Unit tests for Accounting Service
 */

import { accountingService } from '../../../services/accountingService';
import { db } from '../../../utils/db';
import { mockDbQuery, mockMultipleDbQueries, mockDbQueryError } from '../../test-utils';

describe('Accounting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test createGLAccount
  describe('createGLAccount', () => {
    it('should create a GL account successfully', async () => {
      // Mock the insert query
      mockDbQuery([{ id: '123' }]);

      // Call the function
      const result = await accountingService.createGLAccount({
        name: 'Test Account',
        glCode: 'TEST001',
        type: 'ASSET',
        usage: 'DETAIL',
        description: 'Test account',
        manualEntriesAllowed: true
      }, 'test-user');

      // Verify the query was called with correct parameters
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.gl_account'),
        expect.arrayContaining(['Test Account', 'TEST001', 'asset', 'detail', 'Test account', true, 'test-user'])
      );

      // Verify the result
      expect(result).toBe('123');
    });

    it('should throw an error if the database query fails', async () => {
      // Mock a database error
      mockDbQueryError(new Error('Database error'));

      // Call the function and expect it to throw
      await expect(accountingService.createGLAccount({
        name: 'Test Account',
        glCode: 'TEST001',
        type: 'ASSET',
        usage: 'DETAIL',
        description: 'Test account',
        manualEntriesAllowed: true
      }, 'test-user')).rejects.toThrow('Failed to create GL account: Database error');
    });
  });

  // Test getGLAccount
  describe('getGLAccount', () => {
    it('should retrieve a GL account successfully', async () => {
      // Mock the account query
      mockDbQuery([{
        id: '123',
        name: 'Test Account',
        gl_code: 'TEST001',
        account_type: 'asset',
        account_usage: 'detail',
        description: 'Test account',
        manual_entries_allowed: true,
        disabled: false,
        parent_id: null,
        created_by: 'test-user',
        created_on: '2023-01-01',
        last_modified_by: null,
        last_modified_on: null
      }]);

      // Call the function
      const result = await accountingService.getGLAccount('123');

      // Verify the query was called correctly
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM fineract_default.gl_account'),
        ['123']
      );

      // Verify the result
      expect(result).toEqual({
        id: '123',
        name: 'Test Account',
        glCode: 'TEST001',
        type: 'asset',
        usage: 'detail',
        description: 'Test account',
        manualEntriesAllowed: true,
        disabled: false,
        parentId: null,
        createdBy: 'test-user',
        createdOn: '2023-01-01',
        lastModifiedBy: null,
        lastModifiedOn: null
      });
    });

    it('should throw an error if the account is not found', async () => {
      // Mock empty result
      mockDbQuery([]);

      // Call the function and expect it to throw
      await expect(accountingService.getGLAccount('123')).rejects.toThrow('GL account not found: 123');
    });
  });

  // Test updateGLAccount
  describe('updateGLAccount', () => {
    it('should update a GL account successfully', async () => {
      // Mock the check query (account exists)
      mockDbQuery([{ exists: true }]);

      // Mock the update query
      mockDbQuery([{
        id: '123',
        name: 'Updated Account',
        gl_code: 'TEST001',
        account_type: 'asset',
        account_usage: 'detail',
        description: 'Updated description',
        manual_entries_allowed: true,
        disabled: false,
        parent_id: null
      }]);

      // Call the function
      const result = await accountingService.updateGLAccount('123', {
        name: 'Updated Account',
        description: 'Updated description'
      }, 'test-user');

      // Verify the queries were called correctly
      expect(db.query).toHaveBeenCalledTimes(2);

      // Verify the update query
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fineract_default.gl_account'),
        expect.arrayContaining(['123', 'Updated Account', 'Updated description', 'test-user'])
      );

      // Verify the result
      expect(result).toEqual({
        id: '123',
        name: 'Updated Account',
        glCode: 'TEST001',
        type: 'asset',
        usage: 'detail',
        description: 'Updated description',
        manualEntriesAllowed: true,
        disabled: false,
        parentId: null
      });
    });

    it('should throw an error if the account does not exist', async () => {
      // Mock the check query (account doesn't exist)
      mockDbQuery([{ exists: false }]);

      // Call the function and expect it to throw
      await expect(accountingService.updateGLAccount('123', {
        name: 'Updated Account'
      }, 'test-user')).rejects.toThrow('GL account not found: 123');
    });
  });

  // Test deleteGLAccount
  describe('deleteGLAccount', () => {
    it('should delete a GL account successfully', async () => {
      // Mock the usage check query (no usage)
      mockDbQuery([{ count: '0' }]);

      // Mock the delete query
      mockDbQuery([{ id: '123' }]);

      // Call the function
      await accountingService.deleteGLAccount('123');

      // Verify the queries were called correctly
      expect(db.query).toHaveBeenCalledTimes(2);

      // Verify the delete query
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fineract_default.gl_account'),
        ['123']
      );
    });

    it('should throw an error if the account is in use', async () => {
      // Mock the usage check query (account in use)
      mockDbQuery([{ count: '5' }]);

      // Call the function and expect it to throw
      await expect(accountingService.deleteGLAccount('123')).rejects.toThrow(
        'Cannot delete GL account 123: It is used in 5 journal entries'
      );
    });
  });

  // Test getGLAccounts
  describe('getGLAccounts', () => {
    it('should retrieve GL accounts with filters', async () => {
      // Mock the accounts query
      mockDbQuery([
        {
          id: '123',
          name: 'Cash',
          gl_code: 'CASH001',
          account_type: 'asset',
          account_usage: 'detail',
          description: 'Cash account',
          manual_entries_allowed: true,
          disabled: false,
          parent_id: null
        },
        {
          id: '124',
          name: 'Bank Account',
          gl_code: 'BANK001',
          account_type: 'asset',
          account_usage: 'detail',
          description: 'Bank account',
          manual_entries_allowed: true,
          disabled: false,
          parent_id: null
        }
      ]);

      // Mock the count query
      mockDbQuery([{ total_count: '2' }]);

      // Call the function
      const result = await accountingService.getGLAccounts('asset', 'detail', false, true);

      // Verify the queries were called correctly
      expect(db.query).toHaveBeenCalledTimes(2);

      // Verify the query parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM fineract_default.gl_account'),
        expect.arrayContaining(['asset', 'detail', false, true])
      );

      // Verify the count query
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        expect.arrayContaining(['asset', 'detail', false, true])
      );

      // Verify the result
      expect(result).toEqual({
        accounts: [
          {
            id: '123',
            name: 'Cash',
            glCode: 'CASH001',
            type: 'asset',
            usage: 'detail',
            description: 'Cash account',
            manualEntriesAllowed: true,
            disabled: false,
            parentId: null
          },
          {
            id: '124',
            name: 'Bank Account',
            glCode: 'BANK001',
            type: 'asset',
            usage: 'detail',
            description: 'Bank account',
            manualEntriesAllowed: true,
            disabled: false,
            parentId: null
          }
        ],
        totalCount: 2
      });
    });
  });

  // Test getGLAccountsTree
  describe('getGLAccountsTree', () => {
    it('should retrieve GL accounts in a tree structure', async () => {
      // Mock the accounts query
      mockDbQuery([
        {
          id: '100',
          name: 'Assets',
          gl_code: 'A100',
          account_type: 'asset',
          account_usage: 'header',
          parent_id: null,
          disabled: false
        },
        {
          id: '101',
          name: 'Cash',
          gl_code: 'A101',
          account_type: 'asset',
          account_usage: 'detail',
          parent_id: '100',
          disabled: false
        },
        {
          id: '102',
          name: 'Bank',
          gl_code: 'A102',
          account_type: 'asset',
          account_usage: 'detail',
          parent_id: '100',
          disabled: false
        }
      ]);

      // Call the function
      const result = await accountingService.getGLAccountsTree('asset');

      // Verify the query was called correctly
      expect(db.query).toHaveBeenCalledTimes(1);

      // Verify the query parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM fineract_default.gl_account'),
        expect.arrayContaining(['asset'])
      );

      // Verify the result has the correct tree structure
      expect(result).toEqual([
        {
          id: '100',
          name: 'Assets',
          glCode: 'A100',
          type: 'asset',
          usage: 'header',
          parentId: null,
          disabled: false,
          children: [
            {
              id: '101',
              name: 'Cash',
              glCode: 'A101',
              type: 'asset',
              usage: 'detail',
              parentId: '100',
              disabled: false,
              children: []
            },
            {
              id: '102',
              name: 'Bank',
              glCode: 'A102',
              type: 'asset',
              usage: 'detail',
              parentId: '100',
              disabled: false,
              children: []
            }
          ]
        }
      ]);
    });

    it('should return an empty array if no accounts are found', async () => {
      // Mock empty result
      mockDbQuery([]);

      // Call the function
      const result = await accountingService.getGLAccountsTree('asset');

      // Verify the result
      expect(result).toEqual([]);
    });
  });

  // Test createJournalEntry
  describe('createJournalEntry', () => {
    it('should create a journal entry successfully', async () => {
      // Mock transaction ID query
      mockDbQuery([{ id: 'txn-123' }]);

      // Mock journal entry inserts
      mockDbQuery([{ id: 'je-1' }]);
      mockDbQuery([{ id: 'je-2' }]);

      // Call the function
      const result = await accountingService.createJournalEntry({
        officeId: '1',
        transactionDate: '2023-01-01',
        referenceNumber: 'REF001',
        description: 'Test transaction',
        entries: [
          {
            glAccountId: '100',
            type: 'DEBIT',
            amount: 1000
          },
          {
            glAccountId: '200',
            type: 'CREDIT',
            amount: 1000
          }
        ]
      }, 'test-user');

      // Verify the result
      expect(result).toBe('txn-123');

      // Verify the queries
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.acc_journal_transaction'),
        expect.arrayContaining(['MANUAL', 'REF001', 'Test transaction', 'test-user'])
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.gl_journal_entry'),
        expect.arrayContaining(['txn-123', '100', '1', '2023-01-01', 'debit', 1000, false, 'test-user'])
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.gl_journal_entry'),
        expect.arrayContaining(['txn-123', '200', '1', '2023-01-01', 'credit', 1000, false, 'test-user'])
      );
    });

    it('should validate that debits and credits balance', async () => {
      // Expect the function to reject with an error for unbalanced entries
      await expect(accountingService.createJournalEntry({
        officeId: '1',
        transactionDate: '2023-01-01',
        description: 'Unbalanced entry',
        entries: [
          {
            glAccountId: '100',
            type: 'DEBIT',
            amount: 1000
          },
          {
            glAccountId: '200',
            type: 'CREDIT',
            amount: 900
          }
        ]
      })).rejects.toThrow('Journal entries must balance (total debits must equal total credits)');
    });

    it('should require at least one debit and one credit entry', async () => {
      // Expect the function to reject with an error for entries with only debits
      await expect(accountingService.createJournalEntry({
        officeId: '1',
        transactionDate: '2023-01-01',
        description: 'Only debits',
        entries: [
          {
            glAccountId: '100',
            type: 'DEBIT',
            amount: 500
          },
          {
            glAccountId: '101',
            type: 'DEBIT',
            amount: 500
          }
        ]
      })).rejects.toThrow('Journal entries must have at least one debit and one credit entry');
    });
  });

  // Test reverseJournalEntry
  describe('reverseJournalEntry', () => {
    it('should reverse a journal entry successfully', async () => {
      // Mock existing entries query
      mockDbQuery([
        {
          id: 'je-1',
          transaction_id: 'txn-123',
          account_id: '100',
          office_id: '1',
          entry_date: '2023-01-01',
          type: 'debit',
          amount: 1000,
          description: 'Original entry'
        },
        {
          id: 'je-2',
          transaction_id: 'txn-123',
          account_id: '200',
          office_id: '1',
          entry_date: '2023-01-01',
          type: 'credit',
          amount: 1000,
          description: 'Original entry'
        }
      ]);

      // Mock the update query for marking as reversed
      mockDbQuery([{ affected_rows: 2 }]);

      // Mock transaction ID query for reversal transaction
      mockDbQuery([{ id: 'txn-456' }]);

      // Mock journal entry inserts for reversals
      mockDbQuery([{ id: 'je-3' }]);
      mockDbQuery([{ id: 'je-4' }]);

      // Call the function
      const result = await accountingService.reverseJournalEntry('txn-123', {
        transactionDate: '2023-01-05',
        description: 'Reversal of transaction',
        referenceNumber: 'REV001'
      }, 'test-user');

      // Verify the result
      expect(result).toBe('txn-456');

      // Verify the queries
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fineract_default.gl_journal_entry SET reversed = true'),
        ['txn-123']
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.acc_journal_transaction'),
        expect.arrayContaining(['REVERSAL', 'REV001', 'Reversal of transaction', 'test-user'])
      );

      // Should create reversal entries with opposite types
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.gl_journal_entry'),
        expect.arrayContaining(['txn-456', '100', '1', '2023-01-05', 'credit', 1000, false, 'test-user'])
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.gl_journal_entry'),
        expect.arrayContaining(['txn-456', '200', '1', '2023-01-05', 'debit', 1000, false, 'test-user'])
      );
    });

    it('should throw an error if the transaction does not exist', async () => {
      // Mock empty result for entry query
      mockDbQuery([]);

      // Expect the function to reject with an error
      await expect(accountingService.reverseJournalEntry('non-existent', {
        transactionDate: '2023-01-05',
        description: 'Reversal attempt'
      })).rejects.toThrow('Journal transaction not found: non-existent');
    });
  });

  // Test getJournalEntries
  describe('getJournalEntries', () => {
    it('should retrieve journal entries with filters', async () => {
      // Mock the journal entries query
      mockDbQuery([
        {
          transaction_id: 'txn-123',
          office_id: '1',
          office_name: 'Head Office',
          entry_date: '2023-01-01',
          transaction_type: 'MANUAL',
          description: 'First entry',
          reference_number: 'REF001',
          amount: '2000',
          created_by_username: 'admin'
        },
        {
          transaction_id: 'txn-456',
          office_id: '1',
          office_name: 'Head Office',
          entry_date: '2023-01-05',
          transaction_type: 'MANUAL',
          description: 'Second entry',
          reference_number: 'REF002',
          amount: '1500',
          created_by_username: 'admin'
        }
      ]);

      // Mock the count query
      mockDbQuery([{ total_count: '2' }]);

      // Call the function
      const result = await accountingService.getJournalEntries({
        fromDate: '2023-01-01',
        toDate: '2023-01-31',
        officeId: '1'
      });

      // Verify the queries
      expect(db.query).toHaveBeenCalledTimes(2);

      // Verify the result
      expect(result).toEqual({
        entries: [
          {
            transactionId: 'txn-123',
            officeId: '1',
            officeName: 'Head Office',
            transactionDate: '2023-01-01',
            transactionType: 'MANUAL',
            description: 'First entry',
            referenceNumber: 'REF001',
            amount: 2000,
            createdByUsername: 'admin'
          },
          {
            transactionId: 'txn-456',
            officeId: '1',
            officeName: 'Head Office',
            transactionDate: '2023-01-05',
            transactionType: 'MANUAL',
            description: 'Second entry',
            referenceNumber: 'REF002',
            amount: 1500,
            createdByUsername: 'admin'
          }
        ],
        totalCount: 2
      });
    });
  });

  // Test createGLClosure
  describe('createGLClosure', () => {
    it('should create a general ledger closure successfully', async () => {
      // Mock checking for existing closures
      mockDbQuery([{ count: '0' }]);

      // Mock the insert query
      mockDbQuery([{ id: 'closure-123' }]);

      // Call the function
      const result = await accountingService.createGLClosure({
        officeId: '1',
        closingDate: '2023-01-31',
        comments: 'Monthly closing'
      }, 'test-user');

      // Verify the result
      expect(result).toBe('closure-123');

      // Verify the queries
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) FROM fineract_default.acc_gl_closure'),
        ['1', '2023-01-31']
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fineract_default.acc_gl_closure'),
        expect.arrayContaining(['1', '2023-01-31', 'Monthly closing', 'test-user'])
      );
    });

    it('should not allow duplicate closures for the same date and office', async () => {
      // Mock checking for existing closures (one exists)
      mockDbQuery([{ count: '1' }]);

      // Expect the function to reject with an error
      await expect(accountingService.createGLClosure({
        officeId: '1',
        closingDate: '2023-01-31',
        comments: 'Duplicate closing'
      })).rejects.toThrow('A closing entry already exists for this office on the given date');
    });
  });

  // Test getGLClosures
  describe('getGLClosures', () => {
    it('should retrieve GL closures with filters', async () => {
      // Mock the closures query
      mockDbQuery([
        {
          id: 'closure-1',
          office_id: '1',
          office_name: 'Head Office',
          closing_date: '2023-01-31',
          is_deleted: false,
          comments: 'January closing',
          created_by: 'admin',
          created_date: '2023-02-01'
        },
        {
          id: 'closure-2',
          office_id: '1',
          office_name: 'Head Office',
          closing_date: '2023-02-28',
          is_deleted: false,
          comments: 'February closing',
          created_by: 'admin',
          created_date: '2023-03-01'
        }
      ]);

      // Mock the count query
      mockDbQuery([{ total_count: '2' }]);

      // Call the function
      const result = await accountingService.getGLClosures('1');

      // Verify the queries
      expect(db.query).toHaveBeenCalledTimes(2);

      // Verify the result
      expect(result).toEqual({
        closures: [
          {
            id: 'closure-1',
            officeId: '1',
            officeName: 'Head Office',
            closingDate: '2023-01-31',
            deleted: false,
            comments: 'January closing',
            createdBy: 'admin',
            createdDate: '2023-02-01'
          },
          {
            id: 'closure-2',
            officeId: '1',
            officeName: 'Head Office',
            closingDate: '2023-02-28',
            deleted: false,
            comments: 'February closing',
            createdBy: 'admin',
            createdDate: '2023-03-01'
          }
        ],
        totalCount: 2
      });
    });
  });

  // Test deleteGLClosure
  describe('deleteGLClosure', () => {
    it('should delete a GL closure successfully', async () => {
      // Mock the delete query
      mockDbQuery([{ affected_rows: 1 }]);

      // Call the function
      await accountingService.deleteGLClosure('closure-1');

      // Verify the query
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fineract_default.acc_gl_closure'),
        ['closure-1']
      );
    });

    it('should throw an error if the closure does not exist', async () => {
      // Mock no rows affected
      mockDbQuery([{ affected_rows: 0 }]);

      // Expect the function to reject with an error
      await expect(accountingService.deleteGLClosure('non-existent')).rejects.toThrow(
        'GL closure not found: non-existent'
      );
    });
  });
});