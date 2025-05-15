import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Interface for credit check request
 */
export interface CreditCheckRequest {
  clientId: string;
  identificationNumber?: string;
  identificationType?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  includeHistory?: boolean;
  requestSource?: string;
}

/**
 * Interface for credit check result
 */
export interface CreditCheckResult {
  requestId: string;
  clientId: string;
  creditScore: number;
  scoreDate: string;
  reportReference?: string;
  creditBureau: string;
  riskCategory: string;
  delinquencyStatus: boolean;
  activeLoans: number;
  totalOutstanding?: number;
  maxDaysInArrears?: number;
  bankruptcyFlag: boolean;
  fraudFlag: boolean;
  inquiryCount: number;
  inquiryLast90Days: number;
  reportContent?: any;
  reportSummary?: string;
  errors?: string[];
}

/**
 * Service for performing credit checks from various credit bureaus
 * Integrates with Trinidad & Tobago credit reporting agencies
 */
export class CreditCheckService {
  /**
   * Perform a credit check for a client
   * @param request Credit check request parameters
   * @returns Credit check results
   */
  async performCreditCheck(request: CreditCheckRequest): Promise<CreditCheckResult> {
    logger.info('Performing credit check', { clientId: request.clientId });
    
    try {
      // First check if we have a recent credit check in our database
      const recentCheck = await this.getRecentCreditCheck(request.clientId);
      
      if (recentCheck) {
        logger.info('Using recent credit check', { 
          clientId: request.clientId, 
          reportId: recentCheck.id,
          scoreDate: recentCheck.check_date
        });
        
        return this.formatDatabaseResult(recentCheck);
      }
      
      // No recent check, so perform a new one
      // Get client details if not provided
      if (!request.identificationNumber || !request.firstName || !request.lastName) {
        const clientDetails = await this.getClientDetails(request.clientId);
        
        if (clientDetails) {
          request.identificationNumber = request.identificationNumber || clientDetails.identification_number;
          request.identificationType = request.identificationType || clientDetails.identification_type;
          request.firstName = request.firstName || clientDetails.firstname;
          request.lastName = request.lastName || clientDetails.lastname;
          request.dateOfBirth = request.dateOfBirth || clientDetails.date_of_birth;
        }
      }
      
      // Call external credit bureau
      // In a real implementation, this would connect to the credit bureau APIs
      const creditBureauResult = await this.callCreditBureau(request);
      
      // Store the result in the database
      const storedResult = await this.storeCreditCheckResult(request.clientId, creditBureauResult);
      
      // Update client's credit score if needed
      await this.updateClientCreditScore(request.clientId, creditBureauResult.creditScore);
      
      // Update any associated loan applications with the credit score
      await this.updateAssociatedLoans(request.clientId, creditBureauResult.creditScore);
      
      return creditBureauResult;
    } catch (error) {
      logger.error('Error performing credit check', { 
        clientId: request.clientId, 
        error: error.message 
      });
      
      throw new Error(`Failed to perform credit check: ${error.message}`);
    }
  }
  
  /**
   * Get a client's recent credit check if it exists
   * @param clientId The client ID
   * @returns Recent credit check result or null
   */
  private async getRecentCreditCheck(clientId: string): Promise<any> {
    // Check for a credit report less than 90 days old
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const query = await db.query(
      `SELECT * FROM fineract_default.credit_check
       WHERE client_id = $1
       AND check_date > $2
       ORDER BY check_date DESC
       LIMIT 1`,
      [clientId, ninetyDaysAgo.toISOString()]
    );
    
    return query.rows.length > 0 ? query.rows[0] : null;
  }
  
  /**
   * Get client details from the database
   * @param clientId The client ID
   * @returns Client details object
   */
  private async getClientDetails(clientId: string): Promise<any> {
    const query = await db.query(
      `SELECT 
         c.id, 
         c.firstname, 
         c.lastname, 
         c.date_of_birth,
         ci.document_type as identification_type, 
         ci.document_key as identification_number
       FROM 
         fineract_default.client c
       LEFT JOIN 
         fineract_default.client_identifier ci ON c.id = ci.client_id
       WHERE 
         c.id = $1
       LIMIT 1`,
      [clientId]
    );
    
    return query.rows.length > 0 ? query.rows[0] : null;
  }
  
