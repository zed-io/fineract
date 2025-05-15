import { Money } from '../models/money';
import { LoanSchedulePeriod, LoanSchedule } from '../models/loan';
import { 
  LoanCharge, 
  LoanChargeCalculationType, 
  LoanChargeTimeType 
} from '../models/loanAdvanced';
import { db } from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Service for handling loan charges
 * Manages adding, calculating, and processing various types of loan charges
 */
export class LoanChargeService {
  
  /**
   * Add a charge to a loan
   * 
   * @param loanId The loan ID
   * @param chargeData The charge data
   * @param userId The user ID adding the charge
   * @returns The created charge ID
   */
  async addCharge(
    loanId: string,
    chargeData: Partial<LoanCharge>,
    userId: string
  ): Promise<string> {
    logger.info('Adding charge to loan', { 
      loanId, 
      chargeData, 
      userId 
    });
    
    return db.transaction(async (client) => {
      try {
        // Get loan details to verify eligibility for charge
        const loanResult = await client.query(
          'SELECT loan_status, currency_code, principal_amount, principal_outstanding_derived FROM loan WHERE id = $1',
          [loanId]
        );
        
        if (loanResult.rowCount === 0) {
          throw new Error('Loan not found');
        }
        
        const loan = loanResult.rows[0];
        
        // Validate loan status for charge addition
        if (!['submitted_and_pending_approval', 'approved', 'active'].includes(loan.loan_status)) {
          throw new Error(`Cannot add charge to loan with status ${loan.loan_status}`);
        }
        
        // Validate charge currency matches loan currency
        if (chargeData.currencyCode && chargeData.currencyCode !== loan.currency_code) {
          throw new Error('Charge currency must match loan currency');
        }
        
        // Get charge definition if chargeId provided
        let chargeDefinition: any = {};
        
        if (chargeData.chargeId) {
          const chargeDefResult = await client.query(
            'SELECT name, currency_code, charge_calculation_enum, charge_time_enum, charge_payment_mode_enum, amount, is_penalty, is_active FROM m_charge WHERE id = $1',
            [chargeData.chargeId]
          );
          
          if (chargeDefResult.rowCount === 0) {
            throw new Error('Charge definition not found');
          }
          
          chargeDefinition = chargeDefResult.rows[0];
        }
        
        // Calculate charge amount based on calculation type
        const calculationType = chargeData.chargeCalculationType || 
                               this.mapChargeCalculationEnum(chargeDefinition.charge_calculation_enum);
        
        const loanPrincipal = loan.principal_amount;
        const outstandingPrincipal = loan.principal_outstanding_derived;
        
        let chargeAmount = chargeData.amount || chargeDefinition.amount || 0;
        let amountPercentageAppliedTo = 0;
        
        if (calculationType !== LoanChargeCalculationType.FLAT) {
          const percentage = chargeData.percentage || 0;
          amountPercentageAppliedTo = this.getAmountPercentageAppliedTo(
            calculationType,
            loanPrincipal,
            outstandingPrincipal
          );
          
          chargeAmount = (percentage / 100) * amountPercentageAppliedTo;
        }
        
        // Round to 2 decimal places
        chargeAmount = Math.round(chargeAmount * 100) / 100;
        
        // Insert the loan charge
        const insertResult = await client.query(
          `INSERT INTO m_loan_charge (
            loan_id, charge_id, name, amount, currency_code, charge_time_enum, 
            charge_calculation_enum, due_date, is_penalty, is_paid, is_waived, 
            is_active, created_by, created_date, amount_percentage_applied_to,
            amount_outstanding
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15)
          RETURNING id`,
          [
            loanId,
            chargeData.chargeId || null,
            chargeData.name || chargeDefinition.name,
            chargeAmount,
            chargeData.currencyCode || loan.currency_code,
            this.mapChargeTimeTypeToEnum(chargeData.chargeTimeType || LoanChargeTimeType.SPECIFIED_DUE_DATE),
            this.mapChargeCalculationTypeToEnum(calculationType),
            chargeData.dueDate || null,
            chargeData.isPenalty || false,
            false, // is_paid
            false, // is_waived
            true,  // is_active
            userId,
            amountPercentageAppliedTo,
            chargeAmount // amount_outstanding initially equals full amount
          ]
        );
        
        const chargeId = insertResult.rows[0].id;
        
        // Update loan balances for immediate charges
        if (chargeData.chargeTimeType === LoanChargeTimeType.DISBURSEMENT && 
           (loan.loan_status === 'active')) {
          await this.applyCharge(client, loanId, chargeId, userId);
        }
        
        return chargeId;
      } catch (error) {
        logger.error('Error adding charge to loan', { loanId, error });
        throw new Error(`Failed to add charge: ${error.message}`);
      }
    });
  }
  
