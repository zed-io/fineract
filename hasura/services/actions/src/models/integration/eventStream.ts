/**
 * Event streaming models for Fineract integration
 */

/**
 * Event stream types
 */
export enum StreamType {
  KAFKA = 'kafka',
  RABBITMQ = 'rabbitmq',
  AWSSQS = 'awssqs',
  AZURE_SERVICEBUS = 'azure_servicebus',
  GOOGLE_PUBSUB = 'google_pubsub',
  WEBHOOK = 'webhook',
  CUSTOM = 'custom'
}

/**
 * Event stream configuration
 */
export interface EventStreamConfig {
  id?: string;
  name: string;
  description?: string;
  eventTypes: string[];  // Use WebhookEventType from webhook.ts
  streamType: StreamType;
  config: any;  // Connection details specific to stream type
  filterCriteria?: any;
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Kafka stream configuration
 */
export interface KafkaConfig {
  bootstrapServers: string[];
  topic: string;
  clientId?: string;
  groupId?: string;
  keySerializer?: string;
  valueSerializer?: string;
  securityProtocol?: string;
  saslMechanism?: string;
  saslUsername?: string;
  saslPassword?: string;
  sslTruststoreLocation?: string;
  sslTruststorePassword?: string;
  sslKeystoreLocation?: string;
  sslKeystorePassword?: string;
  additionalProperties?: Record<string, string>;
}

/**
 * RabbitMQ stream configuration
 */
export interface RabbitMQConfig {
  host: string;
  port: number;
  virtualHost?: string;
  username: string;
  password: string;
  exchange: string;
  routingKey: string;
  queueName?: string;
  useSsl?: boolean;
  sslProperties?: Record<string, string>;
  additionalProperties?: Record<string, string>;
}

/**
 * AWS SQS stream configuration
 */
export interface AWSSQSConfig {
  queueUrl: string;
  region: string;
  accessKey?: string;
  secretKey?: string;
  roleArn?: string;
  fifoQueue?: boolean;
  messageGroupId?: string;
  messageDeduplicationId?: string;
  delaySeconds?: number;
  additionalProperties?: Record<string, string>;
}

/**
 * Azure Service Bus configuration
 */
export interface AzureServiceBusConfig {
  connectionString?: string;
  namespace?: string;
  entityPath: string;
  sasKeyName?: string;
  sasKey?: string;
  queueName?: string;
  topicName?: string;
  subscriptionName?: string;
  additionalProperties?: Record<string, string>;
}

/**
 * Google Pub/Sub configuration
 */
export interface GooglePubSubConfig {
  projectId: string;
  topicName: string;
  credentialsJson?: string;
  credentialsPath?: string;
  subscriptionName?: string;
  orderingKey?: string;
  additionalProperties?: Record<string, string>;
}

/**
 * Event producer registration request
 */
export interface EventProducerRegistrationRequest {
  name: string;
  description?: string;
  eventTypes: string[];
  streamType: StreamType;
  config: any;
  filterCriteria?: any;
}

/**
 * Event producer registration response
 */
export interface EventProducerRegistrationResponse {
  id: string;
  name: string;
  eventTypes: string[];
  streamType: StreamType;
  isActive: boolean;
  createdDate: Date;
}

/**
 * Event consumer registration request
 */
export interface EventConsumerRegistrationRequest {
  name: string;
  description?: string;
  eventTypes: string[];
  streamType: StreamType;
  config: any;
  filterCriteria?: any;
  callbackUrl?: string;
}

/**
 * Event consumer registration response
 */
export interface EventConsumerRegistrationResponse {
  id: string;
  name: string;
  eventTypes: string[];
  streamType: StreamType;
  isActive: boolean;
  createdDate: Date;
}

/**
 * Event publish request
 */
export interface EventPublishRequest {
  eventType: string;
  eventData: any;
  streamIds?: string[];  // Optional specific streams to publish to
}

/**
 * Event publish response
 */
export interface EventPublishResponse {
  success: boolean;
  eventId: string;
  publishedStreams: number;
  failedStreams: number;
  message?: string;
}

/**
 * Event stream list response
 */
export interface EventStreamListResponse {
  streams: EventStreamConfig[];
  total: number;
}