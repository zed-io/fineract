import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import duration from 'dayjs/plugin/duration';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(dayOfYear);
dayjs.extend(duration);

export interface DateFormatOptions {
  /**
   * Format string to use
   * @default 'YYYY-MM-DD'
   */
  format?: string;
  /**
   * Whether to convert to UTC before formatting
   * @default false
   */
  utc?: boolean;
  /**
   * Timezone to use for conversion
   */
  timezone?: string;
  /**
   * Locale to use for formatting
   * @default 'en'
   */
  locale?: string;
}

const DEFAULT_DATE_FORMAT_OPTIONS: DateFormatOptions = {
  format: 'YYYY-MM-DD',
  utc: false,
  locale: 'en'
};

/**
 * Common date formats used in financial applications
 */
export enum DateFormats {
  /**
   * ISO date format (YYYY-MM-DD)
   */
  ISO_DATE = 'YYYY-MM-DD',
  /**
   * ISO datetime format (YYYY-MM-DDTHH:mm:ss)
   */
  ISO_DATETIME = 'YYYY-MM-DDTHH:mm:ss',
  /**
   * ISO datetime with timezone (YYYY-MM-DDTHH:mm:ssZ)
   */
  ISO_DATETIME_TZ = 'YYYY-MM-DDTHH:mm:ssZ',
  /**
   * Short date format (MM/DD/YYYY)
   */
  SHORT_DATE = 'MM/DD/YYYY',
  /**
   * Long date format (MMMM D, YYYY)
   */
  LONG_DATE = 'MMMM D, YYYY',
  /**
   * Short datetime format (MM/DD/YYYY HH:mm)
   */
  SHORT_DATETIME = 'MM/DD/YYYY HH:mm',
  /**
   * Financial date format (DD-MMM-YYYY)
   */
  FINANCIAL_DATE = 'DD-MMM-YYYY'
}

/**
 * Format a date using the specified options
 * 
 * @param date The date to format
 * @param options Formatting options
 * @returns A formatted date string
 * 
 * @example
 * ```ts
 * formatDate(new Date()); // '2023-04-25'
 * formatDate('2023-04-25', { format: DateFormats.LONG_DATE }); // 'April 25, 2023'
 * formatDate(1682402400000, { format: DateFormats.SHORT_DATE }); // '04/25/2023'
 * ```
 */
export function formatDate(
  date: Date | string | number,
  options?: Partial<DateFormatOptions>
): string {
  const opts = { ...DEFAULT_DATE_FORMAT_OPTIONS, ...(options || {}) };
  
  let dayjsDate = dayjs(date);
  
  if (opts.locale) {
    dayjsDate = dayjsDate.locale(opts.locale);
  }
  
  if (opts.utc) {
    dayjsDate = dayjsDate.utc();
  } else if (opts.timezone) {
    dayjsDate = dayjsDate.tz(opts.timezone);
  }
  
  return dayjsDate.format(opts.format);
}

/**
 * Parse a date string using the specified format
 * 
 * @param dateString The date string to parse
 * @param format The format of the date string
 * @param options Additional options
 * @returns A Date object
 * 
 * @example
 * ```ts
 * parseDate('2023-04-25', DateFormats.ISO_DATE); // Date object
 * parseDate('April 25, 2023', DateFormats.LONG_DATE); // Date object
 * parseDate('04/25/2023', DateFormats.SHORT_DATE); // Date object
 * ```
 */
export function parseDate(
  dateString: string,
  format: string,
  options?: Partial<DateFormatOptions>
): Date {
  const opts = { ...DEFAULT_DATE_FORMAT_OPTIONS, ...(options || {}) };
  
  let dayjsDate = dayjs(dateString, format);
  
  if (opts.locale) {
    dayjsDate = dayjsDate.locale(opts.locale);
  }
  
  if (opts.utc) {
    dayjsDate = dayjsDate.utc();
  } else if (opts.timezone) {
    dayjsDate = dayjsDate.tz(opts.timezone);
  }
  
  return dayjsDate.toDate();
}

/**
 * Calculate the difference between two dates in the specified unit
 * 
 * @param date1 The first date
 * @param date2 The second date
 * @param unit The unit to use for the difference
 * @returns The difference in the specified unit
 * 
 * @example
 * ```ts
 * dateDiff('2023-04-25', '2023-04-20', 'day'); // 5
 * dateDiff('2023-04-25', '2023-03-25', 'month'); // 1
 * dateDiff('2023-04-25', '2022-04-25', 'year'); // 1
 * ```
 */
export function dateDiff(
  date1: Date | string | number,
  date2: Date | string | number,
  unit: dayjs.OpUnitType
): number {
  const d1 = dayjs(date1);
  const d2 = dayjs(date2);
  
  return d1.diff(d2, unit);
}

/**
 * Add a specified amount of time to a date
 * 
 * @param date The date to add to
 * @param amount The amount to add
 * @param unit The unit of time to add
 * @returns A new Date object
 * 
 * @example
 * ```ts
 * addToDate('2023-04-25', 5, 'day'); // '2023-04-30'
 * addToDate('2023-04-25', 1, 'month'); // '2023-05-25'
 * addToDate('2023-04-25', 1, 'year'); // '2024-04-25'
 * ```
 */
export function addToDate(
  date: Date | string | number,
  amount: number,
  unit: dayjs.ManipulateType
): Date {
  return dayjs(date).add(amount, unit).toDate();
}

