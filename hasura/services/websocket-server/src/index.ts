/**
 * WebSocket Server for Fineract Real-time Notifications
 * This server provides a WebSocket interface for clients to receive real-time notifications.
 */

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { logger } from './utils/logger';
import { initNotificationEventListeners } from './listeners/notificationListeners';
import { verifySocketAuth } from './middleware/auth';

// Load environment variables
dotenv.config();

// Configure PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000
});

// Connection tracking
const activeConnections = new Map<string, { userId: string, socketId: string, tenant: string }>();

// Middleware to validate JWT
io.use(verifySocketAuth);

// Socket connection handling
io.on('connection', async (socket: Socket) => {
  try {
    const userId = socket.data.userId;
    const tenant = socket.data.tenant || 'default';
    const connectionId = uuidv4();
    
    if (!userId) {
      logger.error('Socket connection rejected - no userId');
      socket.disconnect(true);
      return;
    }
    
    logger.info(`User ${userId} connected with socket ${socket.id}`);
    
    // Store connection ID with user ID
    activeConnections.set(socket.id, { userId, socketId: socket.id, tenant });
    
    // Record connection in database
    const query = `
      INSERT INTO notification_websocket_connection (
        id, 
        user_id, 
        connection_id, 
        connection_time, 
        last_activity_time, 
        user_agent, 
        ip_address, 
        is_active
      ) VALUES ($1, $2, $3, NOW(), NOW(), $4, $5, true)
    `;
    
    await pool.query(query, [
      connectionId,
      userId,
      socket.id,
      socket.handshake.headers['user-agent'] || 'unknown',
      socket.handshake.address
    ]);
    
    // Join room for user-specific notifications
    socket.join(`user:${userId}`);
    
    // Join tenant room
    socket.join(`tenant:${tenant}`);
    
    // Handle subscription to topics
    socket.on('subscribe', async (topicName: string) => {
      try {
        // Check if topic exists and user is allowed to subscribe
        const topicQuery = `
          SELECT t.id, t.is_public 
          FROM notification_topic t 
          WHERE t.name = $1
        `;
        
        const topicResult = await pool.query(topicQuery, [topicName]);
        
        if (topicResult.rows.length === 0) {
          socket.emit('error', { message: `Topic '${topicName}' does not exist` });
          return;
        }
        
        const topic = topicResult.rows[0];
        
        // If topic is not public, check if user has permission
        if (!topic.is_public) {
          // Add permission check logic here if needed
          // For now, we'll assume public topics only
        }
        
        // Subscribe to topic
        const topicId = topic.id;
        
        // Check if already subscribed
        const subQuery = `
          SELECT id FROM notification_subscription
          WHERE user_id = $1 AND topic_id = $2
        `;
        
        const subResult = await pool.query(subQuery, [userId, topicId]);
        
        if (subResult.rows.length === 0) {
          // Create subscription
          await pool.query(`
            INSERT INTO notification_subscription (
              id, user_id, topic_id, is_active, created_date, created_by
            ) VALUES (uuid_generate_v4(), $1, $2, true, NOW(), $1)
          `, [userId, topicId]);
        } else if (!subResult.rows[0].is_active) {
          // Reactivate subscription if it was inactive
          await pool.query(`
            UPDATE notification_subscription
            SET is_active = true, last_modified_date = NOW(), last_modified_by = $1
            WHERE id = $2
          `, [userId, subResult.rows[0].id]);
        }
        
        // Join the topic room
        socket.join(`topic:${topicName}`);
        logger.info(`User ${userId} subscribed to topic ${topicName}`);
        
        socket.emit('subscribed', { topic: topicName });
      } catch (error) {
        logger.error(`Error subscribing to topic: ${error.message}`, { error, userId });
        socket.emit('error', { message: 'Failed to subscribe to topic' });
      }
    });
    
    // Handle unsubscription from topics
    socket.on('unsubscribe', async (topicName: string) => {
      try {
        // Get topic ID
        const topicQuery = `
          SELECT id FROM notification_topic WHERE name = $1
        `;
        
        const topicResult = await pool.query(topicQuery, [topicName]);
        
        if (topicResult.rows.length === 0) {
          socket.emit('error', { message: `Topic '${topicName}' does not exist` });
          return;
        }
        
        const topicId = topicResult.rows[0].id;
        
        // Update subscription
        await pool.query(`
          UPDATE notification_subscription
          SET is_active = false, last_modified_date = NOW(), last_modified_by = $1
          WHERE user_id = $1 AND topic_id = $2
        `, [userId, topicId]);
        
        // Leave the topic room
        socket.leave(`topic:${topicName}`);
        logger.info(`User ${userId} unsubscribed from topic ${topicName}`);
        
        socket.emit('unsubscribed', { topic: topicName });
      } catch (error) {
        logger.error(`Error unsubscribing from topic: ${error.message}`, { error, userId });
        socket.emit('error', { message: 'Failed to unsubscribe from topic' });
      }
    });
    
    // Handle marking notifications as read
    socket.on('markAsRead', async (notificationId: string) => {
      try {
        // Call database function to mark notification as read
        const result = await pool.query(`
          SELECT mark_notification_read($1, $2) as success
        `, [notificationId, userId]);
        
        const success = result.rows[0].success;
        
        if (success) {
          socket.emit('notificationRead', { id: notificationId, success: true });
        } else {
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      } catch (error) {
        logger.error(`Error marking notification as read: ${error.message}`, { error, userId, notificationId });
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });
    
    // Handle marking all notifications as read
    socket.on('markAllAsRead', async (filters: any = {}) => {
      try {
        // Call database function to mark all notifications as read
        const { module, entityType, entityId } = filters;
        
        const result = await pool.query(`
          SELECT mark_all_notifications_read($1, $2, $3, $4) as count
        `, [userId, module || null, entityType || null, entityId || null]);
        
        const count = result.rows[0].count;
        
        socket.emit('allNotificationsRead', { count });
      } catch (error) {
        logger.error(`Error marking all notifications as read: ${error.message}`, { error, userId });
        socket.emit('error', { message: 'Failed to mark all notifications as read' });
      }
    });
    
    // Handle client pings to keep connection alive
    socket.on('ping', async () => {
      try {
        // Update last activity time
        await pool.query(`
          UPDATE notification_websocket_connection
          SET last_activity_time = NOW()
          WHERE connection_id = $1
        `, [socket.id]);
        
        socket.emit('pong', { timestamp: Date.now() });
      } catch (error) {
        logger.error(`Error handling ping: ${error.message}`, { error, userId });
      }
    });
    
    // Handle client requests for initial data
    socket.on('getUnreadNotifications', async (limit = 20) => {
      try {
        // Get unread notifications for the user
        const query = `
          SELECT 
            id, subject, message, data, priority, module, entity_type, entity_id,
            notification_type, created_date
          FROM notification
          WHERE recipient_id = $1 AND is_read = false
          ORDER BY created_date DESC
          LIMIT $2
        `;
        
        const result = await pool.query(query, [userId, limit]);
        
        socket.emit('unreadNotifications', { notifications: result.rows });
      } catch (error) {
        logger.error(`Error getting unread notifications: ${error.message}`, { error, userId });
        socket.emit('error', { message: 'Failed to get unread notifications' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        logger.info(`User ${userId} disconnected`);
        
        // Update database record
        await pool.query(`
          UPDATE notification_websocket_connection
          SET is_active = false, last_activity_time = NOW()
          WHERE connection_id = $1
        `, [socket.id]);
        
        // Remove from active connections
        activeConnections.delete(socket.id);
      } catch (error) {
        logger.error(`Error handling disconnect: ${error.message}`, { error, userId });
      }
    });
    
  } catch (error) {
    logger.error(`Error handling socket connection: ${error.message}`, { error });
    socket.disconnect(true);
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT NOW()');
    
    res.status(200).json({
      status: 'ok',
      connections: activeConnections.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`, { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Setup notification event listeners
initNotificationEventListeners(pool, io);

// Start server
const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  logger.info(`WebSocket notification server running on port ${PORT}`);
});

// Export for testing
export { io, app, server, pool, activeConnections };