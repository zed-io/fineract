/**
 * Loan Document API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { loanDocumentHandlers } from '../handlers/loanDocument';

export const loanDocumentRoutes = Router();

// Document management routes
loanDocumentRoutes.post('/upload', loanDocumentHandlers.uploadDocument);
loanDocumentRoutes.post('/verify', loanDocumentHandlers.verifyDocument);
loanDocumentRoutes.post('/documents', loanDocumentHandlers.getDocuments);
loanDocumentRoutes.post('/requirements', loanDocumentHandlers.getDocumentRequirements);
loanDocumentRoutes.post('/analyze', loanDocumentHandlers.analyzeDocument);
loanDocumentRoutes.get('/download/:documentId', loanDocumentHandlers.downloadDocument);