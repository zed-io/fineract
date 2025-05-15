"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTenantId = exports.extractUserId = exports.requirePermissions = exports.handleAuthErrors = exports.requireAuth = void 0;
const express_jwt_1 = require("express-jwt");
const logger_1 = require("./logger");
const authService_1 = require("../services/authService");
// JWT secret should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'fineract-hasura-jwt-secret';
/**
 * JWT Authentication middleware
 * Validates JWT tokens in Authorization header
 */
exports.requireAuth = (0, express_jwt_1.expressjwt)({
    secret: JWT_SECRET,
    algorithms: ['HS256'],
    requestProperty: 'auth',
    getToken: (req) => {
        // Check for token in Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        // Check for token in request body
        if (req.body && req.body.token) {
            return req.body.token;
        }
        return null;
    }
});
/**
 * Error handler for JWT authentication errors
 */
const handleAuthErrors = (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        logger_1.logger.warn('Authentication error:', { message: err.message, path: req.path });
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
    next(err);
};
exports.handleAuthErrors = handleAuthErrors;
/**
 * Middleware to check if user has required permissions
 * @param permissions Array of permission codes
 */
const requirePermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            const userId = req.auth.sub;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            // Check if user has required permissions
            const hasPermission = await (0, authService_1.validateUserPermissions)(userId, permissions);
            if (!hasPermission) {
                logger_1.logger.warn('Permission denied:', {
                    userId,
                    requiredPermissions: permissions,
                    path: req.path
                });
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};
exports.requirePermissions = requirePermissions;
/**
 * Helper to extract user ID from request
 */
const extractUserId = (req) => {
    // From JWT auth
    if (req.auth && req.auth.sub) {
        return req.auth.sub;
    }
    // From Hasura session variables
    if (req.body && req.body.session_variables && req.body.session_variables['x-hasura-user-id']) {
        return req.body.session_variables['x-hasura-user-id'];
    }
    return null;
};
exports.extractUserId = extractUserId;
/**
 * Helper to extract tenant ID from request
 */
const extractTenantId = (req) => {
    // From JWT auth
    if (req.auth && req.auth.tn) {
        return req.auth.tn;
    }
    // From Hasura session variables
    if (req.body && req.body.session_variables && req.body.session_variables['x-hasura-tenant-id']) {
        return req.body.session_variables['x-hasura-tenant-id'];
    }
    return null;
};
exports.extractTenantId = extractTenantId;
