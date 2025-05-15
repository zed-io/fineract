import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { authMiddleware } from '../utils/authMiddleware';
import { errorHandler } from '../utils/errorHandler';

// Digital Onboarding Module
export const digitalOnboarding = async (req: express.Request, res: express.Response) => {
  try {
    const { 
      firstName, lastName, middleName, dateOfBirth, gender, email, 
      mobileNo, addressLine1, addressLine2, city, stateProvince, 
      country, postalCode, identificationType, identificationNumber,
      employmentStatus, monthlyIncome, deviceInfo 
    } = req.body.input;

    logger.info('Processing digital onboarding request');
    
    // 1. Create new client record
    const clientId = uuidv4();
    await db.query(
      `INSERT INTO fineract_default.client 
      (id, status, firstname, lastname, middlename, mobile_no, email, date_of_birth, gender, 
      address_line_1, address_line_2, city, state_province, country, postal_code, 
      is_staff, display_name, office_id, activation_date, created_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)`,
      [
        clientId, 'pending', firstName, lastName, middleName, mobileNo, email, 
        dateOfBirth, gender, addressLine1, addressLine2, city, stateProvince, 
        country, postalCode, false, `${firstName} ${lastName}`, 
        // Default head office ID - would be configurable in production
        'a3e25372-5a28-4bde-8fa9-44c52f3e6c85', null
      ]
    );

    // 2. Create identity verification record for the uploaded document
    await db.query(
      `INSERT INTO fineract_default.identity_verification 
      (client_id, document_type, document_number, verification_status, created_date) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [clientId, identificationType, identificationNumber, 'pending']
    );

    // 3. If device info provided, create mobile banking profile
    if (deviceInfo) {
      await db.query(
        `INSERT INTO fineract_default.mobile_banking_profile 
        (client_id, device_id, device_type, device_model, os_version, app_version, created_date) 
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          clientId, deviceInfo.deviceId, deviceInfo.deviceType, 
          deviceInfo.deviceModel, deviceInfo.osVersion, deviceInfo.appVersion
        ]
      );
    }

    // 4. Determine required documents based on credit union config
    const configResult = await db.query(
      `SELECT kyc_document_requirements FROM fineract_default.credit_union_config 
       WHERE office_id = $1 LIMIT 1`,
      ['a3e25372-5a28-4bde-8fa9-44c52f3e6c85'] // Default head office ID
    );
    
    let requiredDocuments = [];
    if (configResult.rows.length > 0 && configResult.rows[0].kyc_document_requirements) {
      requiredDocuments = configResult.rows[0].kyc_document_requirements.required || [];
    }

    return res.json({
      success: true,
      clientId: clientId,
      message: "Client onboarding initiated successfully",
      requiredDocuments: requiredDocuments,
      nextStep: "document_verification"
    });
  } catch (error) {
    logger.error('Error in digitalOnboarding:', error);
    return errorHandler(res, 'Failed to process digital onboarding', error);
  }
};

// Upload KYC Document
export const uploadKycDocument = async (req: express.Request, res: express.Response) => {
  try {
    const { 
      clientId, documentType, documentNumber, issuingAuthority, 
      issueDate, expiryDate, documentImageBase64, deviceInfo 
    } = req.body.input;

    logger.info(`Processing KYC document upload for client: ${clientId}`);
    
    // 1. Store document image (in a real implementation, this would upload to secure storage)
    const documentUrl = `${process.env.DOCUMENT_STORAGE_URL}/clients/${clientId}/${documentType}_${Date.now()}.jpg`;
    
    // 2. Record document in identity verification table
    const verificationId = uuidv4();
    await db.query(
      `INSERT INTO fineract_default.identity_verification 
      (id, client_id, document_type, document_number, issuing_authority, issue_date, 
      expiry_date, verification_status, document_image_url, created_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        verificationId, clientId, documentType, documentNumber, issuingAuthority,
        issueDate, expiryDate, 'pending', documentUrl
      ]
    );

    return res.json({
      success: true,
      verificationId: verificationId,
      message: "Document uploaded successfully and pending verification",
      status: "pending",
      nextStep: "await_verification"
    });
  } catch (error) {
    logger.error('Error in uploadKycDocument:', error);
    return errorHandler(res, 'Failed to upload KYC document', error);
  }
};

// Digital Loan Application
export const submitDigitalLoanApplication = async (req: express.Request, res: express.Response) => {
  try {
    const { 
      clientId, productId, principal, term, purpose, repaymentMethod,
      preferredDisbursementDate, preferredRepaymentDay, collateralDetails,
      employmentDetails, deviceInfo 
    } = req.body.input;

    logger.info(`Processing digital loan application for client: ${clientId}`);
    
    // 1. Get loan product details
    const productResult = await db.query(
      `SELECT * FROM fineract_default.loan_product WHERE id = $1`,
      [productId]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loan product not found"
      });
    }
    
    // 2. Create loan record
    const loanId = uuidv4();
    const product = productResult.rows[0];
    
    await db.query(
      `INSERT INTO fineract_default.loan 
      (id, client_id, loan_product_id, loan_status, principal_amount, 
      currency_code, currency_digits, term_frequency, term_frequency_type,
      annual_nominal_interest_rate, interest_method_type, amortization_method_type,
      submitted_on_date, expected_disbursement_date, created_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)`,
      [
        loanId, clientId, productId, 'submitted_and_pending_approval', principal,
        'TTD', 2, term, 'months', product.annual_nominal_interest_rate,
        product.interest_method_type, product.amortization_method_type,
        new Date(), preferredDisbursementDate || new Date()
      ]
    );
    
    // 3. Create loan application workflow record
    const workflowId = uuidv4();
    await db.query(
      `INSERT INTO fineract_default.loan_application_workflow 
      (id, loan_id, client_id, current_stage, application_channel, 
      additional_details, created_date) 
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        workflowId, loanId, clientId, 'submitted', 'mobile',
        JSON.stringify({
          purpose: purpose,
          preferredRepaymentDay: preferredRepaymentDay,
          employmentDetails: employmentDetails
        })
      ]
    );
    
    // 4. Add collateral information if provided
    if (collateralDetails && collateralDetails.length > 0) {
      for (const collateral of collateralDetails) {
        await db.query(
          `INSERT INTO fineract_default.loan_collateral 
          (loan_id, collateral_type_id, value, description, created_date) 
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [
            loanId, 
            // Would need to map to actual collateral type IDs in real implementation
            'f7a79068-f3e9-4da0-9c8b-dc78e51d9e84', 
            collateral.value, 
            collateral.description
          ]
        );
      }
    }

    // 5. Create repayment method record if provided
    if (repaymentMethod) {
      await db.query(
        `INSERT INTO fineract_default.loan_repayment_method 
        (loan_id, repayment_type, is_default, created_date) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [loanId, repaymentMethod, true]
      );
    }

    return res.json({
      success: true,
      loanApplicationId: workflowId,
      loanId: loanId,
      message: "Loan application submitted successfully",
      status: "pending_approval",
      estimatedApprovalTime: "24-48 hours",
      requiredDocuments: ["income_proof", "address_proof"]
    });
  } catch (error) {
    logger.error('Error in submitDigitalLoanApplication:', error);
    return errorHandler(res, 'Failed to submit digital loan application', error);
  }
};

