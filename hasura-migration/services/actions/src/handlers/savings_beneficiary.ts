import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, BusinessRuleError } from '../utils/errorHandler';
import db from '../utils/db';

const router = Router();

/**
 * Add a beneficiary to a savings account
 */
router.post('/add', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { 
      accountId, 
      name, 
      relationshipType, 
      percentageShare,
      address = null,
      contactNumber = null,
      email = null,
      identificationType = null,
      identificationNumber = null
    } = input;
    
    logger.info('Adding beneficiary to savings account', { accountId, name, percentageShare });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    if (!name) throw new ValidationError('Beneficiary name is required');
    if (!relationshipType) throw new ValidationError('Relationship type is required');
    if (!percentageShare) throw new ValidationError('Percentage share is required');
    
    if (percentageShare <= 0 || percentageShare > 100) {
      throw new ValidationError('Percentage share must be between 0 and 100');
    }

    // 2. Check if account exists
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.status,
        c.display_name as client_name
       FROM savings_account sa
       JOIN client c ON sa.client_id = c.id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];

    // 3. Check if account is active or at least approved
    if (account.status !== 'active' && account.status !== 'approved') {
      throw new BusinessRuleError(`Cannot add beneficiary to account in ${account.status} status`);
    }

    // 4. Calculate current beneficiary total percentage
    const beneficiaryResult = await client.query(
      `SELECT COALESCE(SUM(percentage_share), 0) as total_percentage
       FROM savings_account_beneficiary
       WHERE savings_account_id = $1 AND is_active = true`,
      [accountId]
    );
    
    const currentTotalPercentage = parseFloat(beneficiaryResult.rows[0].total_percentage);
    const newTotalPercentage = currentTotalPercentage + percentageShare;
    
    if (newTotalPercentage > 100) {
      throw new BusinessRuleError(
        `Total beneficiary percentage would exceed 100%. Current total: ${currentTotalPercentage}%, adding: ${percentageShare}%`
      );
    }

    // 5. Create the beneficiary
    const beneficiaryId = uuidv4();
    
    await client.query(
      `INSERT INTO savings_account_beneficiary (
        id, savings_account_id, name, relationship_type, 
        percentage_share, address, contact_number, email,
        identification_type, identification_number, is_active,
        created_date, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true,
        CURRENT_TIMESTAMP, $11
      )`,
      [
        beneficiaryId, accountId, name, relationshipType,
        percentageShare, address, contactNumber, email,
        identificationType, identificationNumber, req.user?.id
      ]
    );

    // 6. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes
      ) VALUES (
        $1, 'BENEFICIARY_ADDED', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3
      )`,
      [accountId, req.user?.id, `Beneficiary '${name}' added with ${percentageShare}% share`]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      beneficiaryId,
      accountId,
      name,
      relationshipType,
      percentageShare,
      message: 'Beneficiary added successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Update a savings account beneficiary
 */
router.post('/update', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { 
      beneficiaryId,
      name,
      relationshipType,
      percentageShare,
      address,
      contactNumber,
      email,
      identificationType,
      identificationNumber,
      isActive
    } = input;
    
    logger.info('Updating savings account beneficiary', { beneficiaryId });

    // 1. Validate input
    if (!beneficiaryId) throw new ValidationError('Beneficiary ID is required');
    
    if (percentageShare !== undefined && (percentageShare <= 0 || percentageShare > 100)) {
      throw new ValidationError('Percentage share must be between 0 and 100');
    }

    // 2. Check if beneficiary exists
    const beneficiaryResult = await client.query(
      `SELECT 
        b.id, b.savings_account_id, b.name, b.relationship_type,
        b.percentage_share, b.is_active,
        sa.status as account_status, sa.account_no,
        c.display_name as client_name
       FROM savings_account_beneficiary b
       JOIN savings_account sa ON b.savings_account_id = sa.id
       JOIN client c ON sa.client_id = c.id
       WHERE b.id = $1`,
      [beneficiaryId]
    );
    
    if (beneficiaryResult.rows.length === 0) {
      throw new NotFoundError('Beneficiary not found');
    }
    
    const beneficiary = beneficiaryResult.rows[0];
    const accountId = beneficiary.savings_account_id;

    // 3. Check if account is active or at least approved
    if (beneficiary.account_status !== 'active' && beneficiary.account_status !== 'approved') {
      throw new BusinessRuleError(`Cannot update beneficiary for account in ${beneficiary.account_status} status`);
    }

    // 4. Calculate current beneficiary total percentage
    const otherBeneficiariesResult = await client.query(
      `SELECT COALESCE(SUM(percentage_share), 0) as total_percentage
       FROM savings_account_beneficiary
       WHERE savings_account_id = $1 
       AND is_active = true
       AND id != $2`,
      [accountId, beneficiaryId]
    );
    
    const otherBeneficiariesPercentage = parseFloat(otherBeneficiariesResult.rows[0].total_percentage);
    const currentPercentage = parseFloat(beneficiary.percentage_share);
    const newPercentage = percentageShare !== undefined ? percentageShare : currentPercentage;
    const newIsActive = isActive !== undefined ? isActive : beneficiary.is_active;
    
    // If updating percentage or activating a previously inactive beneficiary
    if (percentageShare !== undefined || (isActive === true && !beneficiary.is_active)) {
      const newTotalPercentage = otherBeneficiariesPercentage + (newIsActive ? newPercentage : 0);
      
      if (newTotalPercentage > 100) {
        throw new BusinessRuleError(
          `Total beneficiary percentage would exceed 100%. Other beneficiaries: ${otherBeneficiariesPercentage}%, this beneficiary: ${newPercentage}%`
        );
      }
    }

    // 5. Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${valueIndex}`);
      updateValues.push(name);
      valueIndex++;
    }
    
    if (relationshipType !== undefined) {
      updateFields.push(`relationship_type = $${valueIndex}`);
      updateValues.push(relationshipType);
      valueIndex++;
    }
    
    if (percentageShare !== undefined) {
      updateFields.push(`percentage_share = $${valueIndex}`);
      updateValues.push(percentageShare);
      valueIndex++;
    }
    
    if (address !== undefined) {
      updateFields.push(`address = $${valueIndex}`);
      updateValues.push(address);
      valueIndex++;
    }
    
    if (contactNumber !== undefined) {
      updateFields.push(`contact_number = $${valueIndex}`);
      updateValues.push(contactNumber);
      valueIndex++;
    }
    
    if (email !== undefined) {
      updateFields.push(`email = $${valueIndex}`);
      updateValues.push(email);
      valueIndex++;
    }
    
    if (identificationType !== undefined) {
      updateFields.push(`identification_type = $${valueIndex}`);
      updateValues.push(identificationType);
      valueIndex++;
    }
    
    if (identificationNumber !== undefined) {
      updateFields.push(`identification_number = $${valueIndex}`);
      updateValues.push(identificationNumber);
      valueIndex++;
    }
    
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${valueIndex}`);
      updateValues.push(isActive);
      valueIndex++;
    }
    
    // Add last modified fields
    updateFields.push(`last_modified_date = CURRENT_TIMESTAMP`);
    updateFields.push(`last_modified_by = $${valueIndex}`);
    updateValues.push(req.user?.id);
    valueIndex++;
    
    // Add beneficiary ID as the last parameter
    updateValues.push(beneficiaryId);
    
    if (updateFields.length === 0) {
      throw new ValidationError('No fields provided for update');
    }

    // 6. Update the beneficiary
    await client.query(
      `UPDATE savings_account_beneficiary SET 
        ${updateFields.join(', ')}
       WHERE id = $${valueIndex}`,
      updateValues
    );

    // 7. Add audit entry
    const updateDescription = [
      name !== undefined ? `name to '${name}'` : null,
      relationshipType !== undefined ? `relationship to '${relationshipType}'` : null,
      percentageShare !== undefined ? `percentage share to ${percentageShare}%` : null,
      isActive !== undefined ? `status to ${isActive ? 'active' : 'inactive'}` : null
    ].filter(Boolean).join(', ');
    
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes
      ) VALUES (
        $1, 'BENEFICIARY_UPDATED', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3
      )`,
      [accountId, req.user?.id, `Beneficiary '${beneficiary.name}' updated: ${updateDescription}`]
    );

    await client.query('COMMIT');

    // Get updated beneficiary data
    const updatedName = name !== undefined ? name : beneficiary.name;
    const updatedRelationshipType = relationshipType !== undefined ? relationshipType : beneficiary.relationship_type;
    const updatedPercentageShare = percentageShare !== undefined ? percentageShare : parseFloat(beneficiary.percentage_share);

    res.json({
      success: true,
      beneficiaryId,
      accountId,
      name: updatedName,
      relationshipType: updatedRelationshipType,
      percentageShare: updatedPercentageShare,
      message: 'Beneficiary updated successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Remove a beneficiary from a savings account
 */
router.post('/remove', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { beneficiaryId, softDelete = true } = input;
    
    logger.info('Removing beneficiary from savings account', { 
      beneficiaryId, softDelete 
    });

    // 1. Validate input
    if (!beneficiaryId) throw new ValidationError('Beneficiary ID is required');

    // 2. Check if beneficiary exists
    const beneficiaryResult = await client.query(
      `SELECT 
        b.id, b.savings_account_id, b.name, b.relationship_type,
        b.percentage_share, b.is_active,
        sa.status as account_status, sa.account_no,
        c.display_name as client_name
       FROM savings_account_beneficiary b
       JOIN savings_account sa ON b.savings_account_id = sa.id
       JOIN client c ON sa.client_id = c.id
       WHERE b.id = $1`,
      [beneficiaryId]
    );
    
    if (beneficiaryResult.rows.length === 0) {
      throw new NotFoundError('Beneficiary not found');
    }
    
    const beneficiary = beneficiaryResult.rows[0];
    const accountId = beneficiary.savings_account_id;

    // 3. Check if account is active or at least approved
    if (beneficiary.account_status !== 'active' && beneficiary.account_status !== 'approved') {
      throw new BusinessRuleError(`Cannot remove beneficiary from account in ${beneficiary.account_status} status`);
    }
    
    // 4. Remove the beneficiary (either soft delete or hard delete)
    if (softDelete) {
      // Soft delete - just mark as inactive
      await client.query(
        `UPDATE savings_account_beneficiary SET 
          is_active = false,
          last_modified_date = CURRENT_TIMESTAMP,
          last_modified_by = $1
         WHERE id = $2`,
        [req.user?.id, beneficiaryId]
      );
    } else {
      // Hard delete - completely remove from database
      await client.query(
        `DELETE FROM savings_account_beneficiary
         WHERE id = $1`,
        [beneficiaryId]
      );
    }

    // 5. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes
      ) VALUES (
        $1, 'BENEFICIARY_REMOVED', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3
      )`,
      [
        accountId, 
        req.user?.id, 
        `Beneficiary '${beneficiary.name}' ${softDelete ? 'deactivated' : 'deleted'}`
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      beneficiaryId,
      accountId,
      name: beneficiary.name,
      relationshipType: beneficiary.relationship_type,
      percentageShare: parseFloat(beneficiary.percentage_share),
      message: `Beneficiary ${softDelete ? 'deactivated' : 'deleted'} successfully`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * List beneficiaries for a savings account
 */
router.post('/list', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    const { input } = req.body;
    const { accountId, includeInactive = false } = input;
    
    logger.info('Listing beneficiaries for savings account', { 
      accountId, includeInactive 
    });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');

    // 2. Check if account exists
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.status,
        c.display_name as client_name
       FROM savings_account sa
       JOIN client c ON sa.client_id = c.id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];

    // 3. Get beneficiaries for the account
    let beneficiaryQuery = `
      SELECT 
        id, name, relationship_type, percentage_share,
        address, contact_number, email,
        identification_type, identification_number,
        is_active, created_date
      FROM savings_account_beneficiary
      WHERE savings_account_id = $1
    `;
    
    if (!includeInactive) {
      beneficiaryQuery += ` AND is_active = true`;
    }
    
    beneficiaryQuery += ` ORDER BY name ASC`;
    
    const beneficiaryResult = await client.query(beneficiaryQuery, [accountId]);
    
    // 4. Calculate total percentage for active beneficiaries
    const totalPercentageResult = await client.query(
      `SELECT COALESCE(SUM(percentage_share), 0) as total_percentage
       FROM savings_account_beneficiary
       WHERE savings_account_id = $1 AND is_active = true`,
      [accountId]
    );
    
    const totalPercentage = parseFloat(totalPercentageResult.rows[0].total_percentage);

    // 5. Format beneficiaries for response
    const beneficiaries = beneficiaryResult.rows.map(b => ({
      id: b.id,
      name: b.name,
      relationshipType: b.relationship_type,
      percentageShare: parseFloat(b.percentage_share),
      address: b.address,
      contactNumber: b.contact_number,
      email: b.email,
      identificationType: b.identification_type,
      identificationNumber: b.identification_number,
      isActive: b.is_active,
      createdDate: b.created_date
    }));

    res.json({
      totalCount: beneficiaries.length,
      totalPercentage,
      beneficiaries,
      accountId,
      accountNo: account.account_no,
      clientName: account.client_name
    });
    
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export const savingsBeneficiaryRoutes = router;