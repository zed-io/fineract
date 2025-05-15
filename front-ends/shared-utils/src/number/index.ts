import { Decimal } from 'decimal.js';
import { RoundingMode } from '../math';

export interface NumberFormatOptions {
  /**
   * Number of decimal places to show
   * @default 2
   */
  decimalPlaces?: number;
  /**
   * Whether to use grouping separators (e.g., thousands separators)
   * @default true
   */
  useGrouping?: boolean;
  /**
   * Locale to use for formatting
   * @default 'en-US'
   */
  locale?: string;
  /**
   * Rounding mode to use
   * @default RoundingMode.HALF_UP
   */
  roundingMode?: RoundingMode;
  /**
   * Whether to format as a percentage
   * @default false
   */
  asPercentage?: boolean;
}

const DEFAULT_NUMBER_FORMAT_OPTIONS: NumberFormatOptions = {
  decimalPlaces: 2,
  useGrouping: true,
  locale: 'en-US',
  roundingMode: RoundingMode.HALF_UP,
  asPercentage: false
};

/**
 * Format a number according to the specified options
 * 
 * @param value The value to format
 * @param options Formatting options
 * @returns A formatted number string
 * 
 * @example
 * ```ts
 * formatNumber(1234.56); // '1,234.56'
 * formatNumber(1234.56, { decimalPlaces: 0 }); // '1,235'
 * formatNumber(0.1234, { asPercentage: true }); // '12.34%'
 * ```
 */
export function formatNumber(
  value: number | string | Decimal,
  options?: Partial<NumberFormatOptions>
): string {
  const opts = { ...DEFAULT_NUMBER_FORMAT_OPTIONS, ...(options || {}) };
  
  // Create a Decimal object for precise rounding
  const decimalValue = new Decimal(value);
  
  // Store the current rounding mode
  const originalRounding = Decimal.rounding;
  try {
    // Set the desired rounding mode
    Decimal.rounding = opts.roundingMode || RoundingMode.HALF_UP;
    
    // Round to the specified number of decimal places
    let roundedValue = decimalValue.toDecimalPlaces(opts.decimalPlaces || 0);
    
    // Convert to percentage if specified
    if (opts.asPercentage) {
      roundedValue = roundedValue.times(100);
    }
    
    // Create a number formatter with the specified options
    const formatter = new Intl.NumberFormat(opts.locale, {
      minimumFractionDigits: opts.decimalPlaces,
      maximumFractionDigits: opts.decimalPlaces,
      useGrouping: opts.useGrouping,
      style: opts.asPercentage ? 'percent' : 'decimal',
      // Divide by 100 because we've already multiplied by 100 above
      // and Intl.NumberFormat also multiplies by 100 for percentages
      ...(opts.asPercentage ? { minimumFractionDigits: opts.decimalPlaces || 0, multiplier: 0.01 } : {})
    });
    
    return formatter.format(roundedValue.toNumber());
  } finally {
    // Restore the original rounding mode
    Decimal.rounding = originalRounding;
  }
}

/**
 * Format a number as a percentage
 * 
 * @param value The value to format (e.g. 0.125 for 12.5%)
 * @param options Formatting options
 * @returns A formatted percentage string
 * 
 * @example
 * ```ts
 * formatPercentage(0.125); // '12.50%'
 * formatPercentage(0.125, { decimalPlaces: 1 }); // '12.5%'
 * ```
 */
export function formatPercentage(
  value: number | string | Decimal,
  options?: Partial<NumberFormatOptions>
): string {
  return formatNumber(value, { ...options, asPercentage: true });
}

/**
 * Format a ratio (e.g. 0.75 as "3:4")
 * 
 * @param value The ratio value between 0 and 1
 * @param simplified Whether to simplify the ratio (e.g. 2:4 -> 1:2)
 * @returns A formatted ratio string
 * 
 * @example
 * ```ts
 * formatRatio(0.75); // '3:4'
 * formatRatio(0.666, { simplified: false }); // '666:1000'
 * formatRatio(0.666, { simplified: true }); // '2:3'
 * ```
 */
