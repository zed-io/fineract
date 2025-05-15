import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { InterestPausePeriod } from '../models/loanAdvanced';
import { calculateDaysBetween } from '../models/loan';

/**
 * Service for handling loan interest pause periods
 * Supports pausing interest accrual for defined date ranges
 */
export class LoanInterestPauseService {
  
  /**
   * Create a new interest pause period for a loan
   * 
   * @param loanId The loan ID
   * @param startDate The start date for pausing interest
   * @param endDate The end date for pausing interest
   * @param reasonId Optional reason code
   * @param reasonComment Optional reason comment
   * @param userId The user ID creating the pause
   * @returns The created interest pause ID
   */
  async createInterestPause(
    loanId: string,
    startDate: string,
    endDate: string,
    reasonId: string | null,
    reasonComment: string | null,
    userId: string
  ): Promise<string> {
    logger.info('Creating loan interest pause', { 
      loanId, 
      startDate, 
      endDate, 
      userId 
    });
    
    return db.transaction(async (client) => {
      try {
        // Get loan details
        const loanResult = await client.query(
          'SELECT loan_status, disbursed_on_date FROM loan WHERE id = $1',
          [loanId]
        );
        
        if (loanResult.rowCount === 0) {
          throw new Error('Loan not found');
        }
        
        const loan = loanResult.rows[0];
        
        // Validate loan is active
        if (loan.loan_status !== 'active') {
          throw new Error(`Cannot pause interest for loan with status ${loan.loan_status}`);
        }
        
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const disbursedOn = new Date(loan.disbursed_on_date);
        const today = new Date();
        
        if (start < disbursedOn) {
          throw new Error('Interest pause start date cannot be before loan disbursement date');
        }
        
        if (end <= start) {
          throw new Error('Interest pause end date must be after start date');
        }
        
        // Check for overlapping pause periods
        const overlapResult = await client.query(
          `SELECT id FROM m_loan_interest_pause
           WHERE loan_id = $1 
           AND is_active = true
           AND (
             (start_date <= $2 AND end_date >= $2) OR
             (start_date <= $3 AND end_date >= $3) OR
             (start_date >= $2 AND end_date <= $3)
           )`,
          [loanId, startDate, endDate]
        );
        
        if (overlapResult.rowCount > 0) {
          throw new Error('Interest pause period overlaps with existing pause period');
        }
        
        // Insert interest pause record
        const insertResult = await client.query(
          `INSERT INTO m_loan_interest_pause (
            loan_id, start_date, end_date, reason_id, reason_comment,
            is_active, is_period_active, created_by_user_id, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING id`,
          [
            loanId,
            startDate,
            endDate,
            reasonId,
            reasonComment,
            true, // is_active
            start <= today && end >= today, // is_period_active
            userId
          ]
        );
        
        const pauseId = insertResult.rows[0].id;
        
        // If pause is active now, update loan interest pause flag
        if (start <= today && end >= today) {
          await client.query(
            `UPDATE loan SET
              interest_pause_status = 'active',
              updated_by = $1,
              updated_on = NOW()
             WHERE id = $2`,
            [userId, loanId]
          );
        }
        
        return pauseId;
      } catch (error) {
        logger.error('Error creating interest pause', { loanId, error });
        throw new Error(`Failed to create interest pause: ${error.message}`);
      }
    });
  }
  
  /**
   * Cancel an interest pause period
   * 
   * @param pauseId The pause ID to cancel
   * @param userId The user ID cancelling the pause
   * @param cancellationReason Optional reason for cancellation
   * @returns True if successfully cancelled
   */
  async cancelInterestPause(
    pauseId: string,
    userId: string,
    cancellationReason?: string
  ): Promise<boolean> {
    logger.info('Cancelling loan interest pause', { 
      pauseId, 
      userId 
    });
    
    return db.transaction(async (client) => {
      try {
        // Get pause details
        const pauseResult = await client.query(
          `SELECT p.id, p.loan_id, p.start_date, p.end_date, p.is_active, 
           p.is_period_active
           FROM m_loan_interest_pause p
           WHERE p.id = $1`,
          [pauseId]
        );
        
        if (pauseResult.rowCount === 0) {
          throw new Error('Interest pause not found');
        }
        
        const pause = pauseResult.rows[0];
        
        // Validate pause is active
        if (!pause.is_active) {
          throw new Error('Interest pause is already inactive');
        }
        
        // Mark pause as inactive
        await client.query(
          `UPDATE m_loan_interest_pause SET
            is_active = false,
            is_period_active = false,
            cancellation_reason = $1,
            cancelled_by_user_id = $2,
            cancelled_date = NOW(),
            updated_by = $2,
            updated_date = NOW()
           WHERE id = $3`,
          [cancellationReason, userId, pauseId]
        );
        
        // If pause was active, check if there are other active pauses
        if (pause.is_period_active) {
          const activeResult = await client.query(
            `SELECT COUNT(*) as active_count
             FROM m_loan_interest_pause
             WHERE loan_id = $1
             AND is_active = true
             AND is_period_active = true`,
            [pause.loan_id]
          );
          
          const activeCount = parseInt(activeResult.rows[0].active_count);
          
          // If no other active pauses, update loan flag
          if (activeCount === 0) {
            await client.query(
              `UPDATE loan SET
                interest_pause_status = 'inactive',
                updated_by = $1,
                updated_on = NOW()
               WHERE id = $2`,
              [userId, pause.loan_id]
            );
          }
        }
        
        return true;
      } catch (error) {
        logger.error('Error cancelling interest pause', { pauseId, error });
        throw new Error(`Failed to cancel interest pause: ${error.message}`);
      }
    });
  }
  
