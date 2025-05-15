import { Request, Response } from 'express';
import { pool } from '../utils/db';
import { logger } from '../utils/logger';
import { validateAuthToken } from '../utils/authMiddleware';
import { errorHandler } from '../utils/errorHandler';

/**
 * Retrieve beneficiaries for a recurring deposit account
 */
export const getRecurringDepositBeneficiaries = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const { accountId, includeInactive = false } = input;
    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Get account details
      const accountResult = await client.query(`
        SELECT 
          rda.id as account_id,
          sa.account_no,
          c.display_name as client_name,
          rda.expected_maturity_date,
          rda.expected_maturity_amount
        FROM 
          fineract_default.recurring_deposit_account rda
        JOIN
          fineract_default.savings_account sa ON rda.savings_account_id = sa.id
        LEFT JOIN
          fineract_default.client c ON sa.client_id = c.id
        WHERE 
          rda.id = $1
      `, [accountId]);

      if (accountResult.rows.length === 0) {
        return res.status(404).json({
          message: 'Recurring deposit account not found'
        });
      }

      const account = accountResult.rows[0];

      // Get beneficiaries
      const beneficiariesQuery = `
        SELECT 
          rdb.id,
          rdb.recurring_deposit_account_id as account_id,
          rdb.name,
          rdb.client_id,
          c.display_name as client_name,
          rdb.relationship_type,
          rdb.percentage_share,
          rdb.address_line1 as address1,
          rdb.address_line2 as address2,
          rdb.city,
          rdb.state,
          rdb.country,
          rdb.postal_code as postal_code,
          rdb.contact_number,
          rdb.email,
          rdb.document_type,
          rdb.document_identification_number as document_number,
          rdb.document_description,
          rdb.document_url,
          rdb.notes,
          rdb.verification_status,
          rdb.is_active,
          rdb.created_date
        FROM 
          fineract_default.recurring_deposit_beneficiary rdb
        LEFT JOIN
          fineract_default.client c ON rdb.client_id = c.id
        WHERE 
          rdb.recurring_deposit_account_id = $1
          ${includeInactive ? '' : 'AND rdb.is_active = true'}
        ORDER BY 
          rdb.created_date DESC
      `;

      const beneficiariesResult = await client.query(beneficiariesQuery, [accountId]);

      // Calculate total percentage
      const totalPercentage = beneficiariesResult.rows.reduce((sum, b) => {
        if (b.is_active) {
          return sum + parseFloat(b.percentage_share);
        }
        return sum;
      }, 0);

      return res.json({
        totalCount: beneficiariesResult.rows.length,
        totalPercentage,
        beneficiaries: beneficiariesResult.rows.map(row => ({
          id: row.id,
          accountId: row.account_id,
          name: row.name,
          clientId: row.client_id,
          clientName: row.client_name,
          relationshipType: row.relationship_type,
          percentageShare: parseFloat(row.percentage_share),
          address1: row.address1,
          address2: row.address2,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postal_code,
          contactNumber: row.contact_number,
          email: row.email,
          documentType: row.document_type,
          documentNumber: row.document_number,
          documentDescription: row.document_description,
          documentUrl: row.document_url,
          notes: row.notes,
          verificationStatus: row.verification_status,
          isActive: row.is_active,
          createdDate: row.created_date
        })),
        accountId: account.account_id,
        accountNo: account.account_no,
        clientName: account.client_name,
        expectedMaturityDate: account.expected_maturity_date,
        expectedMaturityAmount: parseFloat(account.expected_maturity_amount)
      });

    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in getRecurringDepositBeneficiaries:', error);
    return errorHandler(error, res);
  }
};

/**
 * Retrieve a specific recurring deposit beneficiary by ID
 */
