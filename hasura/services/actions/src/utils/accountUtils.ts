/**
 * Account utilities for Fineract
 */

/**
 * Generate a unique account number with a given prefix
 * @param prefix Account number prefix (e.g., 'SA', 'FD', 'RD', etc.)
 * @returns Unique account number
 */
export function generateAccountNumber(prefix: string): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

/**
 * Calculate maturity amount using compound interest
 * @param principal Principal amount
 * @param annualInterestRate Annual interest rate (as a percentage)
 * @param termInYears Term in years
 * @param compoundingFrequency Number of times interest is compounded per year
 * @returns Maturity amount
 */
export function calculateMaturityAmount(
  principal: number,
  annualInterestRate: number,
  termInYears: number,
  compoundingFrequency: number
): number {
  // Convert interest rate from percentage to decimal
  const interestRate = annualInterestRate / 100;
  
  // Calculate using the compound interest formula: A = P(1 + r/n)^(nt)
  // where:
  // A = maturity amount
  // P = principal
  // r = annual interest rate (decimal)
  // n = compounding frequency per year
  // t = time in years
  
  const maturityAmount = principal * Math.pow(1 + (interestRate / compoundingFrequency), compoundingFrequency * termInYears);
  
  // Round to 2 decimal places
  return Math.round(maturityAmount * 100) / 100;
}

/**
 * Calculate term in years from period and frequency type
 * @param period Time period
 * @param frequencyType Frequency type ('days', 'weeks', 'months', 'years')
 * @returns Equivalent term in years
 */
export function calculateTermInYears(period: number, frequencyType: string): number {
  switch (frequencyType) {
    case 'days':
      return period / 365;
    case 'weeks':
      return (period * 7) / 365;
    case 'months':
      return period / 12;
    case 'years':
      return period;
    default:
      throw new Error(`Unsupported frequency type: ${frequencyType}`);
  }
}

/**
 * Get compounding frequency per year based on compounding period type
 * @param compoundingPeriodType Interest compounding period type
 * @returns Number of times interest is compounded per year
 */
export function getCompoundingFrequency(compoundingPeriodType: string): number {
  switch (compoundingPeriodType) {
    case 'daily':
      return 365;
    case 'weekly':
      return 52;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'semi_annual':
      return 2;
    case 'annual':
      return 1;
    default:
      return 1; // Default to annual compounding
  }
}

/**
 * Calculate future date based on period and frequency type
 * @param startDate Starting date
 * @param period Time period
 * @param frequencyType Frequency type ('days', 'weeks', 'months', 'years')
 * @returns Future date
 */
export function calculateFutureDate(startDate: Date, period: number, frequencyType: string): Date {
  const result = new Date(startDate);
  
  switch (frequencyType) {
    case 'days':
      result.setDate(result.getDate() + period);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (period * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + period);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + period);
      break;
    default:
      throw new Error(`Unsupported frequency type: ${frequencyType}`);
  }
  
  return result;
}