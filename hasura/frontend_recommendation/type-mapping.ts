// Type mapping utilities to handle inconsistencies between backend and frontend

/**
 * Convert string IDs to numbers when working with Hasura data
 * This addresses the String vs Int ID mismatch in the schema
 */
export const stringToNumberId = (id: string | null | undefined): number | null => {
  if (id === null || id === undefined) return null;
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Convert number IDs to strings when sending to Hasura
 */
export const numberToStringId = (id: number | null | undefined): string | null => {
  if (id === null || id === undefined) return null;
  return id.toString();
};

/**
 * Convert string UUID to proper UUID type if needed
 */
export const ensureUUID = (uuid: string): string => {
  // Basic validation - could be enhanced for stricter UUID validation
  if (typeof uuid !== 'string' || !uuid.trim()) {
    throw new Error('Invalid UUID format');
  }
  return uuid;
};

/**
 * Parse string date from API to Date object
 */
export const parseAPIDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Format Date object to string for API requests
 */
export const formatDateForAPI = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

/**
 * Type-safe handling of JSON scalar
 */
export const parseJSON = <T>(jsonString: string | null | undefined, defaultValue: T): T => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return defaultValue;
  }
};

/**
 * Utility to convert between backend and frontend enum values
 */
export const mapEnumValue = <T extends Record<string, string>>(
  value: string | null | undefined,
  mapping: T,
  defaultValue: keyof T
): keyof T => {
  if (!value) return defaultValue;
  
  // Find the key in the mapping whose value matches the input
  const entry = Object.entries(mapping).find(([_, val]) => val === value);
  return entry ? (entry[0] as keyof T) : defaultValue;
};

/**
 * Type-safe accessor for nested properties
 */
export const getNestedProperty = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | null => {
  if (!obj) return null;
  return obj[key];
};