export function formatRatio(
  value: number | string | Decimal,
  { simplified = true }: { simplified?: boolean } = {}
): string {
  const decimalValue = new Decimal(value);
  
  // Ensure the value is between 0 and 1
  if (decimalValue.lessThan(0) || decimalValue.greaterThan(1)) {
    throw new Error('Ratio value must be between 0 and 1');
  }
  
  if (decimalValue.isZero()) {
    return '0:1';
  }
  
  if (decimalValue.equals(1)) {
    return '1:1';
  }
  
  // Calculate the ratio by finding the decimal expansion
  const decimalStr = decimalValue.toString();
  let denominator = 1;
  let numerator = Number(decimalValue);
  
  // Check if it's a terminating decimal
  if (decimalStr.includes('.')) {
    const decimalPart = decimalStr.split('.')[1];
    denominator = Math.pow(10, decimalPart.length);
    numerator = Number(decimalValue.times(denominator));
  }
  
  // Simplify the ratio if requested
  if (simplified) {
    const gcd = findGCD(numerator, denominator);
    numerator = numerator / gcd;
    denominator = denominator / gcd;
  }
  
  return `${numerator}:${denominator}`;
}

/**
 * Find the greatest common divisor of two numbers
 */
function findGCD(a: number, b: number): number {
  return b === 0 ? a : findGCD(b, a % b);
}

/**
 * Parse a number from a formatted string
 * 
 * @param numberString The string to parse
 * @param options Parsing options
 * @returns A Decimal representing the number
 * 
 * @example
 * ```ts
 * parseNumber('1,234.56'); // Decimal(1234.56)
 * parseNumber('12.34%', { parsePercentage: true }); // Decimal(0.1234)
 * ```
 */
export function parseNumber(
  numberString: string,
  { locale = 'en-US', parsePercentage = false }: { locale?: string, parsePercentage?: boolean } = {}
): Decimal {
  // Remove all whitespace
  let cleaned = numberString.trim();
  
  // Handle percentages
  if (parsePercentage || cleaned.includes('%')) {
    cleaned = cleaned.replace('%', '');
    // Need to parse first then divide by 100
    const parsed = parseNumber(cleaned, { locale });
    return parsed.dividedBy(100);
  }
  
  // Detect whether we're dealing with a locale that uses comma as decimal separator
  const isCommaDecimal = ['fr', 'de', 'es', 'it'].some(prefix => 
    locale.toLowerCase().startsWith(prefix.toLowerCase())
  );
  
  if (isCommaDecimal) {
    // For locales that use comma as decimal separator and period as thousands separator
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else {
    // For locales that use period as decimal separator and comma as thousands separator
    cleaned = cleaned.replace(/,/g, '');
  }
  
  // Try to convert to a Decimal
  try {
    return new Decimal(cleaned);
  } catch (error) {
    throw new Error(`Failed to parse number: ${numberString}`);
  }
}

/**
 * Convert a number to a human-readable file size string
 * 
 * @param bytes The number of bytes
 * @param options Formatting options
 * @returns A formatted file size string
 * 
 * @example
 * ```ts
 * formatFileSize(1024); // '1.00 KB'
 * formatFileSize(1536, { decimalPlaces: 0 }); // '2 KB'
 * formatFileSize(1073741824); // '1.00 GB'
 * ```
 */
export function formatFileSize(
  bytes: number | string | Decimal,
  options?: Partial<NumberFormatOptions>
): string {
  const opts = { ...DEFAULT_NUMBER_FORMAT_OPTIONS, ...(options || {}) };
  const decimalBytes = new Decimal(bytes);
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  if (decimalBytes.isZero()) {
    return `0 ${units[0]}`;
  }
  
  const i = Math.floor(Math.log(decimalBytes.toNumber()) / Math.log(1024));
  const size = decimalBytes.dividedBy(new Decimal(1024).pow(i));
  
  return `${formatNumber(size, opts)} ${units[i]}`;
}

/**
 * Format a number for display in a table or grid (fixed width, right-aligned)
 * 
 * @param value The value to format
 * @param options Formatting options
 * @returns A formatted number string
 * 
 * @example
 * ```ts
 * formatNumberForGrid(1234.56); // '  1,234.56'
 * formatNumberForGrid(1.2, { width: 10 }); // '      1.20'
 * ```
 */
export function formatNumberForGrid(
  value: number | string | Decimal,
  { width = 10, ...options }: Partial<NumberFormatOptions> & { width?: number } = {}
): string {
  const formatted = formatNumber(value, options);
  return formatted.padStart(width);
}

export { Decimal } from 'decimal.js';