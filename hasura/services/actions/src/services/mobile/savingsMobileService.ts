import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { depositToSavings, withdrawFromSavings } from '../savingsService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Retrieves a lightweight summary of a savings account optimized for mobile display
 */
export const getMobileSavingsAccountSummary = async (input, userId) => {
  try {
    const { accountId, includeMetadata } = input;
    
    // Retrieve only essential account information
    const account = await db.one(`
      SELECT 
        sa.id, 
        sa.account_no as "accountNo", 
        sa.client_id as "clientId",
        COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as "clientName",
        sp.name as "productName",
        sa.status,
        sa.currency_code as currency,
        sa.account_balance as balance,
        sa.available_balance as "availableBalance",
        sa.nominal_annual_interest_rate as "interestRate",
        (
          SELECT transaction_date 
          FROM savings_account_transactions 
          WHERE savings_account_id = sa.id 
          ORDER BY transaction_date DESC, created_date DESC 
          LIMIT 1
        ) as "lastTransactionDate"
      FROM savings_accounts sa
      JOIN savings_products sp ON sa.product_id = sp.id
      LEFT JOIN clients c ON sa.client_id = c.id
      WHERE sa.id = $1
    `, [accountId]);
    
    // Calculate cache metadata
    const now = new Date();
    const metadata = {
      lastUpdated: now.toISOString(),
      etag: require('crypto').createHash('md5').update(JSON.stringify(account)).digest('hex'),
      expiresAt: new Date(now.getTime() + 5 * 60000).toISOString() // 5 minutes from now
    };
    
    return {
      ...account,
      metadata: includeMetadata ? metadata : undefined
    };
  } catch (error) {
    logger.error('Error in getMobileSavingsAccountSummary', { error, accountId: input.accountId });
    throw new Error(`Failed to get savings account summary: ${error.message}`);
  }
};

/**
 * Get transaction history with cursor-based pagination for efficient mobile loading
 */
export const getMobileSavingsTransactionHistory = async (input, userId) => {
  try {
    const { 
      accountId, 
      limit = 20, 
      cursor,
      fromDate,
      toDate,
      transactionTypes,
      includeRunningBalances
    } = input;
    
    // Build where conditions
    let whereConditions = ['savings_account_id = $1'];
    let parameters = [accountId];
    let paramCount = 2;
    
    if (cursor) {
      // For cursor-based pagination, we use transaction ID and date
      const [cursorDate, cursorId] = cursor.split('_');
      whereConditions.push(`(transaction_date, id) < (to_date($${paramCount}, 'YYYY-MM-DD'), $${paramCount + 1})`);
      parameters.push(cursorDate, cursorId);
      paramCount += 2;
    }
    
    if (fromDate) {
      whereConditions.push(`transaction_date >= $${paramCount}`);
      parameters.push(fromDate);
      paramCount++;
    }
    
    if (toDate) {
      whereConditions.push(`transaction_date <= $${paramCount}`);
      parameters.push(toDate);
      paramCount++;
    }
    
    if (transactionTypes && transactionTypes.length > 0) {
      whereConditions.push(`transaction_type IN (${transactionTypes.map((_, idx) => `$${paramCount + idx}`).join(', ')})`);
      parameters.push(...transactionTypes);
      paramCount += transactionTypes.length;
    }
    
    // Execute query with limit + 1 to determine if there are more results
    const transactions = await db.manyOrNone(`
      SELECT 
        id,
        transaction_date as date,
        transaction_type as type,
        amount,
        ${includeRunningBalances ? 'running_balance as "runningBalance",' : ''}
        description,
        'COMPLETED' as status,
        NULL as "offlineId"
      FROM savings_account_transactions
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY transaction_date DESC, id DESC
      LIMIT $${paramCount}
    `, [...parameters, limit + 1]);
    
    // Check if we have more results than requested
    const hasMore = transactions.length > limit;
    const resultTransactions = hasMore ? transactions.slice(0, limit) : transactions;
    
    // Create next cursor from the last transaction
    let nextCursor = null;
    if (hasMore && resultTransactions.length > 0) {
      const lastTransaction = resultTransactions[resultTransactions.length - 1];
      nextCursor = `${lastTransaction.date.toISOString().split('T')[0]}_${lastTransaction.id}`;
    }
    
    // Calculate cache metadata
    const now = new Date();
    const metadata = {
      lastUpdated: now.toISOString(),
      etag: require('crypto').createHash('md5').update(JSON.stringify(resultTransactions)).digest('hex'),
      expiresAt: new Date(now.getTime() + 5 * 60000).toISOString() // 5 minutes from now
    };
    
    return {
      transactions: resultTransactions,
      hasMore,
      nextCursor,
      metadata
    };
  } catch (error) {
    logger.error('Error in getMobileSavingsTransactionHistory', { error, accountId: input.accountId });
    throw new Error(`Failed to get transaction history: ${error.message}`);
  }
};

