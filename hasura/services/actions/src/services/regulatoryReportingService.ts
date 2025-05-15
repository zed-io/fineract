import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Report frequency enum
 */
export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
  ON_DEMAND = 'on_demand'
}

/**
 * Report format enum
 */
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml'
}

/**
 * Report status enum
 */
export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  APPROVED = 'approved',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected'
}

/**
 * Report type enum - specific to Trinidad and Tobago regulatory requirements
 */
export enum RegulatoryReportType {
  SUSPICIOUS_TRANSACTION_REPORT = 'suspicious_transaction_report',
  LARGE_CASH_TRANSACTION_REPORT = 'large_cash_transaction_report',
  TERRORIST_PROPERTY_REPORT = 'terrorist_property_report',
  QUARTERLY_RETURN = 'quarterly_return',
  ANNUAL_COMPLIANCE_REPORT = 'annual_compliance_report',
  RISK_ASSESSMENT_REPORT = 'risk_assessment_report',
  ANTI_MONEY_LAUNDERING_REPORT = 'anti_money_laundering_report',
  CREDIT_UNION_MONTHLY_STATEMENT = 'credit_union_monthly_statement',
  FINANCIAL_CONDITION_REPORT = 'financial_condition_report',
  MEMBER_STATISTICS_REPORT = 'member_statistics_report',
  LOAN_PORTFOLIO_REPORT = 'loan_portfolio_report',
  DELINQUENCY_REPORT = 'delinquency_report'
}

/**
 * Report generation request
 */
export interface RegReportGenerationRequest {
  reportType: RegulatoryReportType;
  startDate: string;
  endDate: string;
  format?: ReportFormat;
  parameters?: Record<string, any>;
  notes?: string;
}

/**
 * Report definition
 */
export interface RegReportDefinition {
  id: string;
  name: string;
  description: string;
  reportType: RegulatoryReportType;
  frequency: ReportFrequency;
  regulator: string;
  formatOptions: ReportFormat[];
  requiredParameters: string[];
  deadline?: string; // Relative deadline like "15 days after quarter end"
  isActive: boolean;
  templateUrl?: string;
  instructions?: string;
}

/**
 * Report instance
 */
