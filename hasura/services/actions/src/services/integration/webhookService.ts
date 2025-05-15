import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import * as handlebars from 'handlebars';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import {
  WebhookConfig,
  WebhookHistory,
  WebhookEvent,
  WebhookStatus,
  WebhookExecutionResult,
  WebhookExecutionRequest,
  WebhookRegisterRequest,
  WebhookTestRequest,
  WebhookListResponse,
  WebhookHistoryListResponse,
  WebhookHttpMethod,
  WebhookContentType
} from '../../models/integration/webhook';

/**
 * Service for managing and executing webhooks
 */
export class WebhookService {
  /**
   * Register a new webhook
   * 
   * @param webhook The webhook configuration to register
   * @param userId The ID of the user registering the webhook
   * @returns The created webhook ID
   */
  async registerWebhook(webhook: WebhookRegisterRequest, userId?: string): Promise<string> {
    logger.info('Registering webhook', { name: webhook.name, eventType: webhook.eventType });
    
    try {
      // Set default values if not provided
      const httpMethod = webhook.httpMethod || WebhookHttpMethod.POST;
      const contentType = webhook.contentType || WebhookContentType.JSON;
      const isActive = webhook.isActive !== undefined ? webhook.isActive : true;
      const retryCount = webhook.retryCount || 3;
      const retryInterval = webhook.retryInterval || 60;
      const timeout = webhook.timeout || 30;
      
      // Generate a secret key if not provided and needed for signing
      const secretKey = webhook.secretKey || crypto.randomBytes(32).toString('hex');
      
      return db.transaction(async (client) => {
        // Check if webhook with same name and event type already exists
        const existingQuery = await client.query(
          `SELECT id FROM fineract_default.integration_webhook 
           WHERE name = $1 AND event_type = $2`,
          [webhook.name, webhook.eventType]
        );
        
        if (existingQuery.rows.length > 0) {
          throw new Error(`Webhook with name '${webhook.name}' for event type '${webhook.eventType}' already exists`);
        }
        
        // Insert the webhook
        const result = await client.query(
          `INSERT INTO fineract_default.integration_webhook (
            id, name, description, event_type, url, http_method, content_type, 
            headers, payload_template, is_active, retry_count, retry_interval, 
            timeout, secret_key, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
           RETURNING id`,
          [
            uuidv4(),
            webhook.name,
            webhook.description,
            webhook.eventType,
            webhook.url,
            httpMethod,
            contentType,
            webhook.headers ? JSON.stringify(webhook.headers) : null,
            webhook.payloadTemplate,
            isActive,
            retryCount,
            retryInterval,
            timeout,
            secretKey,
            userId
          ]
        );
        
        return result.rows[0].id;
      });
    } catch (error) {
      logger.error('Error registering webhook', { error });
      throw new Error(`Failed to register webhook: ${error.message}`);
    }
  }
  
