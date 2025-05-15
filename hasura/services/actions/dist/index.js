"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const loan_1 = require("./handlers/loan");
const loanAdvanced_1 = require("./handlers/loanAdvanced");
const savings_1 = require("./handlers/savings");
const client_1 = require("./handlers/client");
const accounting_1 = require("./handlers/accounting");
const auth_1 = require("./handlers/auth");
const reporting_1 = require("./handlers/reporting");
const logger_1 = require("./utils/logger");
const db_1 = require("./utils/db");
const app = (0, express_1.default)();
app.use((0, body_parser_1.json)());
// Health check endpoint
app.get('/health', async (_, res) => {
    try {
        const dbConnection = await (0, db_1.initDatabase)();
        res.json({
            status: 'ok',
            database: dbConnection ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// Mount action handlers
app.use('/api/loan', loan_1.loanRoutes);
app.use('/api/loan-advanced', loanAdvanced_1.loanAdvancedRoutes);
app.use('/api/savings', savings_1.savingsRoutes);
app.use('/api/client', client_1.clientRoutes);
app.use('/api/accounting', accounting_1.accountingRoutes);
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/reporting', reporting_1.reportingRoutes);
// Global error handler
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// Initialize database and start server
const PORT = process.env.PORT || 3000;
(0, db_1.initDatabase)()
    .then(connected => {
    if (connected) {
        app.listen(PORT, () => {
            logger_1.logger.info(`Fineract Hasura Action server running on port ${PORT}`);
        });
    }
    else {
        logger_1.logger.error('Failed to initialize database connection. Exiting.');
        process.exit(1);
    }
})
    .catch(err => {
    logger_1.logger.error('Error during initialization:', err);
    process.exit(1);
});
