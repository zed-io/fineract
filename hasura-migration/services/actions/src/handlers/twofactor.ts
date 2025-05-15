import { Request, Response } from 'express';
import { pool } from '../utils/db';
import { authenticateUser } from '../utils/authMiddleware';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../utils/tokenGenerator';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as UAParser from 'ua-parser-js';
import { sendEmail } from '../utils/emailService';
import { sendSMS } from '../utils/smsService';

// Types
interface OTPDeliveryMethod {
  name: string;
  target: string;
}

interface OTPMetadata {
  deliveryMethod: OTPDeliveryMethod;
  tokenLiveTimeInSec: number;
  extendedAccessToken: boolean;
}

interface TwoFactorAccessToken {
  token: string;
  validFrom: string;
  validTo: string;
}

interface TOTPConfiguration {
  secretKey: string;
  qrCodeUrl: string;
  enabled: boolean;
  verified: boolean;
}

interface TrustedDevice {
  id: number;
  deviceId: string;
  deviceName: string;
  deviceType: string | null;
  lastIp: string | null;
  lastUsed: string;
  expiresAt: string;
  trusted: boolean;
}

interface TwoFactorConfigItem {
  name: string;
  value: string;
}

interface TwoFactorConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  totpEnabled: boolean;
  trustedDevicesEnabled: boolean;
  otpTokenLength: number;
  otpTokenLiveTime: number;
  accessTokenLiveTime: number;
  accessTokenLiveTimeExtended: number;
  trustedDeviceLiveTime: number;
  configItems: TwoFactorConfigItem[];
}

// Constants
const SMS_DELIVERY_METHOD = 'SMS';
const EMAIL_DELIVERY_METHOD = 'EMAIL';
const TOTP_DELIVERY_METHOD = 'TOTP';

/**
 * Get available 2FA delivery methods for current user
 */
