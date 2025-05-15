/**
 * Unit tests for Trial Balance Report
 */

import { generateTrialBalanceReport } from '../../../services/reporting/financialAnalysisService';
import { db } from '../../../utils/db';
import { mockDbQuery, mockMultipleDbQueries, mockDbQueryError } from '../../test-utils';

describe('Trial Balance Report', () => {
  it('should generate a trial balance report successfully', async () => {
    // Mock currency query
    mockDbQuery([{ default_currency_code: 'USD' }]);
    
    // Mock office query (not provided in this test, should be skipped)
    
    // Mock accounts query
    mockDbQuery([
      {
        id: '1',
        name: 'Cash',
        gl_code: '1001',
        account_type: 'asset',
        debit_balance: '1000',
        credit_balance: '0'
      },
      {
        id: '2',
        name: 'Accounts Receivable',
        gl_code: '1002',
        account_type: 'asset',
        debit_balance: '500',
        credit_balance: '0'
      },
      {
        id: '3',
        name: 'Accounts Payable',
        gl_code: '2001',
        account_type: 'liability',
        debit_balance: '0',
        credit_balance: '800'
      },
      {
        id: '4',
        name: 'Revenue',
        gl_code: '4001',
        account_type: 'income',
        debit_balance: '0',
        credit_balance: '1200'
      },
      {
        id: '5',
        name: 'Expenses',
        gl_code: '5001',
        account_type: 'expense',
        debit_balance: '500',
        credit_balance: '0'
      }
    ]);
    
    // Call the function
    const result = await generateTrialBalanceReport('2023-01-31');
    
    // Verify the queries were called correctly
    expect(db.query).toHaveBeenCalledTimes(2);
    
    // Verify the accounts query
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WITH account_balances AS'),
      expect.arrayContaining(['2023-01-31'])
    );
    
    // Verify the result
    expect(result).toEqual({
      reportName: 'Trial Balance as of 2023-01-31',
      currency: 'USD',
      asOfDate: '2023-01-31',
      generatedOn: expect.any(String),
      accounts: [
        {
          id: '1',
          name: 'Cash',
          glCode: '1001',
          type: 'asset',
          debit: 1000,
          credit: 0
        },
        {
          id: '2',
          name: 'Accounts Receivable',
          glCode: '1002',
          type: 'asset',
          debit: 500,
          credit: 0
        },
        {
          id: '3',
          name: 'Accounts Payable',
          glCode: '2001',
          type: 'liability',
          debit: 0,
          credit: 800
        },
        {
          id: '4',
          name: 'Revenue',
          glCode: '4001',
          type: 'income',
          debit: 0,
          credit: 1200
        },
        {
          id: '5',
          name: 'Expenses',
          glCode: '5001',
          type: 'expense',
          debit: 500,
          credit: 0
        }
      ],
      summary: {
        totalDebits: 2000,
        totalCredits: 2000
      }
    });
    
    // Verify that the debits and credits balance
    expect(result.summary.totalDebits).toEqual(result.summary.totalCredits);
  });
  
  it('should include office name when officeId is provided', async () => {
    // Mock currency query
    mockDbQuery([{ default_currency_code: 'USD' }]);
    
    // Mock office query
    mockDbQuery([{ name: 'Head Office' }]);
    
    // Mock accounts query
    mockDbQuery([
      {
        id: '1',
        name: 'Cash',
        gl_code: '1001',
        account_type: 'asset',
        debit_balance: '1000',
        credit_balance: '0'
      }
    ]);
    
    // Call the function with officeId
    const result = await generateTrialBalanceReport('2023-01-31', '1');
    
    // Verify the queries were called correctly
    expect(db.query).toHaveBeenCalledTimes(3);
    
    // Verify the office query
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT name FROM fineract_default.office'),
      ['1']
    );
    
    // Verify the result contains the office name
    expect(result.reportName).toEqual('Trial Balance - Head Office as of 2023-01-31');
  });
  
  it('should use provided currency code', async () => {
    // No currency query needed as it's provided
    
    // Mock accounts query
    mockDbQuery([
      {
        id: '1',
        name: 'Cash',
        gl_code: '1001',
        account_type: 'asset',
        debit_balance: '1000',
        credit_balance: '0'
      }
    ]);
    
    // Call the function with currencyCode
    const result = await generateTrialBalanceReport('2023-01-31', undefined, 'EUR');
    
    // Verify only one query was made (accounts, no currency lookup)
    expect(db.query).toHaveBeenCalledTimes(1);
    
    // Verify the result uses the provided currency
    expect(result.currency).toEqual('EUR');
  });
  
  it('should handle errors gracefully', async () => {
    // Mock an error
    mockDbQueryError(new Error('Database error'));
    
    // Call the function and expect it to throw
    await expect(generateTrialBalanceReport('2023-01-31')).rejects.toThrow(
      'Failed to generate trial balance report: Database error'
    );
  });
});