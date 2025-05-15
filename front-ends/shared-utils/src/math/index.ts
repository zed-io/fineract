import { Decimal } from 'decimal.js';

/**
 * Precision settings for financial calculations
 */
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Rounding modes for financial calculations
 */
export enum RoundingMode {
  /**
   * Round towards nearest neighbor. If equidistant, round up.
   */
  HALF_UP = Decimal.ROUND_HALF_UP,
  /**
   * Round towards nearest neighbor. If equidistant, round down.
   */
  HALF_DOWN = Decimal.ROUND_HALF_DOWN,
  /**
   * Round towards nearest neighbor. If equidistant, round towards even neighbor.
   */
  HALF_EVEN = Decimal.ROUND_HALF_EVEN,
  /**
   * Round towards zero.
   */
  DOWN = Decimal.ROUND_DOWN,
  /**
   * Round away from zero.
   */
  UP = Decimal.ROUND_UP,
  /**
   * Round towards -Infinity.
   */
  FLOOR = Decimal.ROUND_FLOOR,
  /**
   * Round towards +Infinity.
   */
  CEILING = Decimal.ROUND_CEIL
}

/**
 * Round a number to a specified number of decimal places
 * 
 * @param value The value to round
 * @param decimalPlaces The number of decimal places to round to
 * @param mode The rounding mode to use
 * @returns The rounded value
 * 
 * @example
 * ```ts
 * round(1.2345, 2); // 1.23
 * round(1.2345, 2, RoundingMode.UP); // 1.24
 * round(1.2345, 2, RoundingMode.CEILING); // 1.24
 * ```
 */
export function round(
  value: number | string | Decimal,
  decimalPlaces: number,
  mode: RoundingMode = RoundingMode.HALF_UP
): Decimal {
  const original = new Decimal(value);
  
  // Store the current rounding mode
  const originalRounding = Decimal.rounding;
  try {
    // Set the desired rounding mode
    Decimal.rounding = mode;
    return original.toDecimalPlaces(decimalPlaces);
  } finally {
    // Restore the original rounding mode
    Decimal.rounding = originalRounding;
  }
}

/**
 * Calculate simple interest
 * 
 * @param principal The principal amount
 * @param rate The interest rate (decimal form, e.g. 0.05 for 5%)
 * @param time The time period (in same units as rate, e.g. years)
 * @returns The interest amount
 * 
 * @example
 * ```ts
 * calculateSimpleInterest(1000, 0.05, 1); // 50 (1000 * 0.05 * 1)
 * calculateSimpleInterest(1000, 0.05, 2); // 100 (1000 * 0.05 * 2)
 * ```
 */
export function calculateSimpleInterest(
  principal: number | string | Decimal,
  rate: number | string | Decimal,
  time: number | string | Decimal
): Decimal {
  const p = new Decimal(principal);
  const r = new Decimal(rate);
  const t = new Decimal(time);
  
  return p.times(r).times(t);
}

/**
 * Calculate compound interest
 * 
 * @param principal The principal amount
 * @param rate The interest rate per period (decimal form, e.g. 0.05 for 5%)
 * @param time The number of periods
 * @param compoundingPeriodsPerTime The number of compounding periods per time period
 * @returns The total amount after compound interest
 * 
 * @example
 * ```ts
 * calculateCompoundInterest(1000, 0.05, 1, 1); // 1050 (annual compounding)
 * calculateCompoundInterest(1000, 0.05, 1, 12); // 1051.16... (monthly compounding)
 * ```
 */
export function calculateCompoundInterest(
  principal: number | string | Decimal,
  rate: number | string | Decimal,
  time: number | string | Decimal,
  compoundingPeriodsPerTime: number | string | Decimal = 1
): Decimal {
  const p = new Decimal(principal);
  const r = new Decimal(rate);
  const t = new Decimal(time);
  const n = new Decimal(compoundingPeriodsPerTime);
  
  const ratePerPeriod = r.dividedBy(n);
  const totalPeriods = n.times(t);
  
  // Calculate (1 + r/n)^(n*t)
  const base = Decimal.ONE.plus(ratePerPeriod);
  const exponent = base.pow(totalPeriods);
  
  // Calculate P * (1 + r/n)^(n*t)
  return p.times(exponent);
}

