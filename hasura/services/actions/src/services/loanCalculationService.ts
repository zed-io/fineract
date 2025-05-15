import { Money } from '../models/money';
import { 
  LoanSchedule, 
  LoanSchedulePeriod, 
  RepaymentPeriod, 
  LoanApplicationTerms, 
  PrepaymentAmount,
  DownPaymentType,
  DownPaymentDetails
} from '../models/loan';
import { LoanCharge, LoanChargeTimeType, LoanChargeCalculationType } from '../models/loanAdvanced';
import { LoanChargeService } from './loanChargeService';
import { logger } from '../utils/logger';

/**
 * LoanCalculationService handles complex loan calculations including:
 * - Repayment schedule generation
 * - EMI calculations
 * - Interest calculations based on different methods
 * - Early repayment/prepayment calculations
 * - Handling various loan types and scenarios
 * - Fee calculations and allocation to schedule periods
 */
export class LoanCalculationService {
  private loanChargeService: LoanChargeService;
  
  constructor() {
    this.loanChargeService = new LoanChargeService();
  }
  
  /**
   * Calculates down payment details based on loan application terms
   * @param loanApplicationTerms The loan application terms containing down payment configuration
   * @returns DownPaymentDetails object with calculated values
   */
  calculateDownPayment(loanApplicationTerms: LoanApplicationTerms): DownPaymentDetails | null {
    if (!loanApplicationTerms.enableDownPayment) {
      return null;
    }

    const { principalAmount, currency, downPaymentType, downPaymentAmount, downPaymentPercentage, expectedDisbursementDate } = loanApplicationTerms;
    let calculatedDownPaymentAmount = 0;
    
    if (downPaymentType === DownPaymentType.FIXED_AMOUNT && downPaymentAmount) {
      calculatedDownPaymentAmount = downPaymentAmount;
    } else if (downPaymentType === DownPaymentType.PERCENTAGE && downPaymentPercentage) {
      calculatedDownPaymentAmount = (downPaymentPercentage / 100) * principalAmount;
      // Round to 2 decimal places
      calculatedDownPaymentAmount = Math.round(calculatedDownPaymentAmount * 100) / 100;
    }
    
    if (calculatedDownPaymentAmount <= 0) {
      return null;
    }
    
    // Calculate effective principal amount after down payment
    const effectivePrincipalAmount = principalAmount - calculatedDownPaymentAmount;
    
    return {
      downPaymentAmount: calculatedDownPaymentAmount,
      downPaymentType: downPaymentType!,
      effectivePrincipalAmount,
      downPaymentPercentage: downPaymentType === DownPaymentType.PERCENTAGE ? downPaymentPercentage : 
        Math.round((calculatedDownPaymentAmount / principalAmount) * 10000) / 100, // Convert to percentage with 2 decimal places
      totalLoanAmount: principalAmount,
      transactionDate: expectedDisbursementDate
    };
  }

  /**
   * Adds a down payment period to the loan schedule
   * @param schedule The loan schedule to add the down payment period to
   * @param loanApplicationTerms The loan application terms
   * @param downPaymentDetails The down payment details
   */
  private addDownPaymentPeriod(schedule: LoanSchedule, loanApplicationTerms: LoanApplicationTerms, downPaymentDetails: DownPaymentDetails): void {
    if (!downPaymentDetails || downPaymentDetails.downPaymentAmount <= 0) {
      return;
    }
    
    const downPaymentPeriod: LoanSchedulePeriod = {
      periodNumber: 1, // Down payment is always the first repayment period
      periodType: 'downpayment',
      fromDate: loanApplicationTerms.expectedDisbursementDate,
      dueDate: loanApplicationTerms.expectedDisbursementDate, // Due on same day as disbursement
      principalDisbursed: 0,
      principalLoanBalanceOutstanding: downPaymentDetails.effectivePrincipalAmount, // Principal after down payment
      principalOriginalDue: downPaymentDetails.downPaymentAmount,
      principalDue: downPaymentDetails.downPaymentAmount,
      principalPaid: 0,
      principalWrittenOff: 0,
      principalOutstanding: downPaymentDetails.downPaymentAmount,
      interestOriginalDue: 0, // No interest on down payment
      interestDue: 0,
      interestPaid: 0,
      interestWaived: 0,
      interestWrittenOff: 0,
      interestOutstanding: 0,
      feeChargesDue: 0,
      feeChargesPaid: 0,
      feeChargesWaived: 0,
      feeChargesWrittenOff: 0,
      feeChargesOutstanding: 0,
      penaltyChargesDue: 0,
      penaltyChargesPaid: 0,
      penaltyChargesWaived: 0,
      penaltyChargesWrittenOff: 0,
      penaltyChargesOutstanding: 0,
      totalOriginalDueForPeriod: downPaymentDetails.downPaymentAmount,
      totalDueForPeriod: downPaymentDetails.downPaymentAmount,
      totalPaidForPeriod: 0,
      totalWaivedForPeriod: 0,
      totalWrittenOffForPeriod: 0,
      totalOutstandingForPeriod: downPaymentDetails.downPaymentAmount,
      totalActualCostOfLoanForPeriod: 0,
      totalInstallmentAmountForPeriod: downPaymentDetails.downPaymentAmount,
      daysInPeriod: 0 // Same day as disbursement
    };
    
    // Add down payment period to schedule
    schedule.periods.push(downPaymentPeriod);
    
    // Update schedule with down payment amount
    schedule.downPaymentAmount = downPaymentDetails.downPaymentAmount;
  }