export const getDeliveryMethods = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const deliveryMethods: OTPDeliveryMethod[] = [];
    const config = await getTwoFactorConfiguration();

    // Check if email is enabled and user has email
    if (config.emailEnabled && user.email) {
      deliveryMethods.push({
        name: EMAIL_DELIVERY_METHOD,
        target: user.email
      });
    }

    // Check if SMS is enabled and user has phone
    if (config.smsEnabled && user.mobileNo) {
      deliveryMethods.push({
        name: SMS_DELIVERY_METHOD,
        target: user.mobileNo
      });
    }

    // Check if TOTP is enabled and user has TOTP set up
    if (config.totpEnabled) {
      const totpResult = await pool.query(
        'SELECT * FROM totp_secret WHERE user_id = $1 AND enabled = true AND verified = true',
        [user.id]
      );
      
      if (totpResult.rowCount > 0) {
        deliveryMethods.push({
          name: TOTP_DELIVERY_METHOD,
          target: 'Authenticator App'
        });
      }
    }

    return res.json(deliveryMethods);
  } catch (error) {
    logger.error('Error getting delivery methods:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Request OTP via delivery method
 */
export const requestOTP = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { deliveryMethod, extendedToken = false } = req.body.input;
    const config = await getTwoFactorConfiguration();

    // Generate OTP
    const otpLength = config.otpTokenLength;
    const otpToken = generateToken(otpLength);
    const tokenLiveTime = config.otpTokenLiveTime;
    const validTo = new Date(Date.now() + tokenLiveTime * 1000);

    let deliveryTarget: string | null = null;
    
    // Validate and send OTP based on delivery method
    if (deliveryMethod === EMAIL_DELIVERY_METHOD) {
      if (!config.emailEnabled) {
        return res.status(400).json({ message: 'Email delivery method is disabled' });
      }
      
      if (!user.email) {
        return res.status(400).json({ message: 'User does not have an email address' });
      }
      
      deliveryTarget = user.email;
      
      // Get email template from configuration
      const emailSubject = getConfigValue(config.configItems, 'otp-delivery-email-subject');
      let emailBody = getConfigValue(config.configItems, 'otp-delivery-email-body');
      
      // Replace template variables
      emailBody = emailBody
        .replace('{{token}}', otpToken)
        .replace('{{tokenLiveTimeInSec}}', tokenLiveTime.toString());
      
      // Send email
      await sendEmail(user.email, emailSubject, emailBody);
      
    } else if (deliveryMethod === SMS_DELIVERY_METHOD) {
      if (!config.smsEnabled) {
        return res.status(400).json({ message: 'SMS delivery method is disabled' });
      }
      
      if (!user.mobileNo) {
        return res.status(400).json({ message: 'User does not have a mobile number' });
      }
      
      deliveryTarget = user.mobileNo;
      
      // Get SMS template from configuration
      let smsText = getConfigValue(config.configItems, 'otp-delivery-sms-text');
      const smsProviderId = parseInt(getConfigValue(config.configItems, 'otp-delivery-sms-provider'));
      
      // Replace template variables
      smsText = smsText.replace('{{token}}', otpToken);
      
      // Send SMS
      await sendSMS(user.mobileNo, smsText, smsProviderId);
      
    } else {
      return res.status(400).json({ message: 'Invalid delivery method' });
    }
    
    // Save OTP request to database
    await pool.query(
      `INSERT INTO otp_request 
        (user_id, token, valid_to, delivery_method, delivery_target, extended_access_token) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, otpToken, validTo, deliveryMethod, deliveryTarget, extendedToken]
    );
    
    // Return metadata without exposing the token
    const metadata: OTPMetadata = {
      deliveryMethod: {
        name: deliveryMethod,
        target: deliveryTarget || ''
      },
      tokenLiveTimeInSec: tokenLiveTime,
      extendedAccessToken: extendedToken
    };
    
    return res.json(metadata);
  } catch (error) {
    logger.error('Error requesting OTP:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Validate OTP and get access token
 */
export const validateOTP = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token, deviceInfo } = req.body.input;
    const config = await getTwoFactorConfiguration();
    
    // Check if OTP is valid
    const otpResult = await pool.query(
      `SELECT * FROM otp_request 
       WHERE user_id = $1 AND token = $2 AND valid_to > NOW()`,
      [user.id, token]
    );
    
    if (otpResult.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    const otpRequest = otpResult.rows[0];
    
    // Delete the used OTP
    await pool.query('DELETE FROM otp_request WHERE id = $1', [otpRequest.id]);
    
    // Calculate token validity period
    const accessTokenLiveTime = otpRequest.extended_access_token 
      ? config.accessTokenLiveTimeExtended 
      : config.accessTokenLiveTime;
    
    const validFrom = new Date();
    const validTo = new Date(validFrom.getTime() + accessTokenLiveTime * 1000);
    
    // Generate access token
    const accessToken = generateToken(32);
    
    // Save access token
    await pool.query(
      `INSERT INTO two_factor_access_token 
        (user_id, token, valid_from, valid_to, enabled) 
       VALUES ($1, $2, $3, $4, true)`,
      [user.id, accessToken, validFrom, validTo]
    );
    
    // Handle trusted device if provided
    if (deviceInfo && config.trustedDevicesEnabled) {
      await handleTrustedDevice(user.id, deviceInfo, req.ip || '0.0.0.0', config.trustedDeviceLiveTime);
    }
    
    // Return the access token
    const twoFactorAccessToken: TwoFactorAccessToken = {
      token: accessToken,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString()
    };
    
    return res.json(twoFactorAccessToken);
  } catch (error) {
    logger.error('Error validating OTP:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Invalidate access token
 */
export const invalidateAccessToken = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token } = req.body;
    
    // Check if token exists and belongs to user
    const tokenResult = await pool.query(
      `SELECT * FROM two_factor_access_token 
       WHERE user_id = $1 AND token = $2 AND enabled = true`,
      [user.id, token]
    );
    
    if (tokenResult.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    
    // Invalidate token
    await pool.query(
      `UPDATE two_factor_access_token 
       SET enabled = false, updated_at = NOW() 
       WHERE id = $1`,
      [tokenResult.rows[0].id]
    );
    
    return res.json({ success: true });
  } catch (error) {
    logger.error('Error invalidating access token:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get TOTP configuration for current user
 */
export const getTOTPConfiguration = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const config = await getTwoFactorConfiguration();
    
    if (!config.totpEnabled) {
      return res.status(400).json({ message: 'TOTP is disabled in system configuration' });
    }
    
    // Check if user already has TOTP set up
    const totpResult = await pool.query(
      'SELECT * FROM totp_secret WHERE user_id = $1',
      [user.id]
    );
    
    if (totpResult.rowCount === 0) {
      return res.json(null);
    }
    
    const totpSecret = totpResult.rows[0];
    
    // Generate QR code if not verified yet
    let qrCodeUrl = '';
    if (!totpSecret.verified) {
      qrCodeUrl = await generateQRCode(user.username, totpSecret.secret_key);
    }
    
    const totpConfig: TOTPConfiguration = {
      secretKey: totpSecret.secret_key,
      qrCodeUrl,
      enabled: totpSecret.enabled,
      verified: totpSecret.verified
    };
    
    return res.json(totpConfig);
  } catch (error) {
    logger.error('Error getting TOTP configuration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Setup TOTP for current user
 */
export const setupTOTP = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const config = await getTwoFactorConfiguration();
    
    if (!config.totpEnabled) {
      return res.status(400).json({ message: 'TOTP is disabled in system configuration' });
    }
    
    // Check if user already has TOTP set up
    const existingResult = await pool.query(
      'SELECT * FROM totp_secret WHERE user_id = $1',
      [user.id]
    );
    
    if (existingResult.rowCount > 0 && existingResult.rows[0].verified) {
      return res.status(400).json({ message: 'TOTP is already set up for this user' });
    }
    
    // Generate new TOTP secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Fineract:${user.username}`
    });
    
    // Generate QR code
    const qrCodeUrl = await generateQRCode(user.username, secret.base32);
    
    // Save or update TOTP secret
    if (existingResult.rowCount > 0) {
      await pool.query(
        `UPDATE totp_secret 
         SET secret_key = $1, enabled = false, verified = false, updated_at = NOW() 
         WHERE user_id = $2`,
        [secret.base32, user.id]
      );
    } else {
      await pool.query(
        `INSERT INTO totp_secret 
          (user_id, secret_key, enabled, verified) 
         VALUES ($1, $2, false, false)`,
        [user.id, secret.base32]
      );
    }
    
    // Return TOTP configuration
    const totpConfig: TOTPConfiguration = {
      secretKey: secret.base32,
      qrCodeUrl,
      enabled: false,
      verified: false
    };
    
    return res.json(totpConfig);
  } catch (error) {
    logger.error('Error setting up TOTP:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify TOTP setup with a token
 */
export const verifyTOTPSetup = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { secretKey, token } = req.body.input;
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secretKey,
      encoding: 'base32',
      token
    });
    
    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    
    // Update TOTP secret as verified and enabled
    await pool.query(
      `UPDATE totp_secret 
       SET verified = true, enabled = true, updated_at = NOW() 
       WHERE user_id = $1 AND secret_key = $2`,
      [user.id, secretKey]
    );
    
    return res.json({ success: true });
  } catch (error) {
    logger.error('Error verifying TOTP setup:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Validate TOTP and get access token
 */
export const validateTOTP = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token, deviceInfo } = req.body.input;
    const config = await getTwoFactorConfiguration();
    
    if (!config.totpEnabled) {
      return res.status(400).json({ message: 'TOTP is disabled in system configuration' });
    }
    
    // Get user's TOTP secret
    const totpResult = await pool.query(
      'SELECT * FROM totp_secret WHERE user_id = $1 AND enabled = true AND verified = true',
      [user.id]
    );
    
    if (totpResult.rowCount === 0) {
      return res.status(400).json({ message: 'TOTP is not set up for this user' });
    }
    
    const secretKey = totpResult.rows[0].secret_key;
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secretKey,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 step before/after for clock drift
    });
    
    if (!verified) {
      return res.status(400).json({ message: 'Invalid TOTP token' });
    }
    
    // Calculate token validity period
    const accessTokenLiveTime = config.accessTokenLiveTime;
    const validFrom = new Date();
    const validTo = new Date(validFrom.getTime() + accessTokenLiveTime * 1000);
    
    // Generate access token
    const accessToken = generateToken(32);
    
    // Save access token
    await pool.query(
      `INSERT INTO two_factor_access_token 
        (user_id, token, valid_from, valid_to, enabled) 
       VALUES ($1, $2, $3, $4, true)`,
      [user.id, accessToken, validFrom, validTo]
    );
    
    // Handle trusted device if provided
    if (deviceInfo && config.trustedDevicesEnabled) {
      await handleTrustedDevice(user.id, deviceInfo, req.ip || '0.0.0.0', config.trustedDeviceLiveTime);
    }
    
    // Return the access token
    const twoFactorAccessToken: TwoFactorAccessToken = {
      token: accessToken,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString()
    };
    
    return res.json(twoFactorAccessToken);
  } catch (error) {
    logger.error('Error validating TOTP:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Disable TOTP for current user
 */
export const disableTOTP = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token } = req.body;
    
    // Verify password or current TOTP to ensure it's really the user
    const totpResult = await pool.query(
      'SELECT * FROM totp_secret WHERE user_id = $1 AND enabled = true AND verified = true',
      [user.id]
    );
    
    if (totpResult.rowCount === 0) {
      return res.status(400).json({ message: 'TOTP is not enabled for this user' });
    }
    
    const secretKey = totpResult.rows[0].secret_key;
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secretKey,
      encoding: 'base32',
      token,
      window: 1
    });
    
    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    
    // Disable TOTP
    await pool.query(
      `UPDATE totp_secret 
       SET enabled = false, updated_at = NOW() 
       WHERE user_id = $1`,
      [user.id]
    );
    
    return res.json({ success: true });
  } catch (error) {
    logger.error('Error disabling TOTP:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get trusted devices for current user
 */
export const getTrustedDevices = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const config = await getTwoFactorConfiguration();
    
    if (!config.trustedDevicesEnabled) {
      return res.status(400).json({ message: 'Trusted devices are disabled in system configuration' });
    }
    
    // Get user's trusted devices
    const devicesResult = await pool.query(
      `SELECT * FROM trusted_device 
       WHERE user_id = $1
       ORDER BY last_used DESC`,
      [user.id]
    );
    
    const trustedDevices: TrustedDevice[] = devicesResult.rows.map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      lastIp: row.last_ip,
      lastUsed: row.last_used,
      expiresAt: row.expires_at,
      trusted: row.trusted
    }));
    
    return res.json(trustedDevices);
  } catch (error) {
    logger.error('Error getting trusted devices:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update trusted device status
 */
export const updateTrustedDevice = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { deviceId, trusted } = req.body.input;
    const config = await getTwoFactorConfiguration();
    
    if (!config.trustedDevicesEnabled) {
      return res.status(400).json({ message: 'Trusted devices are disabled in system configuration' });
    }
    
    // Check if device exists and belongs to user
    const deviceResult = await pool.query(
      'SELECT * FROM trusted_device WHERE user_id = $1 AND device_id = $2',
      [user.id, deviceId]
    );
    
    if (deviceResult.rowCount === 0) {
      return res.status(400).json({ message: 'Device not found' });
    }
    
    // Update device status
    await pool.query(
      `UPDATE trusted_device 
       SET trusted = $1, updated_at = NOW() 
       WHERE user_id = $2 AND device_id = $3`,
      [trusted, user.id, deviceId]
    );
    
    return res.json({ success: true });
  } catch (error) {
    logger.error('Error updating trusted device:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get 2FA configuration (admin only)
 */
export const getTwoFactorConfigurationHandler = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user has admin rights
    if (!user.permissions || !user.permissions.includes('ADMIN_TWOFACTOR_CONFIGURATION')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const config = await getTwoFactorConfiguration();
    return res.json(config);
  } catch (error) {
    logger.error('Error getting 2FA configuration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update 2FA configuration (admin only)
 */
export const updateTwoFactorConfiguration = async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user has admin rights
    if (!user.permissions || !user.permissions.includes('ADMIN_TWOFACTOR_CONFIGURATION')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const {
      emailEnabled,
      smsEnabled,
      totpEnabled,
      trustedDevicesEnabled,
      otpTokenLength,
      otpTokenLiveTime,
      accessTokenLiveTime,
      accessTokenLiveTimeExtended,
      trustedDeviceLiveTime,
      emailSubject,
      emailBody,
      smsProviderId,
      smsText
    } = req.body.input;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update boolean configurations
      if (emailEnabled !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-delivery-email-enable'`,
          [emailEnabled.toString()]
        );
      }
      
      if (smsEnabled !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-delivery-sms-enable'`,
          [smsEnabled.toString()]
        );
      }
      
      if (totpEnabled !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'totp-enabled'`,
          [totpEnabled.toString()]
        );
      }
      
      if (trustedDevicesEnabled !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'trusted-devices-enabled'`,
          [trustedDevicesEnabled.toString()]
        );
      }
      
      // Update number configurations
      if (otpTokenLength !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-token-length'`,
          [otpTokenLength.toString()]
        );
      }
      
      if (otpTokenLiveTime !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-token-live-time'`,
          [otpTokenLiveTime.toString()]
        );
      }
      
      if (accessTokenLiveTime !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'access-token-live-time'`,
          [accessTokenLiveTime.toString()]
        );
      }
      
      if (accessTokenLiveTimeExtended !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'access-token-live-time-extended'`,
          [accessTokenLiveTimeExtended.toString()]
        );
      }
      
      if (trustedDeviceLiveTime !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'trusted-device-live-time'`,
          [trustedDeviceLiveTime.toString()]
        );
      }
      
      // Update string configurations
      if (emailSubject !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-delivery-email-subject'`,
          [emailSubject]
        );
      }
      
      if (emailBody !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-delivery-email-body'`,
          [emailBody]
        );
      }
      
      if (smsProviderId !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-delivery-sms-provider'`,
          [smsProviderId.toString()]
        );
      }
      
      if (smsText !== undefined) {
        await client.query(
          `UPDATE two_factor_configuration 
           SET value = $1, updated_at = NOW() 
           WHERE name = 'otp-delivery-sms-text'`,
          [smsText]
        );
      }
      
      await client.query('COMMIT');
      
      // Get updated configuration
      const updatedConfig = await getTwoFactorConfiguration();
      return res.json(updatedConfig);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating 2FA configuration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper Functions

