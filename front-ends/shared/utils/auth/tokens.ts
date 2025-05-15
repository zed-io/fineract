/**
 * Shared authentication token utilities
 * These functions handle token storage, retrieval, and validation
 */

// Token storage keys
export const TOKEN_STORAGE_KEY = 'fineract_auth_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'fineract_refresh_token';
export const TOKEN_EXPIRY_KEY = 'fineract_token_expiry';

/**
 * Token storage type (local or session)
 */
export type TokenStorageType = 'local' | 'session';

/**
 * Get the appropriate storage object based on the storage type
 * @param type Storage type ('local' or 'session')
 * @returns Storage object
 */
export const getStorage = (type: TokenStorageType = 'local'): Storage => {
  return type === 'local' ? localStorage : sessionStorage;
};

/**
 * Save authentication token to storage
 * @param token JWT token
 * @param refreshToken Refresh token (optional)
 * @param expiresIn Expiration time in seconds (optional)
 * @param storageType Storage type ('local' or 'session')
 */
export const saveToken = (
  token: string,
  refreshToken?: string,
  expiresIn?: number,
  storageType: TokenStorageType = 'local'
): void => {
  const storage = getStorage(storageType);
  
  // Save the token
  storage.setItem(TOKEN_STORAGE_KEY, token);
  
  // Save refresh token if provided
  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
  
  // Calculate and save expiry time if provided
  if (expiresIn) {
    const expiryTime = Date.now() + expiresIn * 1000;
    storage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
};

/**
 * Get authentication token from storage
 * @param storageType Storage type ('local' or 'session')
 * @returns Authentication token or null if not found
 */
export const getToken = (storageType: TokenStorageType = 'local'): string | null => {
  const storage = getStorage(storageType);
  return storage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Get refresh token from storage
 * @param storageType Storage type ('local' or 'session')
 * @returns Refresh token or null if not found
 */
export const getRefreshToken = (storageType: TokenStorageType = 'local'): string | null => {
  const storage = getStorage(storageType);
  return storage.getItem(REFRESH_TOKEN_STORAGE_KEY);
};

/**
 * Check if the token is expired
 * @param storageType Storage type ('local' or 'session')
 * @returns True if token is expired or expiry time is not found
 */
export const isTokenExpired = (storageType: TokenStorageType = 'local'): boolean => {
  const storage = getStorage(storageType);
  const expiryTimeStr = storage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!expiryTimeStr) {
    return true;
  }
  
  const expiryTime = parseInt(expiryTimeStr, 10);
  return Date.now() > expiryTime;
};

/**
 * Clear all authentication tokens from storage
 * @param storageType Storage type ('local' or 'session')
 */
export const clearTokens = (storageType: TokenStorageType = 'local'): void => {
  const storage = getStorage(storageType);
  storage.removeItem(TOKEN_STORAGE_KEY);
  storage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  storage.removeItem(TOKEN_EXPIRY_KEY);
};

/**
 * Parse a JWT token to get its payload
 * @param token JWT token
 * @returns Decoded token payload or null if invalid
 */
export const parseJwt = (token: string): any | null => {
  try {
    // Split the token and get the payload part
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode the base64 payload
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

/**
 * Get user information from the JWT token
 * @param storageType Storage type ('local' or 'session')
 * @returns User information from token or null if not available
 */
export const getUserFromToken = (storageType: TokenStorageType = 'local'): any | null => {
  const token = getToken(storageType);
  
  if (!token) {
    return null;
  }
  
  return parseJwt(token);
};

/**
 * Check if a user is authenticated
 * @param storageType Storage type ('local' or 'session')
 * @returns True if user is authenticated with a valid token
 */
export const isAuthenticated = (storageType: TokenStorageType = 'local'): boolean => {
  const token = getToken(storageType);
  return !!token && !isTokenExpired(storageType);
};