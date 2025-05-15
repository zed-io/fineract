"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validator_1 = require("../utils/validator");
const logger_1 = require("../utils/logger");
const authService_1 = require("../services/authService");
const auth_1 = require("../models/auth");
// Create router
exports.authRoutes = (0, express_1.Router)();
/**
 * Login endpoint
 * Authenticates a user and returns tokens
 */
exports.authRoutes.post('/login', (0, validator_1.validateRequest)(['username', 'password']), async (req, res) => {
    try {
        const { username, password, tenantId } = req.body.input;
        const tokenResponse = await (0, authService_1.authenticateUser)({ username, password }, tenantId);
        return res.json({
            success: true,
            message: 'Authentication successful',
            ...tokenResponse
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        let statusCode = 401;
        let message = 'Authentication failed';
        if (error instanceof auth_1.AuthenticationError) {
            message = error.message;
        }
        else if (error instanceof auth_1.AccountLockError) {
            message = 'Account is locked. Please contact an administrator.';
        }
        else if (error instanceof auth_1.AccountNotActiveError) {
            message = 'Account is not active. Please contact an administrator.';
        }
        else if (error instanceof auth_1.TenantNotFoundError) {
            statusCode = 404;
            message = error.message;
        }
        return res.status(statusCode).json({
            success: false,
            message
        });
    }
});
/**
 * Token refresh endpoint
 * Refreshes access token using refresh token
 */
exports.authRoutes.post('/refresh-token', (0, validator_1.validateRequest)(['refreshToken']), async (req, res) => {
    try {
        const { refreshToken } = req.body.input;
        const tokenResponse = await (0, authService_1.refreshTokens)(refreshToken);
        return res.json({
            success: true,
            message: 'Token refreshed successfully',
            ...tokenResponse
        });
    }
    catch (error) {
        logger_1.logger.error('Token refresh error:', error);
        let statusCode = 401;
        let message = 'Failed to refresh token';
        if (error instanceof auth_1.TokenExpiredError) {
            message = 'Refresh token has expired. Please log in again.';
        }
        else if (error instanceof auth_1.InvalidTokenError) {
            message = error.message;
        }
        return res.status(statusCode).json({
            success: false,
            message
        });
    }
});
/**
 * Create user endpoint
 * Creates a new user account
 */
exports.authRoutes.post('/create-user', (0, validator_1.validateRequest)([
    'username', 'password', 'repeatPassword', 'officeId', 'roles'
]), async (req, res) => {
    try {
        const userInput = req.body.input;
        const createdBy = req.body.session_variables['x-hasura-user-id'];
        const tenantId = req.body.session_variables['x-hasura-tenant-id'];
        // Check for user management permission
        const hasPermission = await (0, authService_1.validateUserPermissions)(createdBy, ['CREATE_USER']);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to create users'
            });
        }
        const userId = await (0, authService_1.createUser)(userInput, createdBy, tenantId);
        return res.json({
            success: true,
            message: 'User created successfully',
            userId
        });
    }
    catch (error) {
        logger_1.logger.error('User creation error:', error);
        let statusCode = 400;
        let message = 'Failed to create user';
        if (error instanceof auth_1.PasswordMismatchError) {
            message = 'Passwords do not match';
        }
        else if (error instanceof auth_1.PasswordRequirementsError) {
            message = error.message;
        }
        else if (error.message.includes('username already exists')) {
            message = 'Username already exists';
        }
        return res.status(statusCode).json({
            success: false,
            message
        });
    }
});
/**
 * Change password endpoint
 * Allows a user to change their password
 */
exports.authRoutes.post('/change-password', (0, validator_1.validateRequest)([
    'oldPassword', 'newPassword', 'repeatPassword'
]), async (req, res) => {
    try {
        const passwordInput = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated'
            });
        }
        const success = await (0, authService_1.changePassword)(userId, passwordInput);
        return res.json({
            success,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Password change error:', error);
        let statusCode = 400;
        let message = 'Failed to change password';
        if (error instanceof auth_1.AuthenticationError) {
            statusCode = 401;
            message = error.message;
        }
        else if (error instanceof auth_1.PasswordMismatchError) {
            message = 'Passwords do not match';
        }
        else if (error instanceof auth_1.PasswordRequirementsError) {
            message = error.message;
        }
        return res.status(statusCode).json({
            success: false,
            message
        });
    }
});
/**
 * Validate token endpoint
 * Validates a JWT token and returns decoded information
 */
exports.authRoutes.post('/validate-token', (0, validator_1.validateRequest)(['token']), async (req, res) => {
    try {
        const { token } = req.body.input;
        // This will throw an error if token is invalid
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fineract-hasura-jwt-secret');
        return res.json({
            success: true,
            message: 'Token is valid',
            decoded
        });
    }
    catch (error) {
        logger_1.logger.error('Token validation error:', error);
        let statusCode = 401;
        let message = 'Invalid token';
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            message = 'Token has expired';
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            message = error.message;
        }
        return res.status(statusCode).json({
            success: false,
            message
        });
    }
});
// Export the router
exports.default = exports.authRoutes;
