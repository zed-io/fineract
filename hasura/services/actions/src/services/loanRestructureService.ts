import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { LoanCalculationService } from './loanCalculationService';
import { LoanInterestRecalculationService } from './loanInterestRecalculationService';
import { 
  LoanRestructureConfiguration,
  InterestRecalculationCompoundingMethod,
  RescheduleStrategyMethod 
} from '../models/loanAdvanced';
import { 
  LoanApplicationTerms, 
  LoanSchedule, 
  toISODateString, 
  calculateDaysBetween 
} from '../models/loan';

/**
 * Service for handling loan restructuring, rescheduling, and refinancing
 */
export class LoanRestructureService {
  private loanCalculationService: LoanCalculationService;
  private interestRecalculationService: LoanInterestRecalculationService;
  
  constructor() {
    this.loanCalculationService = new LoanCalculationService();
    this.interestRecalculationService = new LoanInterestRecalculationService();
  }
  
  /**
   * Create a loan restructure request
   * 
   * @param restructureData The restructure configuration data
   * @param userId The user ID creating the request
   * @returns The created restructure ID
   */
  async createRestructureRequest(
    restructureData: Partial<LoanRestructureConfiguration>,
    userId: string
  ): Promise<string> {
    logger.info('Creating loan restructure request', { 
      sourceLoanId: restructureData.sourceLoanId, 
      restructureType: restructureData.restructureType,
      userId 
    });
    
    return db.transaction(async (client) => {
      try {
        // Get source loan details
        const loanResult = await client.query(
          `SELECT loan_status, currency_code, principal_amount, interest_rate, 
           term_frequency, term_frequency_type, number_of_repayments,
           repayment_every, repayment_frequency_type, interest_method,
           amortization_method, annual_nominal_interest_rate, 
           interest_calculated_from_date, expected_maturity_date,
           principal_outstanding_derived, interest_outstanding_derived,
           fee_charges_outstanding_derived, penalty_charges_outstanding_derived,
           total_outstanding_derived, disbursed_on_date, loan_type_enum
           FROM loan WHERE id = $1`,
          [restructureData.sourceLoanId]
        );
        
        if (loanResult.rowCount === 0) {
          throw new Error('Source loan not found');
        }
        
        const loan = loanResult.rows[0];
        
        // Validate loan is active
        if (loan.loan_status !== 'active') {
          throw new Error(`Cannot restructure loan with status ${loan.loan_status}`);
        }
        
        // Validate restructure type
        const restructureType = restructureData.restructureType || 'reschedule';
        
        // Create restructure request
        const insertResult = await client.query(
          `INSERT INTO m_loan_restructure (
            source_loan_id, restructure_type, reschedule_from_date,
            submitted_on_date, adjusted_due_date, grace_on_principal,
            grace_on_interest, extra_terms, new_interest_rate,
            interest_rate_frequency_type, changed_emi, reason_for_reschedule,
            reschedule_reason_comment, status, accrued_interest_amount,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
          RETURNING id`,
          [
            restructureData.sourceLoanId,
            restructureType,
            restructureData.rescheduleFromDate,
            restructureData.submittedOnDate,
            restructureData.adjustedDueDate,
            restructureData.graceOnPrincipal,
            restructureData.graceOnInterest,
            restructureData.extraTerms,
            restructureData.newInterestRate,
            restructureData.interestRateFrequencyType,
            restructureData.changedEMI,
            restructureData.reasonForReschedule,
            restructureData.rescheduleReasonComment,
            'pending',
            restructureData.interestAccruedTillRescheduledDate || 0,
            userId
          ]
        );
        
        const restructureId = insertResult.rows[0].id;
        
        // Generate preview schedule
        const previewSchedule = await this.generateRestructureSchedule(restructureData);
        
        // Store preview schedule as JSON
        if (previewSchedule) {
          await client.query(
            `UPDATE m_loan_restructure SET
              preview_schedule = $1,
              old_maturity_date = $2,
              new_maturity_date = $3
             WHERE id = $4`,
            [
              JSON.stringify(previewSchedule),
              loan.expected_maturity_date,
              previewSchedule.periods[previewSchedule.periods.length - 1].dueDate,
              restructureId
            ]
          );
        }
        
        return restructureId;
      } catch (error) {
        logger.error('Error creating restructure request', { 
          sourceLoanId: restructureData.sourceLoanId, 
          error 
        });
        throw new Error(`Failed to create restructure request: ${error.message}`);
      }
    });
  }
  
