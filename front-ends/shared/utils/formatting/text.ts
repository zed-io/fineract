/**
 * Capitalize the first letter of a string
 * @param text String to capitalize
 * @returns Capitalized string
 */
export function capitalizeFirstLetter(text: string | null | undefined): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a string to title case (capitalize first letter of each word)
 * @param text String to convert
 * @returns Title-cased string
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param text String to truncate
 * @param maxLength Maximum length
 * @param ellipsis Ellipsis string (default: '...')
 * @returns Truncated string
 */
export function truncateString(text: string | null | undefined, maxLength: number, ellipsis: string = '...'): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Convert camelCase to human-readable format
 * @param text camelCase string
 * @param capitalize Whether to capitalize the first letter (default: true)
 * @returns Human-readable string
 */
export function camelCaseToHuman(text: string | null | undefined, capitalize: boolean = true): string {
  if (!text) return '';
  
  // Insert a space before each uppercase letter that follows a lowercase letter
  const spaced = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  return capitalize ? capitalizeFirstLetter(spaced) : spaced;
}

/**
 * Strip HTML tags from a string
 * @param html HTML string
 * @returns Plain text string
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

/**
 * Format a name (first, middle, last)
 * @param firstName First name
 * @param lastName Last name
 * @param middleName Middle name or initial (optional)
 * @returns Formatted full name
 */
export function formatName(firstName: string | null | undefined, lastName: string | null | undefined, middleName?: string | null): string {
  const first = firstName || '';
  const last = lastName || '';
  const middle = middleName ? ` ${middleName} ` : ' ';
  
  if (!first && !last) return '';
  if (!first) return last;
  if (!last) return first;
  
  return `${first}${middle}${last}`;
}

/**
 * Get initials from a name
 * @param fullName Full name
 * @param maxInitials Maximum number of initials (default: 2)
 * @returns Initials string
 */
export function getInitials(fullName: string | null | undefined, maxInitials: number = 2): string {
  if (!fullName) return '';
  
  return fullName
    .split(' ')
    .filter(namePart => namePart.length > 0)
    .slice(0, maxInitials)
    .map(namePart => namePart[0].toUpperCase())
    .join('');
}

/**
 * Format a string as an ID/reference number
 * @param value String to format
 * @param prefix Prefix to add (default: '')
 * @param padLength Length to pad to (default: 0)
 * @returns Formatted ID string
 */
export function formatId(value: string | number | null | undefined, prefix: string = '', padLength: number = 0): string {
  if (value === null || value === undefined) return '';
  
  const strValue = typeof value === 'number' ? value.toString() : value;
  const paddedValue = padLength > 0 ? strValue.padStart(padLength, '0') : strValue;
  
  return `${prefix}${paddedValue}`;
}

/**
 * Format a string for URL slugs (lowercase, hyphenated)
 * @param text String to format
 * @returns URL-friendly slug
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')   // Remove non-alphanumeric characters
    .replace(/-+/g, '-')          // Replace multiple hyphens with a single hyphen
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
}