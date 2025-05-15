/**
 * Job worker to send notifications for pending premature closures
 * Checks for accounts marked for premature closure and sends notifications
 * to relevant parties
 */

import { Job, JobWorker } from '../core/job';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import { sendNotification } from '../utils/notification';

/**
 * Job parameters for recurring deposit premature closure notification
 */
export interface RecurringDepositPrematureClosureNotificationJobParameters {
  daysToLookAhead?: number;
  batchSize?: number;
  sendEmailNotifications?: boolean;
  sendSmsNotifications?: boolean;
}

/**
 * Job worker for recurring deposit premature closure notification
 */
export class RecurringDepositPrematureClosureNotificationJobWorker implements JobWorker {
  /**
   * Process the job
   * @param job Job instance
   * @param parameters Job parameters
   * @returns Job result
   */
  async process(job: Job, parameters?: RecurringDepositPrematureClosureNotificationJobParameters): Promise<any> {
    logger.info('Starting recurring deposit premature closure notification job', { jobId: job.id });

    try {
      const daysToLookAhead = parameters?.daysToLookAhead || 7;
      const batchSize = parameters?.batchSize || 100;
      const sendEmailNotifications = parameters?.sendEmailNotifications !== false;
      const sendSmsNotifications = parameters?.sendSmsNotifications !== false;

      // Find premature closures that need notifications
      const result = await query(
        `SELECT rdpc.*, rda.id as account_id, sa.account_no, sa.client_id, sa.group_id,
                c.first_name, c.last_name, c.email, c.mobile_no
         FROM recurring_deposit_premature_closure_history rdpc
         JOIN recurring_deposit_account rda ON rdpc.account_id = rda.id
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         JOIN client c ON sa.client_id = c.id
         WHERE rdpc.closure_date >= CURRENT_DATE - INTERVAL '1 day'
         AND rdpc.created_date >= CURRENT_DATE - INTERVAL '7 days'
         AND NOT EXISTS (
           SELECT 1 FROM notification n
           WHERE n.reference_type = 'recurring_deposit_premature_closure'
           AND n.reference_id = rdpc.id
         )
         ORDER BY rdpc.closure_date DESC
         LIMIT $1`,
        [batchSize]
      );

      const closures = result.rows;
      logger.info(`Found ${closures.length} premature closures needing notifications`);

      // Process each premature closure
      for (const closure of closures) {
        const clientName = `${closure.first_name} ${closure.last_name}`;
        const accountNo = closure.account_no;
        const closureDate = new Date(closure.closure_date).toLocaleDateString();
        const totalAmount = parseFloat(closure.total_amount).toFixed(2);
        const closureReason = closure.closure_reason;

        // Create notification record
        await transaction(async (client) => {
          const notificationId = await this.createNotificationRecord(
            client,
            closure.id,
            closure.client_id,
            'recurring_deposit_premature_closure',
            'Recurring deposit account prematurely closed',
            `Your recurring deposit account ${accountNo} was prematurely closed on ${closureDate} with a payout of ${totalAmount}.`
          );

          // Send email notification if enabled and email is available
          if (sendEmailNotifications && closure.email) {
            try {
              await sendNotification({
                type: 'email',
                recipientId: closure.client_id,
                recipientEmail: closure.email,
                subject: 'Your Recurring Deposit Account Closure Confirmation',
                body: `
                  <p>Dear ${clientName},</p>
                  <p>This is to confirm that your recurring deposit account ${accountNo} has been prematurely closed on ${closureDate}.</p>
                  <p>Closure details:</p>
                  <ul>
                    <li>Closure date: ${closureDate}</li>
                    <li>Reason: ${closureReason}</li>
                    <li>Total payout amount: ${totalAmount}</li>
                  </ul>
                  <p>If you have any questions or if this was unexpected, please contact our customer service.</p>
                  <p>Thank you for your business.</p>
                `
              });

              // Update notification record with email sent
              await client.query(
                `UPDATE notification
                 SET email_sent = true, 
                     last_modified_date = NOW()
                 WHERE id = $1`,
                [notificationId]
              );
            } catch (error) {
              logger.error('Error sending email notification for premature closure', {
                error,
                clientId: closure.client_id,
                accountId: closure.account_id
              });
            }
          }

          // Send SMS notification if enabled and mobile number is available
          if (sendSmsNotifications && closure.mobile_no) {
            try {
              await sendNotification({
                type: 'sms',
                recipientId: closure.client_id,
                recipientPhone: closure.mobile_no,
                body: `Your recurring deposit account ${accountNo} was prematurely closed on ${closureDate} with a payout of ${totalAmount}.`
              });

              // Update notification record with SMS sent
              await client.query(
                `UPDATE notification
                 SET sms_sent = true, 
                     last_modified_date = NOW()
                 WHERE id = $1`,
                [notificationId]
              );
            } catch (error) {
              logger.error('Error sending SMS notification for premature closure', {
                error,
                clientId: closure.client_id,
                accountId: closure.account_id
              });
            }
          }
        });
      }

      return {
        success: true,
        notificationsSent: closures.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error processing recurring deposit premature closure notification job', { error, jobId: job.id });
      throw error;
    }
  }

  /**
   * Create a notification record
   * @param client Database client
   * @param referenceId Reference ID (premature closure ID)
   * @param userId User ID (client ID)
   * @param referenceType Reference type
   * @param title Notification title
   * @param message Notification message
   * @returns Created notification ID
   */
  private async createNotificationRecord(
    client: any,
    referenceId: string,
    userId: string,
    referenceType: string,
    title: string,
    message: string
  ): Promise<string> {
    const notificationId = uuidv4();

    await client.query(
      `INSERT INTO notification (
        id, user_id, title, message, seen, reference_type, reference_id,
        email_sent, sms_sent, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        notificationId,
        userId,
        title,
        message,
        false,
        referenceType,
        referenceId,
        false,
        false
      ]
    );

    return notificationId;
  }
}

// Helper function to generate UUIDs
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}