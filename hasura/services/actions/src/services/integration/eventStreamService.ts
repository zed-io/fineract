/**
 * Event Stream Service for Fineract
 * Provides functionality for real-time event streaming integrations
 */

import { query, transaction } from '../../utils/db';
import { logger } from '../../utils/logger';
import { 
  EventStreamConfig, 
  StreamType,
  EventProducerRegistrationRequest,
  EventProducerRegistrationResponse,
  EventConsumerRegistrationRequest,
  EventConsumerRegistrationResponse,
  EventPublishRequest,
  EventPublishResponse,
  EventStreamListResponse,
  KafkaConfig,
  RabbitMQConfig,
  AWSSQSConfig,
  AzureServiceBusConfig,
  GooglePubSubConfig
} from '../../models/integration/eventStream';
import { WebhookEventType, WebhookEvent } from '../../models/integration/webhook';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

/**
 * Event Stream Service - provides functionality for managing event streams and publishing events
 */
export class EventStreamService {
  
  /**
   * Register a new event producer
   * @param request Producer registration details
   * @param userId Optional user ID of the creator
   * @returns Registration response with producer ID
   */
  async registerProducer(
    request: EventProducerRegistrationRequest, 
    userId?: string
  ): Promise<EventProducerRegistrationResponse> {
    logger.info('Registering event producer', { name: request.name, streamType: request.streamType });
    
    try {
      // Validate the stream configuration based on type
      this.validateStreamConfig(request.streamType, request.config);
      
      // Insert the event stream configuration
      const result = await query(
        `INSERT INTO integration_event_stream 
         (id, name, description, event_types, stream_type, config, filter_criteria, is_active, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id, name, event_types, stream_type, is_active, created_date`,
        [
          uuidv4(),
          request.name,
          request.description || null,
          request.eventTypes,
          request.streamType,
          JSON.stringify(request.config),
          request.filterCriteria ? JSON.stringify(request.filterCriteria) : null,
          true,
          userId || null
        ]
      );
      
      const stream = result.rows[0];
      
      return {
        id: stream.id,
        name: stream.name,
        eventTypes: stream.event_types,
        streamType: stream.stream_type as StreamType,
        isActive: stream.is_active,
        createdDate: stream.created_date
      };
      
    } catch (error) {
      logger.error('Error registering event producer', { error, request });
      throw error;
    }
  }
  
  /**
   * Register a new event consumer
   * @param request Consumer registration details
   * @param userId Optional user ID of the creator
   * @returns Registration response with consumer ID
   */
  async registerConsumer(
    request: EventConsumerRegistrationRequest, 
    userId?: string
  ): Promise<EventConsumerRegistrationResponse> {
    logger.info('Registering event consumer', { name: request.name, streamType: request.streamType });
    
    try {
      // Validate the stream configuration based on type
      this.validateStreamConfig(request.streamType, request.config);
      
      // For webhook streams, ensure callback URL is provided
      if (request.streamType === StreamType.WEBHOOK && !request.callbackUrl) {
        throw new Error('Callback URL is required for webhook stream consumers');
      }
      
      // Build the configuration object with callback URL if provided
      const config = request.callbackUrl 
        ? { ...request.config, callbackUrl: request.callbackUrl }
        : request.config;
      
      // Insert the event stream configuration
      const result = await query(
        `INSERT INTO integration_event_stream 
         (id, name, description, event_types, stream_type, config, filter_criteria, is_active, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id, name, event_types, stream_type, is_active, created_date`,
        [
          uuidv4(),
          request.name,
          request.description || null,
          request.eventTypes,
          request.streamType,
          JSON.stringify(config),
          request.filterCriteria ? JSON.stringify(request.filterCriteria) : null,
          true,
          userId || null
        ]
      );
      
      const stream = result.rows[0];
      
      return {
        id: stream.id,
        name: stream.name,
        eventTypes: stream.event_types,
        streamType: stream.stream_type as StreamType,
        isActive: stream.is_active,
        createdDate: stream.created_date
      };
      
    } catch (error) {
      logger.error('Error registering event consumer', { error, request });
      throw error;
    }
  }
  
