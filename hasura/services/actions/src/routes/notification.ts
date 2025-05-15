/**
 * Notification API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { notificationHandlers } from '../handlers/notification';

export const notificationRoutes = Router();

// Notification routes
notificationRoutes.post('/send', notificationHandlers.sendNotification);
notificationRoutes.post('/schedule', notificationHandlers.scheduleNotification);
notificationRoutes.post('/batch', notificationHandlers.sendBatchNotifications);
notificationRoutes.post('/templates', notificationHandlers.getNotificationTemplates);