  /**
   * Call the credit bureau API
   * Currently simulated for development
   * @param request Credit check request
   * @returns Credit check result
   */
  private async callCreditBureau(request: CreditCheckRequest): Promise<CreditCheckResult> {
    logger.info('Calling credit bureau API', { 
      clientId: request.clientId,
      bureau: process.env.DEFAULT_CREDIT_BUREAU || 'TTCB' // Trinidad & Tobago Credit Bureau
    });
    
    // In a real implementation, this would make an API call to the credit bureau
    // For now, simulate the credit check with randomized but realistic data
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a realistic credit score based on ID to ensure consistency
    const idSeed = request.identificationNumber 
      ? parseInt(request.identificationNumber.replace(/\D/g, '').slice(-4)) 
      : Math.floor(Math.random() * 1000);
    
    const baseScore = 550; // Minimum score
    const scoreRange = 300; // Range above minimum
    const seedPercentage = (idSeed % 100) / 100; // 0-1 value based on ID
    
    // Credit score between 550-850 with consistency for the same client
    const creditScore = Math.floor(baseScore + (scoreRange * seedPercentage));
    
    // Determine risk category
    let riskCategory = 'HIGH';
    if (creditScore >= 750) {
      riskCategory = 'LOW';
    } else if (creditScore >= 650) {
      riskCategory = 'MEDIUM';
    }
    
    // Generate other fields with some correlation to the credit score
    const delinquencyStatus = creditScore < 600;
    const bankruptcyFlag = creditScore < 570;
    const fraudFlag = creditScore < 560 && Math.random() < 0.1; // 10% chance if score is very low
    
    // Number of loans should be higher for lower scores (showing financial distress)
    const baseLoans = Math.max(0, Math.floor((900 - creditScore) / 150));
    const activeLoans = baseLoans + Math.floor(Math.random() * 2);
    
    // More inquiries for lower scores
    const inquiryBase = Math.max(0, Math.floor((900 - creditScore) / 120));
    const inquiryCount = inquiryBase + Math.floor(Math.random() * 3);
    const inquiryLast90Days = Math.min(inquiryCount, Math.floor(Math.random() * (inquiryBase + 1)));
    
    // Days in arrears should be higher for lower scores
    const maxDaysInArrears = delinquencyStatus 
      ? Math.floor((650 - Math.min(650, creditScore)) / 2)
      : 0;
    
    // Outstanding debt
    const totalOutstanding = activeLoans > 0 
      ? activeLoans * 5000 + Math.floor(Math.random() * 10000)
      : 0;
    
    const result: CreditCheckResult = {
      requestId: uuidv4(),
      clientId: request.clientId,
      creditScore,
      scoreDate: new Date().toISOString(),
      reportReference: `TTCB-${Math.floor(Math.random() * 1000000)}`,
      creditBureau: process.env.DEFAULT_CREDIT_BUREAU || 'TTCB',
      riskCategory,
      delinquencyStatus,
      activeLoans,
      totalOutstanding,
      maxDaysInArrears,
      bankruptcyFlag,
      fraudFlag,
      inquiryCount,
      inquiryLast90Days,
      reportSummary: this.generateReportSummary(
        creditScore, 
        riskCategory, 
        activeLoans, 
        delinquencyStatus, 
        bankruptcyFlag
      )
    };
    
    return result;
  }
  
  /**
   * Store credit check result in the database
   * @param clientId The client ID
   * @param result Credit check result
   * @returns Stored database record
   */
  private async storeCreditCheckResult(clientId: string, result: CreditCheckResult): Promise<any> {
    const id = uuidv4();
    const now = new Date();
    
    const query = await db.query(
      `INSERT INTO fineract_default.credit_check (
        id, client_id, credit_score, check_date, report_reference,
        credit_bureau, risk_category, delinquency_status, active_loans,
        total_outstanding, max_days_arrears, bankruptcy_flag, fraud_flag,
        inquiry_count, inquiry_last_90_days, report_summary,
        created_date, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *`,
      [
        id, 
        clientId, 
        result.creditScore, 
        result.scoreDate, 
        result.reportReference,
        result.creditBureau, 
        result.riskCategory, 
        result.delinquencyStatus, 
        result.activeLoans,
        result.totalOutstanding, 
        result.maxDaysInArrears, 
        result.bankruptcyFlag, 
        result.fraudFlag,
        result.inquiryCount, 
        result.inquiryLast90Days, 
        result.reportSummary,
        now,
        'system'
      ]
    );
    
    return query.rows[0];
  }
  
