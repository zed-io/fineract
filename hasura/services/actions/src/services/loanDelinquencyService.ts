import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { DelinquencyDetails, DelinquencyClassification } from '../models/loanAdvanced';

/**
 * Service for handling loan delinquency management
 * Tracks and manages overdue loans
 */
export class LoanDelinquencyService {
  
  /**
   * Process delinquency for a loan
   * Checks if a loan is delinquent and updates the classification
   * 
   * @param loanId The loan ID
   * @param force Whether to force recalculation even if already processed
   * @returns The delinquency details if delinquent, null otherwise
   */
  async processDelinquency(
    loanId: string,
    force: boolean = false
  ): Promise<DelinquencyDetails | null> {
    logger.info('Processing loan delinquency', { loanId, force });
    
    try {
      // Get loan details
      const loanResult = await db.query(
        `SELECT l.id, l.loan_status, l.expected_maturity_date, 
         l.disbursed_on_date, l.principal_outstanding_derived,
         l.total_outstanding_derived
         FROM loan l
         WHERE l.id = $1`,
        [loanId]
      );
      
      if (loanResult.rowCount === 0) {
        throw new Error('Loan not found');
      }
      
      const loan = loanResult.rows[0];
      
      // Skip if loan is not active
      if (loan.loan_status !== 'active') {
        return null;
      }
      
      // Skip if no outstanding balance
      if (loan.total_outstanding_derived <= 0) {
        return null;
      }
      
      // Check for overdue installments
      const overdueResult = await db.query(
        `SELECT MIN(ls.due_date) as oldest_overdue_date,
         SUM(ls.principal_amount) as overdue_principal,
         SUM(ls.interest_amount) as overdue_interest,
         SUM(ls.fee_charges_amount) as overdue_fees,
         SUM(ls.penalty_charges_amount) as overdue_penalties,
         SUM(ls.total_amount) as total_overdue,
         COUNT(*) as overdue_installments
         FROM m_loan_repayment_schedule ls
         WHERE ls.loan_id = $1 
         AND ls.due_date < CURRENT_DATE
         AND ls.completed_derived = false`,
        [loanId]
      );
      
      // No overdue installments, clear any existing delinquency
      if (!overdueResult.rows[0].oldest_overdue_date) {
        // Clear delinquency if exists
        await this.clearDelinquency(loanId);
        return null;
      }
      
      const overdueInfo = overdueResult.rows[0];
      const oldestOverdueDate = new Date(overdueInfo.oldest_overdue_date);
      const today = new Date();
      
      // Calculate days overdue
      const delinquentDays = Math.floor((today.getTime() - oldestOverdueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Skip if not delinquent (less than 1 day overdue)
      if (delinquentDays < 1) {
        await this.clearDelinquency(loanId);
        return null;
      }
      
      // Determine delinquency classification
      const classification = this.getDelinquencyClassification(delinquentDays);
      
      // Check if delinquency record already exists
      const delinquencyResult = await db.query(
        `SELECT id, classification, delinquent_days, delinquent_amount,
         delinquent_date, last_delinquent_date, oldest_unpaid_installment_date,
         is_active
         FROM m_loan_delinquency
         WHERE loan_id = $1 AND is_active = true`,
        [loanId]
      );
      
      let delinquencyId: string | null = null;
      let previousClassification = DelinquencyClassification.NO_DELINQUENCY;
      
      if (delinquencyResult.rowCount > 0) {
        const existingDelinquency = delinquencyResult.rows[0];
        delinquencyId = existingDelinquency.id;
        previousClassification = existingDelinquency.classification;
        
        // Skip update if not forced and days are the same
        if (!force && existingDelinquency.delinquent_days === delinquentDays) {
          return {
            id: existingDelinquency.id,
            loanId,
            classification,
            delinquentDays,
            delinquentAmount: overdueInfo.total_overdue,
            delinquentDate: existingDelinquency.delinquent_date,
            lastDelinquentDate: new Date().toISOString(),
            oldestUnpaidInstallmentDate: overdueInfo.oldest_overdue_date,
            isActive: true,
            previousClassification: existingDelinquency.classification !== classification 
              ? existingDelinquency.classification 
              : undefined,
            classificationChangedDate: existingDelinquency.classification !== classification 
              ? new Date().toISOString() 
              : undefined
          };
        }
      }
      
      // Create or update delinquency record
      if (delinquencyId) {
        // Update existing record
        await db.query(
          `UPDATE m_loan_delinquency SET
            classification = $1,
            delinquent_days = $2,
            delinquent_amount = $3,
            last_delinquent_date = NOW(),
            oldest_unpaid_installment_date = $4,
            previous_classification = CASE 
              WHEN classification <> $1 THEN classification 
              ELSE previous_classification 
            END,
            classification_changed_date = CASE 
              WHEN classification <> $1 THEN NOW() 
              ELSE classification_changed_date 
            END
           WHERE id = $5`,
          [
            classification,
            delinquentDays,
            overdueInfo.total_overdue,
            overdueInfo.oldest_overdue_date,
            delinquencyId
          ]
        );
      } else {
        // Create new record
        const insertResult = await db.query(
          `INSERT INTO m_loan_delinquency (
            loan_id, classification, delinquent_days, delinquent_amount,
            delinquent_date, last_delinquent_date, oldest_unpaid_installment_date,
            is_active, created_date
          ) VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, true, NOW())
          RETURNING id`,
          [
            loanId,
            classification,
            delinquentDays,
            overdueInfo.total_overdue,
            overdueInfo.oldest_overdue_date
          ]
        );
        
        delinquencyId = insertResult.rows[0].id;
      }
      
      // Check if we need to apply penalty charges for delinquency
      if (classification !== previousClassification) {
        // Add delinquency penalty charge if configured
        await this.applyDelinquencyPenalty(loanId, classification);
      }
      
      // Return delinquency details
      return {
        id: delinquencyId,
        loanId,
        classification,
        delinquentDays,
        delinquentAmount: overdueInfo.total_overdue,
        delinquentDate: new Date().toISOString(),
        lastDelinquentDate: new Date().toISOString(),
        oldestUnpaidInstallmentDate: overdueInfo.oldest_overdue_date,
        isActive: true,
        previousClassification: previousClassification !== classification ? previousClassification : undefined,
        classificationChangedDate: previousClassification !== classification ? new Date().toISOString() : undefined
      };
    } catch (error) {
      logger.error('Error processing delinquency', { loanId, error });
      throw new Error(`Failed to process delinquency: ${error.message}`);
    }
  }
  
  /**
   * Clear delinquency status for a loan
   * 
   * @param loanId The loan ID
   * @returns True if cleared, false if no active delinquency
   */
  async clearDelinquency(loanId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `UPDATE m_loan_delinquency SET
          is_active = false,
          resolved_date = NOW()
         WHERE loan_id = $1 AND is_active = true`,
        [loanId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error clearing delinquency', { loanId, error });
      throw new Error(`Failed to clear delinquency: ${error.message}`);
    }
  }
  
  /**
   * Process delinquency for all active loans
   * Used for batch processing
   * 
   * @returns Number of delinquent loans processed
   */
  async processAllDelinquencies(): Promise<number> {
    logger.info('Processing delinquency for all active loans');
    
    try {
      // Get all active loans with outstanding balance
      const loansResult = await db.query(
        `SELECT id
         FROM loan
         WHERE loan_status = 'active'
         AND total_outstanding_derived > 0`
      );
      
      const loans = loansResult.rows;
      let delinquentCount = 0;
      
      // Process each loan
      for (const loan of loans) {
        try {
          const delinquency = await this.processDelinquency(loan.id);
          if (delinquency) {
            delinquentCount++;
          }
        } catch (error) {
          logger.error('Error processing delinquency for loan', { loanId: loan.id, error });
          // Continue with next loan
        }
      }
      
      logger.info(`Delinquency processing completed`, { 
        totalLoans: loans.length, 
        delinquentLoans: delinquentCount 
      });
      
      return delinquentCount;
    } catch (error) {
      logger.error('Error processing all delinquencies', { error });
      throw new Error(`Failed to process all delinquencies: ${error.message}`);
    }
  }
  
  /**
   * Get all delinquent loans by classification
   * 
   * @param classification Optional classification to filter by
   * @param activeOnly Whether to include only active delinquencies
   * @returns Array of delinquent loans
   */
  async getDelinquentLoans(
    classification?: DelinquencyClassification,
    activeOnly: boolean = true
  ): Promise<any[]> {
    try {
      let query = `
        SELECT d.id as delinquency_id, d.loan_id, d.classification, 
        d.delinquent_days, d.delinquent_amount, d.delinquent_date, 
        d.last_delinquent_date, d.oldest_unpaid_installment_date,
        d.is_active, d.previous_classification, d.classification_changed_date,
        l.account_no as loan_account_no, l.total_outstanding_derived,
        c.id as client_id, c.firstname, c.lastname, c.display_name as client_name,
        c.mobile_no, c.email_address
        FROM m_loan_delinquency d
        JOIN loan l ON d.loan_id = l.id
        JOIN client c ON l.client_id = c.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      // Add classification filter if provided
      if (classification) {
        query += ` AND d.classification = $${paramIndex}`;
        params.push(classification);
        paramIndex++;
      }
      
      // Add active filter if requested
      if (activeOnly) {
        query += ` AND d.is_active = $${paramIndex}`;
        params.push(true);
        paramIndex++;
      }
      
      // Order by delinquent days (most delinquent first)
      query += ` ORDER BY d.delinquent_days DESC`;
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting delinquent loans', { classification, error });
      throw new Error(`Failed to get delinquent loans: ${error.message}`);
    }
  }
  
  /**
   * Get delinquency history for a loan
   * 
   * @param loanId The loan ID
   * @returns Array of delinquency records for the loan
   */
  async getDelinquencyHistory(loanId: string): Promise<Partial<DelinquencyDetails>[]> {
    try {
      const result = await db.query(
        `SELECT id, loan_id, classification, delinquent_days, delinquent_amount,
         delinquent_date, last_delinquent_date, oldest_unpaid_installment_date,
         is_active, previous_classification, classification_changed_date,
         resolved_date, created_date
         FROM m_loan_delinquency
         WHERE loan_id = $1
         ORDER BY delinquent_date DESC`,
        [loanId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting delinquency history', { loanId, error });
      throw new Error(`Failed to get delinquency history: ${error.message}`);
    }
  }
  
  /**
   * Determine delinquency classification based on days overdue
   * 
   * @param daysOverdue Number of days overdue
   * @returns Delinquency classification
   */
  private getDelinquencyClassification(daysOverdue: number): DelinquencyClassification {
    if (daysOverdue < 30) {
      return DelinquencyClassification.NO_DELINQUENCY;
    } else if (daysOverdue < 60) {
      return DelinquencyClassification.DELINQUENT_30;
    } else if (daysOverdue < 90) {
      return DelinquencyClassification.DELINQUENT_60;
    } else if (daysOverdue < 120) {
      return DelinquencyClassification.DELINQUENT_90;
    } else if (daysOverdue < 150) {
      return DelinquencyClassification.DELINQUENT_120;
    } else if (daysOverdue < 180) {
      return DelinquencyClassification.DELINQUENT_150;
    } else {
      return DelinquencyClassification.DELINQUENT_180;
    }
  }
  
  /**
   * Apply delinquency penalty charge if configured
   * 
   * @param loanId The loan ID
   * @param classification The delinquency classification
   * @returns True if penalty applied, false otherwise
   */
  private async applyDelinquencyPenalty(
    loanId: string,
    classification: DelinquencyClassification
  ): Promise<boolean> {
    try {
      // Check if delinquency charge is configured for this classification
      const chargeResult = await db.query(
        `SELECT c.id, c.name, c.amount, c.currency_code, 
         c.charge_calculation_enum, c.charge_time_enum,
         c.charge_payment_mode_enum, c.penalty, c.active
         FROM m_charge c
         JOIN m_charge_delinquency_config dc ON c.id = dc.charge_id
         WHERE dc.classification = $1 AND c.active = true`,
        [classification]
      );
      
      // No penalty configured for this classification
      if (chargeResult.rowCount === 0) {
        return false;
      }
      
      const charge = chargeResult.rows[0];
      
      // Get loan currency
      const loanResult = await db.query(
        'SELECT currency_code FROM loan WHERE id = $1',
        [loanId]
      );
      
      if (loanResult.rowCount === 0) {
        return false;
      }
      
      const loanCurrency = loanResult.rows[0].currency_code;
      
      // Validate currency matches
      if (charge.currency_code !== loanCurrency) {
        logger.warn('Delinquency charge currency does not match loan currency', {
          loanId,
          loanCurrency,
          chargeCurrency: charge.currency_code
        });
        return false;
      }
      
      // Insert loan charge
      await db.query(
        `INSERT INTO m_loan_charge (
          loan_id, charge_id, name, amount, currency_code, 
          charge_time_enum, charge_calculation_enum, due_date, 
          is_penalty, is_paid, is_waived, is_active, 
          created_by, created_date, amount_outstanding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, $10, $11, 'system', NOW(), $12)`,
        [
          loanId,
          charge.id,
          `${charge.name} - ${classification}`,
          charge.amount,
          charge.currency_code,
          charge.charge_time_enum,
          charge.charge_calculation_enum,
          true, // is_penalty
          false, // is_paid
          false, // is_waived
          true, // is_active
          charge.amount // amount_outstanding
        ]
      );
      
      return true;
    } catch (error) {
      logger.error('Error applying delinquency penalty', { loanId, classification, error });
      // Don't throw - non-critical operation
      return false;
    }
  }
}