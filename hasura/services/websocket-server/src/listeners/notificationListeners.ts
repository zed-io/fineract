import { Server } from 'socket.io';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

/**
 * Initialize listeners for real-time notification events
 * This uses PostgreSQL's LISTEN/NOTIFY feature to receive database events
 */
export const initNotificationEventListeners = async (pool: Pool, io: Server) => {
  try {
    // Create a dedicated client for listening to PostgreSQL notifications
    const client = await pool.connect();
    
    // Listen for notification events
    await client.query('LISTEN notification_created');
    await client.query('LISTEN notification_updated');
    
    // Set up notification handlers
    client.on('notification', async (msg) => {
      try {
        if (!msg.payload) {
          logger.warn('Received empty notification payload');
          return;
        }
        
        const payload = JSON.parse(msg.payload);
        
        switch (msg.channel) {
          case 'notification_created':
            await handleNewNotification(io, pool, payload);
            break;
            
          case 'notification_updated':
            await handleUpdatedNotification(io, pool, payload);
            break;
            
          default:
            logger.warn(`Unknown notification channel: ${msg.channel}`);
        }
      } catch (error) {
        logger.error('Error processing database notification', { error, payload: msg.payload });
      }
    });
    
    // Log connection status
    logger.info('PostgreSQL notification listeners initialized');
    
    // Handle client errors
    client.on('error', (err) => {
      logger.error('PostgreSQL notification client error', { error: err });
      
      // Try to reconnect
      setTimeout(async () => {
        try {
          await client.release();
          initNotificationEventListeners(pool, io);
        } catch (error) {
          logger.error('Failed to reconnect notification listener', { error });
        }
      }, 5000);
    });
    
    // Ensure client is released on application shutdown
    process.on('SIGTERM', async () => {
      await client.release();
      logger.info('PostgreSQL notification listener released on shutdown');
    });
    
  } catch (error) {
    logger.error('Failed to initialize notification listeners', { error });
    
    // Retry after delay
    setTimeout(() => {
      initNotificationEventListeners(pool, io);
    }, 5000);
  }
};

/**
 * Handle new notification events
 */
const handleNewNotification = async (io: Server, pool: Pool, payload: any) => {
  try {
    const notificationId = payload.id;
    
    // Get full notification details
    const query = `
      SELECT 
        id, recipient_id, recipient_type, notification_type, subject, message,
        data, priority, module, entity_type, entity_id, created_date
      FROM notification
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [notificationId]);
    
    if (result.rows.length === 0) {
      logger.warn(`Notification not found: ${notificationId}`);
      return;
    }
    
    const notification = result.rows[0];
    
    // Emit to appropriate rooms
    
    // 1. User-specific notification
    io.to(`user:${notification.recipient_id}`).emit('notification', {
      id: notification.id,
      type: notification.notification_type,
      subject: notification.subject,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      module: notification.module,
      entityType: notification.entity_type,
      entityId: notification.entity_id,
      createdAt: notification.created_date
    });
    
    // 2. If there's a topic associated with this notification
    if (notification.data?.topic) {
      io.to(`topic:${notification.data.topic}`).emit('notification', {
        id: notification.id,
        type: notification.notification_type,
        subject: notification.subject,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        module: notification.module,
        entityType: notification.entity_type,
        entityId: notification.entity_id,
        createdAt: notification.created_date
      });
    }
    
    logger.info(`Sent new notification ${notificationId} to recipient ${notification.recipient_id}`);
  } catch (error) {
    logger.error('Error handling new notification', { error, notificationId: payload.id });
  }
};

/**
 * Handle updated notification events
 */
const handleUpdatedNotification = async (io: Server, pool: Pool, payload: any) => {
  try {
    const notificationId = payload.id;
    
    // Get notification details
    const query = `
      SELECT 
        id, recipient_id, status, is_read, read_date, last_modified_date
      FROM notification
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [notificationId]);
    
    if (result.rows.length === 0) {
      logger.warn(`Notification not found: ${notificationId}`);
      return;
    }
    
    const notification = result.rows[0];
    
    // Emit to user's room
    io.to(`user:${notification.recipient_id}`).emit('notificationUpdated', {
      id: notification.id,
      status: notification.status,
      isRead: notification.is_read,
      readDate: notification.read_date,
      lastModified: notification.last_modified_date
    });
    
    logger.info(`Sent notification update ${notificationId} to recipient ${notification.recipient_id}`);
  } catch (error) {
    logger.error('Error handling notification update', { error, notificationId: payload.id });
  }
};