export const getRecurringDepositBeneficiary = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          rdb.id,
          rdb.recurring_deposit_account_id as account_id,
          sa.account_no,
          rdb.name,
          rdb.client_id,
          c.display_name as client_name,
          rdb.relationship_type,
          rdb.percentage_share,
          rdb.address_line1 as address1,
          rdb.address_line2 as address2,
          rdb.city,
          rdb.state,
          rdb.country,
          rdb.postal_code as postal_code,
          rdb.contact_number,
          rdb.email,
          rdb.document_type,
          rdb.document_identification_number as document_number,
          rdb.document_description,
          rdb.document_url,
          rdb.notes,
          rdb.verification_status,
          rdb.is_active,
          rdb.created_date
        FROM 
          fineract_default.recurring_deposit_beneficiary rdb
        JOIN
          fineract_default.recurring_deposit_account rda ON rdb.recurring_deposit_account_id = rda.id
        JOIN
          fineract_default.savings_account sa ON rda.savings_account_id = sa.id
        LEFT JOIN
          fineract_default.client c ON rdb.client_id = c.id
        WHERE 
          rdb.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Beneficiary not found'
        });
      }

      const row = result.rows[0];
      
      return res.json({
        id: row.id,
        accountId: row.account_id,
        accountNo: row.account_no,
        name: row.name,
        clientId: row.client_id,
        clientName: row.client_name,
        relationshipType: row.relationship_type,
        percentageShare: parseFloat(row.percentage_share),
        address1: row.address1,
        address2: row.address2,
        city: row.city,
        state: row.state,
        country: row.country,
        postalCode: row.postal_code,
        contactNumber: row.contact_number,
        email: row.email,
        documentType: row.document_type,
        documentNumber: row.document_number,
        documentDescription: row.document_description,
        documentUrl: row.document_url,
        notes: row.notes,
        verificationStatus: row.verification_status,
        isActive: row.is_active,
        createdDate: row.created_date
      });

    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in getRecurringDepositBeneficiary:', error);
    return errorHandler(error, res);
  }
};

/**
 * Add a new beneficiary to a recurring deposit account
 */
export const addRecurringDepositBeneficiary = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const {
      accountId,
      name,
      relationshipType,
      percentageShare,
      address1,
      address2,
      city,
      state,
      country,
      postalCode,
      contactNumber,
      email,
      documentType,
      documentNumber,
      documentDescription,
      documentUrl,
      notes
    } = input;
    
    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Check if account exists
      const accountResult = await client.query(`
        SELECT id FROM fineract_default.recurring_deposit_account WHERE id = $1
      `, [accountId]);

      if (accountResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          message: 'Recurring deposit account not found'
        });
      }

      // Insert beneficiary
      const insertQuery = `
        INSERT INTO fineract_default.recurring_deposit_beneficiary (
          recurring_deposit_account_id,
          name,
          relationship_type,
          percentage_share,
          address_line1,
          address_line2,
          city,
          state,
          country,
          postal_code,
          contact_number,
          email,
          document_type,
          document_identification_number,
          document_description,
          document_url,
          notes,
          verification_status,
          is_active,
          created_date,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          $11, $12, $13, $14, $15, $16, $17, 'pending', true, NOW(), $18
        ) RETURNING id, recurring_deposit_account_id, name, relationship_type, percentage_share
      `;

      const insertResult = await client.query(insertQuery, [
        accountId,
        name,
        relationshipType,
        percentageShare,
        address1,
        address2,
        city,
        state,
        country,
        postalCode,
        contactNumber,
        email,
        documentType,
        documentNumber,
        documentDescription,
        documentUrl,
        notes,
        user.id
      ]);

      // If notification is enabled, create default notification preferences
      if (email) {
        await client.query(`
          INSERT INTO fineract_default.recurring_deposit_beneficiary_notification_preference (
            beneficiary_id, notification_type, event_type, is_enabled, created_date, created_by
          ) VALUES 
            ($1, 'email', 'beneficiary_addition', true, NOW(), $2),
            ($1, 'email', 'beneficiary_verification', true, NOW(), $2),
            ($1, 'email', 'beneficiary_modification', true, NOW(), $2),
            ($1, 'email', 'beneficiary_removal', true, NOW(), $2),
            ($1, 'email', 'maturity_notification', true, NOW(), $2),
            ($1, 'email', 'premature_closure', true, NOW(), $2)
        `, [insertResult.rows[0].id, user.id]);
      }

      if (contactNumber) {
        await client.query(`
          INSERT INTO fineract_default.recurring_deposit_beneficiary_notification_preference (
            beneficiary_id, notification_type, event_type, is_enabled, created_date, created_by
          ) VALUES 
            ($1, 'sms', 'beneficiary_addition', true, NOW(), $2),
            ($1, 'sms', 'beneficiary_verification', true, NOW(), $2),
            ($1, 'sms', 'beneficiary_modification', true, NOW(), $2),
            ($1, 'sms', 'beneficiary_removal', true, NOW(), $2),
            ($1, 'sms', 'maturity_notification', true, NOW(), $2),
            ($1, 'sms', 'premature_closure', true, NOW(), $2)
        `, [insertResult.rows[0].id, user.id]);
      }

      // Commit transaction
      await client.query('COMMIT');

      return res.json({
        success: true,
        beneficiaryId: insertResult.rows[0].id,
        accountId: insertResult.rows[0].recurring_deposit_account_id,
        name: insertResult.rows[0].name,
        relationshipType: insertResult.rows[0].relationship_type,
        percentageShare: parseFloat(insertResult.rows[0].percentage_share),
        message: 'Beneficiary added successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in addRecurringDepositBeneficiary:', error);
    return errorHandler(error, res);
  }
};

