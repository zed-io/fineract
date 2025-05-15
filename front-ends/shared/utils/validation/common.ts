/**
 * Validate email format
 * @param email Email to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation, customizable by locale)
 * @param phone Phone number to validate
 * @param minLength Minimum length (default: 7)
 * @param maxLength Maximum length (default: 15)
 * @returns True if phone number is valid
 */
export function isValidPhone(phone: string | null | undefined, minLength: number = 7, maxLength: number = 15): boolean {
  if (!phone) return false;
  
  // Remove spaces, dashes, parentheses, and other formatting characters
  const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Check if it has only digits and has appropriate length
  return /^\d+$/.test(cleanedPhone) && cleanedPhone.length >= minLength && cleanedPhone.length <= maxLength;
}

/**
 * Validate password strength
 * @param password Password to validate
 * @param minLength Minimum length (default: 8)
 * @param requireUppercase Require at least one uppercase letter (default: true)
 * @param requireLowercase Require at least one lowercase letter (default: true)
 * @param requireNumbers Require at least one number (default: true)
 * @param requireSpecial Require at least one special character (default: true)
 * @returns Object with isValid flag and reasons for failure
 */
export function validatePassword(
  password: string | null | undefined,
  minLength: number = 8,
  requireUppercase: boolean = true,
  requireLowercase: boolean = true,
  requireNumbers: boolean = true,
  requireSpecial: boolean = true
): { isValid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  if (!password) {
    reasons.push('Password is required');
    return { isValid: false, reasons };
  }
  
  if (password.length < minLength) {
    reasons.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push('Password must contain at least one uppercase letter');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    reasons.push('Password must contain at least one lowercase letter');
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    reasons.push('Password must contain at least one number');
  }
  
  if (requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    reasons.push('Password must contain at least one special character');
  }
  
  return {
    isValid: reasons.length === 0,
    reasons
  };
}

/**
 * Validate if a value is a non-empty string
 * @param value Value to validate
 * @param minLength Minimum length (default: 1)
 * @returns True if value is a non-empty string
 */
export function isNonEmptyString(value: any, minLength: number = 1): boolean {
  return typeof value === 'string' && value.trim().length >= minLength;
}

/**
 * Validate if value is a valid number within optional range
 * @param value Value to validate
 * @param min Minimum value (optional)
 * @param max Maximum value (optional)
 * @returns True if value is a valid number within range
 */
export function isValidNumber(value: any, min?: number, max?: number): boolean {
  if (value === null || value === undefined) return false;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || typeof num !== 'number') return false;
  
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  
  return true;
}

/**
 * Validate if a value is a valid date
 * @param value Value to validate
 * @param minDate Minimum date (optional)
 * @param maxDate Maximum date (optional)
 * @returns True if value is a valid date within range
 */
export function isValidDate(value: any, minDate?: Date, maxDate?: Date): boolean {
  if (!value) return false;
  
  const date = value instanceof Date ? value : new Date(value);
  
  if (isNaN(date.getTime())) return false;
  
  if (minDate && date < minDate) return false;
  if (maxDate && date > maxDate) return false;
  
  return true;
}

/**
 * Validate a postal/zip code format based on country
 * @param postalCode Postal code to validate
 * @param countryCode ISO country code
 * @returns True if postal code is valid for the country
 */
export function isValidPostalCode(postalCode: string, countryCode: string = 'US'): boolean {
  if (!postalCode) return false;
  
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    UK: /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ -]?\d[A-Za-z]{2}$/,
    AU: /^\d{4}$/,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    IN: /^\d{6}$/,
    JP: /^\d{3}-\d{4}$/,
    BR: /^\d{5}-\d{3}$/,
    // Add more countries as needed
  };
  
  // Default to a basic numeric check if country not found
  const pattern = patterns[countryCode.toUpperCase()] || /^\d+$/;
  return pattern.test(postalCode);
}