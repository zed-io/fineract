import db from '../utils/db';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class SavingsAccountHoldService {
  /**
   * Create a new hold on a savings account
   */
  async createHold(input, userId) {
    const {
      savingsAccountId, 
      amount, 
      holdType, 
      holdReasonCode, 
      holdReasonDescription, 
      holdStartDate, 
      holdEndDate, 
      releaseMode = 'manual',
      externalReferenceId,
      enforcingEntity,
      enforcingPerson,
      isFullAccountBlock = false,
      isCreditBlock = false,
      isDebitBlock = false
    } = input;

    // Validate input
    if (!savingsAccountId) {
      throw new Error('Savings account ID is required');
    }
    
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Get savings account information
    const accountResult = await db.query(
      `SELECT id, account_no, account_balance_derived, status, sub_status 
       FROM fineract_default.savings_account 
       WHERE id = $1`,
      [savingsAccountId]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Savings account not found');
    }

    const account = accountResult.rows[0];

    // Check if account is active
    if (account.status !== 'active') {
      throw new Error(`Cannot place hold on account with status: ${account.status}`);
    }

    // Check if amount is within available balance
    if (amount > account.account_balance_derived) {
      throw new Error('Hold amount exceeds account balance');
    }

    // Create a new hold record
    const holdId = uuidv4();
    
    await db.query(
      `INSERT INTO fineract_default.savings_account_hold (
         id, savings_account_id, amount, hold_type, hold_reason_code, 
         hold_reason_description, hold_start_date, hold_end_date, release_mode,
         status, external_reference_id, enforcing_entity, enforcing_person,
         is_full_account_block, is_credit_block, is_debit_block, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
       )`,
      [
        holdId, savingsAccountId, amount, holdType, holdReasonCode,
        holdReasonDescription, holdStartDate, holdEndDate, releaseMode,
        'active', externalReferenceId, enforcingEntity, enforcingPerson,
        isFullAccountBlock, isCreditBlock, isDebitBlock, userId
      ]
    );

    // Update the account on_hold_amount
    await this.recalculateHoldAmount(savingsAccountId);

    // Fetch the updated account info
    const updatedAccountResult = await db.query(
      `SELECT account_balance_derived, available_balance_derived, sub_status 
       FROM fineract_default.savings_account 
       WHERE id = $1`,
      [savingsAccountId]
    );

    const updatedAccount = updatedAccountResult.rows[0];

    return {
      holdId,
      savingsAccountId,
      accountNo: account.account_no,
      amount,
      holdType,
      status: 'active',
      accountSubStatus: updatedAccount.sub_status,
      availableBalance: updatedAccount.available_balance_derived
    };
  }

  /**
   * Release a hold on a savings account
   */
  async releaseHold(input, userId) {
    const { holdId, releaseNotes, transactionReference } = input;

    // Validate input
    if (!holdId) {
      throw new Error('Hold ID is required');
    }

    // Get hold information
    const holdResult = await db.query(
      `SELECT h.id, h.savings_account_id, h.amount, h.status,
              a.account_no, a.account_balance_derived 
       FROM fineract_default.savings_account_hold h
       JOIN fineract_default.savings_account a ON h.savings_account_id = a.id
       WHERE h.id = $1`,
      [holdId]
    );

    if (holdResult.rows.length === 0) {
      throw new Error('Hold not found');
    }

    const hold = holdResult.rows[0];

    // Check if hold is active
    if (hold.status !== 'active') {
      throw new Error(`Cannot release hold with status: ${hold.status}`);
    }

    // Update the hold record
    await db.query(
      `UPDATE fineract_default.savings_account_hold 
       SET status = 'released',
           release_notes = $1,
           released_by_user_id = $2,
           released_on_date = NOW(),
           transaction_reference = $3,
           last_modified_date = NOW(),
           last_modified_by = $4
       WHERE id = $5`,
      [releaseNotes, userId, transactionReference, userId, holdId]
    );

    // Recalculate the account on_hold_amount
    await this.recalculateHoldAmount(hold.savings_account_id);

    // Fetch the updated account info
    const updatedAccountResult = await db.query(
      `SELECT account_balance_derived, available_balance_derived, sub_status 
       FROM fineract_default.savings_account 
       WHERE id = $1`,
      [hold.savings_account_id]
    );

    const updatedAccount = updatedAccountResult.rows[0];

    return {
      holdId,
      savingsAccountId: hold.savings_account_id,
      accountNo: hold.account_no,
      releasedAmount: hold.amount,
      releasedOnDate: new Date(),
      accountSubStatus: updatedAccount.sub_status,
      availableBalance: updatedAccount.available_balance_derived
    };
  }

  /**
   * Update an existing hold on a savings account
   */
  async updateHold(input, userId) {
    const {
      holdId,
      amount,
      holdType,
      holdReasonCode,
      holdReasonDescription,
      holdEndDate,
      releaseMode,
      externalReferenceId,
      enforcingEntity,
      enforcingPerson,
      isFullAccountBlock,
      isCreditBlock,
      isDebitBlock
    } = input;

    // Validate input
    if (!holdId) {
      throw new Error('Hold ID is required');
    }

    // Get hold information
    const holdResult = await db.query(
      `SELECT h.id, h.savings_account_id, h.amount, h.status, h.hold_type,
              a.account_no, a.account_balance_derived 
       FROM fineract_default.savings_account_hold h
       JOIN fineract_default.savings_account a ON h.savings_account_id = a.id
       WHERE h.id = $1`,
      [holdId]
    );

    if (holdResult.rows.length === 0) {
      throw new Error('Hold not found');
    }

    const hold = holdResult.rows[0];

    // Check if hold is active
    if (hold.status !== 'active') {
      throw new Error(`Cannot update hold with status: ${hold.status}`);
    }

    // Build update query
    const updates = [];
    const params = [holdId, userId];
    let paramIndex = 3;

    if (amount !== undefined) {
      // Check if new amount is within available balance
      if (amount > hold.account_balance_derived) {
        throw new Error('Hold amount exceeds account balance');
      }
      updates.push(`amount = $${paramIndex++}`);
      params.push(amount);
    }

    if (holdType !== undefined) {
      updates.push(`hold_type = $${paramIndex++}`);
      params.push(holdType);
    }

    if (holdReasonCode !== undefined) {
      updates.push(`hold_reason_code = $${paramIndex++}`);
      params.push(holdReasonCode);
    }

    if (holdReasonDescription !== undefined) {
      updates.push(`hold_reason_description = $${paramIndex++}`);
      params.push(holdReasonDescription);
    }

    if (holdEndDate !== undefined) {
      updates.push(`hold_end_date = $${paramIndex++}`);
      params.push(holdEndDate);
    }

    if (releaseMode !== undefined) {
      updates.push(`release_mode = $${paramIndex++}`);
      params.push(releaseMode);
    }

    if (externalReferenceId !== undefined) {
      updates.push(`external_reference_id = $${paramIndex++}`);
      params.push(externalReferenceId);
    }

    if (enforcingEntity !== undefined) {
      updates.push(`enforcing_entity = $${paramIndex++}`);
      params.push(enforcingEntity);
    }

    if (enforcingPerson !== undefined) {
      updates.push(`enforcing_person = $${paramIndex++}`);
      params.push(enforcingPerson);
    }

    if (isFullAccountBlock !== undefined) {
      updates.push(`is_full_account_block = $${paramIndex++}`);
      params.push(isFullAccountBlock);
    }

    if (isCreditBlock !== undefined) {
      updates.push(`is_credit_block = $${paramIndex++}`);
      params.push(isCreditBlock);
    }

    if (isDebitBlock !== undefined) {
      updates.push(`is_debit_block = $${paramIndex++}`);
      params.push(isDebitBlock);
    }

    // Add last_modified fields
    updates.push(`last_modified_date = NOW()`);
    updates.push(`last_modified_by = $2`);

    // Execute update if there are changes
    if (updates.length > 0) {
      await db.query(
        `UPDATE fineract_default.savings_account_hold 
         SET ${updates.join(', ')}
         WHERE id = $1`,
        params
      );
    }

    // Recalculate the account on_hold_amount if amount changed
    if (amount !== undefined) {
      await this.recalculateHoldAmount(hold.savings_account_id);
    }

    // Fetch the updated hold
    const updatedHoldResult = await db.query(
      `SELECT amount, hold_type, status
       FROM fineract_default.savings_account_hold 
       WHERE id = $1`,
      [holdId]
    );

    const updatedHold = updatedHoldResult.rows[0];

    // Fetch the updated account info
    const updatedAccountResult = await db.query(
      `SELECT account_balance_derived, available_balance_derived, sub_status 
       FROM fineract_default.savings_account 
       WHERE id = $1`,
      [hold.savings_account_id]
    );

    const updatedAccount = updatedAccountResult.rows[0];

    return {
      holdId,
      savingsAccountId: hold.savings_account_id,
      accountNo: hold.account_no,
      amount: updatedHold.amount,
      holdType: updatedHold.hold_type,
      status: updatedHold.status,
      accountSubStatus: updatedAccount.sub_status,
      availableBalance: updatedAccount.available_balance_derived
    };
  }

  /**
   * Get all holds for a savings account
   */
  async getAccountHolds(input) {
    const {
      savingsAccountId,
      status,
      holdType,
      fromDate,
      toDate,
      includeExpired = false,
      includeReleased = false,
      sortBy = 'hold_start_date',
      sortOrder = 'desc'
    } = input;

    // Validate input
    if (!savingsAccountId) {
      throw new Error('Savings account ID is required');
    }

    // Get savings account information
    const accountResult = await db.query(
      `SELECT id, account_no, account_balance_derived, available_balance_derived, on_hold_amount_derived
       FROM fineract_default.savings_account 
       WHERE id = $1`,
      [savingsAccountId]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Savings account not found');
    }

    const account = accountResult.rows[0];

    // Build query conditions
    const conditions = ['savings_account_id = $1'];
    const params = [savingsAccountId];
    let paramIndex = 2;

    // Filter by status if provided
    if (status && status.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      params.push(status);
    } else {
      // Default status filters
      const statusFilters = ['active'];
      if (includeExpired) statusFilters.push('expired');
      if (includeReleased) statusFilters.push('released');
      
      conditions.push(`status = ANY($${paramIndex++})`);
      params.push(statusFilters);
    }

    // Filter by hold type if provided
    if (holdType && holdType.length > 0) {
      conditions.push(`hold_type = ANY($${paramIndex++})`);
      params.push(holdType);
    }

    // Filter by date range if provided
    if (fromDate) {
      conditions.push(`hold_start_date >= $${paramIndex++}`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`(hold_end_date IS NULL OR hold_end_date <= $${paramIndex++})`);
      params.push(toDate);
    }

    // Validate and sanitize sort column
    const allowedSortColumns = [
      'hold_start_date', 'hold_end_date', 'amount', 
      'hold_type', 'status', 'created_date'
    ];
    
    const sanitizedSortBy = allowedSortColumns.includes(sortBy) 
      ? sortBy 
      : 'hold_start_date';
    
    // Validate and sanitize sort order
    const sanitizedSortOrder = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Execute query
    const holdsResult = await db.query(
      `SELECT 
         id, savings_account_id, amount, hold_type, hold_reason_code,
         hold_reason_description, hold_start_date, hold_end_date, release_mode,
         status, external_reference_id, enforcing_entity, enforcing_person,
         release_notes, released_by_user_id, released_on_date, transaction_reference,
         is_full_account_block, is_credit_block, is_debit_block,
         created_date, last_modified_date
       FROM fineract_default.savings_account_hold
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder}`,
      params
    );

    return {
      savingsAccountId,
      accountNo: account.account_no,
      accountBalance: account.account_balance_derived,
      totalHoldAmount: account.on_hold_amount_derived,
      availableBalance: account.available_balance_derived,
      holds: holdsResult.rows
    };
  }

  /**
   * Helper method to recalculate the hold amount for a savings account
   */
  async recalculateHoldAmount(savingsAccountId) {
    try {
      // Call the database function to recalculate hold amount
      await db.query(
        'SELECT fineract_default.recalculate_savings_account_hold_amount($1)',
        [savingsAccountId]
      );
    } catch (error) {
      logger.error('Error recalculating hold amount:', error);
      throw new Error('Failed to recalculate hold amount: ' + error.message);
    }
  }
}