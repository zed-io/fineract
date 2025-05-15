import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';

/**
 * Handle member search request
 */
export const searchMembers = async (req: express.Request, res: express.Response) => {
  try {
    const {
      membershipNumber,
      name,
      mobileNo,
      emailAddress,
      identificationNumber,
      status,
      limit = 10,
      offset = 0,
      orderBy = 'createdDate',
      sortOrder = 'DESC'
    } = req.body.input || {};

    // Get tenant ID from the request headers (set by Hasura)
    const tenantId = req.headers['x-hasura-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    logger.info(`Searching members for tenant ${tenantId}`);

    // Construct the base query
    let query = `
      SELECT 
        c.id, 
        ec.membership_number as "membershipNumber",
        c.external_id as "externalId", 
        CASE 
          WHEN ec.member_status = 'active' THEN 'ACTIVE'
          WHEN ec.member_status = 'dormant' THEN 'DORMANT'
          WHEN ec.member_status = 'suspended' THEN 'SUSPENDED'
          WHEN ec.member_status = 'closed' THEN 'CLOSED'
          ELSE 'PENDING'
        END as status,
        c.firstname as "firstName", 
        c.lastname as "lastName", 
        c.middlename as "middleName",
        c.display_name as "displayName",
        c.date_of_birth as "dateOfBirth",
        c.gender,
        c.mobile_no as "mobileNo",
        c.email as "emailAddress",
        c.address_line_1 as "addressLine1",
        c.address_line_2 as "addressLine2",
        c.city,
        c.state_province as "stateProvince",
        c.country,
        c.postal_code as "postalCode",
        ec.employment_status as "employmentStatus",
        ec.employer_name as "employerName",
        ec.job_title as "jobTitle",
        ec.monthly_income as "monthlyIncome",
        ec.annual_income as "annualIncome",
        ec.membership_date as "membershipDate",
        ec.risk_rating as "riskRating",
        ec.credit_score as "creditScore",
        ec.member_category as "memberCategory",
        ec.total_shares_value as "totalSharesValue",
        ec.total_loan_value as "totalLoanValue",
        ec.total_deposit_value as "totalDepositValue",
        ec.pep_status as "isPep",
        ec.fatca_status as "isFatca",
        c.is_active as "isActive",
        c.created_date as "createdDate",
        c.last_modified_date as "lastModifiedDate",
        (
          SELECT COUNT(*) FROM identity_verification iv 
          WHERE iv.client_id = c.id AND iv.verification_status = 'verified'
        ) > 0 as "hasVerifiedDocuments",
        (
          SELECT json_agg(json_build_object(
            'id', iv.id,
            'documentType', iv.document_type,
            'documentNumber', iv.document_number,
            'issuingAuthority', iv.issuing_authority,
            'issueDate', iv.issue_date,
            'expiryDate', iv.expiry_date,
            'verificationStatus', iv.verification_status,
            'verificationDate', iv.verification_date,
            'documentUrl', iv.document_image_url,
            'isActive', COALESCE(
              (iv.verification_status = 'verified' AND (iv.expiry_date IS NULL OR iv.expiry_date >= CURRENT_DATE)), 
              FALSE
            )
          ))
          FROM identity_verification iv
          WHERE iv.client_id = c.id
        ) as "identifications"
      FROM 
        client c
      LEFT JOIN 
        enhanced_cif ec ON c.id = ec.client_id AND ec.tenant_id = $1
      WHERE 
        1=1
    `;

    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    // Add filters
    if (membershipNumber) {
      query += ` AND ec.membership_number = $${paramIndex++}`;
      queryParams.push(membershipNumber);
    }

    if (name) {
      query += ` AND (c.firstname ILIKE $${paramIndex} OR c.lastname ILIKE $${paramIndex} OR c.display_name ILIKE $${paramIndex})`;
      queryParams.push(`%${name}%`);
      paramIndex++;
    }

    if (mobileNo) {
      query += ` AND c.mobile_no = $${paramIndex++}`;
      queryParams.push(mobileNo);
    }

    if (emailAddress) {
      query += ` AND c.email = $${paramIndex++}`;
      queryParams.push(emailAddress);
    }

    if (identificationNumber) {
      query += ` AND EXISTS (
        SELECT 1 FROM identity_verification iv 
        WHERE iv.client_id = c.id AND iv.document_number = $${paramIndex++}
      )`;
      queryParams.push(identificationNumber);
    }

    if (status) {
      // Map external status to internal status
      let internalStatus = '';
      switch (status) {
        case 'ACTIVE':
          internalStatus = 'active';
          break;
        case 'DORMANT':
          internalStatus = 'dormant';
          break;
        case 'SUSPENDED':
          internalStatus = 'suspended';
          break;
        case 'CLOSED':
          internalStatus = 'closed';
          break;
        case 'PENDING':
          internalStatus = 'pending';
          break;
      }
      
      query += ` AND ec.member_status = $${paramIndex++}`;
      queryParams.push(internalStatus);
    }

    // Count total (before applying limit/offset)
    const countQuery = `SELECT COUNT(*) FROM (${query}) as count_query`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Add order by and pagination
    query += ` ORDER BY ${orderBy === 'createdDate' ? 'c.created_date' : orderBy} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit);
    queryParams.push(offset);

    // Execute the final query
    const result = await db.query(query, queryParams);

    // Process and return results
    const members = result.rows.map(row => {
      // Determine KYC status
      let kycStatus = 'NOT_STARTED';
      if (row.identifications && row.identifications.length > 0) {
        const allVerified = row.identifications.every((id: any) => id.verificationStatus === 'verified');
        const anyRejected = row.identifications.some((id: any) => id.verificationStatus === 'rejected');
        const anyVerified = row.identifications.some((id: any) => id.verificationStatus === 'verified');
        const anyPending = row.identifications.some((id: any) => id.verificationStatus === 'pending');
        const anyExpired = row.identifications.some((id: any) => id.verificationStatus === 'verified' && id.expiryDate && new Date(id.expiryDate) < new Date());
        
        if (allVerified && !anyExpired) {
          kycStatus = 'FULLY_VERIFIED';
        } else if (anyRejected) {
          kycStatus = 'REJECTED';
        } else if (anyExpired) {
          kycStatus = 'EXPIRED';
        } else if (anyVerified) {
          kycStatus = 'PARTIALLY_VERIFIED';
        } else if (anyPending) {
          kycStatus = 'PENDING';
        }
      }

      // Format the member object to match GraphQL schema
      return {
        id: row.id,
        membershipNumber: row.membershipNumber,
        externalId: row.externalId,
        status: row.status,
        firstName: row.firstName,
        lastName: row.lastName,
        middleName: row.middleName,
        displayName: row.displayName,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        mobileNo: row.mobileNo,
        emailAddress: row.emailAddress,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        city: row.city,
        stateProvince: row.stateProvince,
        country: row.country,
        postalCode: row.postalCode,
        employmentStatus: row.employmentStatus,
        employerName: row.employerName,
        jobTitle: row.jobTitle,
        monthlyIncome: row.monthlyIncome,
        annualIncome: row.annualIncome,
        membershipDate: row.membershipDate,
        riskRating: row.riskRating,
        creditScore: row.creditScore,
        memberCategory: row.memberCategory,
        totalSharesValue: row.totalSharesValue,
        totalLoanValue: row.totalLoanValue,
        totalDepositValue: row.totalDepositValue,
        kycStatus: kycStatus,
        isActive: row.isActive,
        isPep: row.isPep,
        isFatca: row.isFatca,
        createdDate: row.createdDate,
        lastModifiedDate: row.lastModifiedDate,
        identifications: row.identifications || []
      };
    });

    return res.json({
      totalCount,
      members
    });
  } catch (error) {
    logger.error('Error in searchMembers:', error);
    return errorHandler(res, 'Failed to search members', error);
  }
};

/**
 * Get member by ID
 */
export const getMember = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.body.input;
    const tenantId = req.headers['x-hasura-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    logger.info(`Getting member ${id} for tenant ${tenantId}`);

    // Base member query
    const memberQuery = `
      SELECT 
        c.id, 
        ec.membership_number as "membershipNumber",
        c.external_id as "externalId", 
        CASE 
          WHEN ec.member_status = 'active' THEN 'ACTIVE'
          WHEN ec.member_status = 'dormant' THEN 'DORMANT'
          WHEN ec.member_status = 'suspended' THEN 'SUSPENDED'
          WHEN ec.member_status = 'closed' THEN 'CLOSED'
          ELSE 'PENDING'
        END as status,
        c.firstname as "firstName", 
        c.lastname as "lastName", 
        c.middlename as "middleName",
        c.display_name as "displayName",
        c.date_of_birth as "dateOfBirth",
        c.gender,
        c.mobile_no as "mobileNo",
        c.email as "emailAddress",
        c.address_line_1 as "addressLine1",
        c.address_line_2 as "addressLine2",
        c.city,
        c.state_province as "stateProvince",
        c.country,
        c.postal_code as "postalCode",
        ec.employment_status as "employmentStatus",
        ec.employer_name as "employerName",
        ec.job_title as "jobTitle",
        ec.monthly_income as "monthlyIncome",
        ec.annual_income as "annualIncome",
        ec.membership_date as "membershipDate",
        ec.risk_rating as "riskRating",
        ec.credit_score as "creditScore",
        ec.member_category as "memberCategory",
        ec.total_shares_value as "totalSharesValue",
        ec.total_loan_value as "totalLoanValue",
        ec.total_deposit_value as "totalDepositValue",
        ec.pep_status as "isPep",
        ec.fatca_status as "isFatca",
        c.is_active as "isActive",
        c.created_date as "createdDate",
        c.last_modified_date as "lastModifiedDate"
      FROM 
        client c
      LEFT JOIN 
        enhanced_cif ec ON c.id = ec.client_id AND ec.tenant_id = $1
      WHERE 
        c.id = $2
    `;

    const memberResult = await db.query(memberQuery, [tenantId, id]);
    
    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    const member = memberResult.rows[0];

    // Get identifications
    const identificationsQuery = `
      SELECT 
        id,
        document_type as "documentType",
        document_number as "documentNumber",
        issuing_authority as "issuingAuthority",
        issue_date as "issueDate",
        expiry_date as "expiryDate",
        verification_status as "verificationStatus",
        verification_date as "verificationDate",
        document_image_url as "documentUrl",
        COALESCE(
          (verification_status = 'verified' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)), 
          FALSE
        ) as "isActive"
      FROM 
        identity_verification
      WHERE 
        client_id = $1
    `;
    
    const identificationsResult = await db.query(identificationsQuery, [id]);
    const identifications = identificationsResult.rows;

    // Get family members
    const familyMembersQuery = `
      SELECT 
        mr.id,
        c.firstname as "firstName",
        c.lastname as "lastName",
        mr.relationship_type as "relationship",
        mr.is_joint_account as "isJointAccount",
        mr.is_authorized_signer as "isAuthorizedSigner",
        mr.is_beneficiary as "isBeneficiary",
        c.date_of_birth as "dateOfBirth",
        c.mobile_no as "contactNumber",
        c.email
      FROM 
        member_relationship mr
      JOIN 
        client c ON mr.secondary_member_id = c.id
      WHERE 
        mr.primary_member_id = $1
        AND mr.tenant_id = $2
    `;
    
    const familyMembersResult = await db.query(familyMembersQuery, [id, tenantId]);
    const familyMembers = familyMembersResult.rows;

    // Get notes
    const notesQuery = `
      SELECT 
        id,
        note,
        created_date as "createdDate",
        created_by as "createdBy"
      FROM 
        enhanced_audit_log
      WHERE 
        entity_type = 'client'
        AND entity_id = $1
        AND tenant_id = $2
        AND action_type = 'note'
      ORDER BY 
        created_date DESC
    `;
    
    const notesResult = await db.query(notesQuery, [id, tenantId]);
    const notes = notesResult.rows;

    // Get documents
    const documentsQuery = `
      SELECT 
        id,
        document_type as "documentType",
        document_name as "documentName",
        file_name as "fileName",
        file_size as "fileSize",
        mime_type as "mimeType",
        created_date as "uploadDate",
        storage_path as "documentUrl",
        is_current_version as "isActive"
      FROM 
        document_store
      WHERE 
        entity_type = 'client'
        AND entity_id = $1
        AND tenant_id = $2
        AND is_current_version = true
      ORDER BY 
        created_date DESC
    `;
    
    const documentsResult = await db.query(documentsQuery, [id, tenantId]);
    const documents = documentsResult.rows;

    // Determine KYC status
    let kycStatus = 'NOT_STARTED';
    if (identifications && identifications.length > 0) {
      const allVerified = identifications.every(id => id.verificationStatus === 'verified');
      const anyRejected = identifications.some(id => id.verificationStatus === 'rejected');
      const anyVerified = identifications.some(id => id.verificationStatus === 'verified');
      const anyPending = identifications.some(id => id.verificationStatus === 'pending');
      const anyExpired = identifications.some(id => id.verificationStatus === 'verified' && id.expiryDate && new Date(id.expiryDate) < new Date());
      
      if (allVerified && !anyExpired) {
        kycStatus = 'FULLY_VERIFIED';
      } else if (anyRejected) {
        kycStatus = 'REJECTED';
      } else if (anyExpired) {
        kycStatus = 'EXPIRED';
      } else if (anyVerified) {
        kycStatus = 'PARTIALLY_VERIFIED';
      } else if (anyPending) {
        kycStatus = 'PENDING';
      }
    }

    // Combine all data and return
    return res.json({
      ...member,
      identifications,
      familyMembers,
      notes,
      documents,
      kycStatus
    });
  } catch (error) {
    logger.error('Error in getMember:', error);
    return errorHandler(res, 'Failed to get member', error);
  }
};

/**
 * Create new member
 */
export const createMember = async (req: express.Request, res: express.Response) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      mobileNo,
      emailAddress,
      employmentStatus,
      employerName,
      jobTitle,
      monthlyIncome,
      addressLine1,
      addressLine2,
      city,
      stateProvince,
      country,
      postalCode,
      membershipDate = new Date(),
      identifications,
      familyMembers
    } = req.body.input;

    const tenantId = req.headers['x-hasura-tenant-id'] as string;
    const userId = req.headers['x-hasura-user-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    logger.info(`Creating new member for tenant ${tenantId}`);

    // Start transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Generate unique membership number
      const membershipPrefix = 'M'; // This could be configurable per tenant
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().substr(-2);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      
      // Get sequence number
      const sequenceResult = await client.query(`
        SELECT nextval('member_sequence') as seq_num
      `);
      const sequenceNumber = sequenceResult.rows[0].seq_num.toString().padStart(5, '0');
      
      // Combine to create membership number
      const membershipNumber = `${membershipPrefix}${year}${month}${sequenceNumber}`;
      
      // Generate member ID
      const memberId = uuidv4();
      
      // Create client record
      const displayName = middleName 
        ? `${firstName} ${middleName} ${lastName}` 
        : `${firstName} ${lastName}`;
        
      await client.query(`
        INSERT INTO client (
          id, firstname, lastname, middlename, display_name, date_of_birth, 
          gender, mobile_no, email, address_line_1, address_line_2, city, 
          state_province, country, postal_code, is_active, created_date, 
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
          $16, CURRENT_TIMESTAMP, $17
        )
      `, [
        memberId, firstName, lastName, middleName, displayName, dateOfBirth,
        gender, mobileNo, emailAddress, addressLine1, addressLine2, city,
        stateProvince, country, postalCode, true, userId
      ]);
      
      // Create enhanced CIF record
      await client.query(`
        INSERT INTO enhanced_cif (
          client_id, membership_number, membership_date, employment_status, 
          employer_name, job_title, monthly_income, annual_income, 
          member_status, created_date, created_by, tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11
        )
      `, [
        memberId, membershipNumber, membershipDate, employmentStatus,
        employerName, jobTitle, monthlyIncome, monthlyIncome ? monthlyIncome * 12 : null,
        'active', userId, tenantId
      ]);
      
      // Process identifications if provided
      if (identifications && identifications.length > 0) {
        for (const identification of identifications) {
          const {
            documentType,
            documentNumber,
            issuingAuthority,
            issueDate,
            expiryDate,
            documentImageBase64
          } = identification;
          
          // In a real implementation, we would upload the document image to a secure storage
          // and get a URL back. For this example, we'll simulate it.
          const documentUrl = `/documents/${memberId}/${documentType}_${Date.now()}.jpg`;
          
          await client.query(`
            INSERT INTO identity_verification (
              client_id, document_type, document_number, issuing_authority, 
              issue_date, expiry_date, verification_status, document_image_url, 
              created_date, created_by, tenant_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10
            )
          `, [
            memberId, documentType, documentNumber, issuingAuthority,
            issueDate, expiryDate, 'pending', documentUrl, userId, tenantId
          ]);
        }
      }
      
      // Process family members if provided
      if (familyMembers && familyMembers.length > 0) {
        for (const familyMember of familyMembers) {
          const {
            firstName: fmFirstName,
            lastName: fmLastName,
            relationship,
            isJointAccount,
            isAuthorizedSigner,
            isBeneficiary,
            dateOfBirth: fmDateOfBirth,
            contactNumber,
            email
          } = familyMember;
          
          // Check if this is an existing member (would be implemented in a real solution)
          // For this example, we'll create a new record
          const secondaryMemberId = uuidv4();
          const fmDisplayName = `${fmFirstName} ${fmLastName}`;
          
          // Create client record for family member
          await client.query(`
            INSERT INTO client (
              id, firstname, lastname, display_name, date_of_birth, 
              mobile_no, email, is_active, created_date, created_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9
            )
          `, [
            secondaryMemberId, fmFirstName, fmLastName, fmDisplayName, fmDateOfBirth,
            contactNumber, email, true, userId
          ]);
          
          // Create relationship record
          await client.query(`
            INSERT INTO member_relationship (
              primary_member_id, secondary_member_id, relationship_type, 
              is_joint_account, is_authorized_signer, is_beneficiary, 
              start_date, created_date, created_by, tenant_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_TIMESTAMP, $7, $8
            )
          `, [
            memberId, secondaryMemberId, relationship,
            isJointAccount || false, isAuthorizedSigner || false, isBeneficiary || false,
            userId, tenantId
          ]);
        }
      }
      
      // Record audit
      await client.query(`
        INSERT INTO enhanced_audit_log (
          tenant_id, action_type, entity_type, entity_id, user_id, 
          action_time, new_values, severity
        ) VALUES (
          $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7
        )
      `, [
        tenantId, 'create', 'client', memberId, userId,
        JSON.stringify(req.body.input), 'info'
      ]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return res.json({
        success: true,
        message: 'Member created successfully',
        memberId,
        membershipNumber,
        changesMade: ['Basic information', 'Membership details']
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in createMember:', error);
    return errorHandler(res, 'Failed to create member', error);
  }
};

/**
 * Update existing member
 */
export const updateMember = async (req: express.Request, res: express.Response) => {
  try {
    const {
      id,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      mobileNo,
      emailAddress,
      employmentStatus,
      employerName,
      jobTitle,
      monthlyIncome,
      addressLine1,
      addressLine2,
      city,
      stateProvince,
      country,
      postalCode
    } = req.body.input;

    const tenantId = req.headers['x-hasura-tenant-id'] as string;
    const userId = req.headers['x-hasura-user-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    logger.info(`Updating member ${id} for tenant ${tenantId}`);

    // Start transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Check if member exists
      const memberCheck = await client.query(`
        SELECT c.id, ec.membership_number
        FROM client c
        LEFT JOIN enhanced_cif ec ON c.id = ec.client_id AND ec.tenant_id = $1
        WHERE c.id = $2
      `, [tenantId, id]);
      
      if (memberCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }
      
      const membershipNumber = memberCheck.rows[0].membership_number;
      const changesMade = [];
      
      // Update client table if basic info provided
      if (firstName || lastName || middleName || dateOfBirth || gender || mobileNo || 
          emailAddress || addressLine1 || addressLine2 || city || stateProvince || 
          country || postalCode) {
        
        // Build update fields dynamically
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        if (firstName) {
          updateFields.push(`firstname = $${paramIndex++}`);
          values.push(firstName);
        }
        
        if (lastName) {
          updateFields.push(`lastname = $${paramIndex++}`);
          values.push(lastName);
        }
        
        if (middleName !== undefined) {
          updateFields.push(`middlename = $${paramIndex++}`);
          values.push(middleName);
        }
        
        if (dateOfBirth) {
          updateFields.push(`date_of_birth = $${paramIndex++}`);
          values.push(dateOfBirth);
        }
        
        if (gender) {
          updateFields.push(`gender = $${paramIndex++}`);
          values.push(gender);
        }
        
        if (mobileNo) {
          updateFields.push(`mobile_no = $${paramIndex++}`);
          values.push(mobileNo);
        }
        
        if (emailAddress !== undefined) {
          updateFields.push(`email = $${paramIndex++}`);
          values.push(emailAddress);
        }
        
        if (addressLine1) {
          updateFields.push(`address_line_1 = $${paramIndex++}`);
          values.push(addressLine1);
        }
        
        if (addressLine2 !== undefined) {
          updateFields.push(`address_line_2 = $${paramIndex++}`);
          values.push(addressLine2);
        }
        
        if (city) {
          updateFields.push(`city = $${paramIndex++}`);
          values.push(city);
        }
        
        if (stateProvince !== undefined) {
          updateFields.push(`state_province = $${paramIndex++}`);
          values.push(stateProvince);
        }
        
        if (country) {
          updateFields.push(`country = $${paramIndex++}`);
          values.push(country);
        }
        
        if (postalCode !== undefined) {
          updateFields.push(`postal_code = $${paramIndex++}`);
          values.push(postalCode);
        }
        
        // Add display name update if first or last name changed
        if (firstName || lastName) {
          // Get current values to construct display name
          const currentValues = await client.query(`
            SELECT firstname, lastname, middlename
            FROM client
            WHERE id = $1
          `, [id]);
          
          const current = currentValues.rows[0];
          const newFirstName = firstName || current.firstname;
          const newLastName = lastName || current.lastname;
          const newMiddleName = middleName !== undefined ? middleName : current.middlename;
          
          const displayName = newMiddleName 
            ? `${newFirstName} ${newMiddleName} ${newLastName}` 
            : `${newFirstName} ${newLastName}`;
            
          updateFields.push(`display_name = $${paramIndex++}`);
          values.push(displayName);
        }
        
        // Add last modified fields
        updateFields.push(`last_modified_date = $${paramIndex++}`);
        values.push(new Date());
        
        updateFields.push(`last_modified_by = $${paramIndex++}`);
        values.push(userId);
        
        // Add member ID as the last parameter
        values.push(id);
        
        // Execute update if we have fields to update
        if (updateFields.length > 0) {
          await client.query(`
            UPDATE client
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
          `, values);
          
          changesMade.push('Basic information');
        }
      }
      
      // Update enhanced_cif if employment info provided
      if (employmentStatus || employerName || jobTitle || monthlyIncome) {
        // Build update fields dynamically
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        if (employmentStatus) {
          updateFields.push(`employment_status = $${paramIndex++}`);
          values.push(employmentStatus);
        }
        
        if (employerName) {
          updateFields.push(`employer_name = $${paramIndex++}`);
          values.push(employerName);
        }
        
        if (jobTitle) {
          updateFields.push(`job_title = $${paramIndex++}`);
          values.push(jobTitle);
        }
        
        if (monthlyIncome) {
          updateFields.push(`monthly_income = $${paramIndex++}`);
          values.push(monthlyIncome);
          
          // Also update annual income
          updateFields.push(`annual_income = $${paramIndex++}`);
          values.push(monthlyIncome * 12);
        }
        
        // Add last modified fields
        updateFields.push(`last_modified_date = $${paramIndex++}`);
        values.push(new Date());
        
        updateFields.push(`last_modified_by = $${paramIndex++}`);
        values.push(userId);
        
        // Add parameters for WHERE clause
        values.push(id);
        values.push(tenantId);
        
        // Execute update if we have fields to update
        if (updateFields.length > 0) {
          await client.query(`
            UPDATE enhanced_cif
            SET ${updateFields.join(', ')}
            WHERE client_id = $${paramIndex++} AND tenant_id = $${paramIndex}
          `, values);
          
          changesMade.push('Employment information');
        }
      }
      
      // Record audit
      await client.query(`
        INSERT INTO enhanced_audit_log (
          tenant_id, action_type, entity_type, entity_id, user_id, 
          action_time, new_values, severity
        ) VALUES (
          $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7
        )
      `, [
        tenantId, 'update', 'client', id, userId,
        JSON.stringify(req.body.input), 'info'
      ]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return res.json({
        success: true,
        message: 'Member updated successfully',
        memberId: id,
        membershipNumber,
        changesMade
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in updateMember:', error);
    return errorHandler(res, 'Failed to update member', error);
  }
};

/**
 * Activate member
 */
export const activateMember = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.body.input;
    const tenantId = req.headers['x-hasura-tenant-id'] as string;
    const userId = req.headers['x-hasura-user-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    logger.info(`Activating member ${id} for tenant ${tenantId}`);

    // Start transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Check if member exists
      const memberCheck = await client.query(`
        SELECT c.id, ec.membership_number, ec.member_status
        FROM client c
        LEFT JOIN enhanced_cif ec ON c.id = ec.client_id AND ec.tenant_id = $1
        WHERE c.id = $2
      `, [tenantId, id]);
      
      if (memberCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }
      
      const membershipNumber = memberCheck.rows[0].membership_number;
      const currentStatus = memberCheck.rows[0].member_status;
      
      // Check if already active
      if (currentStatus === 'active') {
        return res.json({
          success: true,
          message: 'Member is already active',
          memberId: id,
          membershipNumber,
          changesMade: []
        });
      }
      
      // Update client status
      await client.query(`
        UPDATE client
        SET is_active = true,
            last_modified_date = CURRENT_TIMESTAMP,
            last_modified_by = $1
        WHERE id = $2
      `, [userId, id]);
      
      // Update enhanced_cif status
      await client.query(`
        UPDATE enhanced_cif
        SET member_status = 'active',
            last_modified_date = CURRENT_TIMESTAMP,
            last_modified_by = $1
        WHERE client_id = $2 AND tenant_id = $3
      `, [userId, id, tenantId]);
      
      // Record audit
      await client.query(`
        INSERT INTO enhanced_audit_log (
          tenant_id, action_type, entity_type, entity_id, user_id, 
          action_time, old_values, new_values, severity
        ) VALUES (
          $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8
        )
      `, [
        tenantId, 'update', 'client', id, userId,
        JSON.stringify({ status: currentStatus }),
        JSON.stringify({ status: 'active' }),
        'info'
      ]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return res.json({
        success: true,
        message: 'Member activated successfully',
        memberId: id,
        membershipNumber,
        changesMade: ['Member status']
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in activateMember:', error);
    return errorHandler(res, 'Failed to activate member', error);
  }
};

// Export all handlers
export const creditUnionMemberHandlers = {
  searchMembers,
  getMember,
  createMember,
  updateMember,
  activateMember
};