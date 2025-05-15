/**
 * Types for loan document handling in Fineract
 * This module provides interfaces for working with loan documents, verification,
 * and document management workflows
 */

import { BaseAuditModel } from './common';

/**
 * Document status enum
 */
export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

/**
 * Document verification method enum
 */
export enum DocumentVerificationMethod {
  MANUAL = 'manual',
  AUTOMATED = 'automated',
  HYBRID = 'hybrid'
}

/**
 * Document type interface
 */
export interface DocumentType extends BaseAuditModel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isIdentification: boolean;
  isAddressProof: boolean;
  isIncomeProof: boolean;
  isLoanAgreement: boolean;
  isRequiredDefault: boolean;
  validationRegex?: string;
  expiryCheckRequired: boolean;
  minimumFileSize?: number;
  maximumFileSize?: number;
  allowedFileFormats?: string; // comma-separated list
}

/**
 * Loan document interface
 */
export interface LoanDocument extends BaseAuditModel {
  id: string;
  loanId: string;
  documentType: string;
  documentName: string;
  documentLocation: string;
  mimeType: string;
  fileSize: number;
  documentNumber?: string;
  expiryDate?: Date;
  contentHash?: string;
  status: DocumentStatus;
  verificationStatus: DocumentStatus;
  verificationMethod: DocumentVerificationMethod;
  verificationDate?: Date;
  verifiedBy?: string;
  rejectedReason?: string;
  isRequired: boolean;
  metadata?: any;
  uploadedBy: string;
  uploadedDate: Date;
}

/**
 * Request body for document upload
 */
export interface DocumentUploadRequest {
  loanId: string;
  documentType: string;
  documentName: string;
  documentNumber?: string;
  expiryDate?: string;
  isRequired?: boolean;
  metadata?: any;
  file: {
    data: string; // base64 encoded file
    contentType: string;
    fileName: string;
    fileSize: number;
  };
}

/**
 * Response model for document upload
 */
export interface DocumentUploadResponse {
  documentId: string;
  loanId: string;
  documentType: string;
  documentName: string;
  status: DocumentStatus;
  uploadedDate: string;
}

/**
 * Request body for document verification
 */
export interface DocumentVerificationRequest {
  documentId: string;
  verificationStatus: DocumentStatus;
  verificationMethod?: DocumentVerificationMethod;
  rejectedReason?: string;
  notes?: string;
}

/**
 * Response model for document verification
 */
export interface DocumentVerificationResponse {
  documentId: string;
  loanId: string;
  documentType: string;
  status: DocumentStatus;
  verificationDate: string;
  verifiedBy: string;
}

/**
 * Request model for retrieving documents
 */
export interface GetDocumentsRequest {
  loanId: string;
  status?: DocumentStatus;
  documentType?: string;
}

/**
 * Response model with list of documents
 */
export interface DocumentListResponse {
  documents: LoanDocument[];
  count: number;
}

/**
 * Document type association with loan product
 */
export interface LoanProductDocumentType extends BaseAuditModel {
  id: string;
  loanProductId: string;
  documentTypeId: string;
  isRequired: boolean;
  orderPosition: number;
}

/**
 * Document requirements response for a specific loan product
 */
export interface DocumentRequirementsResponse {
  loanProductId: string;
  requiredDocuments: {
    documentTypeId: string;
    name: string;
    description?: string;
    isRequired: boolean;
    allowedFileFormats?: string[];
    maximumFileSize?: number;
  }[];
  optionalDocuments: {
    documentTypeId: string;
    name: string;
    description?: string;
    allowedFileFormats?: string[];
    maximumFileSize?: number;
  }[];
}

/**
 * Document verification result from automated processing
 */
export interface AutomatedVerificationResult {
  documentId: string;
  documentType: string;
  success: boolean;
  confidence: number;
  verificationDetails: {
    [key: string]: any;
  };
  extractedData?: {
    [key: string]: any;
  };
  warnings?: string[];
  errors?: string[];
}

/**
 * Document analysis request for OCR and validation
 */
export interface DocumentAnalysisRequest {
  documentId: string;
  extractText?: boolean;
  validateDocument?: boolean;
  extractData?: boolean;
}

/**
 * Document analysis response with extracted data
 */
export interface DocumentAnalysisResponse {
  documentId: string;
  extractedText?: string;
  isValid: boolean;
  confidence: number;
  extractedData?: {
    [key: string]: any;
  };
  warnings?: string[];
  errors?: string[];
}