/**
 * Custom error types for Money operations
 */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export class CurrencyMismatchError extends MoneyError {
  constructor(baseCurrency: string, otherCurrency: string) {
    super(`Currency mismatch: ${baseCurrency} vs ${otherCurrency}`);
    this.name = 'CurrencyMismatchError';
  }
}

export class DivisionByZeroError extends MoneyError {
  constructor() {
    super('Cannot divide by zero');
    this.name = 'DivisionByZeroError';
  }
}

export class InvalidCurrencyError extends MoneyError {
  constructor(invalidCurrency: string) {
    super(`Invalid currency code: ${invalidCurrency}`);
    this.name = 'InvalidCurrencyError';
  }
}

/**
 * Currency code validation
 */
export const isValidCurrencyCode = (code: string): boolean => {
  // ISO 4217 currency codes are 3 letters
  return /^[A-Z]{3}$/.test(code);
};

/**
 * Supported decimal precisions by currency
 * Default is 2 decimal places (cents)
 */
export const CURRENCY_PRECISION: Record<string, number> = {
  'BHD': 3, // Bahraini Dinar
  'IQD': 3, // Iraqi Dinar
  'JOD': 3, // Jordanian Dinar
  'KWD': 3, // Kuwaiti Dinar
  'LYD': 3, // Libyan Dinar
  'OMR': 3, // Omani Rial
  'TND': 3, // Tunisian Dinar
  'JPY': 0, // Japanese Yen
  'KRW': 0, // Korean Won
  'HUF': 0, // Hungarian Forint
  'ISK': 0, // Icelandic Króna
};

/**
 * Money class for handling monetary calculations with precision and currency.
 * Based on the Java Money class in Fineract.
 */
export class Money {
  private readonly amount: number;
  private readonly currency: string;
  private readonly precision: number;
  
  /**
   * Constructor for Money
   * @param currency The currency code (e.g., 'USD', 'EUR')
   * @param amount The monetary amount
   * @throws {InvalidCurrencyError} If currency code is invalid
   */
  constructor(currency: string, amount: number) {
    if (!isValidCurrencyCode(currency)) {
      throw new InvalidCurrencyError(currency);
    }
    
    this.currency = currency;
    this.precision = CURRENCY_PRECISION[currency] !== undefined 
      ? CURRENCY_PRECISION[currency] 
      : 2;
    this.amount = this.roundToPrecision(amount, this.precision);
  }
  
  /**
   * Creates a Money object with zero amount
   * @param currency The currency code
   * @returns A Money object with zero amount
   * @throws {InvalidCurrencyError} If currency code is invalid
   */
  static zero(currency: string): Money {
    return new Money(currency, 0);
  }
  
  /**
   * Creates a Money object
   * @param currency The currency code
   * @param amount The monetary amount
   * @returns A Money object
   * @throws {InvalidCurrencyError} If currency code is invalid
   */
  static of(currency: string, amount: number): Money {
    return new Money(currency, amount);
  }
  
