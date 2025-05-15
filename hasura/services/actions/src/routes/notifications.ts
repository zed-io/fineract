/**
 * Enhanced Notification API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { authMiddleware } from '../utils/authMiddleware';
import { notificationHandlers } from '../handlers/notifications';

export const notificationRoutes = Router();

// Apply authentication middleware
notificationRoutes.use(authMiddleware);

// User notification endpoints
notificationRoutes.post('/send', notificationHandlers.sendNotification);
notificationRoutes.post('/schedule', notificationHandlers.scheduleNotification);
notificationRoutes.post('/batch', notificationHandlers.sendBatchNotifications);
notificationRoutes.post('/list', notificationHandlers.getUserNotifications);
notificationRoutes.post('/unread/count', notificationHandlers.getUnreadCount);
notificationRoutes.post('/mark-read', notificationHandlers.markAsRead);
notificationRoutes.post('/mark-all-read', notificationHandlers.markAllAsRead);

// Notification template endpoints
notificationRoutes.post('/templates', notificationHandlers.getNotificationTemplates);
notificationRoutes.post('/template/create', notificationHandlers.createNotificationTemplate);
notificationRoutes.post('/template/update', notificationHandlers.updateNotificationTemplate);

// User notification preferences
notificationRoutes.post('/preferences', notificationHandlers.getUserNotificationPreferences);
notificationRoutes.post('/preferences/update', notificationHandlers.updateNotificationPreference);

// Notification channels
notificationRoutes.post('/channels', notificationHandlers.getUserNotificationChannels);
notificationRoutes.post('/channel/add', notificationHandlers.addNotificationChannel);
notificationRoutes.post('/channel/update', notificationHandlers.updateNotificationChannel);
notificationRoutes.post('/channel/verify', notificationHandlers.verifyNotificationChannel);
notificationRoutes.post('/channel/delete', notificationHandlers.deleteNotificationChannel);

// Topic subscription management
notificationRoutes.post('/topics', notificationHandlers.getNotificationTopics);
notificationRoutes.post('/subscriptions', notificationHandlers.getUserSubscriptions);
notificationRoutes.post('/subscribe', notificationHandlers.subscribeToTopic);
notificationRoutes.post('/unsubscribe', notificationHandlers.unsubscribeFromTopic);

// Admin endpoints (protected by admin role)
notificationRoutes.post('/admin/broadcast', notificationHandlers.broadcastNotification);
notificationRoutes.post('/admin/topic/create', notificationHandlers.createNotificationTopic);
notificationRoutes.post('/admin/topic/update', notificationHandlers.updateNotificationTopic);