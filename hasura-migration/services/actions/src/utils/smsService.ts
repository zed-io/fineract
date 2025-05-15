import axios from 'axios';
import { logger } from './logger';
import { pool } from './db';

// SMS provider interfaces
interface SMSProvider {
  sendSMS(phoneNumber: string, message: string): Promise<void>;
}

// SMS provider implementations
class DefaultSMSProvider implements SMSProvider {
  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    logger.info(`[DefaultSMSProvider] Would send SMS to ${phoneNumber}: ${message}`);
    // In a real implementation, this would integrate with an SMS service
  }
}

class TwilioSMSProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      // Twilio API endpoint
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      // Prepare the request body
      const params = new URLSearchParams();
      params.append('To', phoneNumber);
      params.append('From', this.fromNumber);
      params.append('Body', message);
      
      // Send the request
      await axios.post(url, params, {
        auth: {
          username: this.accountSid,
          password: this.authToken
        }
      });
      
      logger.info(`SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending SMS with Twilio:', error);
      throw error;
    }
  }
}

class AfricasTalkingSMSProvider implements SMSProvider {
  private apiKey: string;
  private username: string;
  private senderId: string;

  constructor(apiKey: string, username: string, senderId: string) {
    this.apiKey = apiKey;
    this.username = username;
    this.senderId = senderId;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      // Africa's Talking API endpoint
      const url = 'https://api.africastalking.com/version1/messaging';
      
      // Prepare the request body
      const params = new URLSearchParams();
      params.append('to', phoneNumber);
      params.append('message', message);
      params.append('username', this.username);
      if (this.senderId) {
        params.append('from', this.senderId);
      }
      
      // Send the request
      await axios.post(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.apiKey
        }
      });
      
      logger.info(`SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending SMS with Africa\'s Talking:', error);
      throw error;
    }
  }
}

// SMS provider factory
const smsProviders: Record<number, SMSProvider> = {};

/**
 * Get SMS provider by ID
 * @param providerId Provider ID
 * @returns SMS provider instance
 */
async function getSMSProvider(providerId: number): Promise<SMSProvider> {
  if (smsProviders[providerId]) {
    return smsProviders[providerId];
  }
  
  try {
    // Get provider configuration from database
    const providerResult = await pool.query(
      'SELECT * FROM sms_provider WHERE id = $1',
      [providerId]
    );
    
    if (providerResult.rowCount === 0) {
      logger.warn(`SMS provider with ID ${providerId} not found, using default provider`);
      smsProviders[providerId] = new DefaultSMSProvider();
      return smsProviders[providerId];
    }
    
    const provider = providerResult.rows[0];
    const config = provider.config ? JSON.parse(provider.config) : {};
    
    switch (provider.provider_key) {
      case 'twilio':
        smsProviders[providerId] = new TwilioSMSProvider(
          config.accountSid,
          config.authToken,
          config.fromNumber
        );
        break;
      case 'africastalking':
        smsProviders[providerId] = new AfricasTalkingSMSProvider(
          config.apiKey,
          config.username,
          config.senderId
        );
        break;
      default:
        smsProviders[providerId] = new DefaultSMSProvider();
    }
    
    return smsProviders[providerId];
  } catch (error) {
    logger.error('Error getting SMS provider:', error);
    smsProviders[providerId] = new DefaultSMSProvider();
    return smsProviders[providerId];
  }
}

/**
 * Send an SMS
 * @param phoneNumber Recipient phone number
 * @param message SMS message
 * @param providerId SMS provider ID
 */
export async function sendSMS(
  phoneNumber: string,
  message: string,
  providerId: number = 1
): Promise<void> {
  try {
    const provider = await getSMSProvider(providerId);
    await provider.sendSMS(phoneNumber, message);
  } catch (error) {
    logger.error('Error sending SMS:', error);
    throw error;
  }
}