export interface RegReportInstance {
  id: string;
  definitionId: string;
  name: string;
  reportType: RegulatoryReportType;
  startDate: string;
  endDate: string;
  dueDate?: string;
  submissionDate?: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters: Record<string, any>;
  fileUrl?: string;
  fileSize?: number;
  generatedBy?: string;
  generatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  submittedBy?: string;
  submittedAt?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Report schedule
 */
export interface RegReportSchedule {
  id: string;
  definitionId: string;
  frequency: ReportFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  month?: number;
  hour?: number;
  minute?: number;
  parameters?: Record<string, any>;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
}

/**
 * Report generation result
 */
export interface RegReportGenerationResult {
  success: boolean;
  reportInstance?: RegReportInstance;
  message?: string;
  errors?: string[];
}

/**
 * Service class for working with regulatory reports
 * Specialized for Trinidad and Tobago regulatory requirements
 */
export class RegulatoryReportingService {
  /**
   * Get all report definitions
   * @param active Whether to only return active report definitions
   * @returns Array of report definitions
   */
  async getReportDefinitions(active?: boolean): Promise<RegReportDefinition[]> {
    logger.info('Getting report definitions', { active });
    
    let query = `
      SELECT * FROM fineract_default.regulatory_report_definition
      ${active ? 'WHERE is_active = true' : ''}
      ORDER BY name`;
    
    const result = await db.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      frequency: row.frequency,
      regulator: row.regulator,
      formatOptions: row.format_options,
      requiredParameters: row.required_parameters,
      deadline: row.deadline,
      isActive: row.is_active,
      templateUrl: row.template_url,
      instructions: row.instructions
    }));
  }
  
  /**
   * Get a specific report definition
   * @param definitionId The ID of the report definition
   * @returns The report definition or null if not found
   */
  async getReportDefinition(definitionId: string): Promise<RegReportDefinition | null> {
    logger.info('Getting report definition', { definitionId });
    
    const result = await db.query(
      `SELECT * FROM fineract_default.regulatory_report_definition WHERE id = $1`,
      [definitionId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      frequency: row.frequency,
      regulator: row.regulator,
      formatOptions: row.format_options,
      requiredParameters: row.required_parameters,
      deadline: row.deadline,
      isActive: row.is_active,
      templateUrl: row.template_url,
      instructions: row.instructions
    };
  }
  
  /**
   * Generate a regulatory report
   * @param request Report generation request
   * @param userId The ID of the user generating the report
   * @returns Report generation result
   */
  async generateReport(request: RegReportGenerationRequest, userId: string): Promise<RegReportGenerationResult> {
    logger.info('Generating regulatory report', { 
      reportType: request.reportType, 
      userId 
    });
    
    try {
      // Get the report definition
      const definitionResult = await db.query(
        `SELECT * FROM fineract_default.regulatory_report_definition WHERE report_type = $1`,
        [request.reportType]
      );
      
      if (definitionResult.rows.length === 0) {
        return {
          success: false,
          message: `Report definition not found for type ${request.reportType}`
        };
      }
      
      const definition = definitionResult.rows[0];
      
      // Validate required parameters
      const requiredParams = definition.required_parameters || [];
      const missingParams = requiredParams.filter(param => 
        !request.parameters || request.parameters[param] === undefined
      );
      
      if (missingParams.length > 0) {
        return {
          success: false,
          message: `Missing required parameters: ${missingParams.join(', ')}`
        };
      }
      
      // Ensure format is supported
      const format = request.format || ReportFormat.PDF;
      if (!definition.format_options.includes(format)) {
        return {
          success: false,
          message: `Format ${format} is not supported for this report. Supported formats: ${definition.format_options.join(', ')}`
        };
      }
      
      // Create a report instance
      const reportId = uuidv4();
      const now = new Date().toISOString();
      
      // Calculate due date if applicable
      let dueDate = null;
      if (definition.deadline) {
        dueDate = this.calculateDueDate(request.endDate, definition.deadline);
      }
      
      // Create the report instance record
      await db.query(
        `INSERT INTO fineract_default.regulatory_report_instance(
          id, definition_id, name, report_type, start_date, end_date, due_date,
          status, format, parameters, generated_by, generated_at, notes,
          created_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          reportId,
          definition.id,
          definition.name,
          request.reportType,
          request.startDate,
          request.endDate,
          dueDate,
          ReportStatus.PROCESSING,
          format,
          JSON.stringify(request.parameters || {}),
          userId,
          now,
          request.notes,
          now,
          userId
        ]
      );
      
      // Generate the report asynchronously
      this.processReport(reportId, request, definition, userId).catch(error => {
        logger.error('Error processing report', { reportId, error });
      });
      
      // Return the report instance
      return {
        success: true,
        reportInstance: {
          id: reportId,
          definitionId: definition.id,
          name: definition.name,
          reportType: request.reportType as RegulatoryReportType,
          startDate: request.startDate,
          endDate: request.endDate,
          dueDate: dueDate as string,
          status: ReportStatus.PROCESSING,
          format: format as ReportFormat,
          parameters: request.parameters || {},
          generatedBy: userId,
          generatedAt: now,
          notes: request.notes
        }
      };
    } catch (error) {
      logger.error('Error generating report', { error });
      return {
        success: false,
        message: `Error generating report: ${error.message}`
      };
    }
  }
  
  /**
   * Process a report asynchronously
   * @param reportId The ID of the report to process
   * @param request The original report request
   * @param definition The report definition
   * @param userId The ID of the user generating the report
   */
  private async processReport(
    reportId: string, 
    request: RegReportGenerationRequest, 
    definition: any, 
    userId: string
  ): Promise<void> {
    logger.info('Processing report', { reportId, reportType: request.reportType });
    
    try {
      // In a real implementation, this would call a report generator
      // For now, generate a mock report
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate the report based on type
      const reportData = await this.generateReportData(
        request.reportType,
        request.startDate,
        request.endDate,
        request.parameters
      );
      
      // Generate the file URL
      const format = request.format || ReportFormat.PDF;
      const fileName = `report_${reportId}.${format.toLowerCase()}`;
      const fileUrl = `/reports/${fileName}`;
      
      // Update the report instance
      await db.query(
        `UPDATE fineract_default.regulatory_report_instance
         SET status = $1, file_url = $2, file_size = $3, metadata = $4,
             last_modified_date = $5, last_modified_by = $6
         WHERE id = $7`,
        [
          ReportStatus.COMPLETED,
          fileUrl,
          12345, // Mock file size
          JSON.stringify({ generated: true, summary: reportData.summary }),
          new Date().toISOString(),
          userId,
          reportId
        ]
      );
      
      logger.info('Report processing completed', { reportId });
    } catch (error) {
      logger.error('Error processing report', { reportId, error });
      
      // Update the report instance to failed status
      await db.query(
        `UPDATE fineract_default.regulatory_report_instance
         SET status = $1, metadata = $2, last_modified_date = $3, last_modified_by = $4
         WHERE id = $5`,
        [
          ReportStatus.FAILED,
          JSON.stringify({ error: error.message }),
          new Date().toISOString(),
          userId,
          reportId
        ]
      );
    }
  }
  
  /**
   * Generate report data based on report type
   * @param reportType The type of report to generate
   * @param startDate The start date for the report period
   * @param endDate The end date for the report period
   * @param parameters Additional parameters for the report
   * @returns The generated report data
   */
  private async generateReportData(
    reportType: RegulatoryReportType,
    startDate: string,
    endDate: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    // In a real implementation, this would query the database and format the data
    // For now, return mock data based on report type
    
    switch (reportType) {
      case RegulatoryReportType.SUSPICIOUS_TRANSACTION_REPORT:
        return this.generateSuspiciousTransactionReport(startDate, endDate, parameters);
        
      case RegulatoryReportType.LARGE_CASH_TRANSACTION_REPORT:
        return this.generateLargeCashTransactionReport(startDate, endDate, parameters);
        
      case RegulatoryReportType.QUARTERLY_RETURN:
        return this.generateQuarterlyReturn(startDate, endDate, parameters);
        
      case RegulatoryReportType.CREDIT_UNION_MONTHLY_STATEMENT:
        return this.generateCreditUnionMonthlyStatement(startDate, endDate, parameters);
        
      case RegulatoryReportType.LOAN_PORTFOLIO_REPORT:
        return this.generateLoanPortfolioReport(startDate, endDate, parameters);
        
      case RegulatoryReportType.DELINQUENCY_REPORT:
        return this.generateDelinquencyReport(startDate, endDate, parameters);
        
      default:
        return {
          reportType,
          startDate,
          endDate,
          parameters,
          summary: 'Generic report data',
          data: {}
        };
    }
  }
  
  /**
   * Generate a suspicious transaction report (STR)
   * Required by the Trinidad and Tobago FIU
   */
  private async generateSuspiciousTransactionReport(
    startDate: string, 
    endDate: string, 
    parameters?: Record<string, any>
  ): Promise<any> {
    // Query suspicious transactions
    const transactions = await db.query(
      `SELECT 
         t.id, t.transaction_date, t.amount, t.currency_code,
         t.transaction_type, t.description,
         c.id as client_id, c.firstname, c.lastname, c.risk_level,
         c.activation_date as client_since, fc.id as flag_id, fc.overall_risk_level,
         fc.review_reason
       FROM 
         fineract_default.m_payment_detail pd
       JOIN 
         fineract_default.m_payment_detail_data pdd ON pd.id = pdd.payment_detail_id
       JOIN 
         fineract_default.m_loan_transaction t ON pd.id = t.payment_detail_id
       JOIN 
         fineract_default.m_loan l ON t.loan_id = l.id
       JOIN 
         fineract_default.client c ON l.client_id = c.id
       LEFT JOIN 
         fineract_default.fraud_check fc ON c.id = fc.client_id
       WHERE 
         t.transaction_date BETWEEN $1 AND $2
         AND (
           c.risk_level = 'high'
           OR c.risk_level = 'critical'
           OR t.amount > 50000
           OR fc.overall_risk_level IN ('high', 'critical')
         )
       ORDER BY 
         t.transaction_date DESC`,
      [startDate, endDate]
    );
    
    // Group by client
    const clientSummary = {};
    let totalSuspiciousAmount = 0;
    let totalReportableTransactions = 0;
    
    for (const tx of transactions.rows) {
      if (!clientSummary[tx.client_id]) {
        clientSummary[tx.client_id] = {
          clientId: tx.client_id,
          clientName: `${tx.firstname} ${tx.lastname}`,
          riskLevel: tx.risk_level,
          clientSince: tx.client_since,
          transactions: []
        };
      }
      
      clientSummary[tx.client_id].transactions.push({
        id: tx.id,
        date: tx.transaction_date,
        amount: tx.amount,
        currency: tx.currency_code,
        type: tx.transaction_type,
        description: tx.description,
        flagged: tx.flag_id ? true : false,
        reason: tx.review_reason || 'Large transaction amount'
      });
      
      totalSuspiciousAmount += parseFloat(tx.amount);
      totalReportableTransactions++;
    }
    
    return {
      reportType: RegulatoryReportType.SUSPICIOUS_TRANSACTION_REPORT,
      startDate,
      endDate,
      summary: `${totalReportableTransactions} suspicious transactions totaling $${totalSuspiciousAmount.toFixed(2)} identified`,
      clients: Object.values(clientSummary),
      totalTransactions: totalReportableTransactions,
      totalAmount: totalSuspiciousAmount
    };
  }
  
  /**
   * Generate a large cash transaction report (LCTR)
   * Required by the Trinidad and Tobago FIU for transactions over $10,000 TTD
   */
  private async generateLargeCashTransactionReport(
    startDate: string, 
    endDate: string, 
    parameters?: Record<string, any>
  ): Promise<any> {
    // Set the threshold (default to 10,000 TTD)
    const threshold = parameters?.threshold || 10000;
    
    // Query large cash transactions
    const transactions = await db.query(
      `SELECT 
         t.id, t.transaction_date, t.amount, t.currency_code,
         t.transaction_type, t.description,
         c.id as client_id, c.firstname, c.lastname, c.risk_level,
         c.activation_date as client_since, pd.receipt_number
       FROM 
         fineract_default.m_payment_detail pd
       JOIN 
         fineract_default.m_loan_transaction t ON pd.id = t.payment_detail_id
       JOIN 
         fineract_default.m_loan l ON t.loan_id = l.id
       JOIN 
         fineract_default.client c ON l.client_id = c.id
       WHERE 
         t.transaction_date BETWEEN $1 AND $2
         AND t.amount >= $3
         AND (pd.payment_type_id = 1) -- Assuming payment type 1 is cash
       ORDER BY 
         t.amount DESC, t.transaction_date DESC`,
      [startDate, endDate, threshold]
    );
    
    // Calculate totals
    let totalAmount = 0;
    let totalTransactions = transactions.rows.length;
    
    for (const tx of transactions.rows) {
      totalAmount += parseFloat(tx.amount);
    }
    
    return {
      reportType: RegulatoryReportType.LARGE_CASH_TRANSACTION_REPORT,
      startDate,
      endDate,
      threshold,
      summary: `${totalTransactions} large cash transactions totaling $${totalAmount.toFixed(2)} identified`,
      transactions: transactions.rows.map(tx => ({
        id: tx.id,
        date: tx.transaction_date,
        amount: tx.amount,
        currency: tx.currency_code,
        clientId: tx.client_id,
        clientName: `${tx.firstname} ${tx.lastname}`,
        receiptNumber: tx.receipt_number,
        description: tx.description,
        type: tx.transaction_type
      })),
      totalTransactions,
      totalAmount
    };
  }
  
  /**
   * Generate a quarterly return for the Central Bank
   */
  private async generateQuarterlyReturn(
    startDate: string, 
    endDate: string, 
    parameters?: Record<string, any>
  ): Promise<any> {
    // Get loan portfolio metrics for the quarter
    const loanMetrics = await db.query(
      `SELECT 
         COUNT(*) as total_loans,
         SUM(principal_amount) as total_principal,
         SUM(principal_disbursed_derived) as total_disbursed,
         SUM(principal_outstanding_derived) as total_outstanding,
         SUM(CASE WHEN loan_status = 'loanStatusType.overpaid' THEN 1 ELSE 0 END) as total_overpaid,
         SUM(CASE WHEN days_in_arrears > 0 THEN 1 ELSE 0 END) as total_in_arrears,
         SUM(CASE WHEN days_in_arrears > 30 THEN 1 ELSE 0 END) as total_past_due_30,
         SUM(CASE WHEN days_in_arrears > 90 THEN 1 ELSE 0 END) as total_past_due_90,
         SUM(CASE WHEN loan_status = 'loanStatusType.closed.written.off' THEN 1 ELSE 0 END) as total_written_off,
         SUM(CASE WHEN loan_status = 'loanStatusType.closed.written.off' THEN principal_writtenoff_derived ELSE 0 END) as total_written_off_amount
       FROM 
         fineract_default.m_loan
       WHERE 
         disbursedon_date BETWEEN $1 AND $2 OR expected_maturedon_date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    
    // Get savings metrics for the quarter
    const savingsMetrics = await db.query(
      `SELECT 
         COUNT(*) as total_accounts,
         SUM(account_balance_derived) as total_balance
       FROM 
         fineract_default.m_savings_account
       WHERE 
         activated_on_date <= $1`,
      [endDate]
    );
    
    // Get membership growth for the quarter
    const membershipMetrics = await db.query(
      `SELECT 
         COUNT(*) as total_members,
         SUM(CASE WHEN activation_date BETWEEN $1 AND $2 THEN 1 ELSE 0 END) as new_members,
         SUM(CASE WHEN date_ofbirth > $3 THEN 1 ELSE 0 END) as youth_members,
         SUM(CASE WHEN gender_cv_id = 1 THEN 1 ELSE 0 END) as female_members,
         SUM(CASE WHEN gender_cv_id = 2 THEN 1 ELSE 0 END) as male_members
       FROM 
         fineract_default.client
       WHERE 
         activation_date <= $2`,
      [
        startDate, 
        endDate, 
        new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString()
      ]
    );
    
    // Combine metrics for the report
    return {
      reportType: RegulatoryReportType.QUARTERLY_RETURN,
      startDate,
      endDate,
      summary: 'Quarterly return compiled successfully',
      loanPortfolio: loanMetrics.rows[0],
      savingsPortfolio: savingsMetrics.rows[0],
      membership: membershipMetrics.rows[0],
      keyRatios: {
        capitalAdequacy: 0.12, // Mock data
        liquidityRatio: 0.18,  // Mock data
        nonPerformingLoanRatio: loanMetrics.rows[0].total_past_due_90 / loanMetrics.rows[0].total_loans,
        provisionCoverageRatio: 0.65, // Mock data
        returnOnAssets: 0.03,  // Mock data
        costToIncomeRatio: 0.58 // Mock data
      }
    };
  }
  
  /**
   * Generate a credit union monthly statement
   * Required by the Commissioner for Co-operative Development
   */
  private async generateCreditUnionMonthlyStatement(
    startDate: string, 
    endDate: string, 
    parameters?: Record<string, any>
  ): Promise<any> {
    // Get summary of loans for the month
    const loanSummary = await db.query(
      `SELECT 
         COUNT(*) as total_loans,
         SUM(principal_amount) as total_principal,
         SUM(principal_disbursed_derived) as total_disbursed,
         SUM(principal_outstanding_derived) as total_outstanding,
         COUNT(CASE WHEN disbursedon_date BETWEEN $1 AND $2 THEN 1 END) as new_loans,
         SUM(CASE WHEN disbursedon_date BETWEEN $1 AND $2 THEN principal_amount ELSE 0 END) as new_loans_amount
       FROM 
         fineract_default.m_loan
       WHERE 
         disbursedon_date <= $2 AND 
         (closedon_date IS NULL OR closedon_date > $1)`,
      [startDate, endDate]
    );
    
    // Get summary of savings for the month
    const savingsSummary = await db.query(
      `SELECT 
         COUNT(*) as total_accounts,
         SUM(account_balance_derived) as total_balance,
         COUNT(CASE WHEN activated_on_date BETWEEN $1 AND $2 THEN 1 END) as new_accounts,
         SUM(CASE WHEN activated_on_date BETWEEN $1 AND $2 THEN account_balance_derived ELSE 0 END) as new_accounts_balance
       FROM 
         fineract_default.m_savings_account
       WHERE 
         activated_on_date <= $2 AND 
         (closed_on_date IS NULL OR closed_on_date > $1)`,
      [startDate, endDate]
    );
    
    // Get summary of members for the month
    const memberSummary = await db.query(
      `SELECT 
         COUNT(*) as total_members,
         COUNT(CASE WHEN activation_date BETWEEN $1 AND $2 THEN 1 END) as new_members,
         COUNT(CASE WHEN status_enum = 300 THEN 1 END) as active_members,
         COUNT(CASE WHEN status_enum != 300 THEN 1 END) as inactive_members
       FROM 
         fineract_default.client
       WHERE 
         activation_date <= $2`,
      [startDate, endDate]
    );
    
    // Get summary of transactions for the month
    const transactionSummary = await db.query(
      `SELECT 
         COUNT(*) as total_transactions,
         SUM(amount) as total_amount,
         COUNT(CASE WHEN transaction_type_enum = 1 THEN 1 END) as deposit_count,
         SUM(CASE WHEN transaction_type_enum = 1 THEN amount ELSE 0 END) as deposit_amount,
         COUNT(CASE WHEN transaction_type_enum = 2 THEN 1 END) as withdrawal_count,
         SUM(CASE WHEN transaction_type_enum = 2 THEN amount ELSE 0 END) as withdrawal_amount
       FROM 
         fineract_default.m_savings_account_transaction
       WHERE 
         transaction_date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    
    return {
      reportType: RegulatoryReportType.CREDIT_UNION_MONTHLY_STATEMENT,
      startDate,
      endDate,
      summary: 'Monthly credit union statement compiled successfully',
      loanSummary: loanSummary.rows[0],
      savingsSummary: savingsSummary.rows[0],
      memberSummary: memberSummary.rows[0],
      transactionSummary: transactionSummary.rows[0],
      // Mock financial data
      financialSummary: {
        totalAssets: 15000000,
        totalLiabilities: 12500000,
        equity: 2500000,
        reserves: 1500000,
        shareCapital: 1000000,
        undividedSurplus: 500000,
        incomeYTD: 750000,
        expensesYTD: 500000,
        profitYTD: 250000
      }
    };
  }
  
  /**
   * Generate a loan portfolio report
   */
  private async generateLoanPortfolioReport(
    startDate: string, 
    endDate: string, 
    parameters?: Record<string, any>
  ): Promise<any> {
    // Get loan portfolio breakdown by product
    const productBreakdown = await db.query(
      `SELECT 
         lp.name as product_name,
         lp.id as product_id,
         COUNT(l.id) as loan_count,
         SUM(l.principal_amount) as total_principal,
         SUM(l.principal_disbursed_derived) as total_disbursed,
         SUM(l.principal_outstanding_derived) as total_outstanding,
         AVG(l.annual_nominal_interest_rate) as avg_interest_rate
       FROM 
         fineract_default.m_loan l
       JOIN 
         fineract_default.m_product_loan lp ON l.product_id = lp.id
       WHERE 
         l.loan_status NOT IN ('loanStatusType.cancelled', 'loanStatusType.rejected')
         AND l.disbursedon_date <= $2
         AND (l.closedon_date IS NULL OR l.closedon_date > $1)
       GROUP BY 
         lp.id, lp.name
       ORDER BY 
         total_outstanding DESC`,
      [startDate, endDate]
    );
    
    // Get loan portfolio breakdown by status
    const statusBreakdown = await db.query(
      `SELECT 
         loan_status,
         COUNT(*) as loan_count,
         SUM(principal_amount) as total_principal,
         SUM(principal_disbursed_derived) as total_disbursed,
         SUM(principal_outstanding_derived) as total_outstanding
       FROM 
         fineract_default.m_loan
       WHERE 
         disbursedon_date <= $2
         AND (closedon_date IS NULL OR closedon_date > $1)
       GROUP BY 
         loan_status
       ORDER BY 
         loan_count DESC`,
      [startDate, endDate]
    );
    
    // Get delinquency breakdown
    const delinquencyBreakdown = await db.query(
      `SELECT 
         CASE
           WHEN days_in_arrears = 0 THEN 'Current'
           WHEN days_in_arrears BETWEEN 1 AND 30 THEN '1-30 days'
           WHEN days_in_arrears BETWEEN 31 AND 60 THEN '31-60 days'
           WHEN days_in_arrears BETWEEN 61 AND 90 THEN '61-90 days'
           WHEN days_in_arrears > 90 THEN 'Over 90 days'
         END as delinquency_bucket,
         COUNT(*) as loan_count,
         SUM(principal_outstanding_derived) as outstanding_amount,
         SUM(total_overdue_derived) as overdue_amount
       FROM 
         fineract_default.m_loan
       WHERE 
         loan_status = 'loanStatusType.active'
         AND disbursedon_date <= $2
       GROUP BY 
         delinquency_bucket
       ORDER BY 
         MIN(days_in_arrears)`,
      [startDate, endDate]
    );
    
    // Compile the report
    return {
      reportType: RegulatoryReportType.LOAN_PORTFOLIO_REPORT,
      startDate,
      endDate,
      summary: 'Loan portfolio report compiled successfully',
      productBreakdown: productBreakdown.rows,
      statusBreakdown: statusBreakdown.rows,
      delinquencyBreakdown: delinquencyBreakdown.rows,
      totalPortfolio: {
        loanCount: productBreakdown.rows.reduce((sum, row) => sum + parseInt(row.loan_count), 0),
        totalPrincipal: productBreakdown.rows.reduce((sum, row) => sum + parseFloat(row.total_principal), 0),
        totalDisbursed: productBreakdown.rows.reduce((sum, row) => sum + parseFloat(row.total_disbursed), 0),
        totalOutstanding: productBreakdown.rows.reduce((sum, row) => sum + parseFloat(row.total_outstanding), 0)
      },
      portfolioQuality: {
        parRatio: delinquencyBreakdown.rows
          .filter(row => row.delinquency_bucket !== 'Current')
          .reduce((sum, row) => sum + parseFloat(row.outstanding_amount), 0) / 
          productBreakdown.rows.reduce((sum, row) => sum + parseFloat(row.total_outstanding), 0),
        nplRatio: delinquencyBreakdown.rows
          .filter(row => row.delinquency_bucket === 'Over 90 days')
          .reduce((sum, row) => sum + parseFloat(row.outstanding_amount), 0) /
          productBreakdown.rows.reduce((sum, row) => sum + parseFloat(row.total_outstanding), 0)
      }
    };
  }
  
  /**
   * Generate a delinquency report
   */
  private async generateDelinquencyReport(
    startDate: string, 
    endDate: string, 
    parameters?: Record<string, any>
  ): Promise<any> {
    // Get delinquent loans detail
    const delinquentLoans = await db.query(
      `SELECT 
         l.id as loan_id,
         l.account_no,
         l.principal_amount,
         l.principal_outstanding_derived,
         l.total_overdue_derived,
         l.days_in_arrears,
         l.disbursedon_date,
         l.expected_maturedon_date,
         lp.name as product_name,
         c.id as client_id,
         c.firstname,
         c.lastname,
         c.mobile_no
       FROM 
         fineract_default.m_loan l
       JOIN 
         fineract_default.m_product_loan lp ON l.product_id = lp.id
       JOIN 
         fineract_default.client c ON l.client_id = c.id
       WHERE 
         l.loan_status = 'loanStatusType.active'
         AND l.days_in_arrears > 0
       ORDER BY 
         l.days_in_arrears DESC`,
      []
    );
    
    // Get aging summary
    const agingSummary = await db.query(
      `SELECT 
         CASE
           WHEN days_in_arrears BETWEEN 1 AND 30 THEN '1-30 days'
           WHEN days_in_arrears BETWEEN 31 AND 60 THEN '31-60 days'
           WHEN days_in_arrears BETWEEN 61 AND 90 THEN '61-90 days'
           WHEN days_in_arrears BETWEEN 91 AND 180 THEN '91-180 days'
           WHEN days_in_arrears > 180 THEN 'Over 180 days'
         END as aging_bucket,
         COUNT(*) as loan_count,
         SUM(principal_outstanding_derived) as outstanding_amount,
         SUM(total_overdue_derived) as overdue_amount
       FROM 
         fineract_default.m_loan
       WHERE 
         loan_status = 'loanStatusType.active'
         AND days_in_arrears > 0
       GROUP BY 
         aging_bucket
       ORDER BY 
         MIN(days_in_arrears)`,
      []
    );
    
    // Get historical trend
    const historicalTrend = await db.query(
      `WITH monthly_points AS (
        SELECT 
          date_trunc('month', loan_arrears_history.date) as month,
          AVG(days_in_arrears) as avg_days_in_arrears,
          SUM(overdue_amount) as total_overdue,
          COUNT(DISTINCT loan_id) as delinquent_loans
        FROM 
          fineract_default.loan_arrears_history
        WHERE 
          loan_arrears_history.date BETWEEN $1 AND $2
        GROUP BY 
          month
        ORDER BY 
          month
      )
      SELECT * FROM monthly_points`,
      [
        // Go back 12 months from the end date
        new Date(new Date(endDate).setMonth(new Date(endDate).getMonth() - 12)).toISOString(),
        endDate
      ]
    );
    
    // Compile the report
    return {
      reportType: RegulatoryReportType.DELINQUENCY_REPORT,
      startDate,
      endDate,
      summary: 'Delinquency report compiled successfully',
      delinquentLoans: delinquentLoans.rows.map(loan => ({
        loanId: loan.loan_id,
        accountNumber: loan.account_no,
        clientId: loan.client_id,
        clientName: `${loan.firstname} ${loan.lastname}`,
        contactNumber: loan.mobile_no,
        productName: loan.product_name,
        principalAmount: loan.principal_amount,
        outstandingAmount: loan.principal_outstanding_derived,
        overdueAmount: loan.total_overdue_derived,
        daysInArrears: loan.days_in_arrears,
        disbursementDate: loan.disbursedon_date,
        maturityDate: loan.expected_maturedon_date
      })),
      agingSummary: agingSummary.rows,
      historicalTrend: historicalTrend.rows,
      delinquencyMetrics: {
        totalDelinquentLoans: delinquentLoans.rows.length,
        totalOverdueAmount: delinquentLoans.rows.reduce((sum, row) => sum + parseFloat(row.total_overdue_derived), 0),
        totalOutstandingAmount: delinquentLoans.rows.reduce((sum, row) => sum + parseFloat(row.principal_outstanding_derived), 0),
        averageDaysInArrears: delinquentLoans.rows.reduce((sum, row) => sum + parseInt(row.days_in_arrears), 0) / 
          (delinquentLoans.rows.length || 1),
        delinquencyRate: delinquentLoans.rows.length / 
          (await db.query(`SELECT COUNT(*) as total FROM fineract_default.m_loan WHERE loan_status = 'loanStatusType.active'`)).rows[0].total
      }
    };
  }
  
  /**
   * Calculate a due date based on a report deadline
   * @param reportEndDate The end date of the report period
   * @param deadlineRule The deadline rule (e.g., "15 days after quarter end")
   * @returns The calculated due date
   */
  private calculateDueDate(reportEndDate: string, deadlineRule: string): string {
    const endDate = new Date(reportEndDate);
    
    // Parse the deadline rule
    const match = deadlineRule.match(/^(\d+)\s+(\w+)\s+(?:after|from)\s+(.+)$/i);
    
    if (!match) {
      // If rule can't be parsed, default to 30 days after end date
      const dueDate = new Date(endDate);
      dueDate.setDate(dueDate.getDate() + 30);
      return dueDate.toISOString().split('T')[0];
    }
    
    const [_, amount, unit, reference] = match;
    const amountValue = parseInt(amount);
    
    // Determine the reference date
    let referenceDate: Date;
    
    if (reference.includes('quarter end')) {
      referenceDate = new Date(endDate);
      // Ensure it's the end of the quarter
      referenceDate = new Date(
        referenceDate.getFullYear(),
        Math.floor(referenceDate.getMonth() / 3) * 3 + 2,
        new Date(referenceDate.getFullYear(), Math.floor(referenceDate.getMonth() / 3) * 3 + 3, 0).getDate()
      );
    } else if (reference.includes('month end')) {
      referenceDate = new Date(endDate);
      // Ensure it's the end of the month
      referenceDate = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() + 1,
        0
      );
    } else if (reference.includes('year end')) {
      referenceDate = new Date(endDate);
      // Ensure it's the end of the year
      referenceDate = new Date(
        referenceDate.getFullYear(),
        11,
        31
      );
    } else {
      // Default to the report end date
      referenceDate = new Date(endDate);
    }
    
    // Apply the deadline
    const dueDate = new Date(referenceDate);
    
    if (unit.includes('day')) {
      dueDate.setDate(dueDate.getDate() + amountValue);
    } else if (unit.includes('week')) {
      dueDate.setDate(dueDate.getDate() + (amountValue * 7));
    } else if (unit.includes('month')) {
      dueDate.setMonth(dueDate.getMonth() + amountValue);
    }
    
    return dueDate.toISOString().split('T')[0];
  }
  
  /**
   * Get report instances
   * @param status Filter by status
   * @param startDate Filter by start date
   * @param endDate Filter by end date
   * @param reportType Filter by report type
   * @param limit Maximum number of results to return
   * @returns Array of report instances
   */
  async getReportInstances(
    status?: ReportStatus,
    startDate?: string,
    endDate?: string,
    reportType?: RegulatoryReportType,
    limit?: number
  ): Promise<RegReportInstance[]> {
    logger.info('Getting report instances', { status, startDate, endDate, reportType, limit });
    
    // Build the query
    let query = `
      SELECT * FROM fineract_default.regulatory_report_instance
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    if (startDate) {
      params.push(startDate);
      query += ` AND start_date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND end_date <= $${params.length}`;
    }
    
    if (reportType) {
      params.push(reportType);
      query += ` AND report_type = $${params.length}`;
    }
    
    query += ` ORDER BY generated_at DESC`;
    
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    
    const result = await db.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      definitionId: row.definition_id,
      name: row.name,
      reportType: row.report_type,
      startDate: row.start_date,
      endDate: row.end_date,
      dueDate: row.due_date,
      submissionDate: row.submission_date,
      status: row.status,
      format: row.format,
      parameters: row.parameters,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      generatedBy: row.generated_by,
      generatedAt: row.generated_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      submittedBy: row.submitted_by,
      submittedAt: row.submitted_at,
      notes: row.notes,
      metadata: row.metadata
    }));
  }
  
  /**
   * Get a specific report instance
   * @param reportId The ID of the report instance
   * @returns The report instance or null if not found
   */
  async getReportInstance(reportId: string): Promise<RegReportInstance | null> {
    logger.info('Getting report instance', { reportId });
    
    const result = await db.query(
      `SELECT * FROM fineract_default.regulatory_report_instance WHERE id = $1`,
      [reportId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      id: row.id,
      definitionId: row.definition_id,
      name: row.name,
      reportType: row.report_type,
      startDate: row.start_date,
      endDate: row.end_date,
      dueDate: row.due_date,
      submissionDate: row.submission_date,
      status: row.status,
      format: row.format,
      parameters: row.parameters,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      generatedBy: row.generated_by,
      generatedAt: row.generated_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      submittedBy: row.submitted_by,
      submittedAt: row.submitted_at,
      notes: row.notes,
      metadata: row.metadata
    };
  }
  
  /**
   * Update the status of a report instance
   * @param reportId The ID of the report instance
   * @param status The new status
   * @param userId The ID of the user updating the status
   * @param notes Optional notes about the status update
   * @returns The updated report instance
   */
  async updateReportStatus(
    reportId: string, 
    status: ReportStatus, 
    userId: string, 
    notes?: string
  ): Promise<RegReportInstance | null> {
    logger.info('Updating report status', { reportId, status, userId });
    
    const now = new Date().toISOString();
    
    let updateFields = '';
    const params = [reportId, status, now, userId];
    
    if (status === ReportStatus.APPROVED) {
      updateFields = ', approved_by = $4, approved_at = $3';
    } else if (status === ReportStatus.SUBMITTED) {
      updateFields = ', submitted_by = $4, submitted_at = $3, submission_date = $3';
    }
    
    if (notes) {
      params.push(notes);
      updateFields += `, notes = $${params.length}`;
    }
    
    await db.query(
      `UPDATE fineract_default.regulatory_report_instance
       SET status = $2, last_modified_date = $3, last_modified_by = $4${updateFields}
       WHERE id = $1`,
      params
    );
    
    return this.getReportInstance(reportId);
  }
  
  /**
   * Get upcoming report deadlines
   * @param daysAhead Number of days ahead to check
   * @returns Array of upcoming report deadlines
   */
  async getUpcomingDeadlines(daysAhead: number = 30): Promise<any[]> {
    logger.info('Getting upcoming report deadlines', { daysAhead });
    
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const result = await db.query(
      `SELECT 
         ri.id, ri.name, ri.report_type, ri.due_date, ri.status,
         ri.start_date, ri.end_date
       FROM 
         fineract_default.regulatory_report_instance ri
       WHERE 
         ri.due_date BETWEEN $1 AND $2
         AND ri.status NOT IN ($3, $4, $5)
       ORDER BY 
         ri.due_date ASC`,
      [
        today.toISOString().split('T')[0],
        futureDate.toISOString().split('T')[0],
        ReportStatus.COMPLETED,
        ReportStatus.SUBMITTED,
        ReportStatus.APPROVED
      ]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      reportType: row.report_type,
      dueDate: row.due_date,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      daysUntilDue: Math.round((new Date(row.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }));
  }
  
  /**
   * Get report schedules
   * @param active Whether to only return active schedules
   * @returns Array of report schedules
   */
  async getReportSchedules(active?: boolean): Promise<RegReportSchedule[]> {
    logger.info('Getting report schedules', { active });
    
    let query = `
      SELECT 
        rs.*, rd.name, rd.report_type
      FROM 
        fineract_default.regulatory_report_schedule rs
      JOIN 
        fineract_default.regulatory_report_definition rd ON rs.definition_id = rd.id
      ${active !== undefined ? 'WHERE rs.is_active = ' + active : ''}
      ORDER BY 
        rs.next_run ASC
    `;
    
    const result = await db.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      definitionId: row.definition_id,
      name: row.name,
      reportType: row.report_type,
      frequency: row.frequency,
      dayOfMonth: row.day_of_month,
      dayOfWeek: row.day_of_week,
      month: row.month,
      hour: row.hour,
      minute: row.minute,
      parameters: row.parameters,
      isActive: row.is_active,
      lastRun: row.last_run,
      nextRun: row.next_run
    }));
  }
  
  /**
   * Create a report schedule
   * @param definitionId The ID of the report definition
   * @param frequency The frequency of the report
   * @param scheduleParams Schedule parameters (dayOfMonth, dayOfWeek, month, hour, minute)
   * @param reportParams Report parameters
   * @param userId The ID of the user creating the schedule
   * @returns The created report schedule
   */
  async createReportSchedule(
    definitionId: string,
    frequency: ReportFrequency,
    scheduleParams: any,
    reportParams: Record<string, any>,
    userId: string
  ): Promise<RegReportSchedule> {
    logger.info('Creating report schedule', { definitionId, frequency, userId });
    
    // Get the report definition
    const definition = await this.getReportDefinition(definitionId);
    
    if (!definition) {
      throw new Error(`Report definition with ID ${definitionId} not found`);
    }
    
    // Calculate the next run time
    const nextRun = this.calculateNextRun(frequency, scheduleParams);
    
    // Create the schedule
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await db.query(
      `INSERT INTO fineract_default.regulatory_report_schedule(
        id, definition_id, frequency, day_of_month, day_of_week, month, hour, minute,
        parameters, is_active, next_run, created_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        definitionId,
        frequency,
        scheduleParams.dayOfMonth,
        scheduleParams.dayOfWeek,
        scheduleParams.month,
        scheduleParams.hour,
        scheduleParams.minute,
        JSON.stringify(reportParams || {}),
        true,
        nextRun,
        now,
        userId
      ]
    );
    
    return {
      id,
      definitionId,
      frequency,
      ...scheduleParams,
      parameters: reportParams || {},
      isActive: true,
      nextRun
    };
  }
  
  /**
   * Calculate the next run time for a report schedule
   * @param frequency The frequency of the report
   * @param params Schedule parameters
   * @returns The next run time
   */
  private calculateNextRun(frequency: ReportFrequency, params: any): string {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (frequency) {
      case ReportFrequency.DAILY:
        // Set time
        nextRun.setHours(params.hour || 0, params.minute || 0, 0, 0);
        // If time has already passed today, move to tomorrow
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
        
      case ReportFrequency.WEEKLY:
        // Set day of week (0 = Sunday, 6 = Saturday)
        const dayOfWeek = params.dayOfWeek || 1; // Default to Monday
        const currentDay = nextRun.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
        
        nextRun.setDate(nextRun.getDate() + daysToAdd);
        nextRun.setHours(params.hour || 0, params.minute || 0, 0, 0);
        
        // If time has already passed, move to next week
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
        
      case ReportFrequency.MONTHLY:
        // Set day of month
        const dayOfMonth = params.dayOfMonth || 1;
        
        nextRun = new Date(
          nextRun.getFullYear(),
          nextRun.getMonth(),
          dayOfMonth,
          params.hour || 0,
          params.minute || 0,
          0,
          0
        );
        
        // If time has already passed, move to next month
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
        
      case ReportFrequency.QUARTERLY:
        // Set month to the next quarter start
        const currentMonth = now.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        const nextQuarter = (currentQuarter + 1) % 4;
        
        nextRun = new Date(
          nextRun.getFullYear() + (nextQuarter === 0 && currentQuarter === 3 ? 1 : 0),
          nextQuarter * 3,
          params.dayOfMonth || 1,
          params.hour || 0,
          params.minute || 0,
          0,
          0
        );
        break;
        
      case ReportFrequency.SEMI_ANNUALLY:
        // Set month to either January or July
        const currentMonthSemi = now.getMonth();
        
        if (currentMonthSemi < 6) {
          // Next run is July
          nextRun = new Date(
            nextRun.getFullYear(),
            6,
            params.dayOfMonth || 1,
            params.hour || 0,
            params.minute || 0,
            0,
            0
          );
        } else {
          // Next run is January of next year
          nextRun = new Date(
            nextRun.getFullYear() + 1,
            0,
            params.dayOfMonth || 1,
            params.hour || 0,
            params.minute || 0,
            0,
            0
          );
        }
        break;
        
      case ReportFrequency.ANNUALLY:
        // Set month
        const month = params.month || 0; // Default to January
        
        nextRun = new Date(
          nextRun.getFullYear(),
          month,
          params.dayOfMonth || 1,
          params.hour || 0,
          params.minute || 0,
          0,
          0
        );
        
        // If time has already passed, move to next year
        if (nextRun <= now) {
          nextRun.setFullYear(nextRun.getFullYear() + 1);
        }
        break;
        
      default:
        // For on-demand reports, set next run to undefined
        return undefined;
    }
    
    return nextRun.toISOString();
  }
  
  /**
   * Run scheduled reports
   * @returns Array of report generation results
   */
  async runScheduledReports(): Promise<RegReportGenerationResult[]> {
    logger.info('Running scheduled reports');
    
    try {
      // Get schedules due to run
      const now = new Date();
      
      const schedulesResult = await db.query(
        `SELECT 
           rs.*, rd.name, rd.report_type
         FROM 
           fineract_default.regulatory_report_schedule rs
         JOIN 
           fineract_default.regulatory_report_definition rd ON rs.definition_id = rd.id
         WHERE 
           rs.is_active = true AND rs.next_run <= $1`,
        [now.toISOString()]
      );
      
      const results: RegReportGenerationResult[] = [];
      
      // Run each scheduled report
      for (const schedule of schedulesResult.rows) {
        try {
          // Generate date ranges based on frequency
          const { startDate, endDate } = this.calculateReportPeriod(
            schedule.frequency, 
            new Date(schedule.next_run)
          );
          
          // Generate the report
          const result = await this.generateReport(
            {
              reportType: schedule.report_type,
              startDate,
              endDate,
              parameters: schedule.parameters
            },
            'system' // Use system user for scheduled reports
          );
          
          results.push(result);
          
          // Update the schedule
          if (result.success) {
            const nextRun = this.calculateNextRun(
              schedule.frequency,
              {
                dayOfMonth: schedule.day_of_month,
                dayOfWeek: schedule.day_of_week,
                month: schedule.month,
                hour: schedule.hour,
                minute: schedule.minute
              }
            );
            
            await db.query(
              `UPDATE fineract_default.regulatory_report_schedule
               SET last_run = $1, next_run = $2, last_modified_date = $1, last_modified_by = 'system'
               WHERE id = $3`,
              [now.toISOString(), nextRun, schedule.id]
            );
          }
        } catch (error) {
          logger.error('Error running scheduled report', { 
            scheduleId: schedule.id, 
            error 
          });
          
          results.push({
            success: false,
            message: `Error running scheduled report: ${error.message}`
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error running scheduled reports', { error });
      return [{
        success: false,
        message: `Error running scheduled reports: ${error.message}`
      }];
    }
  }
  
  /**
   * Calculate the report period based on frequency and reference date
   * @param frequency The report frequency
   * @param referenceDate The reference date
   * @returns The start and end dates for the report
   */
  private calculateReportPeriod(frequency: ReportFrequency, referenceDate: Date): { startDate: string, endDate: string } {
    const endDate = new Date(referenceDate);
    let startDate = new Date(referenceDate);
    
    switch (frequency) {
      case ReportFrequency.DAILY:
        // Previous day
        startDate.setDate(startDate.getDate() - 1);
        break;
        
      case ReportFrequency.WEEKLY:
        // Previous week
        startDate.setDate(startDate.getDate() - 7);
        break;
        
      case ReportFrequency.MONTHLY:
        // Previous month
        startDate.setMonth(startDate.getMonth() - 1);
        break;
        
      case ReportFrequency.QUARTERLY:
        // Previous quarter
        startDate.setMonth(startDate.getMonth() - 3);
        break;
        
      case ReportFrequency.SEMI_ANNUALLY:
        // Previous 6 months
        startDate.setMonth(startDate.getMonth() - 6);
        break;
        
      case ReportFrequency.ANNUALLY:
        // Previous year
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
        
      default:
        // Default to previous month
        startDate.setMonth(startDate.getMonth() - 1);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
}