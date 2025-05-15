/**
 * Integration API handlers for Fineract Hasura actions
 * Includes webhook, API client, data exchange, and event streaming APIs
 */

import { Request, Response } from 'express';
import { webhookService } from '../services/integration/webhookService';
import { apiClientService } from '../services/integration/apiClientService';
import { dataExchangeService } from '../services/integration/dataExchangeService';
import { eventStreamService } from '../services/integration/eventStreamService';
import { logger } from '../utils/logger';

/**
 * Integration API handlers
 */
export const integrationHandlers = {
  
  // Webhook handlers
  
  /**
   * Register a new webhook
   */
  async registerWebhook(req: Request, res: Response) {
    try {
      const webhookId = await webhookService.registerWebhook(req.body.input, req.body.session_variables?.['x-hasura-user-id']);
      res.json({ id: webhookId });
    } catch (error: any) {
      logger.error('Error registering webhook', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get webhook list
   */
  async getWebhooks(req: Request, res: Response) {
    try {
      const { eventType, isActive, limit, offset } = req.body.input;
      const webhooks = await webhookService.getWebhooks(eventType, isActive, limit, offset);
      res.json(webhooks);
    } catch (error: any) {
      logger.error('Error getting webhooks', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Execute a test webhook
   */
  async testWebhook(req: Request, res: Response) {
    try {
      const result = await webhookService.testWebhook(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error testing webhook', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // API Client handlers
  
  /**
   * Register a new API client
   */
  async registerClient(req: Request, res: Response) {
    try {
      const result = await apiClientService.registerClient(
        req.body.input,
        req.body.session_variables?.['x-hasura-user-id']
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error registering API client', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Generate an OAuth token
   */
  async generateToken(req: Request, res: Response) {
    try {
      const result = await apiClientService.generateToken(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error generating token', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Validate an OAuth token
   */
  async validateToken(req: Request, res: Response) {
    try {
      const { token } = req.body.input;
      const result = await apiClientService.validateToken(token);
      res.json(result);
    } catch (error: any) {
      logger.error('Error validating token', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // Data Exchange handlers
  
  /**
   * Execute a data export
   */
  async executeExport(req: Request, res: Response) {
    try {
      const result = await dataExchangeService.executeExport(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error executing export', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Process a data import
   */
  async processImport(req: Request, res: Response) {
    try {
      const result = await dataExchangeService.processImport(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error processing import', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // Event Stream handlers
  
  /**
   * Register a new event producer
   */
  async registerEventProducer(req: Request, res: Response) {
    try {
      const result = await eventStreamService.registerProducer(
        req.body.input,
        req.body.session_variables?.['x-hasura-user-id']
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error registering event producer', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Register a new event consumer
   */
  async registerEventConsumer(req: Request, res: Response) {
    try {
      const result = await eventStreamService.registerConsumer(
        req.body.input,
        req.body.session_variables?.['x-hasura-user-id']
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error registering event consumer', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update an event stream
   */
  async updateEventStream(req: Request, res: Response) {
    try {
      const { streamId, updates } = req.body.input;
      const result = await eventStreamService.updateStream(
        streamId,
        updates,
        req.body.session_variables?.['x-hasura-user-id']
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error updating event stream', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get event streams
   */
  async getEventStreams(req: Request, res: Response) {
    try {
      const { eventType, streamType, isActive, limit, offset } = req.body.input;
      const result = await eventStreamService.getStreams(
        eventType,
        streamType,
        isActive,
        limit,
        offset
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting event streams', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get event stream by ID
   */
  async getEventStreamById(req: Request, res: Response) {
    try {
      const { streamId } = req.body.input;
      const result = await eventStreamService.getStreamById(streamId);
      
      if (!result) {
        return res.status(404).json({ message: 'Event stream not found' });
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting event stream by ID', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete event stream
   */
  async deleteEventStream(req: Request, res: Response) {
    try {
      const { streamId } = req.body.input;
      const result = await eventStreamService.deleteStream(streamId);
      
      if (!result) {
        return res.status(404).json({ message: 'Event stream not found' });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error deleting event stream', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Publish event
   */
  async publishEvent(req: Request, res: Response) {
    try {
      const result = await eventStreamService.publishEvent(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error publishing event', { error });
      res.status(400).json({ message: error.message });
    }
  }
};