  /**
   * Generate a restructured loan schedule
   * 
   * @param restructureData The restructure configuration
   * @returns The restructured loan schedule
   */
  async generateRestructureSchedule(
    restructureData: Partial<LoanRestructureConfiguration>
  ): Promise<LoanSchedule | null> {
    try {
      // Get source loan details
      const loanResult = await db.query(
        `SELECT id, disbursed_on_date, expected_maturity_date, 
         principal_amount, interest_rate, term_frequency, term_frequency_type, 
         number_of_repayments, repayment_every, repayment_frequency_type, 
         interest_method, amortization_method, annual_nominal_interest_rate, 
         interest_calculated_from_date, days_in_month_enum, days_in_year_enum,
         principal_outstanding_derived, currency_code
         FROM loan WHERE id = $1`,
        [restructureData.sourceLoanId]
      );
      
      if (loanResult.rowCount === 0) {
        return null;
      }
      
      const loan = loanResult.rows[0];
      
      // Get existing schedule
      const scheduleResult = await db.query(
        `SELECT from_date, due_date, principal_amount, interest_amount, 
         fee_charges_amount, penalty_charges_amount, completed_derived
         FROM m_loan_repayment_schedule 
         WHERE loan_id = $1 
         ORDER BY installment_number`,
        [restructureData.sourceLoanId]
      );
      
      // Find the reschedule from date installment
      const rescheduleFromDate = new Date(restructureData.rescheduleFromDate);
      let rescheduleFromInstallment = -1;
      let outstandingPrincipal = loan.principal_outstanding_derived;
      
      for (let i = 0; i < scheduleResult.rows.length; i++) {
        const installment = scheduleResult.rows[i];
        const dueDate = new Date(installment.due_date);
        
        if (dueDate >= rescheduleFromDate && !installment.completed_derived) {
          rescheduleFromInstallment = i;
          break;
        }
      }
      
      if (rescheduleFromInstallment === -1) {
        // No future installments to restructure
        return null;
      }
      
      // Build new loan terms for recalculation
      const modifiedTerms: LoanApplicationTerms = {
        principalAmount: outstandingPrincipal,
        currency: loan.currency_code,
        loanTermFrequency: loan.term_frequency,
        loanTermFrequencyType: loan.term_frequency_type,
        numberOfRepayments: loan.number_of_repayments,
        repaymentEvery: loan.repayment_every,
        repaymentFrequencyType: loan.repayment_frequency_type,
        interestRatePerPeriod: restructureData.newInterestRate || loan.interest_rate,
        interestMethod: loan.interest_method,
        amortizationMethod: loan.amortization_method,
        expectedDisbursementDate: toISODateString(new Date(loan.disbursed_on_date)),
        submittedOnDate: toISODateString(new Date(restructureData.submittedOnDate)),
        repaymentsStartingFromDate: restructureData.adjustedDueDate || undefined,
        graceOnPrincipalPayment: restructureData.graceOnPrincipal,
        graceOnInterestPayment: restructureData.graceOnInterest,
        daysInMonthType: loan.days_in_month_enum,
        daysInYearType: loan.days_in_year_enum
      };
      
      // Apply extra terms if provided
      if (restructureData.extraTerms && restructureData.extraTerms > 0) {
        modifiedTerms.numberOfRepayments += restructureData.extraTerms;
        
        // Adjust loan term frequency to match new number of repayments
        modifiedTerms.loanTermFrequency = modifiedTerms.numberOfRepayments * modifiedTerms.repaymentEvery;
      }
      
      // Generate the new schedule
      const newSchedule = await this.loanCalculationService.generateRepaymentSchedule(modifiedTerms);
      
      return newSchedule;
    } catch (error) {
      logger.error('Error generating restructure schedule', { 
        sourceLoanId: restructureData.sourceLoanId, 
        error 
      });
      return null;
    }
  }
  