  /**
   * Generate a human-readable report summary
   */
  private generateReportSummary(
    score: number, 
    risk: string, 
    loans: number, 
    delinquent: boolean, 
    bankruptcy: boolean
  ): string {
    let summary = `Credit score: ${score} (${risk} risk category). `;
    
    if (loans > 0) {
      summary += `Has ${loans} active loan${loans > 1 ? 's' : ''}. `;
    } else {
      summary += 'No active loans. ';
    }
    
    if (delinquent) {
      summary += 'Has delinquent payments on record. ';
    }
    
    if (bankruptcy) {
      summary += 'Has bankruptcy record. ';
    }
    
    if (score >= 750) {
      summary += 'Excellent credit history with strong repayment patterns.';
    } else if (score >= 650) {
      summary += 'Good credit standing with consistent payment history.';
    } else if (score >= 600) {
      summary += 'Fair credit with some areas for improvement.';
    } else {
      summary += 'Poor credit history with significant risk factors.';
    }
    
    return summary;
  }
  
  /**
   * Update client's credit score in the database
   * @param clientId The client ID
   * @param creditScore The new credit score
   */
  private async updateClientCreditScore(clientId: string, creditScore: number): Promise<void> {
    await db.query(
      `UPDATE fineract_default.client
       SET credit_score = $1, last_credit_check_date = $2
       WHERE id = $3`,
      [creditScore, new Date().toISOString(), clientId]
    );
  }
  
  /**
   * Update any associated loans with the new credit score
   * @param clientId The client ID
   * @param creditScore The new credit score
   */
  private async updateAssociatedLoans(clientId: string, creditScore: number): Promise<void> {
    // Find loans in submitted_and_pending_approval status
    await db.query(
      `UPDATE fineract_default.loan
       SET credit_score = $1, credit_check_date = $2
       WHERE client_id = $3 AND loan_status = 'submitted_and_pending_approval'`,
      [creditScore, new Date().toISOString(), clientId]
    );
  }
  
  /**
   * Format database result into API response
   * @param dbResult Database record
   * @returns Formatted API response
   */
  private formatDatabaseResult(dbResult: any): CreditCheckResult {
    return {
      requestId: dbResult.id,
      clientId: dbResult.client_id,
      creditScore: dbResult.credit_score,
      scoreDate: dbResult.check_date,
      reportReference: dbResult.report_reference,
      creditBureau: dbResult.credit_bureau,
      riskCategory: dbResult.risk_category,
      delinquencyStatus: dbResult.delinquency_status,
      activeLoans: dbResult.active_loans,
      totalOutstanding: dbResult.total_outstanding,
      maxDaysInArrears: dbResult.max_days_arrears,
      bankruptcyFlag: dbResult.bankruptcy_flag,
      fraudFlag: dbResult.fraud_flag,
      inquiryCount: dbResult.inquiry_count,
      inquiryLast90Days: dbResult.inquiry_last_90_days,
      reportSummary: dbResult.report_summary
    };
  }
  
  /**
   * Get credit check history for a client
   * @param clientId The client ID
   * @param limit Maximum number of records to return
   * @returns Array of credit check results
   */
  async getCreditCheckHistory(clientId: string, limit = 10): Promise<CreditCheckResult[]> {
    const query = await db.query(
      `SELECT * FROM fineract_default.credit_check
       WHERE client_id = $1
       ORDER BY check_date DESC
       LIMIT $2`,
      [clientId, limit]
    );
    
    return query.rows.map(row => this.formatDatabaseResult(row));
  }
  
  /**
   * Get a specific credit check by ID
   * @param checkId The credit check ID
   * @returns Credit check result
   */
  async getCreditCheckById(checkId: string): Promise<CreditCheckResult | null> {
    const query = await db.query(
      `SELECT * FROM fineract_default.credit_check
       WHERE id = $1`,
      [checkId]
    );
    
    if (query.rows.length === 0) {
      return null;
    }
    
    return this.formatDatabaseResult(query.rows[0]);
  }
}