/**
 * Calculate the present value of a future amount
 * 
 * @param futureValue The future value
 * @param rate The discount rate per period (decimal form, e.g. 0.05 for 5%)
 * @param periods The number of periods
 * @returns The present value
 * 
 * @example
 * ```ts
 * calculatePresentValue(1050, 0.05, 1); // 1000
 * calculatePresentValue(1102.5, 0.05, 2); // 1000
 * ```
 */
export function calculatePresentValue(
  futureValue: number | string | Decimal,
  rate: number | string | Decimal,
  periods: number | string | Decimal
): Decimal {
  const fv = new Decimal(futureValue);
  const r = new Decimal(rate);
  const n = new Decimal(periods);
  
  // Calculate (1 + r)^n
  const base = Decimal.ONE.plus(r);
  const discount = base.pow(n);
  
  // Calculate FV / (1 + r)^n
  return fv.dividedBy(discount);
}

/**
 * Calculate the internal rate of return (IRR) for a series of cash flows
 * 
 * @param cashFlows Array of cash flows (negative for outflows, positive for inflows)
 * @param guess Initial guess for IRR (decimal form, e.g. 0.1 for 10%)
 * @param maxIterations Maximum number of iterations for the calculation
 * @param tolerance Tolerance for convergence
 * @returns The internal rate of return
 * 
 * @example
 * ```ts
 * calculateIRR([-1000, 300, 400, 500]); // ~0.147 (or about 14.7%)
 * ```
 */
export function calculateIRR(
  cashFlows: Array<number | string | Decimal>,
  guess: number | string | Decimal = 0.1,
  maxIterations: number = 100,
  tolerance: number = 1e-10
): Decimal {
  const decimalCashFlows = cashFlows.map(cf => new Decimal(cf));
  let rate = new Decimal(guess);
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(decimalCashFlows, rate);
    if (npv.abs().lessThan(tolerance)) {
      return rate;
    }
    
    // Calculate the derivative of NPV with respect to the rate
    const npvDerivative = decimalCashFlows.reduce((sum, cf, t) => {
      if (t === 0) return sum;
      const denominator = Decimal.ONE.plus(rate).pow(t);
      return sum.minus(new Decimal(t).times(cf).dividedBy(denominator));
    }, new Decimal(0));
    
    // Newton-Raphson step
    const newRate = rate.minus(npv.dividedBy(npvDerivative));
    
    // Break if the rate doesn't change significantly
    if (newRate.minus(rate).abs().lessThan(tolerance)) {
      return newRate;
    }
    
    rate = newRate;
  }
  
  throw new Error('IRR calculation did not converge');
}

/**
 * Calculate the net present value (NPV) of a series of cash flows
 * 
 * @param cashFlows Array of cash flows (negative for outflows, positive for inflows)
 * @param rate The discount rate per period (decimal form, e.g. 0.05 for 5%)
 * @returns The net present value
 * 
 * @example
 * ```ts
 * calculateNPV([-1000, 300, 400, 500], 0.1); // ~81.43
 * ```
 */
export function calculateNPV(
  cashFlows: Array<number | string | Decimal>,
  rate: number | string | Decimal
): Decimal {
  const r = new Decimal(rate);
  const ONE_PLUS_RATE = Decimal.ONE.plus(r);
  
  return cashFlows.reduce((npv, cf, t) => {
    const dcf = new Decimal(cf);
    const denominator = ONE_PLUS_RATE.pow(t);
    return npv.plus(dcf.dividedBy(denominator));
  }, new Decimal(0));
}

/**
 * Calculate the payment for a loan or annuity
 * 
 * @param principal The principal amount
 * @param rate The interest rate per period (decimal form, e.g. 0.05 for 5%)
 * @param periods The number of payment periods
 * @returns The payment amount per period
 * 
 * @example
 * ```ts
 * calculatePayment(1000, 0.05, 12); // ~85.61
 * ```
 */
export function calculatePayment(
  principal: number | string | Decimal,
  rate: number | string | Decimal,
  periods: number | string | Decimal
): Decimal {
  const p = new Decimal(principal);
  const r = new Decimal(rate);
  const n = new Decimal(periods);
  
  // If the rate is 0, return the principal divided by the number of periods
  if (r.isZero()) {
    return p.dividedBy(n);
  }
  
  // Calculate (1 + r)^n
  const base = Decimal.ONE.plus(r);
  const factor = base.pow(n);
  
  // Calculate P * r * (1 + r)^n / ((1 + r)^n - 1)
  const numerator = p.times(r).times(factor);
  const denominator = factor.minus(Decimal.ONE);
  
  return numerator.dividedBy(denominator);
}