  /**
   * Approve a loan restructure request
   * 
   * @param restructureId The restructure ID to approve
   * @param userId The user ID approving the request
   * @param approvalDate The approval date
   * @returns True if successfully approved
   */
  async approveRestructure(
    restructureId: string,
    userId: string,
    approvalDate: string
  ): Promise<boolean> {
    logger.info('Approving loan restructure', { 
      restructureId, 
      userId, 
      approvalDate 
    });
    
    return db.transaction(async (client) => {
      try {
        // Get restructure details
        const restructureResult = await client.query(
          `SELECT id, source_loan_id, restructure_type, reschedule_from_date,
           submitted_on_date, adjusted_due_date, grace_on_principal,
           grace_on_interest, extra_terms, new_interest_rate,
           interest_rate_frequency_type, changed_emi, reason_for_reschedule,
           reschedule_reason_comment, status, preview_schedule,
           accrued_interest_amount, new_maturity_date
           FROM m_loan_restructure WHERE id = $1`,
          [restructureId]
        );
        
        if (restructureResult.rowCount === 0) {
          throw new Error('Restructure request not found');
        }
        
        const restructure = restructureResult.rows[0];
        
        // Validate restructure is pending
        if (restructure.status !== 'pending') {
          throw new Error(`Cannot approve restructure with status ${restructure.status}`);
        }
        
        // Get source loan details
        const loanResult = await client.query(
          `SELECT id, loan_status, currency_code, principal_outstanding_derived, 
           interest_outstanding_derived, fee_charges_outstanding_derived, 
           penalty_charges_outstanding_derived, total_outstanding_derived
           FROM loan WHERE id = $1`,
          [restructure.source_loan_id]
        );
        
        if (loanResult.rowCount === 0) {
          throw new Error('Source loan not found');
        }
        
        const loan = loanResult.rows[0];
        
        // Validate loan is still active
        if (loan.loan_status !== 'active') {
          throw new Error(`Cannot restructure loan with status ${loan.loan_status}`);
        }
        
        // Process based on restructure type
        switch (restructure.restructure_type) {
          case 'reschedule':
            await this.processReschedule(client, restructure, loan, userId, approvalDate);
            break;
            
          case 'refinance':
            await this.processRefinance(client, restructure, loan, userId, approvalDate);
            break;
            
          case 'restructure':
            await this.processFullRestructure(client, restructure, loan, userId, approvalDate);
            break;
            
          default:
            throw new Error(`Unsupported restructure type: ${restructure.restructure_type}`);
        }
        
        // Update restructure status
        await client.query(
          `UPDATE m_loan_restructure SET
            status = 'approved',
            approved_by_user_id = $1,
            approval_date = $2,
            updated_by = $1,
            updated_date = NOW()
           WHERE id = $3`,
          [userId, approvalDate, restructureId]
        );
        
        return true;
      } catch (error) {
        logger.error('Error approving restructure', { restructureId, error });
        throw new Error(`Failed to approve restructure: ${error.message}`);
      }
    });
  }
  
