/**
 * Enhanced Notification API handlers for Fineract Hasura actions
 * Provides comprehensive notification management capabilities
 */

import { Request, Response } from 'express';
import { pool } from '../utils/db';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from '../services/notificationService';
import { NotificationChannel } from '../models/notification';
import axios from 'axios';

/**
 * Notification API handlers
 */
export const notificationHandlers = {
  /**
   * Send a notification to a recipient
   */
  async sendNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        recipientId,
        recipientType,
        notificationType,
        templateCode,
        data,
        module,
        entityType,
        entityId,
        priority
      } = req.body.input;
      
      // Validate required inputs
      if (!recipientId || !recipientType || !notificationType || !templateCode || !module) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing: recipientId, recipientType, notificationType, templateCode, and module are required'
        });
      }
      
      // Send notification using database function
      const query = `
        SELECT send_notification(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10
        ) as notification_id
      `;
      
      const result = await pool.query(query, [
        recipientId,
        recipientType,
        notificationType,
        templateCode,
        JSON.stringify(data || {}),
        module,
        entityType || null,
        entityId || null,
        priority || 'medium',
        userId
      ]);
      
      const notificationId = result.rows[0].notification_id;
      
      // Notify WebSocket server for real-time delivery if applicable
      if (['websocket', 'in_app'].includes(notificationType)) {
        try {
          // Get details of the notification
          const notificationQuery = `
            SELECT recipient_id, notification_type, subject, message, data, priority, module, entity_type, entity_id
            FROM notification
            WHERE id = $1
          `;
          
          const notificationResult = await pool.query(notificationQuery, [notificationId]);
          
          if (notificationResult.rows.length > 0) {
            const notification = notificationResult.rows[0];
            
            // Post to WebSocket server notification endpoint
            const wsServerUrl = process.env.NOTIFICATION_WS_URL || 'http://localhost:4001';
            await axios.post(`${wsServerUrl}/push-notification`, {
              id: notificationId,
              recipientId: notification.recipient_id,
              type: notification.notification_type,
              subject: notification.subject,
              message: notification.message,
              data: notification.data,
              priority: notification.priority,
              module: notification.module,
              entityType: notification.entity_type,
              entityId: notification.entity_id
            });
          }
        } catch (wsError) {
          logger.warn('Failed to notify WebSocket server about new notification', { wsError, notificationId });
          // Continue anyway - the notification is saved in the database
        }
      }
      
      res.json({
        success: true,
        message: 'Notification sent successfully',
        notificationId
      });
    } catch (error) {
      logger.error('Error sending notification', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        recipientId,
        recipientType,
        notificationType,
        templateCode,
        data,
        module,
        entityType,
        entityId,
        priority,
        scheduledDate
      } = req.body.input;
      
      // Validate required inputs
      if (!recipientId || !recipientType || !notificationType || !templateCode || !module || !scheduledDate) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing: recipientId, recipientType, notificationType, templateCode, module, and scheduledDate are required'
        });
      }
      
      // Validate that scheduled date is in the future
      const scheduledDateObj = new Date(scheduledDate);
      if (scheduledDateObj <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
      }
      
      // Schedule notification using database function
      const query = `
        SELECT send_notification(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) as notification_id
      `;
      
      const result = await pool.query(query, [
        recipientId,
        recipientType,
        notificationType,
        templateCode,
        JSON.stringify(data || {}),
        module,
        entityType || null,
        entityId || null,
        priority || 'medium',
        scheduledDate,
        userId
      ]);
      
      const notificationId = result.rows[0].notification_id;
      
      res.json({
        success: true,
        message: 'Notification scheduled successfully',
        notificationId,
        scheduledFor: scheduledDate
      });
    } catch (error) {
      logger.error('Error scheduling notification', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Send batch notifications
   */
  async sendBatchNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { notifications } = req.body.input;
      
      if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Notifications array is required and must not be empty'
        });
      }
      
      const results = [];
      
      for (const notification of notifications) {
        try {
          const {
            recipientId,
            recipientType,
            notificationType,
            templateCode,
            data,
            module,
            entityType,
            entityId,
            priority
          } = notification;
          
          // Skip invalid notifications
          if (!recipientId || !recipientType || !notificationType || !templateCode || !module) {
            results.push({
              success: false,
              message: 'Required fields missing for this notification'
            });
            continue;
          }
          
          // Send notification using database function
          const query = `
            SELECT send_notification(
              $1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10
            ) as notification_id
          `;
          
          const result = await pool.query(query, [
            recipientId,
            recipientType,
            notificationType,
            templateCode,
            JSON.stringify(data || {}),
            module,
            entityType || null,
            entityId || null,
            priority || 'medium',
            userId
          ]);
          
          const notificationId = result.rows[0].notification_id;
          
          results.push({
            success: true,
            notificationId
          });
        } catch (notificationError) {
          results.push({
            success: false,
            message: notificationError.message
          });
        }
      }
      
      res.json({
        success: true,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        results
      });
    } catch (error) {
      logger.error('Error sending batch notifications', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Get notifications for a user
   */
  async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        isRead,
        module,
        entityType,
        entityId,
        notificationType,
        fromDate,
        toDate,
        limit = 20,
        offset = 0
      } = req.body.input || {};
      
      // Build the WHERE clause
      const params = [userId];
      let paramIndex = 1;
      
      let whereClause = 'WHERE recipient_id = $1';
      
      if (isRead !== undefined) {
        paramIndex++;
        whereClause += ` AND is_read = $${paramIndex}`;
        params.push(isRead);
      }
      
      if (module) {
        paramIndex++;
        whereClause += ` AND module = $${paramIndex}`;
        params.push(module);
      }
      
      if (entityType) {
        paramIndex++;
        whereClause += ` AND entity_type = $${paramIndex}`;
        params.push(entityType);
      }
      
      if (entityId) {
        paramIndex++;
        whereClause += ` AND entity_id = $${paramIndex}`;
        params.push(entityId);
      }
      
      if (notificationType) {
        paramIndex++;
        whereClause += ` AND notification_type = $${paramIndex}`;
        params.push(notificationType);
      }
      
      if (fromDate) {
        paramIndex++;
        whereClause += ` AND created_date >= $${paramIndex}`;
        params.push(fromDate);
      }
      
      if (toDate) {
        paramIndex++;
        whereClause += ` AND created_date <= $${paramIndex}`;
        params.push(toDate);
      }
      
      // Add limit and offset
      paramIndex++;
      const limitClause = ` LIMIT $${paramIndex}`;
      params.push(limit);
      
      paramIndex++;
      const offsetClause = ` OFFSET $${paramIndex}`;
      params.push(offset);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM notification
        ${whereClause}
      `;
      
      const countResult = await pool.query(countQuery, params.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].total);
      
      // Get the notifications
      const query = `
        SELECT
          n.id,
          n.recipient_id as "recipientId",
          n.recipient_type as "recipientType",
          n.notification_type as "notificationType",
          n.subject,
          n.message,
          n.data,
          n.priority,
          n.status,
          n.module,
          n.entity_type as "entityType",
          n.entity_id as "entityId",
          n.is_read as "isRead",
          n.read_date as "readDate",
          n.sent_date as "sentDate",
          n.delivery_date as "deliveryDate",
          n.created_date as "createdDate",
          
          -- Template info if available
          nt.id as "template.id",
          nt.name as "template.name",
          nt.code as "template.code",
          nt.module as "template.module",
          nt.event_type as "template.eventType"
        FROM
          notification n
        LEFT JOIN
          notification_template nt ON n.template_id = nt.id
        ${whereClause}
        ORDER BY n.created_date DESC
        ${limitClause}
        ${offsetClause}
      `;
      
      const result = await pool.query(query, params);
      
      res.json({
        notifications: result.rows,
        totalCount,
        pageInfo: {
          limit,
          offset,
          hasMore: offset + result.rows.length < totalCount
        }
      });
    } catch (error) {
      logger.error('Error getting user notifications', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { module } = req.body.input || {};
      
      // Build the query
      let query = `
        SELECT COUNT(*) as total
        FROM notification
        WHERE recipient_id = $1 AND is_read = false
      `;
      
      const params = [userId];
      
      if (module) {
        query += ' AND module = $2';
        params.push(module);
      }
      
      const result = await pool.query(query, params);
      const count = parseInt(result.rows[0].total);
      
      // Get counts by module if no module specified
      let moduleBreakdown = null;
      
      if (!module) {
        const breakdownQuery = `
          SELECT 
            module, 
            COUNT(*) as count
          FROM 
            notification
          WHERE 
            recipient_id = $1 
            AND is_read = false
          GROUP BY 
            module
        `;
        
        const breakdownResult = await pool.query(breakdownQuery, [userId]);
        moduleBreakdown = breakdownResult.rows.reduce((acc, row) => {
          acc[row.module] = parseInt(row.count);
          return acc;
        }, {});
      }
      
      res.json({
        count,
        moduleBreakdown
      });
    } catch (error) {
      logger.error('Error getting unread notification count', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Mark a notification as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.body.input;
      
      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message: 'Notification ID is required'
        });
      }
      
      // Call database function
      const query = `
        SELECT mark_notification_read($1, $2) as success
      `;
      
      const result = await pool.query(query, [notificationId, userId]);
      const success = result.rows[0].success;
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or not owned by this user'
        });
      }
      
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Error marking notification as read', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { module, entityType, entityId } = req.body.input || {};
      
      // Call database function
      const query = `
        SELECT mark_all_notifications_read($1, $2, $3, $4) as count
      `;
      
      const result = await pool.query(query, [
        userId,
        module || null,
        entityType || null,
        entityId || null
      ]);
      
      const count = result.rows[0].count;
      
      res.json({
        success: true,
        message: `${count} notifications marked as read`,
        count
      });
    } catch (error) {
      logger.error('Error marking all notifications as read', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Get notification templates
   */
  async getNotificationTemplates(req: Request, res: Response) {
    try {
      const { module, applicableType, isActive } = req.body.input || {};
      
      // Build the WHERE clause
      const params = [];
      let paramIndex = 0;
      let whereClause = '';
      
      if (module) {
        paramIndex++;
        whereClause += whereClause ? ' AND ' : 'WHERE ';
        whereClause += `module = $${paramIndex}`;
        params.push(module);
      }
      
      if (applicableType) {
        paramIndex++;
        whereClause += whereClause ? ' AND ' : 'WHERE ';
        whereClause += `$${paramIndex} = ANY(applicable_types)`;
        params.push(applicableType);
      }
      
      if (isActive !== undefined) {
        paramIndex++;
        whereClause += whereClause ? ' AND ' : 'WHERE ';
        whereClause += `is_active = $${paramIndex}`;
        params.push(isActive);
      }
      
      // Get the templates
      const query = `
        SELECT
          id,
          name,
          code,
          subject,
          message_template as "messageTemplate",
          applicable_types as "applicableTypes",
          module,
          event_type as "eventType",
          description,
          placeholders,
          is_active as "isActive",
          created_date as "createdDate"
        FROM
          notification_template
        ${whereClause}
        ORDER BY
          module, name
      `;
      
      const result = await pool.query(query, params);
      
      res.json({
        templates: result.rows
      });
    } catch (error) {
      logger.error('Error getting notification templates', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Create a notification template
   */
  async createNotificationTemplate(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can create notification templates'
        });
      }
      
      const {
        name,
        code,
        subject,
        messageTemplate,
        applicableTypes,
        module,
        eventType,
        description,
        placeholders
      } = req.body.input;
      
      // Validate required fields
      if (!name || !code || !messageTemplate || !applicableTypes || !module || !eventType) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing: name, code, messageTemplate, applicableTypes, module, and eventType are required'
        });
      }
      
      // Check if code already exists
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM notification_template
        WHERE code = $1
      `;
      
      const checkResult = await pool.query(checkQuery, [code]);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        return res.status(409).json({
          success: false,
          message: `Template with code "${code}" already exists`
        });
      }
      
      // Create the template
      const query = `
        INSERT INTO notification_template (
          id,
          name,
          code,
          subject,
          message_template,
          applicable_types,
          module,
          event_type,
          description,
          placeholders,
          is_active,
          created_date,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), $11
        )
        RETURNING
          id,
          name,
          code,
          subject,
          message_template as "messageTemplate",
          applicable_types as "applicableTypes",
          module,
          event_type as "eventType",
          description,
          placeholders,
          is_active as "isActive",
          created_date as "createdDate"
      `;
      
      const result = await pool.query(query, [
        uuidv4(),
        name,
        code,
        subject,
        messageTemplate,
        applicableTypes,
        module,
        eventType,
        description,
        placeholders ? JSON.stringify(placeholders) : null,
        userId
      ]);
      
      res.json({
        success: true,
        message: 'Notification template created successfully',
        template: result.rows[0]
      });
    } catch (error) {
      logger.error('Error creating notification template', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Update a notification template
   */
  async updateNotificationTemplate(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can update notification templates'
        });
      }
      
      const {
        id,
        name,
        subject,
        messageTemplate,
        applicableTypes,
        description,
        placeholders,
        isActive
      } = req.body.input;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required'
        });
      }
      
      // Build update fields
      const updates = [];
      const params = [id];
      let paramIndex = 1;
      
      if (name !== undefined) {
        paramIndex++;
        updates.push(`name = $${paramIndex}`);
        params.push(name);
      }
      
      if (subject !== undefined) {
        paramIndex++;
        updates.push(`subject = $${paramIndex}`);
        params.push(subject);
      }
      
      if (messageTemplate !== undefined) {
        paramIndex++;
        updates.push(`message_template = $${paramIndex}`);
        params.push(messageTemplate);
      }
      
      if (applicableTypes !== undefined) {
        paramIndex++;
        updates.push(`applicable_types = $${paramIndex}`);
        params.push(applicableTypes);
      }
      
      if (description !== undefined) {
        paramIndex++;
        updates.push(`description = $${paramIndex}`);
        params.push(description);
      }
      
      if (placeholders !== undefined) {
        paramIndex++;
        updates.push(`placeholders = $${paramIndex}`);
        params.push(placeholders ? JSON.stringify(placeholders) : null);
      }
      
      if (isActive !== undefined) {
        paramIndex++;
        updates.push(`is_active = $${paramIndex}`);
        params.push(isActive);
      }
      
      // Add last modified information
      paramIndex++;
      updates.push(`last_modified_date = NOW()`);
      updates.push(`last_modified_by = $${paramIndex}`);
      params.push(userId);
      
      if (updates.length <= 2) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      // Update the template
      const query = `
        UPDATE notification_template
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING
          id,
          name,
          code,
          subject,
          message_template as "messageTemplate",
          applicable_types as "applicableTypes",
          module,
          event_type as "eventType",
          description,
          placeholders,
          is_active as "isActive",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
      `;
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Notification template updated successfully',
        template: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating notification template', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { module, notificationType } = req.body.input || {};
      
      // Build query conditions
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 1;
      
      if (module) {
        paramIndex++;
        whereClause += ` AND module = $${paramIndex}`;
        params.push(module);
      }
      
      if (notificationType) {
        paramIndex++;
        whereClause += ` AND notification_type = $${paramIndex}`;
        params.push(notificationType);
      }
      
      // Get user preferences
      const query = `
        SELECT
          id,
          user_id as "userId",
          notification_type as "notificationType",
          module,
          event_type as "eventType",
          is_enabled as "isEnabled",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
        FROM
          notification_preference
        ${whereClause}
        ORDER BY
          module, notification_type, event_type
      `;
      
      const result = await pool.query(query, params);
      
      res.json({
        preferences: result.rows
      });
    } catch (error) {
      logger.error('Error getting user notification preferences', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Update user notification preference
   */
  async updateNotificationPreference(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        notificationType,
        module,
        eventType,
        isEnabled
      } = req.body.input;
      
      // Validate required fields
      if (!notificationType || !module || !eventType || isEnabled === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing: notificationType, module, eventType, and isEnabled are required'
        });
      }
      
      // Check if preference exists
      const checkQuery = `
        SELECT id
        FROM notification_preference
        WHERE
          user_id = $1 AND
          notification_type = $2 AND
          module = $3 AND
          event_type = $4
      `;
      
      const checkResult = await pool.query(checkQuery, [
        userId,
        notificationType,
        module,
        eventType
      ]);
      
      let preferenceId;
      
      if (checkResult.rows.length > 0) {
        // Update existing preference
        preferenceId = checkResult.rows[0].id;
        
        const updateQuery = `
          UPDATE notification_preference
          SET
            is_enabled = $2,
            last_modified_date = NOW(),
            last_modified_by = $3
          WHERE
            id = $1
          RETURNING
            id,
            user_id as "userId",
            notification_type as "notificationType",
            module,
            event_type as "eventType",
            is_enabled as "isEnabled",
            created_date as "createdDate",
            last_modified_date as "lastModifiedDate"
        `;
        
        const updateResult = await pool.query(updateQuery, [
          preferenceId,
          isEnabled,
          userId
        ]);
        
        res.json({
          success: true,
          message: 'Notification preference updated successfully',
          preference: updateResult.rows[0]
        });
      } else {
        // Create new preference
        preferenceId = uuidv4();
        
        const insertQuery = `
          INSERT INTO notification_preference (
            id,
            user_id,
            notification_type,
            module,
            event_type,
            is_enabled,
            created_date,
            created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, NOW(), $7
          )
          RETURNING
            id,
            user_id as "userId",
            notification_type as "notificationType",
            module,
            event_type as "eventType",
            is_enabled as "isEnabled",
            created_date as "createdDate"
        `;
        
        const insertResult = await pool.query(insertQuery, [
          preferenceId,
          userId,
          notificationType,
          module,
          eventType,
          isEnabled,
          userId
        ]);
        
        res.json({
          success: true,
          message: 'Notification preference created successfully',
          preference: insertResult.rows[0]
        });
      }
    } catch (error) {
      logger.error('Error updating notification preference', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Get user notification channels
   */
  async getUserNotificationChannels(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { channelType } = req.body.input || {};
      
      // Build query conditions
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      
      if (channelType) {
        whereClause += ' AND channel_type = $2';
        params.push(channelType);
      }
      
      // Get user channels
      const query = `
        SELECT
          id,
          user_id as "userId",
          channel_type as "channelType",
          channel_value as "channelValue",
          is_verified as "isVerified",
          is_primary as "isPrimary",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
        FROM
          notification_user_channel
        ${whereClause}
        ORDER BY
          channel_type, is_primary DESC, created_date
      `;
      
      const result = await pool.query(query, params);
      
      res.json({
        channels: result.rows
      });
    } catch (error) {
      logger.error('Error getting user notification channels', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Add a notification channel for a user
   */
  async addNotificationChannel(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        channelType,
        channelValue,
        isPrimary = false
      } = req.body.input;
      
      // Validate required fields
      if (!channelType || !channelValue) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing: channelType and channelValue are required'
        });
      }
      
      // Validate channel type
      const validChannelTypes = ['email', 'sms', 'push'];
      if (!validChannelTypes.includes(channelType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid channel type. Must be one of: ${validChannelTypes.join(', ')}`
        });
      }
      
      // Check if channel already exists
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM notification_user_channel
        WHERE
          user_id = $1 AND
          channel_type = $2 AND
          channel_value = $3
      `;
      
      const checkResult = await pool.query(checkQuery, [
        userId,
        channelType,
        channelValue
      ]);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        return res.status(409).json({
          success: false,
          message: 'This channel already exists for this user'
        });
      }
      
      // Generate verification token
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpiry = new Date();
      verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hour expiry
      
      // If this is primary, unset other primary channels of this type
      let updatePrimaryQuery = '';
      
      if (isPrimary) {
        updatePrimaryQuery = `
          UPDATE notification_user_channel
          SET
            is_primary = false,
            last_modified_date = NOW(),
            last_modified_by = $1
          WHERE
            user_id = $1 AND
            channel_type = $2 AND
            is_primary = true;
        `;
        
        await pool.query(updatePrimaryQuery, [userId, channelType]);
      }
      
      // Add channel
      const query = `
        INSERT INTO notification_user_channel (
          id,
          user_id,
          channel_type,
          channel_value,
          is_verified,
          is_primary,
          verification_token,
          verification_expiry,
          created_date,
          created_by
        ) VALUES (
          $1, $2, $3, $4, false, $5, $6, $7, NOW(), $8
        )
        RETURNING
          id,
          user_id as "userId",
          channel_type as "channelType",
          channel_value as "channelValue",
          is_verified as "isVerified",
          is_primary as "isPrimary",
          created_date as "createdDate"
      `;
      
      const result = await pool.query(query, [
        uuidv4(),
        userId,
        channelType,
        channelValue,
        isPrimary,
        verificationToken,
        verificationExpiry,
        userId
      ]);
      
      // In a real implementation, send verification email/SMS here
      try {
        await notificationService.sendVerificationCode(
          channelType as NotificationChannel,
          channelValue,
          verificationToken
        );
      } catch (verificationError) {
        logger.error('Failed to send verification code', { verificationError, channelType, userId });
        // Continue anyway, user can request another verification code
      }
      
      res.json({
        success: true,
        message: 'Notification channel added successfully. Verification required.',
        channel: result.rows[0],
        verificationSent: true
      });
    } catch (error) {
      logger.error('Error adding notification channel', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Update a notification channel
   */
  async updateNotificationChannel(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        channelId,
        isPrimary
      } = req.body.input;
      
      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: 'Channel ID is required'
        });
      }
      
      // Check if channel exists and belongs to user
      const checkQuery = `
        SELECT id, channel_type
        FROM notification_user_channel
        WHERE
          id = $1 AND
          user_id = $2
      `;
      
      const checkResult = await pool.query(checkQuery, [channelId, userId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Channel not found or does not belong to this user'
        });
      }
      
      const channelType = checkResult.rows[0].channel_type;
      
      // If setting as primary, update other channels
      if (isPrimary) {
        const updatePrimaryQuery = `
          UPDATE notification_user_channel
          SET
            is_primary = false,
            last_modified_date = NOW(),
            last_modified_by = $1
          WHERE
            user_id = $1 AND
            channel_type = $2 AND
            id != $3 AND
            is_primary = true
        `;
        
        await pool.query(updatePrimaryQuery, [userId, channelType, channelId]);
      }
      
      // Update channel
      const updateQuery = `
        UPDATE notification_user_channel
        SET
          is_primary = $3,
          last_modified_date = NOW(),
          last_modified_by = $2
        WHERE
          id = $1
        RETURNING
          id,
          user_id as "userId",
          channel_type as "channelType",
          channel_value as "channelValue",
          is_verified as "isVerified",
          is_primary as "isPrimary",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
      `;
      
      const result = await pool.query(updateQuery, [
        channelId,
        userId,
        isPrimary
      ]);
      
      res.json({
        success: true,
        message: 'Notification channel updated successfully',
        channel: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating notification channel', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Verify a notification channel
   */
  async verifyNotificationChannel(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        channelId,
        verificationCode
      } = req.body.input;
      
      if (!channelId || !verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Channel ID and verification code are required'
        });
      }
      
      // Check verification code
      const checkQuery = `
        SELECT
          id,
          verification_token,
          verification_expiry,
          is_verified
        FROM
          notification_user_channel
        WHERE
          id = $1 AND
          user_id = $2
      `;
      
      const checkResult = await pool.query(checkQuery, [channelId, userId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Channel not found or does not belong to this user'
        });
      }
      
      const channel = checkResult.rows[0];
      
      // Check if already verified
      if (channel.is_verified) {
        return res.status(400).json({
          success: false,
          message: 'Channel is already verified'
        });
      }
      
      // Check if token is expired
      if (new Date() > new Date(channel.verification_expiry)) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        });
      }
      
      // Check if code matches
      if (channel.verification_token !== verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }
      
      // Mark as verified
      const updateQuery = `
        UPDATE notification_user_channel
        SET
          is_verified = true,
          verification_token = NULL,
          verification_expiry = NULL,
          last_modified_date = NOW(),
          last_modified_by = $2
        WHERE
          id = $1
        RETURNING
          id,
          user_id as "userId",
          channel_type as "channelType",
          channel_value as "channelValue",
          is_verified as "isVerified",
          is_primary as "isPrimary",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
      `;
      
      const result = await pool.query(updateQuery, [channelId, userId]);
      
      res.json({
        success: true,
        message: 'Channel verified successfully',
        channel: result.rows[0]
      });
    } catch (error) {
      logger.error('Error verifying notification channel', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Delete a notification channel
   */
  async deleteNotificationChannel(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { channelId } = req.body.input;
      
      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: 'Channel ID is required'
        });
      }
      
      // Check if channel exists and belongs to user
      const checkQuery = `
        SELECT id, is_primary, channel_type
        FROM notification_user_channel
        WHERE
          id = $1 AND
          user_id = $2
      `;
      
      const checkResult = await pool.query(checkQuery, [channelId, userId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Channel not found or does not belong to this user'
        });
      }
      
      const { is_primary, channel_type } = checkResult.rows[0];
      
      // Delete the channel
      const deleteQuery = `
        DELETE FROM notification_user_channel
        WHERE id = $1
        RETURNING
          id,
          channel_type as "channelType",
          channel_value as "channelValue"
      `;
      
      const result = await pool.query(deleteQuery, [channelId]);
      
      // If this was a primary channel, set another channel as primary
      if (is_primary) {
        const findNewPrimaryQuery = `
          SELECT id
          FROM notification_user_channel
          WHERE
            user_id = $1 AND
            channel_type = $2 AND
            is_verified = true
          ORDER BY
            created_date ASC
          LIMIT 1
        `;
        
        const newPrimaryResult = await pool.query(findNewPrimaryQuery, [userId, channel_type]);
        
        if (newPrimaryResult.rows.length > 0) {
          const newPrimaryId = newPrimaryResult.rows[0].id;
          
          const updateNewPrimaryQuery = `
            UPDATE notification_user_channel
            SET
              is_primary = true,
              last_modified_date = NOW(),
              last_modified_by = $2
            WHERE
              id = $1
          `;
          
          await pool.query(updateNewPrimaryQuery, [newPrimaryId, userId]);
        }
      }
      
      res.json({
        success: true,
        message: 'Notification channel deleted successfully',
        deleted: result.rows[0]
      });
    } catch (error) {
      logger.error('Error deleting notification channel', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Get notification topics
   */
  async getNotificationTopics(req: Request, res: Response) {
    try {
      const { includePrivate } = req.body.input || {};
      const isAdmin = req.user?.role === 'admin';
      
      // Build query conditions
      let whereClause = '';
      
      if (!includePrivate || !isAdmin) {
        whereClause = 'WHERE is_public = true';
      }
      
      // Get topics
      const query = `
        SELECT
          id,
          name,
          description,
          is_public as "isPublic",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
        FROM
          notification_topic
        ${whereClause}
        ORDER BY
          name
      `;
      
      const result = await pool.query(query);
      
      res.json({
        topics: result.rows
      });
    } catch (error) {
      logger.error('Error getting notification topics', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Get user topic subscriptions
   */
  async getUserSubscriptions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      // Get user subscriptions with topic details
      const query = `
        SELECT
          s.id,
          s.user_id as "userId",
          s.topic_id as "topicId",
          s.is_active as "isActive",
          s.created_date as "createdDate",
          t.name as "topicName",
          t.description as "topicDescription"
        FROM
          notification_subscription s
        JOIN
          notification_topic t ON s.topic_id = t.id
        WHERE
          s.user_id = $1
        ORDER BY
          t.name
      `;
      
      const result = await pool.query(query, [userId]);
      
      res.json({
        subscriptions: result.rows
      });
    } catch (error) {
      logger.error('Error getting user subscriptions', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Subscribe to a notification topic
   */
  async subscribeToTopic(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { topicName } = req.body.input;
      
      if (!topicName) {
        return res.status(400).json({
          success: false,
          message: 'Topic name is required'
        });
      }
      
      // Get topic ID
      const topicQuery = `
        SELECT id, is_public
        FROM notification_topic
        WHERE name = $1
      `;
      
      const topicResult = await pool.query(topicQuery, [topicName]);
      
      if (topicResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Topic "${topicName}" not found`
        });
      }
      
      const topic = topicResult.rows[0];
      
      // Check if topic is public or user is admin
      if (!topic.is_public && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to subscribe to this topic'
        });
      }
      
      // Check if already subscribed
      const checkQuery = `
        SELECT id, is_active
        FROM notification_subscription
        WHERE
          user_id = $1 AND
          topic_id = $2
      `;
      
      const checkResult = await pool.query(checkQuery, [userId, topic.id]);
      
      if (checkResult.rows.length > 0) {
        // Subscription exists - update if inactive
        if (checkResult.rows[0].is_active) {
          return res.status(409).json({
            success: false,
            message: 'You are already subscribed to this topic',
            subscriptionId: checkResult.rows[0].id
          });
        } else {
          // Reactivate subscription
          const updateQuery = `
            UPDATE notification_subscription
            SET
              is_active = true,
              last_modified_date = NOW(),
              last_modified_by = $2
            WHERE
              id = $1
            RETURNING
              id,
              user_id as "userId",
              topic_id as "topicId",
              is_active as "isActive",
              created_date as "createdDate",
              last_modified_date as "lastModifiedDate"
          `;
          
          const updateResult = await pool.query(updateQuery, [
            checkResult.rows[0].id,
            userId
          ]);
          
          res.json({
            success: true,
            message: 'Subscription reactivated successfully',
            subscription: updateResult.rows[0]
          });
        }
      } else {
        // Create new subscription
        const insertQuery = `
          INSERT INTO notification_subscription (
            id,
            user_id,
            topic_id,
            is_active,
            created_date,
            created_by
          ) VALUES (
            $1, $2, $3, true, NOW(), $4
          )
          RETURNING
            id,
            user_id as "userId",
            topic_id as "topicId",
            is_active as "isActive",
            created_date as "createdDate"
        `;
        
        const insertResult = await pool.query(insertQuery, [
          uuidv4(),
          userId,
          topic.id,
          userId
        ]);
        
        res.json({
          success: true,
          message: 'Subscribed to topic successfully',
          subscription: insertResult.rows[0]
        });
      }
    } catch (error) {
      logger.error('Error subscribing to topic', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Unsubscribe from a notification topic
   */
  async unsubscribeFromTopic(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { topicName } = req.body.input;
      
      if (!topicName) {
        return res.status(400).json({
          success: false,
          message: 'Topic name is required'
        });
      }
      
      // Get topic ID
      const topicQuery = `
        SELECT id
        FROM notification_topic
        WHERE name = $1
      `;
      
      const topicResult = await pool.query(topicQuery, [topicName]);
      
      if (topicResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Topic "${topicName}" not found`
        });
      }
      
      const topicId = topicResult.rows[0].id;
      
      // Check if subscribed
      const checkQuery = `
        SELECT id, is_active
        FROM notification_subscription
        WHERE
          user_id = $1 AND
          topic_id = $2
      `;
      
      const checkResult = await pool.query(checkQuery, [userId, topicId]);
      
      if (checkResult.rows.length === 0 || !checkResult.rows[0].is_active) {
        return res.status(404).json({
          success: false,
          message: 'You are not subscribed to this topic'
        });
      }
      
      // Update subscription
      const updateQuery = `
        UPDATE notification_subscription
        SET
          is_active = false,
          last_modified_date = NOW(),
          last_modified_by = $2
        WHERE
          id = $1
        RETURNING
          id,
          user_id as "userId",
          topic_id as "topicId",
          is_active as "isActive",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
      `;
      
      const updateResult = await pool.query(updateQuery, [
        checkResult.rows[0].id,
        userId
      ]);
      
      res.json({
        success: true,
        message: 'Unsubscribed from topic successfully',
        subscription: updateResult.rows[0]
      });
    } catch (error) {
      logger.error('Error unsubscribing from topic', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Create a notification topic (admin only)
   */
  async createNotificationTopic(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can create notification topics'
        });
      }
      
      const {
        name,
        description,
        isPublic = true
      } = req.body.input;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Topic name is required'
        });
      }
      
      // Check if topic already exists
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM notification_topic
        WHERE name = $1
      `;
      
      const checkResult = await pool.query(checkQuery, [name]);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        return res.status(409).json({
          success: false,
          message: `Topic "${name}" already exists`
        });
      }
      
      // Create topic
      const insertQuery = `
        INSERT INTO notification_topic (
          id,
          name,
          description,
          is_public,
          created_date,
          created_by
        ) VALUES (
          $1, $2, $3, $4, NOW(), $5
        )
        RETURNING
          id,
          name,
          description,
          is_public as "isPublic",
          created_date as "createdDate"
      `;
      
      const insertResult = await pool.query(insertQuery, [
        uuidv4(),
        name,
        description,
        isPublic,
        userId
      ]);
      
      res.json({
        success: true,
        message: 'Notification topic created successfully',
        topic: insertResult.rows[0]
      });
    } catch (error) {
      logger.error('Error creating notification topic', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Update a notification topic (admin only)
   */
  async updateNotificationTopic(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can update notification topics'
        });
      }
      
      const {
        id,
        description,
        isPublic
      } = req.body.input;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Topic ID is required'
        });
      }
      
      // Build update fields
      const updates = [];
      const params = [id];
      let paramIndex = 1;
      
      if (description !== undefined) {
        paramIndex++;
        updates.push(`description = $${paramIndex}`);
        params.push(description);
      }
      
      if (isPublic !== undefined) {
        paramIndex++;
        updates.push(`is_public = $${paramIndex}`);
        params.push(isPublic);
      }
      
      // Add last modified information
      paramIndex++;
      updates.push(`last_modified_date = NOW()`);
      updates.push(`last_modified_by = $${paramIndex}`);
      params.push(userId);
      
      if (updates.length <= 2) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      // Update topic
      const updateQuery = `
        UPDATE notification_topic
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING
          id,
          name,
          description,
          is_public as "isPublic",
          created_date as "createdDate",
          last_modified_date as "lastModifiedDate"
      `;
      
      const updateResult = await pool.query(updateQuery, params);
      
      if (updateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Notification topic updated successfully',
        topic: updateResult.rows[0]
      });
    } catch (error) {
      logger.error('Error updating notification topic', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  },
  
  /**
   * Broadcast a notification to all users subscribed to a topic (admin only)
   */
  async broadcastNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can broadcast notifications'
        });
      }
      
      const {
        topicName,
        subject,
        message,
        data,
        module,
        priority = 'medium'
      } = req.body.input;
      
      if (!topicName || !subject || !message || !module) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing: topicName, subject, message, and module are required'
        });
      }
      
      // Get topic ID
      const topicQuery = `
        SELECT id
        FROM notification_topic
        WHERE name = $1
      `;
      
      const topicResult = await pool.query(topicQuery, [topicName]);
      
      if (topicResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Topic "${topicName}" not found`
        });
      }
      
      const topicId = topicResult.rows[0].id;
      
      // Get all active subscribers
      const subscribersQuery = `
        SELECT user_id
        FROM notification_subscription
        WHERE
          topic_id = $1 AND
          is_active = true
      `;
      
      const subscribersResult = await pool.query(subscribersQuery, [topicId]);
      
      if (subscribersResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active subscribers for this topic'
        });
      }
      
      // Create notifications for each subscriber
      const results = {
        total: subscribersResult.rows.length,
        successCount: 0,
        failCount: 0,
        notificationIds: []
      };
      
      for (const subscriber of subscribersResult.rows) {
        try {
          // Create notification
          const notificationId = uuidv4();
          
          const insertQuery = `
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
              created_date,
              created_by
            ) VALUES (
              $1, $2, 'staff', 'in_app', $3, $4, $5, $6::notification_priority, 'pending', $7, NOW(), $8
            )
            RETURNING id
          `;
          
          await pool.query(insertQuery, [
            notificationId,
            subscriber.user_id,
            subject,
            message,
            JSON.stringify({ ...data, topic: topicName }),
            priority,
            module,
            userId
          ]);
          
          results.successCount++;
          results.notificationIds.push(notificationId);
        } catch (notificationError) {
          logger.error('Error creating broadcast notification for user', {
            error: notificationError,
            userId: subscriber.user_id
          });
          results.failCount++;
        }
      }
      
      // Notify WebSocket server for real-time delivery
      try {
        const wsServerUrl = process.env.NOTIFICATION_WS_URL || 'http://localhost:4001';
        await axios.post(`${wsServerUrl}/broadcast`, {
          topicName,
          subject,
          message,
          data,
          module,
          priority
        });
      } catch (wsError) {
        logger.warn('Failed to notify WebSocket server about broadcast', { wsError, topicName });
        // Continue anyway - notifications are saved in the database
      }
      
      res.json({
        success: true,
        message: `Broadcast notification sent to ${results.successCount} subscribers (${results.failCount} failed)`,
        results
      });
    } catch (error) {
      logger.error('Error broadcasting notification', { error });
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  }
};

export default notificationHandlers;