/**
 * Get Two-Factor configuration from database
 */
async function getTwoFactorConfiguration(): Promise<TwoFactorConfig> {
  const configResult = await pool.query('SELECT * FROM two_factor_configuration');
  
  const configItems: TwoFactorConfigItem[] = configResult.rows.map((row) => ({
    name: row.name,
    value: row.value
  }));
  
  return {
    emailEnabled: getConfigValueBool(configItems, 'otp-delivery-email-enable'),
    smsEnabled: getConfigValueBool(configItems, 'otp-delivery-sms-enable'),
    totpEnabled: getConfigValueBool(configItems, 'totp-enabled'),
    trustedDevicesEnabled: getConfigValueBool(configItems, 'trusted-devices-enabled'),
    otpTokenLength: getConfigValueNumber(configItems, 'otp-token-length'),
    otpTokenLiveTime: getConfigValueNumber(configItems, 'otp-token-live-time'),
    accessTokenLiveTime: getConfigValueNumber(configItems, 'access-token-live-time'),
    accessTokenLiveTimeExtended: getConfigValueNumber(configItems, 'access-token-live-time-extended'),
    trustedDeviceLiveTime: getConfigValueNumber(configItems, 'trusted-device-live-time'),
    configItems
  };
}

/**
 * Get config value as string
 */
