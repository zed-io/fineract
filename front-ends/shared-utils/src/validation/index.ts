import { Decimal } from 'decimal.js';
import { isDateAfter, isDateBefore, parseDate } from '../date';

/**
 * Check if a value is a number (including string representations of numbers)
 * 
 * @param value The value to check
 * @returns Whether the value is a number
 * 
 * @example
 * ```ts
 * isNumber(123); // true
 * isNumber('123'); // true
 * isNumber('123.45'); // true
 * isNumber('abc'); // false
 * ```
 */
export function isNumber(value: any): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  
  if (typeof value === 'string') {
    // Try to parse as a number
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }
  
  return false;
}

/**
 * Check if a value is a positive number
 * 
 * @param value The value to check
 * @param allowZero Whether to consider zero as positive
 * @returns Whether the value is a positive number
 * 
 * @example
 * ```ts
 * isPositiveNumber(123); // true
 * isPositiveNumber(0); // false
 * isPositiveNumber(0, true); // true
 * isPositiveNumber(-123); // false
 * ```
 */
export function isPositiveNumber(value: any, allowZero = false): boolean {
  if (!isNumber(value)) {
    return false;
  }
  
  const num = Number(value);
  return allowZero ? num >= 0 : num > 0;
}

/**
 * Check if a value is a valid percentage (between 0 and 100, inclusive)
 * 
 * @param value The value to check
 * @returns Whether the value is a valid percentage
 * 
 * @example
 * ```ts
 * isValidPercentage(50); // true
 * isValidPercentage(0); // true
 * isValidPercentage(100); // true
 * isValidPercentage(-10); // false
 * isValidPercentage(110); // false
 * ```
 */
export function isValidPercentage(value: any): boolean {
  if (!isNumber(value)) {
    return false;
  }
  
  const num = Number(value);
  return num >= 0 && num <= 100;
}

/**
 * Check if a value is a valid decimal (no more than the specified number of decimal places)
 * 
 * @param value The value to check
 * @param maxDecimalPlaces The maximum number of decimal places allowed
 * @returns Whether the value is a valid decimal
 * 
 * @example
 * ```ts
 * isValidDecimal(123.45, 2); // true
 * isValidDecimal(123.456, 2); // false
 * isValidDecimal('123.45', 2); // true
 * ```
 */
export function isValidDecimal(value: any, maxDecimalPlaces = 2): boolean {
  if (!isNumber(value)) {
    return false;
  }
  
  const strValue = String(value);
  const parts = strValue.split('.');
  
  if (parts.length === 1) {
    // No decimal places
    return true;
  }
  
  if (parts.length === 2) {
    // Check that the decimal part isn't longer than the maximum
    return parts[1].length <= maxDecimalPlaces;
  }
  
  // More than one decimal point
  return false;
}

/**
 * Check if a value is a valid currency amount
 * 
 * @param value The value to check
 * @param minValue The minimum allowed value
 * @param maxValue The maximum allowed value
 * @param allowNegative Whether to allow negative values
 * @returns Whether the value is a valid currency amount
 * 
 * @example
 * ```ts
 * isValidCurrencyAmount(123.45); // true
 * isValidCurrencyAmount(-123.45); // false
 * isValidCurrencyAmount(-123.45, undefined, undefined, true); // true
 * isValidCurrencyAmount(123.45, 0, 100); // false (over max)
 * ```
 */
export function isValidCurrencyAmount(
  value: any,
  minValue?: number | string | Decimal,
  maxValue?: number | string | Decimal,
  allowNegative = false
): boolean {
  if (!isNumber(value)) {
    return false;
  }
  
  try {
    const amount = new Decimal(value);
    
    // Check if negative values are allowed
    if (!allowNegative && amount.isNegative()) {
      return false;
    }
    
    // Check minimum value if specified
    if (minValue !== undefined && amount.lessThan(minValue)) {
      return false;
    }
    
    // Check maximum value if specified
    if (maxValue !== undefined && amount.greaterThan(maxValue)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a value is a valid interest rate
 * 
 * @param value The value to check
 * @param minValue The minimum allowed value
 * @param maxValue The maximum allowed value
 * @returns Whether the value is a valid interest rate
 * 
 * @example
 * ```ts
 * isValidInterestRate(5.25); // true
 * isValidInterestRate(-1); // false
 * isValidInterestRate(50, 0, 20); // false (over max)
 * ```
 */
export function isValidInterestRate(
  value: any,
  minValue = 0,
  maxValue = 100
): boolean {
  return isValidCurrencyAmount(value, minValue, maxValue, false);
}

/**
 * Check if a value is a valid IBAN (International Bank Account Number)
 * 
 * @param value The value to check
 * @returns Whether the value is a valid IBAN
 * 
 * @example
 * ```ts
 * isValidIBAN('DE89370400440532013000'); // true
 * isValidIBAN('GB82WEST12345698765432'); // true
 * isValidIBAN('InvalidIBAN'); // false
 * ```
 */
export function isValidIBAN(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Remove spaces and convert to uppercase
  const iban = value.replace(/\s/g, '').toUpperCase();
  
  // Basic format check (length, allowed characters)
  if (!/^[A-Z0-9]+$/.test(iban)) {
    return false;
  }
  
  // IBAN must be at least 5 characters (2 country code + 2 check digits + at least 1 account number)
  if (iban.length < 5) {
    return false;
  }
  
  // Extract country code and check digits
  const countryCode = iban.substring(0, 2);
  
  // Check if country code is alphabetic
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return false;
  }
  
  // Run IBAN validation algorithm
  // Move the first 4 characters to the end
  const rearranged = iban.substring(4) + iban.substring(0, 4);
  
  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numerical = '';
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged.charAt(i);
    const code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      // Numeric
      numerical += char;
    } else if (code >= 65 && code <= 90) {
      // Alphabetic
      numerical += (code - 55).toString();
    } else {
      return false;
    }
  }
  
  // Perform the mod-97 check
  let remainder = 0;
  for (let i = 0; i < numerical.length; i++) {
    remainder = (remainder * 10 + parseInt(numerical.charAt(i), 10)) % 97;
  }
  
  return remainder === 1;
}

