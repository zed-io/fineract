import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ValidationError, AuthenticationError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import db from '../utils/db';
import { 
  getDeliveryMethods,
  requestOTP,
  validateOTP,
  invalidateAccessToken,
  getTOTPConfiguration,
  setupTOTP,
  verifyTOTPSetup,
  validateTOTP,
  disableTOTP,
  getTrustedDevices,
  updateTrustedDevice,
  getTwoFactorConfigurationHandler,
  updateTwoFactorConfiguration
} from './twofactor';

const router = Router();

interface LoginInput {
  username: string;
  password: string;
}

router.post('/login', async (req, res, next) => {
  try {
    const { input } = req.body;
    
    if (!input || !input.username || !input.password) {
      throw new ValidationError('Username and password are required');
    }
    
    const { username, password } = input as LoginInput;
    
    // For demonstration. In production, this would verify against the database
    // and use proper password hashing
    const result = await db.query(
      'SELECT id, username, role FROM fineract_default.app_user WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid username or password');
    }

    const user = result.rows[0];
    
    // TODO: Implement proper password verification using hashed passwords
    // This is just for demonstration
    if (password !== 'password' && password !== process.env.FINERACT_DEFAULT_ADMIN_PASSWORD) {
      throw new AuthenticationError('Invalid username or password');
    }
    
    // Check if 2FA is required for this user
    const twoFactorRequired = await isTwoFactorRequired(user.id);
    
    if (twoFactorRequired) {
      // Return a special response indicating 2FA is required
      return res.json({
        success: true,
        requiresTwoFactor: true,
        temporaryToken: generateTemporaryToken(user),
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: [user.role],
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': [user.role],
          'x-hasura-default-role': user.role,
          'x-hasura-user-id': user.id
        }
      },
      process.env.JWT_SECRET || 'your-jwt-secret-key-min-32-chars-long',
      { expiresIn: '12h' }
    );

    logger.info(`User logged in: ${username}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to check if 2FA is required for a user
async function isTwoFactorRequired(userId: string): Promise<boolean> {
  try {
    // Get global 2FA settings
    const configResult = await db.query(
      "SELECT value FROM two_factor_configuration WHERE name = 'global-two-factor-required'"
    );
    
    const globalRequired = configResult.rows.length > 0 && 
      configResult.rows[0].value.toLowerCase() === 'true';
    
    if (!globalRequired) {
      return false;
    }
    
    // Check if user has bypass permission
    const bypassResult = await db.query(
      `SELECT COUNT(*) FROM fineract_default.user_permission up
       JOIN fineract_default.permission p ON up.permission_id = p.id
       WHERE up.user_id = $1 AND p.code = 'BYPASS_TWO_FACTOR'`,
      [userId]
    );
    
    return bypassResult.rows[0].count === '0';
  } catch (error) {
    logger.error('Error checking if 2FA is required:', error);
    return false;
  }
}

// Helper function to generate a temporary token for 2FA
function generateTemporaryToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      twoFactorPending: true,
      exp: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutes
    },
    process.env.JWT_SECRET || 'your-jwt-secret-key-min-32-chars-long'
  );
}

// Two-factor authentication routes
router.get('/two-factor/delivery-methods', getDeliveryMethods);
router.post('/two-factor/request-otp', requestOTP);
router.post('/two-factor/validate-otp', validateOTP);
router.post('/two-factor/invalidate-token', invalidateAccessToken);
router.get('/two-factor/totp-config', getTOTPConfiguration);
router.post('/two-factor/setup-totp', setupTOTP);
router.post('/two-factor/verify-totp-setup', verifyTOTPSetup);
router.post('/two-factor/validate-totp', validateTOTP);
router.post('/two-factor/disable-totp', disableTOTP);
router.get('/two-factor/trusted-devices', getTrustedDevices);
router.post('/two-factor/update-trusted-device', updateTrustedDevice);
router.get('/two-factor/configuration', getTwoFactorConfigurationHandler);
router.post('/two-factor/update-configuration', updateTwoFactorConfiguration);

export const authRoutes = router;