/**
 * Integration API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { integrationHandlers } from '../handlers/integration';

export const integrationRoutes = Router();

// Webhook routes
integrationRoutes.post('/webhook/register', integrationHandlers.registerWebhook);
integrationRoutes.post('/webhook/list', integrationHandlers.getWebhooks);
integrationRoutes.post('/webhook/test', integrationHandlers.testWebhook);

// API Client routes
integrationRoutes.post('/client/register', integrationHandlers.registerClient);
integrationRoutes.post('/token/generate', integrationHandlers.generateToken);
integrationRoutes.post('/token/validate', integrationHandlers.validateToken);

// Data Exchange routes
integrationRoutes.post('/export/execute', integrationHandlers.executeExport);
integrationRoutes.post('/import/process', integrationHandlers.processImport);

// Event Stream routes
integrationRoutes.post('/stream/producer/register', integrationHandlers.registerEventProducer);
integrationRoutes.post('/stream/consumer/register', integrationHandlers.registerEventConsumer);
integrationRoutes.post('/stream/update', integrationHandlers.updateEventStream);
integrationRoutes.post('/stream/list', integrationHandlers.getEventStreams);
integrationRoutes.post('/stream/get', integrationHandlers.getEventStreamById);
integrationRoutes.post('/stream/delete', integrationHandlers.deleteEventStream);
integrationRoutes.post('/event/publish', integrationHandlers.publishEvent);