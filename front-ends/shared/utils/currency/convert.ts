/**
 * Convert a string to a valid numeric amount
 * @param value String value to convert
 * @returns Numeric value or null if invalid
 */
export function parseAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  
  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleanedValue = value.replace(/[^\d.-]/g, '');
  const numericValue = parseFloat(cleanedValue);
  
  return isNaN(numericValue) ? null : numericValue;
}

/**
 * Format a raw amount for display as currency (without currency code or symbol)
 * @param amount Raw amount
 * @param decimalPlaces Number of decimal places
 * @returns Formatted string with commas and decimal places
 */
export function formatRawAmount(amount: number | null | undefined, decimalPlaces: number = 2): string {
  if (amount === null || amount === undefined) return '';
  
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
}

/**
 * Convert an amount from minor units (cents) to major units (dollars)
 * @param minorUnits Amount in minor units (e.g., cents)
 * @param decimalPlaces Number of decimal places in the currency (default: 2)
 * @returns Amount in major units (e.g., dollars)
 */
export function minorToMajor(minorUnits: number, decimalPlaces: number = 2): number {
  return parseFloat((minorUnits / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces));
}

/**
 * Convert an amount from major units (dollars) to minor units (cents)
 * @param majorUnits Amount in major units (e.g., dollars)
 * @param decimalPlaces Number of decimal places in the currency (default: 2)
 * @returns Amount in minor units (e.g., cents)
 */
export function majorToMinor(majorUnits: number, decimalPlaces: number = 2): number {
  return Math.round(majorUnits * Math.pow(10, decimalPlaces));
}