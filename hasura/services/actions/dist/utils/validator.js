"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const logger_1 = require("./logger");
/**
 * Middleware to validate request body fields
 *
 * @param requiredFields Array of required field names
 * @returns Express middleware function
 */
function validateRequest(requiredFields) {
    return (req, res, next) => {
        // Check if request body has input property
        if (!req.body || !req.body.input) {
            return res.status(400).json({ message: 'Invalid request format: missing input object' });
        }
        // Check for required fields
        const missingFields = requiredFields.filter(field => {
            return req.body.input[field] === undefined || req.body.input[field] === null;
        });
        if (missingFields.length > 0) {
            logger_1.logger.warn(`Validation failed: missing fields [${missingFields.join(', ')}]`);
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        next();
    };
}