function getConfigValue(configItems: TwoFactorConfigItem[], name: string): string {
  const item = configItems.find((item) => item.name === name);
  return item ? item.value : '';
}

/**
 * Get config value as boolean
 */
function getConfigValueBool(configItems: TwoFactorConfigItem[], name: string): boolean {
  const value = getConfigValue(configItems, name);
  return value.toLowerCase() === 'true';
}

/**
 * Get config value as number
 */
function getConfigValueNumber(configItems: TwoFactorConfigItem[], name: string): number {
  const value = getConfigValue(configItems, name);
  return parseInt(value, 10) || 0;
}

/**
 * Generate QR code for TOTP
 */
async function generateQRCode(username: string, secretKey: string): Promise<string> {
  const otpauth = speakeasy.otpauthURL({
    secret: secretKey,
    label: `Fineract:${username}`,
    issuer: 'Fineract',
    encoding: 'base32'
  });
  
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(otpauth, (err, dataUrl) => {
      if (err) {
        reject(err);
      } else {
        resolve(dataUrl);
      }
    });
  });
}

/**
 * Handle trusted device
 */
async function handleTrustedDevice(
  userId: number, 
  deviceInfo: any, 
  ipAddress: string, 
  trustedDeviceLiveTime: number
): Promise<void> {
  const { deviceId, deviceName, deviceType, trustDevice } = deviceInfo;
  
  if (!trustDevice) {
    return;
  }
  
  const expiresAt = new Date(Date.now() + trustedDeviceLiveTime * 1000);
  
  // Check if device already exists
  const deviceResult = await pool.query(
    'SELECT * FROM trusted_device WHERE user_id = $1 AND device_id = $2',
    [userId, deviceId]
  );
  
  if (deviceResult.rowCount > 0) {
    // Update existing device
    await pool.query(
      `UPDATE trusted_device 
       SET device_name = $1, device_type = $2, last_ip = $3, 
           last_used = NOW(), expires_at = $4, trusted = true, updated_at = NOW() 
       WHERE user_id = $5 AND device_id = $6`,
      [deviceName, deviceType, ipAddress, expiresAt, userId, deviceId]
    );
  } else {
    // Create new trusted device
    await pool.query(
      `INSERT INTO trusted_device 
        (user_id, device_id, device_name, device_type, last_ip, last_used, expires_at, trusted) 
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, true)`,
      [userId, deviceId, deviceName, deviceType, ipAddress, expiresAt]
    );
  }
}