  /**
   * Process a loan reschedule (modifies existing loan)
   * 
   * @param client Database client
   * @param restructure The restructure details
   * @param loan The loan details
   * @param userId The user ID
   * @param approvalDate The approval date
   */
  private async processReschedule(
    client: any,
    restructure: any,
    loan: any,
    userId: string,
    approvalDate: string
  ): Promise<void> {
    // Parse preview schedule
    const previewSchedule = restructure.preview_schedule 
      ? JSON.parse(restructure.preview_schedule)
      : null;
    
    if (!previewSchedule) {
      throw new Error('Missing preview schedule for reschedule');
    }
    
    // First close old installments from reschedule date
    await client.query(
      `UPDATE m_loan_repayment_schedule SET
        is_active = false,
        updated_by = $1,
        updated_on = NOW()
       WHERE loan_id = $2 
       AND due_date >= $3
       AND completed_derived = false`,
      [userId, restructure.source_loan_id, restructure.reschedule_from_date]
    );
    
    // Insert new installments from preview schedule
    for (let i = 0; i < previewSchedule.periods.length; i++) {
      const period = previewSchedule.periods[i];
      
      // Skip disbursement period
      if (period.periodType !== 'repayment') {
        continue;
      }
      
      await client.query(
        `INSERT INTO m_loan_repayment_schedule (
          loan_id, installment_number, from_date, due_date, principal_amount,
          interest_amount, fee_charges_amount, penalty_charges_amount,
          principal_completed_derived, interest_completed_derived,
          fee_charges_completed_derived, penalty_charges_completed_derived,
          principal_writtenoff_derived, interest_writtenoff_derived,
          fee_charges_writtenoff_derived, penalty_charges_writtenoff_derived,
          completed_derived, reschedule_interest_portion, obligations_met_on_date,
          is_active, created_by, created_date, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), $22)`,
        [
          restructure.source_loan_id,
          i + 1, // installment_number
          period.fromDate,
          period.dueDate,
          period.principalDue,
          period.interestDue,
          period.feeChargesDue,
          period.penaltyChargesDue,
          0, // principal_completed_derived
          0, // interest_completed_derived
          0, // fee_charges_completed_derived
          0, // penalty_charges_completed_derived
          0, // principal_writtenoff_derived
          0, // interest_writtenoff_derived
          0, // fee_charges_writtenoff_derived
          0, // penalty_charges_writtenoff_derived
          false, // completed_derived
          restructure.accrued_interest_amount, // reschedule_interest_portion
          null, // obligations_met_on_date
          true, // is_active
          userId, // created_by
          period.principalDue + period.interestDue + period.feeChargesDue + period.penaltyChargesDue // total_amount
        ]
      );
    }
    
    // Update loan fields that have changed
    await client.query(
      `UPDATE loan SET
        interest_rate = $1,
        number_of_repayments = $2,
        term_frequency = $3,
        expected_maturity_date = $4,
        rescheduled_on_date = $5,
        reschedule_reason_id = $6,
        updated_by = $7,
        updated_on = NOW()
       WHERE id = $8`,
      [
        restructure.new_interest_rate || loan.interest_rate,
        restructure.extra_terms 
          ? loan.number_of_repayments + restructure.extra_terms
          : loan.number_of_repayments,
        restructure.extra_terms 
          ? loan.term_frequency + (restructure.extra_terms * loan.repayment_every)
          : loan.term_frequency,
        restructure.new_maturity_date,
        approvalDate,
        restructure.reason_for_reschedule,
        userId,
        restructure.source_loan_id
      ]
    );
  }
  