// Setup Mobile Banking Profile
export const setupMobileBankingProfile = async (req: express.Request, res: express.Response) => {
  try {
    const {
      clientId, deviceId, deviceType, deviceModel, osVersion,
      appVersion, enableBiometric, pushNotificationToken
    } = req.body.input;

    logger.info(`Setting up mobile banking profile for client: ${clientId}`);
    
    // Check if profile already exists for this device
    const existingResult = await db.query(
      `SELECT id FROM fineract_default.mobile_banking_profile 
       WHERE client_id = $1 AND device_id = $2`,
      [clientId, deviceId]
    );
    
    let profileId;
    
    if (existingResult.rows.length > 0) {
      // Update existing profile
      profileId = existingResult.rows[0].id;
      await db.query(
        `UPDATE fineract_default.mobile_banking_profile 
         SET device_type = $1, device_model = $2, os_version = $3, app_version = $4,
         biometric_enabled = $5, push_notification_token = $6, last_login_timestamp = CURRENT_TIMESTAMP,
         last_modified_date = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [deviceType, deviceModel, osVersion, appVersion, enableBiometric, pushNotificationToken, profileId]
      );
    } else {
      // Create new profile
      profileId = uuidv4();
      await db.query(
        `INSERT INTO fineract_default.mobile_banking_profile 
         (id, client_id, device_id, device_type, device_model, os_version, app_version,
         biometric_enabled, push_notification_token, last_login_timestamp, created_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          profileId, clientId, deviceId, deviceType, deviceModel, osVersion,
          appVersion, enableBiometric, pushNotificationToken
        ]
      );
    }
    
    // Check if security questions are already configured
    const securityQuestionsResult = await db.query(
      `SELECT COUNT(*) as count FROM fineract_default.user_security_answer
       WHERE app_user_id = (SELECT id FROM fineract_default.app_user WHERE client_id = $1)`,
      [clientId]
    );
    
    const securityQuestionsRequired = parseInt(securityQuestionsResult.rows[0].count) < 3;
    
    // Check if MFA is configured
    const mfaResult = await db.query(
      `SELECT COUNT(*) as count FROM fineract_default.multi_factor_auth
       WHERE app_user_id = (SELECT id FROM fineract_default.app_user WHERE client_id = $1)
       AND is_enabled = true`,
      [clientId]
    );
    
    const mfaRequired = parseInt(mfaResult.rows[0].count) === 0;

    return res.json({
      success: true,
      profileId: profileId,
      message: "Mobile banking profile setup successfully",
      securityQuestionsRequired: securityQuestionsRequired,
      biometricSetupRequired: enableBiometric,
      mfaRequired: mfaRequired
    });
  } catch (error) {
    logger.error('Error in setupMobileBankingProfile:', error);
    return errorHandler(res, 'Failed to setup mobile banking profile', error);
  }
};

// More handler implementations would follow for other actions like:
// - setupSecurityQuestions
// - linkDigitalWallet
// - processDigitalLoanRepayment
// - setupMfaAuthentication
// - getSecurityQuestions
// - getLinkedDigitalWallets
// - getClientVerificationStatus

// Export all handlers
export const trinidadHandlers = {
  digitalOnboarding,
  uploadKycDocument,
  submitDigitalLoanApplication,
  setupMobileBankingProfile
  // Add other handlers as they are implemented
};