  /**
   * Parse a Money object from a string representation
   * @param moneyString String in format "USD 10.00"
   * @returns A Money object
   * @throws {MoneyError} If string format is invalid
   * @throws {InvalidCurrencyError} If currency code is invalid
   */
  static fromString(moneyString: string): Money {
    const parts = moneyString.trim().split(' ');
    if (parts.length !== 2) {
      throw new MoneyError(`Invalid money string format: ${moneyString}`);
    }
    
    const [currency, amountStr] = parts;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount)) {
      throw new MoneyError(`Invalid amount: ${amountStr}`);
    }
    
    return new Money(currency, amount);
  }
  
  /**
   * Get the amount
   * @returns The monetary amount
   */
  getAmount(): number {
    return this.amount;
  }
  
  /**
   * Get the currency
   * @returns The currency code
   */
  getCurrency(): string {
    return this.currency;
  }
  
  /**
   * Get the precision used for this currency
   * @returns The number of decimal places
   */
  getPrecision(): number {
    return this.precision;
  }
  
  /**
   * Add another Money object to this one
   * @param money The Money object to add
   * @returns A new Money object with the sum
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  plus(money: Money): Money {
    this.validateSameCurrency(money);
    return new Money(this.currency, this.amount + money.getAmount());
  }
  
  /**
   * Subtract another Money object from this one
   * @param money The Money object to subtract
   * @returns A new Money object with the difference
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  minus(money: Money): Money {
    this.validateSameCurrency(money);
    return new Money(this.currency, this.amount - money.getAmount());
  }
  
  /**
   * Multiply the amount by a factor
   * @param factor The factor to multiply by
   * @returns A new Money object with the product
   */
  multipliedBy(factor: number): Money {
    return new Money(this.currency, this.amount * factor);
  }
  
  /**
   * Divide the amount by a divisor
   * @param divisor The divisor to divide by
   * @returns A new Money object with the quotient
   * @throws {DivisionByZeroError} If divisor is zero
   */
  dividedBy(divisor: number): Money {
    if (divisor === 0) {
      throw new DivisionByZeroError();
    }
    return new Money(this.currency, this.amount / divisor);
  }
  
  /**
   * Check if this Money is equal to another Money object
   * @param money The Money object to compare with
   * @returns true if equal, false otherwise
   */
  isEqualTo(money: Money): boolean {
    if (!this.isSameCurrency(money)) {
      return false;
    }
    return this.amount === money.getAmount();
  }
  
  /**
   * Check if this Money is greater than another Money object
   * @param money The Money object to compare with
   * @returns true if greater, false otherwise
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  isGreaterThan(money: Money): boolean {
    this.validateSameCurrency(money);
    return this.amount > money.getAmount();
  }
  
  /**
   * Check if this Money is greater than or equal to another Money object
   * @param money The Money object to compare with
   * @returns true if greater or equal, false otherwise
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  isGreaterThanOrEqualTo(money: Money): boolean {
    this.validateSameCurrency(money);
    return this.amount >= money.getAmount();
  }
  
  /**
   * Check if this Money is less than another Money object
   * @param money The Money object to compare with
   * @returns true if less, false otherwise
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  isLessThan(money: Money): boolean {
    this.validateSameCurrency(money);
    return this.amount < money.getAmount();
  }
  
  /**
   * Check if this Money is less than or equal to another Money object
   * @param money The Money object to compare with
   * @returns true if less or equal, false otherwise
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  isLessThanOrEqualTo(money: Money): boolean {
    this.validateSameCurrency(money);
    return this.amount <= money.getAmount();
  }
  
  /**
   * Check if this Money is zero
   * @returns true if zero, false otherwise
   */
  isZero(): boolean {
    return this.amount === 0;
  }
  
  /**
   * Check if this Money is positive (greater than zero)
   * @returns true if positive, false otherwise
   */
  isPositive(): boolean {
    return this.amount > 0;
  }
  
  /**
   * Check if this Money is negative (less than zero)
   * @returns true if negative, false otherwise
   */
  isNegative(): boolean {
    return this.amount < 0;
  }
  
  /**
   * Returns the absolute value of this Money
   * @returns A new Money object with the absolute amount
   */
  absolute(): Money {
    return new Money(this.currency, Math.abs(this.amount));
  }
  
  /**
   * Returns the negated value of this Money
   * @returns A new Money object with the negated amount
   */
  negated(): Money {
    return new Money(this.currency, -this.amount);
  }
  
  /**
   * Check if this Money has the same currency as another Money object
   * @param money The Money object to compare with
   * @returns true if same currency, false otherwise
   */
  isSameCurrency(money: Money): boolean {
    return this.currency === money.getCurrency();
  }
  
  /**
   * Validate that this Money has the same currency as another Money object
   * @param money The Money object to compare with
   * @throws {CurrencyMismatchError} If currencies are different
   */
  private validateSameCurrency(money: Money): void {
    if (!this.isSameCurrency(money)) {
      throw new CurrencyMismatchError(this.currency, money.getCurrency());
    }
  }
  
  /**
   * Round a number to the specified number of decimal places
   * @param amount The amount to round
   * @param precision The number of decimal places
   * @returns The rounded amount
   */
  private roundToPrecision(amount: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(amount * factor) / factor;
  }
  
  /**
   * Format money amount to string with appropriate precision
   * @returns Formatted amount string with proper decimal places
   */
  formatAmount(): string {
    return this.amount.toFixed(this.precision);
  }
  
  /**
   * Format money with locale (if provided)
   * @param locale The locale to use for formatting (e.g., 'en-US', 'fr-FR')
   * @returns Formatted money string according to locale
   */
  formatWithLocale(locale: string | undefined = undefined): string {
    if (locale) {
      return new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: this.currency 
      }).format(this.amount);
    }
    
    return `${this.currency} ${this.formatAmount()}`;
  }
  
  /**
   * String representation of Money
   * @returns String in format "USD 10.00"
   */
  toString(): string {
    return `${this.currency} ${this.formatAmount()}`;
  }
  
  /**
   * Convert to a plain object for JSON serialization
   * @returns Object with currency and amount
   */
  toJSON(): { currency: string; amount: number } {
    return {
      currency: this.currency,
      amount: this.amount
    };
  }
  
  /**
   * Rounds Money to multiples of a given value
   * @param money The Money object to round
   * @param multiplesOf The value to round to multiples of
   * @returns A new Money object rounded to multiples
   */
  static roundToMultiplesOf(money: Money, multiplesOf: number): Money {
    if (multiplesOf === 0) {
      return money;
    }
    
    const remainder = money.getAmount() % multiplesOf;
    let newAmount = money.getAmount();
    
    // If remainder is more than half of multiplesOf, round up
    if (remainder >= multiplesOf / 2) {
      newAmount = money.getAmount() + (multiplesOf - remainder);
    } else {
      newAmount = money.getAmount() - remainder;
    }
    
    return new Money(money.getCurrency(), newAmount);
  }
}