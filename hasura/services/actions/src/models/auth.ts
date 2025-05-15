/**
 * Authentication and Authorization Models for Fineract
 * These interfaces define the structures for users, roles, permissions, and tokens
 */

/**
 * User status enum
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
  PASSWORD_EXPIRED = 'password_expired',
  PASSWORD_RESET_REQUIRED = 'password_reset_required'
}

/**
 * Permission grouping enum
 */
export enum PermissionGroup {
  SPECIAL = 'special',
  CONFIGURATION = 'configuration',
  USER = 'user',
  ROLE = 'role',
  OFFICE = 'office',
  STAFF = 'staff',
  CLIENT = 'client',
  LOAN = 'loan',
  SAVINGS = 'savings',
  PORTFOLIO = 'portfolio',
  ACCOUNTING = 'accounting',
  TRANSACTION = 'transaction',
  REPORT = 'report'
}

/**
 * Permission action types
 */
export enum PermissionAction {
  ALL = 'ALL',
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  WITHDRAW = 'WITHDRAW',
  ACTIVATE = 'ACTIVATE',
  CLOSE = 'CLOSE',
  DISBURSE = 'DISBURSE',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL'
}

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  passwordHash: string;
  passwordNeverExpires: boolean;
  isDeleted: boolean;
  lastTimePasswordUpdated?: Date;
  passwordExpired: boolean;
  isLocked: boolean;
  accountNonExpired: boolean;
  isEnabled: boolean;
  requiresPasswordReset: boolean;
  failedAttemptCount: number;
  lastLogin?: Date;
  officeId?: string;
  staffId?: string;
  roles: Role[];
  tenantId?: string;
  createdDate?: Date;
  lastModifiedDate?: Date;
}

/**
 * User create/update input
 */
export interface UserInput {
  username: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  password: string;
  repeatPassword: string;
  officeId: string;
  staffId?: string;
  roles: string[];
  isSelfServiceUser?: boolean;
  sendPasswordToEmail?: boolean;
}

/**
 * User authentication credentials
 */
export interface UserCredentials {
  username: string;
  password: string;
}

/**
 * User token response
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  roles: string[];
  permissions: PermissionData[];
  userBasicInfo: UserBasicInfo;
}

/**
 * Basic user information (safe to share with client)
 */
export interface UserBasicInfo {
  id: string;
  username: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  displayName: string;
  officeId?: string;
  officeName?: string;
  staffId?: string;
  staffName?: string;
  lastLogin?: Date;
  isSuperUser: boolean;
  tenantId?: string;
}

/**
 * Role interface
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  isDisabled: boolean;
  isSelfServiceRole: boolean;
  permissions: Permission[];
  createdDate?: Date;
  lastModifiedDate?: Date;
}

/**
 * Role input for creation/update
 */
export interface RoleInput {
  name: string;
  description?: string;
  isSelfServiceRole?: boolean;
  permissions: string[];
}

/**
 * Permission interface
 */
export interface Permission {
  id: string;
  grouping: PermissionGroup;
  code: string;
  entityName: string;
  actionName: PermissionAction;
  canMakerChecker: boolean;
  description?: string;
  isDisabled: boolean;
  createdDate?: Date;
  lastModifiedDate?: Date;
}

/**
 * Permission data for token responses
 */
export interface PermissionData {
  grouping: string;
  code: string;
  entityName: string;
  actionName: string;
}

/**
 * Interface for JWT payload
 */
export interface JWTPayload {
  sub: string;         // Subject (user ID)
  iat: number;         // Issued at timestamp
  exp: number;         // Expiration timestamp
  roles: string[];     // Role names
  perms: string[];     // Permission codes
  off: string;         // Office ID
  tn: string;          // Tenant ID
  typ: 'access' | 'refresh'; // Token type
  jti: string;         // JWT ID (unique identifier for this token)
}

/**
 * Multi-tenant configuration
 */
export interface TenantConfig {
  id: string;
  name: string;
  identifier: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUsername: string;
  dbPassword: string;
  isActive: boolean;
  createdDate: Date;
  lastModifiedDate?: Date;
}

/**
 * Password change input
 */
export interface PasswordChangeInput {
  oldPassword: string;
  newPassword: string;
  repeatPassword: string;
}

/**
 * Password reset request input
 */