/**
 * Update an existing recurring deposit beneficiary
 */
export const updateRecurringDepositBeneficiary = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const {
      beneficiaryId,
      name,
      relationshipType,
      percentageShare,
      address1,
      address2,
      city,
      state,
      country,
      postalCode,
      contactNumber,
      email,
      documentType,
      documentNumber,
      documentDescription,
      documentUrl,
      notes,
      isActive
    } = input;

    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Check if beneficiary exists
      const beneficiaryResult = await client.query(`
        SELECT recurring_deposit_account_id FROM fineract_default.recurring_deposit_beneficiary WHERE id = $1
      `, [beneficiaryId]);

      if (beneficiaryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          message: 'Beneficiary not found'
        });
      }

      const accountId = beneficiaryResult.rows[0].recurring_deposit_account_id;

      // Prepare update query components
      const updateFields = [];
      const params = [beneficiaryId];
      let paramIndex = 2;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        params.push(name);
      }

      if (relationshipType !== undefined) {
        updateFields.push(`relationship_type = $${paramIndex++}`);
        params.push(relationshipType);
      }

      if (percentageShare !== undefined) {
        updateFields.push(`percentage_share = $${paramIndex++}`);
        params.push(percentageShare);
      }

      if (address1 !== undefined) {
        updateFields.push(`address_line1 = $${paramIndex++}`);
        params.push(address1);
      }

      if (address2 !== undefined) {
        updateFields.push(`address_line2 = $${paramIndex++}`);
        params.push(address2);
      }

      if (city !== undefined) {
        updateFields.push(`city = $${paramIndex++}`);
        params.push(city);
      }

      if (state !== undefined) {
        updateFields.push(`state = $${paramIndex++}`);
        params.push(state);
      }

      if (country !== undefined) {
        updateFields.push(`country = $${paramIndex++}`);
        params.push(country);
      }

      if (postalCode !== undefined) {
        updateFields.push(`postal_code = $${paramIndex++}`);
        params.push(postalCode);
      }

      if (contactNumber !== undefined) {
        updateFields.push(`contact_number = $${paramIndex++}`);
        params.push(contactNumber);
      }

      if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        params.push(email);
      }

      if (documentType !== undefined) {
        updateFields.push(`document_type = $${paramIndex++}`);
        params.push(documentType);
      }

      if (documentNumber !== undefined) {
        updateFields.push(`document_identification_number = $${paramIndex++}`);
        params.push(documentNumber);
      }

      if (documentDescription !== undefined) {
        updateFields.push(`document_description = $${paramIndex++}`);
        params.push(documentDescription);
      }

      if (documentUrl !== undefined) {
        updateFields.push(`document_url = $${paramIndex++}`);
        params.push(documentUrl);
      }

      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        params.push(notes);
      }

      if (isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        params.push(isActive);
      }

      // Add last_modified fields
      updateFields.push(`last_modified_date = NOW()`);
      updateFields.push(`last_modified_by = $${paramIndex++}`);
      params.push(user.id);

      // Update beneficiary if there are fields to update
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE fineract_default.recurring_deposit_beneficiary
          SET ${updateFields.join(', ')}
          WHERE id = $1
          RETURNING id, recurring_deposit_account_id, name, relationship_type, percentage_share
        `;

        const updateResult = await client.query(updateQuery, params);

        // Commit transaction
        await client.query('COMMIT');

        return res.json({
          success: true,
          beneficiaryId: updateResult.rows[0].id,
          accountId: updateResult.rows[0].recurring_deposit_account_id,
          name: updateResult.rows[0].name,
          relationshipType: updateResult.rows[0].relationship_type,
          percentageShare: parseFloat(updateResult.rows[0].percentage_share),
          message: 'Beneficiary updated successfully'
        });
      } else {
        // If no fields to update, just return success
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          beneficiaryId,
          accountId,
          message: 'No changes to apply'
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in updateRecurringDepositBeneficiary:', error);
    return errorHandler(error, res);
  }
};

/**
 * Verify a recurring deposit beneficiary
 */
export const verifyRecurringDepositBeneficiary = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const { beneficiaryId, status, notes } = input;

    const user = validateAuthToken(req);

    // Validate status
    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({
        message: 'Invalid status. Status must be either "verified" or "rejected".'
      });
    }

    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Check if beneficiary exists
      const beneficiaryResult = await client.query(`
        SELECT 
          recurring_deposit_account_id, 
          verification_status 
        FROM fineract_default.recurring_deposit_beneficiary 
        WHERE id = $1
      `, [beneficiaryId]);

      if (beneficiaryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          message: 'Beneficiary not found'
        });
      }

      const accountId = beneficiaryResult.rows[0].recurring_deposit_account_id;
      const currentStatus = beneficiaryResult.rows[0].verification_status;

      if (currentStatus === status) {
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          beneficiaryId,
          accountId,
          verificationStatus: status,
          message: `Beneficiary already has status "${status}"`
        });
      }

      // Update verification status
      const updateQuery = `
        UPDATE fineract_default.recurring_deposit_beneficiary
        SET 
          verification_status = $1,
          notes = CASE WHEN $2 IS NOT NULL THEN 
            COALESCE(notes, '') || E'\\n' || 'Verification Note (' || NOW()::date || '): ' || $2
          ELSE 
            notes 
          END,
          last_modified_date = NOW(),
          last_modified_by = $3
        WHERE id = $4
        RETURNING id, recurring_deposit_account_id
      `;

      await client.query(updateQuery, [status, notes, user.id, beneficiaryId]);

      // Commit transaction
      await client.query('COMMIT');

      return res.json({
        success: true,
        beneficiaryId,
        accountId,
        verificationStatus: status,
        message: `Beneficiary ${status === 'verified' ? 'verified' : 'rejected'} successfully`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in verifyRecurringDepositBeneficiary:', error);
    return errorHandler(error, res);
  }
};

/**
 * Remove a beneficiary from a recurring deposit account
 */
export const removeRecurringDepositBeneficiary = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const { beneficiaryId, softDelete = true, reason } = input;

    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Check if beneficiary exists
      const beneficiaryResult = await client.query(`
        SELECT 
          b.recurring_deposit_account_id, 
          b.name, 
          b.relationship_type, 
          b.percentage_share,
          b.is_active
        FROM fineract_default.recurring_deposit_beneficiary b
        WHERE b.id = $1
      `, [beneficiaryId]);

      if (beneficiaryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          message: 'Beneficiary not found'
        });
      }

      const beneficiary = beneficiaryResult.rows[0];

      if (!beneficiary.is_active && softDelete) {
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          beneficiaryId,
          accountId: beneficiary.recurring_deposit_account_id,
          name: beneficiary.name,
          relationshipType: beneficiary.relationship_type,
          percentageShare: parseFloat(beneficiary.percentage_share),
          message: 'Beneficiary is already inactive'
        });
      }

      if (softDelete) {
        // Soft delete - update is_active to false
        const updateQuery = `
          UPDATE fineract_default.recurring_deposit_beneficiary
          SET 
            is_active = false,
            notes = CASE WHEN $1 IS NOT NULL THEN 
              COALESCE(notes, '') || E'\\n' || 'Removal Note (' || NOW()::date || '): ' || $1
            ELSE 
              notes 
            END,
            last_modified_date = NOW(),
            last_modified_by = $2
          WHERE id = $3
          RETURNING id
        `;

        await client.query(updateQuery, [reason, user.id, beneficiaryId]);
      } else {
        // Hard delete - remove record from database
        await client.query(`
          DELETE FROM fineract_default.recurring_deposit_beneficiary_notification_preference
          WHERE beneficiary_id = $1
        `, [beneficiaryId]);

        await client.query(`
          DELETE FROM fineract_default.recurring_deposit_beneficiary_notification
          WHERE beneficiary_id = $1
        `, [beneficiaryId]);

        await client.query(`
          DELETE FROM fineract_default.recurring_deposit_beneficiary
          WHERE id = $1
        `, [beneficiaryId]);
      }

      // Commit transaction
      await client.query('COMMIT');

      return res.json({
        success: true,
        beneficiaryId,
        accountId: beneficiary.recurring_deposit_account_id,
        name: beneficiary.name,
        relationshipType: beneficiary.relationship_type,
        percentageShare: parseFloat(beneficiary.percentage_share),
        message: `Beneficiary ${softDelete ? 'deactivated' : 'deleted'} successfully`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in removeRecurringDepositBeneficiary:', error);
    return errorHandler(error, res);
  }
};

/**
 * Get notifications for a recurring deposit beneficiary
 */
export const getRecurringDepositBeneficiaryNotifications = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const {
      beneficiaryId,
      accountId,
      status,
      notificationType,
      eventType,
      fromDate,
      toDate,
      limit = 20,
      offset = 0
    } = input;

    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Prepare query conditions
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (beneficiaryId) {
        conditions.push(`n.beneficiary_id = $${paramIndex++}`);
        params.push(beneficiaryId);
      }

      if (accountId) {
        conditions.push(`n.recurring_deposit_account_id = $${paramIndex++}`);
        params.push(accountId);
      }

      if (status) {
        conditions.push(`n.status = $${paramIndex++}`);
        params.push(status);
      }

      if (notificationType) {
        conditions.push(`n.notification_type = $${paramIndex++}`);
        params.push(notificationType);
      }

      if (eventType) {
        conditions.push(`n.event_type = $${paramIndex++}`);
        params.push(eventType);
      }

      if (fromDate) {
        conditions.push(`n.created_date >= $${paramIndex++}`);
        params.push(fromDate);
      }

      if (toDate) {
        conditions.push(`n.created_date <= $${paramIndex++}`);
        params.push(toDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) AS total_count
        FROM fineract_default.recurring_deposit_beneficiary_notification n
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, params);
      const totalCount = parseInt(countResult.rows[0].total_count);

      // Get notifications
      const query = `
        SELECT 
          n.id,
          n.beneficiary_id,
          n.recurring_deposit_account_id as account_id,
          n.template_id,
          n.notification_type,
          n.recipient,
          n.subject,
          n.message,
          n.status,
          n.error_message,
          n.event_type,
          n.triggered_by,
          n.sent_date,
          n.delivery_date,
          n.created_date,
          b.name as beneficiary_name
        FROM 
          fineract_default.recurring_deposit_beneficiary_notification n
        LEFT JOIN
          fineract_default.recurring_deposit_beneficiary b ON n.beneficiary_id = b.id
        ${whereClause}
        ORDER BY n.created_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      params.push(limit);
      params.push(offset);

      const result = await client.query(query, params);

      return res.json({
        notifications: result.rows.map(row => ({
          id: row.id,
          beneficiaryId: row.beneficiary_id,
          accountId: row.account_id,
          templateId: row.template_id,
          notificationType: row.notification_type,
          recipient: row.recipient,
          subject: row.subject,
          message: row.message,
          status: row.status,
          errorMessage: row.error_message,
          eventType: row.event_type,
          triggeredBy: row.triggered_by,
          sentDate: row.sent_date,
          deliveryDate: row.delivery_date,
          createdDate: row.created_date,
          beneficiary: row.beneficiary_name ? {
            id: row.beneficiary_id,
            name: row.beneficiary_name
          } : null
        })),
        totalCount
      });

    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in getRecurringDepositBeneficiaryNotifications:', error);
    return errorHandler(error, res);
  }
};

