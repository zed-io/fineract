/**
 * Service for managing loan documents in Fineract
 * Provides functionality for uploading, verifying, and retrieving loan documents
 */

import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import { 
  DocumentStatus, 
  DocumentVerificationMethod, 
  DocumentUploadRequest, 
  DocumentUploadResponse,
  DocumentVerificationRequest,
  DocumentVerificationResponse,
  GetDocumentsRequest,
  DocumentListResponse,
  DocumentRequirementsResponse,
  AutomatedVerificationResult,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse
} from '../models/loanDocument';
import { callDocumentVerificationService } from '../utils/documentVerification';
import { createDirectory } from '../utils/fileSystem';

// Configure document storage path
const DOCUMENT_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH || './uploads/documents';

export class LoanDocumentService {
  /**
   * Upload a new document for a loan
   * @param uploadRequest Document upload request
   * @param userId Current user ID
   * @returns Document upload response
   */
  async uploadDocument(uploadRequest: DocumentUploadRequest, userId?: string): Promise<DocumentUploadResponse> {
    logger.info('Uploading document for loan', { loanId: uploadRequest.loanId, documentType: uploadRequest.documentType });
    
    try {
      return await transaction(async (client) => {
        // Validate loan exists
        const loanResult = await client.query(
          'SELECT id FROM loan WHERE id = $1',
          [uploadRequest.loanId]
        );
        
        if (loanResult.rowCount === 0) {
          throw new Error(`Loan with ID ${uploadRequest.loanId} not found`);
        }
        
        // Validate document type exists
        const documentTypeResult = await client.query(
          'SELECT id, name, maximum_file_size, allowed_file_formats FROM document_type WHERE name = $1 AND is_active = true',
          [uploadRequest.documentType]
        );
        
        if (documentTypeResult.rowCount === 0) {
          throw new Error(`Document type '${uploadRequest.documentType}' not found or inactive`);
        }
        
        const documentType = documentTypeResult.rows[0];
        
        // Validate file size
        if (documentType.maximum_file_size && uploadRequest.file.fileSize > documentType.maximum_file_size) {
          throw new Error(`File size exceeds the maximum allowed size of ${documentType.maximum_file_size} bytes`);
        }
        
        // Validate file format
        if (documentType.allowed_file_formats) {
          const allowedFormats = documentType.allowed_file_formats.split(',');
          const fileExtension = uploadRequest.file.fileName.split('.').pop()?.toLowerCase();
          
          if (!fileExtension || !allowedFormats.includes(fileExtension)) {
            throw new Error(`File format ${fileExtension} is not allowed. Allowed formats: ${documentType.allowed_file_formats}`);
          }
        }
        
        // Create directory structure if it doesn't exist
        const loanDir = path.join(DOCUMENT_STORAGE_PATH, uploadRequest.loanId);
        await createDirectory(loanDir);
        
        // Generate a unique filename
        const fileId = uuidv4();
        const fileExtension = uploadRequest.file.fileName.split('.').pop();
        const uniqueFileName = `${fileId}.${fileExtension}`;
        const filePath = path.join(loanDir, uniqueFileName);
        
        // Decode and save the file
        const fileBuffer = Buffer.from(uploadRequest.file.data, 'base64');
        await fs.writeFile(filePath, fileBuffer);
        
        // Calculate file hash for integrity check
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        // Create document record
        const documentId = uuidv4();
        const now = new Date();
        
        await client.query(
          `INSERT INTO loan_document (
            id, loan_id, document_type, document_name, document_location, 
            mime_type, file_size, document_number, expiry_date, content_hash,
            status, verification_status, verification_method, is_required,
            metadata, uploaded_by, uploaded_date, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            documentId,
            uploadRequest.loanId,
            uploadRequest.documentType,
            uploadRequest.documentName,
            filePath,
            uploadRequest.file.contentType,
            uploadRequest.file.fileSize,
            uploadRequest.documentNumber || null,
            uploadRequest.expiryDate ? new Date(uploadRequest.expiryDate) : null,
            fileHash,
            DocumentStatus.PENDING,
            DocumentStatus.PENDING,
            DocumentVerificationMethod.MANUAL,
            uploadRequest.isRequired ?? true,
            uploadRequest.metadata ? JSON.stringify(uploadRequest.metadata) : null,
            userId || null,
            now,
            userId || null,
            now
          ]
        );
        
        // Create loan workflow entry for document verification if needed
        await client.query(
          `INSERT INTO loan_application_workflow (
            id, loan_id, current_stage, stage_start_date, stage_status,
            notes, created_by, created_date
          ) 
          SELECT 
            $1, $2, 'document_verification', $3, 'in_progress',
            $4, $5, $6
          WHERE NOT EXISTS (
            SELECT 1 FROM loan_application_workflow 
            WHERE loan_id = $2 AND current_stage = 'document_verification' AND stage_end_date IS NULL
          )`,
          [
            uuidv4(),
            uploadRequest.loanId,
            now,
            `Document '${uploadRequest.documentName}' uploaded and awaiting verification`,
            userId || null,
            now
          ]
        );
        
        // Trigger automated verification if configured
        if (process.env.ENABLE_AUTOMATED_DOCUMENT_VERIFICATION === 'true') {
          // Queue document for verification, but don't await
          this.queueDocumentForVerification(documentId);
        }
        
        return {
          documentId,
          loanId: uploadRequest.loanId,
          documentType: uploadRequest.documentType,
          documentName: uploadRequest.documentName,
          status: DocumentStatus.PENDING,
          uploadedDate: now.toISOString()
        };
      });
    } catch (error) {
      logger.error('Error uploading document', { error, loanId: uploadRequest.loanId });
      throw error;
    }
  }
  
  /**
   * Verify a loan document
   * @param verificationRequest Document verification request
   * @param userId Current user ID
   * @returns Document verification response
   */
  async verifyDocument(verificationRequest: DocumentVerificationRequest, userId?: string): Promise<DocumentVerificationResponse> {
    logger.info('Verifying document', { documentId: verificationRequest.documentId });
    
    try {
      return await transaction(async (client) => {
        // Get document details
        const documentResult = await client.query(
          `SELECT ld.id, ld.loan_id, ld.document_type, ld.verification_status
           FROM loan_document ld
           WHERE ld.id = $1`,
          [verificationRequest.documentId]
        );
        
        if (documentResult.rowCount === 0) {
          throw new Error(`Document with ID ${verificationRequest.documentId} not found`);
        }
        
        const document = documentResult.rows[0];
        
        // Check if document is not already verified
        if (document.verification_status === DocumentStatus.VERIFIED) {
          throw new Error('Document is already verified');
        }
        
        const now = new Date();
        
        // Update document verification status
        await client.query(
          `UPDATE loan_document
           SET verification_status = $1,
               verification_method = $2,
               verification_date = $3,
               verified_by = $4,
               rejected_reason = $5,
               last_modified_by = $6,
               last_modified_date = $7
           WHERE id = $8`,
          [
            verificationRequest.verificationStatus,
            verificationRequest.verificationMethod || DocumentVerificationMethod.MANUAL,
            now,
            userId || null,
            verificationRequest.rejectedReason || null,
            userId || null,
            now,
            verificationRequest.documentId
          ]
        );
        
        // Check if all required documents are verified
        const allDocumentsVerified = await this.areAllRequiredDocumentsVerified(client, document.loan_id);
        
        // Update loan workflow if all documents are verified
        if (allDocumentsVerified) {
          await client.query(
            `UPDATE loan_application_workflow
             SET stage_end_date = $1,
                 stage_status = 'completed',
                 notes = $2,
                 last_modified_by = $3,
                 last_modified_date = $4
             WHERE loan_id = $5 
               AND current_stage = 'document_verification'
               AND stage_end_date IS NULL`,
            [
              now,
              'All required documents have been verified',
              userId || null,
              now,
              document.loan_id
            ]
          );
          
          // Create next workflow stage
          await client.query(
            `INSERT INTO loan_application_workflow (
              id, loan_id, current_stage, stage_start_date, stage_status,
              notes, created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              document.loan_id,
              'credit_check',
              now,
              'in_progress',
              'Document verification complete, proceeding to credit check',
              userId || null,
              now
            ]
          );
        }
        
        return {
          documentId: verificationRequest.documentId,
          loanId: document.loan_id,
          documentType: document.document_type,
          status: verificationRequest.verificationStatus,
          verificationDate: now.toISOString(),
          verifiedBy: userId || 'system'
        };
      });
    } catch (error) {
      logger.error('Error verifying document', { error, documentId: verificationRequest.documentId });
      throw error;
    }
  }
  
  /**
   * Queue a document for automated verification
   * @param documentId Document ID
   */
  private async queueDocumentForVerification(documentId: string): Promise<void> {
    try {
      // Get document details
      const documentResult = await query(
        `SELECT ld.id, ld.loan_id, ld.document_type, ld.document_location, ld.mime_type
         FROM loan_document ld
         WHERE ld.id = $1`,
        [documentId]
      );
      
      if (documentResult.rowCount === 0) {
        logger.error('Document not found for automated verification', { documentId });
        return;
      }
      
      const document = documentResult.rows[0];
      
      // This would typically send to a queue for async processing
      // For simplicity, we'll process directly here
      setTimeout(async () => {
        try {
          // Call document verification service
          const verificationResult = await callDocumentVerificationService(
            document.document_location,
            document.document_type
          );
          
          // Update document with verification result
          await this.updateDocumentWithVerificationResult(documentId, verificationResult);
        } catch (error) {
          logger.error('Error in automated document verification', { error, documentId });
        }
      }, 1000);
    } catch (error) {
      logger.error('Error queueing document for verification', { error, documentId });
    }
  }
  
  /**
   * Update a document with verification results
   * @param documentId Document ID
   * @param verificationResult Verification result
   */
  private async updateDocumentWithVerificationResult(
    documentId: string,
    verificationResult: AutomatedVerificationResult
  ): Promise<void> {
    try {
      // Determine verification status based on results
      const verificationStatus = verificationResult.success ? 
        DocumentStatus.VERIFIED : DocumentStatus.REJECTED;
      
      // Update document
      await query(
        `UPDATE loan_document
         SET verification_status = $1,
             verification_method = $2,
             verification_date = $3,
             rejected_reason = $4,
             metadata = metadata || $5::jsonb,
             last_modified_by = NULL,
             last_modified_date = $6
         WHERE id = $7`,
        [
          verificationStatus,
          DocumentVerificationMethod.AUTOMATED,
          new Date(),
          verificationResult.success ? null : 'Failed automated verification',
          JSON.stringify({
            automatedVerification: {
              timestamp: new Date().toISOString(),
              result: verificationResult
            }
          }),
          new Date(),
          documentId
        ]
      );
    } catch (error) {
      logger.error('Error updating document with verification result', { error, documentId });
    }
  }
  
  /**
   * Check if all required documents for a loan are verified
   * @param client Database client
   * @param loanId Loan ID
   * @returns Boolean indicating if all required documents are verified
   */
  private async areAllRequiredDocumentsVerified(client: any, loanId: string): Promise<boolean> {
    const result = await client.query(
      `SELECT 
         (SELECT COUNT(*) FROM loan_document 
          WHERE loan_id = $1 AND is_required = true) AS total_required,
         (SELECT COUNT(*) FROM loan_document 
          WHERE loan_id = $1 AND is_required = true AND verification_status = 'verified') AS verified_count`,
      [loanId]
    );
    
    const { total_required, verified_count } = result.rows[0];
    return parseInt(total_required) > 0 && parseInt(verified_count) === parseInt(total_required);
  }
  
  /**
   * Get documents for a loan
   * @param request Get documents request
   * @returns List of documents
   */
  async getDocuments(request: GetDocumentsRequest): Promise<DocumentListResponse> {
    logger.info('Getting documents for loan', { loanId: request.loanId });
    
    try {
      // Build query conditions
      let conditions = ['loan_id = $1'];
      const params = [request.loanId];
      let paramIndex = 2;
      
      if (request.status) {
        conditions.push(`verification_status = $${paramIndex++}`);
        params.push(request.status);
      }
      
      if (request.documentType) {
        conditions.push(`document_type = $${paramIndex++}`);
        params.push(request.documentType);
      }
      
      // Execute query
      const result = await query(
        `SELECT * FROM loan_document
         WHERE ${conditions.join(' AND ')}
         ORDER BY uploaded_date DESC`,
        params
      );
      
      return {
        documents: result.rows.map(row => ({
          id: row.id,
          loanId: row.loan_id,
          documentType: row.document_type,
          documentName: row.document_name,
          documentLocation: row.document_location,
          mimeType: row.mime_type,
          fileSize: row.file_size,
          documentNumber: row.document_number,
          expiryDate: row.expiry_date,
          contentHash: row.content_hash,
          status: row.status,
          verificationStatus: row.verification_status,
          verificationMethod: row.verification_method,
          verificationDate: row.verification_date,
          verifiedBy: row.verified_by,
          rejectedReason: row.rejected_reason,
          isRequired: row.is_required,
          metadata: row.metadata,
          uploadedBy: row.uploaded_by,
          uploadedDate: row.uploaded_date,
          createdBy: row.created_by,
          createdDate: row.created_date,
          lastModifiedBy: row.last_modified_by,
          lastModifiedDate: row.last_modified_date
        })),
        count: result.rowCount
      };
    } catch (error) {
      logger.error('Error getting documents for loan', { error, loanId: request.loanId });
      throw error;
    }
  }
  
  /**
   * Get document requirements for a loan product
   * @param loanProductId Loan product ID
   * @returns Document requirements for the loan product
   */
  async getDocumentRequirements(loanProductId: string): Promise<DocumentRequirementsResponse> {
    logger.info('Getting document requirements for loan product', { loanProductId });
    
    try {
      // Get required document types
      const requiredDocumentsResult = await query(
        `SELECT dt.id, dt.name, dt.description, ldt.is_required, 
                dt.allowed_file_formats, dt.maximum_file_size
         FROM loan_product_document_type ldt
         JOIN document_type dt ON ldt.document_type_id = dt.id
         WHERE ldt.loan_product_id = $1
         ORDER BY ldt.order_position`,
        [loanProductId]
      );
      
      const requiredDocuments = [];
      const optionalDocuments = [];
      
      for (const doc of requiredDocumentsResult.rows) {
        const documentData = {
          documentTypeId: doc.id,
          name: doc.name,
          description: doc.description,
          allowedFileFormats: doc.allowed_file_formats ? doc.allowed_file_formats.split(',') : undefined,
          maximumFileSize: doc.maximum_file_size
        };
        
        if (doc.is_required) {
          requiredDocuments.push(documentData);
        } else {
          optionalDocuments.push(documentData);
        }
      }
      
      return {
        loanProductId,
        requiredDocuments,
        optionalDocuments
      };
    } catch (error) {
      logger.error('Error getting document requirements', { error, loanProductId });
      throw error;
    }
  }
  
  /**
   * Analyze a document with OCR and validation
   * @param request Document analysis request
   * @returns Document analysis response
   */
  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResponse> {
    logger.info('Analyzing document', { documentId: request.documentId });
    
    try {
      // Get document details
      const documentResult = await query(
        `SELECT ld.id, ld.document_type, ld.document_location, ld.mime_type
         FROM loan_document ld
         WHERE ld.id = $1`,
        [request.documentId]
      );
      
      if (documentResult.rowCount === 0) {
        throw new Error(`Document with ID ${request.documentId} not found`);
      }
      
      const document = documentResult.rows[0];
      
      // TODO: Integrate with actual OCR service
      // This is a mock implementation
      const mockAnalysisResult = {
        extractedText: request.extractText ? 
          'This is a mock extraction of text from the document. In a real implementation, this would contain the actual extracted text from the document.' : undefined,
        isValid: true,
        confidence: 0.85,
        extractedData: request.extractData ? {
          name: 'John Smith',
          idNumber: '123456789',
          issueDate: '2020-01-01',
          expiryDate: '2030-01-01'
        } : undefined,
        warnings: []
      };
      
      // Update document metadata with analysis result
      await query(
        `UPDATE loan_document
         SET metadata = metadata || $1::jsonb,
             last_modified_date = $2
         WHERE id = $3`,
        [
          JSON.stringify({
            analysis: {
              timestamp: new Date().toISOString(),
              result: mockAnalysisResult
            }
          }),
          new Date(),
          request.documentId
        ]
      );
      
      return {
        documentId: request.documentId,
        extractedText: mockAnalysisResult.extractedText,
        isValid: mockAnalysisResult.isValid,
        confidence: mockAnalysisResult.confidence,
        extractedData: mockAnalysisResult.extractedData,
        warnings: mockAnalysisResult.warnings,
        errors: []
      };
    } catch (error) {
      logger.error('Error analyzing document', { error, documentId: request.documentId });
      throw error;
    }
  }
}

// Export a singleton instance
export const loanDocumentService = new LoanDocumentService();