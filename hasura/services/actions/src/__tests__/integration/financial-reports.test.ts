/**
 * Integration tests for financial reports
 *
 * These tests verify that the API endpoints for financial reports work correctly,
 * mocking only the database layer, not the service layer.
 */

import express from 'express';
import { json } from 'body-parser';
import request from 'supertest';
import { reportingRoutes } from '../../handlers/reporting';
import { db } from '../../utils/db';
import { mockDbQuery, mockMultipleDbQueries, mockDbQueryError } from '../test-utils';

// Create a test app
const app = express();
app.use(json());
app.use('/api/reporting', reportingRoutes);

describe('Financial Reports API', () => {
  // Trial Balance Report
  describe('Trial Balance Report', () => {
    it('should generate a trial balance report', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

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
          name: 'Revenue',
          gl_code: '4001',
          account_type: 'income',
          debit_balance: '0',
          credit_balance: '1000'
        }
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/trial-balance')
        .send({
          input: {
            asOfDate: '2023-01-31'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.accounts.length).toBe(2);
      expect(response.body.report.summary.totalDebits).toBe(1000);
      expect(response.body.report.summary.totalCredits).toBe(1000);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error
      mockDbQueryError(new Error('Database error'));

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/trial-balance')
        .send({
          input: {
            asOfDate: '2023-01-31'
          }
        });

      // Verify error response
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Database error');
    });
  });

  // General Ledger Report
  describe('General Ledger Report', () => {
    it('should generate a general ledger report', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock accounts query
      mockDbQuery([
        {
          id: '1',
          name: 'Cash',
          gl_code: '1001',
          account_type: 'asset'
        }
      ]);

      // Mock opening balance query
      mockDbQuery([{ opening_balance: '500' }]);

      // Mock entries query
      mockDbQuery([
        {
          id: '1',
          entry_date: '2023-01-15',
          transaction_id: 'txn-1',
          description: 'Cash sale',
          type: 'debit',
          amount: '300',
          office_id: '1',
          office_name: 'Head Office',
          created_by_user_id: 'user-1',
          created_by_username: 'admin',
          transaction_type: 'MANUAL'
        }
      ]);

      // Mock closing balance query
      mockDbQuery([{ closing_balance: '800' }]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/general-ledger')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-01-31',
            accountId: '1'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.accounts.length).toBe(1);
      expect(response.body.report.accounts[0].openingBalance).toBe(500);
      expect(response.body.report.accounts[0].closingBalance).toBe(800);
      expect(response.body.report.accounts[0].entries.length).toBe(1);
    });

    it('should handle filtering by office', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock office query
      mockDbQuery([{ name: 'Branch Office' }]);

      // Mock accounts query
      mockDbQuery([
        {
          id: '1',
          name: 'Cash',
          gl_code: '1001',
          account_type: 'asset'
        }
      ]);

      // Mock opening balance query for filtered account
      mockDbQuery([{ opening_balance: '200' }]);

      // Mock entries query with office filter
      mockDbQuery([
        {
          id: '1',
          entry_date: '2023-01-15',
          transaction_id: 'txn-1',
          description: 'Branch transaction',
          type: 'debit',
          amount: '100',
          office_id: '2',
          office_name: 'Branch Office',
          created_by_user_id: 'user-1',
          created_by_username: 'admin',
          transaction_type: 'MANUAL'
        }
      ]);

      // Mock closing balance query with office filter
      mockDbQuery([{ closing_balance: '300' }]);

      // Make request to the endpoint with office filter
      const response = await request(app)
        .post('/api/reporting/general-ledger')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-01-31',
            accountId: '1',
            officeId: '2'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.reportName).toContain('Branch Office');
      expect(response.body.report.accounts[0].openingBalance).toBe(200);
      expect(response.body.report.accounts[0].closingBalance).toBe(300);
    });
  });

  // Journal Entry Report
  describe('Journal Entry Report', () => {
    it('should generate a journal entry report', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock journal transactions query
      mockDbQuery([
        {
          transaction_id: 'txn-1',
          entry_date: '2023-01-15',
          transaction_type: 'MANUAL',
          description: 'Cash sale',
          reference_number: 'REF001',
          created_by_user_id: 'user-1',
          created_by_username: 'admin',
          office_id: '1',
          office_name: 'Head Office'
        }
      ]);

      // Mock GL entries query
      mockDbQuery([
        {
          id: '1',
          account_id: '1',
          account_name: 'Cash',
          gl_code: '1001',
          type: 'debit',
          amount: '1000'
        },
        {
          id: '2',
          account_id: '4',
          account_name: 'Revenue',
          gl_code: '4001',
          type: 'credit',
          amount: '1000'
        }
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/journal-entries')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-01-31'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.entries.length).toBe(1);
      expect(response.body.report.entries[0].glEntries.length).toBe(2);
    });

    it('should filter journal entries by GL account', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock account query for filter
      mockDbQuery([{ name: 'Cash' }]);

      // Mock journal transactions query with account filter
      mockDbQuery([
        {
          transaction_id: 'txn-1',
          entry_date: '2023-01-15',
          transaction_type: 'MANUAL',
          description: 'Cash transaction',
          reference_number: 'REF001',
          created_by_user_id: 'user-1',
          created_by_username: 'admin',
          office_id: '1',
          office_name: 'Head Office'
        }
      ]);

      // Mock GL entries query for filtered account
      mockDbQuery([
        {
          id: '1',
          account_id: '1',
          account_name: 'Cash',
          gl_code: '1001',
          type: 'debit',
          amount: '500'
        },
        {
          id: '2',
          account_id: '4',
          account_name: 'Revenue',
          gl_code: '4001',
          type: 'credit',
          amount: '500'
        }
      ]);

      // Make request to the endpoint with account filter
      const response = await request(app)
        .post('/api/reporting/journal-entries')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-01-31',
            glAccountId: '1'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.reportName).toContain('Cash');
      expect(response.body.report.entries.length).toBe(1);
      expect(response.body.report.entries[0].glEntries.some(e => e.accountName === 'Cash')).toBe(true);
    });
  });

  // Cash Flow Statement
  describe('Cash Flow Statement', () => {
    it('should generate a cash flow statement', async () => {
      // Mock a series of DB responses
      mockMultipleDbQueries([
        // Currency query
        [{ default_currency_code: 'USD' }],

        // Beginning cash balance query
        [{ beginning_cash_balance: '1000' }],

        // Ending cash balance query
        [{ ending_cash_balance: '1500' }],

        // Operating activities query
        [{
          id: '1',
          name: 'Net Income',
          gl_code: '3001',
          classification: 'Income',
          amount: '600',
          previous_amount: '500'
        }],

        // Investing activities query
        [{
          id: '2',
          name: 'Equipment Purchase',
          gl_code: '1501',
          classification: 'Assets',
          amount: '-300',
          previous_amount: '-200'
        }],

        // Financing activities query
        [{
          id: '3',
          name: 'Loan Proceeds',
          gl_code: '2501',
          classification: 'Liabilities',
          amount: '200',
          previous_amount: '100'
        }]
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/cash-flow')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-01-31',
            includeComparative: true
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.operatingActivities.items.length).toBe(1);
      expect(response.body.report.investingActivities.items.length).toBe(1);
      expect(response.body.report.financingActivities.items.length).toBe(1);
      expect(response.body.report.summary.netCashFromOperating).toBe(600);
      expect(response.body.report.summary.netCashFromInvesting).toBe(-300);
      expect(response.body.report.summary.netCashFromFinancing).toBe(200);
      expect(response.body.report.summary.netIncreaseInCash).toBe(500);
      expect(response.body.report.summary.beginningCashBalance).toBe(1000);
      expect(response.body.report.summary.endingCashBalance).toBe(1500);
    });

    it('should generate a cash flow statement without comparative data', async () => {
      // Mock a series of DB responses
      mockMultipleDbQueries([
        // Currency query
        [{ default_currency_code: 'USD' }],

        // Beginning cash balance query
        [{ beginning_cash_balance: '1000' }],

        // Ending cash balance query
        [{ ending_cash_balance: '1500' }],

        // Operating activities query (without previous amounts)
        [{
          id: '1',
          name: 'Net Income',
          gl_code: '3001',
          classification: 'Income',
          amount: '600'
        }],

        // Investing activities query (without previous amounts)
        [{
          id: '2',
          name: 'Equipment Purchase',
          gl_code: '1501',
          classification: 'Assets',
          amount: '-300'
        }],

        // Financing activities query (without previous amounts)
        [{
          id: '3',
          name: 'Loan Proceeds',
          gl_code: '2501',
          classification: 'Liabilities',
          amount: '200'
        }]
      ]);

      // Make request to the endpoint without comparative data
      const response = await request(app)
        .post('/api/reporting/cash-flow')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-01-31'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report.operatingActivities.previousTotal).toBeUndefined();
      expect(response.body.report.summary.netIncreaseInCash).toBe(500);
      expect(response.body.report.summary.previousNetIncreaseInCash).toBeUndefined();
    });
  });

  // Income Statement
  describe('Income Statement Report', () => {
    it('should generate an income statement report', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock income accounts query
      mockDbQuery([
        {
          id: '1',
          name: 'Interest Income',
          gl_code: '4001',
          parent_id: null,
          classification: 'Interest',
          amount: '5000',
          previous_amount: '4500'
        },
        {
          id: '2',
          name: 'Fee Income',
          gl_code: '4002',
          parent_id: null,
          classification: 'Fees',
          amount: '1000',
          previous_amount: '800'
        }
      ]);

      // Mock expense accounts query
      mockDbQuery([
        {
          id: '3',
          name: 'Salary Expense',
          gl_code: '5001',
          parent_id: null,
          classification: 'Personnel',
          amount: '3000',
          previous_amount: '2800'
        },
        {
          id: '4',
          name: 'Office Rent',
          gl_code: '5002',
          parent_id: null,
          classification: 'Administrative',
          amount: '1000',
          previous_amount: '1000'
        }
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/income-statement')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-03-31',
            includeComparative: true
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();

      // Check income section
      expect(response.body.report.income.total).toBe(6000);
      expect(response.body.report.income.previousTotal).toBe(5300);
      expect(response.body.report.income.categories.length).toBe(2);

      // Check expense section
      expect(response.body.report.expenses.total).toBe(4000);
      expect(response.body.report.expenses.previousTotal).toBe(3800);
      expect(response.body.report.expenses.categories.length).toBe(2);

      // Check summary
      expect(response.body.report.summary.netIncome).toBe(2000);
      expect(response.body.report.summary.previousNetIncome).toBe(1500);
      expect(response.body.report.summary.changeInNetIncome).toBe(500);
    });
  });

  // Balance Sheet
  describe('Balance Sheet Report', () => {
    it('should generate a balance sheet report', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock asset accounts query
      mockDbQuery([
        {
          id: '1',
          name: 'Cash',
          gl_code: '1001',
          parent_id: null,
          classification: 'Current Assets',
          amount: '10000',
          previous_amount: '8000'
        },
        {
          id: '2',
          name: 'Loan Portfolio',
          gl_code: '1002',
          parent_id: null,
          classification: 'Current Assets',
          amount: '50000',
          previous_amount: '45000'
        }
      ]);

      // Mock liability accounts query
      mockDbQuery([
        {
          id: '3',
          name: 'Client Deposits',
          gl_code: '2001',
          parent_id: null,
          classification: 'Current Liabilities',
          amount: '30000',
          previous_amount: '28000'
        },
        {
          id: '4',
          name: 'Long-term Debt',
          gl_code: '2002',
          parent_id: null,
          classification: 'Long-term Liabilities',
          amount: '15000',
          previous_amount: '12000'
        }
      ]);

      // Mock equity accounts query
      mockDbQuery([
        {
          id: '5',
          name: 'Retained Earnings',
          gl_code: '3001',
          parent_id: null,
          classification: 'Equity',
          amount: '12000',
          previous_amount: '10000'
        },
        {
          id: '6',
          name: 'Current Year Earnings',
          gl_code: '3002',
          parent_id: null,
          classification: 'Equity',
          amount: '3000',
          previous_amount: '3000'
        }
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/balance-sheet')
        .send({
          input: {
            asOfDate: '2023-03-31',
            includeComparative: true
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();

      // Check assets section
      expect(response.body.report.assets.total).toBe(60000);
      expect(response.body.report.assets.previousTotal).toBe(53000);
      expect(response.body.report.assets.categories.length).toBe(1);

      // Check liabilities section
      expect(response.body.report.liabilities.total).toBe(45000);
      expect(response.body.report.liabilities.previousTotal).toBe(40000);
      expect(response.body.report.liabilities.categories.length).toBe(2);

      // Check equity section
      expect(response.body.report.equity.total).toBe(15000);
      expect(response.body.report.equity.previousTotal).toBe(13000);
      expect(response.body.report.equity.categories.length).toBe(1);

      // Check summary totals
      expect(response.body.report.summary.totalAssets).toBe(60000);
      expect(response.body.report.summary.totalLiabilities).toBe(45000);
      expect(response.body.report.summary.totalEquity).toBe(15000);
      expect(response.body.report.summary.totalLiabilities + response.body.report.summary.totalEquity).toBe(
        response.body.report.summary.totalAssets
      );
    });
  });

  // Financial Ratios
  describe('Financial Ratios Report', () => {
    it('should generate a financial ratios report', async () => {
      // Mock a bunch of queries for the ratios calculation
      mockMultipleDbQueries([
        // Balance sheet data for assets, liabilities, equity
        [{ total_assets: '100000', total_liabilities: '70000', total_equity: '30000' }],

        // Income statement data for revenue, expenses, net income
        [{ total_revenue: '50000', total_expenses: '40000', net_income: '10000' }],

        // Loan portfolio data
        [{
          gross_loan_portfolio: '80000',
          par_30: '4000',
          par_90: '2000',
          loans_written_off: '1000'
        }],

        // Account balances for ratio calculations
        [{
          loan_loss_reserve: '3000',
          cash_and_equivalents: '10000',
          current_assets: '40000',
          current_liabilities: '20000'
        }],

        // Expense breakdown for efficiency ratios
        [{
          personnel_expense: '20000',
          administrative_expense: '15000'
        }],

        // Client and staff counts for productivity
        [{
          active_clients: '1000',
          loan_officers: '10',
          total_staff: '25'
        }],

        // Previous year data for growth ratios
        [{ total_assets: '85000' }]
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/financial-ratios')
        .send({
          input: {
            asOfDate: '2023-03-31'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();

      // Check profitability ratios
      expect(response.body.report.report.profitabilityRatios.returnOnAssets).toBeDefined();
      expect(response.body.report.report.profitabilityRatios.returnOnEquity).toBeDefined();
      expect(response.body.report.report.profitabilityRatios.operationalSelfSufficiency).toBeDefined();

      // Check asset quality ratios
      expect(response.body.report.report.assetQualityRatios.portfolioAtRisk30).toBeDefined();
      expect(response.body.report.report.assetQualityRatios.writeOffRatio).toBeDefined();
      expect(response.body.report.report.assetQualityRatios.riskCoverageRatio).toBeDefined();

      // Check financial structure ratios
      expect(response.body.report.report.financialStructureRatios.debtToEquityRatio).toBeDefined();
      expect(response.body.report.report.financialStructureRatios.debtToAssetRatio).toBeDefined();

      // Check liquidity ratios
      expect(response.body.report.report.liquidityRatios.currentRatio).toBeDefined();
      expect(response.body.report.report.liquidityRatios.cashRatio).toBeDefined();

      // Check efficiency ratios
      expect(response.body.report.report.efficiencyRatios.operatingExpenseRatio).toBeDefined();
      expect(response.body.report.report.efficiencyRatios.personnelExpenseRatio).toBeDefined();

      // Check growth ratios
      expect(response.body.report.report.growthRatios.assetGrowth).toBeDefined();
    });
  });

  // Interest Income Report
  describe('Interest Income Report', () => {
    it('should generate an interest income report', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock interest data query
      mockDbQuery([{
        accrued_interest: '8000',
        collected_interest: '7000'
      }]);

      // Mock interest by product query
      mockDbQuery([
        {
          product_id: '1',
          product_name: 'Business Loan',
          outstanding_principal: '50000',
          interest_income: '5000',
          avg_interest_rate: '12'
        },
        {
          product_id: '2',
          product_name: 'Agricultural Loan',
          outstanding_principal: '30000',
          interest_income: '3000',
          avg_interest_rate: '10'
        }
      ]);

      // Mock interest by branch query
      mockDbQuery([
        {
          branch_id: '1',
          branch_name: 'Head Office',
          outstanding_principal: '40000',
          interest_income: '4000'
        },
        {
          branch_id: '2',
          branch_name: 'Regional Branch',
          outstanding_principal: '40000',
          interest_income: '4000'
        }
      ]);

      // Mock interest by loan officer query
      mockDbQuery([
        {
          loan_officer_id: '1',
          loan_officer_name: 'John Doe',
          outstanding_principal: '45000',
          interest_income: '4500'
        },
        {
          loan_officer_id: '2',
          loan_officer_name: 'Jane Smith',
          outstanding_principal: '35000',
          interest_income: '3500'
        }
      ]);

      // Mock interest trend query
      mockDbQuery([
        {
          period: '2023-01',
          accrued: '2500',
          collected: '2200'
        },
        {
          period: '2023-02',
          accrued: '2700',
          collected: '2400'
        },
        {
          period: '2023-03',
          accrued: '2800',
          collected: '2400'
        }
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/interest-income')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-03-31'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();

      // Check total interest income
      expect(response.body.report.report.totalInterestIncome).toBe(15000);
      expect(response.body.report.report.accrualBaseInterest).toBe(8000);
      expect(response.body.report.report.cashBaseInterest).toBe(7000);

      // Check interest by product
      expect(response.body.report.report.interestByProduct.length).toBe(2);
      expect(response.body.report.report.interestByProduct[0].productName).toBe('Business Loan');
      expect(response.body.report.report.interestByProduct[0].interestIncome).toBe(5000);

      // Check interest by branch
      expect(response.body.report.report.interestByBranch.length).toBe(2);
      expect(response.body.report.report.interestByBranch[0].branchName).toBe('Head Office');

      // Check interest by loan officer
      expect(response.body.report.report.interestByLoanOfficer.length).toBe(2);
      expect(response.body.report.report.interestByLoanOfficer[0].loanOfficerName).toBe('John Doe');

      // Check interest trend
      expect(response.body.report.report.interestTrend.length).toBe(3);
      expect(response.body.report.report.interestTrend[0].period).toBe('2023-01');
    });
  });

  // Fee Income Report
  describe('Fee Income Report', () => {
    it('should generate a fee income report', async () => {
      // Mock currency query
      mockDbQuery([{ default_currency_code: 'USD' }]);

      // Mock fee income total query
      mockDbQuery([{ total_fee_income: '5000' }]);

      // Mock fees by type query
      mockDbQuery([
        {
          fee_type_id: '1',
          fee_type_name: 'Processing Fee',
          amount: '2000'
        },
        {
          fee_type_id: '2',
          fee_type_name: 'Late Payment Fee',
          amount: '1500'
        },
        {
          fee_type_id: '3',
          fee_type_name: 'Documentation Fee',
          amount: '1500'
        }
      ]);

      // Mock fees by product query
      mockDbQuery([
        {
          product_id: '1',
          product_name: 'Business Loan',
          amount: '3000'
        },
        {
          product_id: '2',
          product_name: 'Agricultural Loan',
          amount: '2000'
        }
      ]);

      // Mock fees by branch query
      mockDbQuery([
        {
          branch_id: '1',
          branch_name: 'Head Office',
          amount: '3000'
        },
        {
          branch_id: '2',
          branch_name: 'Regional Branch',
          amount: '2000'
        }
      ]);

      // Mock fees by loan officer query
      mockDbQuery([
        {
          loan_officer_id: '1',
          loan_officer_name: 'John Doe',
          amount: '2800'
        },
        {
          loan_officer_id: '2',
          loan_officer_name: 'Jane Smith',
          amount: '2200'
        }
      ]);

      // Mock fee trend query
      mockDbQuery([
        {
          period: '2023-01',
          amount: '1600'
        },
        {
          period: '2023-02',
          amount: '1700'
        },
        {
          period: '2023-03',
          amount: '1700'
        }
      ]);

      // Make request to the endpoint
      const response = await request(app)
        .post('/api/reporting/fee-income')
        .send({
          input: {
            fromDate: '2023-01-01',
            toDate: '2023-03-31'
          }
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();

      // Check total fee income
      expect(response.body.report.report.totalFeeIncome).toBe(5000);

      // Check fees by type
      expect(response.body.report.report.feesByType.length).toBe(3);
      expect(response.body.report.report.feesByType[0].feeTypeName).toBe('Processing Fee');
      expect(response.body.report.report.feesByType[0].amount).toBe(2000);
      expect(response.body.report.report.feesByType[0].percentage).toBe(40);

      // Check fees by product
      expect(response.body.report.report.feesByProduct.length).toBe(2);
      expect(response.body.report.report.feesByProduct[0].productName).toBe('Business Loan');
      expect(response.body.report.report.feesByProduct[0].amount).toBe(3000);

      // Check fees by branch
      expect(response.body.report.report.feesByBranch.length).toBe(2);
      expect(response.body.report.report.feesByBranch[0].branchName).toBe('Head Office');

      // Check fees by loan officer
      expect(response.body.report.report.feesByLoanOfficer.length).toBe(2);
      expect(response.body.report.report.feesByLoanOfficer[0].loanOfficerName).toBe('John Doe');

      // Check fee trend
      expect(response.body.report.report.feeTrend.length).toBe(3);
      expect(response.body.report.report.feeTrend[0].period).toBe('2023-01');
    });
  });
});