/**
 * Subtract a specified amount of time from a date
 * 
 * @param date The date to subtract from
 * @param amount The amount to subtract
 * @param unit The unit of time to subtract
 * @returns A new Date object
 * 
 * @example
 * ```ts
 * subtractFromDate('2023-04-25', 5, 'day'); // '2023-04-20'
 * subtractFromDate('2023-04-25', 1, 'month'); // '2023-03-25'
 * subtractFromDate('2023-04-25', 1, 'year'); // '2022-04-25'
 * ```
 */
export function subtractFromDate(
  date: Date | string | number,
  amount: number,
  unit: dayjs.ManipulateType
): Date {
  return dayjs(date).subtract(amount, unit).toDate();
}

/**
 * Check if a date is within a specific range
 * 
 * @param date The date to check
 * @param startDate The start of the range
 * @param endDate The end of the range
 * @param inclusivity Whether to include the start and end dates
 * @returns Whether the date is within the range
 * 
 * @example
 * ```ts
 * isDateInRange('2023-04-25', '2023-04-20', '2023-04-30'); // true
 * isDateInRange('2023-04-25', '2023-04-25', '2023-04-30', '[]'); // true
 * isDateInRange('2023-04-25', '2023-04-26', '2023-04-30'); // false
 * ```
 */
export function isDateInRange(
  date: Date | string | number,
  startDate: Date | string | number,
  endDate: Date | string | number,
  inclusivity: '()' | '[)' | '(]' | '[]' = '[]'
): boolean {
  return dayjs(date).isBetween(startDate, endDate, null, inclusivity);
}

/**
 * Check if a date is before another date
 * 
 * @param date1 The first date
 * @param date2 The second date
 * @param unit The unit to use for comparison
 * @returns Whether date1 is before date2
 * 
 * @example
 * ```ts
 * isDateBefore('2023-04-20', '2023-04-25'); // true
 * isDateBefore('2023-04-25', '2023-04-25'); // false
 * isDateBefore('2023-04-25 12:00', '2023-04-25 13:00', 'hour'); // true
 * ```
 */
export function isDateBefore(
  date1: Date | string | number,
  date2: Date | string | number,
  unit?: dayjs.OpUnitType
): boolean {
  return dayjs(date1).isBefore(date2, unit);
}

/**
 * Check if a date is after another date
 * 
 * @param date1 The first date
 * @param date2 The second date
 * @param unit The unit to use for comparison
 * @returns Whether date1 is after date2
 * 
 * @example
 * ```ts
 * isDateAfter('2023-04-25', '2023-04-20'); // true
 * isDateAfter('2023-04-25', '2023-04-25'); // false
 * isDateAfter('2023-04-25 13:00', '2023-04-25 12:00', 'hour'); // true
 * ```
 */
export function isDateAfter(
  date1: Date | string | number,
  date2: Date | string | number,
  unit?: dayjs.OpUnitType
): boolean {
  return dayjs(date1).isAfter(date2, unit);
}

/**
 * Calculate the number of business days between two dates
 * 
 * @param startDate The start date
 * @param endDate The end date
 * @param holidays Optional array of holiday dates to exclude
 * @returns The number of business days
 * 
 * @example
 * ```ts
 * getBusinessDays('2023-04-17', '2023-04-21'); // 5 (Monday to Friday)
 * getBusinessDays('2023-04-17', '2023-04-23'); // 5 (Monday to Friday, excluding weekend)
 * ```
 */
export function getBusinessDays(
  startDate: Date | string | number,
  endDate: Date | string | number,
  holidays: Array<Date | string | number> = []
): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (end.isBefore(start)) {
    return 0;
  }
  
  // Convert holidays to dayjs objects
  const holidayDates = holidays.map(h => dayjs(h).format('YYYY-MM-DD'));
  
  let businessDays = 0;
  let currentDate = start;
  
  while (currentDate.isSameOrBefore(end, 'day')) {
    // Check if it's a weekday (not Saturday or Sunday) and not a holiday
    const dayOfWeek = currentDate.day();
    const dateStr = currentDate.format('YYYY-MM-DD');
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.includes(dateStr)) {
      businessDays++;
    }
    
    currentDate = currentDate.add(1, 'day');
  }
  
  return businessDays;
}

/**
 * Calculate the end date after adding a specific number of business days
 * 
 * @param startDate The start date
 * @param businessDays The number of business days to add
 * @param holidays Optional array of holiday dates to exclude
 * @returns The resulting end date
 * 
 * @example
 * ```ts
 * addBusinessDays('2023-04-17', 5); // '2023-04-21' (5 business days from Monday)
 * addBusinessDays('2023-04-21', 3); // '2023-04-26' (3 business days from Friday, skipping weekend)
 * ```
 */
export function addBusinessDays(
  startDate: Date | string | number,
  businessDays: number,
  holidays: Array<Date | string | number> = []
): Date {
  const start = dayjs(startDate);
  
  // Convert holidays to dayjs objects
  const holidayDates = holidays.map(h => dayjs(h).format('YYYY-MM-DD'));
  
  let currentDate = start;
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    currentDate = currentDate.add(1, 'day');
    
    // Check if it's a weekday (not Saturday or Sunday) and not a holiday
    const dayOfWeek = currentDate.day();
    const dateStr = currentDate.format('YYYY-MM-DD');
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.includes(dateStr)) {
      daysAdded++;
    }
  }
  
  return currentDate.toDate();
}

/**
 * Get today's date at midnight for consistent date comparisons
 */
export function today(): Date {
  return dayjs().startOf('day').toDate();
}

export { dayjs };