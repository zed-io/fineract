/**
 * Format a phone number to a standard format
 * @param phoneNumber Phone number to format
 * @param countryCode Country code (default: 'US')
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined, countryCode: string = 'US'): string {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Apply country-specific formatting
  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      } else if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
      }
      break;
    case 'UK':
      if (cleaned.length === 11 && cleaned.startsWith('07')) {
        return `+44 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
      }
      break;
    case 'AU':
      if (cleaned.length === 10) {
        return `+61 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
      }
      break;
    case 'IN':
      if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
      }
      break;
    // Add more country formats as needed
  }
  
  // Default formatting for other countries or non-standard numbers
  if (cleaned.length <= 4) {
    return cleaned;
  } else if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  } else if (cleaned.length <= 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else {
    // Add international format for longer numbers
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)}-${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
  }
}

/**
 * Format a phone number with country code
 * @param phoneNumber Phone number to format
 * @param countryCode Country code (e.g., '1' for US)
 * @returns Formatted international phone number
 */
export function formatInternationalPhoneNumber(phoneNumber: string | null | undefined, countryCode: string): string {
  if (!phoneNumber || !countryCode) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Remove country code from the beginning if it's already there
  const numberWithoutCountry = cleaned.startsWith(countryCode)
    ? cleaned.slice(countryCode.length)
    : cleaned;
  
  return `+${countryCode} ${numberWithoutCountry}`;
}

/**
 * Extract phone number digits only
 * @param phoneNumber Phone number to clean
 * @returns Phone number with only digits
 */
export function cleanPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  return phoneNumber.replace(/\D/g, '');
}

/**
 * Mask a phone number for privacy
 * @param phoneNumber Phone number to mask
 * @param visibleDigits Number of digits to leave visible at the end (default: 4)
 * @returns Masked phone number
 */
export function maskPhoneNumber(phoneNumber: string | null | undefined, visibleDigits: number = 4): string {
  if (!phoneNumber) return '';
  
  const cleaned = cleanPhoneNumber(phoneNumber);
  
  if (cleaned.length <= visibleDigits) {
    return cleaned;
  }
  
  const masked = '*'.repeat(cleaned.length - visibleDigits);
  return masked + cleaned.slice(-visibleDigits);
}

/**
 * Format local part of phone number (without country code)
 * @param phoneNumber Local phone number to format
 * @param countryCode Country code (default: 'US')
 * @returns Formatted local phone number
 */
export function formatLocalPhoneNumber(phoneNumber: string | null | undefined, countryCode: string = 'US'): string {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Apply country-specific formatting for local numbers
  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
      if (cleaned.length === 7) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      }
      break;
    case 'UK':
      if (cleaned.length === 10 && cleaned.startsWith('0')) {
        return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
      }
      break;
    // Add more country formats as needed
  }
  
  // Default basic formatting
  if (cleaned.length <= 4) {
    return cleaned;
  } else if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  } else {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
}