  /**
   * Apply a charge to a loan
   * This actually updates loan balances and creates a transaction record
   * 
   * @param client Database client
   * @param loanId The loan ID
   * @param chargeId The charge ID to apply
   * @param userId The user ID applying the charge
   * @returns True if successful
   */
  async applyCharge(
    client: any,
    loanId: string,
    chargeId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get charge details
      const chargeResult = await client.query(
        `SELECT id, amount, is_penalty, is_paid, is_waived, amount_outstanding, charge_time_enum
         FROM m_loan_charge WHERE id = $1 AND loan_id = $2 AND is_active = true`,
        [chargeId, loanId]
      );
      
      if (chargeResult.rowCount === 0) {
        throw new Error('Charge not found or not active');
      }
      
      const charge = chargeResult.rows[0];
      
      // Skip if already paid or waived
      if (charge.is_paid || charge.is_waived) {
        return false;
      }
      
      // Get loan details
      const loanResult = await client.query(
        `SELECT id, loan_status, currency_code, fee_charges_outstanding_derived, 
         penalty_charges_outstanding_derived
         FROM loan WHERE id = $1`,
        [loanId]
      );
      
      if (loanResult.rowCount === 0) {
        throw new Error('Loan not found');
      }
      
      const loan = loanResult.rows[0];
      
      // Validate loan status
      if (loan.loan_status !== 'active') {
        throw new Error(`Cannot apply charge to loan with status ${loan.loan_status}`);
      }
      
      // Create transaction for the charge
      const transactionType = charge.is_penalty ? 'PENALTY_CHARGE' : 'FEE_CHARGE';
      const currentDate = new Date().toISOString().split('T')[0];
      
      const transactionResult = await client.query(
        `INSERT INTO m_loan_transaction (
          loan_id, transaction_type_enum, transaction_date, amount, 
          fee_charges_portion, penalty_charges_portion, submitted_on_date, 
          created_by, created_date, is_reversed, outstanding_loan_balance_derived
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
        RETURNING id`,
        [
          loanId,
          transactionType === 'PENALTY_CHARGE' ? 7 : 6, // Enum values
          currentDate,
          charge.amount_outstanding,
          transactionType === 'FEE_CHARGE' ? charge.amount_outstanding : 0,
          transactionType === 'PENALTY_CHARGE' ? charge.amount_outstanding : 0,
          currentDate,
          userId,
          false, // is_reversed
          0 // will be updated later
        ]
      );
      
      const transactionId = transactionResult.rows[0].id;
      
      // Link charge to transaction
      await client.query(
        `INSERT INTO m_loan_charge_payment (
          loan_charge_id, loan_transaction_id, amount
        ) VALUES ($1, $2, $3)`,
        [chargeId, transactionId, charge.amount_outstanding]
      );
      
      // Update loan balances
      const feeChargesOutstanding = transactionType === 'FEE_CHARGE' 
        ? loan.fee_charges_outstanding_derived + charge.amount_outstanding
        : loan.fee_charges_outstanding_derived;
        
      const penaltyChargesOutstanding = transactionType === 'PENALTY_CHARGE'
        ? loan.penalty_charges_outstanding_derived + charge.amount_outstanding
        : loan.penalty_charges_outstanding_derived;
      
      await client.query(
        `UPDATE loan SET
          fee_charges_outstanding_derived = $1,
          penalty_charges_outstanding_derived = $2,
          total_outstanding_derived = principal_outstanding_derived + interest_outstanding_derived + $1 + $2
         WHERE id = $3`,
        [feeChargesOutstanding, penaltyChargesOutstanding, loanId]
      );
      
      // Mark charge as applied in relevant ways based on type
      if (charge.charge_time_enum === this.mapChargeTimeTypeToEnum(LoanChargeTimeType.DISBURSEMENT)) {
        // For disbursement charges, mark as paid
        await client.query(
          `UPDATE m_loan_charge SET
            is_paid = true,
            amount_paid = amount,
            amount_outstanding = 0
           WHERE id = $1`,
          [chargeId]
        );
      } else {
        // For other charges, keep as outstanding
        await client.query(
          `UPDATE m_loan_charge SET
            amount_outstanding = amount
           WHERE id = $1`,
          [chargeId]
        );
      }
      
      return true;
    } catch (error) {
      logger.error('Error applying charge', { loanId, chargeId, error });
      throw new Error(`Failed to apply charge: ${error.message}`);
    }
  }
  
  /**
   * Waive a loan charge
   * 
   * @param loanId The loan ID
   * @param chargeId The charge ID to waive
   * @param userId The user ID waiving the charge
   * @returns True if successful
   */
  async waiveCharge(
    loanId: string,
    chargeId: string,
    userId: string
  ): Promise<boolean> {
    logger.info('Waiving loan charge', { 
      loanId, 
      chargeId, 
      userId 
    });
    
    return db.transaction(async (client) => {
      try {
        // Get charge details
        const chargeResult = await client.query(
          `SELECT id, amount, is_penalty, is_paid, is_waived, amount_outstanding
           FROM m_loan_charge WHERE id = $1 AND loan_id = $2 AND is_active = true`,
          [chargeId, loanId]
        );
        
        if (chargeResult.rowCount === 0) {
          throw new Error('Charge not found or not active');
        }
        
        const charge = chargeResult.rows[0];
        
        // Skip if already paid or waived
        if (charge.is_paid || charge.is_waived) {
          return false;
        }
        
        // Get loan details
        const loanResult = await client.query(
          `SELECT id, loan_status, currency_code, fee_charges_outstanding_derived, 
           penalty_charges_outstanding_derived
           FROM loan WHERE id = $1`,
          [loanId]
        );
        
        if (loanResult.rowCount === 0) {
          throw new Error('Loan not found');
        }
        
        const loan = loanResult.rows[0];
        
        // Validate loan status
        if (loan.loan_status !== 'active') {
          throw new Error(`Cannot waive charge for loan with status ${loan.loan_status}`);
        }
        
        // Create waive transaction
        const transactionType = charge.is_penalty ? 'WAIVE_CHARGES' : 'WAIVE_CHARGES';
        const currentDate = new Date().toISOString().split('T')[0];
        
        const transactionResult = await client.query(
          `INSERT INTO m_loan_transaction (
            loan_id, transaction_type_enum, transaction_date, amount, 
            fee_charges_portion, penalty_charges_portion, submitted_on_date, 
            created_by, created_date, is_reversed, outstanding_loan_balance_derived
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
          RETURNING id`,
          [
            loanId,
            3, // WAIVE_CHARGES enum value
            currentDate,
            charge.amount_outstanding,
            charge.is_penalty ? 0 : charge.amount_outstanding,
            charge.is_penalty ? charge.amount_outstanding : 0,
            currentDate,
            userId,
            false, // is_reversed
            0 // will be updated later
          ]
        );
        
        const transactionId = transactionResult.rows[0].id;
        
        // Link charge to waive transaction
        await client.query(
          `INSERT INTO m_loan_charge_payment (
            loan_charge_id, loan_transaction_id, amount
          ) VALUES ($1, $2, $3)`,
          [chargeId, transactionId, charge.amount_outstanding]
        );
        
        // Update loan balances
        const feeChargesOutstanding = charge.is_penalty 
          ? loan.fee_charges_outstanding_derived
          : loan.fee_charges_outstanding_derived - charge.amount_outstanding;
          
        const penaltyChargesOutstanding = charge.is_penalty
          ? loan.penalty_charges_outstanding_derived - charge.amount_outstanding
          : loan.penalty_charges_outstanding_derived;
        
        await client.query(
          `UPDATE loan SET
            fee_charges_outstanding_derived = $1,
            penalty_charges_outstanding_derived = $2,
            total_outstanding_derived = principal_outstanding_derived + interest_outstanding_derived + $1 + $2
           WHERE id = $3`,
          [feeChargesOutstanding, penaltyChargesOutstanding, loanId]
        );
        
        // Mark charge as waived
        await client.query(
          `UPDATE m_loan_charge SET
            is_waived = true,
            amount_waived = amount_outstanding,
            amount_outstanding = 0
           WHERE id = $1`,
          [chargeId]
        );
        
        return true;
      } catch (error) {
        logger.error('Error waiving charge', { loanId, chargeId, error });
        throw new Error(`Failed to waive charge: ${error.message}`);
      }
    });
  }
  
  /**
   * Calculate charge amount based on loan data
   * 
   * @param charge The loan charge
   * @param loanPrincipal The loan principal amount
   * @param loanInterest The loan interest amount
   * @param outstandingPrincipal The outstanding principal amount
   * @returns The calculated charge amount
   */
  calculateChargeAmount(
    charge: LoanCharge,
    loanPrincipal: number,
    loanInterest: number,
    outstandingPrincipal: number
  ): number {
    try {
      if (charge.chargeCalculationType === LoanChargeCalculationType.FLAT) {
        return charge.amount;
      }
      
      const percentage = charge.percentage || 0;
      
      if (percentage <= 0) {
        return 0;
      }
      
      let baseAmount = 0;
      
      switch (charge.chargeCalculationType) {
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT:
          baseAmount = loanPrincipal;
          break;
        
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT_AND_INTEREST:
          baseAmount = loanPrincipal + loanInterest;
          break;
        
        case LoanChargeCalculationType.PERCENT_OF_INTEREST:
          baseAmount = loanInterest;
          break;
        
        case LoanChargeCalculationType.PERCENT_OF_DISBURSEMENT_AMOUNT:
          baseAmount = loanPrincipal;
          break;
        
        case LoanChargeCalculationType.PERCENT_OF_TOTAL_OUTSTANDING:
          baseAmount = outstandingPrincipal;
          break;
      }
      
      // Calculate charge amount
      const calculatedAmount = (percentage / 100) * baseAmount;
      
      // Round to 2 decimal places
      return Math.round(calculatedAmount * 100) / 100;
    } catch (error) {
      logger.error('Error calculating charge amount', { charge, error });
      throw new Error(`Failed to calculate charge amount: ${error.message}`);
    }
  }
  
  /**
   * Apply charges to a loan schedule
   * Distributes charges across schedule periods based on charge type
   * 
   * @param loanId The loan ID
   * @param schedule The loan schedule to apply charges to
   * @param charges Array of charges to apply
   * @returns The updated schedule with charges applied
   */
  applyChargesToSchedule(
    loanId: string,
    schedule: LoanSchedule,
    charges: LoanCharge[]
  ): LoanSchedule {
    logger.info('Applying charges to schedule', { 
      loanId, 
      chargeCount: charges.length 
    });
    
    try {
      // Create a new schedule to modify
      const newSchedule: LoanSchedule = JSON.parse(JSON.stringify(schedule));
      
      // Process each charge
      for (const charge of charges) {
        // Skip inactive, paid, or waived charges
        if (charge.isWaived || charge.isPaid || charge.isActive === false) {
          continue;
        }
        
        // Apply the charge based on its time type
        switch (charge.chargeTimeType) {
          case LoanChargeTimeType.DISBURSEMENT:
            this.applyDisbursementCharge(newSchedule, charge);
            break;
            
          case LoanChargeTimeType.SPECIFIED_DUE_DATE:
            this.applySpecifiedDueDateCharge(newSchedule, charge);
            break;
            
          case LoanChargeTimeType.INSTALLMENT_FEE:
            this.applyInstallmentFeeCharge(newSchedule, charge);
            break;
            
          case LoanChargeTimeType.OVERDUE_INSTALLMENT:
            this.applyOverdueInstallmentCharge(newSchedule, charge);
            break;
            
          case LoanChargeTimeType.OVERDUE_MATURITY:
            this.applyOverdueMaturityCharge(newSchedule, charge);
            break;
        }
      }
      
      // Recalculate schedule totals
      this.recalculateScheduleTotals(newSchedule);
      
      return newSchedule;
    } catch (error) {
      logger.error('Error applying charges to schedule', { loanId, error });
      throw new Error(`Failed to apply charges to schedule: ${error.message}`);
    }
  }
  
  /**
   * Apply disbursement charge to schedule
   * 
   * @param schedule The loan schedule
   * @param charge The disbursement charge
   */
  private applyDisbursementCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    // Disbursement charges are applied to the first period (index 0)
    const disbursementPeriod = schedule.periods[0];
    
    if (disbursementPeriod && disbursementPeriod.periodType === 'disbursement') {
      const amountToApply = charge.amountOutstanding || charge.amount;
      
      if (charge.isPenalty) {
        disbursementPeriod.penaltyChargesDue += amountToApply;
        disbursementPeriod.penaltyChargesOutstanding += amountToApply;
      } else {
        disbursementPeriod.feeChargesDue += amountToApply;
        disbursementPeriod.feeChargesOutstanding += amountToApply;
      }
      
      // Update period totals
      disbursementPeriod.totalOriginalDueForPeriod += amountToApply;
      disbursementPeriod.totalDueForPeriod += amountToApply;
      disbursementPeriod.totalOutstandingForPeriod += amountToApply;
    }
  }
  
  /**
   * Apply specified due date charge to schedule
   * 
   * @param schedule The loan schedule
   * @param charge The specified due date charge
   */
  private applySpecifiedDueDateCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    if (!charge.dueDate) {
      return;
    }
    
    const dueDate = new Date(charge.dueDate);
    const amountToApply = charge.amountOutstanding || charge.amount;
    
    // Find the period that contains the due date
    let targetPeriod: LoanSchedulePeriod | null = null;
    
    for (let i = 1; i < schedule.periods.length; i++) {
      const period = schedule.periods[i];
      
      if (period.periodType !== 'repayment') {
        continue;
      }
      
      const periodDueDate = new Date(period.dueDate);
      
      if (dueDate <= periodDueDate) {
        targetPeriod = period;
        break;
      }
    }
    
    // If no matching period found, apply to last period
    if (!targetPeriod && schedule.periods.length > 1) {
      targetPeriod = schedule.periods[schedule.periods.length - 1];
    }
    
    // Apply the charge
    if (targetPeriod) {
      if (charge.isPenalty) {
        targetPeriod.penaltyChargesDue += amountToApply;
        targetPeriod.penaltyChargesOutstanding += amountToApply;
      } else {
        targetPeriod.feeChargesDue += amountToApply;
        targetPeriod.feeChargesOutstanding += amountToApply;
      }
      
      // Update period totals
      targetPeriod.totalOriginalDueForPeriod += amountToApply;
      targetPeriod.totalDueForPeriod += amountToApply;
      targetPeriod.totalOutstandingForPeriod += amountToApply;
    }
  }
  
  /**
   * Apply installment fee charge to schedule
   * Distributes the charge evenly across all repayment periods
   * 
   * @param schedule The loan schedule
   * @param charge The installment fee charge
   */
  private applyInstallmentFeeCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    // Count repayment periods
    const repaymentPeriods = schedule.periods.filter(p => p.periodType === 'repayment');
    
    if (repaymentPeriods.length === 0) {
      return;
    }
    
    // Calculate amount per installment
    const totalAmount = charge.amountOutstanding || charge.amount;
    let amountPerInstallment = totalAmount / repaymentPeriods.length;
    amountPerInstallment = Math.round(amountPerInstallment * 100) / 100; // Round to 2 decimal places
    
    // Handle rounding issues by adjusting last installment
    let remainingAmount = totalAmount;
    
    // Apply to each repayment period
    for (let i = 0; i < schedule.periods.length; i++) {
      const period = schedule.periods[i];
      
      if (period.periodType !== 'repayment') {
        continue;
      }
      
      // For last period, use remaining amount to handle rounding
      let amountToApply = 0;
      
      if (i === schedule.periods.length - 1 || period.periodNumber === repaymentPeriods.length) {
        amountToApply = remainingAmount;
      } else {
        amountToApply = amountPerInstallment;
        remainingAmount -= amountToApply;
      }
      
      // Apply charge
      if (charge.isPenalty) {
        period.penaltyChargesDue += amountToApply;
        period.penaltyChargesOutstanding += amountToApply;
      } else {
        period.feeChargesDue += amountToApply;
        period.feeChargesOutstanding += amountToApply;
      }
      
      // Update period totals
      period.totalOriginalDueForPeriod += amountToApply;
      period.totalDueForPeriod += amountToApply;
      period.totalOutstandingForPeriod += amountToApply;
    }
  }
  
  /**
   * Apply overdue installment charge to schedule
   * For simulation purposes as overdue charges would typically be applied dynamically
   * 
   * @param schedule The loan schedule
   * @param charge The overdue installment charge
   */
  private applyOverdueInstallmentCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    // For simulation only - assume all periods are on time
    // In a real implementation, this would check for actual overdue installments
    // and apply the charge accordingly
  }
  
  /**
   * Apply overdue maturity charge to schedule
   * For simulation purposes as overdue maturity charges would be applied at maturity
   * 
   * @param schedule The loan schedule
   * @param charge The overdue maturity charge
   */
  private applyOverdueMaturityCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    // For simulation only - apply to last period
    if (schedule.periods.length > 1) {
      const lastPeriod = schedule.periods[schedule.periods.length - 1];
      
      if (lastPeriod.periodType === 'repayment') {
        const amountToApply = charge.amountOutstanding || charge.amount;
        
        if (charge.isPenalty) {
          lastPeriod.penaltyChargesDue += amountToApply;
          lastPeriod.penaltyChargesOutstanding += amountToApply;
        } else {
          lastPeriod.feeChargesDue += amountToApply;
          lastPeriod.feeChargesOutstanding += amountToApply;
        }
        
        // Update period totals
        lastPeriod.totalOriginalDueForPeriod += amountToApply;
        lastPeriod.totalDueForPeriod += amountToApply;
        lastPeriod.totalOutstandingForPeriod += amountToApply;
      }
    }
  }
  
  /**
   * Recalculate schedule totals after applying charges
   * 
   * @param schedule The loan schedule to recalculate
   */
  private recalculateScheduleTotals(schedule: LoanSchedule): void {
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalFeeCharges = 0;
    let totalPenaltyCharges = 0;
    
    for (const period of schedule.periods) {
      if (period.periodType === 'repayment' || period.periodType === 'disbursement') {
        totalPrincipal += period.principalOriginalDue;
        totalInterest += period.interestOriginalDue;
        totalFeeCharges += period.feeChargesDue;
        totalPenaltyCharges += period.penaltyChargesDue;
      }
    }
    
    schedule.totalPrincipal = totalPrincipal;
    schedule.totalInterest = totalInterest;
    schedule.totalFeeCharges = totalFeeCharges;
    schedule.totalPenaltyCharges = totalPenaltyCharges;
    schedule.totalRepaymentExpected = totalPrincipal + totalInterest + totalFeeCharges + totalPenaltyCharges;
    schedule.totalOutstanding = schedule.totalRepaymentExpected;
  }
  
  /**
   * Map charge calculation type to database enum
   * 
   * @param calculationType The charge calculation type
   * @returns The corresponding database enum value
   */
  private mapChargeCalculationTypeToEnum(calculationType: LoanChargeCalculationType): number {
    switch (calculationType) {
      case LoanChargeCalculationType.FLAT:
        return 1;
      case LoanChargeCalculationType.PERCENT_OF_AMOUNT:
        return 2;
      case LoanChargeCalculationType.PERCENT_OF_AMOUNT_AND_INTEREST:
        return 3;
      case LoanChargeCalculationType.PERCENT_OF_INTEREST:
        return 4;
      case LoanChargeCalculationType.PERCENT_OF_DISBURSEMENT_AMOUNT:
        return 5;
      case LoanChargeCalculationType.PERCENT_OF_TOTAL_OUTSTANDING:
        return 6;
      default:
        return 1;
    }
  }
  
  /**
   * Map database enum to charge calculation type
   * 
   * @param enumValue The database enum value
   * @returns The corresponding charge calculation type
   */
  private mapChargeCalculationEnum(enumValue: number): LoanChargeCalculationType {
    switch (enumValue) {
      case 1:
        return LoanChargeCalculationType.FLAT;
      case 2:
        return LoanChargeCalculationType.PERCENT_OF_AMOUNT;
      case 3:
        return LoanChargeCalculationType.PERCENT_OF_AMOUNT_AND_INTEREST;
      case 4:
        return LoanChargeCalculationType.PERCENT_OF_INTEREST;
      case 5:
        return LoanChargeCalculationType.PERCENT_OF_DISBURSEMENT_AMOUNT;
      case 6:
        return LoanChargeCalculationType.PERCENT_OF_TOTAL_OUTSTANDING;
      default:
        return LoanChargeCalculationType.FLAT;
    }
  }
  
  /**
   * Map charge time type to database enum
   * 
   * @param timeType The charge time type
   * @returns The corresponding database enum value
   */
  private mapChargeTimeTypeToEnum(timeType: LoanChargeTimeType): number {
    switch (timeType) {
      case LoanChargeTimeType.DISBURSEMENT:
        return 1;
      case LoanChargeTimeType.SPECIFIED_DUE_DATE:
        return 2;
      case LoanChargeTimeType.INSTALLMENT_FEE:
        return 3;
      case LoanChargeTimeType.OVERDUE_INSTALLMENT:
        return 4;
      case LoanChargeTimeType.OVERDUE_MATURITY:
        return 5;
      case LoanChargeTimeType.OVERDUE_ON_LOAN_MATURITY:
        return 6;
      case LoanChargeTimeType.TRANCHE_DISBURSEMENT:
        return 7;
      default:
        return 2;
    }
  }
  
  /**
   * Map database enum to charge time type
   * 
   * @param enumValue The database enum value
   * @returns The corresponding charge time type
   */
  private mapChargeTimeEnum(enumValue: number): LoanChargeTimeType {
    switch (enumValue) {
      case 1:
        return LoanChargeTimeType.DISBURSEMENT;
      case 2:
        return LoanChargeTimeType.SPECIFIED_DUE_DATE;
      case 3:
        return LoanChargeTimeType.INSTALLMENT_FEE;
      case 4:
        return LoanChargeTimeType.OVERDUE_INSTALLMENT;
      case 5:
        return LoanChargeTimeType.OVERDUE_MATURITY;
      case 6:
        return LoanChargeTimeType.OVERDUE_ON_LOAN_MATURITY;
      case 7:
        return LoanChargeTimeType.TRANCHE_DISBURSEMENT;
      default:
        return LoanChargeTimeType.SPECIFIED_DUE_DATE;
    }
  }
  
  /**
   * Get the amount to which a percentage should be applied based on calculation type
   * 
   * @param calculationType The charge calculation type
   * @param loanPrincipal The loan principal amount
   * @param outstandingPrincipal The outstanding principal amount
   * @returns The amount to which the percentage should be applied
   */
  private getAmountPercentageAppliedTo(
    calculationType: LoanChargeCalculationType,
    loanPrincipal: number,
    outstandingPrincipal: number
  ): number {
    switch (calculationType) {
      case LoanChargeCalculationType.PERCENT_OF_AMOUNT:
      case LoanChargeCalculationType.PERCENT_OF_DISBURSEMENT_AMOUNT:
        return loanPrincipal;
      case LoanChargeCalculationType.PERCENT_OF_TOTAL_OUTSTANDING:
        return outstandingPrincipal;
      default:
        return loanPrincipal;
    }
  }
}