  /**
   * Get all interest pause periods for a loan
   * 
   * @param loanId The loan ID
   * @param activeOnly Whether to include only active pauses
   * @returns Array of interest pause periods
   */
  async getInterestPausePeriods(
    loanId: string,
    activeOnly: boolean = false
  ): Promise<Partial<InterestPausePeriod>[]> {
    try {
      let query = `
        SELECT p.id, p.loan_id, p.start_date, p.end_date, p.reason_id,
        r.code as reason_code, r.name as reason_name, p.reason_comment,
        p.is_active, p.is_period_active, p.created_by_user_id,
        u1.username as created_by_username, p.created_date,
        p.cancelled_by_user_id, u2.username as cancelled_by_username,
        p.cancelled_date, p.cancellation_reason
        FROM m_loan_interest_pause p
        LEFT JOIN m_code_value r ON p.reason_id = r.id
        LEFT JOIN app_user u1 ON p.created_by_user_id = u1.id
        LEFT JOIN app_user u2 ON p.cancelled_by_user_id = u2.id
        WHERE p.loan_id = $1
      `;
      
      const params = [loanId];
      
      if (activeOnly) {
        query += ' AND p.is_active = true';
      }
      
      query += ' ORDER BY p.start_date DESC';
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting interest pause periods', { loanId, error });
      throw new Error(`Failed to get interest pause periods: ${error.message}`);
    }
  }
  
