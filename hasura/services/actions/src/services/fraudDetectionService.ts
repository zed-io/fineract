import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Type of fraud detection check
 */
export enum FraudCheckType {
  IDENTITY_VERIFICATION = 'identity_verification',
  ADDRESS_VERIFICATION = 'address_verification',
  DOCUMENT_AUTHENTICITY = 'document_authenticity',
  TRANSACTION_PATTERN = 'transaction_pattern',
  AML_SCREENING = 'aml_screening',
  PEP_SCREENING = 'pep_screening',
  SANCTIONS_SCREENING = 'sanctions_screening',
  CREDIT_BEHAVIOR = 'credit_behavior'
}

/**
 * Risk level for fraud checks
 */
export enum FraudRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Status of the fraud check
 */
export enum FraudCheckStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Request for fraud detection
 */
export interface FraudDetectionRequest {
  clientId: string;
  checkTypes?: FraudCheckType[];
  identificationNumber?: string;
  identificationType?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  nationality?: string;
  documentIds?: string[];
  metaData?: any;
}

/**
 * Result of a single fraud check
 */
export interface FraudCheckResult {
  checkType: FraudCheckType;
  checkId: string;
  status: FraudCheckStatus;
  riskLevel: FraudRiskLevel;
  score: number;
  details: string;
  matchDetails?: any;
  rawResponse?: any;
  timestamp: string;
}

/**
 * Result of fraud detection
 */
export interface FraudDetectionResult {
  requestId: string;
  clientId: string;
  timestamp: string;
  overallRiskLevel: FraudRiskLevel;
  checks: FraudCheckResult[];
  requiresManualReview: boolean;
  reviewReason?: string;
  errors?: string[];
}

/**
 * Service for fraud detection and KYC/AML screening
 * Specialized for Trinidad and Tobago financial regulations
 */
