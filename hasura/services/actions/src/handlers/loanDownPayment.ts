import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { disburseLoan, processDownPayment, calculateLoanSchedule } from '../services/loanService';
import { validateSchema } from '../utils/validator';
import { LoanCalculationService } from '../services/loanCalculationService';

// Schema for down payment processing
const processDownPaymentSchema = {
  type: 'object',
  required: ['loanId'],
  properties: {
    loanId: { type: 'string' },
    transactionDate: { type: 'string', format: 'date' },
    paymentTypeId: { type: 'string' },
    note: { type: 'string' },
    receiptNumber: { type: 'string' },
    checkNumber: { type: 'string' },
    routingCode: { type: 'string' },
    bankNumber: { type: 'string' },
    accountNumber: { type: 'string' }
  }
};

// Schema for loan schedule calculation with down payment
const calculateLoanScheduleWithDownPaymentSchema = {
  type: 'object',
  required: ['productId', 'principalAmount', 'numberOfRepayments', 'interestRatePerPeriod',
    'disbursementDate', 'repaymentEvery', 'repaymentFrequencyType',
    'interestType', 'amortizationType', 'termFrequency', 'termFrequencyType',
    'enableDownPayment', 'downPaymentType'],
  properties: {
    productId: { type: 'string' },
    principalAmount: { type: 'number', minimum: 0 },
    numberOfRepayments: { type: 'integer', minimum: 1 },
    interestRatePerPeriod: { type: 'number', minimum: 0 },
    disbursementDate: { type: 'string', format: 'date' },
    repaymentEvery: { type: 'integer', minimum: 1 },
    repaymentFrequencyType: { type: 'string', enum: ['days', 'weeks', 'months', 'years'] },
    interestType: { type: 'string', enum: ['flat', 'declining_balance', 'compound'] },
    amortizationType: { type: 'string', enum: ['equal_installments', 'equal_principal'] },
    termFrequency: { type: 'integer', minimum: 1 },
    termFrequencyType: { type: 'string', enum: ['days', 'weeks', 'months', 'years'] },
    graceOnPrincipal: { type: 'integer', minimum: 0 },
    graceOnInterest: { type: 'integer', minimum: 0 },
    graceOnInterestCharged: { type: 'integer', minimum: 0 },
    submittedOnDate: { type: 'string', format: 'date' },
    enableDownPayment: { type: 'boolean' },
    downPaymentType: { type: 'string', enum: ['fixed_amount', 'percentage'] },
    downPaymentAmount: { type: 'number' },
    downPaymentPercentage: { type: 'number', minimum: 0, maximum: 100 }
  },
  dependencies: {
    downPaymentType: {
      oneOf: [
        {
          properties: {
            downPaymentType: { enum: ['fixed_amount'] },
            downPaymentAmount: { type: 'number', minimum: 0 }
          },
          required: ['downPaymentAmount']
        },
        {
          properties: {
            downPaymentType: { enum: ['percentage'] },
            downPaymentPercentage: { type: 'number', minimum: 0, maximum: 100 }
          },
          required: ['downPaymentPercentage']
        }
      ]
    }
  }
};

// Schema for disbursement with down payment
const disburseLoanWithDownPaymentSchema = {
  type: 'object',
  required: ['loanId', 'disbursementDate'],
  properties: {
    loanId: { type: 'string' },
    disbursementDate: { type: 'string', format: 'date' },
    paymentTypeId: { type: 'string' },
    transactionAmount: { type: 'number' },
    note: { type: 'string' },
    receiptNumber: { type: 'string' },
    checkNumber: { type: 'string' },
    routingCode: { type: 'string' },
    bankNumber: { type: 'string' },
    accountNumber: { type: 'string' },
    processDownPayment: { type: 'boolean' }
  }
};

/**
 * Handler for calculating loan schedule with down payment
 */
export async function handleCalculateLoanScheduleWithDownPayment(req: Request, res: Response) {
  try {
    logger.info('Calculate loan schedule with down payment request received', {
      body: req.body,
      user: req.user?.id
    });

    // Validate the request
    const { error, value } = validateSchema(calculateLoanScheduleWithDownPaymentSchema, req.body.input);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid request: ${error.message}`
      });
    }

    // Calculate loan schedule
    const result = await calculateLoanSchedule(value);
    
    return res.json({
      ...result
    });
  } catch (error) {
    logger.error('Error calculating loan schedule with down payment', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Handler for disbursing a loan with down payment
 */
export async function handleDisburseLoanWithDownPayment(req: Request, res: Response) {
  try {
    logger.info('Disburse loan with down payment request received', {
      body: req.body,
      user: req.user?.id
    });

    // Validate the request
    const { error, value } = validateSchema(disburseLoanWithDownPaymentSchema, req.body.input);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid request: ${error.message}`
      });
    }

    // Disburse the loan with down payment
    const result = await disburseLoan(value, req.user?.id);
    
    return res.json({
      ...result
    });
  } catch (error) {
    logger.error('Error disbursing loan with down payment', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Handler for processing down payment for a loan that's already disbursed
 */
export async function handleProcessDownPayment(req: Request, res: Response) {
  try {
    logger.info('Process down payment request received', {
      body: req.body,
      user: req.user?.id
    });

    // Validate the request
    const { error, value } = validateSchema(processDownPaymentSchema, req.body.input);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid request: ${error.message}`
      });
    }

    // Process the down payment
    const result = await processDownPayment(value, req.user?.id);
    
    return res.json({
      ...result
    });
  } catch (error) {
    logger.error('Error processing down payment', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Handler for calculating down payment details from loan terms
 */
export async function handleCalculateDownPayment(req: Request, res: Response) {
  try {
    logger.info('Calculate down payment request received', {
      body: req.body,
      user: req.user?.id
    });

    const { loanApplicationTerms } = req.body.input;
    
    // Validate the loan application terms contain required down payment fields
    if (!loanApplicationTerms.enableDownPayment) {
      return res.status(400).json({
        success: false,
        message: 'Down payment is not enabled in the provided loan terms'
      });
    }

    // Create the loan calculation service instance
    const loanCalculationService = new LoanCalculationService();
    
    // Calculate down payment
    const downPaymentDetails = loanCalculationService.calculateDownPayment(loanApplicationTerms);
    
    if (!downPaymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Failed to calculate down payment, please check loan terms'
      });
    }
    
    return res.json({
      success: true,
      downPaymentDetails
    });
  } catch (error) {
    logger.error('Error calculating down payment', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}