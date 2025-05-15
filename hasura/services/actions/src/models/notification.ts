/**
 * Notification models for Fineract
 */

// Notification type enum
export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBSOCKET = 'websocket'
}

// Notification channel aliases
export type NotificationChannel = 'email' | 'sms' | 'push';

// Notification priority enum
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Notification status enum
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// Notification request interface
export interface NotificationRequest {
  recipientId: string;
  recipientType: 'client' | 'staff' | 'group';
  recipientEmail?: string;
  recipientPhone?: string;
  notificationType: NotificationType;
  templateCode: string;
  priority: NotificationPriority;
  data: Record<string, any>;
  module: string;
  entityType?: string;
  entityId?: string;
  scheduledDate?: Date;
}

// Notification template interface
export interface NotificationTemplate {
  id: string;
  name: string;
  code: string;
  subject?: string;
  messageTemplate: string;
  applicableTypes: NotificationType[];
  module: string;
  eventType: string;
  description?: string;
  placeholders?: Record<string, any>;
  isActive: boolean;
  createdDate: Date;
  lastModifiedDate?: Date;
}

// Notification preference interface
export interface NotificationPreference {
  id: string;
  userId: string;
  notificationType: NotificationType;
  module: string;
  eventType: string;
  isEnabled: boolean;
  createdDate: Date;
  lastModifiedDate?: Date;
}

// Notification user channel interface
export interface NotificationUserChannel {
  id: string;
  userId: string;
  channelType: NotificationChannel;
  channelValue: string;
  isVerified: boolean;
  isPrimary: boolean;
  createdDate: Date;
  lastModifiedDate?: Date;
}

// Notification topic interface
export interface NotificationTopic {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdDate: Date;
  lastModifiedDate?: Date;
}

// Notification subscription interface
export interface NotificationSubscription {
  id: string;
  userId: string;
  topicId: string;
  isActive: boolean;
  createdDate: Date;
  lastModifiedDate?: Date;
}

// Notification interface
export interface Notification {
  id: string;
  recipientId: string;
  recipientType: string;
  notificationType: NotificationType;
  templateId?: string;
  subject?: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipientEmail?: string;
  recipientPhone?: string;
  externalId?: string;
  errorMessage?: string;
  module: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readDate?: Date;
  scheduledDate?: Date;
  expiryDate?: Date;
  sentDate?: Date;
  deliveryDate?: Date;
  triggeredBy?: string;
  createdDate: Date;
  lastModifiedDate?: Date;
  // Optional relations
  template?: NotificationTemplate;
}