  /**
   * Process a loan refinance (creates new loan and closes old one)
   * 
   * @param client Database client
   * @param restructure The restructure details
   * @param loan The loan details
   * @param userId The user ID
   * @param approvalDate The approval date
   */
  private async processRefinance(
    client: any,
    restructure: any,
    loan: any,
    userId: string,
    approvalDate: string
  ): Promise<void> {
    // For refinance, we close the current loan and create a new one

    // First create the closing transaction for the source loan
    const closingTxnResult = await client.query(
      `INSERT INTO m_loan_transaction (
        loan_id, transaction_type_enum, transaction_date, amount, 
        principal_portion, interest_portion, fee_charges_portion, 
        penalty_charges_portion, submitted_on_date, created_by, 
        created_date, is_reversed, outstanding_loan_balance_derived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12)
      RETURNING id`,
      [
        restructure.source_loan_id,
        9, // CLOSE_RESCHEDULE enum value
        approvalDate,
        loan.total_outstanding_derived,
        loan.principal_outstanding_derived,
        loan.interest_outstanding_derived,
        loan.fee_charges_outstanding_derived,
        loan.penalty_charges_outstanding_derived,
        approvalDate,
        userId,
        false, // is_reversed
        0 // outstanding_loan_balance_derived
      ]
    );
    
    const closingTxnId = closingTxnResult.rows[0].id;
    
    // Update source loan status
    await client.query(
      `UPDATE loan SET
        loan_status = 'closed_reschedule',
        closed_on_date = $1,
        closed_by_user_id = $2,
        updated_by = $2,
        updated_on = NOW()
       WHERE id = $3`,
      [approvalDate, userId, restructure.source_loan_id]
    );
    
    // Now create the new refinanced loan
    // First get full source loan details
    const sourceLoanResult = await client.query(
      `SELECT * FROM loan WHERE id = $1`,
      [restructure.source_loan_id]
    );
    
    const sourceLoan = sourceLoanResult.rows[0];
    
    // Create the new loan with modified terms
    const newLoanResult = await client.query(
      `INSERT INTO loan (
        account_no, external_id, client_id, group_id, product_id, loan_type_enum, 
        currency_code, currency_digits, currency_multiplesof, principal_amount, 
        approved_principal, principal_disbursed_derived, total_disbursed_derived, 
        interest_rate, interest_method, term_frequency, term_frequency_type,
        number_of_repayments, repayment_every, repayment_frequency_type, 
        amortization_method, annual_nominal_interest_rate, interest_calculated_from_date,
        days_in_month_enum, days_in_year_enum, interest_recalculation_enabled, 
        allow_partial_period_interest_calc, expected_maturity_date,
        submitted_on_date, approved_on_date, approval_user_id,
        disbursed_on_date, disbursal_user_id, loan_status, parent_loan_id,
        created_by, created_date, updated_by, updated_on
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, NOW(), $37, NOW()
      ) RETURNING id`,
      [
        uuidv4(), // Generate new account number
        null, // external_id
        sourceLoan.client_id,
        sourceLoan.group_id,
        sourceLoan.product_id,
        sourceLoan.loan_type_enum,
        sourceLoan.currency_code,
        sourceLoan.currency_digits,
        sourceLoan.currency_multiplesof,
        loan.total_outstanding_derived, // New principal is old outstanding
        loan.total_outstanding_derived, // approved_principal
        loan.total_outstanding_derived, // principal_disbursed_derived
        loan.total_outstanding_derived, // total_disbursed_derived
        restructure.new_interest_rate || sourceLoan.interest_rate,
        sourceLoan.interest_method,
        restructure.extra_terms 
          ? (sourceLoan.number_of_repayments + restructure.extra_terms) * sourceLoan.repayment_every
          : sourceLoan.term_frequency,
        sourceLoan.term_frequency_type,
        restructure.extra_terms 
          ? sourceLoan.number_of_repayments + restructure.extra_terms
          : sourceLoan.number_of_repayments,
        sourceLoan.repayment_every,
        sourceLoan.repayment_frequency_type,
        sourceLoan.amortization_method,
        (restructure.new_interest_rate || sourceLoan.interest_rate) * 12, // annual rate
        sourceLoan.interest_calculated_from_date,
        sourceLoan.days_in_month_enum,
        sourceLoan.days_in_year_enum,
        sourceLoan.interest_recalculation_enabled,
        sourceLoan.allow_partial_period_interest_calc,
        restructure.new_maturity_date,
        approvalDate, // submitted_on_date is approval date
        approvalDate, // approved_on_date
        userId, // approval_user_id
        approvalDate, // disbursed_on_date is approval date
        userId, // disbursal_user_id
        'active', // loan_status
        restructure.source_loan_id, // parent_loan_id to track relationship
        userId, // created_by
        userId // updated_by
      ]
    );
    
    const newLoanId = newLoanResult.rows[0].id;
    
    // Create repayment schedule for new loan
    const previewSchedule = restructure.preview_schedule 
      ? JSON.parse(restructure.preview_schedule)
      : null;
    
    if (previewSchedule) {
      for (let i = 0; i < previewSchedule.periods.length; i++) {
        const period = previewSchedule.periods[i];
        
        // Skip disbursement period
        if (period.periodType !== 'repayment') {
          continue;
        }
        
        await client.query(
          `INSERT INTO m_loan_repayment_schedule (
            loan_id, installment_number, from_date, due_date, principal_amount,
            interest_amount, fee_charges_amount, penalty_charges_amount,
            principal_completed_derived, interest_completed_derived,
            fee_charges_completed_derived, penalty_charges_completed_derived,
            principal_writtenoff_derived, interest_writtenoff_derived,
            fee_charges_writtenoff_derived, penalty_charges_writtenoff_derived,
            completed_derived, reschedule_interest_portion, obligations_met_on_date,
            is_active, created_by, created_date, total_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), $22)`,
          [
            newLoanId,
            i + 1, // installment_number
            period.fromDate,
            period.dueDate,
            period.principalDue,
            period.interestDue,
            period.feeChargesDue,
            period.penaltyChargesDue,
            0, // principal_completed_derived
            0, // interest_completed_derived
            0, // fee_charges_completed_derived
            0, // penalty_charges_completed_derived
            0, // principal_writtenoff_derived
            0, // interest_writtenoff_derived
            0, // fee_charges_writtenoff_derived
            0, // penalty_charges_writtenoff_derived
            false, // completed_derived
            restructure.accrued_interest_amount, // reschedule_interest_portion
            null, // obligations_met_on_date
            true, // is_active
            userId, // created_by
            period.principalDue + period.interestDue + period.feeChargesDue + period.penaltyChargesDue // total_amount
          ]
        );
      }
    }
    
    // Add the restructure relationship
    await client.query(
      `UPDATE m_loan_restructure SET
        new_loan_id = $1
       WHERE id = $2`,
      [newLoanId, restructure.id]
    );
  }
  
