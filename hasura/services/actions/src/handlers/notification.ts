/**
 * Notification API handlers for Fineract Hasura actions
 * Provides endpoints for sending notifications
 */

import { Request, Response } from 'express';
import { 
  notificationService, 
  NotificationRequest, 
  NotificationType, 
  NotificationTemplateType, 
  NotificationPriority 
} from '../services/notificationService';
import { logger } from '../utils/logger';

/**
 * Notification API handlers
 */
export const notificationHandlers = {
  /**
   * Send a notification
   */
  async sendNotification(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const notificationRequest = req.body.input as NotificationRequest;
      
      // Validate input
      if (!notificationRequest.recipientId) {
        throw new Error('Recipient ID is required');
      }
      
      if (!notificationRequest.notificationType) {
        throw new Error('Notification type is required');
      }
      
      if (!notificationRequest.templateType) {
        throw new Error('Template type is required');
      }
      
      if (!notificationRequest.data) {
        throw new Error('Template data is required');
      }
      
      if (notificationRequest.notificationType === NotificationType.EMAIL && !notificationRequest.recipientEmail) {
        throw new Error('Recipient email is required for email notifications');
      }
      
      if (notificationRequest.notificationType === NotificationType.SMS && !notificationRequest.recipientPhone) {
        throw new Error('Recipient phone is required for SMS notifications');
      }
      
      // Send notification
      const result = await notificationService.sendNotification(notificationRequest);
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error sending notification', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const { notification, scheduledFor } = req.body.input;
      
      // Validate input
      if (!notification) {
        throw new Error('Notification details are required');
      }
      
      if (!scheduledFor) {
        throw new Error('Scheduled date/time is required');
      }
      
      // Create a scheduled notification
      // In a real implementation, this would be stored in a database table
      // and processed by a scheduler
      
      res.json({
        id: `scheduled-${Date.now()}`,
        success: true,
        message: 'Notification scheduled successfully',
        scheduledFor: new Date(scheduledFor)
      });
    } catch (error: any) {
      logger.error('Error scheduling notification', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Send a batch of notifications
   */
  async sendBatchNotifications(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const { notifications } = req.body.input;
      
      // Validate input
      if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        throw new Error('Notifications array is required');
      }
      
      // Send notifications in batch
      const results = [];
      
      for (const notification of notifications) {
        try {
          const result = await notificationService.sendNotification(notification);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            message: error.message
          });
        }
      }
      
      res.json({
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        results
      });
    } catch (error: any) {
      logger.error('Error sending batch notifications', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get notification templates
   */
  async getNotificationTemplates(req: Request, res: Response) {
    try {
      // In a real implementation, this would load templates from database
      // For now, we'll return a list of available template types
      const templates = Object.values(NotificationTemplateType).map(templateType => ({
        id: templateType,
        name: templateType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: templateType
      }));
      
      res.json({
        templates
      });
    } catch (error: any) {
      logger.error('Error getting notification templates', { error });
      res.status(400).json({ message: error.message });
    }
  }
};