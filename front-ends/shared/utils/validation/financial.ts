/**
 * Validate if a value is a positive number (greater than 0)
 * @param value Value to validate
 * @returns True if value is a positive number
 */
export function isPositiveNumber(value: any): boolean {
  if (value === null || value === undefined) return false;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  return !isNaN(num) && num > 0 && typeof num === 'number';
}

/**
 * Validate if a value is a non-negative number (greater than or equal to 0)
 * @param value Value to validate
 * @returns True if value is a non-negative number
 */
export function isNonNegativeNumber(value: any): boolean {
  if (value === null || value === undefined) return false;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  return !isNaN(num) && num >= 0 && typeof num === 'number';
}

/**
 * Validate if a number is within budget/limit
 * @param amount Amount to check
 * @param limit Maximum allowed amount
 * @returns True if amount is within limit
 */
export function isWithinBudget(amount: number, limit: number): boolean {
  return isPositiveNumber(amount) && isPositiveNumber(limit) && amount <= limit;
}

/**
 * Validate if an interest rate is within reasonable range
 * @param rate Interest rate to validate
 * @param maxRate Maximum allowed rate (default: 100)
 * @returns True if rate is valid and within range
 */
export function isValidInterestRate(rate: any, maxRate: number = 100): boolean {
  if (rate === null || rate === undefined) return false;
  
  const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  
  return !isNaN(numRate) && numRate >= 0 && numRate <= maxRate;
}

/**
 * Validate a loan term in months
 * @param term Term in months
 * @param minTerm Minimum allowed term (default: 1)
 * @param maxTerm Maximum allowed term (default: 360)
 * @returns True if term is valid and within range
 */
export function isValidLoanTerm(term: any, minTerm: number = 1, maxTerm: number = 360): boolean {
  if (term === null || term === undefined) return false;
  
  const numTerm = typeof term === 'string' ? parseInt(term, 10) : term;
  
  return !isNaN(numTerm) && Number.isInteger(numTerm) && numTerm >= minTerm && numTerm <= maxTerm;
}

/**
 * Validate if a payment amount is sufficient to cover the required amount
 * @param paymentAmount Amount being paid
 * @param requiredAmount Required payment amount
 * @param allowPartial Allow partial payments (default: true)
 * @returns True if payment is valid
 */
export function isValidPaymentAmount(paymentAmount: number, requiredAmount: number, allowPartial: boolean = true): boolean {
  if (!isPositiveNumber(paymentAmount) || !isPositiveNumber(requiredAmount)) {
    return false;
  }
  
  return allowPartial ? paymentAmount <= requiredAmount : paymentAmount === requiredAmount;
}

/**
 * Validate loan-to-value ratio is within acceptable limits
 * @param loanAmount Loan amount
 * @param assetValue Asset/collateral value
 * @param maxLTV Maximum allowed LTV ratio (default: 0.8 or 80%)
 * @returns True if LTV is acceptable
 */
export function isValidLTV(loanAmount: number, assetValue: number, maxLTV: number = 0.8): boolean {
  if (!isPositiveNumber(loanAmount) || !isPositiveNumber(assetValue)) {
    return false;
  }
  
  const ltv = loanAmount / assetValue;
  return ltv <= maxLTV;
}

/**
 * Validate debt-to-income ratio is within acceptable limits
 * @param totalMonthlyDebt Total monthly debt payments
 * @param grossMonthlyIncome Gross monthly income
 * @param maxDTI Maximum allowed DTI ratio (default: 0.43 or 43%)
 * @returns True if DTI is acceptable
 */
export function isValidDTI(totalMonthlyDebt: number, grossMonthlyIncome: number, maxDTI: number = 0.43): boolean {
  if (!isPositiveNumber(totalMonthlyDebt) || !isPositiveNumber(grossMonthlyIncome)) {
    return false;
  }
  
  const dti = totalMonthlyDebt / grossMonthlyIncome;
  return dti <= maxDTI;
}