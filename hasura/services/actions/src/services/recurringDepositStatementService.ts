/**
 * Recurring Deposit Statement Service for Fineract
 * Provides functionality for generating account statements for recurring deposits
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
  id: string;
  date: string;
  valueDate: string;
  type: string;
  description: string;
  amount: number;
  runningBalance: number;
  installmentNumber?: number;
  penaltyAmount?: number;
  interestAmount?: number;
}

/**
 * Interface for statement summary
 */
export interface StatementSummary {
  openingBalance: number;
  totalDeposits: number;
  totalInterestEarned: number;
  totalWithdrawals: number;
  totalPenalties: number;
  totalFees: number;
  closingBalance: number;
  numberOfTransactions: number;
}

/**
 * Interface for statement response
 */
export interface StatementResponse {
  accountId: string;
  accountNo: string;
  clientId: string;
  clientName: string;
  address: string;
  branchName: string;
  productName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  generatedOn: string;
  summary: StatementSummary;
  transactions: StatementTransaction[];
  accountDetails: {
    activatedOn: string;
    interestRate: number;
    depositAmount: number;
    totalDepositsDue: number;
    depositsCompleted: number;
    expectedMaturityDate: string;
    expectedMaturityAmount?: number;
    status: string;
  };
  statementId: string;
  filePath?: string;
  fileUrl?: string;
}

export class RecurringDepositStatementService {
  
