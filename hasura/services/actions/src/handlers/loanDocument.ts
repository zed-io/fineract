/**
 * Loan Document API handlers for Fineract Hasura actions
 * Provides endpoints for loan document management
 */

import { Request, Response } from 'express';
import { loanDocumentService } from '../services/loanDocumentService';
import { logger } from '../utils/logger';

/**
 * Loan Document API handlers
 */
export const loanDocumentHandlers = {
  
  /**
   * Upload a document for a loan
   */
  async uploadDocument(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const uploadResult = await loanDocumentService.uploadDocument(req.body.input, userId);
      res.json(uploadResult);
    } catch (error: any) {
      logger.error('Error uploading document', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Verify a document
   */
  async verifyDocument(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const verificationResult = await loanDocumentService.verifyDocument(req.body.input, userId);
      res.json(verificationResult);
    } catch (error: any) {
      logger.error('Error verifying document', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get documents for a loan
   */
  async getDocuments(req: Request, res: Response) {
    try {
      const { loanId, status, documentType } = req.body.input;
      const documents = await loanDocumentService.getDocuments({
        loanId,
        status,
        documentType
      });
      res.json(documents);
    } catch (error: any) {
      logger.error('Error getting documents', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get document requirements for a loan product
   */
  async getDocumentRequirements(req: Request, res: Response) {
    try {
      const { loanProductId } = req.body.input;
      const requirements = await loanDocumentService.getDocumentRequirements(loanProductId);
      res.json(requirements);
    } catch (error: any) {
      logger.error('Error getting document requirements', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Analyze a document with OCR and validation
   */
  async analyzeDocument(req: Request, res: Response) {
    try {
      const result = await loanDocumentService.analyzeDocument(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error analyzing document', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Download a document
   */
  async downloadDocument(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      
      // Get document details
      const documents = await loanDocumentService.getDocuments({
        loanId: '', // We don't know the loan ID, but the query will be filtered by document ID
        documentType: ''
      });
      
      const document = documents.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Set response headers
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.documentName}"`);
      
      // Send the file
      res.sendFile(document.documentLocation);
    } catch (error: any) {
      logger.error('Error downloading document', { error });
      res.status(400).json({ message: error.message });
    }
  }
};

export default loanDocumentHandlers;