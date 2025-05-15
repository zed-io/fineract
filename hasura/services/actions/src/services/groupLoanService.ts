/**
 * Group loan service for Fineract
 * Provides functionality for managing loans associated with groups
 */

import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import { GroupStatus } from '../models/group';

/**
 * Group loan service class
 */
export class GroupLoanService {
  
  /**
   * Create a loan for a group
   * @param groupId Group ID
   * @param loanRequest Loan request data
   * @param userId Current user ID
   * @returns Created loan ID and details
   */
  async createGroupLoan(groupId: string, loanRequest: any, userId?: string): Promise<any> {
    logger.info('Creating loan for group', { groupId });
    
    try {
      return await transaction(async (client) => {
        // Check if group exists and is active
        const groupResult = await client.query(
          'SELECT * FROM client_group WHERE id = $1',
          [groupId]
        );
        
        if (groupResult.rowCount === 0) {
          throw new Error(`Group with ID ${groupId} not found`);
        }
        
        const group = groupResult.rows[0];
        
        if (group.status !== GroupStatus.ACTIVE) {
          throw new Error(`Cannot create a loan for a group with status ${group.status}`);
        }
        
        // Validate loan product
        const productResult = await client.query(
          'SELECT * FROM loan_product WHERE id = $1',
          [loanRequest.productId]
        );
        
        if (productResult.rowCount === 0) {
          throw new Error(`Loan product with ID ${loanRequest.productId} not found`);
        }
        
        const product = productResult.rows[0];
        
        // Check if group loan is allowed for this product
        if (!product.allow_group_lending) {
          throw new Error('This loan product does not support group lending');
        }
        
        // Generate account number
        const accountNumber = `GL${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Generate loan ID
        const loanId = uuidv4();
        
        // Set default values from product if not provided
        const principal = loanRequest.principal || product.min_principal_amount;
        const interestRate = loanRequest.interestRate || product.interest_rate_per_period;
        const termFrequency = loanRequest.termFrequency || product.default_loan_term;
        const termFrequencyType = loanRequest.termFrequencyType || product.term_period_frequency_type;
        const interestType = loanRequest.interestType || product.interest_method;
        const amortizationType = loanRequest.amortizationType || product.amortization_method;
        const interestCalculationPeriodType = loanRequest.interestCalculationPeriodType || product.interest_calculation_period_type;
        const repaymentFrequency = loanRequest.repaymentFrequency || product.repayment_frequency;
        const repaymentFrequencyType = loanRequest.repaymentFrequencyType || product.repayment_frequency_type;
        const repaymentEvery = loanRequest.repaymentEvery || product.repayment_every;
        const transactionProcessingStrategyId = loanRequest.transactionProcessingStrategyId || product.transaction_processing_strategy_id;
        
        // Insert loan record
        await client.query(
          `INSERT INTO loan (
            id, account_no, group_id, client_id, product_id, loan_type, 
            currency_code, currency_digits, currency_multiplesof, 
            principal_amount, approved_principal, term_frequency, term_frequency_type, 
            annual_nominal_interest_rate, interest_method, interest_calculated_in_period_type, 
            term_frequency_type, repayment_frequency, repayment_frequency_type, repayment_every,
            amortization_method, transaction_processing_strategy_id,
            loan_status, submitted_on_date, submitted_by_user_id,
            expected_disbursement_date, created_by, created_date
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
            $21, $22, $23, $24, $25, $26, $27, NOW()
          )`,
          [
            loanId,
            accountNumber,
            groupId,
            null, // client_id is null for group loans
            loanRequest.productId,
            'group', // loan_type
            product.currency_code,
            product.currency_digits,
            product.currency_multiplesof,
            principal,
            null, // approved_principal - set at approval
            termFrequency,
            termFrequencyType,
            interestRate,
            interestType,
            interestCalculationPeriodType,
            termFrequencyType,
            repaymentFrequency,
            repaymentFrequencyType,
            repaymentEvery,
            amortizationType,
            transactionProcessingStrategyId,
            'submitted_and_pending_approval', // initial status
            loanRequest.submittedOnDate ? new Date(loanRequest.submittedOnDate) : new Date(),
            userId || null,
            loanRequest.expectedDisbursementDate ? new Date(loanRequest.expectedDisbursementDate) : null,
            userId || null
          ]
        );
        
        // Handle loan charges if provided
        if (loanRequest.charges && loanRequest.charges.length > 0) {
          for (const charge of loanRequest.charges) {
            await client.query(
              `INSERT INTO loan_charge (
                id, loan_id, charge_id, amount, amount_outstanding_derived,
                calculation_percentage, calculation_on_amount, charge_time_type,
                charge_calculation_type, is_penalty, is_paid_derived, is_waived,
                created_by, created_date
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
              )`,
              [
                uuidv4(),
                loanId,
                charge.chargeId,
                charge.amount,
                charge.amount, // initially outstanding = full amount
                charge.percentage || null,
                charge.amountPercentageAppliedTo || null,
                charge.chargeTimeType || 'disbursement',
                charge.chargeCalculationType || 'flat',
                charge.isPenalty || false,
                false, // initially not paid
                false, // initially not waived
                userId || null
              ]
            );
          }
        }
        
        // Add note if provided
        if (loanRequest.note) {
          await client.query(
            `INSERT INTO loan_note (
              id, loan_id, note, created_by, created_date
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), loanId, loanRequest.note, userId || null]
          );
        }
        
        return {
          success: true,
          loanId,
          accountNumber,
          groupId,
          loanStatus: 'submitted_and_pending_approval',
          submittedOnDate: loanRequest.submittedOnDate || new Date().toISOString()
        };
      });
    } catch (error) {
      logger.error('Error creating group loan', { error, groupId, loanRequest });
      throw error;
    }
  }
  
  /**
   * Get all loans associated with a group
   * @param groupId Group ID
   * @returns List of loans for the group
   */
  async getGroupLoans(groupId: string): Promise<any[]> {
    logger.info('Getting loans for group', { groupId });
    
    try {
      // Verify group exists
      const groupResult = await query(
        'SELECT * FROM client_group WHERE id = $1',
        [groupId]
      );
      
      if (groupResult.rowCount === 0) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      // Get loans associated with the group
      const loansResult = await query(
        `SELECT 
          l.id, l.account_no, l.loan_status, l.principal_amount, l.approved_principal,
          l.disbursed_on_date, l.expected_maturity_date, l.interest_method,
          l.annual_nominal_interest_rate, l.term_frequency, l.term_frequency_type,
          l.submitted_on_date, l.approved_on_date, l.disbursed_on_date,
          l.expected_disbursement_date, l.closed_on_date,
          lp.name as product_name, lp.short_name as product_short_name,
          o.name as office_name, o.id as office_id,
          l.principal_disbursed_derived, l.principal_outstanding_derived,
          l.principal_repaid_derived, l.interest_outstanding_derived,
          l.interest_repaid_derived, l.total_charges_due_at_disbursement_derived,
          l.total_expected_repayment_derived, l.total_repayment_derived
        FROM loan l
        JOIN loan_product lp ON l.product_id = lp.id
        JOIN client_group g ON l.group_id = g.id
        JOIN office o ON g.office_id = o.id
        WHERE l.group_id = $1
        ORDER BY l.submitted_on_date DESC`,
        [groupId]
      );
      
      return loansResult.rows.map(loan => ({
        id: loan.id,
        accountNo: loan.account_no,
        status: loan.loan_status,
        productName: loan.product_name,
        productShortName: loan.product_short_name,
        officeName: loan.office_name,
        officeId: loan.office_id,
        
        // Amounts
        principal: loan.principal_amount,
        approvedPrincipal: loan.approved_principal,
        principalDisbursed: loan.principal_disbursed_derived,
        principalOutstanding: loan.principal_outstanding_derived,
        principalRepaid: loan.principal_repaid_derived,
        interestOutstanding: loan.interest_outstanding_derived,
        interestRepaid: loan.interest_repaid_derived,
        totalChargesDue: loan.total_charges_due_at_disbursement_derived,
        totalExpectedRepayment: loan.total_expected_repayment_derived,
        totalRepaid: loan.total_repayment_derived,
        
        // Terms
        interestRate: loan.annual_nominal_interest_rate,
        interestMethod: loan.interest_method,
        termFrequency: loan.term_frequency,
        termFrequencyType: loan.term_frequency_type,
        
        // Dates
        submittedOnDate: loan.submitted_on_date,
        approvedOnDate: loan.approved_on_date,
        disbursedOnDate: loan.disbursed_on_date,
        expectedDisbursementDate: loan.expected_disbursement_date,
        expectedMaturityDate: loan.expected_maturity_date,
        closedOnDate: loan.closed_on_date
      }));
    } catch (error) {
      logger.error('Error getting group loans', { error, groupId });
      throw error;
    }
  }
  
  /**
   * Get a specific group loan with details
   * @param groupId Group ID
   * @param loanId Loan ID
   * @returns Detailed loan information
   */
  async getGroupLoanDetails(groupId: string, loanId: string): Promise<any> {
    logger.info('Getting loan details for group', { groupId, loanId });
    
    try {
      return await transaction(async (client) => {
        // Verify loan exists and belongs to the group
        const loanResult = await client.query(
          `SELECT 
            l.*, lp.name as product_name, lp.short_name as product_short_name,
            o.name as office_name, o.id as office_id,
            g.group_name
          FROM loan l
          JOIN loan_product lp ON l.product_id = lp.id
          JOIN client_group g ON l.group_id = g.id
          JOIN office o ON g.office_id = o.id
          WHERE l.id = $1 AND l.group_id = $2`,
          [loanId, groupId]
        );
        
        if (loanResult.rowCount === 0) {
          throw new Error(`Loan with ID ${loanId} not found for group ${groupId}`);
        }
        
        const loan = loanResult.rows[0];
        
        // Get loan transactions
        const transactionsResult = await client.query(
          `SELECT 
            lt.*, ltt.enum_message as transaction_type_description,
            pd.receipt_number, pd.check_number, pd.account_number,
            pt.name as payment_type_name
          FROM loan_transaction lt
          LEFT JOIN loan_transaction_type ltt ON lt.transaction_type = ltt.enum_value
          LEFT JOIN payment_detail pd ON lt.payment_detail_id = pd.id
          LEFT JOIN payment_type pt ON pd.payment_type_id = pt.id
          WHERE lt.loan_id = $1
          ORDER BY lt.transaction_date DESC, lt.created_date DESC`,
          [loanId]
        );
        
        // Get loan charges
        const chargesResult = await client.query(
          `SELECT 
            lc.*, c.name as charge_name, c.currency_code,
            c.charge_time_type, c.charge_calculation_type, c.is_penalty
          FROM loan_charge lc
          JOIN charge c ON lc.charge_id = c.id
          WHERE lc.loan_id = $1
          ORDER BY lc.created_date DESC`,
          [loanId]
        );
        
        // Get loan notes
        const notesResult = await client.query(
          `SELECT *
          FROM loan_note
          WHERE loan_id = $1
          ORDER BY created_date DESC`,
          [loanId]
        );
        
        // Get repayment schedule if available
        const scheduleResult = await client.query(
          `SELECT *
          FROM loan_repayment_schedule
          WHERE loan_id = $1
          ORDER BY installment_number ASC`,
          [loanId]
        );
        
        // Format response
        return {
          loanDetails: {
            id: loan.id,
            accountNo: loan.account_no,
            status: loan.loan_status,
            groupId: loan.group_id,
            groupName: loan.group_name,
            loanType: loan.loan_type,
            
            // Product info
            productId: loan.product_id,
            productName: loan.product_name,
            productShortName: loan.product_short_name,
            
            // Office info
            officeId: loan.office_id,
            officeName: loan.office_name,
            
            // Currency info
            currencyCode: loan.currency_code,
            currencyDigits: loan.currency_digits,
            currencyMultiplesOf: loan.currency_multiplesof,
            
            // Amounts
            principal: loan.principal_amount,
            approvedPrincipal: loan.approved_principal,
            principalDisbursed: loan.principal_disbursed_derived,
            principalOutstanding: loan.principal_outstanding_derived,
            principalRepaid: loan.principal_repaid_derived,
            interestOutstanding: loan.interest_outstanding_derived,
            interestRepaid: loan.interest_repaid_derived,
            totalExpectedRepayment: loan.total_expected_repayment_derived,
            totalRepaid: loan.total_repayment_derived,
            
            // Terms
            interestRate: loan.annual_nominal_interest_rate,
            interestRateFrequencyType: loan.interest_rate_frequency_type,
            interestType: loan.interest_method,
            interestCalculationPeriodType: loan.interest_calculated_in_period_type,
            termFrequency: loan.term_frequency,
            termFrequencyType: loan.term_frequency_type,
            repaymentFrequency: loan.repayment_frequency,
            repaymentFrequencyType: loan.repayment_frequency_type,
            repaymentEvery: loan.repayment_every,
            amortizationType: loan.amortization_method,
            
            // Dates
            submittedOnDate: loan.submitted_on_date,
            approvedOnDate: loan.approved_on_date,
            disbursedOnDate: loan.disbursed_on_date,
            expectedDisbursementDate: loan.expected_disbursement_date,
            expectedMaturityDate: loan.expected_maturity_date,
            closedOnDate: loan.closed_on_date,
            
            // Audit
            createdDate: loan.created_date,
            createdBy: loan.created_by,
            lastModifiedDate: loan.last_modified_date,
            lastModifiedBy: loan.last_modified_by
          },
          
          transactions: transactionsResult.rows.map(tx => ({
            id: tx.id,
            transactionType: tx.transaction_type,
            transactionTypeDescription: tx.transaction_type_description,
            amount: tx.amount,
            principal: tx.principal_portion_derived,
            interest: tx.interest_portion_derived,
            fees: tx.fee_charges_portion_derived,
            penalties: tx.penalty_charges_portion_derived,
            outstanding: tx.outstanding_loan_balance_derived,
            transactionDate: tx.transaction_date,
            paymentTypeName: tx.payment_type_name,
            receiptNumber: tx.receipt_number,
            checkNumber: tx.check_number,
            accountNumber: tx.account_number,
            createdDate: tx.created_date
          })),
          
          charges: chargesResult.rows.map(charge => ({
            id: charge.id,
            chargeId: charge.charge_id,
            chargeName: charge.charge_name,
            amount: charge.amount,
            amountOutstanding: charge.amount_outstanding_derived,
            amountPaid: charge.amount_paid_derived,
            amountWaived: charge.amount_waived_derived,
            isPenalty: charge.is_penalty,
            isPaid: charge.is_paid_derived,
            isWaived: charge.is_waived,
            chargeTimeType: charge.charge_time_type,
            chargeCalculationType: charge.charge_calculation_type,
            dueDate: charge.due_date
          })),
          
          notes: notesResult.rows.map(note => ({
            id: note.id,
            note: note.note,
            createdBy: note.created_by,
            createdDate: note.created_date
          })),
          
          repaymentSchedule: scheduleResult.rows.map(schedule => ({
            id: schedule.id,
            installmentNumber: schedule.installment_number,
            dueDate: schedule.due_date,
            principalAmount: schedule.principal_amount,
            principalCompleted: schedule.principal_completed_derived,
            principalOutstanding: schedule.principal_outstanding_derived,
            interestAmount: schedule.interest_amount,
            interestCompleted: schedule.interest_completed_derived,
            interestOutstanding: schedule.interest_outstanding_derived,
            feeChargesAmount: schedule.fee_charges_amount,
            feeChargesCompleted: schedule.fee_charges_completed_derived,
            feeChargesOutstanding: schedule.fee_charges_outstanding_derived,
            penaltyChargesAmount: schedule.penalty_charges_amount,
            penaltyChargesCompleted: schedule.penalty_charges_completed_derived,
            penaltyChargesOutstanding: schedule.penalty_charges_outstanding_derived,
            totalPaidInAdvance: schedule.total_paid_in_advance_derived,
            totalPaidLate: schedule.total_paid_late_derived,
            completed: schedule.completed_derived,
            obligationsMetOnDate: schedule.obligations_met_on_date
          }))
        };
      });
    } catch (error) {
      logger.error('Error getting group loan details', { error, groupId, loanId });
      throw error;
    }
  }
  
  /**
   * Get summary statistics for group loans
   * @param groupId Group ID
   * @returns Summary statistics for loans
   */
  async getGroupLoanSummary(groupId: string): Promise<any> {
    logger.info('Getting loan summary for group', { groupId });
    
    try {
      // Verify group exists
      const groupResult = await query(
        'SELECT * FROM client_group WHERE id = $1',
        [groupId]
      );
      
      if (groupResult.rowCount === 0) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      // Get summary statistics
      const summaryResult = await query(
        `SELECT 
          COUNT(*) as total_loans,
          COUNT(CASE WHEN loan_status = 'active' THEN 1 END) as active_loans,
          COUNT(CASE WHEN loan_status = 'closed' THEN 1 END) as closed_loans,
          SUM(principal_amount) as total_principal,
          SUM(principal_disbursed_derived) as total_disbursed,
          SUM(principal_outstanding_derived) as total_outstanding,
          SUM(principal_repaid_derived) as total_principal_repaid,
          SUM(interest_repaid_derived) as total_interest_repaid,
          COUNT(CASE WHEN loan_status = 'submitted_and_pending_approval' THEN 1 END) as pending_loans,
          COUNT(CASE WHEN loan_status = 'approved' THEN 1 END) as approved_loans
        FROM loan
        WHERE group_id = $1`,
        [groupId]
      );
      
      // Get recent loans
      const recentLoansResult = await query(
        `SELECT 
          l.id, l.account_no, l.loan_status, l.principal_amount, 
          l.submitted_on_date, l.disbursed_on_date, lp.name as product_name
        FROM loan l
        JOIN loan_product lp ON l.product_id = lp.id
        WHERE l.group_id = $1
        ORDER BY 
          CASE 
            WHEN l.submitted_on_date IS NOT NULL THEN l.submitted_on_date
            ELSE l.created_date
          END DESC
        LIMIT 5`,
        [groupId]
      );
      
      // Map the data
      const summary = summaryResult.rows[0];
      
      return {
        statistics: {
          totalLoans: parseInt(summary.total_loans || '0'),
          activeLoans: parseInt(summary.active_loans || '0'),
          closedLoans: parseInt(summary.closed_loans || '0'),
          pendingLoans: parseInt(summary.pending_loans || '0'),
          approvedLoans: parseInt(summary.approved_loans || '0'),
          totalPrincipal: parseFloat(summary.total_principal || '0'),
          totalDisbursed: parseFloat(summary.total_disbursed || '0'),
          totalOutstanding: parseFloat(summary.total_outstanding || '0'),
          totalPrincipalRepaid: parseFloat(summary.total_principal_repaid || '0'),
          totalInterestRepaid: parseFloat(summary.total_interest_repaid || '0')
        },
        recentLoans: recentLoansResult.rows.map(loan => ({
          id: loan.id,
          accountNo: loan.account_no,
          status: loan.loan_status,
          principal: loan.principal_amount,
          productName: loan.product_name,
          submittedDate: loan.submitted_on_date,
          disbursedDate: loan.disbursed_on_date
        }))
      };
    } catch (error) {
      logger.error('Error getting group loan summary', { error, groupId });
      throw error;
    }
  }
}

// Export a singleton instance
export const groupLoanService = new GroupLoanService();