  /**
   * Generates a loan repayment schedule based on the provided terms
   * @param loanApplicationTerms The loan application terms
   * @param charges Optional array of loan charges to apply to the schedule
   * @returns The generated loan schedule with all periods and charges
   */
  async generateRepaymentSchedule(
    loanApplicationTerms: LoanApplicationTerms,
    charges: LoanCharge[] = []
  ): Promise<LoanSchedule> {
    logger.info('Generating repayment schedule', {
      principalAmount: loanApplicationTerms.principalAmount,
      loanTermFrequency: loanApplicationTerms.loanTermFrequency,
      loanTermFrequencyType: loanApplicationTerms.loanTermFrequencyType,
      amortizationMethod: loanApplicationTerms.amortizationMethod,
      variableInstallments: loanApplicationTerms.allowVariableInstallments || false,
      enableDownPayment: loanApplicationTerms.enableDownPayment || false,
      chargesCount: charges.length
    });
    
    try {
      // Calculate down payment if enabled
      const downPaymentDetails = loanApplicationTerms.enableDownPayment ? 
        this.calculateDownPayment(loanApplicationTerms) : null;
      
      // Adjust principal amount if down payment is applied
      const effectivePrincipalAmount = downPaymentDetails ? 
        downPaymentDetails.effectivePrincipalAmount : loanApplicationTerms.principalAmount;
      
      // Create basic schedule structure
      const schedule: LoanSchedule = {
        periods: [],
        currency: loanApplicationTerms.currency,
        loanTermInDays: this.calculateLoanTermInDays(loanApplicationTerms),
        principalDisbursed: loanApplicationTerms.principalAmount, // Store original principal amount
        totalPrincipal: 0,
        totalInterest: 0,
        totalFeeCharges: 0,
        totalPenaltyCharges: 0,
        totalRepaymentExpected: 0,
        totalOutstanding: 0
      };
      
      // Add downPaymentAmount to schedule if available
      if (downPaymentDetails) {
        schedule.downPaymentAmount = downPaymentDetails.downPaymentAmount;
      }
      
      // Add disbursement period
      this.addDisbursementPeriod(schedule, loanApplicationTerms);
      
      // Add down payment period if enabled
      if (downPaymentDetails) {
        this.addDownPaymentPeriod(schedule, loanApplicationTerms, downPaymentDetails);
      }
      
      // Create adjusted loan terms if down payment is applied
      const adjustedTerms = downPaymentDetails ? 
        { ...loanApplicationTerms, principalAmount: effectivePrincipalAmount } : 
        loanApplicationTerms;
      
      // Check if using variable installments
      if (adjustedTerms.allowVariableInstallments && adjustedTerms.installments?.length) {
        // Validate variable installments configuration
        this.validateVariableInstallments(adjustedTerms);
        
        // Generate schedule with variable installments
        this.generateVariableInstallmentSchedule(schedule, adjustedTerms);
      } else {
        // Standard fixed schedule generation
        
        // Calculate repayment dates
        const repaymentDates = this.generateRepaymentDates(adjustedTerms);
        
        if (adjustedTerms.amortizationMethod === 'equal_principal') {
          // For equal principal, we don't need EMI calculation
          // Generate repayment periods with equal principal payments
          this.generateEqualPrincipalRepaymentPeriods(schedule, adjustedTerms, repaymentDates);
        } else {
          // For equal installment (standard EMI-based approach)
          // Calculate EMI based on loan terms
          const emi = this.calculateEMI(adjustedTerms);
          
          // Generate repayment periods with principal and interest breakdown
          this.generateRepaymentPeriods(schedule, adjustedTerms, repaymentDates, emi);
        }
      }
      
      // Calculate totals before applying charges
      this.calculateScheduleTotals(schedule);
      
      // Apply charges to the schedule if any
      if (charges.length > 0) {
        this.applyChargesToSchedule(schedule, charges, loanApplicationTerms);
        
        // Recalculate totals after applying charges
        this.calculateScheduleTotals(schedule);
      }
      
      return schedule;
    } catch (error) {
      logger.error('Error generating repayment schedule', error);
      throw new Error(`Failed to generate loan repayment schedule: ${error.message}`);
    }
  }
  
  /**
   * Calculates the total term of the loan in days
   */
  private calculateLoanTermInDays(loanApplicationTerms: LoanApplicationTerms): number {
    const { loanTermFrequency, loanTermFrequencyType, expectedDisbursementDate, repaymentFrequencyType, repaymentEvery } = loanApplicationTerms;
    let days = 0;
    
    switch (loanTermFrequencyType) {
      case 'days':
        days = loanTermFrequency;
        break;
      case 'weeks':
        days = loanTermFrequency * 7;
        break;
      case 'months':
        // Approximate month as 30 days for initial calculation
        days = loanTermFrequency * 30;
        break;
      case 'years':
        // Approximate year as 365 days for initial calculation
        days = loanTermFrequency * 365;
        break;
      default:
        throw new Error(`Unsupported loan term frequency type: ${loanTermFrequencyType}`);
    }
    
    return days;
  }
  
  /**
   * Adds the initial disbursement period to the schedule
   */
  private addDisbursementPeriod(schedule: LoanSchedule, loanApplicationTerms: LoanApplicationTerms): void {
    // Determine the actual disbursed amount (full principal)
    const principalDisbursed = loanApplicationTerms.principalAmount;
    
    // Determine the outstanding balance after disbursement
    // If down payment is enabled, it will be adjusted later when down payment period is added
    const principalOutstanding = principalDisbursed;
    
    const disbursementPeriod: LoanSchedulePeriod = {
      periodNumber: 0,
      periodType: 'disbursement',
      fromDate: loanApplicationTerms.expectedDisbursementDate,
      dueDate: loanApplicationTerms.expectedDisbursementDate,
      principalDisbursed: principalDisbursed,
      principalLoanBalanceOutstanding: principalOutstanding,
      principalOriginalDue: 0,
      principalDue: 0,
      principalPaid: 0,
      principalWrittenOff: 0,
      principalOutstanding: 0,
      interestOriginalDue: 0,
      interestDue: 0,
      interestPaid: 0,
      interestWaived: 0,
      interestWrittenOff: 0,
      interestOutstanding: 0,
      feeChargesDue: 0,
      feeChargesPaid: 0,
      feeChargesWaived: 0,
      feeChargesWrittenOff: 0,
      feeChargesOutstanding: 0,
      penaltyChargesDue: 0,
      penaltyChargesPaid: 0,
      penaltyChargesWaived: 0,
      penaltyChargesWrittenOff: 0,
      penaltyChargesOutstanding: 0,
      totalOriginalDueForPeriod: 0,
      totalDueForPeriod: 0,
      totalPaidForPeriod: 0,
      totalWaivedForPeriod: 0,
      totalWrittenOffForPeriod: 0,
      totalOutstandingForPeriod: 0,
      totalActualCostOfLoanForPeriod: 0,
      totalInstallmentAmountForPeriod: 0,
    };
    
    schedule.periods.push(disbursementPeriod);
  }
  
  /**
   * Generates all repayment dates based on loan terms
   */
  private generateRepaymentDates(loanApplicationTerms: LoanApplicationTerms): Date[] {
    const { expectedDisbursementDate, repaymentEvery, repaymentFrequencyType, numberOfRepayments } = loanApplicationTerms;
    const dates: Date[] = [];
    let currentDate = new Date(expectedDisbursementDate);
    
    // For the first period, add the specified grace period if any
    if (loanApplicationTerms.graceOnPrincipalPayment > 0) {
      // Add grace period to first payment date based on repayment frequency type
      this.addTimeToDate(currentDate, loanApplicationTerms.graceOnPrincipalPayment, repaymentFrequencyType);
    }
    
    for (let i = 0; i < numberOfRepayments; i++) {
      // Add repayment frequency to current date
      this.addTimeToDate(currentDate, repaymentEvery, repaymentFrequencyType);
      dates.push(new Date(currentDate));
    }
    
    return dates;
  }
  
