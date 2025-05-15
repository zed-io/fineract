/**
 * Savings Statement Service for Fineract
 * Provides functionality for generating account statements for savings accounts
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import Decimal from 'decimal.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createPdf } from '../utils/pdfGenerator';
import { formatCurrency, formatDate } from '../utils/formatters';

/**
 * Interface for statement request
 */
export interface StatementRequest {
  accountId: string;
  fromDate?: string;
  toDate?: string;
  includeDetails?: boolean;
  format?: 'pdf' | 'csv' | 'json';
  download?: boolean;
}

/**
 * Interface for statement transaction
 */
export interface StatementTransaction {
  transactionId: string;
  transactionDate: string;
  valueDate: string;
  transactionType: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  runningBalance: number;
}

/**
 * Interface for statement summary
 */
export interface StatementSummary {
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  totalFees: number;
  numberOfTransactions: number;
}

/**
 * Interface for statement response
 */
export interface SavingsStatement {
  id: string;
  accountId: string;
  accountNo: string;
  accountType: string;
  clientId: string;
  clientName: string;
  productName: string;
  currencyCode: string;
  statementDate: string;
  periodStartDate: string;
  periodEndDate: string;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  totalFees: number;
  transactions: StatementTransaction[];
  filePath?: string;
  fileUrl?: string;
}

export class SavingsStatementService {
  
