/**
 * Payment Gateway Adapter Factory
 * Creates appropriate payment gateway adapter based on provider type
 */

import { PaymentGatewayType } from '../../../models/paymentGateway';
import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { StripeAdapter } from './stripeAdapter';
import { PayPalAdapter } from './paypalAdapter';
import { AuthorizeNetAdapter } from './authorizeNetAdapter';
import { MpesaAdapter } from './mpesaAdapter';
import { SquareAdapter } from './squareAdapter';
import { RazorpayAdapter } from './razorpayAdapter';
import { logger } from '../../../utils/logger';

/**
 * Create a payment gateway adapter based on provider type
 */
export function getPaymentGatewayAdapter(
  providerType: PaymentGatewayType,
  configuration: any
): PaymentGatewayAdapter {
  switch (providerType) {
    case 'stripe':
      return new StripeAdapter(configuration);
    case 'paypal':
      return new PayPalAdapter(configuration);
    case 'authorize_net':
      return new AuthorizeNetAdapter(configuration);
    case 'mpesa':
      return new MpesaAdapter(configuration);
    case 'square':
      return new SquareAdapter(configuration);
    case 'razorpay':
      return new RazorpayAdapter(configuration);
    default:
      logger.error(`Unsupported payment gateway provider type: ${providerType}`);
      throw new Error(`Unsupported payment gateway provider type: ${providerType}`);
  }
}