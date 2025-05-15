/**
 * Test utilities for Accounting tests
 */

import { db } from '../utils/db';

/**
 * Mock a DB query response
 * @param rows The rows to return from the query
 */
export function mockDbQuery(rows: any[]) {
  (db.query as jest.Mock).mockResolvedValueOnce({ rows });
}

/**
 * Mock multiple DB query responses in sequence
 * @param responses Array of row arrays to return in sequence
 */
export function mockMultipleDbQueries(responses: any[][]) {
  responses.forEach(rows => {
    (db.query as jest.Mock).mockResolvedValueOnce({ rows });
  });
}

/**
 * Mock a DB query error
 * @param error The error to throw
 */
export function mockDbQueryError(error: Error) {
  (db.query as jest.Mock).mockRejectedValueOnce(error);
}

/**
 * Create a mock request object for testing handlers
 * @param body The request body
 * @param sessionVariables Session variables to include
 */
export function createMockRequest(body: any, sessionVariables?: any) {
  return {
    body: {
      ...body,
      session_variables: sessionVariables || { 'x-hasura-user-id': 'test-user-id' }
    }
  };
}

/**
 * Create a mock response object for testing handlers
 */
export function createMockResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Create test account data for GL accounts
 */
export function createTestGLAccounts() {
  return [
    {
      id: '1',
      name: 'Cash',
      gl_code: '1001',
      account_type: 'asset',
      parent_id: null,
      disabled: false
    },
    {
      id: '2',
      name: 'Accounts Receivable',
      gl_code: '1002',
      account_type: 'asset',
      parent_id: null,
      disabled: false
    },
    {
      id: '3',
      name: 'Accounts Payable',
      gl_code: '2001',
      account_type: 'liability',
      parent_id: null,
      disabled: false
    },
    {
      id: '4',
      name: 'Revenue',
      gl_code: '4001',
      account_type: 'income',
      parent_id: null,
      disabled: false
    },
    {
      id: '5',
      name: 'Expenses',
      gl_code: '5001',
      account_type: 'expense',
      parent_id: null,
      disabled: false
    }
  ];
}

/**
 * Create test journal entries
 */
export function createTestJournalEntries() {
  return [
    {
      id: '1',
      account_id: '1',
      amount: 1000,
      type: 'debit',
      entry_date: '2023-01-01',
      transaction_id: 'txn-1',
      office_id: '1',
      reversed: false
    },
    {
      id: '2',
      account_id: '4',
      amount: 1000,
      type: 'credit',
      entry_date: '2023-01-01',
      transaction_id: 'txn-1',
      office_id: '1',
      reversed: false
    },
    {
      id: '3',
      account_id: '5',
      amount: 500,
      type: 'debit',
      entry_date: '2023-01-15',
      transaction_id: 'txn-2',
      office_id: '1',
      reversed: false
    },
    {
      id: '4',
      account_id: '1',
      amount: 500,
      type: 'credit',
      entry_date: '2023-01-15',
      transaction_id: 'txn-2',
      office_id: '1',
      reversed: false
    }
  ];
}