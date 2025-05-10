import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { getLoanById, updateLoanStatus, createLoanTransaction, createPaymentDetail, updateLoanBalances } from '../repositories/loanRepository';

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
    graceOnInterest
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
    
    // Generate schedule periods
    const periods = generateLoanSchedule(
      principalAmount,
      numberOfRepayments,
      interestRatePerPeriod,
      disbursementDate,
      repaymentEvery,
      repaymentFrequencyType,
      interestType,
      amortizationType,
      graceOnPrincipal,
      graceOnInterest
    );
    
    // Calculate totals
    const totalPrincipal = periods.reduce((sum, period) => sum + period.principalAmount, 0);
    const totalInterest = periods.reduce((sum, period) => sum + period.interestAmount, 0);
    const totalFees = periods.reduce((sum, period) => sum + period.feeAmount, 0);
    const totalRepayment = totalPrincipal + totalInterest + totalFees;
    
    return {
      success: true,
      currency,
      periods,
      totalPrincipal,
      totalInterest,
      totalFees,
      totalRepayment
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