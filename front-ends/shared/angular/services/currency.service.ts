import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
 * Angular service for currency operations
 * This service provides similar functionality to the React useCurrency hook
 */
@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  // Default values
  private DEFAULT_CURRENCY = 'USD';
  private DEFAULT_LOCALE = 'en-US';
  private DEFAULT_DECIMAL_PLACES = 2;
  
  // Behavior subjects for reactive updates
  private currencyCodeSubject = new BehaviorSubject<string>(this.DEFAULT_CURRENCY);
  private localeSubject = new BehaviorSubject<string>(this.DEFAULT_LOCALE);
  private decimalPlacesSubject = new BehaviorSubject<number>(this.DEFAULT_DECIMAL_PLACES);
  
  // Observable streams
  readonly currencyCode$ = this.currencyCodeSubject.asObservable();
  readonly locale$ = this.localeSubject.asObservable();
  readonly decimalPlaces$ = this.decimalPlacesSubject.asObservable();
  
  // Current values
  get currencyCode(): string {
    return this.currencyCodeSubject.value;
  }
  
  get locale(): string {
    return this.localeSubject.value;
  }
  
  get decimalPlaces(): number {
    return this.decimalPlacesSubject.value;
  }
  
  constructor() { }
  
  /**
   * Set the currency code
   */
  setCurrencyCode(currencyCode: string): void {
    this.currencyCodeSubject.next(currencyCode);
  }
  
  /**
   * Set the locale
   */
  setLocale(locale: string): void {
    this.localeSubject.next(locale);
  }
  
  /**
   * Set the decimal places
   */
  setDecimalPlaces(decimalPlaces: number): void {
    this.decimalPlacesSubject.next(decimalPlaces);
  }
  
  /**
   * Format a value as currency
   */
  format(value: number | string | null | undefined, currencyCode?: string, locale?: string): string {
    return formatCurrency(
      value,
      currencyCode || this.currencyCode,
      locale || this.locale
    );
  }
  
  /**
   * Format a value as an amount (without currency symbol)
   */
  formatAsAmount(value: number | string | null | undefined, locale?: string, decimalPlaces?: number): string {
    return formatAmount(
      value,
      locale || this.locale,
      decimalPlaces !== undefined ? decimalPlaces : this.decimalPlaces
    );
  }
  
  /**
   * Format a value as a percentage
   */
  formatAsPercentage(value: number | string | null | undefined, locale?: string, decimalPlaces?: number): string {
    return formatPercentage(
      value,
      locale || this.locale,
      decimalPlaces !== undefined ? decimalPlaces : this.decimalPlaces
    );
  }
  
  /**
   * Format a value as a number
   */
  formatAsNumber(value: number | string | null | undefined, locale?: string, decimalPlaces?: number): string {
    return formatNumber(
      value,
      locale || this.locale,
      decimalPlaces !== undefined ? decimalPlaces : this.decimalPlaces
    );
  }
  
  /**
   * Format a raw amount
   */
  formatRawAmount(amount: number | null | undefined, decimalPlaces?: number): string {
    return formatRawAmount(
      amount,
      decimalPlaces !== undefined ? decimalPlaces : this.decimalPlaces
    );
  }
  
  /**
   * Parse a string into a number
   */
  parse(value: string | null | undefined): number | null {
    return parseAmount(value);
  }
  
  /**
   * Calculate EMI (Equated Monthly Installment)
   */
  calculateLoanEMI(principal: number, interestRate: number, termInMonths: number): number {
    return calculateEMI(principal, interestRate, termInMonths);
  }
  
  /**
   * Calculate compound interest
   */
  calculateInterest(principal: number, rate: number, time: number, frequency: number = 1): number {
    return calculateCompoundInterest(principal, rate, time, frequency);
  }
  
  /**
   * Calculate amortization schedule
   */
  getAmortizationSchedule(principal: number, interestRate: number, termInMonths: number): Array<{
    period: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }> {
    return calculateAmortizationSchedule(principal, interestRate, termInMonths);
  }
  
  /**
   * Convert between currencies
   */
  convert(amount: number, fromCurrency: string, toCurrency: string, exchangeRate: number): number {
    return convertCurrency(amount, fromCurrency, toCurrency, exchangeRate);
  }
  
  /**
   * Convert from minor units (cents) to major units (dollars)
   */
  toMajorUnits(minorUnits: number, decimalPlaces?: number): number {
    return minorToMajor(
      minorUnits,
      decimalPlaces !== undefined ? decimalPlaces : this.decimalPlaces
    );
  }
  
  /**
   * Convert from major units (dollars) to minor units (cents)
   */
  toMinorUnits(majorUnits: number, decimalPlaces?: number): number {
    return majorToMinor(
      majorUnits,
      decimalPlaces !== undefined ? decimalPlaces : this.decimalPlaces
    );
  }
}