export class FraudDetectionService {
  /**
   * Perform fraud detection checks for a client
   * @param request Fraud detection request
   * @returns Results of fraud detection
   */
  async performFraudDetection(request: FraudDetectionRequest): Promise<FraudDetectionResult> {
    logger.info('Performing fraud detection', { clientId: request.clientId });
    
    try {
      // Get client details if not provided
      if (!request.firstName || !request.lastName || !request.dateOfBirth) {
        const clientDetails = await this.getClientDetails(request.clientId);
        
        if (clientDetails) {
          request.identificationNumber = request.identificationNumber || clientDetails.identification_number;
          request.identificationType = request.identificationType || clientDetails.identification_type;
          request.firstName = request.firstName || clientDetails.firstname;
          request.lastName = request.lastName || clientDetails.lastname;
          request.dateOfBirth = request.dateOfBirth || clientDetails.date_of_birth;
          request.address = request.address || clientDetails.address;
          request.nationality = request.nationality || clientDetails.nationality;
        }
      }
      
      // Determine which checks to perform
      const checkTypes = request.checkTypes || [
        FraudCheckType.IDENTITY_VERIFICATION,
        FraudCheckType.AML_SCREENING,
        FraudCheckType.PEP_SCREENING, 
        FraudCheckType.SANCTIONS_SCREENING
      ];
      
      // Perform each check
      const checkResults: FraudCheckResult[] = [];
      for (const checkType of checkTypes) {
        try {
          const result = await this.performSingleCheck(checkType, request);
          checkResults.push(result);
        } catch (error) {
          logger.error(`Error performing ${checkType} check`, { 
            clientId: request.clientId, 
            error: error.message 
          });
          
          // Add failed check
          checkResults.push({
            checkType,
            checkId: uuidv4(),
            status: FraudCheckStatus.FAILED,
            riskLevel: FraudRiskLevel.MEDIUM, // Default to medium for failed checks
            score: 50,
            details: `Failed to perform check: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Calculate overall risk level
      const overallRiskLevel = this.calculateOverallRiskLevel(checkResults);
      
      // Determine if manual review is needed
      const requiresManualReview = overallRiskLevel === FraudRiskLevel.HIGH || 
        overallRiskLevel === FraudRiskLevel.CRITICAL ||
        checkResults.some(check => check.status === FraudCheckStatus.FAILED);
      
      // Generate review reason if needed
      let reviewReason = undefined;
      if (requiresManualReview) {
        const highRiskChecks = checkResults.filter(
          check => check.riskLevel === FraudRiskLevel.HIGH || 
            check.riskLevel === FraudRiskLevel.CRITICAL
        );
        
        const failedChecks = checkResults.filter(
          check => check.status === FraudCheckStatus.FAILED
        );
        
        if (highRiskChecks.length > 0) {
          reviewReason = `High risk detected in: ${highRiskChecks.map(c => c.checkType).join(', ')}`;
        } else if (failedChecks.length > 0) {
          reviewReason = `Failed checks: ${failedChecks.map(c => c.checkType).join(', ')}`;
        }
      }
      
      // Create the result
      const result: FraudDetectionResult = {
        requestId: uuidv4(),
        clientId: request.clientId,
        timestamp: new Date().toISOString(),
        overallRiskLevel,
        checks: checkResults,
        requiresManualReview,
        reviewReason
      };
      
      // Store the result in the database
      await this.storeFraudDetectionResult(result);
      
      // Update client's risk status if needed
      if (overallRiskLevel === FraudRiskLevel.HIGH || overallRiskLevel === FraudRiskLevel.CRITICAL) {
        await this.updateClientRiskStatus(request.clientId, overallRiskLevel, reviewReason);
      }
      
      return result;
    } catch (error) {
      logger.error('Error performing fraud detection', { 
        clientId: request.clientId, 
        error: error.message 
      });
      
      throw new Error(`Failed to perform fraud detection: ${error.message}`);
    }
  }
  
  /**
   * Get client details from the database
   * @param clientId Client ID
   * @returns Client details
   */
  private async getClientDetails(clientId: string): Promise<any> {
    const query = await db.query(
      `SELECT 
         c.id, 
         c.firstname, 
         c.lastname, 
         c.date_of_birth,
         c.address_line_1 || ' ' || COALESCE(c.address_line_2, '') || ', ' || 
         COALESCE(c.city, '') || ', ' || COALESCE(c.state, '') as address,
         c.country as nationality,
         ci.document_type as identification_type, 
         ci.document_key as identification_number
       FROM 
         fineract_default.client c
       LEFT JOIN 
         fineract_default.client_identifier ci ON c.id = ci.client_id
       WHERE 
         c.id = $1
       LIMIT 1`,
      [clientId]
    );
    
    return query.rows.length > 0 ? query.rows[0] : null;
  }
  
  /**
   * Perform a single fraud check
   * @param checkType Type of check to perform
   * @param request Fraud detection request
   * @returns Result of the check
   */
  private async performSingleCheck(
    checkType: FraudCheckType, 
    request: FraudDetectionRequest
  ): Promise<FraudCheckResult> {
    logger.info(`Performing ${checkType} check`, { clientId: request.clientId });
    
    // In a real implementation, this would call external APIs for each check type
    // For now, simulate the checks with realistic behavior
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get a deterministic "random" value based on client ID and check type
    // to ensure consistent results for the same client
    const hash = this.hashString(`${request.clientId}-${checkType}`);
    const pseudoRandom = (hash % 100) / 100; // 0-1 value
    
    switch (checkType) {
      case FraudCheckType.IDENTITY_VERIFICATION:
        return this.simulateIdentityVerification(request, pseudoRandom);
      
      case FraudCheckType.ADDRESS_VERIFICATION:
        return this.simulateAddressVerification(request, pseudoRandom);
      
      case FraudCheckType.DOCUMENT_AUTHENTICITY:
        return this.simulateDocumentAuthenticity(request, pseudoRandom);
      
      case FraudCheckType.TRANSACTION_PATTERN:
        return this.simulateTransactionPatternAnalysis(request, pseudoRandom);
      
      case FraudCheckType.AML_SCREENING:
        return this.simulateAmlScreening(request, pseudoRandom);
      
      case FraudCheckType.PEP_SCREENING:
        return this.simulatePepScreening(request, pseudoRandom);
      
      case FraudCheckType.SANCTIONS_SCREENING:
        return this.simulateSanctionsScreening(request, pseudoRandom);
      
      case FraudCheckType.CREDIT_BEHAVIOR:
        return this.simulateCreditBehaviorAnalysis(request, pseudoRandom);
      
      default:
        throw new Error(`Unsupported check type: ${checkType}`);
    }
  }
  
  /**
   * Simple string hash function for deterministic pseudo-random values
   * @param str String to hash
   * @returns Hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Simulate identity verification check
   */
  private simulateIdentityVerification(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    // Higher score is better (less risk)
    let score = 80 + Math.floor(pseudoRandom * 20); // Base score 80-100
    
    // Adjust score based on available information
    if (!request.identificationNumber) score -= 30;
    if (!request.dateOfBirth) score -= 20;
    
    // Determine risk level based on score
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 60) riskLevel = FraudRiskLevel.HIGH;
    else if (score < 80) riskLevel = FraudRiskLevel.MEDIUM;
    
    // For testing: occasionally generate high risk results
    if (pseudoRandom < 0.05) {
      score = 50;
      riskLevel = FraudRiskLevel.HIGH;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'Identity successfully verified with government records.';
    } else if (riskLevel === FraudRiskLevel.MEDIUM) {
      details = 'Partial identity match. Additional verification may be required.';
    } else {
      details = 'Identity verification failed. Manual verification required.';
    }
    
    // Generate match details
    const matchDetails = {
      nameMatch: score > 70,
      dobMatch: score > 80,
      idNumberMatch: score > 90,
      confidence: score / 100
    };
    
    return Promise.resolve({
      checkType: FraudCheckType.IDENTITY_VERIFICATION,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      matchDetails,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Simulate address verification check
   */
  private simulateAddressVerification(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    if (!request.address) {
      return Promise.resolve({
        checkType: FraudCheckType.ADDRESS_VERIFICATION,
        checkId: uuidv4(),
        status: FraudCheckStatus.FAILED,
        riskLevel: FraudRiskLevel.MEDIUM,
        score: 50,
        details: 'Address information not provided.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Higher score is better (less risk)
    let score = 75 + Math.floor(pseudoRandom * 25); // Base score 75-100
    
    // Determine risk level based on score
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 60) riskLevel = FraudRiskLevel.HIGH;
    else if (score < 80) riskLevel = FraudRiskLevel.MEDIUM;
    
    // For testing: occasionally generate high risk results
    if (pseudoRandom < 0.08) {
      score = 55;
      riskLevel = FraudRiskLevel.HIGH;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'Address successfully verified with postal records.';
    } else if (riskLevel === FraudRiskLevel.MEDIUM) {
      details = 'Address partially verified. Recent changes may not be reflected.';
    } else {
      details = 'Address verification failed. Address may be non-existent or high-risk.';
    }
    
    return Promise.resolve({
      checkType: FraudCheckType.ADDRESS_VERIFICATION,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Simulate document authenticity check
   */
  private simulateDocumentAuthenticity(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    if (!request.documentIds || request.documentIds.length === 0) {
      return Promise.resolve({
        checkType: FraudCheckType.DOCUMENT_AUTHENTICITY,
        checkId: uuidv4(),
        status: FraudCheckStatus.FAILED,
        riskLevel: FraudRiskLevel.MEDIUM,
        score: 50,
        details: 'No documents provided for authenticity check.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Higher score is better (less risk)
    let score = 85 + Math.floor(pseudoRandom * 15); // Base score 85-100
    
    // Determine risk level based on score
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 70) riskLevel = FraudRiskLevel.HIGH;
    else if (score < 85) riskLevel = FraudRiskLevel.MEDIUM;
    
    // For testing: occasionally generate suspicious document results
    if (pseudoRandom < 0.03) {
      score = 45;
      riskLevel = FraudRiskLevel.CRITICAL;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'All documents passed authenticity verification.';
    } else if (riskLevel === FraudRiskLevel.MEDIUM) {
      details = 'Some document security features could not be verified. Manual review recommended.';
    } else if (riskLevel === FraudRiskLevel.HIGH) {
      details = 'Potential document tampering detected. Manual verification required.';
    } else {
      details = 'Suspicious document manipulation detected. High fraud risk.';
    }
    
    return Promise.resolve({
      checkType: FraudCheckType.DOCUMENT_AUTHENTICITY,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Simulate transaction pattern analysis
   */
  private simulateTransactionPatternAnalysis(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    // Higher score is better (less risk)
    let score = 90 + Math.floor(pseudoRandom * 10); // Base score 90-100
    
    // Determine risk level based on score
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 75) riskLevel = FraudRiskLevel.HIGH;
    else if (score < 90) riskLevel = FraudRiskLevel.MEDIUM;
    
    // For testing: occasionally generate suspicious pattern results
    if (pseudoRandom < 0.07) {
      score = 65;
      riskLevel = FraudRiskLevel.HIGH;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'No suspicious transaction patterns detected.';
    } else if (riskLevel === FraudRiskLevel.MEDIUM) {
      details = 'Some unusual transaction patterns detected. Monitoring recommended.';
    } else {
      details = 'Suspicious transaction patterns detected. Review recommended.';
    }
    
    return Promise.resolve({
      checkType: FraudCheckType.TRANSACTION_PATTERN,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Simulate AML (Anti-Money Laundering) screening
   */
  private simulateAmlScreening(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    // For AML, we check against databases of known money laundering activities
    
    // Higher score is better (less risk)
    let score = 95 + Math.floor(pseudoRandom * 5); // Base score 95-100 (most people pass AML checks)
    
    // Determine risk level based on score
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 50) riskLevel = FraudRiskLevel.CRITICAL;
    else if (score < 70) riskLevel = FraudRiskLevel.HIGH;
    else if (score < 90) riskLevel = FraudRiskLevel.MEDIUM;
    
    // For testing: very rarely generate AML hits (should be uncommon)
    if (pseudoRandom < 0.01) {
      score = 30;
      riskLevel = FraudRiskLevel.CRITICAL;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'No matches found in AML screening.';
    } else if (riskLevel === FraudRiskLevel.MEDIUM) {
      details = 'Partial name match in AML database. Further verification required.';
    } else if (riskLevel === FraudRiskLevel.HIGH) {
      details = 'Potential AML risk detected. Manual verification required.';
    } else {
      details = 'Strong match with known money laundering patterns. Escalate immediately.';
    }
    
    // Generate match details for higher risk results
    let matchDetails = undefined;
    if (riskLevel !== FraudRiskLevel.LOW) {
      matchDetails = {
        matchType: riskLevel === FraudRiskLevel.CRITICAL ? 'direct' : 'partial',
        confidence: (100 - score) / 100,
        matchedFields: ['name']
      };
    }
    
    return Promise.resolve({
      checkType: FraudCheckType.AML_SCREENING,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      matchDetails,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Simulate PEP (Politically Exposed Person) screening
   */
  private simulatePepScreening(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    // For PEP, we check against databases of politically exposed persons
    
    // Higher score is better (less risk)
    let score = 98 + Math.floor(pseudoRandom * 2); // Base score 98-100 (most people aren't PEPs)
    
    // Determine risk level based on score
    // Note: Being a PEP is not inherently bad, but requires enhanced due diligence
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 60) riskLevel = FraudRiskLevel.HIGH;
    else if (score < 80) riskLevel = FraudRiskLevel.MEDIUM;
    
    // For testing: very rarely generate PEP matches (should be uncommon)
    if (pseudoRandom < 0.005) {
      score = 50;
      riskLevel = FraudRiskLevel.HIGH;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'No PEP matches found.';
    } else if (riskLevel === FraudRiskLevel.MEDIUM) {
      details = 'Possible distant relation to PEP detected. Additional verification may be required.';
    } else {
      details = 'PEP match found. Enhanced due diligence required per regulations.';
    }
    
    // Generate match details for PEP hits
    let matchDetails = undefined;
    if (riskLevel !== FraudRiskLevel.LOW) {
      matchDetails = {
        pepCategory: riskLevel === FraudRiskLevel.HIGH ? 'Category 1' : 'Category 2',
        relationshipType: riskLevel === FraudRiskLevel.HIGH ? 'direct' : 'family_member',
        position: 'Unknown',
        jurisdiction: 'Trinidad and Tobago'
      };
    }
    
    return Promise.resolve({
      checkType: FraudCheckType.PEP_SCREENING,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      matchDetails,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Simulate sanctions screening
   */
  private simulateSanctionsScreening(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    // For sanctions, we check against global sanctions lists
    
    // Higher score is better (less risk)
    let score = 99 + Math.floor(pseudoRandom * 1); // Base score 99-100 (sanctions hits are very rare)
    
    // Determine risk level based on score
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 50) riskLevel = FraudRiskLevel.CRITICAL;
    else if (score < 70) riskLevel = FraudRiskLevel.HIGH;
    
    // For testing: extremely rarely generate sanctions hits
    if (pseudoRandom < 0.002) {
      score = 10;
      riskLevel = FraudRiskLevel.CRITICAL;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'No sanctions matches found.';
    } else if (riskLevel === FraudRiskLevel.HIGH) {
      details = 'Potential match with sanctioned individual. Detailed verification required.';
    } else {
      details = 'Strong match with sanctioned individual. Escalate immediately per regulations.';
    }
    
    // Generate match details for sanctions hits
    let matchDetails = undefined;
    if (riskLevel !== FraudRiskLevel.LOW) {
      matchDetails = {
        listName: 'OFAC SDN',
        matchConfidence: (100 - score) / 100,
        sanctionsType: 'Economic',
        issuer: 'United States'
      };
    }
    
    return Promise.resolve({
      checkType: FraudCheckType.SANCTIONS_SCREENING,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      matchDetails,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Simulate credit behavior analysis
   */
  private simulateCreditBehaviorAnalysis(
    request: FraudDetectionRequest, 
    pseudoRandom: number
  ): Promise<FraudCheckResult> {
    // Higher score is better (less risk)
    let score = 75 + Math.floor(pseudoRandom * 25); // Base score 75-100
    
    // Determine risk level based on score
    let riskLevel = FraudRiskLevel.LOW;
    if (score < 60) riskLevel = FraudRiskLevel.HIGH;
    else if (score < 75) riskLevel = FraudRiskLevel.MEDIUM;
    
    // For testing: sometimes generate suspicious behavior results
    if (pseudoRandom < 0.1) {
      score = 55;
      riskLevel = FraudRiskLevel.HIGH;
    }
    
    // Generate details message
    let details = '';
    if (riskLevel === FraudRiskLevel.LOW) {
      details = 'No suspicious credit behavior patterns detected.';
    } else if (riskLevel === FraudRiskLevel.MEDIUM) {
      details = 'Some unusual credit patterns detected. Monitoring recommended.';
    } else {
      details = 'Suspicious credit behavior patterns detected. Review recommended.';
    }
    
    return Promise.resolve({
      checkType: FraudCheckType.CREDIT_BEHAVIOR,
      checkId: uuidv4(),
      status: FraudCheckStatus.COMPLETED,
      riskLevel,
      score,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Calculate overall risk level from individual check results
   * @param checks Array of check results
   * @returns Overall risk level
   */
  private calculateOverallRiskLevel(checks: FraudCheckResult[]): FraudRiskLevel {
    // If any check is CRITICAL, the overall is CRITICAL
    if (checks.some(check => check.riskLevel === FraudRiskLevel.CRITICAL)) {
      return FraudRiskLevel.CRITICAL;
    }
    
    // If any check is HIGH, the overall is HIGH
    if (checks.some(check => check.riskLevel === FraudRiskLevel.HIGH)) {
      return FraudRiskLevel.HIGH;
    }
    
    // If any check is MEDIUM, the overall is MEDIUM
    if (checks.some(check => check.riskLevel === FraudRiskLevel.MEDIUM)) {
      return FraudRiskLevel.MEDIUM;
    }
    
    // If all checks passed, the overall is LOW
    return FraudRiskLevel.LOW;
  }
  
  /**
   * Store fraud detection result in the database
   * @param result Fraud detection result
   */
  private async storeFraudDetectionResult(result: FraudDetectionResult): Promise<void> {
    const now = new Date().toISOString();
    
    // Insert main record
    await db.query(
      `INSERT INTO fineract_default.fraud_check (
        id, client_id, check_date, overall_risk_level, requires_manual_review,
        review_reason, created_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        result.requestId,
        result.clientId,
        result.timestamp,
        result.overallRiskLevel,
        result.requiresManualReview,
        result.reviewReason,
        now,
        'system'
      ]
    );
    
    // Insert individual check results
    for (const check of result.checks) {
      await db.query(
        `INSERT INTO fineract_default.fraud_check_detail (
          id, fraud_check_id, check_type, status, risk_level, score, details,
          match_details, created_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          check.checkId,
          result.requestId,
          check.checkType,
          check.status,
          check.riskLevel,
          check.score,
          check.details,
          check.matchDetails ? JSON.stringify(check.matchDetails) : null,
          now,
          'system'
        ]
      );
    }
  }
  
  /**
   * Update client's risk status in the database
   * @param clientId Client ID
   * @param riskLevel Risk level
   * @param reason Reason for risk status
   */
  private async updateClientRiskStatus(
    clientId: string,
    riskLevel: FraudRiskLevel,
    reason?: string
  ): Promise<void> {
    await db.query(
      `UPDATE fineract_default.client
       SET risk_level = $1, 
           risk_reason = $2,
           last_risk_review_date = $3,
           last_modified_date = $3
       WHERE id = $4`,
      [riskLevel, reason || `Fraud detection result: ${riskLevel}`, new Date().toISOString(), clientId]
    );
  }
  
  /**
   * Get fraud detection history for a client
   * @param clientId Client ID
   * @param limit Maximum number of records to return
   * @returns Array of fraud detection results
   */
  async getFraudDetectionHistory(clientId: string, limit = 10): Promise<FraudDetectionResult[]> {
    // Get main fraud check records
    const mainQuery = await db.query(
      `SELECT * FROM fineract_default.fraud_check
       WHERE client_id = $1
       ORDER BY check_date DESC
       LIMIT $2`,
      [clientId, limit]
    );
    
    const results: FraudDetectionResult[] = [];
    
    // For each main record, get the detailed checks
    for (const row of mainQuery.rows) {
      const detailsQuery = await db.query(
        `SELECT * FROM fineract_default.fraud_check_detail
         WHERE fraud_check_id = $1
         ORDER BY created_date ASC`,
        [row.id]
      );
      
      // Format the checks
      const checks: FraudCheckResult[] = detailsQuery.rows.map(detail => ({
        checkType: detail.check_type as FraudCheckType,
        checkId: detail.id,
        status: detail.status as FraudCheckStatus,
        riskLevel: detail.risk_level as FraudRiskLevel,
        score: detail.score,
        details: detail.details,
        matchDetails: detail.match_details ? JSON.parse(detail.match_details) : undefined,
        timestamp: detail.created_date
      }));
      
      // Format the result
      results.push({
        requestId: row.id,
        clientId: row.client_id,
        timestamp: row.check_date,
        overallRiskLevel: row.overall_risk_level as FraudRiskLevel,
        checks,
        requiresManualReview: row.requires_manual_review,
        reviewReason: row.review_reason
      });
    }
    
    return results;
  }
  
  /**
   * Get a specific fraud detection result by ID
   * @param checkId Fraud check ID
   * @returns Fraud detection result
   */
  async getFraudDetectionById(checkId: string): Promise<FraudDetectionResult | null> {
    // Get main fraud check record
    const mainQuery = await db.query(
      `SELECT * FROM fineract_default.fraud_check
       WHERE id = $1`,
      [checkId]
    );
    
    if (mainQuery.rows.length === 0) {
      return null;
    }
    
    const row = mainQuery.rows[0];
    
    // Get detailed checks
    const detailsQuery = await db.query(
      `SELECT * FROM fineract_default.fraud_check_detail
       WHERE fraud_check_id = $1
       ORDER BY created_date ASC`,
      [row.id]
    );
    
    // Format the checks
    const checks: FraudCheckResult[] = detailsQuery.rows.map(detail => ({
      checkType: detail.check_type as FraudCheckType,
      checkId: detail.id,
      status: detail.status as FraudCheckStatus,
      riskLevel: detail.risk_level as FraudRiskLevel,
      score: detail.score,
      details: detail.details,
      matchDetails: detail.match_details ? JSON.parse(detail.match_details) : undefined,
      timestamp: detail.created_date
    }));
    
    // Format the result
    return {
      requestId: row.id,
      clientId: row.client_id,
      timestamp: row.check_date,
      overallRiskLevel: row.overall_risk_level as FraudRiskLevel,
      checks,
      requiresManualReview: row.requires_manual_review,
      reviewReason: row.review_reason
    };
  }
  
  /**
   * Resolve a manual review
   * @param checkId Fraud check ID
   * @param approved Whether the review is approved
   * @param notes Review notes
   * @param reviewerId ID of the reviewer
   * @returns Updated fraud detection result
   */
  async resolveManualReview(
    checkId: string, 
    approved: boolean, 
    notes: string, 
    reviewerId: string
  ): Promise<FraudDetectionResult | null> {
    // Get the check first
    const check = await this.getFraudDetectionById(checkId);
    
    if (!check) {
      return null;
    }
    
    // Update the database
    await db.query(
      `UPDATE fineract_default.fraud_check
       SET manual_review_resolved = true,
           manual_review_approved = $1,
           manual_review_notes = $2,
           manual_review_date = $3,
           manual_review_by = $4,
           last_modified_date = $3,
           last_modified_by = $4
       WHERE id = $5`,
      [approved, notes, new Date().toISOString(), reviewerId, checkId]
    );
    
    // If approved, update client's risk status
    if (approved) {
      await db.query(
        `UPDATE fineract_default.client
         SET risk_level = 'low',
             risk_reason = $1,
             last_risk_review_date = $2,
             last_modified_date = $2,
             last_modified_by = $3
         WHERE id = $4`,
        [
          `Manual review approved: ${notes}`, 
          new Date().toISOString(), 
          reviewerId, 
          check.clientId
        ]
      );
    }
    
    // Get the updated record
    return this.getFraudDetectionById(checkId);
  }
  
  /**
   * Get pending manual reviews
   * @param limit Maximum number of records to return
   * @param offset Offset for pagination
   * @returns Array of fraud detection results that require manual review
   */
  async getPendingManualReviews(limit = 20, offset = 0): Promise<FraudDetectionResult[]> {
    // Get main fraud check records that require manual review
    const mainQuery = await db.query(
      `SELECT fc.*, c.firstname, c.lastname
       FROM fineract_default.fraud_check fc
       JOIN fineract_default.client c ON fc.client_id = c.id
       WHERE fc.requires_manual_review = true
       AND (fc.manual_review_resolved IS NULL OR fc.manual_review_resolved = false)
       ORDER BY fc.check_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const results: FraudDetectionResult[] = [];
    
    // For each main record, get the detailed checks
    for (const row of mainQuery.rows) {
      const detailsQuery = await db.query(
        `SELECT * FROM fineract_default.fraud_check_detail
         WHERE fraud_check_id = $1
         ORDER BY created_date ASC`,
        [row.id]
      );
      
      // Format the checks
      const checks: FraudCheckResult[] = detailsQuery.rows.map(detail => ({
        checkType: detail.check_type as FraudCheckType,
        checkId: detail.id,
        status: detail.status as FraudCheckStatus,
        riskLevel: detail.risk_level as FraudRiskLevel,
        score: detail.score,
        details: detail.details,
        matchDetails: detail.match_details ? JSON.parse(detail.match_details) : undefined,
        timestamp: detail.created_date
      }));
      
      // Format the result
      results.push({
        requestId: row.id,
        clientId: row.client_id,
        timestamp: row.check_date,
        overallRiskLevel: row.overall_risk_level as FraudRiskLevel,
        checks,
        requiresManualReview: row.requires_manual_review,
        reviewReason: row.review_reason,
        // Add client name for the reviews list
        clientName: `${row.firstname} ${row.lastname}`
      } as any); // Cast to any to allow clientName
    }
    
    return results;
  }
}