  /**
   * Update an existing webhook
   * 
   * @param webhookId The ID of the webhook to update
   * @param webhook The webhook configuration updates
   * @param userId The ID of the user updating the webhook
   * @returns Success indicator
   */
  async updateWebhook(webhookId: string, webhook: Partial<WebhookRegisterRequest>, userId?: string): Promise<boolean> {
    logger.info('Updating webhook', { webhookId });
    
    try {
      return db.transaction(async (client) => {
        // Check if webhook exists
        const existingQuery = await client.query(
          `SELECT id FROM fineract_default.integration_webhook 
           WHERE id = $1`,
          [webhookId]
        );
        
        if (existingQuery.rows.length === 0) {
          throw new Error(`Webhook with ID ${webhookId} not found`);
        }
        
        // Build update fields
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        if (webhook.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(webhook.name);
        }
        
        if (webhook.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(webhook.description);
        }
        
        if (webhook.eventType !== undefined) {
          updates.push(`event_type = $${paramIndex++}`);
          values.push(webhook.eventType);
        }
        
        if (webhook.url !== undefined) {
          updates.push(`url = $${paramIndex++}`);
          values.push(webhook.url);
        }
        
        if (webhook.httpMethod !== undefined) {
          updates.push(`http_method = $${paramIndex++}`);
          values.push(webhook.httpMethod);
        }
        
        if (webhook.contentType !== undefined) {
          updates.push(`content_type = $${paramIndex++}`);
          values.push(webhook.contentType);
        }
        
        if (webhook.headers !== undefined) {
          updates.push(`headers = $${paramIndex++}`);
          values.push(webhook.headers ? JSON.stringify(webhook.headers) : null);
        }
        
        if (webhook.payloadTemplate !== undefined) {
          updates.push(`payload_template = $${paramIndex++}`);
          values.push(webhook.payloadTemplate);
        }
        
        if (webhook.isActive !== undefined) {
          updates.push(`is_active = $${paramIndex++}`);
          values.push(webhook.isActive);
        }
        
        if (webhook.retryCount !== undefined) {
          updates.push(`retry_count = $${paramIndex++}`);
          values.push(webhook.retryCount);
        }
        
        if (webhook.retryInterval !== undefined) {
          updates.push(`retry_interval = $${paramIndex++}`);
          values.push(webhook.retryInterval);
        }
        
        if (webhook.timeout !== undefined) {
          updates.push(`timeout = $${paramIndex++}`);
          values.push(webhook.timeout);
        }
        
        if (webhook.secretKey !== undefined) {
          updates.push(`secret_key = $${paramIndex++}`);
          values.push(webhook.secretKey);
        }
        
        // Add updated_by and updated_date
        updates.push(`updated_by = $${paramIndex++}`);
        values.push(userId);
        
        updates.push(`updated_date = NOW()`);
        
        // If no updates, return success
        if (updates.length === 0) {
          return true;
        }
        
        // Execute update
        values.push(webhookId);
        await client.query(
          `UPDATE fineract_default.integration_webhook 
           SET ${updates.join(', ')} 
           WHERE id = $${paramIndex}`,
          values
        );
        
        return true;
      });
    } catch (error) {
      logger.error('Error updating webhook', { error, webhookId });
      throw new Error(`Failed to update webhook: ${error.message}`);
    }
  }
  