  /**
   * Update an existing event stream
   * @param streamId ID of the stream to update
   * @param updates Stream properties to update
   * @param userId Optional user ID making the update
   * @returns Updated stream configuration
   */
  async updateStream(
    streamId: string, 
    updates: Partial<EventStreamConfig>,
    userId?: string
  ): Promise<EventStreamConfig> {
    logger.info('Updating event stream', { streamId, updates });
    
    try {
      // Validate updates
      if (updates.streamType && updates.config) {
        this.validateStreamConfig(updates.streamType, updates.config);
      } else if (updates.streamType) {
        throw new Error('Config must be provided when updating stream type');
      }
      
      // Build the update query dynamically based on provided fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;
      
      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCounter++}`);
        values.push(updates.name);
      }
      
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCounter++}`);
        values.push(updates.description);
      }
      
      if (updates.eventTypes !== undefined) {
        updateFields.push(`event_types = $${paramCounter++}`);
        values.push(updates.eventTypes);
      }
      
      if (updates.streamType !== undefined) {
        updateFields.push(`stream_type = $${paramCounter++}`);
        values.push(updates.streamType);
      }
      
      if (updates.config !== undefined) {
        updateFields.push(`config = $${paramCounter++}`);
        values.push(JSON.stringify(updates.config));
      }
      
      if (updates.filterCriteria !== undefined) {
        updateFields.push(`filter_criteria = $${paramCounter++}`);
        values.push(updates.filterCriteria ? JSON.stringify(updates.filterCriteria) : null);
      }
      
      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCounter++}`);
        values.push(updates.isActive);
      }
      
      updateFields.push(`updated_by = $${paramCounter++}`);
      values.push(userId || null);
      
      // Add the stream ID to values array
      values.push(streamId);
      
      const updateQuery = `
        UPDATE integration_event_stream 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCounter} 
        RETURNING id, name, description, event_types, stream_type, config, filter_criteria, is_active, 
                 created_by, created_date, updated_by, updated_date
      `;
      
      const result = await query(updateQuery, values);
      
      if (result.rowCount === 0) {
        throw new Error(`Event stream with ID ${streamId} not found`);
      }
      
      const stream = result.rows[0];
      
      return {
        id: stream.id,
        name: stream.name,
        description: stream.description,
        eventTypes: stream.event_types,
        streamType: stream.stream_type as StreamType,
        config: stream.config,
        filterCriteria: stream.filter_criteria,
        isActive: stream.is_active,
        createdBy: stream.created_by,
        createdDate: stream.created_date,
        updatedBy: stream.updated_by,
        updatedDate: stream.updated_date
      };
      
    } catch (error) {
      logger.error('Error updating event stream', { error, streamId, updates });
      throw error;
    }
  }
  
  /**
   * Get all event streams with optional filtering
   * @param eventType Optional filter by event type
   * @param streamType Optional filter by stream type
   * @param isActive Optional filter by active status
   * @param limit Maximum number of records to return
   * @param offset Pagination offset
   * @returns List of event streams
   */
  async getStreams(
    eventType?: string,
    streamType?: StreamType,
    isActive?: boolean,
    limit: number = 100,
    offset: number = 0
  ): Promise<EventStreamListResponse> {
    logger.info('Getting event streams', { eventType, streamType, isActive, limit, offset });
    
    try {
      const whereConditions: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;
      
      if (eventType !== undefined) {
        whereConditions.push(`$${paramCounter} = ANY(event_types)`);
        values.push(eventType);
        paramCounter++;
      }
      
      if (streamType !== undefined) {
        whereConditions.push(`stream_type = $${paramCounter}`);
        values.push(streamType);
        paramCounter++;
      }
      
      if (isActive !== undefined) {
        whereConditions.push(`is_active = $${paramCounter}`);
        values.push(isActive);
        paramCounter++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // First, get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM integration_event_stream 
        ${whereClause}
      `;
      
      const countResult = await query(countQuery, values);
      const total = parseInt(countResult.rows[0].total, 10);
      
      // Then get the streams with pagination
      const streamsQuery = `
        SELECT id, name, description, event_types, stream_type, config, 
               filter_criteria, is_active, created_by, created_date, 
               updated_by, updated_date
        FROM integration_event_stream 
        ${whereClause}
        ORDER BY created_date DESC
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;
      
      values.push(limit, offset);
      
      const streamsResult = await query(streamsQuery, values);
      
      const streams = streamsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        eventTypes: row.event_types,
        streamType: row.stream_type as StreamType,
        config: row.config,
        filterCriteria: row.filter_criteria,
        isActive: row.is_active,
        createdBy: row.created_by,
        createdDate: row.created_date,
        updatedBy: row.updated_by,
        updatedDate: row.updated_date
      }));
      
      return {
        streams,
        total
      };
      
    } catch (error) {
      logger.error('Error getting event streams', { error, eventType, streamType, isActive });
      throw error;
    }
  }
  
  /**
   * Get a specific event stream by ID
   * @param streamId The ID of the stream to retrieve
   * @returns Stream configuration or null if not found
   */
  async getStreamById(streamId: string): Promise<EventStreamConfig | null> {
    logger.info('Getting event stream by ID', { streamId });
    
    try {
      const result = await query(
        `SELECT id, name, description, event_types, stream_type, config, 
                filter_criteria, is_active, created_by, created_date, 
                updated_by, updated_date
         FROM integration_event_stream 
         WHERE id = $1`,
        [streamId]
      );
      
      if (result.rowCount === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        eventTypes: row.event_types,
        streamType: row.stream_type as StreamType,
        config: row.config,
        filterCriteria: row.filter_criteria,
        isActive: row.is_active,
        createdBy: row.created_by,
        createdDate: row.created_date,
        updatedBy: row.updated_by,
        updatedDate: row.updated_date
      };
      
    } catch (error) {
      logger.error('Error getting event stream by ID', { error, streamId });
      throw error;
    }
  }
  
  /**
   * Delete an event stream
   * @param streamId ID of the stream to delete
   * @returns True if successful, false if stream not found
   */
  async deleteStream(streamId: string): Promise<boolean> {
    logger.info('Deleting event stream', { streamId });
    
    try {
      const result = await query(
        'DELETE FROM integration_event_stream WHERE id = $1',
        [streamId]
      );
      
      return result.rowCount > 0;
      
    } catch (error) {
      logger.error('Error deleting event stream', { error, streamId });
      throw error;
    }
  }
  
  /**
   * Publish an event to applicable streams
   * @param request Event publishing request
   * @returns Result of publish operation
   */
  async publishEvent(request: EventPublishRequest): Promise<EventPublishResponse> {
    logger.info('Publishing event', { eventType: request.eventType });
    
    try {
      // Generate unique event ID
      const eventId = uuidv4();
      
      // Create event object
      const event: WebhookEvent = {
        id: eventId,
        type: request.eventType,
        timestamp: new Date(),
        data: request.eventData
      };
      
      // Find applicable streams
      let streamsQuery = `
        SELECT id, name, stream_type, config, filter_criteria
        FROM integration_event_stream
        WHERE $1 = ANY(event_types)
        AND is_active = true
      `;
      
      const params = [request.eventType];
      
      // Filter by specific stream IDs if provided
      if (request.streamIds && request.streamIds.length > 0) {
        streamsQuery += ` AND id = ANY($2)`;
        params.push(request.streamIds);
      }
      
      const streamsResult = await query(streamsQuery, params);
      
      if (streamsResult.rowCount === 0) {
        logger.info('No active streams found for event type', { eventType: request.eventType });
        return {
          success: true,
          eventId,
          publishedStreams: 0,
          failedStreams: 0,
          message: 'No active streams found for this event type'
        };
      }
      
      // Process each applicable stream
      let publishedCount = 0;
      let failedCount = 0;
      
      await Promise.all(streamsResult.rows.map(async (stream) => {
        try {
          // Apply filter criteria if specified
          if (stream.filter_criteria && !this.matchesFilterCriteria(request.eventData, stream.filter_criteria)) {
            logger.debug('Event filtered out by criteria', { 
              streamId: stream.id, 
              eventType: request.eventType,
              filterCriteria: stream.filter_criteria 
            });
            return;
          }
          
          // Process based on stream type
          const startTime = Date.now();
          let success = false;
          let errorMessage: string | undefined;
          
          try {
            success = await this.sendToStream(stream.stream_type, stream.config, event);
          } catch (error: any) {
            errorMessage = error.message;
            success = false;
          }
          
          const processingTime = Date.now() - startTime;
          
          // Record history
          await query(
            `INSERT INTO integration_event_stream_history
              (id, stream_id, event_id, event_type, event_data, status, error_message, processing_time_ms)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              stream.id,
              eventId,
              request.eventType,
              JSON.stringify(request.eventData),
              success ? 'success' : 'failed',
              errorMessage || null,
              processingTime
            ]
          );
          
          // Update counts
          if (success) {
            publishedCount++;
          } else {
            failedCount++;
          }
          
        } catch (streamError) {
          logger.error('Error processing stream for event', { 
            streamId: stream.id,
            eventType: request.eventType,
            error: streamError
          });
          failedCount++;
        }
      }));
      
      return {
        success: failedCount === 0,
        eventId,
        publishedStreams: publishedCount,
        failedStreams: failedCount,
        message: `Event published to ${publishedCount} streams with ${failedCount} failures`
      };
      
    } catch (error) {
      logger.error('Error publishing event', { error, eventType: request.eventType });
      throw error;
    }
  }
  
  /**
   * Check if an event matches the specified filter criteria
   * @param eventData Event data to evaluate
   * @param filterCriteria Criteria to match against
   * @returns True if the event matches all criteria
   */
  private matchesFilterCriteria(eventData: any, filterCriteria: any): boolean {
    // Simple implementation - could be enhanced with more complex filtering logic
    for (const [key, value] of Object.entries(filterCriteria)) {
      const keyParts = key.split('.');
      let dataValue = eventData;
      
      // Traverse nested properties
      for (const part of keyParts) {
        if (dataValue === undefined || dataValue === null) {
          return false;
        }
        dataValue = dataValue[part];
      }
      
      // Check if value matches
      if (dataValue !== value) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate stream configuration based on stream type
   * @param streamType Type of the stream
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateStreamConfig(streamType: StreamType, config: any): void {
    switch (streamType) {
      case StreamType.KAFKA:
        if (!config.bootstrapServers || !config.topic) {
          throw new Error('Kafka configuration requires bootstrapServers and topic');
        }
        break;
      
      case StreamType.RABBITMQ:
        if (!config.host || !config.port || !config.exchange || !config.routingKey) {
          throw new Error('RabbitMQ configuration requires host, port, exchange, and routingKey');
        }
        break;
      
      case StreamType.AWSSQS:
        if (!config.queueUrl || !config.region) {
          throw new Error('AWS SQS configuration requires queueUrl and region');
        }
        break;
      
      case StreamType.AZURE_SERVICEBUS:
        if ((!config.connectionString && !config.namespace) || !config.entityPath) {
          throw new Error('Azure Service Bus configuration requires connectionString or namespace, and entityPath');
        }
        break;
      
      case StreamType.GOOGLE_PUBSUB:
        if (!config.projectId || !config.topicName) {
          throw new Error('Google Pub/Sub configuration requires projectId and topicName');
        }
        break;
      
      case StreamType.WEBHOOK:
        if (!config.url) {
          throw new Error('Webhook configuration requires url');
        }
        break;
      
      case StreamType.CUSTOM:
        // Custom types should provide their own validation
        if (!config.handler) {
          throw new Error('Custom stream configuration requires a handler property');
        }
        break;
      
      default:
        throw new Error(`Unsupported stream type: ${streamType}`);
    }
  }
  
  /**
   * Send an event to the specified stream
   * @param streamType Type of stream to send to
   * @param config Stream configuration
   * @param event Event to send
   * @returns True if sent successfully
   * @throws Error if sending fails
   */
  private async sendToStream(streamType: string, config: any, event: WebhookEvent): Promise<boolean> {
    // This is a simplified implementation - in a production system,
    // these would use actual message queue client libraries
    
    switch (streamType) {
      case StreamType.KAFKA:
        logger.debug('Sending to Kafka stream', { topic: config.topic });
        // Simulated Kafka publish - would use a Kafka client in production
        return true;
      
      case StreamType.RABBITMQ:
        logger.debug('Sending to RabbitMQ stream', { exchange: config.exchange, routingKey: config.routingKey });
        // Simulated RabbitMQ publish - would use a RabbitMQ client in production
        return true;
      
      case StreamType.AWSSQS:
        logger.debug('Sending to AWS SQS stream', { queueUrl: config.queueUrl });
        // Simulated AWS SQS publish - would use AWS SDK in production
        return true;
      
      case StreamType.AZURE_SERVICEBUS:
        logger.debug('Sending to Azure Service Bus stream', { entityPath: config.entityPath });
        // Simulated Azure Service Bus publish - would use Azure SDK in production
        return true;
      
      case StreamType.GOOGLE_PUBSUB:
        logger.debug('Sending to Google Pub/Sub stream', { topic: config.topicName });
        // Simulated Google Pub/Sub publish - would use Google Cloud SDK in production
        return true;
      
      case StreamType.WEBHOOK:
        logger.debug('Sending to webhook endpoint', { url: config.url });
        try {
          // For webhooks, we can actually make the HTTP request
          const response = await axios.post(config.url, event, {
            headers: config.headers || { 'Content-Type': 'application/json' },
            timeout: (config.timeout || 30) * 1000
          });
          
          return response.status >= 200 && response.status < 300;
        } catch (error) {
          logger.error('Error sending to webhook', { error, url: config.url });
          throw error;
        }
      
      case StreamType.CUSTOM:
        logger.debug('Using custom stream handler', { handler: config.handler });
        // Custom handlers would be registered with the application
        return true;
      
      default:
        throw new Error(`Unsupported stream type: ${streamType}`);
    }
  }
}

// Export singleton instance
export const eventStreamService = new EventStreamService();