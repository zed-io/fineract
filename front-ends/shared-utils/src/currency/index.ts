import { Decimal } from 'decimal.js';

export interface CurrencyOptions {
  /**
   * The ISO 4217 currency code (e.g., USD, EUR, GBP)
   */
  code: string;
  /**
   * Number of decimal places to use for the currency
   * @default 2
   */
  decimalPlaces?: number;
  /**
   * Symbol to display before the amount
   * @default '$' for USD, '€' for EUR, etc.
   */
  symbol?: string;
  /**
   * Whether to show the currency code after the amount
   * @default false
   */
  showCode?: boolean;
  /**
   * Locale to use for formatting
   * @default 'en-US'
   */
  locale?: string;
}

const DEFAULT_CURRENCY_OPTIONS: Partial<CurrencyOptions> = {
  decimalPlaces: 2,
  showCode: false,
  locale: 'en-US'
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  CNY: '¥',
  HKD: 'HK$',
  NZD: 'NZ$',
  // Add more currencies as needed
};

/**
 * Format a number as a currency string
 * 
 * @param amount The amount to format
 * @param options Currency formatting options
 * @returns A formatted currency string
 * 
 * @example
 * ```ts
 * formatCurrency(1234.56, { code: 'USD' }); // '$1,234.56'
 * formatCurrency(1234.56, { code: 'EUR', showCode: true }); // '€1,234.56 EUR'
 * formatCurrency(1234.56, { code: 'JPY', decimalPlaces: 0 }); // '¥1,235'
 * ```
 */
export function formatCurrency(amount: number | string | Decimal, options: CurrencyOptions): string {
  const opts = { ...DEFAULT_CURRENCY_OPTIONS, ...options };
  const decimalAmount = new Decimal(amount);
  
  const symbol = opts.symbol || CURRENCY_SYMBOLS[opts.code] || '';
  
  const formatter = new Intl.NumberFormat(opts.locale, {
    minimumFractionDigits: opts.decimalPlaces,
    maximumFractionDigits: opts.decimalPlaces,
  });
  
  const formattedAmount = formatter.format(decimalAmount.toNumber());
  
  return `${symbol}${formattedAmount}${opts.showCode ? ' ' + opts.code : ''}`;
}

/**
 * Parse a currency string into a Decimal
 * 
 * @param currencyString The currency string to parse
 * @returns A Decimal representing the amount
 * 
 * @example
 * ```ts
 * parseCurrency('$1,234.56'); // Decimal(1234.56)
 * parseCurrency('€1.234,56', { locale: 'de-DE' }); // Decimal(1234.56)
 * ```
 */
export function parseCurrency(currencyString: string, options?: Partial<CurrencyOptions>): Decimal {
  const opts = { ...DEFAULT_CURRENCY_OPTIONS, ...(options || {}) };
  
  // Remove currency symbols and code
  let cleaned = currencyString;
  
  // Remove currency symbol if it exists
  if (options?.code && CURRENCY_SYMBOLS[options.code]) {
    cleaned = cleaned.replace(CURRENCY_SYMBOLS[options.code], '');
  }
  
  // Remove currency code if it exists
  if (options?.code) {
    cleaned = cleaned.replace(options.code, '');
  }
  
  // Remove other common currency symbols
  Object.values(CURRENCY_SYMBOLS).forEach(symbol => {
    cleaned = cleaned.replace(symbol, '');
  });
  
  // Remove thousands separators and normalize decimal point
  const isLatinEuropeanLocale = opts.locale?.startsWith('fr') || 
                                opts.locale?.startsWith('de') || 
                                opts.locale?.startsWith('es') || 
                                opts.locale?.startsWith('it');
  
  if (isLatinEuropeanLocale) {
    // For locales that use comma as decimal separator and period as thousands separator
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else {
    // For locales that use period as decimal separator and comma as thousands separator
    cleaned = cleaned.replace(/,/g, '');
  }
  
  // Trim and convert to decimal
  cleaned = cleaned.trim();
  
  try {
    return new Decimal(cleaned);
  } catch (error) {
    throw new Error(`Failed to parse currency string: ${currencyString}`);
  }
}

/**
 * Calculate exchange rate conversion
 * 
 * @param amount The amount to convert
 * @param exchangeRate The exchange rate to apply
 * @returns The converted amount as a Decimal
 */
export function convertCurrency(amount: number | string | Decimal, exchangeRate: number | string | Decimal): Decimal {
  const decimalAmount = new Decimal(amount);
  const decimalRate = new Decimal(exchangeRate);
  
  return decimalAmount.times(decimalRate);
}

export { Decimal } from 'decimal.js';