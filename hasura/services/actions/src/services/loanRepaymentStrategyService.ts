import { Money } from '../models/money';
import { LoanSchedulePeriod } from '../models/loan';
import { 
  LoanRepaymentStrategy, 
  PaymentAllocationRules, 
  DEFAULT_PAYMENT_ALLOCATION_RULES 
} from '../models/loanAdvanced';
import { logger } from '../utils/logger';

/**
 * Service to handle loan repayment strategies
 * This determines how payments are allocated to outstanding balances
 */
export class LoanRepaymentStrategyService {
  
  /**
   * Allocate a payment amount to outstanding loan balances based on the specified strategy
   * @param loanId The loan ID
   * @param paymentAmount The total payment amount
   * @param currency The currency code
   * @param repaymentStrategy The repayment strategy to use
   * @param outstandingPeriods The outstanding periods from the loan schedule
   * @returns Payment allocation breakdown
   */
  allocatePayment(
    loanId: string,
    paymentAmount: number,
    currency: string,
    repaymentStrategy: LoanRepaymentStrategy,
    outstandingPeriods: LoanSchedulePeriod[]
  ): PaymentAllocation {
    logger.info('Allocating payment using strategy', { 
      loanId, 
      paymentAmount, 
      repaymentStrategy
    });
    
    try {
      // Create Money object for payment
      let remainingPayment = Money.of(currency, paymentAmount);
      
      // Get the allocation rules for the strategy
      const allocationRules = DEFAULT_PAYMENT_ALLOCATION_RULES[repaymentStrategy] || 
                             DEFAULT_PAYMENT_ALLOCATION_RULES[LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES];
      
      // Prepare periods for allocation
      let periodsToProcess = [...outstandingPeriods];
      
      // If due date ordering is enabled, sort periods by due date (oldest first)
      if (allocationRules.dueDateOrderingFlag) {
        periodsToProcess.sort((a, b) => {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      }
      
      // Create response object
      const result: PaymentAllocation = {
        loanId,
        paymentAmount,
        currency,
        strategy: repaymentStrategy,
        periodAllocations: [],
        totalPrincipalAllocated: 0,
        totalInterestAllocated: 0,
        totalFeeChargesAllocated: 0,
        totalPenaltyChargesAllocated: 0,
        unallocatedAmount: 0
      };
      
      // Process each period based on the allocation order
      for (const period of periodsToProcess) {
        // Skip periods with no outstanding balance
        if (period.totalOutstandingForPeriod <= 0) {
          continue;
        }
        
        // Create period allocation
        const periodAllocation: PeriodAllocation = {
          periodNumber: period.periodNumber,
          dueDate: period.dueDate,
          principalAllocated: 0,
          interestAllocated: 0,
          feeChargesAllocated: 0,
          penaltyChargesAllocated: 0,
          totalAllocated: 0
        };
        
        // Follow the allocation order from the rules
        for (const allocationItem of allocationRules.allocationOrder) {
          // Skip if no payment remaining
          if (remainingPayment.isZero()) {
            break;
          }
          
          // Allocate based on component type
          switch (allocationItem.componentType) {
            case 'principal':
              if (period.principalOutstanding > 0) {
                const principalOutstanding = Money.of(currency, period.principalOutstanding);
                const principalToAllocate = remainingPayment.isGreaterThan(principalOutstanding) ? 
                  principalOutstanding : remainingPayment;
                
                periodAllocation.principalAllocated += principalToAllocate.getAmount();
                remainingPayment = remainingPayment.minus(principalToAllocate);
                result.totalPrincipalAllocated += principalToAllocate.getAmount();
              }
              break;
              
            case 'interest':
              if (period.interestOutstanding > 0) {
                const interestOutstanding = Money.of(currency, period.interestOutstanding);
                const interestToAllocate = remainingPayment.isGreaterThan(interestOutstanding) ? 
                  interestOutstanding : remainingPayment;
                
                periodAllocation.interestAllocated += interestToAllocate.getAmount();
                remainingPayment = remainingPayment.minus(interestToAllocate);
                result.totalInterestAllocated += interestToAllocate.getAmount();
              }
              break;
              
            case 'fees':
              if (period.feeChargesOutstanding > 0) {
                const feesOutstanding = Money.of(currency, period.feeChargesOutstanding);
                const feesToAllocate = remainingPayment.isGreaterThan(feesOutstanding) ? 
                  feesOutstanding : remainingPayment;
                
                periodAllocation.feeChargesAllocated += feesToAllocate.getAmount();
                remainingPayment = remainingPayment.minus(feesToAllocate);
                result.totalFeeChargesAllocated += feesToAllocate.getAmount();
              }
              break;
              
            case 'penalties':
              if (period.penaltyChargesOutstanding > 0) {
                const penaltiesOutstanding = Money.of(currency, period.penaltyChargesOutstanding);
                const penaltiesToAllocate = remainingPayment.isGreaterThan(penaltiesOutstanding) ? 
                  penaltiesOutstanding : remainingPayment;
                
                periodAllocation.penaltyChargesAllocated += penaltiesToAllocate.getAmount();
                remainingPayment = remainingPayment.minus(penaltiesToAllocate);
                result.totalPenaltyChargesAllocated += penaltiesToAllocate.getAmount();
              }
              break;
          }
        }
        
        // Calculate total allocated for this period
        periodAllocation.totalAllocated = 
          periodAllocation.principalAllocated + 
          periodAllocation.interestAllocated + 
          periodAllocation.feeChargesAllocated + 
          periodAllocation.penaltyChargesAllocated;
        
        // Add period allocation to results if anything was allocated
        if (periodAllocation.totalAllocated > 0) {
          result.periodAllocations.push(periodAllocation);
        }
      }
      
      // Set any unallocated amount
      result.unallocatedAmount = remainingPayment.getAmount();
      
      return result;
    } catch (error) {
      logger.error('Error allocating payment', { loanId, error });
      throw new Error(`Failed to allocate payment: ${error.message}`);
    }
  }
  
  /**
   * Get payment allocation rules for a repayment strategy
   * @param strategy The repayment strategy
   * @returns Payment allocation rules
   */
  getPaymentAllocationRules(strategy: LoanRepaymentStrategy): PaymentAllocationRules {
    return DEFAULT_PAYMENT_ALLOCATION_RULES[strategy] || 
           DEFAULT_PAYMENT_ALLOCATION_RULES[LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES];
  }
  
  /**
   * Get default repayment strategy
   * @returns Default repayment strategy
   */
  getDefaultRepaymentStrategy(): LoanRepaymentStrategy {
    return LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES;
  }
  
  /**
   * Get all available repayment strategies
   * @returns Array of available strategies with details
   */
  getAvailableRepaymentStrategies(): RepaymentStrategyDetails[] {
    return [
      {
        code: LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES,
        name: 'Principal, Interest, Penalties, Fees',
        description: 'Allocates payment to principal first, then interest, penalties, and fees',
        isDefault: true
      },
      {
        code: LoanRepaymentStrategy.HEAVINESS_PRINCIPAL_INTEREST_PENALTIES_FEES,
        name: 'Heaviness: Principal, Interest, Penalties, Fees',
        description: 'Allocates to principal first with weightage, then interest, penalties, and fees'
      },
      {
        code: LoanRepaymentStrategy.INTEREST_PRINCIPAL_PENALTIES_FEES,
        name: 'Interest, Principal, Penalties, Fees',
        description: 'Allocates payment to interest first, then principal, penalties, and fees'
      },
      {
        code: LoanRepaymentStrategy.PRINCIPAL_INTEREST_FEES_PENALTIES,
        name: 'Principal, Interest, Fees, Penalties',
        description: 'Allocates payment to principal first, then interest, fees, and penalties'
      },
      {
        code: LoanRepaymentStrategy.DUE_DATE_PRINCIPAL_INTEREST_PENALTIES_FEES,
        name: 'Due Date: Principal, Interest, Penalties, Fees',
        description: 'Allocates payment based on due date (earliest first), then principal, interest, penalties, and fees'
      },
      {
        code: LoanRepaymentStrategy.INTEREST_PRINCIPAL_FEES_PENALTIES_OVERDUE_DUE,
        name: 'Interest, Principal, Fees, Penalties (Overdue/Due)',
        description: 'Allocates to overdue amounts first, then to current amounts, following interest, principal, fees, penalties order'
      },
      {
        code: LoanRepaymentStrategy.OVERDUE_DUE_INTEREST_PRINCIPAL_PENALTIES_FEES,
        name: 'Overdue/Due: Interest, Principal, Penalties, Fees',
        description: 'Allocates to overdue amounts first, then to current amounts, following interest, principal, penalties, fees order'
      }
    ];
  }
}

/**
 * Interface for payment allocation results
 */
export interface PaymentAllocation {
  loanId: string;
  paymentAmount: number;
  currency: string;
  strategy: LoanRepaymentStrategy;
  periodAllocations: PeriodAllocation[];
  totalPrincipalAllocated: number;
  totalInterestAllocated: number;
  totalFeeChargesAllocated: number;
  totalPenaltyChargesAllocated: number;
  unallocatedAmount: number;
}

/**
 * Interface for period-specific payment allocation
 */
export interface PeriodAllocation {
  periodNumber: number;
  dueDate: string;
  principalAllocated: number;
  interestAllocated: number;
  feeChargesAllocated: number;
  penaltyChargesAllocated: number;
  totalAllocated: number;
}

/**
 * Interface for repayment strategy details
 */
interface RepaymentStrategyDetails {
  code: LoanRepaymentStrategy;
  name: string;
  description: string;
  isDefault?: boolean;
}