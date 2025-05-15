import express from 'express';
import { CreditCheckHandler } from '../handlers/creditCheck';

// Create router instance
const creditCheckRoutes = express.Router();

// Initialize handler
const creditCheckHandlers = new CreditCheckHandler();

// Route definitions for credit check
creditCheckRoutes.post('/perform', creditCheckHandlers.performCreditCheck);
creditCheckRoutes.post('/history', creditCheckHandlers.getCreditCheckHistory);
creditCheckRoutes.post('/byId', creditCheckHandlers.getCreditCheckById);

export { creditCheckRoutes };