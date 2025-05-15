import * as crypto from 'crypto';

/**
 * Generate a random token with the specified length
 * @param length Token length
 * @returns Random token string
 */
export function generateToken(length: number): string {
  if (length <= 0) {
    throw new Error('Token length must be greater than 0');
  }
  
  // For numeric-only OTPs (easier to type on mobile)
  if (length <= 10) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
  
  // For longer tokens, use more entropy
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').slice(0, length);
}

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}