  /**
   * Generate a statement for a recurring deposit account
   * @param request Statement request parameters
   * @param userId Current user ID
   * @returns Generated statement
   */
  async generateStatement(request: StatementRequest, userId?: string): Promise<StatementResponse> {
    logger.info('Generating statement for recurring deposit account', { 
      accountId: request.accountId, 
      fromDate: request.fromDate, 
      toDate: request.toDate 
    });
    
    try {
      // Get account details
      const accountResult = await query(
        `SELECT rda.*, sa.account_no, sa.currency_code, sa.client_id, sa.status, 
                sa.activated_on_date, sa.interest_rate, sa.branch_id,
                sp.name as product_name,
                c.first_name || ' ' || c.last_name as client_name,
                c.street as address_street, c.address_line_1, c.address_line_2,
                c.city as address_city, c.state_province as address_state,
                c.country as address_country, c.postal_code as address_postal_code,
                b.name as branch_name
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         LEFT JOIN savings_product sp ON sa.product_id = sp.id
         LEFT JOIN client c ON sa.client_id = c.id
         LEFT JOIN branch b ON sa.branch_id = b.id
         WHERE rda.id = $1`,
        [request.accountId]
      );
      
      if (accountResult.rowCount === 0) {
        throw new Error(`Recurring deposit account with ID ${request.accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      // Get scheduled installments
      const installmentsResult = await query(
        `SELECT COUNT(*) as total_installments, 
                COUNT(*) FILTER (WHERE completed = true) as completed_installments
         FROM recurring_deposit_schedule_installment
         WHERE account_id = $1`,
        [request.accountId]
      );
      
      const installments = installmentsResult.rows[0];
      
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
                            ELSE 0 END), 0) as opening_balance
         FROM recurring_deposit_transaction rdt
         JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
         WHERE rdt.recurring_deposit_account_id = $1
           AND sat.transaction_date < $2
           AND sat.is_reversed = false`,
        [request.accountId, fromDate]
      );
      
      const openingBalance = parseFloat(openingBalanceResult.rows[0].opening_balance) || 0;
      
      // Get transactions within the date range
      const transactionsResult = await query(
        `SELECT rdt.id, rdt.transaction_type, rdt.installment_number,
                sat.transaction_date, sat.amount, sat.running_balance,
                sat.description, sat.is_reversed, sat.created_date
         FROM recurring_deposit_transaction rdt
         JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
         WHERE rdt.recurring_deposit_account_id = $1
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
        totalDeposits: 0,
        totalInterestEarned: 0,
        totalWithdrawals: 0,
        totalPenalties: 0,
        totalFees: 0,
        closingBalance: openingBalance,
        numberOfTransactions: transactions.length
      };
      
      // Process transactions and build formatted transaction list
      const formattedTransactions: StatementTransaction[] = [];
      
      for (const tx of transactions) {
        // Update summary based on transaction type
        const amount = parseFloat(tx.amount);
        
        switch (tx.transaction_type.toLowerCase()) {
          case 'deposit':
            summary.totalDeposits += amount;
            summary.closingBalance += amount;
            break;
          case 'interest_posting':
            summary.totalInterestEarned += amount;
            summary.closingBalance += amount;
            break;
          case 'withdrawal':
            summary.totalWithdrawals += amount;
            summary.closingBalance -= amount;
            break;
          case 'fee_deduction':
            summary.totalFees += amount;
            summary.closingBalance -= amount;
            break;
          case 'penalty':
            summary.totalPenalties += amount;
            summary.closingBalance -= amount;
            break;
        }
        
        // Format transaction for statement
        formattedTransactions.push({
          id: tx.id,
          date: tx.transaction_date.toISOString().split('T')[0],
          valueDate: tx.transaction_date.toISOString().split('T')[0],
          type: this.formatTransactionType(tx.transaction_type),
          description: tx.description || this.getDefaultDescription(tx.transaction_type, tx.installment_number),
          amount,
          runningBalance: parseFloat(tx.running_balance),
          installmentNumber: tx.installment_number
        });
      }
      
      // Format address
      const address = this.formatAddress(account);
      
      // Create statement response
      const statementId = uuidv4();
      const response: StatementResponse = {
        statementId,
        accountId: request.accountId,
        accountNo: account.account_no,
        clientId: account.client_id,
        clientName: account.client_name,
        address,
        branchName: account.branch_name || 'Main Branch',
        productName: account.product_name,
        currency: account.currency_code,
        fromDate: fromDateStr,
        toDate: toDateStr,
        generatedOn: new Date().toISOString(),
        summary,
        transactions: request.includeDetails !== false ? formattedTransactions : [],
        accountDetails: {
          activatedOn: account.activated_on_date?.toISOString().split('T')[0] || '',
          interestRate: parseFloat(account.interest_rate),
          depositAmount: parseFloat(account.deposit_amount),
          totalDepositsDue: parseInt(installments.total_installments),
          depositsCompleted: parseInt(installments.completed_installments),
          expectedMaturityDate: account.expected_maturity_date?.toISOString().split('T')[0] || '',
          expectedMaturityAmount: account.expected_maturity_amount ? parseFloat(account.expected_maturity_amount) : undefined,
          status: account.status
        }
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
      logger.error('Error generating statement for recurring deposit account', { error, request });
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
         FROM recurring_deposit_statement_history
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
         FROM recurring_deposit_statement_history
         WHERE id = $1`,
        [statementId]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`Statement with ID ${statementId} not found`);
      }
      
      const statement = result.rows[0];
      
      // Get account details for filename
      const accountResult = await query(
        `SELECT sa.account_no 
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         WHERE rda.id = $1`,
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
        fileName: `recurring_deposit_statement_${accountNo}_${statementId}.${statement.format}`,
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
  private async saveStatementHistory(statement: StatementResponse, format: string, userId?: string): Promise<void> {
    try {
      await query(
        `INSERT INTO recurring_deposit_statement_history (
          id, account_id, generated_date, from_date, to_date, format, file_path, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          statement.statementId,
          statement.accountId,
          new Date(statement.generatedOn),
          new Date(statement.fromDate),
          new Date(statement.toDate),
          format,
          statement.filePath,
          userId || null
        ]
      );
    } catch (error) {
      logger.error('Error saving statement history', { error, statementId: statement.statementId });
      // Don't throw error, just log it - this shouldn't fail the statement generation
    }
  }
  
  /**
   * Generate PDF statement
   * @param statement Statement data
   * @returns File path
   */
  private async generatePdfStatement(statement: StatementResponse): Promise<string> {
    try {
      // Create template data
      const data = {
        ...statement,
        formattedCurrency: (value: number) => formatCurrency(value, statement.currency),
        formattedDate: (date: string) => formatDate(date)
      };
      
      // Define output file
      const fileName = `recurring_deposit_statement_${statement.accountNo}_${statement.statementId}.pdf`;
      const outputPath = path.join(os.tmpdir(), fileName);
      
      // Generate PDF
      await createPdf(
        'recurring_deposit_statement',
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
  private async generateCsvStatement(statement: StatementResponse): Promise<string> {
    try {
      // Create CSV content
      let csvContent = 'Recurring Deposit Statement\n';
      csvContent += `Account Number,${statement.accountNo}\n`;
      csvContent += `Client Name,${statement.clientName}\n`;
      csvContent += `Period,${statement.fromDate} to ${statement.toDate}\n`;
      csvContent += `Generated On,${statement.generatedOn}\n\n`;
      
      csvContent += 'Account Summary\n';
      csvContent += `Opening Balance,${statement.summary.openingBalance}\n`;
      csvContent += `Total Deposits,${statement.summary.totalDeposits}\n`;
      csvContent += `Total Interest Earned,${statement.summary.totalInterestEarned}\n`;
      csvContent += `Total Withdrawals,${statement.summary.totalWithdrawals}\n`;
      csvContent += `Total Penalties,${statement.summary.totalPenalties}\n`;
      csvContent += `Total Fees,${statement.summary.totalFees}\n`;
      csvContent += `Closing Balance,${statement.summary.closingBalance}\n\n`;
      
      csvContent += 'Transaction Details\n';
      csvContent += 'Date,Transaction Type,Description,Amount,Running Balance\n';
      
      for (const tx of statement.transactions) {
        csvContent += `${tx.date},${tx.type},"${tx.description}",${tx.amount},${tx.runningBalance}\n`;
      }
      
      // Write to file
      const fileName = `recurring_deposit_statement_${statement.accountNo}_${statement.statementId}.csv`;
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
  private async generateJsonStatement(statement: StatementResponse): Promise<string> {
    try {
      // Create JSON content - just stringify the statement object
      const jsonContent = JSON.stringify(statement, null, 2);
      
      // Write to file
      const fileName = `recurring_deposit_statement_${statement.accountNo}_${statement.statementId}.json`;
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
      case 'penalty':
        return 'Penalty';
      default:
        return type;
    }
  }
  
  /**
   * Get default description for transaction type
   * @param type Transaction type
   * @param installmentNumber Optional installment number
   * @returns Description
   */
  private getDefaultDescription(type: string, installmentNumber?: number): string {
    switch (type.toLowerCase()) {
      case 'deposit':
        return installmentNumber 
          ? `Deposit for installment #${installmentNumber}` 
          : 'Deposit';
      case 'interest_posting':
        return 'Interest posting';
      case 'withdrawal':
        return 'Withdrawal';
      case 'fee_deduction':
        return 'Fee deduction';
      case 'penalty':
        return 'Penalty';
      default:
        return type;
    }
  }
  
  /**
   * Format address from account data
   * @param account Account data
   * @returns Formatted address
   */
  private formatAddress(account: any): string {
    const parts = [];
    
    if (account.address_street) parts.push(account.address_street);
    if (account.address_line_1) parts.push(account.address_line_1);
    if (account.address_line_2) parts.push(account.address_line_2);
    
    const cityParts = [];
    if (account.address_city) cityParts.push(account.address_city);
    if (account.address_state) cityParts.push(account.address_state);
    if (account.address_postal_code) cityParts.push(account.address_postal_code);
    
    if (cityParts.length > 0) {
      parts.push(cityParts.join(', '));
    }
    
    if (account.address_country) parts.push(account.address_country);
    
    return parts.join('\n');
  }
}

// Export a singleton instance
export const recurringDepositStatementService = new RecurringDepositStatementService();