/**
 * Process a deposit with offline support
 */
export const processOfflineDeposit = async (input, userId) => {
  try {
    const {
      accountId,
      transactionDate,
      transactionAmount,
      paymentTypeId,
      note,
      offlineId,
      offlineCreatedAt,
      deviceId
    } = input;
    
    // Check if this offline transaction was already processed
    if (offlineId) {
      const existing = await db.oneOrNone(`
        SELECT id FROM savings_offline_transactions 
        WHERE offline_id = $1 AND account_id = $2
      `, [offlineId, accountId]);
      
      if (existing) {
        return {
          success: true,
          transactionId: existing.id,
          offlineId,
          accountId,
          transactionDate,
          amount: transactionAmount,
          status: 'COMPLETED',
          processingStatus: 'ALREADY_PROCESSED',
          message: 'Transaction was already processed',
          pendingSync: false
        };
      }
    }
    
    // Prepare standard deposit input
    const depositInput = {
      accountId,
      transactionDate,
      transactionAmount,
      paymentTypeId,
      note
    };
    
    // Attempt to process the deposit
    const result = await depositToSavings(depositInput, userId);
    
    // If successful, record in offline transactions table
    if (result.success && offlineId) {
      await db.none(`
        INSERT INTO savings_offline_transactions
        (id, offline_id, account_id, transaction_id, transaction_type, amount, 
        transaction_date, created_by, device_id, offline_created_at, synced_at)
        VALUES ($1, $2, $3, $4, 'DEPOSIT', $5, $6, $7, $8, $9, NOW())
      `, [
        uuidv4(), offlineId, accountId, result.transactionId, 
        transactionAmount, transactionDate, userId, 
        deviceId || 'unknown', offlineCreatedAt || new Date()
      ]);
    }
    
    return {
      success: result.success,
      transactionId: result.transactionId,
      offlineId,
      accountId,
      transactionDate,
      amount: transactionAmount,
      status: result.success ? 'COMPLETED' : 'ERROR',
      processingStatus: result.success ? 'PROCESSED' : 'FAILED',
      message: result.message,
      pendingSync: false,
      newBalance: result.runningBalance
    };
  } catch (error) {
    logger.error('Error in processOfflineDeposit', { error, accountId: input.accountId });
    throw new Error(`Failed to process deposit: ${error.message}`);
  }
};

/**
 * Process a withdrawal with offline support
 */
export const processOfflineWithdrawal = async (input, userId) => {
  try {
    const {
      accountId,
      transactionDate,
      transactionAmount,
      paymentTypeId,
      note,
      offlineId,
      offlineCreatedAt,
      deviceId
    } = input;
    
    // Check if this offline transaction was already processed
    if (offlineId) {
      const existing = await db.oneOrNone(`
        SELECT id FROM savings_offline_transactions 
        WHERE offline_id = $1 AND account_id = $2
      `, [offlineId, accountId]);
      
      if (existing) {
        return {
          success: true,
          transactionId: existing.id,
          offlineId,
          accountId,
          transactionDate,
          amount: transactionAmount,
          status: 'COMPLETED',
          processingStatus: 'ALREADY_PROCESSED',
          message: 'Transaction was already processed',
          pendingSync: false
        };
      }
    }
    
    // Prepare standard withdrawal input
    const withdrawalInput = {
      accountId,
      transactionDate,
      transactionAmount,
      paymentTypeId,
      note
    };
    
    // Attempt to process the withdrawal
    const result = await withdrawFromSavings(withdrawalInput, userId);
    
    // If successful, record in offline transactions table
    if (result.success && offlineId) {
      await db.none(`
        INSERT INTO savings_offline_transactions
        (id, offline_id, account_id, transaction_id, transaction_type, amount, 
        transaction_date, created_by, device_id, offline_created_at, synced_at)
        VALUES ($1, $2, $3, $4, 'WITHDRAWAL', $5, $6, $7, $8, $9, NOW())
      `, [
        uuidv4(), offlineId, accountId, result.transactionId, 
        transactionAmount, transactionDate, userId, 
        deviceId || 'unknown', offlineCreatedAt || new Date()
      ]);
    }
    
    return {
      success: result.success,
      transactionId: result.transactionId,
      offlineId,
      accountId,
      transactionDate,
      amount: transactionAmount,
      status: result.success ? 'COMPLETED' : 'ERROR',
      processingStatus: result.success ? 'PROCESSED' : 'FAILED',
      message: result.message,
      pendingSync: false,
      newBalance: result.runningBalance
    };
  } catch (error) {
    logger.error('Error in processOfflineWithdrawal', { error, accountId: input.accountId });
    throw new Error(`Failed to process withdrawal: ${error.message}`);
  }
};

