import { format, isValid, parse } from 'date-fns';

/**
 * Format a date to a string using the specified format
 * @param date Date object or string
 * @param formatString Date format string (default: 'yyyy-MM-dd')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number | null | undefined, formatString: string = 'yyyy-MM-dd'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatString);
}

/**
 * Format a date as a human-readable string (e.g., "5 days ago")
 * @param date Date object or string
 * @returns Human-readable date string
 */
export function formatRelativeDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!isValid(dateObj)) return '';
  
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 31) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Format a date range as a string
 * @param startDate Start date object or string
 * @param endDate End date object or string
 * @param formatString Date format string (default: 'MMM d, yyyy')
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: Date | string | null | undefined, endDate: Date | string | null | undefined, formatString: string = 'MMM d, yyyy'): string {
  if (!startDate && !endDate) return '';
  
  const formattedStart = startDate ? formatDate(startDate, formatString) : '';
  const formattedEnd = endDate ? formatDate(endDate, formatString) : '';
  
  if (formattedStart && formattedEnd) {
    return `${formattedStart} - ${formattedEnd}`;
  } else if (formattedStart) {
    return `From ${formattedStart}`;
  } else {
    return `Until ${formattedEnd}`;
  }
}

/**
 * Format a date for API submission (ISO format)
 * @param date Date object or string
 * @returns ISO formatted date string
 */
export function formatDateForApi(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(dateObj)) return '';
  
  return dateObj.toISOString().split('T')[0];
}