/**
 * Get notification preferences for a recurring deposit beneficiary
 */
export const getRecurringDepositBeneficiaryNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const { beneficiaryId } = req.body;
    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Check if beneficiary exists
      const beneficiaryResult = await client.query(`
        SELECT id, name FROM fineract_default.recurring_deposit_beneficiary WHERE id = $1
      `, [beneficiaryId]);

      if (beneficiaryResult.rows.length === 0) {
        return res.status(404).json({
          message: 'Beneficiary not found'
        });
      }

      const beneficiary = {
        id: beneficiaryResult.rows[0].id,
        name: beneficiaryResult.rows[0].name
      };

      // Get preferences
      const query = `
        SELECT 
          id,
          beneficiary_id,
          notification_type,
          event_type,
          is_enabled,
          created_date
        FROM 
          fineract_default.recurring_deposit_beneficiary_notification_preference
        WHERE 
          beneficiary_id = $1
        ORDER BY
          notification_type, event_type
      `;

      const result = await client.query(query, [beneficiaryId]);

      return res.json({
        preferences: result.rows.map(row => ({
          id: row.id,
          beneficiaryId: row.beneficiary_id,
          notificationType: row.notification_type,
          eventType: row.event_type,
          isEnabled: row.is_enabled,
          createdDate: row.created_date,
          beneficiary
        })),
        totalCount: result.rows.length
      });

    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in getRecurringDepositBeneficiaryNotificationPreferences:', error);
    return errorHandler(error, res);
  }
};