  /**
   * Delete a webhook
   * 
   * @param webhookId The ID of the webhook to delete
   * @returns Success indicator
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    logger.info('Deleting webhook', { webhookId });
    
    try {
      return db.transaction(async (client) => {
        // Check if webhook exists
        const existingQuery = await client.query(
          `SELECT id FROM fineract_default.integration_webhook 
           WHERE id = $1`,
          [webhookId]
        );
        
        if (existingQuery.rows.length === 0) {
          throw new Error(`Webhook with ID ${webhookId} not found`);
        }
        
        // Delete webhook history first
        await client.query(
          `DELETE FROM fineract_default.integration_webhook_history 
           WHERE webhook_id = $1`,
          [webhookId]
        );
        
        // Delete webhook
        await client.query(
          `DELETE FROM fineract_default.integration_webhook 
           WHERE id = $1`,
          [webhookId]
        );
        
        return true;
      });
    } catch (error) {
      logger.error('Error deleting webhook', { error, webhookId });
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }
  }
  
  /**
   * Get a webhook by ID
   * 
   * @param webhookId The ID of the webhook to retrieve
   * @returns The webhook configuration
   */
  async getWebhook(webhookId: string): Promise<WebhookConfig> {
    logger.info('Getting webhook', { webhookId });
    
    try {
      const result = await db.query(
        `SELECT 
          id, name, description, event_type, url, http_method, content_type, 
          headers, payload_template, is_active, retry_count, retry_interval, 
          timeout, secret_key, created_by, created_date, updated_by, updated_date
         FROM fineract_default.integration_webhook 
         WHERE id = $1`,
        [webhookId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Webhook with ID ${webhookId} not found`);
      }
      
      const webhook = result.rows[0];
      
      return {
        id: webhook.id,
        name: webhook.name,
        description: webhook.description,
        eventType: webhook.event_type,
        url: webhook.url,
        httpMethod: webhook.http_method,
        contentType: webhook.content_type,
        headers: webhook.headers ? JSON.parse(webhook.headers) : undefined,
        payloadTemplate: webhook.payload_template,
        isActive: webhook.is_active,
        retryCount: webhook.retry_count,
        retryInterval: webhook.retry_interval,
        timeout: webhook.timeout,
        secretKey: webhook.secret_key,
        createdBy: webhook.created_by,
        createdDate: webhook.created_date,
        updatedBy: webhook.updated_by,
        updatedDate: webhook.updated_date
      };
    } catch (error) {
      logger.error('Error getting webhook', { error, webhookId });
      throw new Error(`Failed to get webhook: ${error.message}`);
    }
  }
  
  /**
   * Get webhooks by event type
   * 
   * @param eventType The event type to filter by
   * @param activeOnly Whether to only return active webhooks
   * @returns List of webhooks for the event type
   */
  async getWebhooksByEventType(eventType: string, activeOnly: boolean = true): Promise<WebhookConfig[]> {
    logger.info('Getting webhooks by event type', { eventType, activeOnly });
    
    try {
      let query = `
        SELECT 
          id, name, description, event_type, url, http_method, content_type, 
          headers, payload_template, is_active, retry_count, retry_interval, 
          timeout, secret_key, created_by, created_date, updated_by, updated_date
         FROM fineract_default.integration_webhook 
         WHERE event_type = $1
      `;
      
      const params: any[] = [eventType];
      
      if (activeOnly) {
        query += ' AND is_active = $2';
        params.push(true);
      }
      
      const result = await db.query(query, params);
      
      return result.rows.map(webhook => ({
        id: webhook.id,
        name: webhook.name,
        description: webhook.description,
        eventType: webhook.event_type,
        url: webhook.url,
        httpMethod: webhook.http_method,
        contentType: webhook.content_type,
        headers: webhook.headers ? JSON.parse(webhook.headers) : undefined,
        payloadTemplate: webhook.payload_template,
        isActive: webhook.is_active,
        retryCount: webhook.retry_count,
        retryInterval: webhook.retry_interval,
        timeout: webhook.timeout,
        secretKey: webhook.secret_key,
        createdBy: webhook.created_by,
        createdDate: webhook.created_date,
        updatedBy: webhook.updated_by,
        updatedDate: webhook.updated_date
      }));
    } catch (error) {
      logger.error('Error getting webhooks by event type', { error, eventType });
      throw new Error(`Failed to get webhooks by event type: ${error.message}`);
    }
  }
  
  /**
   * List all webhooks with pagination
   * 
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @param eventType Optional event type filter
   * @param activeOnly Whether to only return active webhooks
   * @returns List of webhooks with pagination info
   */
  async listWebhooks(
    page: number = 1, 
    pageSize: number = 20, 
    eventType?: string,
    activeOnly?: boolean
  ): Promise<WebhookListResponse> {
    logger.info('Listing webhooks', { page, pageSize, eventType, activeOnly });
    
    try {
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (eventType) {
        whereClause = `WHERE event_type = $${paramIndex++}`;
        params.push(eventType);
      }
      
      if (activeOnly !== undefined) {
        whereClause = whereClause ? `${whereClause} AND is_active = $${paramIndex++}` : `WHERE is_active = $${paramIndex++}`;
        params.push(activeOnly);
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM fineract_default.integration_webhook 
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);
      
      // Calculate pagination
      const offset = (page - 1) * pageSize;
      
      // Get webhooks
      const query = `
        SELECT 
          id, name, description, event_type, url, http_method, content_type, 
          headers, payload_template, is_active, retry_count, retry_interval, 
          timeout, secret_key, created_by, created_date, updated_by, updated_date
        FROM fineract_default.integration_webhook 
        ${whereClause}
        ORDER BY created_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(pageSize, offset);
      
      const result = await db.query(query, params);
      
      const webhooks = result.rows.map(webhook => ({
        id: webhook.id,
        name: webhook.name,
        description: webhook.description,
        eventType: webhook.event_type,
        url: webhook.url,
        httpMethod: webhook.http_method,
        contentType: webhook.content_type,
        headers: webhook.headers ? JSON.parse(webhook.headers) : undefined,
        payloadTemplate: webhook.payload_template,
        isActive: webhook.is_active,
        retryCount: webhook.retry_count,
        retryInterval: webhook.retry_interval,
        timeout: webhook.timeout,
        secretKey: webhook.secret_key,
        createdBy: webhook.created_by,
        createdDate: webhook.created_date,
        updatedBy: webhook.updated_by,
        updatedDate: webhook.updated_date
      }));
      
      return {
        webhooks,
        total
      };
    } catch (error) {
      logger.error('Error listing webhooks', { error });
      throw new Error(`Failed to list webhooks: ${error.message}`);
    }
  }
  
  /**
   * Execute a webhook for an event
   * 
   * @param request The webhook execution request
   * @returns The execution result
   */
  async executeWebhook(request: WebhookExecutionRequest): Promise<WebhookExecutionResult> {
    const { webhook, event } = request;
    logger.info('Executing webhook', { webhookId: webhook.id, eventType: event.type });
    
    const startTime = Date.now();
    let historyId: string | undefined;
    
    try {
      // Skip if webhook is not active
      if (!webhook.isActive) {
        logger.info('Skipping inactive webhook', { webhookId: webhook.id });
        return {
          success: false,
          webhookId: webhook.id,
          eventType: event.type,
          executionTimeMs: 0,
          errorMessage: 'Webhook is not active'
        };
      }
      
      // Prepare payload using template if available
      let payload: any;
      if (webhook.payloadTemplate) {
        try {
          const template = handlebars.compile(webhook.payloadTemplate);
          payload = JSON.parse(template({ event }));
        } catch (error) {
          logger.error('Error compiling payload template', { error });
          payload = event.data;
        }
      } else {
        payload = event.data;
      }
      
      // Create webhook history record
      historyId = await this.createWebhookHistory({
        webhookId: webhook.id,
        eventType: event.type,
        eventData: event.data,
        payload,
        status: WebhookStatus.PENDING,
        retryCount: 0
      });
      
      // Set up HTTP request config
      const config: AxiosRequestConfig = {
        method: webhook.httpMethod,
        url: webhook.url,
        headers: {
          'Content-Type': webhook.contentType,
          'X-Fineract-Event-Type': event.type,
          'X-Fineract-Event-Id': event.id,
          'X-Fineract-Timestamp': event.timestamp.toISOString()
        },
        timeout: webhook.timeout * 1000,
        validateStatus: () => true  // Don't throw on any status code
      };
      
      // Add custom headers if specified
      if (webhook.headers) {
        config.headers = { ...config.headers, ...webhook.headers };
      }
      
      // Add signature if secret key is provided
      if (webhook.secretKey) {
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secretKey);
        config.headers['X-Fineract-Signature'] = signature;
      }
      
      // Set payload according to content type
      if (webhook.contentType === WebhookContentType.JSON) {
        config.data = payload;
      } else if (webhook.contentType === WebhookContentType.FORM) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(payload)) {
          params.append(key, String(value));
        }
        config.data = params;
      } else if (webhook.contentType === WebhookContentType.XML) {
        // Simple XML conversion (in a real scenario, use a proper XML library)
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<event>\n';
        xml += `  <type>${event.type}</type>\n`;
        xml += `  <id>${event.id}</id>\n`;
        xml += `  <timestamp>${event.timestamp.toISOString()}</timestamp>\n`;
        xml += '  <data>\n';
        for (const [key, value] of Object.entries(payload)) {
          xml += `    <${key}>${value}</${key}>\n`;
        }
        xml += '  </data>\n';
        xml += '</event>';
        config.data = xml;
      } else {
        // Default to string payload
        config.data = JSON.stringify(payload);
      }
      
      // Execute the HTTP request
      const response: AxiosResponse = await axios(config);
      
      // Update webhook history
      const executionTimeMs = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;
      
      await this.updateWebhookHistory(historyId, {
        responseStatus: response.status,
        responseBody: typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data),
        executionTimeMs,
        status: success ? WebhookStatus.SUCCESS : WebhookStatus.FAILED,
        errorMessage: !success ? `HTTP ${response.status}: ${response.statusText}` : undefined
      });
      
