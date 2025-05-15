/**
 * Calculate loan EMI (Equated Monthly Installment)
 * @param principal Loan principal amount
 * @param interestRate Annual interest rate in percentage
 * @param termInMonths Loan term in months
 * @returns Monthly payment amount
 */
export function calculateEMI(principal: number, interestRate: number, termInMonths: number): number {
  // Convert annual interest rate to monthly and decimal form
  const monthlyInterestRate = interestRate / 12 / 100;
  
  // Calculate EMI using the formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
  if (monthlyInterestRate === 0) {
    return principal / termInMonths;
  }
  
  const emi =
    (principal *
      monthlyInterestRate *
      Math.pow(1 + monthlyInterestRate, termInMonths)) /
    (Math.pow(1 + monthlyInterestRate, termInMonths) - 1);
  
  return parseFloat(emi.toFixed(2));
}

/**
 * Calculate compound interest
 * @param principal Principal amount
 * @param rate Annual interest rate in percentage
 * @param time Time period in years
 * @param frequency Compounding frequency per year (default: 1 for annual)
 * @returns Amount after compound interest
 */
export function calculateCompoundInterest(principal: number, rate: number, time: number, frequency: number = 1): number {
  // Convert annual rate to decimal
  const decimalRate = rate / 100;
  
  // Calculate compound interest: A = P(1 + r/n)^(nt)
  const amount = principal * Math.pow(1 + decimalRate / frequency, frequency * time);
  
  return parseFloat(amount.toFixed(2));
}

/**
 * Calculate loan amortization schedule
 * @param principal Loan principal amount
 * @param interestRate Annual interest rate in percentage
 * @param termInMonths Loan term in months
 * @returns Array of payment periods with principal, interest and balance details
 */
export function calculateAmortizationSchedule(principal: number, interestRate: number, termInMonths: number): Array<{
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> {
  const monthlyInterestRate = interestRate / 12 / 100;
  const monthlyPayment = calculateEMI(principal, interestRate, termInMonths);
  let balance = principal;
  const schedule = [];
  
  for (let period = 1; period <= termInMonths; period++) {
    const interestForMonth = balance * monthlyInterestRate;
    const principalForMonth = monthlyPayment - interestForMonth;
    balance -= principalForMonth;
    
    // Adjust final payment to handle floating-point precision issues
    if (period === termInMonths) {
      balance = 0;
    }
    
    schedule.push({
      period,
      payment: parseFloat(monthlyPayment.toFixed(2)),
      principal: parseFloat(principalForMonth.toFixed(2)),
      interest: parseFloat(interestForMonth.toFixed(2)),
      balance: parseFloat(balance.toFixed(2))
    });
  }
  
  return schedule;
}

/**
 * Convert currency amount from one currency to another
 * @param amount Amount to convert
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @param exchangeRate Exchange rate (amount of toCurrency per unit of fromCurrency)
 * @returns Converted amount
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string, exchangeRate: number): number {
  if (fromCurrency === toCurrency) return amount;
  
  return parseFloat((amount * exchangeRate).toFixed(2));
}