/**
 * Send a notification to a recurring deposit beneficiary
 */
export const sendRecurringDepositBeneficiaryNotification = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const { beneficiaryId, templateCode } = input;

    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Call the function to send notification
      const result = await client.query(`
        SELECT * FROM fineract_default.send_rd_beneficiary_notification($1, $2, $3)
      `, [beneficiaryId, templateCode, user.id]);

      // Commit transaction
      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Notification sent successfully',
        notificationId: result.rows[0].send_rd_beneficiary_notification
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in sendRecurringDepositBeneficiaryNotification:', error);
    return errorHandler(error, res);
  }
};

/**
 * Update notification preferences for a recurring deposit beneficiary
 */
export const updateRecurringDepositBeneficiaryNotificationPreference = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const { beneficiaryId, notificationType, eventType, isEnabled } = input;

    const user = validateAuthToken(req);

    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Check if beneficiary exists
      const beneficiaryResult = await client.query(`
        SELECT id, name FROM fineract_default.recurring_deposit_beneficiary WHERE id = $1
      `, [beneficiaryId]);

      if (beneficiaryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          message: 'Beneficiary not found'
        });
      }

      const beneficiary = {
        id: beneficiaryResult.rows[0].id,
        name: beneficiaryResult.rows[0].name
      };

      // Check if preference exists
      const preferenceResult = await client.query(`
        SELECT id FROM fineract_default.recurring_deposit_beneficiary_notification_preference
        WHERE beneficiary_id = $1 AND notification_type = $2 AND event_type = $3
      `, [beneficiaryId, notificationType, eventType]);

      let preferenceId;

      if (preferenceResult.rows.length === 0) {
        // Create new preference
        const insertResult = await client.query(`
          INSERT INTO fineract_default.recurring_deposit_beneficiary_notification_preference (
            beneficiary_id, notification_type, event_type, is_enabled, created_date, created_by
          ) VALUES ($1, $2, $3, $4, NOW(), $5)
          RETURNING id
        `, [beneficiaryId, notificationType, eventType, isEnabled, user.id]);

        preferenceId = insertResult.rows[0].id;
      } else {
        // Update existing preference
        const updateResult = await client.query(`
          UPDATE fineract_default.recurring_deposit_beneficiary_notification_preference
          SET 
            is_enabled = $1,
            last_modified_date = NOW(),
            last_modified_by = $2
          WHERE id = $3
          RETURNING id
        `, [isEnabled, user.id, preferenceResult.rows[0].id]);

        preferenceId = updateResult.rows[0].id;
      }

      // Get updated preference
      const updatedPreference = await client.query(`
        SELECT 
          id,
          beneficiary_id,
          notification_type,
          event_type,
          is_enabled,
          created_date
        FROM 
          fineract_default.recurring_deposit_beneficiary_notification_preference
        WHERE 
          id = $1
      `, [preferenceId]);

      // Commit transaction
      await client.query('COMMIT');

      const preference = updatedPreference.rows[0];

      return res.json({
        success: true,
        message: 'Notification preference updated successfully',
        preference: {
          id: preference.id,
          beneficiaryId: preference.beneficiary_id,
          notificationType: preference.notification_type,
          eventType: preference.event_type,
          isEnabled: preference.is_enabled,
          createdDate: preference.created_date,
          beneficiary
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error in updateRecurringDepositBeneficiaryNotificationPreference:', error);
    return errorHandler(error, res);
  }
};