  /**
   * Helper method to add time to a date based on frequency type
   */
  private addTimeToDate(date: Date, amount: number, frequencyType: string): void {
    switch (frequencyType) {
      case 'days':
        date.setDate(date.getDate() + amount);
        break;
      case 'weeks':
        date.setDate(date.getDate() + (amount * 7));
        break;
      case 'months':
        date.setMonth(date.getMonth() + amount);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() + amount);
        break;
      default:
        throw new Error(`Unsupported frequency type: ${frequencyType}`);
    }
  }
  
  /**
   * Calculates Equated Monthly Installment (EMI) amount
   */
  private calculateEMI(loanApplicationTerms: LoanApplicationTerms): number {
    const { principalAmount, numberOfRepayments, interestRatePerPeriod, interestMethod } = loanApplicationTerms;
    
    // Convert annual interest rate to period interest rate as a decimal
    const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
    
    if (interestMethod === 'flat') {
      // For flat interest rate, the calculation is simple
      const totalInterest = principalAmount * interestRatePerPeriodDecimal * numberOfRepayments;
      return (principalAmount + totalInterest) / numberOfRepayments;
    } else if (interestMethod === 'declining_balance') {
      // For declining balance method, use the standard EMI formula
      // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
      // where P is principal, r is rate per period, n is number of periods
      
      if (interestRatePerPeriodDecimal === 0) {
        // If interest rate is 0, just divide principal by number of repayments
        return principalAmount / numberOfRepayments;
      }
      
      const rateFactorPow = Math.pow(1 + interestRatePerPeriodDecimal, numberOfRepayments);
      const emi = principalAmount * interestRatePerPeriodDecimal * rateFactorPow / (rateFactorPow - 1);
      
      // Round to 2 decimal places
      return Math.round(emi * 100) / 100;
    } else if (interestMethod === 'compound') {
      // For compound interest method:
      // Future Value = P(1+r)^n
      // EMI = (Future Value) / n
      
      if (interestRatePerPeriodDecimal === 0) {
        // If interest rate is 0, just divide principal by number of repayments
        return principalAmount / numberOfRepayments;
      }
      
      // Calculate future value with compound interest
      const futureValue = principalAmount * Math.pow(1 + interestRatePerPeriodDecimal, numberOfRepayments);
      
      // Calculate total interest
      const totalInterest = futureValue - principalAmount;
      
      // Calculate EMI (principal + interest divided by number of repayments)
      const emi = (principalAmount + totalInterest) / numberOfRepayments;
      
      // Round to 2 decimal places
      return Math.round(emi * 100) / 100;
    } else {
      throw new Error(`Unsupported interest method: ${interestMethod}`);
    }
  }
  
  /**
   * Generates all repayment periods with principal and interest breakdowns
   */
  private generateRepaymentPeriods(schedule: LoanSchedule, loanApplicationTerms: LoanApplicationTerms, repaymentDates: Date[], emi: number): void {
    const { interestMethod, principalAmount, interestRatePerPeriod } = loanApplicationTerms;
    
    // Convert annual interest rate to period interest rate as a decimal
    const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
    
    let outstandingBalance = principalAmount;
    let periodFromDate = new Date(loanApplicationTerms.expectedDisbursementDate);
    
    // For compound interest, pre-calculate future value and total interest
    let compoundTotalInterest = 0;
    let compoundInterestPerPeriod = 0;
    
    if (interestMethod === 'compound') {
      const futureValue = principalAmount * Math.pow(1 + interestRatePerPeriodDecimal, loanApplicationTerms.numberOfRepayments);
      compoundTotalInterest = futureValue - principalAmount;
      compoundInterestPerPeriod = compoundTotalInterest / loanApplicationTerms.numberOfRepayments;
    }
    
    for (let i = 0; i < repaymentDates.length; i++) {
      const periodDueDate = repaymentDates[i];
      let principalForPeriod, interestForPeriod;
      
      if (interestMethod === 'flat') {
        // For flat interest, principal is equal in all periods
        principalForPeriod = principalAmount / loanApplicationTerms.numberOfRepayments;
        
        // Interest is also equal across all periods
        interestForPeriod = principalAmount * interestRatePerPeriodDecimal;
      } else if (interestMethod === 'declining_balance') {
        // For declining balance, calculate interest based on outstanding balance
        interestForPeriod = outstandingBalance * interestRatePerPeriodDecimal;
        
        // Principal for this period is EMI minus interest
        principalForPeriod = emi - interestForPeriod;
        
        // Ensure we don't overpay in the last period
        if (i === repaymentDates.length - 1 && principalForPeriod > outstandingBalance) {
          principalForPeriod = outstandingBalance;
          interestForPeriod = outstandingBalance * interestRatePerPeriodDecimal;
        }
        
        // Update outstanding balance for next period
        outstandingBalance -= principalForPeriod;
      } else if (interestMethod === 'compound') {
        // For compound interest, principal is equal in all periods
        principalForPeriod = principalAmount / loanApplicationTerms.numberOfRepayments;
        
        // Interest is equal too (total interest divided by number of periods)
        interestForPeriod = compoundInterestPerPeriod;
        
        // Update outstanding balance for tracking purposes
        outstandingBalance -= principalForPeriod;
      } else {
        throw new Error(`Unsupported interest method: ${interestMethod}`);
      }
      
      // Round to 2 decimal places
      principalForPeriod = Math.round(principalForPeriod * 100) / 100;
      interestForPeriod = Math.round(interestForPeriod * 100) / 100;
      
      // Calculate days in period
      const daysInPeriod = Math.round(
        (periodDueDate.getTime() - periodFromDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Create the repayment period
      const repaymentPeriod: LoanSchedulePeriod = {
        periodNumber: i + 1,
        periodType: 'repayment',
        fromDate: new Date(periodFromDate),
        dueDate: new Date(periodDueDate),
        principalDisbursed: 0,
        principalLoanBalanceOutstanding: outstandingBalance,
        principalOriginalDue: principalForPeriod,
        principalDue: principalForPeriod,
        principalPaid: 0,
        principalWrittenOff: 0,
        principalOutstanding: principalForPeriod,
        interestOriginalDue: interestForPeriod,
        interestDue: interestForPeriod,
        interestPaid: 0,
        interestWaived: 0,
        interestWrittenOff: 0,
        interestOutstanding: interestForPeriod,
        feeChargesDue: 0,
        feeChargesPaid: 0,
        feeChargesWaived: 0,
        feeChargesWrittenOff: 0,
        feeChargesOutstanding: 0,
        penaltyChargesDue: 0,
        penaltyChargesPaid: 0,
        penaltyChargesWaived: 0,
        penaltyChargesWrittenOff: 0,
        penaltyChargesOutstanding: 0,
        totalOriginalDueForPeriod: principalForPeriod + interestForPeriod,
        totalDueForPeriod: principalForPeriod + interestForPeriod,
        totalPaidForPeriod: 0,
        totalWaivedForPeriod: 0,
        totalWrittenOffForPeriod: 0,
        totalOutstandingForPeriod: principalForPeriod + interestForPeriod,
        totalActualCostOfLoanForPeriod: interestForPeriod,
        totalInstallmentAmountForPeriod: principalForPeriod + interestForPeriod,
        daysInPeriod
      };
      
      schedule.periods.push(repaymentPeriod);
      
      // Set from date for next period to the current period's due date
      periodFromDate = new Date(periodDueDate);
    }
  }
  
  /**
   * Generates all repayment periods with equal principal payments
   * In this method, the principal portion is the same for all periods,
   * but the interest varies based on the outstanding balance
   */
  private generateEqualPrincipalRepaymentPeriods(
    schedule: LoanSchedule, 
    loanApplicationTerms: LoanApplicationTerms, 
    repaymentDates: Date[]
  ): void {
    const { principalAmount, interestRatePerPeriod, interestMethod } = loanApplicationTerms;
    
    // Convert annual interest rate to period interest rate as a decimal
    const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
    
    // Calculate equal principal per period
    const principalPerPeriod = principalAmount / repaymentDates.length;
    
    let outstandingBalance = principalAmount;
    let periodFromDate = new Date(loanApplicationTerms.expectedDisbursementDate);
    
    for (let i = 0; i < repaymentDates.length; i++) {
      const periodDueDate = repaymentDates[i];
      let interestForPeriod;
      
      // Principal is always the same (equal principal)
      const principalForPeriod = principalPerPeriod;
      
      if (interestMethod === 'flat') {
        // For flat interest, interest is based on original principal
        interestForPeriod = principalAmount * interestRatePerPeriodDecimal / repaymentDates.length;
      } else if (interestMethod === 'declining_balance' || interestMethod === 'compound') {
        // For declining balance or compound, interest is based on outstanding balance
        interestForPeriod = outstandingBalance * interestRatePerPeriodDecimal;
      } else {
        throw new Error(`Unsupported interest method: ${interestMethod}`);
      }
      
      // Update outstanding balance for next period
      outstandingBalance -= principalForPeriod;
      
      // Round to 2 decimal places
      const roundedPrincipalForPeriod = Math.round(principalForPeriod * 100) / 100;
      const roundedInterestForPeriod = Math.round(interestForPeriod * 100) / 100;
      
      // Calculate days in period
      const daysInPeriod = Math.round(
        (periodDueDate.getTime() - periodFromDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Create the repayment period
      const repaymentPeriod: LoanSchedulePeriod = {
        periodNumber: i + 1,
        periodType: 'repayment',
        fromDate: new Date(periodFromDate),
        dueDate: new Date(periodDueDate),
        principalDisbursed: 0,
        principalLoanBalanceOutstanding: outstandingBalance,
        principalOriginalDue: roundedPrincipalForPeriod,
        principalDue: roundedPrincipalForPeriod,
        principalPaid: 0,
        principalWrittenOff: 0,
        principalOutstanding: roundedPrincipalForPeriod,
        interestOriginalDue: roundedInterestForPeriod,
        interestDue: roundedInterestForPeriod,
        interestPaid: 0,
        interestWaived: 0,
        interestWrittenOff: 0,
        interestOutstanding: roundedInterestForPeriod,
        feeChargesDue: 0,
        feeChargesPaid: 0,
        feeChargesWaived: 0,
        feeChargesWrittenOff: 0,
        feeChargesOutstanding: 0,
        penaltyChargesDue: 0,
        penaltyChargesPaid: 0,
        penaltyChargesWaived: 0,
        penaltyChargesWrittenOff: 0,
        penaltyChargesOutstanding: 0,
        totalOriginalDueForPeriod: roundedPrincipalForPeriod + roundedInterestForPeriod,
        totalDueForPeriod: roundedPrincipalForPeriod + roundedInterestForPeriod,
        totalPaidForPeriod: 0,
        totalWaivedForPeriod: 0,
        totalWrittenOffForPeriod: 0,
        totalOutstandingForPeriod: roundedPrincipalForPeriod + roundedInterestForPeriod,
        totalActualCostOfLoanForPeriod: roundedInterestForPeriod,
        totalInstallmentAmountForPeriod: roundedPrincipalForPeriod + roundedInterestForPeriod,
        daysInPeriod
      };
      
      schedule.periods.push(repaymentPeriod);
      
      // Set from date for next period to the current period's due date
      periodFromDate = new Date(periodDueDate);
    }
  }

  /**
   * Calculate schedule totals
   */
  private calculateScheduleTotals(schedule: LoanSchedule): void {
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalFeeCharges = 0;
    let totalPenaltyCharges = 0;
    
    for (const period of schedule.periods) {
      if (period.periodType === 'repayment') {
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
   * Apply charges to the loan schedule
   * @param schedule The loan schedule to apply charges to
   * @param charges Array of loan charges to apply
   * @param loanApplicationTerms The loan application terms
   */
  private applyChargesToSchedule(
    schedule: LoanSchedule, 
    charges: LoanCharge[], 
    loanApplicationTerms: LoanApplicationTerms
  ): void {
    logger.info('Applying charges to loan schedule', { 
      chargesCount: charges.length,
      loanCurrency: loanApplicationTerms.currency 
    });
    
    try {
      // Process each charge
      for (const charge of charges) {
        // Apply the charge based on its time type
        switch (charge.chargeTimeType) {
          case LoanChargeTimeType.DISBURSEMENT:
            this.applyDisbursementCharge(schedule, charge);
            break;
            
          case LoanChargeTimeType.SPECIFIED_DUE_DATE:
            this.applySpecifiedDueDateCharge(schedule, charge);
            break;
            
          case LoanChargeTimeType.INSTALLMENT_FEE:
            this.applyInstallmentFeeCharge(schedule, charge);
            break;
            
          case LoanChargeTimeType.OVERDUE_INSTALLMENT:
            // For overdue installment charges, in a real implementation
            // this would be applied dynamically as installments become overdue
            // For now, we'll skip these in the initial schedule
            break;
            
          case LoanChargeTimeType.OVERDUE_MATURITY:
            // For overdue maturity charges, in a real implementation
            // these would be applied dynamically if the loan is not fully repaid by maturity
            // For now, we'll skip these in the initial schedule
            break;
        }
      }
    } catch (error) {
      logger.error('Error applying charges to schedule', { error });
      throw new Error(`Failed to apply charges to schedule: ${error.message}`);
    }
  }
  
  /**
   * Apply disbursement charge to schedule
   * @param schedule The loan schedule
   * @param charge The disbursement charge
   */
  private applyDisbursementCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    if (schedule.periods.length === 0) {
      throw new Error('Cannot apply disbursement charge to empty schedule');
    }
    
    // Disbursement charges are applied to the first period (index 0)
    const disbursementPeriod = schedule.periods[0];
    
    if (disbursementPeriod.periodType !== 'disbursement') {
      throw new Error('First period must be disbursement period');
    }
    
    // Calculate charge amount based on charge calculation type
    let chargeAmount = charge.amount;
    
    if (charge.chargeCalculationType !== LoanChargeCalculationType.FLAT) {
      // For percentage-based charges, calculate based on loan amount
      const percentage = charge.percentage || 0;
      let baseAmount = 0;
      
      switch (charge.chargeCalculationType) {
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT:
        case LoanChargeCalculationType.PERCENT_OF_DISBURSEMENT_AMOUNT:
          baseAmount = disbursementPeriod.principalDisbursed;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT_AND_INTEREST:
          // For disbursement charges, there's no interest yet, so just use principal
          baseAmount = disbursementPeriod.principalDisbursed;
          break;
          
        default:
          // Other calculation types not applicable for disbursement
          baseAmount = disbursementPeriod.principalDisbursed;
      }
      
      chargeAmount = (percentage / 100) * baseAmount;
    }
    
    // Round to 2 decimal places
    chargeAmount = Math.round(chargeAmount * 100) / 100;
    
    // Apply the charge
    if (charge.isPenalty) {
      disbursementPeriod.penaltyChargesDue += chargeAmount;
      disbursementPeriod.penaltyChargesOutstanding += chargeAmount;
    } else {
      disbursementPeriod.feeChargesDue += chargeAmount;
      disbursementPeriod.feeChargesOutstanding += chargeAmount;
    }
    
    // Update period totals
    disbursementPeriod.totalOriginalDueForPeriod += chargeAmount;
    disbursementPeriod.totalDueForPeriod += chargeAmount;
    disbursementPeriod.totalOutstandingForPeriod += chargeAmount;
  }
  
  /**
   * Apply specified due date charge to schedule
   * @param schedule The loan schedule
   * @param charge The specified due date charge
   */
  private applySpecifiedDueDateCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    if (!charge.dueDate) {
      throw new Error('Specified due date charge must have a due date');
    }
    
    const dueDate = new Date(charge.dueDate);
    
    // Find the period that contains or comes after the due date
    let targetPeriod: LoanSchedulePeriod | null = null;
    
    for (let i = 0; i < schedule.periods.length; i++) {
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
      const lastPeriod = schedule.periods[schedule.periods.length - 1];
      if (lastPeriod.periodType === 'repayment') {
        targetPeriod = lastPeriod;
      }
    }
    
    if (!targetPeriod) {
      throw new Error('No suitable repayment period found for specified due date charge');
    }
    
    // Calculate charge amount based on charge calculation type
    let chargeAmount = charge.amount;
    
    if (charge.chargeCalculationType !== LoanChargeCalculationType.FLAT) {
      // For percentage-based charges, calculate based on appropriate base
      const percentage = charge.percentage || 0;
      let baseAmount = 0;
      
      switch (charge.chargeCalculationType) {
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT:
          baseAmount = schedule.principalDisbursed;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT_AND_INTEREST:
          baseAmount = schedule.totalPrincipal + schedule.totalInterest;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_INTEREST:
          baseAmount = schedule.totalInterest;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_DISBURSEMENT_AMOUNT:
          baseAmount = schedule.principalDisbursed;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_TOTAL_OUTSTANDING:
          baseAmount = targetPeriod.principalLoanBalanceOutstanding;
          break;
      }
      
      chargeAmount = (percentage / 100) * baseAmount;
    }
    
    // Round to 2 decimal places
    chargeAmount = Math.round(chargeAmount * 100) / 100;
    
    // Apply the charge
    if (charge.isPenalty) {
      targetPeriod.penaltyChargesDue += chargeAmount;
      targetPeriod.penaltyChargesOutstanding += chargeAmount;
    } else {
      targetPeriod.feeChargesDue += chargeAmount;
      targetPeriod.feeChargesOutstanding += chargeAmount;
    }
    
    // Update period totals
    targetPeriod.totalOriginalDueForPeriod += chargeAmount;
    targetPeriod.totalDueForPeriod += chargeAmount;
    targetPeriod.totalOutstandingForPeriod += chargeAmount;
  }
  
  /**
   * Apply installment fee charge to schedule
   * Distributes the charge across all repayment periods
   * @param schedule The loan schedule
   * @param charge The installment fee charge
   */
  private applyInstallmentFeeCharge(schedule: LoanSchedule, charge: LoanCharge): void {
    // Get all repayment periods
    const repaymentPeriods = schedule.periods.filter(p => p.periodType === 'repayment');
    
    if (repaymentPeriods.length === 0) {
      throw new Error('No repayment periods found for installment fee charge');
    }
    
    // Calculate total charge amount based on calculation type
    let totalChargeAmount = charge.amount;
    
    if (charge.chargeCalculationType !== LoanChargeCalculationType.FLAT) {
      // For percentage-based charges, calculate based on appropriate base
      const percentage = charge.percentage || 0;
      let baseAmount = 0;
      
      switch (charge.chargeCalculationType) {
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT:
          baseAmount = schedule.principalDisbursed;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_AMOUNT_AND_INTEREST:
          baseAmount = schedule.totalPrincipal + schedule.totalInterest;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_INTEREST:
          baseAmount = schedule.totalInterest;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_DISBURSEMENT_AMOUNT:
          baseAmount = schedule.principalDisbursed;
          break;
          
        case LoanChargeCalculationType.PERCENT_OF_TOTAL_OUTSTANDING:
          // Use average outstanding for installment fees
          baseAmount = repaymentPeriods.reduce((sum, period) => sum + period.principalLoanBalanceOutstanding, 0) / repaymentPeriods.length;
          break;
      }
      
      totalChargeAmount = (percentage / 100) * baseAmount;
    }
    
    // Calculate amount per installment
    let amountPerInstallment = totalChargeAmount / repaymentPeriods.length;
    
    // Round to 2 decimal places
    amountPerInstallment = Math.round(amountPerInstallment * 100) / 100;
    
    // Handle rounding issues by adjusting last installment
    let remainingAmount = totalChargeAmount;
    
    // Apply to each repayment period
    for (let i = 0; i < repaymentPeriods.length; i++) {
      const period = repaymentPeriods[i];
      let amountToApply;
      
      // For last period, use remaining amount to handle rounding
      if (i === repaymentPeriods.length - 1) {
        amountToApply = remainingAmount;
      } else {
        amountToApply = amountPerInstallment;
        remainingAmount -= amountToApply;
      }
      
      // Apply the charge
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
   * Generates a repayment schedule with variable installments
   * @param schedule The loan schedule to populate
   * @param loanApplicationTerms The loan application terms with variable installment configuration
   */
  private generateVariableInstallmentSchedule(
    schedule: LoanSchedule,
    loanApplicationTerms: LoanApplicationTerms
  ): void {
    logger.info('Generating variable installment schedule');
    
    if (!loanApplicationTerms.installments || loanApplicationTerms.installments.length === 0) {
      throw new Error('Variable installments configuration requires installment data');
    }
    
    // Sort installments by installment number
    const sortedInstallments = [...loanApplicationTerms.installments].sort(
      (a, b) => a.installmentNumber - b.installmentNumber
    );
    
    // Validate that we have the right number of installments
    if (sortedInstallments.length !== loanApplicationTerms.numberOfRepayments) {
      throw new Error(
        `Expected ${loanApplicationTerms.numberOfRepayments} installments, ` +
        `but got ${sortedInstallments.length}`
      );
    }
    
    const { interestMethod, principalAmount, interestRatePerPeriod } = loanApplicationTerms;
    
    // Convert annual interest rate to period interest rate as a decimal
    const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
    
    let outstandingBalance = principalAmount;
    let periodFromDate = new Date(loanApplicationTerms.expectedDisbursementDate);
    
    // Process each installment
    for (let i = 0; i < sortedInstallments.length; i++) {
      const installment = sortedInstallments[i];
      const periodDueDate = new Date(installment.dueDate);
      let principalForPeriod: number;
      let interestForPeriod: number;
      
      // Handle interest calculation based on method
      if (interestMethod === 'flat') {
        // For flat interest, we typically use equal interest across periods
        interestForPeriod = installment.interest !== undefined ? 
          installment.interest : 
          (principalAmount * interestRatePerPeriodDecimal) / sortedInstallments.length;
          
        // Handle principal for this period (either specified or default calculation)
        principalForPeriod = installment.principal !== undefined ?
          installment.principal :
          principalAmount / sortedInstallments.length;
          
      } else if (interestMethod === 'declining_balance' || interestMethod === 'compound') {
        // For declining balance, interest is calculated based on outstanding balance
        interestForPeriod = installment.interest !== undefined ?
          installment.interest :
          outstandingBalance * interestRatePerPeriodDecimal;
        
        // If installment amount is specified, principal is the difference
        if (installment.installmentAmount !== undefined) {
          principalForPeriod = installment.installmentAmount - interestForPeriod;
          
          // Ensure principal doesn't exceed outstanding balance
          principalForPeriod = Math.min(principalForPeriod, outstandingBalance);
        } else if (installment.principal !== undefined) {
          // If principal is explicitly specified, use that value
          principalForPeriod = Math.min(installment.principal, outstandingBalance);
        } else {
          // Default behavior: equal principal for remaining periods
          principalForPeriod = outstandingBalance / (sortedInstallments.length - i);
        }
      } else {
        throw new Error(`Unsupported interest method: ${interestMethod}`);
      }
      
      // Update outstanding balance for next period
      outstandingBalance -= principalForPeriod;
      
      // Round to 2 decimal places
      principalForPeriod = Math.round(principalForPeriod * 100) / 100;
      interestForPeriod = Math.round(interestForPeriod * 100) / 100;
      
      // Calculate days in period
      const daysInPeriod = Math.round(
        (periodDueDate.getTime() - periodFromDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Create the repayment period
      const repaymentPeriod: LoanSchedulePeriod = {
        periodNumber: installment.installmentNumber,
        periodType: 'repayment',
        fromDate: new Date(periodFromDate),
        dueDate: new Date(periodDueDate),
        principalDisbursed: 0,
        principalLoanBalanceOutstanding: outstandingBalance,
        principalOriginalDue: principalForPeriod,
        principalDue: principalForPeriod,
        principalPaid: 0,
        principalWrittenOff: 0,
        principalOutstanding: principalForPeriod,
        interestOriginalDue: interestForPeriod,
        interestDue: interestForPeriod,
        interestPaid: 0,
        interestWaived: 0,
        interestWrittenOff: 0,
        interestOutstanding: interestForPeriod,
        feeChargesDue: 0,
        feeChargesPaid: 0,
        feeChargesWaived: 0,
        feeChargesWrittenOff: 0,
        feeChargesOutstanding: 0,
        penaltyChargesDue: 0,
        penaltyChargesPaid: 0,
        penaltyChargesWaived: 0,
        penaltyChargesWrittenOff: 0,
        penaltyChargesOutstanding: 0,
        totalOriginalDueForPeriod: principalForPeriod + interestForPeriod,
        totalDueForPeriod: principalForPeriod + interestForPeriod,
        totalPaidForPeriod: 0,
        totalWaivedForPeriod: 0,
        totalWrittenOffForPeriod: 0,
        totalOutstandingForPeriod: principalForPeriod + interestForPeriod,
        totalActualCostOfLoanForPeriod: interestForPeriod,
        totalInstallmentAmountForPeriod: principalForPeriod + interestForPeriod,
        daysInPeriod
      };
      
      schedule.periods.push(repaymentPeriod);
      
      // Set from date for next period to the current period's due date
      periodFromDate = new Date(periodDueDate);
    }
    
    // Verify final outstanding balance is zero (or very close to zero due to rounding)
    if (Math.abs(outstandingBalance) > 0.01) {
      logger.warn('Final outstanding balance is not zero', { outstandingBalance });
      
      // Adjust the last period to account for rounding differences
      const lastPeriod = schedule.periods[schedule.periods.length - 1];
      
      if (lastPeriod && lastPeriod.periodType === 'repayment') {
        // Add the remaining balance to the last period's principal
        lastPeriod.principalOriginalDue += outstandingBalance;
        lastPeriod.principalDue += outstandingBalance;
        lastPeriod.principalOutstanding += outstandingBalance;
        
        // Recalculate totals for the last period
        lastPeriod.totalOriginalDueForPeriod = lastPeriod.principalOriginalDue + lastPeriod.interestOriginalDue;
        lastPeriod.totalDueForPeriod = lastPeriod.principalDue + lastPeriod.interestDue;
        lastPeriod.totalOutstandingForPeriod = lastPeriod.principalOutstanding + lastPeriod.interestOutstanding;
        lastPeriod.totalInstallmentAmountForPeriod = lastPeriod.totalDueForPeriod;
        
        // Reset outstanding balance to zero
        lastPeriod.principalLoanBalanceOutstanding = 0;
      }
    }
  }
  
  /**
   * Validates that variable installment configuration and installments are valid
   * @param terms The loan application terms to validate
   * @throws Error if variable installment configuration or installments are invalid
   */
  private validateVariableInstallments(terms: LoanApplicationTerms): void {
    if (!terms.allowVariableInstallments) {
      return; // Not using variable installments, so no validation needed
    }
    
    // Check that all required configuration is present
    if (terms.minimumGap === undefined || 
        terms.minimumGapFrequencyType === undefined ||
        terms.maximumGap === undefined ||
        terms.maximumGapFrequencyType === undefined) {
      throw new Error('Variable installment configuration is incomplete');
    }
    
    // Check that minimum gap is valid
    if (terms.minimumGap <= 0) {
      throw new Error('Minimum gap must be greater than zero');
    }
    
    // Check that maximum gap is valid
    if (terms.maximumGap <= 0) {
      throw new Error('Maximum gap must be greater than zero');
    }
    
    // Check that maximum gap is greater than or equal to minimum gap
    if (terms.maximumGap < terms.minimumGap) {
      throw new Error('Maximum gap must be greater than or equal to minimum gap');
    }
    
    // Check that installments are provided
    if (!terms.installments || terms.installments.length === 0) {
      throw new Error('Variable installment configuration requires installment data');
    }
    
    // Check that we have the right number of installments
    if (terms.installments.length !== terms.numberOfRepayments) {
      throw new Error(
        `Expected ${terms.numberOfRepayments} installments, ` +
        `but got ${terms.installments.length}`
      );
    }
    
    // Check that minimum installment amount is valid if provided
    if (terms.minimumInstallmentAmount !== undefined && terms.minimumInstallmentAmount <= 0) {
      throw new Error('Minimum installment amount must be greater than zero');
    }
    
    // Check that all installments have valid dates
    for (const installment of terms.installments) {
      if (!installment.dueDate) {
        throw new Error(`Installment ${installment.installmentNumber} missing due date`);
      }
    }
    
    // Sort installments by due date for gap validation
    const sortedInstallments = [...terms.installments].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    // Convert gaps to days
    const minimumGapDays = this.gapToDays(terms.minimumGap, terms.minimumGapFrequencyType);
    const maximumGapDays = this.gapToDays(terms.maximumGap, terms.maximumGapFrequencyType);
    
    // Validate gaps between installments
    let previousDate = new Date(terms.expectedDisbursementDate);
    
    for (const installment of sortedInstallments) {
      const currentDate = new Date(installment.dueDate);
      const daysSincePreviousDate = Math.round(
        (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSincePreviousDate < minimumGapDays) {
        throw new Error(
          `Gap between installment ${installment.installmentNumber} and previous date ` +
          `(${daysSincePreviousDate} days) is less than the minimum allowed gap (${minimumGapDays} days)`
        );
      }
      
      if (daysSincePreviousDate > maximumGapDays) {
        throw new Error(
          `Gap between installment ${installment.installmentNumber} and previous date ` +
          `(${daysSincePreviousDate} days) is greater than the maximum allowed gap (${maximumGapDays} days)`
        );
      }
      
      previousDate = currentDate;
    }
    
    // Check that installment amounts meet minimum if specified
    if (terms.minimumInstallmentAmount !== undefined) {
      for (const installment of terms.installments) {
        if (installment.installmentAmount !== undefined && 
            installment.installmentAmount < terms.minimumInstallmentAmount) {
          throw new Error(
            `Installment ${installment.installmentNumber} amount ${installment.installmentAmount} ` +
            `is less than the minimum allowed amount ${terms.minimumInstallmentAmount}`
          );
        }
      }
    }
  }
  
  /**
   * Converts a gap to days based on frequency type
   * @param gap The gap value
   * @param frequencyType The frequency type
   * @returns The gap in days
   */
  private gapToDays(gap: number, frequencyType: string): number {
    switch (frequencyType) {
      case 'days':
        return gap;
      case 'weeks':
        return gap * 7;
      case 'months':
        return gap * 30; // Approximate
      case 'years':
        return gap * 365; // Approximate
      default:
        throw new Error(`Unsupported frequency type: ${frequencyType}`);
    }
  }
  
  /**
   * Calculate prepayment amount for a loan as of a specific date
   * Handles early repayment calculations including:
   * - Outstanding principal
   * - Accrued interest up to prepayment date
   * - Applicable fees and penalties
   * - Early repayment penalties if configured
   * 
   * @param loan The loan details including current balances and transactions
   * @param onDate The date of the proposed prepayment
   * @param paymentAmount Optional proposed payment amount
   * @param includeEarlyPaymentPenalty Whether to include early payment penalties
   * @returns PrepaymentAmount with breakdown of payment portions
   */
  async calculatePrepaymentAmount(
    loan: any, 
    onDate: string, 
    paymentAmount?: number,
    includeEarlyPaymentPenalty: boolean = true
  ): Promise<PrepaymentAmount> {
    try {
      logger.info('Calculating prepayment amount', { loanId: loan.id, onDate });
      
      // Create date objects for calculations
      const prepaymentDate = new Date(onDate);
      const disbursementDate = new Date(loan.disbursed_on_date);
      
      // Calculate days since disbursement
      const daysSinceDisbursement = Math.ceil(
        (prepaymentDate.getTime() - disbursementDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Create Money objects for calculations
      const currency = loan.currency_code;
      const outstandingPrincipal = Money.of(currency, loan.principal_outstanding_derived);
      let outstandingInterest = Money.of(currency, loan.interest_outstanding_derived);
      const outstandingFees = Money.of(currency, loan.fee_charges_outstanding_derived);
      const outstandingPenalties = Money.of(currency, loan.penalty_charges_outstanding_derived);
      
      // If there's unprocessed interest accrual, calculate it up to the prepayment date
      if (loan.interest_calculation_method === 'declining_balance') {
        // For declining balance loans, interest is based on outstanding principal
        const interestRatePerDay = (loan.interest_rate / 100) / 365; // Daily interest rate
        const daysToLastAccrual = loan.days_to_last_accrual || 0;
        const daysForAdditionalInterest = daysSinceDisbursement - daysToLastAccrual;
        
        if (daysForAdditionalInterest > 0) {
          // Calculate additional interest for days since last accrual
          const additionalInterest = outstandingPrincipal.getAmount() * interestRatePerDay * daysForAdditionalInterest;
          outstandingInterest = outstandingInterest.plus(Money.of(currency, additionalInterest));
        }
      }
      
      // Calculate early payment penalty if applicable
      let earlyPaymentPenalty = Money.zero(currency);
      if (includeEarlyPaymentPenalty && loan.early_repayment_penalty_applicable) {
        const penaltyPercentage = loan.early_repayment_penalty_percentage || 0;
        if (penaltyPercentage > 0) {
          earlyPaymentPenalty = outstandingPrincipal.multipliedBy(penaltyPercentage / 100);
        }
      }
      
      // Total prepayment amount
      const totalPrepaymentAmount = outstandingPrincipal
        .plus(outstandingInterest)
        .plus(outstandingFees)
        .plus(outstandingPenalties)
        .plus(earlyPaymentPenalty);
      
      // Calculate additional principal required if payment amount provided
      let additionalPrincipalRequired = 0;
      if (paymentAmount !== undefined) {
        const proposedPayment = Money.of(currency, paymentAmount);
        if (proposedPayment.isLessThan(totalPrepaymentAmount)) {
          additionalPrincipalRequired = totalPrepaymentAmount.minus(proposedPayment).getAmount();
        }
      }
      
      return {
        principalPortion: outstandingPrincipal.getAmount(),
        interestPortion: outstandingInterest.getAmount(),
        feeChargesPortion: outstandingFees.getAmount(),
        penaltyChargesPortion: outstandingPenalties.getAmount() + earlyPaymentPenalty.getAmount(),
        totalPrepaymentAmount: totalPrepaymentAmount.getAmount(),
        transactionDate: onDate,
        additionalPrincipalRequired
      };
    } catch (error) {
      logger.error('Error calculating prepayment amount', error);
      throw new Error(`Failed to calculate prepayment amount: ${error.message}`);
    }
  }
  
  /**
   * Calculates potential savings from early repayment
   * This helps borrowers understand the benefits of paying off early
   * 
   * @param loan The loan details
   * @param prepaymentDate The date of proposed prepayment
   * @returns Object containing interest savings and other benefits
   */
  async calculateEarlyRepaymentBenefits(loan: any, prepaymentDate: string): Promise<any> {
    try {
      // Get original schedule
      const loanApplicationTerms = this.buildLoanApplicationTermsFromLoan(loan);
      const originalSchedule = await this.generateRepaymentSchedule(loanApplicationTerms);
      
      // Calculate total interest that would be paid with normal schedule
      const totalScheduledInterest = originalSchedule.totalInterest;
      
      // Calculate interest paid so far (from transactions)
      const interestPaidToDate = loan.interest_paid_derived || 0;
      
      // Calculate interest in prepayment amount
      const prepayment = await this.calculatePrepaymentAmount(loan, prepaymentDate);
      const remainingInterestToPay = prepayment.interestPortion;
      
      // Calculate interest savings
      const interestSavings = totalScheduledInterest - interestPaidToDate - remainingInterestToPay;
      
      // Calculate time savings (days)
      const lastScheduledPaymentDate = new Date(
        originalSchedule.periods[originalSchedule.periods.length - 1].dueDate
      );
      const prepaymentDateObj = new Date(prepaymentDate);
      const daysSaved = Math.ceil(
        (lastScheduledPaymentDate.getTime() - prepaymentDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        originalLoanEndDate: lastScheduledPaymentDate.toISOString().split('T')[0],
        proposedPrepaymentDate: prepaymentDate,
        totalScheduledInterest,
        interestPaidToDate,
        remainingInterestToPay,
        interestSavings: Math.max(0, interestSavings),
        daysSaved: Math.max(0, daysSaved),
        paymentsRemaining: originalSchedule.periods
          .filter(p => p.periodType === 'repayment' && new Date(p.dueDate) > prepaymentDateObj)
          .length
      };
    } catch (error) {
      logger.error('Error calculating early repayment benefits', error);
      throw new Error(`Failed to calculate early repayment benefits: ${error.message}`);
    }
  }
  
  /**
   * Builds LoanApplicationTerms from an existing loan record
   * Used for recalculations and prepayment scenarios
   * 
   * @param loan The loan details from database
   * @returns LoanApplicationTerms object for schedule generation
   */
  private buildLoanApplicationTermsFromLoan(loan: any): LoanApplicationTerms {
    return {
      principalAmount: loan.principal_amount,
      currency: loan.currency_code,
      loanTermFrequency: loan.term_frequency,
      loanTermFrequencyType: loan.term_frequency_type,
      numberOfRepayments: loan.number_of_repayments,
      repaymentEvery: loan.repayment_every,
      repaymentFrequencyType: loan.repayment_frequency_type,
      interestRatePerPeriod: loan.interest_rate,
      interestMethod: loan.interest_method,
      amortizationMethod: loan.amortization_method,
      expectedDisbursementDate: loan.disbursed_on_date,
      submittedOnDate: loan.submitted_on_date,
      graceOnPrincipalPayment: loan.grace_on_principal_payment,
      graceOnInterestPayment: loan.grace_on_interest_payment,
      graceOnInterestCharged: loan.grace_on_interest_charged,
      // Add down payment configuration if present
      enableDownPayment: loan.enable_down_payment,
      downPaymentType: loan.down_payment_type,
      downPaymentAmount: loan.down_payment_amount,
      downPaymentPercentage: loan.down_payment_percentage,
      // Add variable installment configuration if present
      allowVariableInstallments: loan.allow_variable_installments,
      minimumGap: loan.minimum_gap,
      minimumGapFrequencyType: loan.minimum_gap_frequency_type,
      maximumGap: loan.maximum_gap,
      maximumGapFrequencyType: loan.maximum_gap_frequency_type,
      minimumInstallmentAmount: loan.minimum_installment_amount
    };
  }
}