import express from 'express';
import { savingsStatementHandlers } from '../handlers/savingsStatement';

const router = express.Router();

// Generate a statement
router.post('/generate', savingsStatementHandlers.generateStatement);

// Get statement history
router.post('/history', savingsStatementHandlers.getStatementHistory);

// Download a statement
router.get('/download/:statementId', savingsStatementHandlers.downloadStatement);

export const savingsStatementRoutes = router;