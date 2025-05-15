/**
 * Formatting utilities for Fineract Hasura Actions
 */

/**
 * Format a currency value
 * @param value The value to format
 * @param currencyCode Currency code (e.g., 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currencyCode: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (error) {
    // Fallback if Intl is not available or currency is invalid
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/**
 * Format a date string
 * @param dateString Date string in ISO format (YYYY-MM-DD)
 * @param format Format style ('full', 'long', 'medium', 'short')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, format: 'full' | 'long' | 'medium' | 'short' = 'medium'): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: format
    }).format(date);
  } catch (error) {
    // Fallback if Intl is not available or date is invalid
    return dateString;
  }
}

/**
 * Format a percentage value
 * @param value The value to format as percentage (e.g., 0.05 for 5%)
 * @param digits Number of decimal digits
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, digits: number = 2): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value / 100);
  } catch (error) {
    // Fallback if Intl is not available
    return `${(value).toFixed(digits)}%`;
  }
}

/**
 * Format a number with thousand separators
 * @param value The number to format
 * @param digits Number of decimal digits
 * @returns Formatted number string
 */
export function formatNumber(value: number, digits: number = 2): string {
  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  } catch (error) {
    // Fallback if Intl is not available
    return value.toFixed(digits);
  }
}