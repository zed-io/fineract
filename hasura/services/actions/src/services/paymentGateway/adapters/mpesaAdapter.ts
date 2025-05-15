/**
 * M-Pesa Payment Gateway Adapter
 * Implements the PaymentGatewayAdapter interface for M-Pesa mobile money
 */

import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { PaymentMethodType, RecurringFrequency } from '../../../models/paymentGateway';
import { logger } from '../../../utils/logger';

/**
 * Validate M-Pesa configuration
 */
function validateMpesaConfig(config: any): void {
  if (!config.consumerKey) {
    throw new Error('M-Pesa Consumer Key is required');
  }
  
  if (!config.consumerSecret) {
    throw new Error('M-Pesa Consumer Secret is required');
  }
  
  if (!config.shortCode) {
    throw new Error('M-Pesa Business Short Code is required');
  }
  
  if (!config.passKey) {
    throw new Error('M-Pesa Pass Key is required');
  }
  
  if (!config.environment || !['sandbox', 'production'].includes(config.environment)) {
    throw new Error('M-Pesa environment must be either "sandbox" or "production"');
  }
}

/**
 * M-Pesa Payment Gateway Adapter
 */
export class MpesaAdapter implements PaymentGatewayAdapter {
  private config: any;
  private mpesa: any;
  private lastRequest: any = null;
  private lastResponse: any = null;
  
  /**
   * Constructor
   */
  constructor(configuration: any) {
    validateMpesaConfig(configuration);
    this.config = configuration;
    
    // In a real implementation, we'd configure the actual M-Pesa API
    // However, for this example, we'll create placeholders for the methods we need
    
    this.mpesa = {
      authenticate: this.simulateAuthenticate.bind(this),
      initiateSTKPush: this.simulateInitiateSTKPush.bind(this),
      querySTKPushStatus: this.simulateQuerySTKPushStatus.bind(this),
      b2cPayment: this.simulateB2CPayment.bind(this),
      queryTransaction: this.simulateQueryTransaction.bind(this)
    };
  }
  
