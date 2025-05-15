/**
 * Utility for automated document verification
 * Provides functions for verifying documents for integrity, authenticity, and data extraction
 */

import axios from 'axios';
import { promises as fs } from 'fs';
import { logger } from './logger';
import { AutomatedVerificationResult } from '../models/loanDocument';

// Document verification service URL
const DOCUMENT_VERIFICATION_API = process.env.DOCUMENT_VERIFICATION_API || 'http://localhost:5000/api/verify';

/**
 * Call document verification service
 * @param documentPath Path to the document file
 * @param documentType Type of document
 * @returns Verification result
 */
export async function callDocumentVerificationService(
  documentPath: string,
  documentType: string
): Promise<AutomatedVerificationResult> {
  try {
    logger.info('Calling document verification service', { documentType });
    
    // In a real implementation, this would send the document to an external service
    // or use a local library for verification
    
    // For this implementation, we'll simulate a verification response
    return simulateVerificationResponse(documentPath, documentType);
  } catch (error) {
    logger.error('Error calling document verification service', { error, documentType });
    
    // Return a failed verification result
    return {
      documentId: '',
      documentType,
      success: false,
      confidence: 0,
      verificationDetails: {},
      errors: ['Document verification service error']
    };
  }
}

/**
 * Simulate a verification response for different document types
 * @param documentPath Path to the document file
 * @param documentType Type of document
 * @returns Simulated verification result
 */
async function simulateVerificationResponse(
  documentPath: string,
  documentType: string
): Promise<AutomatedVerificationResult> {
  // Get file size to add some randomness to the simulation
  let fileSize = 0;
  try {
    const stats = await fs.stat(documentPath);
    fileSize = stats.size;
  } catch (error) {
    logger.warn('Could not get file size for simulation', { documentPath });
  }
  
  // Calculate a "confidence" score based on file size
  const randomFactor = Math.sin(fileSize % 100) * 0.2 + 0.8; // Between 0.6 and 1.0
  const confidence = Math.min(0.95, Math.max(0.6, randomFactor));
  
  // Determine success based on confidence
  const success = confidence > 0.7;
  
  // Create different verification details based on document type
  let verificationDetails: any = {};
  let extractedData: any = undefined;
  let warnings: string[] = [];
  let errors: string[] = [];
  
  if (documentType.toLowerCase().includes('id') || documentType.toLowerCase().includes('passport')) {
    verificationDetails = {
      documentIntegrity: success ? 'valid' : 'suspect',
      securityFeaturesDetected: success ? ['hologram', 'microprint', 'uv_features'] : [],
      photoQuality: success ? 'good' : 'poor',
      tamperingDetected: !success
    };
    
    if (success) {
      extractedData = {
        fullName: 'John A. Smith',
        idNumber: '123456789',
        dateOfBirth: '1980-05-15',
        issueDate: '2018-10-01',
        expiryDate: '2028-10-01',
        nationality: 'Trinidad and Tobago'
      };
    } else {
      warnings.push('Document quality is suboptimal');
      errors.push('Could not verify all security features');
    }
  } else if (documentType.toLowerCase().includes('address') || documentType.toLowerCase().includes('utility')) {
    verificationDetails = {
      documentType: 'utility_bill',
      issuer: success ? 'Trinidad and Tobago Electricity Commission' : 'unknown',
      dateDetected: success,
      addressDetected: success
    };
    
    if (success) {
      extractedData = {
        name: 'John A. Smith',
        address: '15 Main Street, Port of Spain, Trinidad and Tobago',
        issueDate: '2023-04-01',
        accountNumber: 'TTEC-12345678'
      };
    } else {
      warnings.push('Address information unclear');
      errors.push('Could not verify document authenticity');
    }
  } else if (documentType.toLowerCase().includes('pay') || documentType.toLowerCase().includes('income')) {
    verificationDetails = {
      documentType: 'payslip',
      employerDetected: success,
      salaryInformationDetected: success,
      dateDetected: success
    };
    
    if (success) {
      extractedData = {
        employerName: 'ABC Corporation Ltd.',
        employeeName: 'John A. Smith',
        employeeId: 'EMP123456',
        payPeriod: 'March 2023',
        grossSalary: 12500.00,
        netSalary: 9875.50,
        currency: 'TTD'
      };
    } else {
      warnings.push('Salary information unclear');
    }
  } else {
    verificationDetails = {
      documentType: 'other',
      textRecognitionQuality: success ? 'good' : 'poor',
      contentIntegrity: success ? 'valid' : 'suspect'
    };
    
    if (!success) {
      warnings.push('Document format not optimal for automated verification');
      errors.push('Unable to verify document content');
    }
  }
  
  return {
    documentId: '',
    documentType,
    success,
    confidence,
    verificationDetails,
    extractedData,
    warnings,
    errors
  };
}

/**
 * Validate document expiration
 * @param expiryDate Document expiration date
 * @param gracePeriodDays Number of days before expiration to start warning
 * @returns Validation result with status and messages
 */
export function validateDocumentExpiration(
  expiryDate: Date | string | null | undefined,
  gracePeriodDays: number = 30
): { isValid: boolean; isExpiring: boolean; message?: string } {
  if (!expiryDate) {
    return { isValid: true, isExpiring: false };
  }
  
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  
  // Check if already expired
  if (expiry < now) {
    return { 
      isValid: false, 
      isExpiring: false,
      message: `Document expired on ${expiry.toISOString().split('T')[0]}`
    };
  }
  
  // Calculate days until expiration
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / millisecondsPerDay);
  
  // Check if expiring soon
  if (daysUntilExpiry <= gracePeriodDays) {
    return {
      isValid: true,
      isExpiring: true,
      message: `Document expires in ${daysUntilExpiry} days (${expiry.toISOString().split('T')[0]})`
    };
  }
  
  return { isValid: true, isExpiring: false };
}