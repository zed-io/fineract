import { parse, isValid, parseISO } from 'date-fns';

/**
 * Parse a date string into a Date object
 * @param dateString Date string to parse
 * @param formatString Format of the date string (default: 'yyyy-MM-dd')
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string | null | undefined, formatString: string = 'yyyy-MM-dd'): Date | null {
  if (!dateString) return null;
  
  try {
    // Try parsing as ISO first
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) return isoDate;
    
    // Fallback to parse with provided format
    const parsedDate = parse(dateString, formatString, new Date());
    return isValid(parsedDate) ? parsedDate : null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse a date from a Fineract API response
 * Fineract API can return dates in different formats
 * @param apiDate Date from API (can be string, array, or object with date and month properties)
 * @returns Parsed Date object or null if invalid
 */
export function parseFineractDate(apiDate: string | number[] | { year: number; month: number; day: number } | null | undefined): Date | null {
  if (!apiDate) return null;
  
  try {
    // Handle string dates
    if (typeof apiDate === 'string') {
      return parseDate(apiDate);
    }
    
    // Handle array format [year, month, day]
    if (Array.isArray(apiDate) && apiDate.length >= 3) {
      const [year, month, day] = apiDate;
      // Month in JS is 0-indexed
      return new Date(year, month - 1, day);
    }
    
    // Handle object format { year, month, day }
    if (typeof apiDate === 'object' && 'year' in apiDate && 'month' in apiDate && 'day' in apiDate) {
      return new Date(apiDate.year, apiDate.month - 1, apiDate.day);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert a Date object to Fineract API-compatible array format
 * @param date Date object to convert
 * @returns Array in format [year, month, day] or null if invalid
 */
export function dateToFineractArray(date: Date | string | null | undefined): number[] | null {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj || !isValid(dateObj)) return null;
  
  return [
    dateObj.getFullYear(),
    dateObj.getMonth() + 1, // Month is 0-indexed in JS
    dateObj.getDate()
  ];
}