  /**
   * Create a payment
   */
  async createPayment(input: {
    transactionId: string;
    amount: number;
    currency: string;
    callbackUrl?: string;
    metadata?: any;
  }): Promise<{
    externalId?: string;
    status: string;
    paymentUrl?: string;
  }> {
    try {
      // Validate currency is KES (Kenyan Shilling)
      if (input.currency.toUpperCase() !== 'KES') {
        throw new Error('M-Pesa only supports KES currency');
      }
      
      // For M-Pesa we need a phone number from metadata
      const phoneNumber = input.metadata?.phoneNumber;
      if (!phoneNumber) {
        throw new Error('Phone number is required for M-Pesa payments');
      }
      
      // First, authenticate to get access token
      const authResponse = await this.mpesa.authenticate();
      const accessToken = authResponse.access_token;
      
      // Prepare STK Push request
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const password = Buffer.from(`${this.config.shortCode}${this.config.passKey}${timestamp}`).toString('base64');
      
      const requestData = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(input.amount),  // M-Pesa expects whole numbers
        PartyA: phoneNumber,
        PartyB: this.config.shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: input.callbackUrl || this.config.callbackUrl,
        AccountReference: input.transactionId,
        TransactionDesc: input.metadata?.description || 'Fineract payment'
      };
      
      this.lastRequest = requestData;
      
      // Initiate STK Push
      const response = await this.mpesa.initiateSTKPush(accessToken, requestData);
      
      this.lastResponse = response;
      
      // Check response
      if (response.ResponseCode !== '0') {
        throw new Error(`M-Pesa error: ${response.ResponseDescription}`);
      }
      
      return {
        externalId: response.CheckoutRequestID,
        status: 'pending',
        // M-Pesa is initiated via push notification to the phone, no payment URL needed
      };
    } catch (error) {
      logger.error('Error creating M-Pesa payment', { error, input });
      throw new Error(`M-Pesa payment creation failed: ${error.message}`);
    }
  }
  
  /**
   * Execute a payment
   * For M-Pesa, execution is done via STK Push on the user's phone
   * This method checks the status of an initiated payment
   */
  async executePayment(input: {
    transactionId: string;
    externalId?: string;
    paymentMethod?: string;
    paymentMethodToken?: string;
    paymentDetails?: any;
  }): Promise<{
    success: boolean;
    status: string;
    errorMessage?: string;
    redirectUrl?: string;
    paymentDetails?: any;
  }> {
    try {
      if (!input.externalId) {
        throw new Error('External ID (M-Pesa Checkout Request ID) is required');
      }
      
      // Authentication
      const authResponse = await this.mpesa.authenticate();
      const accessToken = authResponse.access_token;
      
      // Prepare request
      const requestData = {
        BusinessShortCode: this.config.shortCode,
        CheckoutRequestID: input.externalId
      };
      
      this.lastRequest = requestData;
      
      // Query status
      const response = await this.mpesa.querySTKPushStatus(accessToken, requestData);
      
      this.lastResponse = response;
      
      // Check response
      if (response.ResultCode !== '0') {
        return {
          success: false,
          status: 'failed',
          errorMessage: response.ResultDesc,
          paymentDetails: {
            checkoutRequestId: input.externalId,
            resultCode: response.ResultCode,
            resultDesc: response.ResultDesc
          }
        };
      }
      
      return {
        success: true,
        status: 'completed',
        paymentDetails: {
          checkoutRequestId: input.externalId,
          mpesaReceiptNumber: response.MpesaReceiptNumber,
          phoneNumber: response.PhoneNumber,
          amount: response.Amount,
          transactionDate: response.TransactionDate
        }
      };
    } catch (error) {
      logger.error('Error executing M-Pesa payment', { error, input });
      throw new Error(`M-Pesa payment execution failed: ${error.message}`);
    }
  }
  
  /**
   * Check payment status
   */
  async checkPaymentStatus(input: {
    transactionId: string;
    externalId?: string;
  }): Promise<{
    status: string;
    externalId?: string;
    errorMessage?: string;
    paymentDetails?: any;
  }> {
    try {
      if (!input.externalId) {
        throw new Error('External ID (M-Pesa Checkout Request ID) is required');
      }
      
      // Authentication
      const authResponse = await this.mpesa.authenticate();
      const accessToken = authResponse.access_token;
      
      // Prepare request
      const requestData = {
        BusinessShortCode: this.config.shortCode,
        CheckoutRequestID: input.externalId
      };
      
      this.lastRequest = requestData;
      
      // Query status
      const response = await this.mpesa.querySTKPushStatus(accessToken, requestData);
      
      this.lastResponse = response;
      
      // Determine status
      let status;
      if (response.ResultCode === '0') {
        status = 'completed';
      } else if (['1032', '1037'].includes(response.ResultCode)) {
        // 1032: Transaction cancelled by user
        // 1037: Timeout waiting for user input
        status = 'cancelled';
      } else {
        status = 'failed';
      }
      
      return {
        status,
        externalId: input.externalId,
        errorMessage: status === 'completed' ? undefined : response.ResultDesc,
        paymentDetails: response.ResultCode === '0' ? {
          mpesaReceiptNumber: response.MpesaReceiptNumber,
          phoneNumber: response.PhoneNumber,
          amount: response.Amount,
          transactionDate: response.TransactionDate
        } : undefined
      };
    } catch (error) {
      logger.error('Error checking M-Pesa payment status', { error, input });
      throw new Error(`M-Pesa payment status check failed: ${error.message}`);
    }
  }
  
  /**
   * Refund a payment (B2C Payment)
   */
  async refundPayment(input: {
    transactionId: string;
    externalId?: string;
    amount: number;
    reason?: string;
    metadata?: any;
  }): Promise<{
    success: boolean;
    status: string;
    refundId: string;
    errorMessage?: string;
  }> {
    try {
      // For M-Pesa, refunds are implemented as B2C payments back to the customer
      
      // Authentication
      const authResponse = await this.mpesa.authenticate();
      const accessToken = authResponse.access_token;
      
      // We need the phone number from the original transaction or metadata
      const phoneNumber = input.metadata?.phoneNumber;
      if (!phoneNumber) {
        throw new Error('Phone number is required for M-Pesa refunds');
      }
      
      // Prepare request
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      
      const requestData = {
        InitiatorName: this.config.initiatorName,
        SecurityCredential: this.config.securityCredential,
        CommandID: 'BusinessPayment',
        Amount: Math.round(input.amount),
        PartyA: this.config.shortCode,
        PartyB: phoneNumber,
        Remarks: input.reason || 'Refund',
        QueueTimeOutURL: this.config.timeoutUrl,
        ResultURL: this.config.resultUrl,
        Occasion: `Refund for ${input.transactionId}`
      };
      
      this.lastRequest = requestData;
      
      // Execute B2C payment (refund)
      const response = await this.mpesa.b2cPayment(accessToken, requestData);
      
      this.lastResponse = response;
      
      // Check response
      if (response.ResponseCode !== '0') {
        return {
          success: false,
          status: 'failed',
          refundId: response.ConversationID,
          errorMessage: response.ResponseDescription
        };
      }
      
      return {
        success: true,
        status: 'pending', // B2C payments are asynchronous
        refundId: response.ConversationID
      };
    } catch (error) {
      logger.error('Error refunding M-Pesa payment', { error, input });
      throw new Error(`M-Pesa refund failed: ${error.message}`);
    }
  }
  
  /**
   * Create a recurring payment
   * Note: M-Pesa doesn't natively support recurring payments
   * This would typically be implemented through scheduled STK Pushes
   */
  async createRecurringPayment(input: {
    paymentMethodToken: string;
    frequency: RecurringFrequency;
    amount: number;
    currency: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    metadata?: any;
  }): Promise<{
    subscriptionId?: string;
    status: string;
  }> {
    // M-Pesa doesn't support native recurring payments
    // This would need to be implemented through a custom scheduled job system
    
    try {
      if (input.currency.toUpperCase() !== 'KES') {
        throw new Error('M-Pesa only supports KES currency');
      }
      
      // For M-Pesa, the paymentMethodToken would be a phone number
      const phoneNumber = input.paymentMethodToken;
      
      // Generate a subscription ID
      const subscriptionId = `MPESA_SUB_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // In a real implementation, we would save this subscription to a database
      // and set up a scheduled job to initiate STK Push at the defined frequency
      
      return {
        subscriptionId,
        status: 'active'
      };
    } catch (error) {
      logger.error('Error creating M-Pesa recurring payment', { error, input });
      throw new Error(`M-Pesa recurring payment creation failed: ${error.message}`);
    }
  }
  
  /**
   * Update recurring payment status
   */
  async updateRecurringPaymentStatus(input: {
    subscriptionId?: string;
    status: string;
  }): Promise<boolean> {
    try {
      if (!input.subscriptionId) {
        throw new Error('Subscription ID is required');
      }
      
      // In a real implementation, we would update the subscription status in the database
      // and adjust the scheduled job accordingly
      
      return true;
    } catch (error) {
      logger.error('Error updating M-Pesa recurring payment status', { error, input });
      throw new Error(`M-Pesa recurring payment status update failed: ${error.message}`);
    }
  }
  
  /**
   * Process webhook
   */
  async processWebhook(input: {
    eventType: string;
    payload: any;
  }): Promise<{
    transactionId?: string;
    status?: string;
    errorMessage?: string;
    paymentDetails?: any;
    message?: string;
    shouldCreateTransaction?: boolean;
    transactionData?: {
      type?: string;
      amount: number;
      currency: string;
      paymentMethod?: string;
      paymentDetails?: any;
      referenceNumber?: string;
      clientId?: string;
      metadata?: any;
    };
  }> {
    try {
      this.lastRequest = input;
      this.lastResponse = input.payload;
      
      // Process based on event type
      switch (input.eventType) {
        case 'stk_push_callback':
          // Handle STK Push callback
          const body = input.payload.Body.stkCallback;
          
          if (body.ResultCode === 0) {
            // Successful payment
            const item = body.CallbackMetadata.Item;
            const amount = item.find((i: any) => i.Name === 'Amount')?.Value || 0;
            const mpesaReceiptNumber = item.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
            const phoneNumber = item.find((i: any) => i.Name === 'PhoneNumber')?.Value;
            
            return {
              transactionId: body.CheckoutRequestID,
              status: 'completed',
              paymentDetails: {
                mpesaReceiptNumber,
                phoneNumber,
                amount
              },
              message: 'M-Pesa payment completed successfully'
            };
          } else {
            // Failed payment
            return {
              transactionId: body.CheckoutRequestID,
              status: 'failed',
              errorMessage: body.ResultDesc,
              message: `M-Pesa payment failed: ${body.ResultDesc}`
            };
          }
          
        case 'b2c_result':
          // Handle B2C result (refund)
          const resultBody = input.payload.Result;
          
          if (resultBody.ResultCode === 0) {
            // Successful B2C payment (refund)
            const resultParams = resultBody.ResultParameters.ResultParameter;
            const transactionAmount = resultParams.find((p: any) => p.Key === 'TransactionAmount')?.Value || 0;
            const transactionReceipt = resultParams.find((p: any) => p.Key === 'TransactionReceipt')?.Value;
            
            return {
              transactionId: resultBody.TransactionID,
              status: 'completed',
              paymentDetails: {
                conversationId: resultBody.ConversationID,
                originatorConversationID: resultBody.OriginatorConversationID,
                transactionAmount,
                transactionReceipt
              },
              message: 'M-Pesa refund completed successfully'
            };
          } else {
            // Failed B2C payment (refund)
            return {
              transactionId: resultBody.TransactionID,
              status: 'failed',
              errorMessage: resultBody.ResultDesc,
              message: `M-Pesa refund failed: ${resultBody.ResultDesc}`
            };
          }
          
        case 'c2b_confirmation':
          // Handle C2B confirmation (customer initiated payment)
          const c2bBody = input.payload;
          
          // These are customer-initiated payments, so we need to create a new transaction
          return {
            status: 'completed',
            shouldCreateTransaction: true,
            transactionData: {
              type: 'payment',
              amount: parseFloat(c2bBody.TransAmount),
              currency: 'KES',
              paymentMethod: 'mobile_money',
              paymentDetails: {
                mpesaReceiptNumber: c2bBody.TransID,
                phoneNumber: c2bBody.MSISDN,
                billRefNumber: c2bBody.BillRefNumber
              },
              referenceNumber: c2bBody.TransID,
              clientId: c2bBody.BillRefNumber, // Assuming bill reference contains client ID
              metadata: {
                transactionTime: c2bBody.TransTime,
                orgAccountBalance: c2bBody.OrgAccountBalance
              }
            },
            message: 'M-Pesa C2B payment received'
          };
          
        default:
          // Unhandled event type
          return {
            message: `Unhandled M-Pesa event type: ${input.eventType}`
          };
      }
    } catch (error) {
      logger.error('Error processing M-Pesa webhook', { error, input });
      throw new Error(`M-Pesa webhook processing failed: ${error.message}`);
    }
  }
  
  /**
   * Get last request sent to M-Pesa
   */
  getLastRequest(): any {
    return this.lastRequest;
  }
  
  /**
   * Get last response received from M-Pesa
   */
  getLastResponse(): any {
    return this.lastResponse;
  }
  
  // Simulation methods for demonstration
  
  private simulateAuthenticate(): Promise<any> {
    return Promise.resolve({
      access_token: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      expires_in: '3599'
    });
  }
  
  private simulateInitiateSTKPush(accessToken: string, data: any): Promise<any> {
    return Promise.resolve({
      MerchantRequestID: `MER-${Math.random().toString(36).substring(2, 15)}`,
      CheckoutRequestID: `CRQ-${Math.random().toString(36).substring(2, 15)}`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: 'Success. Request accepted for processing'
    });
  }
  
  private simulateQuerySTKPushStatus(accessToken: string, data: any): Promise<any> {
    // Simulate 80% success rate
    const success = Math.random() > 0.2;
    
    if (success) {
      return Promise.resolve({
        ResponseCode: '0',
        ResponseDescription: 'The service request has been accepted successfully',
        MerchantRequestID: `MER-${Math.random().toString(36).substring(2, 15)}`,
        CheckoutRequestID: data.CheckoutRequestID,
        ResultCode: '0',
        ResultDesc: 'The service request is processed successfully.',
        MpesaReceiptNumber: `LHR${Math.floor(Math.random() * 10000000000)}`,
        PhoneNumber: data.PhoneNumber || '254712345678',
        Amount: data.Amount || 100,
        TransactionDate: `${Math.floor(Date.now() / 1000)}`
      });
    } else {
      return Promise.resolve({
        ResponseCode: '0',
        ResponseDescription: 'The service request has been accepted successfully',
        MerchantRequestID: `MER-${Math.random().toString(36).substring(2, 15)}`,
        CheckoutRequestID: data.CheckoutRequestID,
        ResultCode: '1032',
        ResultDesc: 'Request cancelled by user'
      });
    }
  }
  
  private simulateB2CPayment(accessToken: string, data: any): Promise<any> {
    return Promise.resolve({
      ConversationID: `B2C-${Math.random().toString(36).substring(2, 15)}`,
      OriginatorConversationID: `ORGCONV-${Math.random().toString(36).substring(2, 15)}`,
      ResponseCode: '0',
      ResponseDescription: 'Accept the service request successfully.'
    });
  }
  
  private simulateQueryTransaction(accessToken: string, data: any): Promise<any> {
    return Promise.resolve({
      ResponseCode: '0',
      ResponseDescription: 'Success',
      OriginatorConversationID: data.OriginatorConversationID,
      ConversationID: data.ConversationID,
      TransactionID: `TRX-${Math.random().toString(36).substring(2, 15)}`,
      ResultCode: '0',
      ResultDesc: 'The service request is processed successfully.',
      ResultParameters: {
        ResultParameter: [
          {
            Key: 'TransactionAmount',
            Value: data.Amount || 100
          },
          {
            Key: 'TransactionReceipt',
            Value: `MPESA${Math.floor(Math.random() * 10000000000)}`
          },
          {
            Key: 'ReceiverPartyPublicName',
            Value: `254${Math.floor(Math.random() * 1000000000)}`
          },
          {
            Key: 'TransactionCompletedDateTime',
            Value: new Date().toISOString()
          }
        ]
      }
    });
  }
}