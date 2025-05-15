/**
 * Format a currency amount for display
 * @param amount Amount to format
 * @param currencyCode ISO currency code (default: 'USD')
 * @param locale Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | null | undefined, currencyCode: string = 'USD', locale: string = 'en-US'): string {
  if (amount === null || amount === undefined) return '';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch (error) {
    // Fallback if currency code is invalid
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount) + ' ' + currencyCode;
  }
}

/**
 * Format a currency amount without the currency symbol
 * @param amount Amount to format
 * @param locale Locale for formatting (default: 'en-US')
 * @param decimalPlaces Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatAmount(amount: number | string | null | undefined, locale: string = 'en-US', decimalPlaces: number = 2): string {
  if (amount === null || amount === undefined) return '';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(numericAmount);
}

/**
 * Format a percentage value
 * @param value Value to format as percentage
 * @param locale Locale for formatting (default: 'en-US')
 * @param decimalPlaces Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | string | null | undefined, locale: string = 'en-US', decimalPlaces: number = 2): string {
  if (value === null || value === undefined) return '';
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(numericValue / 100); // Convert to decimal for percentage formatting
}

/**
 * Format a number for display with specified decimal places
 * @param value Value to format
 * @param locale Locale for formatting (default: 'en-US')
 * @param decimalPlaces Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number | string | null | undefined, locale: string = 'en-US', decimalPlaces: number = 2): string {
  if (value === null || value === undefined) return '';
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(numericValue);
}