/**
 * Check if a value is a valid email address
 * 
 * @param value The value to check
 * @returns Whether the value is a valid email address
 * 
 * @example
 * ```ts
 * isValidEmail('user@example.com'); // true
 * isValidEmail('invalid-email'); // false
 * ```
 */
export function isValidEmail(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // RFC 5322 compliant email regex
  const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(value);
}

/**
 * Check if a value is a valid phone number
 * 
 * @param value The value to check
 * @returns Whether the value is a valid phone number
 * 
 * @example
 * ```ts
 * isValidPhoneNumber('+1-555-123-4567'); // true
 * isValidPhoneNumber('5551234567'); // true
 * isValidPhoneNumber('invalid-phone'); // false
 * ```
 */
export function isValidPhoneNumber(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Basic international phone number regex
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(value.replace(/\s/g, ''));
}

/**
 * Check if a date is within a valid range
 * 
 * @param value The date to check
 * @param format The format of the date string
 * @param minDate The minimum allowed date
 * @param maxDate The maximum allowed date
 * @returns Whether the date is within the valid range
 * 
 * @example
 * ```ts
 * isValidDateRange('2023-04-25', 'YYYY-MM-DD', '2023-01-01', '2023-12-31'); // true
 * isValidDateRange('2022-04-25', 'YYYY-MM-DD', '2023-01-01', '2023-12-31'); // false
 * ```
 */
export function isValidDateRange(
  value: string | Date,
  format: string,
  minDate?: string | Date,
  maxDate?: string | Date
): boolean {
  try {
    const date = typeof value === 'string' ? parseDate(value, format) : value;
    
    if (minDate) {
      const min = typeof minDate === 'string' ? parseDate(minDate, format) : minDate;
      if (isDateBefore(date, min)) {
        return false;
      }
    }
    
    if (maxDate) {
      const max = typeof maxDate === 'string' ? parseDate(maxDate, format) : maxDate;
      if (isDateAfter(date, max)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate an object against a set of validation rules
 * 
 * @param object The object to validate
 * @param validationRules The validation rules to apply
 * @returns An object containing validation errors (if any)
 * 
 * @example
 * ```ts
 * const object = { amount: 100, rate: -1 };
 * const rules = {
 *   amount: { validator: isPositiveNumber, message: 'Amount must be positive' },
 *   rate: { validator: isValidInterestRate, message: 'Rate must be between 0 and 100' }
 * };
 * const errors = validateObject(object, rules);
 * // errors = { rate: 'Rate must be between 0 and 100' }
 * ```
 */
export function validateObject<T extends Record<string, any>>(
  object: T,
  validationRules: Record<keyof T, { 
    validator: (value: any, ...args: any[]) => boolean;
    message: string;
    args?: any[];
  }>
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  
  for (const key in validationRules) {
    if (Object.prototype.hasOwnProperty.call(validationRules, key)) {
      const rule = validationRules[key];
      const value = object[key];
      
      const isValid = rule.args 
        ? rule.validator(value, ...rule.args) 
        : rule.validator(value);
      
      if (!isValid) {
        errors[key] = rule.message;
      }
    }
  }
  
  return errors;
}

/**
 * Creates a validation rule that combines multiple validators
 * 
 * @param validators The validators to combine
 * @returns A combined validator function
 * 
 * @example
 * ```ts
 * const isValidAmount = combineValidators(
 *   isNumber,
 *   (value) => isPositiveNumber(value),
 *   (value) => isValidDecimal(value, 2)
 * );
 * isValidAmount('123.45'); // true
 * isValidAmount('123.456'); // false
 * ```
 */
export function combineValidators(
  ...validators: Array<(value: any, ...args: any[]) => boolean>
): (value: any) => boolean {
  return (value: any): boolean => {
    return validators.every(validator => validator(value));
  };
}