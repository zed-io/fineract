"use strict";
/**
 * Authentication and Authorization Models for Fineract
 * These interfaces define the structures for users, roles, permissions, and tokens
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_CONFIG = exports.TokenType = exports.PASSWORD_VALIDATION = exports.AccountNotActiveError = exports.InvalidCredentialsError = exports.TenantNotFoundError = exports.PasswordMismatchError = exports.PasswordRequirementsError = exports.InvalidTokenError = exports.TokenExpiredError = exports.AccountLockError = exports.AuthorizationError = exports.AuthenticationError = exports.AuthError = exports.PermissionAction = exports.PermissionGroup = exports.UserStatus = void 0;
exports.hasPermission = hasPermission;
exports.getUserPermissionCodes = getUserPermissionCodes;
exports.validatePassword = validatePassword;
/**
 * User status enum
 */
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["LOCKED"] = "locked";
    UserStatus["PASSWORD_EXPIRED"] = "password_expired";
    UserStatus["PASSWORD_RESET_REQUIRED"] = "password_reset_required";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
/**
 * Permission grouping enum
 */
var PermissionGroup;
(function (PermissionGroup) {
    PermissionGroup["SPECIAL"] = "special";
    PermissionGroup["CONFIGURATION"] = "configuration";
    PermissionGroup["USER"] = "user";
    PermissionGroup["ROLE"] = "role";
    PermissionGroup["OFFICE"] = "office";
    PermissionGroup["STAFF"] = "staff";
    PermissionGroup["CLIENT"] = "client";
    PermissionGroup["LOAN"] = "loan";
    PermissionGroup["SAVINGS"] = "savings";
    PermissionGroup["PORTFOLIO"] = "portfolio";
    PermissionGroup["ACCOUNTING"] = "accounting";
    PermissionGroup["TRANSACTION"] = "transaction";
    PermissionGroup["REPORT"] = "report";
})(PermissionGroup || (exports.PermissionGroup = PermissionGroup = {}));
/**
 * Permission action types
 */
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["ALL"] = "ALL";
    PermissionAction["CREATE"] = "CREATE";
    PermissionAction["READ"] = "READ";
    PermissionAction["UPDATE"] = "UPDATE";
    PermissionAction["DELETE"] = "DELETE";
    PermissionAction["APPROVE"] = "APPROVE";
    PermissionAction["REJECT"] = "REJECT";
    PermissionAction["WITHDRAW"] = "WITHDRAW";
    PermissionAction["ACTIVATE"] = "ACTIVATE";
    PermissionAction["CLOSE"] = "CLOSE";
    PermissionAction["DISBURSE"] = "DISBURSE";
    PermissionAction["DEPOSIT"] = "DEPOSIT";
    PermissionAction["WITHDRAWAL"] = "WITHDRAWAL";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
/**
 * Custom error types for authentication and authorization
 */
class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
class AuthenticationError extends AuthError {
    constructor(message = 'Invalid credentials') {
        super(message);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AuthError {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class AccountLockError extends AuthError {
    constructor(message = 'Account is locked') {
        super(message);
        this.name = 'AccountLockError';
    }
}
exports.AccountLockError = AccountLockError;
class TokenExpiredError extends AuthError {
    constructor(message = 'Token has expired') {
        super(message);
        this.name = 'TokenExpiredError';
    }
}
exports.TokenExpiredError = TokenExpiredError;
class InvalidTokenError extends AuthError {
    constructor(message = 'Invalid token') {
        super(message);
        this.name = 'InvalidTokenError';
    }
}
exports.InvalidTokenError = InvalidTokenError;
class PasswordRequirementsError extends AuthError {
    constructor(message = 'Password does not meet requirements') {
        super(message);
        this.name = 'PasswordRequirementsError';
    }
}
exports.PasswordRequirementsError = PasswordRequirementsError;
class PasswordMismatchError extends AuthError {
    constructor(message = 'Passwords do not match') {
        super(message);
        this.name = 'PasswordMismatchError';
    }
}
exports.PasswordMismatchError = PasswordMismatchError;
class TenantNotFoundError extends AuthError {
    constructor(message = 'Tenant not found') {
        super(message);
        this.name = 'TenantNotFoundError';
    }
}
exports.TenantNotFoundError = TenantNotFoundError;
class InvalidCredentialsError extends AuthError {
    constructor(message = 'Invalid credentials') {
        super(message);
        this.name = 'InvalidCredentialsError';
    }
}
exports.InvalidCredentialsError = InvalidCredentialsError;
class AccountNotActiveError extends AuthError {
    constructor(message = 'Account is not active') {
        super(message);
        this.name = 'AccountNotActiveError';
    }
}
exports.AccountNotActiveError = AccountNotActiveError;
/**
 * Checks if a user has a specific permission
 * @param user The user to check permissions for
 * @param permissionCode The permission code to check
 * @returns true if the user has the permission, false otherwise
 */
function hasPermission(user, permissionCode) {
    // Super user has all permissions
    if (user.roles.some(role => role.name === 'Super user')) {
        return true;
    }
    // Check for specific permission in user's roles
    return user.roles.some(role => !role.isDisabled &&
        role.permissions.some(permission => !permission.isDisabled && permission.code === permissionCode));
}
/**
 * Gets a list of all permission codes a user has
 * @param user The user to get permissions for
 * @returns Array of permission codes
 */
function getUserPermissionCodes(user) {
    // Super user has special ALL_FUNCTIONS permission
    if (user.roles.some(role => role.name === 'Super user')) {
        return ['ALL_FUNCTIONS'];
    }
    // Get all permission codes from user's roles
    const permissionCodes = new Set();
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
exports.PASSWORD_VALIDATION = {
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
function validatePassword(password) {
    if (!password || password.length < exports.PASSWORD_VALIDATION.MIN_LENGTH) {
        return {
            isValid: false,
            message: `Password must be at least ${exports.PASSWORD_VALIDATION.MIN_LENGTH} characters long`
        };
    }
    if (password.length > exports.PASSWORD_VALIDATION.MAX_LENGTH) {
        return {
            isValid: false,
            message: `Password must be no more than ${exports.PASSWORD_VALIDATION.MAX_LENGTH} characters long`
        };
    }
    if (exports.PASSWORD_VALIDATION.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one uppercase letter'
        };
    }
    if (exports.PASSWORD_VALIDATION.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one lowercase letter'
        };
    }
    if (exports.PASSWORD_VALIDATION.REQUIRE_NUMBER && !/\d/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one number'
        };
    }
    if (exports.PASSWORD_VALIDATION.REQUIRE_SPECIAL_CHAR &&
        !new RegExp(`[${exports.PASSWORD_VALIDATION.SPECIAL_CHARS.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password)) {
        return {
            isValid: false,
            message: `Password must contain at least one special character (${exports.PASSWORD_VALIDATION.SPECIAL_CHARS})`
        };
    }
    return { isValid: true };
}
/**
 * Token types
 */
var TokenType;
(function (TokenType) {
    TokenType["ACCESS"] = "access";
    TokenType["REFRESH"] = "refresh";
    TokenType["RESET_PASSWORD"] = "reset_password";
})(TokenType || (exports.TokenType = TokenType = {}));
/**
 * Token configuration
 */
exports.TOKEN_CONFIG = {
    ACCESS_TOKEN_EXPIRY: 60 * 60, // 1 hour in seconds
    REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 days in seconds
    RESET_TOKEN_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
    ALGORITHM: 'HS256'
};