/**
 * Sync multiple offline transactions in a batch
 */
export const syncOfflineTransactions = async (transactions, userId) => {
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  
  // Process each transaction
  for (const transaction of transactions) {
    try {
      const {
        offlineId,
        accountId,
        transactionType,
        transactionDate,
        amount,
        paymentTypeId,
        note,
        offlineCreatedAt,
        deviceId
      } = transaction;
      
      // Check if already processed
      const existing = await db.oneOrNone(`
        SELECT id FROM savings_offline_transactions 
        WHERE offline_id = $1 AND account_id = $2
      `, [offlineId, accountId]);
      
      if (existing) {
        results.push({
          success: true,
          offlineId,
          accountId,
          transactionDate,
          amount,
          status: 'COMPLETED',
          processingStatus: 'ALREADY_PROCESSED',
          message: 'Transaction was already processed',
          pendingSync: false
        });
        successCount++;
        continue;
      }
      
      // Process based on transaction type
      let result;
      if (transactionType === 'DEPOSIT') {
        result = await processOfflineDeposit({
          accountId,
          transactionDate,
          transactionAmount: amount,
          paymentTypeId,
          note,
          offlineId,
          offlineCreatedAt,
          deviceId
        }, userId);
      } else if (transactionType === 'WITHDRAWAL') {
        result = await processOfflineWithdrawal({
          accountId,
          transactionDate,
          transactionAmount: amount,
          paymentTypeId,
          note,
          offlineId,
          offlineCreatedAt,
          deviceId
        }, userId);
      } else {
        throw new Error(`Unsupported transaction type: ${transactionType}`);
      }
      
      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      logger.error('Error processing transaction in syncOfflineTransactions', { 
        error, 
        transactionOfflineId: transaction.offlineId 
      });
      
      results.push({
        success: false,
        offlineId: transaction.offlineId,
        accountId: transaction.accountId,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount,
        status: 'ERROR',
        processingStatus: 'FAILED',
        message: `Error: ${error.message}`,
        pendingSync: true
      });
      failedCount++;
    }
  }
  
  return {
    success: failedCount === 0,
    message: failedCount === 0 
      ? 'All transactions synced successfully' 
      : `${failedCount} of ${transactions.length} transactions failed to sync`,
    totalProcessed: transactions.length,
    successCount,
    failedCount,
    results
  };
};

/**
 * Execute multiple operations in a single batch for efficiency
 */
export const executeBatchOperations = async (operations, userId) => {
  const results = [];
  let success = true;
  
  // Process each operation
  for (const operation of operations) {
    try {
      const { type, payload } = operation;
      let result;
      
      switch (type) {
        case 'GET_ACCOUNT_SUMMARY':
          result = await getMobileSavingsAccountSummary(payload, userId);
          break;
        case 'GET_TRANSACTIONS':
          result = await getMobileSavingsTransactionHistory(payload, userId);
          break;
        case 'DEPOSIT':
          result = await processOfflineDeposit(payload, userId);
          break;
        case 'WITHDRAWAL':
          result = await processOfflineWithdrawal(payload, userId);
          break;
        default:
          throw new Error(`Unsupported operation type: ${type}`);
      }
      
      results.push({
        operationType: type,
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      logger.error('Error executing batch operation', { error, operationType: operation.type });
      success = false;
      results.push({
        operationType: operation.type,
        success: false,
        data: null,
        error: error.message
      });
    }
  }
  
  return {
    success,
    message: success ? 'All operations executed successfully' : 'Some operations failed',
    results
  };
};