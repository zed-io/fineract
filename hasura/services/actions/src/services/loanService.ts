import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { getLoanById, updateLoanStatus, createLoanTransaction, createPaymentDetail, updateLoanBalances } from '../repositories/loanRepository';
import { LoanCalculationService } from './loanCalculationService';

// Initialize the loan calculation service
const loanCalculationService = new LoanCalculationService();

export async function approveLoan(input, userId) {
  const { loanId, approvedOnDate, approvedAmount, note } = input;
  logger.info('Approving loan', { loanId, approvedOnDate, userId });

  return db.transaction(async (client) => {
    // Get loan details
    const loan = await getLoanById(client, loanId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // Validate loan status
    if (loan.loan_status !== 'submitted_and_pending_approval') {
      throw new Error(`Cannot approve loan with status ${loan.loan_status}`);
    }

    // Update loan status and approval details
    const finalApprovedAmount = approvedAmount || loan.principal_amount;
    await updateLoanStatus(
      client, 
      loanId, 
      'approved', 
      userId, 
      approvedOnDate,
      {
        approved_principal: finalApprovedAmount,
        approved_on_date: approvedOnDate,
        approved_by_user_id: userId
      }
    );

    // Return success response
    return {
      success: true,
      loanId,
      message: 'Loan approved successfully',
      approvedOnDate,
      approvedAmount: finalApprovedAmount
    };
  });
}

export async function disburseLoan(input, userId) {
  const { 
    loanId, 
    disbursementDate, 
    paymentTypeId, 
    transactionAmount,
    note,
    receiptNumber,
    checkNumber, 
    routingCode,
    bankNumber,
    accountNumber
  } = input;
  logger.info('Disbursing loan', { loanId, disbursementDate, userId });

  return db.transaction(async (client) => {
    // Get loan details
    const loan = await getLoanById(client, loanId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // Validate loan status
    if (loan.loan_status !== 'approved') {
      throw new Error(`Cannot disburse loan with status ${loan.loan_status}`);
    }

    // Create payment details if provided
    let paymentDetailId = null;
    if (paymentTypeId) {
      paymentDetailId = await createPaymentDetail(client, {
        paymentTypeId,
        accountNumber,
        checkNumber,
        routingCode,
        receiptNumber,
        bankNumber
      });
    }

    // Create disbursement transaction
    const finalAmount = transactionAmount || loan.approved_principal;
    const transactionId = await createLoanTransaction(client, {
      loanId,
      paymentDetailId,
      transactionType: 'disbursement',
      transactionDate: disbursementDate,
      amount: finalAmount,
      submittedOnDate: disbursementDate,
      submittedByUserId: userId,
      note
    });

    // Update loan status and disbursement details
    const expectedMaturityDate = calculateMaturityDate(disbursementDate, loan.term_frequency, loan.term_frequency_type);
    await updateLoanStatus(
      client, 
      loanId, 
      'active', 
      userId, 
      disbursementDate,
      {
        disbursed_on_date: disbursementDate,
        disbursed_by_user_id: userId,
        expected_maturity_date: expectedMaturityDate,
        principal_disbursed_derived: finalAmount,
        principal_outstanding_derived: finalAmount
      }
    );

    // Return success response
    return {
      success: true,
      loanId,
      message: 'Loan disbursed successfully',
      transactionId,
      disbursementDate,
      disbursedAmount: finalAmount
    };
  });
}

export async function makeLoanRepayment(input, userId) {
  const { 
    loanId, 
    transactionDate, 
    transactionAmount,
    paymentTypeId,
    note,
    receiptNumber,
    checkNumber, 
    routingCode,
    bankNumber,
    accountNumber
  } = input;
  logger.info('Processing loan repayment', { loanId, transactionDate, transactionAmount, userId });

  return db.transaction(async (client) => {
    // Get loan details
    const loan = await getLoanById(client, loanId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // Validate loan status
    if (loan.loan_status !== 'active') {
      throw new Error(`Cannot make repayment for loan with status ${loan.loan_status}`);
    }

    // Create payment details if provided
    let paymentDetailId = null;
    if (paymentTypeId) {
      paymentDetailId = await createPaymentDetail(client, {
        paymentTypeId,
        accountNumber,
        checkNumber,
        routingCode,
        receiptNumber,
        bankNumber
      });
    }

    // Calculate allocation of payment
    const {
      principalPortion,
      interestPortion,
      feePortion,
      penaltyPortion,
      overpaymentPortion
    } = calculatePaymentAllocation(loan, transactionAmount);

    // Create repayment transaction
    const transactionId = await createLoanTransaction(client, {
      loanId,
      paymentDetailId,
      transactionType: 'repayment',
      transactionDate,
      amount: transactionAmount,
      principalPortion,
      interestPortion,
      feeChargesPortion: feePortion,
      penaltyChargesPortion: penaltyPortion,
      overpaymentPortion,
      submittedOnDate: transactionDate,
      submittedByUserId: userId,
      note
    });

    // Update loan balances
    const outstandingBalance = calculateOutstandingBalance(loan, principalPortion, interestPortion, feePortion, penaltyPortion);
    await updateLoanBalances(client, loanId, {
      principalPaid: principalPortion,
      interestPaid: interestPortion,
      feesPaid: feePortion,
      penaltiesPaid: penaltyPortion,
      outstandingBalance
    });

    // Check if loan is fully paid
    if (outstandingBalance <= 0) {
      await updateLoanStatus(
        client, 
        loanId, 
        'closed_obligations_met', 
        userId, 
        transactionDate,
        {
          closed_on_date: transactionDate,
          closed_by_user_id: userId
        }
      );
    }

    // Return success response
    return {
      success: true,
      loanId,
      message: 'Loan repayment processed successfully',
      transactionId,
      transactionDate,
      amount: transactionAmount,
      principalPortion,
      interestPortion,
      feesPortion: feePortion,
      penaltyPortion,
      outstandingBalance
    };
  });
}

export async function writeOffLoan(input, userId) {
  const { loanId, transactionDate, note } = input;
  logger.info('Writing off loan', { loanId, transactionDate, userId });

  return db.transaction(async (client) => {
    // Get loan details
    const loan = await getLoanById(client, loanId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // Validate loan status
    if (loan.loan_status !== 'active') {
      throw new Error(`Cannot write off loan with status ${loan.loan_status}`);
    }

    // Calculate write-off amount (remaining balance)
    const writeOffAmount = new Decimal(loan.total_outstanding_derived).toNumber();

    // Create write-off transaction
    const transactionId = await createLoanTransaction(client, {
      loanId,
      transactionType: 'writeoff',
      transactionDate,
      amount: writeOffAmount,
      submittedOnDate: transactionDate,
      submittedByUserId: userId,
      note
    });

    // Update loan status
    await updateLoanStatus(
      client, 
      loanId, 
      'closed_written_off', 
      userId, 
      transactionDate,
      {
        written_off_on_date: transactionDate,
        written_off_by_user_id: userId,
        principal_writtenoff_derived: loan.principal_outstanding_derived,
        interest_writtenoff_derived: loan.interest_outstanding_derived,
        fee_charges_writtenoff_derived: loan.fee_charges_outstanding_derived,
        penalty_charges_writtenoff_derived: loan.penalty_charges_outstanding_derived,
        total_writtenoff_derived: writeOffAmount,
        total_outstanding_derived: 0
      }
    );

    // Return success response
    return {
      success: true,
      loanId,
      message: 'Loan written off successfully',
      transactionId,
      writeOffDate: transactionDate,
      writeOffAmount
    };
  });
}

export async function calculateLoanSchedule(input) {
  const {
    productId,
    principalAmount,
    numberOfRepayments,
    interestRatePerPeriod,
    disbursementDate,
    repaymentEvery,
    repaymentFrequencyType,
    interestType,
    amortizationType,
    termFrequency,
    termFrequencyType,
    graceOnPrincipal,
    graceOnInterest,
    graceOnInterestCharged,
    submittedOnDate
  } = input;

  logger.info('Calculating loan schedule', {
    productId,
    principalAmount,
    numberOfRepayments
  });

  try {
    // Get product details for currency
    const productQuery = await db.query(
      'SELECT currency_code FROM fineract_default.loan_product WHERE id = $1',
      [productId]
    );

    if (productQuery.rows.length === 0) {
      throw new Error('Loan product not found');
    }

    const currency = productQuery.rows[0].currency_code;

    // Create loan application terms
    const loanApplicationTerms = {
      principalAmount: principalAmount,
      currency: currency,
      loanTermFrequency: termFrequency,
      loanTermFrequencyType: termFrequencyType,
      numberOfRepayments: numberOfRepayments,
      repaymentEvery: repaymentEvery,
      repaymentFrequencyType: repaymentFrequencyType,
      interestRatePerPeriod: interestRatePerPeriod,
      interestMethod: interestType,
      amortizationMethod: amortizationType,
      expectedDisbursementDate: disbursementDate,
      submittedOnDate: submittedOnDate || new Date().toISOString().split('T')[0],
      graceOnPrincipalPayment: graceOnPrincipal || 0,
      graceOnInterestPayment: graceOnInterest || 0,
      graceOnInterestCharged: graceOnInterestCharged || 0
    };

    // Generate schedule using the calculation service
    const schedule = await loanCalculationService.generateRepaymentSchedule(loanApplicationTerms);

    // Format for compatibility with existing callers
    const periods = schedule.periods
      .filter(period => period.periodType === 'repayment')
      .map(period => ({
        periodNumber: period.periodNumber,
        fromDate: period.fromDate,
        dueDate: period.dueDate,
        principalAmount: period.principalOriginalDue,
        interestAmount: period.interestOriginalDue,
        feeAmount: period.feeChargesDue,
        penaltyAmount: period.penaltyChargesDue,
        totalDue: period.totalOriginalDueForPeriod,
        outstandingBalance: period.principalLoanBalanceOutstanding
      }));

    return {
      success: true,
      currency,
      loanTermInDays: schedule.loanTermInDays,
      periods,
      totalPrincipal: schedule.totalPrincipal,
      totalInterest: schedule.totalInterest,
      totalFees: schedule.totalFeeCharges,
      totalPenalties: schedule.totalPenaltyCharges,
      totalRepayment: schedule.totalRepaymentExpected
    };

  } catch (error) {
    logger.error('Error calculating loan schedule', { error });
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper functions
function calculateMaturityDate(disbursementDate, termFrequency, termFrequencyType) {
  const date = new Date(disbursementDate);
  
  switch (termFrequencyType) {
    case 'days':
      date.setDate(date.getDate() + termFrequency);
      break;
    case 'weeks':
      date.setDate(date.getDate() + (termFrequency * 7));
      break;
    case 'months':
      date.setMonth(date.getMonth() + termFrequency);
      break;
    default:
      throw new Error(`Unsupported term frequency type: ${termFrequencyType}`);
  }
  
  return date.toISOString().split('T')[0];
}

function calculatePaymentAllocation(loan, paymentAmount) {
  // This is a simplified allocation algorithm
  // In a real implementation, you would use the loan's repayment strategy
  
  let remainingAmount = new Decimal(paymentAmount);
  const principalOutstanding = new Decimal(loan.principal_outstanding_derived);
  const interestOutstanding = new Decimal(loan.interest_outstanding_derived);
  const feesOutstanding = new Decimal(loan.fee_charges_outstanding_derived);
  const penaltiesOutstanding = new Decimal(loan.penalty_charges_outstanding_derived);
  
  // First to penalties
  const penaltyPortion = Decimal.min(remainingAmount, penaltiesOutstanding);
  remainingAmount = remainingAmount.minus(penaltyPortion);
  
  // Then to fees
  const feePortion = Decimal.min(remainingAmount, feesOutstanding);
  remainingAmount = remainingAmount.minus(feePortion);
  
  // Then to interest
  const interestPortion = Decimal.min(remainingAmount, interestOutstanding);
  remainingAmount = remainingAmount.minus(interestPortion);
  
  // Then to principal
  const principalPortion = Decimal.min(remainingAmount, principalOutstanding);
  remainingAmount = remainingAmount.minus(principalPortion);
  
  // Anything left is overpayment
  const overpaymentPortion = remainingAmount;
  
  return {
    principalPortion: principalPortion.toNumber(),
    interestPortion: interestPortion.toNumber(),
    feePortion: feePortion.toNumber(),
    penaltyPortion: penaltyPortion.toNumber(),
    overpaymentPortion: overpaymentPortion.toNumber()
  };
}

function calculateOutstandingBalance(loan, principalPaid, interestPaid, feesPaid, penaltiesPaid) {
  const principalOutstanding = new Decimal(loan.principal_outstanding_derived).minus(principalPaid);
  const interestOutstanding = new Decimal(loan.interest_outstanding_derived).minus(interestPaid);
  const feesOutstanding = new Decimal(loan.fee_charges_outstanding_derived).minus(feesPaid);
  const penaltiesOutstanding = new Decimal(loan.penalty_charges_outstanding_derived).minus(penaltiesPaid);

  return principalOutstanding
    .plus(interestOutstanding)
    .plus(feesOutstanding)
    .plus(penaltiesOutstanding)
    .toNumber();
}

/**
 * Calculate prepayment amount for a loan
 * Uses the loan calculation service to determine the full prepayment amount
 *
 * @param input The input containing loanId and prepayment date
 * @param userId The ID of the user making the request
 * @returns Prepayment details including breakdown of payment portions
 */
export async function calculatePrepayment(input, userId) {
  const { loanId, transactionDate, paymentAmount, includeEarlyPaymentPenalty = true } = input;
  logger.info('Calculating prepayment amount', { loanId, transactionDate, userId });

  try {
    // Fetch loan details
    const loanQuery = await db.query(
      `SELECT
        l.*,
        lp.early_repayment_penalty_applicable,
        lp.early_repayment_penalty_percentage
      FROM
        fineract_default.loan l
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE
        l.id = $1`,
      [loanId]
    );

    if (loanQuery.rows.length === 0) {
      throw new Error('Loan not found');
    }

    const loan = loanQuery.rows[0];

    // Validate loan status
    if (loan.loan_status !== 'active') {
      throw new Error(`Cannot calculate prepayment for loan with status ${loan.loan_status}`);
    }

    // Calculate prepayment using the loan calculation service
    const prepayment = await loanCalculationService.calculatePrepaymentAmount(
      loan,
      transactionDate,
      paymentAmount,
      includeEarlyPaymentPenalty
    );

    return {
      success: true,
      loanId,
      prepaymentBreakdown: {
        principalPortion: prepayment.principalPortion,
        interestPortion: prepayment.interestPortion,
        feeChargesPortion: prepayment.feeChargesPortion,
        penaltyChargesPortion: prepayment.penaltyChargesPortion,
        totalPrepaymentAmount: prepayment.totalPrepaymentAmount,
        transactionDate: prepayment.transactionDate,
        additionalPrincipalRequired: prepayment.additionalPrincipalRequired || 0
      }
    };
  } catch (error) {
    logger.error('Error calculating prepayment amount', { error, loanId });
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Calculate the benefits of early repayment
 * Helps borrowers understand potential interest savings
 *
 * @param input The input containing loanId and prepayment date
 * @param userId The ID of the user making the request
 * @returns Details of potential interest savings and time savings
 */
export async function calculatePrepaymentBenefits(input, userId) {
  const { loanId, transactionDate } = input;
  logger.info('Calculating prepayment benefits', { loanId, transactionDate, userId });

  try {
    // Fetch loan details
    const loanQuery = await db.query(
      `SELECT
        l.*,
        lp.early_repayment_penalty_applicable,
        lp.early_repayment_penalty_percentage
      FROM
        fineract_default.loan l
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE
        l.id = $1`,
      [loanId]
    );

    if (loanQuery.rows.length === 0) {
      throw new Error('Loan not found');
    }

    const loan = loanQuery.rows[0];

    // Validate loan status
    if (loan.loan_status !== 'active') {
      throw new Error(`Cannot calculate prepayment benefits for loan with status ${loan.loan_status}`);
    }

    // Calculate benefits using the loan calculation service
    const benefits = await loanCalculationService.calculateEarlyRepaymentBenefits(
      loan,
      transactionDate
    );

    return {
      success: true,
      loanId,
      benefits: {
        originalLoanEndDate: benefits.originalLoanEndDate,
        proposedPrepaymentDate: benefits.proposedPrepaymentDate,
        totalScheduledInterest: benefits.totalScheduledInterest,
        interestPaidToDate: benefits.interestPaidToDate,
        remainingInterestToPay: benefits.remainingInterestToPay,
        interestSavings: benefits.interestSavings,
        daysSaved: benefits.daysSaved,
        paymentsRemaining: benefits.paymentsRemaining
      }
    };
  } catch (error) {
    logger.error('Error calculating prepayment benefits', { error, loanId });
    return {
      success: false,
      message: error.message
    };
  }
}

function generateLoanSchedule(
  principalAmount,
  numberOfRepayments,
  interestRatePerPeriod,
  disbursementDate,
  repaymentEvery,
  repaymentFrequencyType,
  interestType,
  amortizationType,
  graceOnPrincipal = 0,
  graceOnInterest = 0
) {
  // This is a simplified schedule generation
  // In a real implementation, you would need to handle more complex scenarios
  
  const principal = new Decimal(principalAmount);
  const rate = new Decimal(interestRatePerPeriod).dividedBy(100);
  const periods = [];
  
  let outstandingBalance = principal;
  let date = new Date(disbursementDate);
  
  // Calculate equal installment amount for equal installment loans
  let installmentAmount;
  if (amortizationType === 'equal_installments') {
    // PMT formula
    const effectiveRepayments = numberOfRepayments - graceOnPrincipal;
    installmentAmount = calculatePmt(rate, effectiveRepayments, principal.negated(), 0, 0);
  }
  
  for (let i = 1; i <= numberOfRepayments; i++) {
    // Calculate due date
    date = advanceDate(date, repaymentEvery, repaymentFrequencyType);
    const dueDate = date.toISOString().split('T')[0];
    
    // Calculate interest
    let interestAmount;
    if (interestType === 'declining_balance') {
      interestAmount = outstandingBalance.times(rate);
    } else if (interestType === 'flat') {
      interestAmount = principal.times(rate).dividedBy(numberOfRepayments);
    } else {
      interestAmount = new Decimal(0);
    }
    
    // Apply grace on interest
    if (i <= graceOnInterest) {
      interestAmount = new Decimal(0);
    }
    
    // Calculate principal portion
    let principalAmount;
    if (amortizationType === 'equal_installments') {
      if (i <= graceOnPrincipal) {
        principalAmount = new Decimal(0);
      } else {
        principalAmount = installmentAmount.minus(interestAmount);
      }
    } else if (amortizationType === 'equal_principal') {
      if (i <= graceOnPrincipal) {
        principalAmount = new Decimal(0);
      } else {
        principalAmount = principal.dividedBy(numberOfRepayments - graceOnPrincipal);
      }
    } else {
      principalAmount = new Decimal(0);
    }
    
    // Ensure we don't overpay
    if (principalAmount.greaterThan(outstandingBalance)) {
      principalAmount = outstandingBalance;
    }
    
    // Update outstanding balance
    outstandingBalance = outstandingBalance.minus(principalAmount);
    
    // Add period to schedule
    periods.push({
      periodNumber: i,
      fromDate: i === 1 ? disbursementDate : periods[i-2].dueDate,
      dueDate,
      principalAmount: principalAmount.toNumber(),
      interestAmount: interestAmount.toNumber(),
      feeAmount: 0,
      penaltyAmount: 0,
      totalDue: principalAmount.plus(interestAmount).toNumber(),
      outstandingBalance: outstandingBalance.toNumber()
    });
  }
  
  return periods;
}

function advanceDate(date, units, frequencyType) {
  const newDate = new Date(date);
  
  switch (frequencyType) {
    case 'days':
      newDate.setDate(newDate.getDate() + units);
      break;
    case 'weeks':
      newDate.setDate(newDate.getDate() + (units * 7));
      break;
    case 'months':
      newDate.setMonth(newDate.getMonth() + units);
      break;
    default:
      throw new Error(`Unsupported frequency type: ${frequencyType}`);
  }
  
  return newDate;
}

function calculatePmt(rate, nper, pv, fv = 0, type = 0) {
  // PMT formula: PMT = (PV * r * (1+r)^n) / ((1+r)^n - 1)
  const rateDecimal = rate;
  
  if (rateDecimal.equals(0)) {
    return pv.negated().dividedBy(nper);
  }
  
  const pvif = new Decimal(1).plus(rateDecimal).pow(nper);
  
  let pmt = rateDecimal.times(pv.times(pvif).minus(fv)).dividedBy(pvif.minus(1));
  
  if (type === 1) {
    pmt = pmt.dividedBy(new Decimal(1).plus(rateDecimal));
  }
  
  return pmt;
}

/**
 * Processes down payment for a loan
 * Can be used when down payment wasn't processed at disbursement time
 *
 * @param input The input containing loanId and payment details
 * @param userId The ID of the user making the request
 * @returns Details of the processed down payment
 */
export async function processDownPayment(input, userId) {
  const { 
    loanId, 
    transactionDate,
    paymentTypeId,
    note,
    receiptNumber,
    checkNumber, 
    routingCode,
    bankNumber,
    accountNumber
  } = input;
  logger.info('Processing down payment', { loanId, transactionDate, userId });

  return db.transaction(async (client) => {
    // Get loan details
    const loan = await getLoanById(client, loanId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // Validate loan status
    if (loan.loan_status !== 'active') {
      throw new Error(`Cannot process down payment for loan with status ${loan.loan_status}`);
    }

    // Validate down payment is enabled and not yet processed
    if (!loan.enable_down_payment) {
      throw new Error('Down payment is not enabled for this loan');
    }

    if (loan.down_payment_transaction_id) {
      throw new Error('Down payment has already been processed for this loan');
    }

    // Calculate down payment amount
    let downPaymentAmount = 0;
    if (loan.down_payment_type === DownPaymentType.FIXED_AMOUNT) {
      downPaymentAmount = loan.down_payment_amount;
    } else if (loan.down_payment_type === DownPaymentType.PERCENTAGE) {
      downPaymentAmount = (loan.down_payment_percentage / 100) * loan.principal_amount;
      // Round to 2 decimal places
      downPaymentAmount = Math.round(downPaymentAmount * 100) / 100;
    } else {
      throw new Error(`Invalid down payment type: ${loan.down_payment_type}`);
    }

    if (downPaymentAmount <= 0) {
      throw new Error('Down payment amount must be greater than zero');
    }

    // Create payment details if provided
    let paymentDetailId = null;
    if (paymentTypeId) {
      paymentDetailId = await createPaymentDetail(client, {
        paymentTypeId,
        accountNumber,
        checkNumber,
        routingCode,
        receiptNumber,
        bankNumber
      });
    }

    // Create down payment transaction
    const transactionId = await createLoanTransaction(client, {
      loanId,
      paymentDetailId,
      transactionType: LoanTransactionType.DOWN_PAYMENT,
      transactionDate: transactionDate || new Date().toISOString().split('T')[0],
      amount: downPaymentAmount,
      principalPortion: downPaymentAmount, // All principal for down payment
      interestPortion: 0,
      feeChargesPortion: 0,
      penaltyChargesPortion: 0,
      submittedOnDate: transactionDate || new Date().toISOString().split('T')[0],
      submittedByUserId: userId,
      note: note || 'Down payment processed'
    });

    // Update loan balances
    const principalOutstanding = new Decimal(loan.principal_outstanding_derived).minus(downPaymentAmount).toNumber();
    await updateLoanBalances(client, loanId, {
      principalPaid: downPaymentAmount,
      interestPaid: 0,
      feesPaid: 0,
      penaltiesPaid: 0,
      outstandingBalance: principalOutstanding
    });

    // Update loan with down payment transaction ID
    await client.query(
      'UPDATE fineract_default.loan SET down_payment_transaction_id = $1 WHERE id = $2',
      [transactionId, loanId]
    );

    // Return success response
    return {
      success: true,
      loanId,
      message: 'Down payment processed successfully',
      transactionId,
      transactionDate: transactionDate || new Date().toISOString().split('T')[0],
      downPaymentAmount,
      outstandingBalance: principalOutstanding
    };
  });
}