export interface PasswordResetRequestInput {
  username: string;
}

/**
 * Password reset confirmation input
 */
export interface PasswordResetConfirmInput {
  username: string;
  resetToken: string;
  newPassword: string;
  repeatPassword: string;
}

/**
 * Custom error types for authentication and authorization
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthenticationError extends AuthError {
  constructor(message: string = 'Invalid credentials') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AuthError {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AccountLockError extends AuthError {
  constructor(message: string = 'Account is locked') {
    super(message);
    this.name = 'AccountLockError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message: string = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class PasswordRequirementsError extends AuthError {
  constructor(message: string = 'Password does not meet requirements') {
    super(message);
    this.name = 'PasswordRequirementsError';
  }
}

export class PasswordMismatchError extends AuthError {
  constructor(message: string = 'Passwords do not match') {
    super(message);
    this.name = 'PasswordMismatchError';
  }
}

export class TenantNotFoundError extends AuthError {
  constructor(message: string = 'Tenant not found') {
    super(message);
    this.name = 'TenantNotFoundError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message: string = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountNotActiveError extends AuthError {
  constructor(message: string = 'Account is not active') {
    super(message);
    this.name = 'AccountNotActiveError';
  }
}

/**
 * Checks if a user has a specific permission
 * @param user The user to check permissions for
 * @param permissionCode The permission code to check
 * @returns true if the user has the permission, false otherwise
 */
export function hasPermission(user: User, permissionCode: string): boolean {
  // Super user has all permissions
  if (user.roles.some(role => role.name === 'Super user')) {
    return true;
  }
  
  // Check for specific permission in user's roles
  return user.roles.some(role => 
    !role.isDisabled && 
    role.permissions.some(permission => 
      !permission.isDisabled && permission.code === permissionCode
    )
  );
}

/**
 * Gets a list of all permission codes a user has
 * @param user The user to get permissions for
 * @returns Array of permission codes
 */
export function getUserPermissionCodes(user: User): string[] {
  // Super user has special ALL_FUNCTIONS permission
  if (user.roles.some(role => role.name === 'Super user')) {
    return ['ALL_FUNCTIONS'];
  }
  
  // Get all permission codes from user's roles
  const permissionCodes = new Set<string>();
  
  user.roles.forEach(role => {
    if (!role.isDisabled) {
      role.permissions.forEach(permission => {
        if (!permission.isDisabled) {
          permissionCodes.add(permission.code);
        }
      });
    }
  });
  
  return Array.from(permissionCodes);
}

/**
 * Password validation rules
 */
export const PASSWORD_VALIDATION = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
  SPECIAL_CHARS: '!@#$%^&*()_-+=<>?/[]{}|~',
  MAX_LENGTH: 100
};

/**
 * Validates a password against requirements
 * @param password Password to validate
 * @returns Object with validation result and error message
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < PASSWORD_VALIDATION.MIN_LENGTH) {
    return { 
      isValid: false, 
      message: `Password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters long` 
    };
  }
  
  if (password.length > PASSWORD_VALIDATION.MAX_LENGTH) {
    return { 
      isValid: false, 
      message: `Password must be no more than ${PASSWORD_VALIDATION.MAX_LENGTH} characters long` 
    };
  }
  
  if (PASSWORD_VALIDATION.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one uppercase letter' 
    };
  }
  
  if (PASSWORD_VALIDATION.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one lowercase letter' 
    };
  }
  
  if (PASSWORD_VALIDATION.REQUIRE_NUMBER && !/\d/.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one number' 
    };
  }
  
  if (PASSWORD_VALIDATION.REQUIRE_SPECIAL_CHAR && 
      !new RegExp(`[${PASSWORD_VALIDATION.SPECIAL_CHARS.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password)) {
    return { 
      isValid: false, 
      message: `Password must contain at least one special character (${PASSWORD_VALIDATION.SPECIAL_CHARS})` 
    };
  }
  
  return { isValid: true };
}

/**
 * Token types
 */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'reset_password'
}

/**
 * Token configuration
 */
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 60 * 60, // 1 hour in seconds
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 days in seconds
  RESET_TOKEN_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  ALGORITHM: 'HS256'
};

/**
 * JWT token structure
 */
export interface JWTToken {
  token: string;
  expiresAt: Date;
  issuedAt: Date;
  type: TokenType;
}