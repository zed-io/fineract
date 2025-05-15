/**
 * Payment Gateway API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { paymentGatewayHandlers } from '../handlers/paymentGateway';

export const paymentGatewayRoutes = Router();

// Provider routes
paymentGatewayRoutes.post('/provider/list', paymentGatewayHandlers.getPaymentGatewayProviders);
paymentGatewayRoutes.post('/provider/get', paymentGatewayHandlers.getPaymentGatewayProviderById);
paymentGatewayRoutes.post('/provider/register', paymentGatewayHandlers.registerPaymentGatewayProvider);
paymentGatewayRoutes.post('/provider/update', paymentGatewayHandlers.updatePaymentGatewayProvider);
paymentGatewayRoutes.post('/provider/delete', paymentGatewayHandlers.deletePaymentGatewayProvider);

// Transaction routes
paymentGatewayRoutes.post('/transaction/list', paymentGatewayHandlers.getPaymentGatewayTransactions);
paymentGatewayRoutes.post('/transaction/get', paymentGatewayHandlers.getPaymentGatewayTransactionById);
paymentGatewayRoutes.post('/transaction/create', paymentGatewayHandlers.createPaymentTransaction);
paymentGatewayRoutes.post('/transaction/execute', paymentGatewayHandlers.executePayment);
paymentGatewayRoutes.post('/transaction/status', paymentGatewayHandlers.checkPaymentStatus);
paymentGatewayRoutes.post('/transaction/refund', paymentGatewayHandlers.refundPayment);

// Payment Method routes
paymentGatewayRoutes.post('/payment-method/list', paymentGatewayHandlers.getClientPaymentMethods);
paymentGatewayRoutes.post('/payment-method/save', paymentGatewayHandlers.savePaymentMethod);
paymentGatewayRoutes.post('/payment-method/delete', paymentGatewayHandlers.deletePaymentMethod);

// Recurring Payment routes
paymentGatewayRoutes.post('/recurring/list', paymentGatewayHandlers.getRecurringPaymentConfigurations);
paymentGatewayRoutes.post('/recurring/create', paymentGatewayHandlers.createRecurringPaymentConfiguration);
paymentGatewayRoutes.post('/recurring/update-status', paymentGatewayHandlers.updateRecurringPaymentStatus);

// Webhook routes
paymentGatewayRoutes.post('/webhook/process', paymentGatewayHandlers.processPaymentWebhook);