  /**
   * Process a full loan restructure (combines reschedule and refinance elements)
   * 
   * @param client Database client
   * @param restructure The restructure details
   * @param loan The loan details
   * @param userId The user ID
   * @param approvalDate The approval date
   */
  private async processFullRestructure(
    client: any,
    restructure: any,
    loan: any,
    userId: string,
    approvalDate: string
  ): Promise<void> {
    // Full restructure is similar to refinance, but with more options for modification
    // For simplicity, we'll implement using the refinance logic for now
    await this.processRefinance(client, restructure, loan, userId, approvalDate);
  }
  
  /**
   * Reject a loan restructure request
   * 
   * @param restructureId The restructure ID to reject
   * @param userId The user ID rejecting the request
   * @param rejectionReason The reason for rejection
   * @returns True if successfully rejected
   */
  async rejectRestructure(
    restructureId: string,
    userId: string,
    rejectionReason: string
  ): Promise<boolean> {
    logger.info('Rejecting loan restructure', { 
      restructureId, 
      userId
    });
    
    try {
      // Get restructure details
      const restructureResult = await db.query(
        'SELECT id, status FROM m_loan_restructure WHERE id = $1',
        [restructureId]
      );
      
      if (restructureResult.rowCount === 0) {
        throw new Error('Restructure request not found');
      }
      
      const restructure = restructureResult.rows[0];
      
      // Validate restructure is pending
      if (restructure.status !== 'pending') {
        throw new Error(`Cannot reject restructure with status ${restructure.status}`);
      }
      
      // Update restructure status
      await db.query(
        `UPDATE m_loan_restructure SET
          status = 'rejected',
          rejection_reason = $1,
          updated_by = $2,
          updated_date = NOW()
         WHERE id = $3`,
        [rejectionReason, userId, restructureId]
      );
      
      return true;
    } catch (error) {
      logger.error('Error rejecting restructure', { restructureId, error });
      throw new Error(`Failed to reject restructure: ${error.message}`);
    }
  }
  
  /**
   * Get restructure history for a loan
   * 
   * @param loanId The loan ID
   * @returns Array of restructure records
   */
  async getLoanRestructureHistory(loanId: string): Promise<Partial<LoanRestructureConfiguration>[]> {
    try {
      const result = await db.query(
        `SELECT r.id, r.source_loan_id, r.restructure_type, r.reschedule_from_date,
         r.submitted_on_date, r.adjusted_due_date, r.grace_on_principal,
         r.grace_on_interest, r.extra_terms, r.new_interest_rate,
         r.interest_rate_frequency_type, r.changed_emi, r.reason_for_reschedule,
         r.reschedule_reason_comment, r.status, r.new_loan_id, 
         r.old_maturity_date, r.new_maturity_date, r.approval_date,
         r.approved_by_user_id, u1.username as approved_by_username,
         r.rejection_reason, r.created_by, u2.username as created_by_username,
         r.created_date
         FROM m_loan_restructure r
         LEFT JOIN app_user u1 ON r.approved_by_user_id = u1.id
         LEFT JOIN app_user u2 ON r.created_by = u2.id
         WHERE r.source_loan_id = $1 OR r.new_loan_id = $1
         ORDER BY r.submitted_on_date DESC`,
        [loanId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting loan restructure history', { loanId, error });
      throw new Error(`Failed to get loan restructure history: ${error.message}`);
    }
  }
}