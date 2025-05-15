/**
 * Enhanced Notification Service for Fineract
 * Provides comprehensive notification capabilities across multiple channels
 */

import axios from 'axios';
import { pool } from '../utils/db';
import { logger } from '../utils/logger';
import { 
  NotificationType, 
  NotificationPriority,
  NotificationStatus,
  NotificationRequest,
  NotificationChannel
} from '../models/notification';

/**
 * Notification service class for managing and sending notifications
 */
export class NotificationService {
  private emailProvider: EmailProvider;
  private smsProvider: SmsProvider;
  private pushProvider: PushProvider;
  private websocketUrl: string;
  
  constructor() {
    // Initialize providers based on environment configuration
    this.emailProvider = new EmailProvider();
    this.smsProvider = new SmsProvider();
    this.pushProvider = new PushProvider();
    this.websocketUrl = process.env.NOTIFICATION_WS_URL || 'http://localhost:4001';
  }
  
  /**
   * Send a notification using the appropriate channel
   * @param request Notification request object
   * @returns Result of the notification operation
   */
  async sendNotification(request: NotificationRequest): Promise<{ 
    success: boolean; 
    id?: string; 
    message?: string;
  }> {
    try {
      logger.info('Sending notification', { 
        recipientId: request.recipientId, 
        type: request.notificationType, 
        template: request.templateCode
      });
      
      // Call the database function to create the notification
      const query = `
        SELECT send_notification(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) as notification_id
      `;
      
      const result = await pool.query(query, [
        request.recipientId,
        request.recipientType,
        request.notificationType,
        request.templateCode,
        JSON.stringify(request.data || {}),
        request.module,
        request.entityType || null,
        request.entityId || null,
        request.priority || 'medium',
        request.scheduledDate || null,
        null // No user ID for system-initiated notifications
      ]);
      
      const notificationId = result.rows[0].notification_id;
      
      // For synchronous notification types, send immediately
      if (
        request.notificationType === NotificationType.EMAIL || 
        request.notificationType === NotificationType.SMS ||
        request.notificationType === NotificationType.PUSH
      ) {
        // Get notification details
        const notificationQuery = `
          SELECT 
            id, notification_type, recipient_email, recipient_phone, 
            subject, message, data
          FROM notification
          WHERE id = $1
        `;
        
        const notificationResult = await pool.query(notificationQuery, [notificationId]);
        
        if (notificationResult.rows.length === 0) {
          throw new Error('Notification record not found');
        }
        
        const notification = notificationResult.rows[0];
        
        // Send based on type
        let success = false;
        let errorMessage = '';
        
        switch (notification.notification_type) {
          case NotificationType.EMAIL:
            if (!notification.recipient_email) {
              throw new Error('Recipient email not provided for email notification');
            }
            const emailResult = await this.emailProvider.send(
              notification.recipient_email,
              notification.subject,
              notification.message,
              notification.data
            );
            success = emailResult.success;
            errorMessage = emailResult.message || '';
            break;
            
          case NotificationType.SMS:
            if (!notification.recipient_phone) {
              throw new Error('Recipient phone not provided for SMS notification');
            }
            const smsResult = await this.smsProvider.send(
              notification.recipient_phone,
              notification.message
            );
            success = smsResult.success;
            errorMessage = smsResult.message || '';
            break;
            
          case NotificationType.PUSH:
            const pushResult = await this.pushProvider.send(
              request.recipientId,
              notification.subject,
              notification.message,
              notification.data
            );
            success = pushResult.success;
            errorMessage = pushResult.message || '';
            break;
        }
        
        // Update notification status
        const updateQuery = `
          UPDATE notification
          SET 
            status = $2, 
            error_message = $3,
            sent_date = CASE WHEN $2 = 'sent' THEN NOW() ELSE NULL END,
            last_modified_date = NOW()
          WHERE id = $1
        `;
        
        await pool.query(updateQuery, [
          notificationId,
          success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          errorMessage || null
        ]);
      }
      
      // For real-time notification types, notify WebSocket server
      if (
        request.notificationType === NotificationType.IN_APP ||
        request.notificationType === NotificationType.WEBSOCKET
      ) {
        try {
          // Get notification details
          const notificationQuery = `
            SELECT 
              id, recipient_id, subject, message, data, priority, module, 
              entity_type, entity_id
            FROM notification
            WHERE id = $1
          `;
          
          const notificationResult = await pool.query(notificationQuery, [notificationId]);
          
          if (notificationResult.rows.length > 0) {
            const notification = notificationResult.rows[0];
            
            // Post to WebSocket server
            await axios.post(`${this.websocketUrl}/push-notification`, {
              id: notification.id,
              recipientId: notification.recipient_id,
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
          logger.warn('Failed to notify WebSocket server', { error: wsError });
          // Continue anyway - notification is saved in database
        }
      }
      
      return {
        success: true,
        id: notificationId
      };
    } catch (error) {
      logger.error('Error sending notification', { error, request });
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Queue a notification for future delivery
   * @param request Notification request with scheduled date
   * @returns Result of the scheduling operation
   */
  async scheduleNotification(request: NotificationRequest): Promise<{
    success: boolean;
    id?: string;
    message?: string;
    scheduledDate?: Date;
  }> {
    try {
      if (!request.scheduledDate) {
        throw new Error('Scheduled date is required');
      }
      
      // Validate that scheduled date is in the future
      const scheduledDate = new Date(request.scheduledDate);
      if (scheduledDate <= new Date()) {
        throw new Error('Scheduled date must be in the future');
      }
      
      logger.info('Scheduling notification', { 
        recipientId: request.recipientId, 
        type: request.notificationType, 
        template: request.templateCode,
        scheduledDate: scheduledDate
      });
      
      // Call database function to schedule the notification
      const query = `
        SELECT send_notification(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) as notification_id
      `;
      
      const result = await pool.query(query, [
        request.recipientId,
        request.recipientType,
        request.notificationType,
        request.templateCode,
        JSON.stringify(request.data || {}),
        request.module,
        request.entityType || null,
        request.entityId || null,
        request.priority || 'medium',
        scheduledDate,
        null // No user ID for system-initiated notifications
      ]);
      
      const notificationId = result.rows[0].notification_id;
      
      return {
        success: true,
        id: notificationId,
        scheduledDate
      };
    } catch (error) {
      logger.error('Error scheduling notification', { error, request });
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Send verification code to a communication channel
   * @param channelType Channel type (email, sms, push)
   * @param channelValue Channel address (email address, phone number, etc.)
   * @param verificationCode Verification code to send
   * @returns Success status and message
   */
  async sendVerificationCode(
    channelType: NotificationChannel,
    channelValue: string,
    verificationCode: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      switch (channelType) {
        case 'email':
          // Send email verification
          return await this.emailProvider.sendVerification(
            channelValue,
            'Verify your email address',
            `Your verification code is: ${verificationCode}\n\nThis code will expire in 24 hours.`
          );
          
        case 'sms':
          // Send SMS verification
          return await this.smsProvider.send(
            channelValue,
            `Your verification code is: ${verificationCode}. This code will expire in 24 hours.`
          );
          
        case 'push':
          // Not typically used for verification, but implemented for completeness
          return await this.pushProvider.send(
            'verification',
            'Verify your device',
            `Your verification code is: ${verificationCode}`,
            { code: verificationCode }
          );
          
        default:
          throw new Error(`Unsupported channel type: ${channelType}`);
      }
    } catch (error) {
      logger.error('Error sending verification code', { error, channelType, channelValue });
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Mark a notification as read
   * @param notificationId ID of notification to mark as read
   * @param userId ID of user marking the notification as read
   * @returns Success status
   */
  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const query = `
        SELECT mark_notification_read($1, $2) as success
      `;
      
      const result = await pool.query(query, [notificationId, userId]);
      const success = result.rows[0].success;
      
      if (!success) {
        return {
          success: false,
          message: 'Notification not found or not owned by this user'
        };
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId, userId });
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Mark all notifications as read for a user
   * @param userId ID of user marking notifications as read
   * @param filters Optional filters (module, entity type, entity ID)
   * @returns Number of notifications marked as read
   */
  async markAllAsRead(
    userId: string,
    filters?: { module?: string; entityType?: string; entityId?: string }
  ): Promise<{ success: boolean; count: number; message?: string }> {
    try {
      const query = `
        SELECT mark_all_notifications_read($1, $2, $3, $4) as count
      `;
      
      const result = await pool.query(query, [
        userId,
        filters?.module || null,
        filters?.entityType || null,
        filters?.entityId || null
      ]);
      
      const count = result.rows[0].count;
      
      return { 
        success: true,
        count
      };
    } catch (error) {
      logger.error('Error marking all notifications as read', { error, userId, filters });
      return {
        success: false,
        count: 0,
        message: error.message
      };
    }
  }
  
  /**
   * Broadcast a notification to all users subscribed to a topic
   * @param topicName Name of the topic to broadcast to
   * @param subject Notification subject
   * @param message Notification message
   * @param data Additional data for the notification
   * @param module Module the notification belongs to
   * @param priority Notification priority
   * @param userId ID of user initiating the broadcast
   * @returns Broadcast results
   */
  async broadcastToTopic(
    topicName: string,
    subject: string,
    message: string,
    data: Record<string, any>,
    module: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    userId?: string
  ): Promise<{ 
    success: boolean; 
    message?: string;
    count?: number;
    failCount?: number;
  }> {
    try {
      // Get topic ID
      const topicQuery = `
        SELECT id
        FROM notification_topic
        WHERE name = $1
      `;
      
      const topicResult = await pool.query(topicQuery, [topicName]);
      
      if (topicResult.rows.length === 0) {
        return {
          success: false,
          message: `Topic "${topicName}" not found`
        };
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
        return {
          success: false,
          message: 'No active subscribers for this topic'
        };
      }
      
      // Create notifications for each subscriber
      let successCount = 0;
      let failCount = 0;
      
      for (const subscriber of subscribersResult.rows) {
        try {
          // Create notification record
          const notificationQuery = `
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
              uuid_generate_v4(), $1, 'staff', 'in_app', $2, $3, $4, $5::notification_priority, 'pending', $6, NOW(), $7
            )
            RETURNING id
          `;
          
          await pool.query(notificationQuery, [
            subscriber.user_id,
            subject,
            message,
            JSON.stringify({ ...data, topic: topicName }),
            priority,
            module,
            userId || null
          ]);
          
          successCount++;
        } catch (notificationError) {
          logger.error('Error creating broadcast notification for user', { 
            error: notificationError, 
            userId: subscriber.user_id 
          });
          failCount++;
        }
      }
      
      // Notify WebSocket server for real-time delivery
      try {
        await axios.post(`${this.websocketUrl}/broadcast`, {
          topicName,
          subject,
          message,
          data: { ...data, topic: topicName },
          module,
          priority
        });
      } catch (wsError) {
        logger.warn('Failed to notify WebSocket server about broadcast', { error: wsError, topicName });
      }
      
      return {
        success: true,
        message: `Broadcast sent to ${successCount} subscribers (${failCount} failed)`,
        count: successCount,
        failCount
      };
    } catch (error) {
      logger.error('Error broadcasting to topic', { error, topicName });
      return {
        success: false,
        message: error.message
      };
    }
  }
}

/**
 * Email provider implementation
 */
class EmailProvider {
  async send(
    to: string,
    subject: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      // In a real implementation, this would use a service like SendGrid, AWS SES, etc.
      logger.info('Sending email', { to, subject });
      
      // Simulate successful sending
      return {
        success: true,
        id: `email-${Date.now()}`,
        message: 'Email sent successfully'
      };
    } catch (error) {
      logger.error('Failed to send email', { error, to });
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  async sendVerification(
    to: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.send(to, subject, body);
  }
}

/**
 * SMS provider implementation
 */
class SmsProvider {
  async send(
    to: string,
    message: string
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      // In a real implementation, this would use a service like Twilio, AWS SNS, etc.
      logger.info('Sending SMS', { to });
      
      // Simulate successful sending
      return {
        success: true,
        id: `sms-${Date.now()}`,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      logger.error('Failed to send SMS', { error, to });
      return {
        success: false,
        message: error.message
      };
    }
  }
}

/**
 * Push notification provider implementation
 */
class PushProvider {
  async send(
    recipient: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      // In a real implementation, this would use a service like Firebase Cloud Messaging, etc.
      logger.info('Sending push notification', { recipient, title });
      
      // Simulate successful sending
      return {
        success: true,
        id: `push-${Date.now()}`,
        message: 'Push notification sent successfully'
      };
    } catch (error) {
      logger.error('Failed to send push notification', { error, recipient });
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();