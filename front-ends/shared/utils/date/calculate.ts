import { addDays, addMonths, addWeeks, addYears, differenceInDays, differenceInMonths, differenceInWeeks, differenceInYears, isAfter, isBefore, isSameDay } from 'date-fns';
import { parseDate } from './parse';

/**
 * Calculate the next date based on frequency
 * @param startDate Base date
 * @param frequency Frequency type ('days', 'weeks', 'months', 'years')
 * @param count Number of frequency units
 * @returns Calculated date
 */
export function calculateNextDate(startDate: Date | string, frequency: 'days' | 'weeks' | 'months' | 'years', count: number): Date {
  const date = typeof startDate === 'string' ? parseDate(startDate) : startDate;
  if (!date) throw new Error('Invalid start date');
  
  switch (frequency) {
    case 'days':
      return addDays(date, count);
    case 'weeks':
      return addWeeks(date, count);
    case 'months':
      return addMonths(date, count);
    case 'years':
      return addYears(date, count);
    default:
      return date;
  }
}

/**
 * Calculate the difference between two dates in the specified unit
 * @param startDate Start date
 * @param endDate End date
 * @param unit Unit to calculate difference in ('days', 'weeks', 'months', 'years')
 * @returns Difference in the specified unit
 */
export function calculateDateDifference(startDate: Date | string, endDate: Date | string, unit: 'days' | 'weeks' | 'months' | 'years'): number {
  const start = typeof startDate === 'string' ? parseDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseDate(endDate) : endDate;
  
  if (!start || !end) throw new Error('Invalid date(s)');
  
  switch (unit) {
    case 'days':
      return differenceInDays(end, start);
    case 'weeks':
      return differenceInWeeks(end, start);
    case 'months':
      return differenceInMonths(end, start);
    case 'years':
      return differenceInYears(end, start);
    default:
      return 0;
  }
}

/**
 * Check if a date is between two other dates (inclusive)
 * @param date Date to check
 * @param startDate Start of range
 * @param endDate End of range
 * @returns True if date is within range
 */
export function isDateInRange(date: Date | string, startDate: Date | string, endDate: Date | string): boolean {
  const checkDate = typeof date === 'string' ? parseDate(date) : date;
  const start = typeof startDate === 'string' ? parseDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseDate(endDate) : endDate;
  
  if (!checkDate || !start || !end) return false;
  
  return (isAfter(checkDate, start) || isSameDay(checkDate, start)) && 
         (isBefore(checkDate, end) || isSameDay(checkDate, end));
}

/**
 * Generate an array of dates between start and end dates at the specified interval
 * @param startDate Range start date
 * @param endDate Range end date
 * @param interval Interval type ('days', 'weeks', 'months')
 * @param intervalCount Number of intervals between dates
 * @returns Array of dates
 */
export function generateDateRange(startDate: Date | string, endDate: Date | string, interval: 'days' | 'weeks' | 'months', intervalCount: number = 1): Date[] {
  const start = typeof startDate === 'string' ? parseDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseDate(endDate) : endDate;
  
  if (!start || !end) return [];
  if (isAfter(start, end)) return [];
  
  const dates: Date[] = [new Date(start)];
  let currentDate = start;
  
  while (isBefore(currentDate, end)) {
    currentDate = calculateNextDate(currentDate, interval, intervalCount);
    
    if (isBefore(currentDate, end) || isSameDay(currentDate, end)) {
      dates.push(new Date(currentDate));
    }
  }
  
  return dates;
}