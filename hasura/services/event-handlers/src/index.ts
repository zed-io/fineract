import express from 'express';
import axios from 'axios';
import { json } from 'body-parser';
import { logger } from './utils/logger';
import { pool } from './utils/db';
import { validateWebhookSecret } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(json());

// WebSocket server URL for pushing real-time notifications
const WEBSOCKET_SERVER_URL = process.env.NOTIFICATION_WS_URL || 'http://localhost:4001';

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Event handler endpoints with webhook secret validation
app.post('/event-handlers/*', validateWebhookSecret);

// Loan status changed handler
app.post('/event-handlers/loan-status-changed', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received loan status change event', { 
      triggerName: event.trigger.name,
      eventId: event.id,
      tableName: event.table.name
    });
    
    const { new: newData, old: oldData } = event.event.data;
    
    // Only process if there's an actual change in loan status
    if (newData.loan_status !== oldData.loan_status) {
      // Create notification for client
      if (newData.client_id) {
        try {
          const notificationData = {
            loanId: newData.id,
            loanAccountNo: newData.account_no,
            previousStatus: oldData.loan_status,
            newStatus: newData.loan_status
          };
          
          // Determine template code based on new status
          let templateCode = 'LOAN_STATUS_CHANGE';
          
          switch (newData.loan_status) {
            case 'Approved':
              templateCode = 'LOAN_APPROVED';
              break;
            case 'Active':
              templateCode = 'LOAN_DISBURSED';
              break;
            case 'Closed':
              templateCode = 'LOAN_CLOSED';
              break;
            case 'Rejected':
              templateCode = 'LOAN_REJECTED';
              break;
            case 'Withdrawn':
              templateCode = 'LOAN_WITHDRAWN';
              break;
          }
          
          // Get client info for notification
          const clientQuery = `
            SELECT id, display_name
            FROM client
            WHERE id = $1
          `;
          
          const clientResult = await pool.query(clientQuery, [newData.client_id]);
          
          if (clientResult.rows.length > 0) {
            const client = clientResult.rows[0];
            notificationData.clientName = client.display_name;
            
            // Send notification using the db function
            const query = `
              SELECT send_notification(
                $1, 'client', 'in_app', $2, $3, 'loan', 'loan', $4, 'medium', NULL, NULL
              ) as notification_id
            `;
            
            await pool.query(query, [
              newData.client_id,
              templateCode,
              JSON.stringify(notificationData),
              newData.id
            ]);
            
            // Notify WebSocket server for real-time delivery
            try {
              await axios.post(`${WEBSOCKET_SERVER_URL}/push-notification`, {
                recipientId: newData.client_id,
                recipientType: 'client',
                type: 'in_app',
                subject: `Loan ${newData.account_no} status changed to ${newData.loan_status}`,
                message: `Your loan (${newData.account_no}) status has been changed from ${oldData.loan_status} to ${newData.loan_status}.`,
                data: notificationData,
                module: 'loan',
                entityType: 'loan',
                entityId: newData.id
              });
            } catch (wsError) {
              logger.warn('Failed to notify WebSocket server', { error: wsError });
            }
          }
        } catch (notificationError) {
          logger.error('Error creating loan status notification', { error: notificationError });
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling loan status change event', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Savings account status changed handler
app.post('/event-handlers/savings-status-changed', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received savings account status change event', { 
      triggerName: event.trigger.name,
      eventId: event.id,
      tableName: event.table.name
    });
    
    const { new: newData, old: oldData } = event.event.data;
    
    // Only process if there's an actual change in status
    if (newData.status !== oldData.status) {
      // Create notification for client
      if (newData.client_id) {
        try {
          const notificationData = {
            savingsId: newData.id,
            savingsAccountNo: newData.account_no,
            previousStatus: oldData.status,
            newStatus: newData.status
          };
          
          // Determine template code based on new status
          let templateCode = 'SAVINGS_STATUS_CHANGE';
          
          switch (newData.status) {
            case 'Approved':
              templateCode = 'SAVINGS_APPROVED';
              break;
            case 'Active':
              templateCode = 'SAVINGS_ACTIVATED';
              break;
            case 'Closed':
              templateCode = 'SAVINGS_CLOSED';
              break;
            case 'Rejected':
              templateCode = 'SAVINGS_REJECTED';
              break;
          }
          
          // Get client info for notification
          const clientQuery = `
            SELECT id, display_name
            FROM client
            WHERE id = $1
          `;
          
          const clientResult = await pool.query(clientQuery, [newData.client_id]);
          
          if (clientResult.rows.length > 0) {
            const client = clientResult.rows[0];
            notificationData.clientName = client.display_name;
            
            // Send notification using the db function
            const query = `
              SELECT send_notification(
                $1, 'client', 'in_app', $2, $3, 'savings', 'savings_account', $4, 'medium', NULL, NULL
              ) as notification_id
            `;
            
            await pool.query(query, [
              newData.client_id,
              templateCode,
              JSON.stringify(notificationData),
              newData.id
            ]);
            
            // Notify WebSocket server for real-time delivery
            try {
              await axios.post(`${WEBSOCKET_SERVER_URL}/push-notification`, {
                recipientId: newData.client_id,
                recipientType: 'client',
                type: 'in_app',
                subject: `Savings Account ${newData.account_no} status changed to ${newData.status}`,
                message: `Your savings account (${newData.account_no}) status has been changed from ${oldData.status} to ${newData.status}.`,
                data: notificationData,
                module: 'savings',
                entityType: 'savings_account',
                entityId: newData.id
              });
            } catch (wsError) {
              logger.warn('Failed to notify WebSocket server', { error: wsError });
            }
          }
        } catch (notificationError) {
          logger.error('Error creating savings status notification', { error: notificationError });
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling savings status change event', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Loan transaction created handler
app.post('/event-handlers/loan-transaction-created', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received loan transaction created event', { 
      triggerName: event.trigger.name,
      eventId: event.id,
      tableName: event.table.name
    });
    
    const newTransaction = event.event.data.new;
    
    // Create notification for client
    if (newTransaction.loan_id) {
      try {
        // Get loan details
        const loanQuery = `
          SELECT l.id, l.account_no, l.client_id, c.display_name as client_name
          FROM loan l
          JOIN client c ON l.client_id = c.id
          WHERE l.id = $1
        `;
        
        const loanResult = await pool.query(loanQuery, [newTransaction.loan_id]);
        
        if (loanResult.rows.length > 0) {
          const loan = loanResult.rows[0];
          
          const notificationData = {
            transactionId: newTransaction.id,
            loanId: loan.id,
            loanAccountNo: loan.account_no,
            transactionType: newTransaction.transaction_type,
            amount: newTransaction.amount,
            currency: newTransaction.currency_code,
            transactionDate: newTransaction.transaction_date
          };
          
          // Determine template code based on transaction type
          let templateCode = 'LOAN_TRANSACTION_CREATED';
          let subject = 'Loan Transaction Recorded';
          let message = `A ${newTransaction.transaction_type} transaction of ${newTransaction.currency_code} ${newTransaction.amount} has been recorded on your loan account (${loan.account_no}).`;
          
          switch (newTransaction.transaction_type) {
            case 'Repayment':
              templateCode = 'LOAN_REPAYMENT';
              subject = 'Loan Repayment Received';
              message = `Your loan repayment of ${newTransaction.currency_code} ${newTransaction.amount} for account ${loan.account_no} has been received.`;
              break;
            case 'Disbursement':
              templateCode = 'LOAN_DISBURSEMENT';
              subject = 'Loan Disbursement Processed';
              message = `Your loan disbursement of ${newTransaction.currency_code} ${newTransaction.amount} for account ${loan.account_no} has been processed.`;
              break;
            case 'Waive Interest':
              templateCode = 'LOAN_INTEREST_WAIVED';
              subject = 'Loan Interest Waived';
              message = `Interest of ${newTransaction.currency_code} ${newTransaction.amount} has been waived on your loan account ${loan.account_no}.`;
              break;
          }
          
          // Send notification using the db function
          const query = `
            SELECT send_notification(
              $1, 'client', 'in_app', $2, $3, 'loan', 'loan_transaction', $4, 'medium', NULL, NULL
            ) as notification_id
          `;
          
          await pool.query(query, [
            loan.client_id,
            templateCode,
            JSON.stringify(notificationData),
            newTransaction.id
          ]);
          
          // Notify WebSocket server for real-time delivery
          try {
            await axios.post(`${WEBSOCKET_SERVER_URL}/push-notification`, {
              recipientId: loan.client_id,
              recipientType: 'client',
              type: 'in_app',
              subject,
              message,
              data: notificationData,
              module: 'loan',
              entityType: 'loan_transaction',
              entityId: newTransaction.id
            });
          } catch (wsError) {
            logger.warn('Failed to notify WebSocket server', { error: wsError });
          }
        }
      } catch (notificationError) {
        logger.error('Error creating loan transaction notification', { error: notificationError });
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling loan transaction created event', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Savings transaction created handler
app.post('/event-handlers/savings-transaction-created', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received savings transaction created event', { 
      triggerName: event.trigger.name,
      eventId: event.id,
      tableName: event.table.name
    });
    
    const newTransaction = event.event.data.new;
    
    // Create notification for client
    if (newTransaction.savings_account_id) {
      try {
        // Get savings account details
        const savingsQuery = `
          SELECT s.id, s.account_no, s.client_id, c.display_name as client_name
          FROM savings_account s
          JOIN client c ON s.client_id = c.id
          WHERE s.id = $1
        `;
        
        const savingsResult = await pool.query(savingsQuery, [newTransaction.savings_account_id]);
        
        if (savingsResult.rows.length > 0) {
          const savings = savingsResult.rows[0];
          
          const notificationData = {
            transactionId: newTransaction.id,
            savingsId: savings.id,
            savingsAccountNo: savings.account_no,
            transactionType: newTransaction.transaction_type,
            amount: newTransaction.amount,
            currency: newTransaction.currency_code,
            transactionDate: newTransaction.transaction_date
          };
          
          // Determine template code based on transaction type
          let templateCode = 'SAVINGS_TRANSACTION_CREATED';
          let subject = 'Savings Transaction Recorded';
          let message = `A ${newTransaction.transaction_type} transaction of ${newTransaction.currency_code} ${newTransaction.amount} has been recorded on your savings account (${savings.account_no}).`;
          
          switch (newTransaction.transaction_type) {
            case 'Deposit':
              templateCode = 'SAVINGS_DEPOSIT';
              subject = 'Savings Deposit Received';
              message = `Your deposit of ${newTransaction.currency_code} ${newTransaction.amount} to savings account ${savings.account_no} has been received.`;
              break;
            case 'Withdrawal':
              templateCode = 'SAVINGS_WITHDRAWAL';
              subject = 'Savings Withdrawal Processed';
              message = `Your withdrawal of ${newTransaction.currency_code} ${newTransaction.amount} from savings account ${savings.account_no} has been processed.`;
              break;
            case 'Interest Posting':
              templateCode = 'SAVINGS_INTEREST_POSTING';
              subject = 'Interest Posted to Savings Account';
              message = `Interest of ${newTransaction.currency_code} ${newTransaction.amount} has been posted to your savings account ${savings.account_no}.`;
              break;
          }
          
          // Send notification using the db function
          const query = `
            SELECT send_notification(
              $1, 'client', 'in_app', $2, $3, 'savings', 'savings_transaction', $4, 'medium', NULL, NULL
            ) as notification_id
          `;
          
          await pool.query(query, [
            savings.client_id,
            templateCode,
            JSON.stringify(notificationData),
            newTransaction.id
          ]);
          
          // Notify WebSocket server for real-time delivery
          try {
            await axios.post(`${WEBSOCKET_SERVER_URL}/push-notification`, {
              recipientId: savings.client_id,
              recipientType: 'client',
              type: 'in_app',
              subject,
              message,
              data: notificationData,
              module: 'savings',
              entityType: 'savings_transaction',
              entityId: newTransaction.id
            });
          } catch (wsError) {
            logger.warn('Failed to notify WebSocket server', { error: wsError });
          }
        }
      } catch (notificationError) {
        logger.error('Error creating savings transaction notification', { error: notificationError });
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling savings transaction created event', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Client status changed handler
app.post('/event-handlers/client-status-changed', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received client status change event', { 
      triggerName: event.trigger.name,
      eventId: event.id,
      tableName: event.table.name
    });
    
    const { new: newData, old: oldData } = event.event.data;
    
    // Only process if there's an actual change in status
    if (newData.status !== oldData.status) {
      try {
        const notificationData = {
          clientId: newData.id,
          displayName: newData.display_name,
          previousStatus: oldData.status,
          newStatus: newData.status
        };
        
        // Determine template code based on new status
        let templateCode = 'CLIENT_STATUS_CHANGE';
        
        switch (newData.status) {
          case 'Active':
            templateCode = 'CLIENT_ACTIVATED';
            break;
          case 'Closed':
            templateCode = 'CLIENT_CLOSED';
            break;
          case 'Rejected':
            templateCode = 'CLIENT_REJECTED';
            break;
        }
        
        // Send notification to staff in charge of client
        if (newData.staff_id) {
          // Send notification using the db function
          const query = `
            SELECT send_notification(
              $1, 'staff', 'in_app', $2, $3, 'client', 'client', $4, 'medium', NULL, NULL
            ) as notification_id
          `;
          
          await pool.query(query, [
            newData.staff_id,
            templateCode + '_STAFF',
            JSON.stringify(notificationData),
            newData.id
          ]);
          
          // Notify WebSocket server for real-time delivery
          try {
            await axios.post(`${WEBSOCKET_SERVER_URL}/push-notification`, {
              recipientId: newData.staff_id,
              recipientType: 'staff',
              type: 'in_app',
              subject: `Client ${newData.display_name} Status Changed`,
              message: `Client ${newData.display_name} status has been changed from ${oldData.status} to ${newData.status}.`,
              data: notificationData,
              module: 'client',
              entityType: 'client',
              entityId: newData.id
            });
          } catch (wsError) {
            logger.warn('Failed to notify WebSocket server', { error: wsError });
          }
        }
        
        // Also send notification to the client if they have a user account
        // This would require additional logic to find the user account associated with the client
      } catch (notificationError) {
        logger.error('Error creating client status notification', { error: notificationError });
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling client status change event', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Journal entry created handler
app.post('/event-handlers/journal-entry-created', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received journal entry created event', { 
      triggerName: event.trigger.name,
      eventId: event.id,
      tableName: event.table.name
    });
    
    const newEntry = event.event.data.new;
    
    // Process notifications for certain types of journal entries
    // This would typically be for staff notifications rather than clients
    // Implement based on business requirements
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling journal entry created event', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Function to notify system admins of errors
const notifySystemAdmins = async (subject, message, error) => {
  try {
    // Get system admin user IDs
    const query = `
      SELECT u.id
      FROM app_user u
      JOIN app_user_role r ON u.id = r.user_id
      WHERE r.role_name = 'admin'
    `;
    
    const adminUsers = await pool.query(query);
    
    for (const admin of adminUsers.rows) {
      try {
        // Send in-app notification
        await pool.query(`
          INSERT INTO notification (
            id,
            recipient_id,
            recipient_type,
            notification_type,
            subject,
            message,
            data,
            priority,
            status,
            module,
            created_date
          ) VALUES (
            uuid_generate_v4(), $1, 'staff', 'in_app', $2, $3, $4, 'high', 'pending', 'system', NOW()
          )
        `, [
          admin.id,
          subject,
          message,
          JSON.stringify({ error: error?.message || 'Unknown error', stack: error?.stack })
        ]);
      } catch (notificationError) {
        logger.error('Failed to notify admin of error', { 
          adminId: admin.id, 
          error: notificationError 
        });
      }
    }
  } catch (dbError) {
    logger.error('Failed to query admin users', { error: dbError });
  }
};

// Global error handler
app.use((err, req, res, next) => {
  const errorId = Date.now().toString();
  logger.error(`Unhandled error [${errorId}]:`, err);
  
  // Notify system admins of unhandled errors
  notifySystemAdmins(
    'Unhandled Error in Event Handler Service',
    `An unhandled error occurred in the event handler service. Error ID: ${errorId}`,
    err
  );
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorId
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Event handler service running on port ${PORT}`);
});