  /**
   * Check if a loan has active interest pause for a given date
   * 
   * @param loanId The loan ID
   * @param date The date to check (defaults to today)
   * @returns The active pause period if found, null otherwise
   */
  async hasActiveInterestPause(
    loanId: string,
    date?: string
  ): Promise<Partial<InterestPausePeriod> | null> {
    try {
      const checkDate = date ? new Date(date) : new Date();
      const formattedDate = checkDate.toISOString().split('T')[0];
      
      const result = await db.query(
        `SELECT p.id, p.loan_id, p.start_date, p.end_date, p.reason_id,
         r.code as reason_code, r.name as reason_name, p.reason_comment,
         p.is_active, p.is_period_active, p.created_by_user_id,
         u.username as created_by_username, p.created_date
         FROM m_loan_interest_pause p
         LEFT JOIN m_code_value r ON p.reason_id = r.id
         LEFT JOIN app_user u ON p.created_by_user_id = u.id
         WHERE p.loan_id = $1
         AND p.is_active = true
         AND p.start_date <= $2
         AND p.end_date >= $2
         ORDER BY p.created_date DESC
         LIMIT 1`,
        [loanId, formattedDate]
      );
      
      if (result.rowCount === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error checking for active interest pause', { loanId, date, error });
      throw new Error(`Failed to check active interest pause: ${error.message}`);
    }
  }
  
  /**
   * Update interest pause status for all loans
   * Used for batch updates at day change
   * 
   * @returns Object with counts of updated loans
   */
  async updateAllInterestPauseStatuses(): Promise<{ 
    activated: number; 
    deactivated: number;
  }> {
    logger.info('Updating interest pause statuses for all loans');
    
    return db.transaction(async (client) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        let activated = 0;
        let deactivated = 0;
        
        // Find loans that should now have active pause
        const toActivateResult = await client.query(
          `SELECT DISTINCT l.id
           FROM loan l
           JOIN m_loan_interest_pause p ON l.id = p.loan_id
           WHERE l.interest_pause_status <> 'active'
           AND l.loan_status = 'active'
           AND p.is_active = true
           AND p.start_date <= $1
           AND p.end_date >= $1`,
          [today]
        );
        
        // Update loans to activate pause
        if (toActivateResult.rowCount > 0) {
          const loanIds = toActivateResult.rows.map(row => row.id);
          
          // Update loan status
          for (const loanId of loanIds) {
            await client.query(
              `UPDATE loan SET
                interest_pause_status = 'active',
                updated_by = 'system',
                updated_on = NOW()
               WHERE id = $1`,
              [loanId]
            );
            
            // Update pause period flag
            await client.query(
              `UPDATE m_loan_interest_pause SET
                is_period_active = true,
                updated_by = 'system',
                updated_date = NOW()
               WHERE loan_id = $1
               AND is_active = true
               AND start_date <= $2
               AND end_date >= $2`,
              [loanId, today]
            );
          }
          
          activated = loanIds.length;
        }
        
        // Find loans that should now have inactive pause
        const toDeactivateResult = await client.query(
          `SELECT l.id
           FROM loan l
           WHERE l.interest_pause_status = 'active'
           AND l.loan_status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM m_loan_interest_pause p
             WHERE p.loan_id = l.id
             AND p.is_active = true
             AND p.start_date <= $1
             AND p.end_date >= $1
           )`,
          [today]
        );
        
        // Update loans to deactivate pause
        if (toDeactivateResult.rowCount > 0) {
          const loanIds = toDeactivateResult.rows.map(row => row.id);
          
          // Update loan status
          for (const loanId of loanIds) {
            await client.query(
              `UPDATE loan SET
                interest_pause_status = 'inactive',
                updated_by = 'system',
                updated_on = NOW()
               WHERE id = $1`,
              [loanId]
            );
            
            // Update pause period flag
            await client.query(
              `UPDATE m_loan_interest_pause SET
                is_period_active = false,
                updated_by = 'system',
                updated_date = NOW()
               WHERE loan_id = $1
               AND is_period_active = true`,
              [loanId]
            );
          }
          
          deactivated = loanIds.length;
        }
        
        logger.info('Interest pause status update completed', { 
          activated, 
          deactivated 
        });
        
        return { activated, deactivated };
      } catch (error) {
        logger.error('Error updating interest pause statuses', { error });
        throw new Error(`Failed to update interest pause statuses: ${error.message}`);
      }
    });
  }
  
  /**
   * Calculate total interest-free days for a loan
   * 
   * @param loanId The loan ID
   * @returns Total number of interest-free days
   */
  async calculateTotalInterestFreeDays(loanId: string): Promise<number> {
    try {
      // Get all active pause periods
      const result = await db.query(
        `SELECT start_date, end_date
         FROM m_loan_interest_pause
         WHERE loan_id = $1
         AND is_active = true
         ORDER BY start_date`,
        [loanId]
      );
      
      if (result.rowCount === 0) {
        return 0;
      }
      
      // Calculate total days, accounting for overlapping periods
      let totalDays = 0;
      let periodRanges: { start: Date; end: Date }[] = [];
      
      // First, convert all periods to date ranges
      for (const period of result.rows) {
        periodRanges.push({
          start: new Date(period.start_date),
          end: new Date(period.end_date)
        });
      }
      
      // Sort by start date
      periodRanges.sort((a, b) => a.start.getTime() - b.start.getTime());
      
      // Merge overlapping ranges
      let mergedRanges: { start: Date; end: Date }[] = [];
      let currentRange = periodRanges[0];
      
      for (let i = 1; i < periodRanges.length; i++) {
        const nextRange = periodRanges[i];
        
        // Check if ranges overlap
        if (nextRange.start <= new Date(currentRange.end.getTime() + 86400000)) {
          // Extend current range if next range ends later
          if (nextRange.end > currentRange.end) {
            currentRange.end = nextRange.end;
          }
        } else {
          // No overlap, add current range to merged list and move to next
          mergedRanges.push(currentRange);
          currentRange = nextRange;
        }
      }
      
      // Add the last range
      mergedRanges.push(currentRange);
      
      // Calculate total days from merged ranges
      for (const range of mergedRanges) {
        totalDays += calculateDaysBetween(range.start, range.end) + 1; // +1 to include end date
      }
      
      return totalDays;
    } catch (error) {
      logger.error('Error calculating total interest-free days', { loanId, error });
      throw new Error(`Failed to calculate interest-free days: ${error.message}`);
    }
  }
  
  /**
   * Get interest adjustment amount based on pause periods
   * 
   * @param loanId The loan ID
   * @param interestRate The loan interest rate
   * @param outstandingPrincipal The outstanding principal
   * @returns The interest adjustment amount
   */
  async calculateInterestAdjustment(
    loanId: string,
    interestRate: number,
    outstandingPrincipal: number
  ): Promise<number> {
    try {
      // Get total interest-free days
      const totalDays = await this.calculateTotalInterestFreeDays(loanId);
      
      if (totalDays === 0) {
        return 0;
      }
      
      // Calculate daily interest rate
      const dailyRate = interestRate / 100 / 365;
      
      // Calculate adjustment
      const adjustment = outstandingPrincipal * dailyRate * totalDays;
      
      // Round to 2 decimal places
      return Math.round(adjustment * 100) / 100;
    } catch (error) {
      logger.error('Error calculating interest adjustment', { 
        loanId, 
        interestRate, 
        outstandingPrincipal, 
        error 
      });
      throw new Error(`Failed to calculate interest adjustment: ${error.message}`);
    }
  }
}