  /**
   * Generate a statement for a savings account
   * @param request Statement request parameters
   * @param userId Current user ID
   * @returns Generated statement
   */
  async generateStatement(request: StatementRequest, userId?: string): Promise<SavingsStatement> {
    logger.info('Generating statement for savings account', { 
      accountId: request.accountId, 
      fromDate: request.fromDate, 
      toDate: request.toDate 
    });
    
    try {
      // Get account details
      const accountResult = await query(
        `SELECT sa.*, 
                sa.account_no, sa.currency_code, sa.client_id, sa.status, 
                sa.activated_on_date, sa.nominal_annual_interest_rate, sa.branch_id,
                sp.name as product_name,
                c.display_name as client_name,
                c.street as address_street, c.address_line_1, c.address_line_2,
                c.city as address_city, c.state_province as address_state,
                c.country as address_country, c.postal_code as address_postal_code,
                b.name as branch_name
         FROM fineract_default.savings_account sa
         LEFT JOIN fineract_default.savings_product sp ON sa.product_id = sp.id
         LEFT JOIN fineract_default.client c ON sa.client_id = c.id
         LEFT JOIN fineract_default.branch b ON sa.branch_id = b.id
         WHERE sa.id = $1`,
        [request.accountId]
      );
      
      if (accountResult.rowCount === 0) {
        throw new Error(`Savings account with ID ${request.accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      // Set date range for statement
      const today = new Date();
      const toDate = request.toDate ? new Date(request.toDate) : today;
      
      // Default from date to 30 days before today if not provided
      let fromDate;
      if (request.fromDate) {
        fromDate = new Date(request.fromDate);
      } else {
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 30);
      }
      
      const fromDateStr = fromDate.toISOString().split('T')[0];
      const toDateStr = toDate.toISOString().split('T')[0];
      
      // Get opening balance as of fromDate (transactions before fromDate)
      const openingBalanceResult = await query(
        `SELECT COALESCE(SUM(CASE WHEN sat.transaction_type = 'deposit' THEN sat.amount
                            WHEN sat.transaction_type = 'interest_posting' THEN sat.amount
                            WHEN sat.transaction_type = 'withdrawal' THEN -sat.amount
                            WHEN sat.transaction_type = 'fee_deduction' THEN -sat.amount
                            WHEN sat.transaction_type = 'withdrawal_fee' THEN -sat.amount
                            ELSE 0 END), 0) as opening_balance
         FROM fineract_default.savings_account_transaction sat
         WHERE sat.savings_account_id = $1
           AND sat.transaction_date < $2
           AND sat.is_reversed = false`,
        [request.accountId, fromDate]
      );
      
      const openingBalance = parseFloat(openingBalanceResult.rows[0].opening_balance) || 0;
      
      // Get transactions within the date range
      const transactionsResult = await query(
        `SELECT sat.id, sat.transaction_type, sat.transaction_date,
                sat.amount, sat.running_balance, sat.description, 
                sat.is_reversed, sat.created_date
         FROM fineract_default.savings_account_transaction sat
         WHERE sat.savings_account_id = $1
           AND sat.transaction_date >= $2
           AND sat.transaction_date <= $3
           AND sat.is_reversed = false
         ORDER BY sat.transaction_date, sat.created_date`,
        [request.accountId, fromDate, toDate]
      );
      
      const transactions = transactionsResult.rows;
      
      // Calculate summary
      const summary: StatementSummary = {
        openingBalance,
        closingBalance: openingBalance,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalInterest: 0,
        totalFees: 0,
        numberOfTransactions: transactions.length
      };
      
      // Process transactions and build formatted transaction list
      const formattedTransactions: StatementTransaction[] = [];
      
      for (const tx of transactions) {
        // Update summary based on transaction type
        const amount = parseFloat(tx.amount);
        let creditAmount = null;
        let debitAmount = null;
        
        switch (tx.transaction_type.toLowerCase()) {
          case 'deposit':
            summary.totalDeposits += amount;
            summary.closingBalance += amount;
            creditAmount = amount;
            break;
          case 'interest_posting':
            summary.totalInterest += amount;
            summary.closingBalance += amount;
            creditAmount = amount;
            break;
          case 'withdrawal':
            summary.totalWithdrawals += amount;
            summary.closingBalance -= amount;
            debitAmount = amount;
            break;
          case 'fee_deduction':
          case 'withdrawal_fee':
            summary.totalFees += amount;
            summary.closingBalance -= amount;
            debitAmount = amount;
            break;
        }
        
        // Format transaction for statement
        formattedTransactions.push({
          transactionId: tx.id,
          transactionDate: tx.transaction_date.toISOString().split('T')[0],
          valueDate: tx.transaction_date.toISOString().split('T')[0],
          transactionType: this.formatTransactionType(tx.transaction_type),
          description: tx.description || this.getDefaultDescription(tx.transaction_type),
          debitAmount,
          creditAmount,
          runningBalance: parseFloat(tx.running_balance)
        });
      }
      
      // Create statement response
      const statementId = uuidv4();
      const response: SavingsStatement = {
        id: statementId,
        accountId: request.accountId,
        accountNo: account.account_no,
        accountType: account.account_type || 'individual',
        clientId: account.client_id,
        clientName: account.client_name,
        productName: account.product_name,
        currencyCode: account.currency_code,
        statementDate: new Date().toISOString().split('T')[0],
        periodStartDate: fromDateStr,
        periodEndDate: toDateStr,
        openingBalance: summary.openingBalance,
        closingBalance: summary.closingBalance,
        totalDeposits: summary.totalDeposits,
        totalWithdrawals: summary.totalWithdrawals,
        totalInterest: summary.totalInterest,
        totalFees: summary.totalFees,
        transactions: request.includeDetails !== false ? formattedTransactions : []
      };
      
      // Generate file if requested
      if (request.format && request.download) {
        if (request.format === 'pdf') {
          response.filePath = await this.generatePdfStatement(response);
        } else if (request.format === 'csv') {
          response.filePath = await this.generateCsvStatement(response);
        } else if (request.format === 'json') {
          response.filePath = await this.generateJsonStatement(response);
        }
        
        // Save statement to history
        await this.saveStatementHistory(response, request.format, userId);
      }
      
      return response;
    } catch (error) {
      logger.error('Error generating statement for savings account', { error, request });
      throw error;
    }
  }
  
  /**
   * Get statement history for an account
   * @param accountId Account ID
   * @param limit Maximum number of records to return
   * @returns Statement history
   */
  async getStatementHistory(accountId: string, limit: number = 10): Promise<any[]> {
    logger.info('Getting statement history for account', { accountId, limit });
    
    try {
      const result = await query(
        `SELECT id, account_id, generated_date, from_date, to_date, format, file_path, created_by
         FROM fineract_default.savings_statement_history
         WHERE account_id = $1
         ORDER BY generated_date DESC
         LIMIT $2`,
        [accountId, limit]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        generatedDate: row.generated_date.toISOString(),
        fromDate: row.from_date.toISOString().split('T')[0],
        toDate: row.to_date.toISOString().split('T')[0],
        format: row.format,
        filePath: row.file_path,
        createdBy: row.created_by
      }));
    } catch (error) {
      logger.error('Error getting statement history', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Download a statement by ID
   * @param statementId Statement ID
   * @returns Statement file details
   */
  async downloadStatement(statementId: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    logger.info('Downloading statement', { statementId });
    
    try {
      const result = await query(
        `SELECT account_id, file_path, format
         FROM fineract_default.savings_statement_history
         WHERE id = $1`,
        [statementId]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`Statement with ID ${statementId} not found`);
      }
      
      const statement = result.rows[0];
      
      // Get account details for filename
      const accountResult = await query(
        `SELECT account_no 
         FROM fineract_default.savings_account
         WHERE id = $1`,
        [statement.account_id]
      );
      
      const accountNo = accountResult.rows[0]?.account_no || 'unknown';
      
      // Set mime type based on format
      let mimeType = 'application/octet-stream';
      if (statement.format === 'pdf') {
        mimeType = 'application/pdf';
      } else if (statement.format === 'csv') {
        mimeType = 'text/csv';
      } else if (statement.format === 'json') {
        mimeType = 'application/json';
      }
      
      return {
        filePath: statement.file_path,
        fileName: `savings_statement_${accountNo}_${statementId}.${statement.format}`,
        mimeType
      };
    } catch (error) {
      logger.error('Error downloading statement', { error, statementId });
      throw error;
    }
  }
  
  /**
   * Save statement to history
   * @param statement Statement data
   * @param format File format
   * @param userId User ID
   */
  private async saveStatementHistory(statement: SavingsStatement, format: string, userId?: string): Promise<void> {
    try {
      await query(
        `INSERT INTO fineract_default.savings_statement_history (
          id, account_id, generated_date, from_date, to_date, format, file_path, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          statement.id,
          statement.accountId,
          new Date(statement.statementDate),
          new Date(statement.periodStartDate),
          new Date(statement.periodEndDate),
          format,
          statement.filePath,
          userId || null
        ]
      );
    } catch (error) {
      logger.error('Error saving statement history', { error, statementId: statement.id });
      // Don't throw error, just log it - this shouldn't fail the statement generation
    }
  }
  
  /**
   * Generate PDF statement
   * @param statement Statement data
   * @returns File path
   */
  private async generatePdfStatement(statement: SavingsStatement): Promise<string> {
    try {
      // Create template data
      const data = {
        ...statement,
        summary: {
          openingBalance: statement.openingBalance,
          totalDeposits: statement.totalDeposits,
          totalInterestEarned: statement.totalInterest,
          totalWithdrawals: statement.totalWithdrawals,
          totalFees: statement.totalFees,
          closingBalance: statement.closingBalance,
          numberOfTransactions: statement.transactions.length
        },
        transactions: statement.transactions.map(tx => ({
          ...tx,
          isCreditType: tx.creditAmount !== null
        })),
        formattedCurrency: (value: number) => formatCurrency(value, statement.currencyCode),
        formattedDate: (date: string) => formatDate(date)
      };
      
      // Define output file
      const fileName = `savings_statement_${statement.accountNo}_${statement.id}.pdf`;
      const outputPath = path.join(os.tmpdir(), fileName);
      
      // Generate PDF
      await createPdf(
        'savings_statement',
        data,
        outputPath
      );
      
      return outputPath;
    } catch (error) {
      logger.error('Error generating PDF statement', { error });
      throw new Error(`Failed to generate PDF statement: ${error.message}`);
    }
  }
  
  /**
   * Generate CSV statement
   * @param statement Statement data
   * @returns File path
   */
  private async generateCsvStatement(statement: SavingsStatement): Promise<string> {
    try {
      // Create CSV content
      let csvContent = 'Savings Account Statement\n';
      csvContent += `Account Number,${statement.accountNo}\n`;
      csvContent += `Client Name,${statement.clientName}\n`;
      csvContent += `Period,${statement.periodStartDate} to ${statement.periodEndDate}\n`;
      csvContent += `Generated On,${statement.statementDate}\n\n`;
      
      csvContent += 'Account Summary\n';
      csvContent += `Opening Balance,${statement.openingBalance}\n`;
      csvContent += `Total Deposits,${statement.totalDeposits}\n`;
      csvContent += `Total Interest Earned,${statement.totalInterest}\n`;
      csvContent += `Total Withdrawals,${statement.totalWithdrawals}\n`;
      csvContent += `Total Fees,${statement.totalFees}\n`;
      csvContent += `Closing Balance,${statement.closingBalance}\n\n`;
      
      csvContent += 'Transaction Details\n';
      csvContent += 'Date,Transaction Type,Description,Debit Amount,Credit Amount,Running Balance\n';
      
      for (const tx of statement.transactions) {
        csvContent += `${tx.transactionDate},${tx.transactionType},"${tx.description}",` +
                      `${tx.debitAmount || ''},${tx.creditAmount || ''},${tx.runningBalance}\n`;
      }
      
      // Write to file
      const fileName = `savings_statement_${statement.accountNo}_${statement.id}.csv`;
      const outputPath = path.join(os.tmpdir(), fileName);
      
      fs.writeFileSync(outputPath, csvContent);
      
      return outputPath;
    } catch (error) {
      logger.error('Error generating CSV statement', { error });
      throw new Error(`Failed to generate CSV statement: ${error.message}`);
    }
  }
  
  /**
   * Generate JSON statement
   * @param statement Statement data
   * @returns File path
   */
  private async generateJsonStatement(statement: SavingsStatement): Promise<string> {
    try {
      // Create JSON content - just stringify the statement object
      const jsonContent = JSON.stringify(statement, null, 2);
      
      // Write to file
      const fileName = `savings_statement_${statement.accountNo}_${statement.id}.json`;
      const outputPath = path.join(os.tmpdir(), fileName);
      
      fs.writeFileSync(outputPath, jsonContent);
      
      return outputPath;
    } catch (error) {
      logger.error('Error generating JSON statement', { error });
      throw new Error(`Failed to generate JSON statement: ${error.message}`);
    }
  }
  
  /**
   * Format transaction type for display
   * @param type Raw transaction type
   * @returns Formatted transaction type
   */
  private formatTransactionType(type: string): string {
    switch (type.toLowerCase()) {
      case 'deposit':
        return 'Deposit';
      case 'interest_posting':
        return 'Interest Posting';
      case 'withdrawal':
        return 'Withdrawal';
      case 'fee_deduction':
        return 'Fee Deduction';
      case 'withdrawal_fee':
        return 'Withdrawal Fee';
      case 'annual_fee':
        return 'Annual Fee';
      case 'overdraft_interest':
        return 'Overdraft Interest';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    }
  }
  
  /**
   * Get default description for transaction type
   * @param type Transaction type
   * @returns Description
   */
  private getDefaultDescription(type: string): string {
    switch (type.toLowerCase()) {
      case 'deposit':
        return 'Deposit to account';
      case 'interest_posting':
        return 'Interest posting';
      case 'withdrawal':
        return 'Withdrawal from account';
      case 'fee_deduction':
        return 'Fee deduction';
      case 'withdrawal_fee':
        return 'Fee for withdrawal';
      case 'annual_fee':
        return 'Annual account maintenance fee';
      case 'overdraft_interest':
        return 'Interest on overdraft balance';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    }
  }
}

// Export a singleton instance
export const savingsStatementService = new SavingsStatementService();