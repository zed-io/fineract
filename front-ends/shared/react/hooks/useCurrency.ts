import { useState, useCallback, useMemo } from 'react';
import {
  formatCurrency,
  formatAmount,
  formatPercentage,
  formatNumber
} from '../../utils/currency/format';
import {
  calculateEMI,
  calculateCompoundInterest,
  calculateAmortizationSchedule,
  convertCurrency
} from '../../utils/currency/calculate';
import {
  parseAmount,
  formatRawAmount,
  minorToMajor,
  majorToMinor
} from '../../utils/currency/convert';

/**
 * Currency formatting hook options
 */
export interface UseCurrencyOptions {
  /** Default currency code (default: 'USD') */
  defaultCurrency?: string;
  
  /** Default locale (default: 'en-US') */
  defaultLocale?: string;
  
  /** Default decimal places (default: 2) */
  defaultDecimalPlaces?: number;
}

/**
 * Hook for currency and monetary operations
 * @param options Currency hook options
 * @returns Currency formatting and calculation utilities
 */
export function useCurrency(options: UseCurrencyOptions = {}) {
  const {
    defaultCurrency = 'USD',
    defaultLocale = 'en-US',
    defaultDecimalPlaces = 2
  } = options;
  
  // State for current currency
  const [currencyCode, setCurrencyCode] = useState(defaultCurrency);
  
  // State for current locale
  const [locale, setLocale] = useState(defaultLocale);
  
  // State for decimal places
  const [decimalPlaces, setDecimalPlaces] = useState(defaultDecimalPlaces);
  
  /**
   * Format a value as currency
   */
  const format = useCallback((value: number | string | null | undefined) => {
    return formatCurrency(value, currencyCode, locale);
  }, [currencyCode, locale]);
  
  /**
   * Format a value as an amount (without currency symbol)
   */
  const formatAsAmount = useCallback((value: number | string | null | undefined) => {
    return formatAmount(value, locale, decimalPlaces);
  }, [locale, decimalPlaces]);
  
  /**
   * Format a value as a percentage
   */
  const formatAsPercentage = useCallback((value: number | string | null | undefined) => {
    return formatPercentage(value, locale, decimalPlaces);
  }, [locale, decimalPlaces]);
  
  /**
   * Format a value as a number
   */
  const formatAsNumber = useCallback((value: number | string | null | undefined, customDecimalPlaces?: number) => {
    return formatNumber(value, locale, customDecimalPlaces ?? decimalPlaces);
  }, [locale, decimalPlaces]);
  
  /**
   * Parse a string into a number
   */
  const parse = useCallback((value: string | null | undefined) => {
    return parseAmount(value);
  }, []);
  
  /**
   * Calculate EMI (Equated Monthly Installment)
   */
  const calculateLoanEMI = useCallback((principal: number, interestRate: number, termInMonths: number) => {
    return calculateEMI(principal, interestRate, termInMonths);
  }, []);
  
  /**
   * Calculate compound interest
   */
  const calculateInterest = useCallback((principal: number, rate: number, time: number, frequency: number = 1) => {
    return calculateCompoundInterest(principal, rate, time, frequency);
  }, []);
  
  /**
   * Calculate amortization schedule
   */
  const getAmortizationSchedule = useCallback((principal: number, interestRate: number, termInMonths: number) => {
    return calculateAmortizationSchedule(principal, interestRate, termInMonths);
  }, []);
  
  /**
   * Convert between currencies
   */
  const convert = useCallback((amount: number, fromCurrency: string, toCurrency: string, exchangeRate: number) => {
    return convertCurrency(amount, fromCurrency, toCurrency, exchangeRate);
  }, []);
  
  /**
   * Convert from minor units (cents) to major units (dollars)
   */
  const toMajorUnits = useCallback((minorUnits: number) => {
    return minorToMajor(minorUnits, decimalPlaces);
  }, [decimalPlaces]);
  
  /**
   * Convert from major units (dollars) to minor units (cents)
   */
  const toMinorUnits = useCallback((majorUnits: number) => {
    return majorToMinor(majorUnits, decimalPlaces);
  }, [decimalPlaces]);
  
  /**
   * Currency configuration
   */
  const config = useMemo(() => ({
    currencyCode,
    locale,
    decimalPlaces,
    setCurrencyCode,
    setLocale,
    setDecimalPlaces
  }), [currencyCode, locale, decimalPlaces]);
  
  return {
    // Configuration
    ...config,
    
    // Formatting
    format,
    formatAsAmount,
    formatAsPercentage,
    formatAsNumber,
    formatRawAmount: (amount: number | null | undefined) => formatRawAmount(amount, decimalPlaces),
    
    // Parsing
    parse,
    
    // Calculations
    calculateLoanEMI,
    calculateInterest,
    getAmortizationSchedule,
    
    // Conversions
    convert,
    toMajorUnits,
    toMinorUnits
  };
}