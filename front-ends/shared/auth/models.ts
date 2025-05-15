/**
 * Shared Authentication Models
 * Common models for authentication across Fineract front-end applications
 */

export type AuthMethod = 'jwt' | 'basic' | 'oauth2' | 'firebase' | 'none';
export type AuthStatus = 'init' | 'authenticating' | 'authenticated' | 'failed' | 'logged_out';

/**
 * Represents a user authenticated in the system
 */
export interface AuthUser {
  id: string | number;
  username: string;
  displayName?: string;
  roles?: string[];
  permissions?: string[];
  officeId?: number;
  officeName?: string;
  staffId?: number;
  staffDisplayName?: string;
  // Additional user properties can be added here
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  username: string;
  password: string;
  remember?: boolean;
  tenantId?: string;
}

/**
 * Represents a JWT or OAuth token
 */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number; // Timestamp in milliseconds
  scope?: string;
}

/**
 * Two-factor authentication request
 */
export interface TwoFactorRequest {
  deliveryMethod: string;
  extendedToken?: boolean;
}

/**
 * Two-factor authentication token
 */
export interface TwoFactorToken {
  token: string;
  validTo: number; // Timestamp in milliseconds
}

/**
 * Auth state shared between applications
 */
export interface AuthState {
  status: AuthStatus;
  user?: AuthUser | null;
  token?: AuthToken | null;
  twoFactorToken?: TwoFactorToken | null;
  tenantId: string;
  authMethod: AuthMethod;
  rememberMe: boolean;
  isTwoFactorRequired: boolean;
  isPasswordExpired: boolean;
}

/**
 * Hasura-specific claims structure for JWT tokens
 */
export interface HasuraClaims {
  'x-hasura-allowed-roles': string[];
  'x-hasura-default-role': string;
  'x-hasura-user-id': string;
  'x-hasura-office-id'?: string;
  'x-hasura-tenant-id'?: string;
  // Additional custom claims can be added here
}

/**
 * Hasura JWT token payload structure
 */
export interface HasuraJwtPayload {
  sub: string;
  name?: string;
  iat?: number;
  exp: number;
  'https://hasura.io/jwt/claims': HasuraClaims;
}

/**
 * Interface for platform-specific storage implementation
 */
export interface AuthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}