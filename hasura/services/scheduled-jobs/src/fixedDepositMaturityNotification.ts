/**
 * Fixed Deposit Maturity Notification Scheduled Job
 * 
 * This job checks for fixed deposit accounts approaching maturity 
 * and sends notifications based on configured rules
 */

import logger from './logger';
import db from './db';

/**
 * Process fixed deposit maturity notifications for accounts approaching maturity
 * 
 * @param daysBeforeMaturity Number of days before maturity to send notification
 * @returns Number of notifications sent
 */
export async function processFixedDepositMaturityNotifications(daysBeforeMaturity: number = 7): Promise<number> {
  logger.info(`Running fixed deposit maturity notification job for ${daysBeforeMaturity} days before maturity`);
  
  try {
    // Start transaction
    await db.query('BEGIN');
    
    // Get accounts approaching maturity based on configured days
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() + daysBeforeMaturity);
    
    const maturityDateStr = notificationDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Query for accounts approaching maturity that haven't been notified yet
    const accountsQuery = `
      SELECT 
        fda.id as fixed_deposit_account_id,
        sa.account_no,
        fda.maturity_date,
        fda.maturity_amount,
        sa.client_id,
        c.display_name as client_name,
        c.mobile_no,
        c.email
      FROM 
        fixed_deposit_account fda
      JOIN 
        savings_account sa ON fda.savings_account_id = sa.id
      JOIN 
        m_client c ON sa.client_id = c.id
      WHERE 
        sa.status_enum = 300 -- Active accounts only
        AND fda.maturity_date = $1
        AND NOT EXISTS (
          SELECT 1 
          FROM fixed_deposit_maturity_notification fdmn 
          WHERE fdmn.fixed_deposit_account_id = fda.id
            AND fdmn.notification_date = $1
        )
    `;
    
    const accountsResult = await db.query(accountsQuery, [maturityDateStr]);
    
    logger.info(`Found ${accountsResult.rows.length} accounts approaching maturity on ${maturityDateStr}`);
    
    let notificationCount = 0;
    
    // Process each account for notification
    for (const account of accountsResult.rows) {
      // Determine notification channels based on client contact info
      const notificationChannels = [];
      
      if (account.email) {
        notificationChannels.push('email');
      }
      
      if (account.mobile_no) {
        notificationChannels.push('sms');
      }
      
      // Always include in-app notification
      notificationChannels.push('in_app');
      
      // Create notification message
      const message = `Dear ${account.client_name}, your fixed deposit account ${account.account_no} will mature on ${account.maturity_date} with a maturity amount of ${account.maturity_amount}. Please review your maturity instructions.`;
      
      // Store notification record
      const insertNotificationQuery = `
        INSERT INTO fixed_deposit_maturity_notification (
          fixed_deposit_account_id,
          notification_date,
          is_notified,
          notification_message,
          notification_channel,
          created_date
        ) VALUES (
          $1, $2, TRUE, $3, $4, NOW()
        )
        RETURNING id
      `;
      
      for (const channel of notificationChannels) {
        await db.query(insertNotificationQuery, [
          account.fixed_deposit_account_id,
          maturityDateStr,
          message,
          channel
        ]);
        
        notificationCount++;
      }
      
      // Create notification in the notifications table (if it exists)
      try {
        const notificationInsertQuery = `
          INSERT INTO notification (
            user_id,
            object_type,
            object_identifier,
            action,
            actor_id,
            notification_content,
            is_read,
            created_date
          ) VALUES (
            $1, 'FIXED_DEPOSIT', $2, 'MATURITY_APPROACHING', NULL, $3, FALSE, NOW()
          )
        `;
        
        // Use client_id as user_id for notification targeting
        await db.query(notificationInsertQuery, [
          account.client_id,
          account.fixed_deposit_account_id,
          message
        ]);
      } catch (error) {
        // Notification table might not exist - log and continue
        logger.warn('Could not insert into notification table - it may not exist. Continuing...');
      }
    }
    
    // Commit transaction
    await db.query('COMMIT');
    
    logger.info(`Successfully sent ${notificationCount} notifications for ${accountsResult.rows.length} accounts`);
    return notificationCount;
  } catch (error) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    
    logger.error('Error processing fixed deposit maturity notifications:', error);
    throw error;
  }
}