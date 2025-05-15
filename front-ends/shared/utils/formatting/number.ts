/**
 * Format a number with thousand separators
 * @param value Number to format
 * @param decimalPlaces Decimal places (default: 0)
 * @param locale Locale for formatting (default: 'en-US')
 * @returns Formatted number string
 */
export function formatNumber(value: number | string | null | undefined, decimalPlaces: number = 0, locale: string = 'en-US'): string {
  if (value === null || value === undefined) return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '';
  
  return num.toLocaleString(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
}

/**
 * Format a number as a percentage
 * @param value Number to format (e.g., 42 for 42%)
 * @param decimalPlaces Decimal places (default: 2)
 * @param locale Locale for formatting (default: 'en-US')
 * @returns Formatted percentage string
 */
export function formatPercent(value: number | string | null | undefined, decimalPlaces: number = 2, locale: string = 'en-US'): string {
  if (value === null || value === undefined) return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '';
  
  // Divide by 100 for percentage formatting
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(num / 100);
}

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @param decimalPlaces Decimal places (default: 2)
 * @returns Formatted file size string (e.g., '1.5 MB')
 */
export function formatFileSize(bytes: number | null | undefined, decimalPlaces: number = 2): string {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimalPlaces)) + ' ' + sizes[i];
}

/**
 * Format a number as an ordinal (1st, 2nd, 3rd, etc.)
 * @param value Number to format
 * @returns Formatted ordinal string
 */
export function formatOrdinal(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num)) return '';
  
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return num + 'st';
  }
  if (j === 2 && k !== 12) {
    return num + 'nd';
  }
  if (j === 3 && k !== 13) {
    return num + 'rd';
  }
  return num + 'th';
}

/**
 * Round a number to a specified precision
 * @param value Number to round
 * @param precision Decimal precision (default: 2)
 * @returns Rounded number
 */
export function roundNumber(value: number, precision: number = 2): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Convert a decimal number to a fraction string
 * @param decimal Decimal value to convert
 * @param maxDenominator Maximum denominator to use (default: 100)
 * @returns Fraction string (e.g., '1/4')
 */
export function decimalToFraction(decimal: number, maxDenominator: number = 100): string {
  if (decimal === 0) return '0';
  if (decimal === 1) return '1';
  if (decimal === Math.floor(decimal)) return decimal.toString();
  
  let bestApproximation = { numerator: 1, denominator: 1, error: Math.abs(decimal - 1) };
  
  for (let denominator = 1; denominator <= maxDenominator; denominator++) {
    const numerator = Math.round(decimal * denominator);
    const error = Math.abs(decimal - numerator / denominator);
    
    if (error < bestApproximation.error) {
      bestApproximation = { numerator, denominator, error };
    }
    
    // If we found an exact match, break early
    if (error === 0) break;
  }
  
  // Simplify the fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(bestApproximation.numerator, bestApproximation.denominator);
  
  const numerator = bestApproximation.numerator / divisor;
  const denominator = bestApproximation.denominator / divisor;
  
  return `${numerator}/${denominator}`;
}