/**
 * Calculate the remaining balance of a loan after a number of payments
 * 
 * @param principal The principal amount
 * @param rate The interest rate per period (decimal form, e.g. 0.05 for 5%)
 * @param periods The total number of payment periods
 * @param paymentsMade The number of payments already made
 * @returns The remaining balance
 * 
 * @example
 * ```ts
 * calculateRemainingBalance(1000, 0.05, 12, 6); // ~519.98
 * ```
 */
export function calculateRemainingBalance(
  principal: number | string | Decimal,
  rate: number | string | Decimal,
  periods: number | string | Decimal,
  paymentsMade: number | string | Decimal
): Decimal {
  const p = new Decimal(principal);
  const r = new Decimal(rate);
  const n = new Decimal(periods);
  const m = new Decimal(paymentsMade);
  
  // If all payments have been made, return 0
  if (m.greaterThanOrEqualTo(n)) {
    return new Decimal(0);
  }
  
  // If the rate is 0, return the principal minus the payments made
  if (r.isZero()) {
    return p.times(n.minus(m)).dividedBy(n);
  }
  
  // Calculate the payment amount
  const payment = calculatePayment(p, r, n);
  
  // Calculate (1 + r)^(n - m)
  const base = Decimal.ONE.plus(r);
  const remainingPeriods = n.minus(m);
  const factor = base.pow(remainingPeriods);
  
  // Calculate payment * ((1 + r)^(n - m) - 1) / r
  const numerator = payment.times(factor.minus(Decimal.ONE));
  const denominator = r;
  
  return numerator.dividedBy(denominator);
}

/**
 * Calculate the effective annual rate
 * 
 * @param nominalRate The nominal rate (decimal form, e.g. 0.05 for 5%)
 * @param compoundingPeriodsPerYear The number of compounding periods per year
 * @returns The effective annual rate
 * 
 * @example
 * ```ts
 * calculateEffectiveRate(0.05, 12); // ~0.0512 (5.12%)
 * ```
 */
export function calculateEffectiveRate(
  nominalRate: number | string | Decimal,
  compoundingPeriodsPerYear: number | string | Decimal
): Decimal {
  const r = new Decimal(nominalRate);
  const m = new Decimal(compoundingPeriodsPerYear);
  
  // Calculate (1 + r/m)^m - 1
  const ratePerPeriod = r.dividedBy(m);
  const base = Decimal.ONE.plus(ratePerPeriod);
  
  return base.pow(m).minus(Decimal.ONE);
}

/**
 * Calculate the future value of an investment
 * 
 * @param principal The principal amount
 * @param rate The interest rate per period (decimal form, e.g. 0.05 for 5%)
 * @param periods The number of periods
 * @returns The future value
 * 
 * @example
 * ```ts
 * calculateFutureValue(1000, 0.05, 5); // ~1276.28
 * ```
 */
export function calculateFutureValue(
  principal: number | string | Decimal,
  rate: number | string | Decimal,
  periods: number | string | Decimal
): Decimal {
  const p = new Decimal(principal);
  const r = new Decimal(rate);
  const n = new Decimal(periods);
  
  // Calculate (1 + r)^n
  const base = Decimal.ONE.plus(r);
  const factor = base.pow(n);
  
  // Calculate P * (1 + r)^n
  return p.times(factor);
}

/**
 * Calculate the future value of an annuity
 * 
 * @param payment The payment amount per period
 * @param rate The interest rate per period (decimal form, e.g. 0.05 for 5%)
 * @param periods The number of periods
 * @returns The future value
 * 
 * @example
 * ```ts
 * calculateAnnuityFutureValue(100, 0.05, 12); // ~1300.95
 * ```
 */
export function calculateAnnuityFutureValue(
  payment: number | string | Decimal,
  rate: number | string | Decimal,
  periods: number | string | Decimal
): Decimal {
  const pmt = new Decimal(payment);
  const r = new Decimal(rate);
  const n = new Decimal(periods);
  
  // If the rate is 0, return the payment times the number of periods
  if (r.isZero()) {
    return pmt.times(n);
  }
  
  // Calculate ((1 + r)^n - 1) / r
  const base = Decimal.ONE.plus(r);
  const factor = base.pow(n).minus(Decimal.ONE);
  const term = factor.dividedBy(r);
  
  // Calculate pmt * ((1 + r)^n - 1) / r
  return pmt.times(term);
}

export { Decimal } from 'decimal.js';