      logger.info('Webhook execution completed', {
        webhookId: webhook.id,
        success,
        status: response.status,
        executionTimeMs
      });
      
      return {
        success,
        webhookId: webhook.id,
        eventType: event.type,
        responseStatus: response.status,
        responseBody: typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data),
        executionTimeMs,
        errorMessage: !success ? `HTTP ${response.status}: ${response.statusText}` : undefined
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      
      // Update webhook history if created
      if (historyId) {
        await this.updateWebhookHistory(historyId, {
          status: WebhookStatus.FAILED,
          executionTimeMs,
          errorMessage: error.message
        });
      }
      
      logger.error('Error executing webhook', { error, webhookId: webhook.id });
      
      return {
        success: false,
        webhookId: webhook.id,
        eventType: event.type,
        executionTimeMs,
        errorMessage: error.message
      };
    }
  }
  
  /**
   * Process a new event by finding and executing matching webhooks
   * 
   * @param event The event to process
   * @returns Array of execution results
   */
  async processEvent(event: WebhookEvent): Promise<WebhookExecutionResult[]> {
    logger.info('Processing event for webhooks', { eventType: event.type });
    
    try {
      // Find active webhooks for this event type
      const webhooks = await this.getWebhooksByEventType(event.type, true);
      
      if (webhooks.length === 0) {
        logger.info('No active webhooks found for event type', { eventType: event.type });
        return [];
      }
      
      // Execute each webhook
      const results: WebhookExecutionResult[] = [];
      
      for (const webhook of webhooks) {
        try {
          const result = await this.executeWebhook({ webhook, event });
          results.push(result);
        } catch (error) {
          logger.error('Error executing webhook during event processing', { 
            error, 
            webhookId: webhook.id,
            eventType: event.type
          });
          
          results.push({
            success: false,
            webhookId: webhook.id,
            eventType: event.type,
            executionTimeMs: 0,
            errorMessage: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error processing event for webhooks', { error, eventType: event.type });
      throw new Error(`Failed to process event: ${error.message}`);
    }
  }
  
  /**
   * Test a webhook with sample event data
   * 
   * @param request The test request
   * @returns The execution result
   */
  async testWebhook(request: WebhookTestRequest): Promise<WebhookExecutionResult> {
    logger.info('Testing webhook', { webhookId: request.webhookId });
    
    try {
      // Get webhook configuration
      const webhook = await this.getWebhook(request.webhookId);
      
      // Create a test event
      const event: WebhookEvent = {
        id: uuidv4(),
        type: webhook.eventType,
        timestamp: new Date(),
        data: request.eventData || { 
          test: true, 
          message: 'This is a test event',
          timestamp: new Date().toISOString()
        }
      };
      
      // Execute webhook without creating history record
      return await this.executeWebhook({ webhook, event });
    } catch (error) {
      logger.error('Error testing webhook', { error, webhookId: request.webhookId });
      throw new Error(`Failed to test webhook: ${error.message}`);
    }
  }
  
  /**
   * Get webhook execution history
   * 
   * @param webhookId The webhook ID to filter by
   * @param status Optional status filter
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @returns List of webhook history records
   */
  async getWebhookHistory(
    webhookId: string,
    status?: WebhookStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<WebhookHistoryListResponse> {
    logger.info('Getting webhook history', { webhookId, status, page, pageSize });
    
    try {
      let whereClause = 'WHERE webhook_id = $1';
      const params: any[] = [webhookId];
      let paramIndex = 2;
      
      if (status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM fineract_default.integration_webhook_history 
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);
      
      // Calculate pagination
      const offset = (page - 1) * pageSize;
      
      // Get history records
      const query = `
        SELECT 
          id, webhook_id, event_type, event_data, payload, response_status, 
          response_body, execution_time_ms, status, error_message, retry_count, 
          next_retry_time, created_date, updated_date
        FROM fineract_default.integration_webhook_history 
        ${whereClause}
        ORDER BY created_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(pageSize, offset);
      
      const result = await db.query(query, params);
      
      const history = result.rows.map(record => ({
        id: record.id,
        webhookId: record.webhook_id,
        eventType: record.event_type,
        eventData: record.event_data,
        payload: record.payload,
        responseStatus: record.response_status,
        responseBody: record.response_body,
        executionTimeMs: record.execution_time_ms,
        status: record.status,
        errorMessage: record.error_message,
        retryCount: record.retry_count,
        nextRetryTime: record.next_retry_time,
        createdDate: record.created_date,
        updatedDate: record.updated_date
      }));
      
      return {
        history,
        total
      };
    } catch (error) {
      logger.error('Error getting webhook history', { error, webhookId });
      throw new Error(`Failed to get webhook history: ${error.message}`);
    }
  }
  
  /**
   * Process failed webhooks for retry
   * 
   * @returns Number of webhooks retried
   */
  async processRetries(): Promise<number> {
    logger.info('Processing webhook retries');
    
    try {
      // Find failed webhooks due for retry
      const query = `
        SELECT 
          h.id, h.webhook_id, h.event_type, h.event_data, h.payload, 
          h.retry_count, w.retry_count as max_retries,
          w.name, w.url, w.http_method, w.content_type, w.headers,
          w.payload_template, w.timeout, w.secret_key
        FROM fineract_default.integration_webhook_history h
        JOIN fineract_default.integration_webhook w ON h.webhook_id = w.id
        WHERE h.status = $1
          AND h.retry_count < w.retry_count
          AND (h.next_retry_time IS NULL OR h.next_retry_time <= NOW())
          AND w.is_active = true
        LIMIT 100
      `;
      
      const result = await db.query(query, [WebhookStatus.FAILED]);
      
      if (result.rows.length === 0) {
        logger.info('No failed webhooks to retry');
        return 0;
      }
      
      logger.info(`Found ${result.rows.length} failed webhooks to retry`);
      
      let retryCount = 0;
      
      // Process each failed webhook
      for (const row of result.rows) {
        try {
          // Increment retry count
          const retryNum = row.retry_count + 1;
          
          // Update webhook to retrying status
          await this.updateWebhookHistory(row.id, {
            status: WebhookStatus.RETRYING,
            retryCount: retryNum
          });
          
          // Create webhook config for retry
          const webhook: WebhookConfig = {
            id: row.webhook_id,
            name: row.name,
            eventType: row.event_type,
            url: row.url,
            httpMethod: row.http_method,
            contentType: row.content_type,
            headers: row.headers ? JSON.parse(row.headers) : undefined,
            payloadTemplate: row.payload_template,
            isActive: true,
            retryCount: row.max_retries,
            retryInterval: 60,  // Default for retry
            timeout: row.timeout,
            secretKey: row.secret_key
          };
          
          // Create event for retry
          const event: WebhookEvent = {
            id: uuidv4(),
            type: row.event_type,
            timestamp: new Date(),
            data: row.event_data
          };
          
          // Execute webhook
          const result = await this.executeWebhook({ webhook, event });
          
          // Update history with retry result
          await this.updateWebhookHistory(row.id, {
            status: result.success ? WebhookStatus.SUCCESS : WebhookStatus.FAILED,
            responseStatus: result.responseStatus,
            responseBody: result.responseBody,
            executionTimeMs: result.executionTimeMs,
            errorMessage: result.errorMessage,
            nextRetryTime: !result.success && retryNum < row.max_retries 
              ? new Date(Date.now() + (row.retry_interval || 60) * 1000) 
              : null
          });
          
          retryCount++;
        } catch (error) {
          logger.error('Error retrying webhook', { error, historyId: row.id });
          
          // Update history with retry failure
          await this.updateWebhookHistory(row.id, {
            status: WebhookStatus.FAILED,
            errorMessage: `Retry failed: ${error.message}`,
            nextRetryTime: new Date(Date.now() + (row.retry_interval || 60) * 1000)
          });
        }
      }
      
      return retryCount;
    } catch (error) {
      logger.error('Error processing webhook retries', { error });
      throw new Error(`Failed to process webhook retries: ${error.message}`);
    }
  }
  
  /**
   * Create a webhook history record
   * 
   * @param history The webhook history to create
   * @returns The created history ID
   */
  private async createWebhookHistory(history: Partial<WebhookHistory>): Promise<string> {
    try {
      const id = uuidv4();
      
      await db.query(
        `INSERT INTO fineract_default.integration_webhook_history (
          id, webhook_id, event_type, event_data, payload, status, 
          retry_count, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          id,
          history.webhookId,
          history.eventType,
          JSON.stringify(history.eventData),
          JSON.stringify(history.payload),
          history.status,
          history.retryCount || 0
        ]
      );
      
      return id;
    } catch (error) {
      logger.error('Error creating webhook history', { error });
      throw new Error(`Failed to create webhook history: ${error.message}`);
    }
  }
  
  /**
   * Update a webhook history record
   * 
   * @param historyId The history ID to update
   * @param updates The updates to apply
   */
  private async updateWebhookHistory(historyId: string, updates: Partial<WebhookHistory>): Promise<void> {
    try {
      // Build update fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (updates.responseStatus !== undefined) {
        updateFields.push(`response_status = $${paramIndex++}`);
        values.push(updates.responseStatus);
      }
      
      if (updates.responseBody !== undefined) {
        updateFields.push(`response_body = $${paramIndex++}`);
        values.push(updates.responseBody);
      }
      
      if (updates.executionTimeMs !== undefined) {
        updateFields.push(`execution_time_ms = $${paramIndex++}`);
        values.push(updates.executionTimeMs);
      }
      
      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      
      if (updates.errorMessage !== undefined) {
        updateFields.push(`error_message = $${paramIndex++}`);
        values.push(updates.errorMessage);
      }
      
      if (updates.retryCount !== undefined) {
        updateFields.push(`retry_count = $${paramIndex++}`);
        values.push(updates.retryCount);
      }
      
      if (updates.nextRetryTime !== undefined) {
        updateFields.push(`next_retry_time = $${paramIndex++}`);
        values.push(updates.nextRetryTime);
      }
      
      // Add updated_date
      updateFields.push(`updated_date = NOW()`);
      
      // If no updates, return
      if (updateFields.length === 0) {
        return;
      }
      
      // Execute update
      values.push(historyId);
      await db.query(
        `UPDATE fineract_default.integration_webhook_history 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex}`,
        values
      );
    } catch (error) {
      logger.error('Error updating webhook history', { error, historyId });
      throw new Error(`Failed to update webhook history: ${error.message}`);
    }
  }
  
  /**
   * Generate a signature for webhook payload
   * 
   * @param payload The payload to sign
   * @param secretKey The secret key to use
   * @returns The signature string
   */
  private generateSignature(payload: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
  }
}

// Create and export singleton instance
export const webhookService = new WebhookService();