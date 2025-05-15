import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import {
  User,
  UserCredentials,
  TokenResponse,
  UserBasicInfo,
  JWTPayload,
  PermissionData,
  TOKEN_CONFIG,
  TokenType,
  JWTToken,
  UserInput,
  PasswordChangeInput,
  validatePassword,
  PasswordRequirementsError,
  PasswordMismatchError,
  AuthenticationError,
  AccountLockError,
  AccountNotActiveError,
  InvalidTokenError,
  TokenExpiredError,
  TenantNotFoundError,
  hasPermission,
  getUserPermissionCodes
} from '../models/auth';

// JWT secret should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'fineract-hasura-jwt-secret';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * Generate a JWT token
 * @param payload The data to encode in the token
 * @param type The type of token to generate
 * @returns The token information
 */
export async function generateToken(payload: Partial<JWTPayload>, type: TokenType): Promise<JWTToken> {
  // Add token specific fields
  const jwtId = uuidv4();
  const issuedAt = Math.floor(Date.now() / 1000);
  
  const expiryTime = type === TokenType.ACCESS 
    ? TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY 
    : type === TokenType.REFRESH 
      ? TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY 
      : TOKEN_CONFIG.RESET_TOKEN_EXPIRY;
  
  const expiresAt = issuedAt + expiryTime;
  
  const tokenPayload: JWTPayload = {
    ...payload as JWTPayload,
    iat: issuedAt,
    exp: expiresAt,
    typ: type === TokenType.ACCESS ? 'access' : 'refresh',
    jti: jwtId
  };
  
  const token = jwt.sign(tokenPayload, JWT_SECRET);
  
  return {
    token,
    issuedAt: new Date(issuedAt * 1000),
    expiresAt: new Date(expiresAt * 1000),
    type
  };
}

/**
 * Verify and decode a JWT token
 * @param token The token to verify
 * @returns The decoded token payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError(error.message);
  }
}

/**
 * Authenticate a user with username and password
 * @param credentials User credentials
 * @param tenantId Optional tenant ID
 * @returns Token response with user information
 */
export async function authenticateUser(
  credentials: UserCredentials,
  tenantId?: string
): Promise<TokenResponse> {
  const { username, password } = credentials;
  
  try {
    // Verify tenant if provided
    if (tenantId) {
      const tenantQuery = await db.query(
        'SELECT id, name, is_active FROM tenant WHERE identifier = $1',
        [tenantId]
      );
      
      if (tenantQuery.rowCount === 0) {
        throw new TenantNotFoundError();
      }
      
      const tenant = tenantQuery.rows[0];
      if (!tenant.is_active) {
        throw new TenantNotFoundError('Tenant is not active');
      }
    }
    
    // Get user with roles and permissions
    const userQuery = await db.query(
      `SELECT u.id, u.username, u.email, u.firstname, u.lastname, u.password as password_hash,
        u.password_never_expires, u.is_deleted, u.last_time_password_updated,
        u.password_expired, u.is_locked, u.account_non_expired, u.is_enabled,
        u.requires_password_reset, u.failed_attempt_count, u.last_login,
        u.office_id, u.staff_id, u.tenant_id, u.created_date, u.last_modified_date
      FROM app_user u
      WHERE u.username = $1 AND (u.tenant_id = $2 OR u.tenant_id IS NULL)`,
      [username, tenantId]
    );
    
    if (userQuery.rowCount === 0) {
      throw new AuthenticationError('Invalid username or password');
    }
    
    const user = userQuery.rows[0] as User;
    
    // Check if account is enabled
    if (user.is_deleted || !user.is_enabled) {
      throw new AccountNotActiveError();
    }
    
    // Check if account is locked
    if (user.is_locked) {
      throw new AccountLockError();
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      // Increment failed attempt count and possibly lock account
      await updateFailedLoginAttempts(user.id);
      throw new AuthenticationError('Invalid username or password');
    }
    
    // Reset failed attempts and update last login time
    await resetFailedLoginAttempts(user.id);
    
    // Get user roles
    const rolesQuery = await db.query(
      `SELECT r.id, r.name, r.description, r.is_disabled, r.is_self_service_role
      FROM role r
      JOIN user_role ur ON r.id = ur.role_id
      WHERE ur.app_user_id = $1 AND r.is_disabled = false`,
      [user.id]
    );
    
    const roles = rolesQuery.rows;
    
    // Get permissions for each role
    const permissionsPromises = roles.map(async (role) => {
      const permQuery = await db.query(
        `SELECT p.id, p.grouping, p.code, p.entity_name, p.action_name, 
          p.can_maker_checker, p.description, p.is_disabled
        FROM permission p
        JOIN role_permission rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND p.is_disabled = false`,
        [role.id]
      );
      
      role.permissions = permQuery.rows;
      return role;
    });
    
    user.roles = await Promise.all(permissionsPromises);
    
    // Get office name if office ID exists
    let officeName = null;
    if (user.officeId) {
      const officeQuery = await db.query(
        'SELECT name FROM office WHERE id = $1',
        [user.officeId]
      );
      
      if (officeQuery.rowCount > 0) {
        officeName = officeQuery.rows[0].name;
      }
    }
    
    // Get staff name if staff ID exists
    let staffName = null;
    if (user.staffId) {
      const staffQuery = await db.query(
        'SELECT display_name FROM staff WHERE id = $1',
        [user.staffId]
      );
      
      if (staffQuery.rowCount > 0) {
        staffName = staffQuery.rows[0].display_name;
      }
    }
    
    // Check if Super user
    const isSuperUser = user.roles.some(role => role.name === 'Super user');
    
    // Generate tokens
    const permissionCodes = getUserPermissionCodes(user);
    
    const tokenPayload: Partial<JWTPayload> = {
      sub: user.id,
      roles: user.roles.map(r => r.name),
      perms: permissionCodes,
      off: user.officeId,
      tn: user.tenantId
    };
    
    const accessToken = await generateToken(tokenPayload, TokenType.ACCESS);
    const refreshToken = await generateToken(tokenPayload, TokenType.REFRESH);
    
    // Prepare user basic info
    const userBasicInfo: UserBasicInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      displayName: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username,
      officeId: user.officeId,
      officeName,
      staffId: user.staffId,
      staffName,
      lastLogin: user.lastLogin,
      isSuperUser,
      tenantId: user.tenantId
    };
    
    // Prepare permissions data
    const permissions: PermissionData[] = [];
    
    user.roles.forEach(role => {
      role.permissions.forEach(perm => {
        permissions.push({
          grouping: perm.grouping,
          code: perm.code,
          entityName: perm.entityName,
          actionName: perm.actionName
        });
      });
    });
    
    // Return token response
    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      tokenType: 'Bearer',
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      roles: user.roles.map(r => r.name),
      permissions,
      userBasicInfo
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    
    // Re-throw known errors
    if (error instanceof AuthenticationError ||
        error instanceof AccountLockError ||
        error instanceof AccountNotActiveError ||
        error instanceof TenantNotFoundError) {
      throw error;
    }
    
    // Wrap unknown errors
    throw new AuthenticationError('Authentication failed');
  }
}

/**
 * Refresh auth tokens using a refresh token
 * @param refreshToken The refresh token
 * @returns New access and refresh tokens
 */
export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  try {
    // Verify the refresh token
    const decoded = verifyToken(refreshToken);
    
    // Ensure it's a refresh token
    if (decoded.typ !== 'refresh') {
      throw new InvalidTokenError('Not a refresh token');
    }
    
    // Get user information from the token
    const userId = decoded.sub;
    
    // Re-authenticate the user to get fresh roles and permissions
    const userQuery = await db.query(
      `SELECT username, tenant_id FROM app_user WHERE id = $1 AND is_enabled = true AND is_deleted = false`,
      [userId]
    );
    
    if (userQuery.rowCount === 0) {
      throw new AuthenticationError('User not found or inactive');
    }
    
    const user = userQuery.rows[0];
    
    // Instead of authenticating with password, we'll generate new tokens with an internal method
    return await generateTokensForUser(userId, user.tenant_id);
  } catch (error) {
    logger.error('Token refresh error:', error);
    
    if (error instanceof TokenExpiredError ||
        error instanceof InvalidTokenError ||
        error instanceof AuthenticationError) {
      throw error;
    }
    
    throw new InvalidTokenError('Failed to refresh tokens');
  }
}

/**
 * Internal method to generate tokens for a user
 * @param userId User ID
 * @param tenantId Tenant ID
 * @returns Token response
 */
async function generateTokensForUser(userId: string, tenantId?: string): Promise<TokenResponse> {
  try {
    // Get user with roles and permissions
    const userQuery = await db.query(
      `SELECT u.id, u.username, u.email, u.firstname, u.lastname,
        u.office_id, u.staff_id, u.last_login
      FROM app_user u
      WHERE u.id = $1`,
      [userId]
    );
    
    if (userQuery.rowCount === 0) {
      throw new AuthenticationError('User not found');
    }
    
    const user = userQuery.rows[0] as Partial<User>;
    
    // Get user roles
    const rolesQuery = await db.query(
      `SELECT r.id, r.name, r.description, r.is_disabled, r.is_self_service_role
      FROM role r
      JOIN user_role ur ON r.id = ur.role_id
      WHERE ur.app_user_id = $1 AND r.is_disabled = false`,
      [userId]
    );
    
    const roles = rolesQuery.rows;
    
    // Get permissions for each role
    const permissionsPromises = roles.map(async (role) => {
      const permQuery = await db.query(
        `SELECT p.id, p.grouping, p.code, p.entity_name, p.action_name, 
          p.can_maker_checker, p.description, p.is_disabled
        FROM permission p
        JOIN role_permission rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND p.is_disabled = false`,
        [role.id]
      );
      
      role.permissions = permQuery.rows;
      return role;
    });
    
    user.roles = await Promise.all(permissionsPromises);
    
    // Get office name if office ID exists
    let officeName = null;
    if (user.officeId) {
      const officeQuery = await db.query(
        'SELECT name FROM office WHERE id = $1',
        [user.officeId]
      );
      
      if (officeQuery.rowCount > 0) {
        officeName = officeQuery.rows[0].name;
      }
    }
    
    // Get staff name if staff ID exists
    let staffName = null;
    if (user.staffId) {
      const staffQuery = await db.query(
        'SELECT display_name FROM staff WHERE id = $1',
        [user.staffId]
      );
      
      if (staffQuery.rowCount > 0) {
        staffName = staffQuery.rows[0].display_name;
      }
    }
    
    // Check if Super user
    const isSuperUser = user.roles.some(role => role.name === 'Super user');
    
    // Generate permission codes
    const permissionCodes = [];
    if (isSuperUser) {
      permissionCodes.push('ALL_FUNCTIONS');
    } else {
      user.roles.forEach(role => {
        role.permissions.forEach(perm => {
          permissionCodes.push(perm.code);
        });
      });
    }
    
    // Generate tokens
    const tokenPayload: Partial<JWTPayload> = {
      sub: user.id,
      roles: user.roles.map(r => r.name),
      perms: [...new Set(permissionCodes)],
      off: user.officeId,
      tn: tenantId
    };
    
    const accessToken = await generateToken(tokenPayload, TokenType.ACCESS);
    const refreshToken = await generateToken(tokenPayload, TokenType.REFRESH);
    
    // Prepare user basic info
    const userBasicInfo: UserBasicInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      displayName: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username,
      officeId: user.officeId,
      officeName,
      staffId: user.staffId,
      staffName,
      lastLogin: user.lastLogin,
      isSuperUser,
      tenantId
    };
    
    // Prepare permissions data
    const permissions: PermissionData[] = [];
    
    user.roles.forEach(role => {
      role.permissions.forEach(perm => {
        permissions.push({
          grouping: perm.grouping,
          code: perm.code,
          entityName: perm.entityName,
          actionName: perm.actionName
        });
      });
    });
    
    // Return token response
    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      tokenType: 'Bearer',
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      roles: user.roles.map(r => r.name),
      permissions,
      userBasicInfo
    };
  } catch (error) {
    logger.error('Token generation error:', error);
    throw new AuthenticationError('Failed to generate tokens');
  }
}

/**
 * Create a new user
 * @param userInput User creation input
 * @param createdBy User ID of creator
 * @param tenantId Optional tenant ID
 * @returns Created user ID
 */
export async function createUser(
  userInput: UserInput,
  createdBy: string,
  tenantId?: string
): Promise<string> {
  return await db.transaction(async (client) => {
    try {
      // Validate password requirements
      const { newPassword, repeatPassword } = userInput;
      
      // Check if passwords match
      if (newPassword !== repeatPassword) {
        throw new PasswordMismatchError();
      }
      
      // Check password requirements
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new PasswordRequirementsError(passwordValidation.message);
      }
      
      // Check if username already exists
      const usernameCheck = await client.query(
        'SELECT id FROM app_user WHERE username = $1',
        [userInput.username]
      );
      
      if (usernameCheck.rowCount > 0) {
        throw new Error('Username already exists');
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Insert user
      const userInsert = await client.query(
        `INSERT INTO app_user (
          username, email, firstname, lastname, password, 
          password_never_expires, office_id, staff_id, tenant_id, 
          created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id`,
        [
          userInput.username,
          userInput.email,
          userInput.firstname,
          userInput.lastname,
          passwordHash,
          userInput.isSelfServiceUser || false,
          userInput.officeId,
          userInput.staffId,
          tenantId,
          createdBy
        ]
      );
      
      const userId = userInsert.rows[0].id;
      
      // Assign roles
      for (const roleId of userInput.roles) {
        await client.query(
          'INSERT INTO user_role (app_user_id, role_id) VALUES ($1, $2)',
          [userId, roleId]
        );
      }
      
      return userId;
    } catch (error) {
      logger.error('User creation error:', error);
      
      if (error instanceof PasswordMismatchError ||
          error instanceof PasswordRequirementsError) {
        throw error;
      }
      
      throw new Error(`Failed to create user: ${error.message}`);
    }
  });
}

/**
 * Change user password
 * @param userId User ID
 * @param passwordInput Password change input
 * @returns Success status
 */
export async function changePassword(
  userId: string,
  passwordInput: PasswordChangeInput
): Promise<boolean> {
  return await db.transaction(async (client) => {
    try {
      // Get current password hash
      const userQuery = await client.query(
        'SELECT password as password_hash FROM app_user WHERE id = $1',
        [userId]
      );
      
      if (userQuery.rowCount === 0) {
        throw new Error('User not found');
      }
      
      const user = userQuery.rows[0];
      
      // Verify old password
      const passwordMatch = await bcrypt.compare(passwordInput.oldPassword, user.password_hash);
      
      if (!passwordMatch) {
        throw new AuthenticationError('Current password is incorrect');
      }
      
      // Check if passwords match
      if (passwordInput.newPassword !== passwordInput.repeatPassword) {
        throw new PasswordMismatchError();
      }
      
      // Check password requirements
      const passwordValidation = validatePassword(passwordInput.newPassword);
      if (!passwordValidation.isValid) {
        throw new PasswordRequirementsError(passwordValidation.message);
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(passwordInput.newPassword, SALT_ROUNDS);
      
      // Update password
      await client.query(
        `UPDATE app_user 
        SET password = $1, 
            last_time_password_updated = NOW(),
            password_expired = false,
            requires_password_reset = false
        WHERE id = $2`,
        [passwordHash, userId]
      );
      
      return true;
    } catch (error) {
      logger.error('Password change error:', error);
      
      if (error instanceof AuthenticationError ||
          error instanceof PasswordMismatchError ||
          error instanceof PasswordRequirementsError) {
        throw error;
      }
      
      throw new Error(`Failed to change password: ${error.message}`);
    }
  });
}

/**
 * Update failed login attempts for a user
 * @param userId User ID
 */
async function updateFailedLoginAttempts(userId: string): Promise<void> {
  try {
    // Get current failed attempt count
    const userQuery = await db.query(
      'SELECT failed_attempt_count FROM app_user WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rowCount === 0) {
      return;
    }
    
    const failedAttempts = userQuery.rows[0].failed_attempt_count + 1;
    const maxFailedAttempts = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5', 10);
    
    // Lock account if max attempts reached
    if (failedAttempts >= maxFailedAttempts) {
      await db.query(
        'UPDATE app_user SET failed_attempt_count = $1, is_locked = true WHERE id = $2',
        [failedAttempts, userId]
      );
    } else {
      await db.query(
        'UPDATE app_user SET failed_attempt_count = $1 WHERE id = $2',
        [failedAttempts, userId]
      );
    }
  } catch (error) {
    logger.error('Failed to update login attempts:', error);
  }
}

/**
 * Reset failed login attempts for a user
 * @param userId User ID
 */
async function resetFailedLoginAttempts(userId: string): Promise<void> {
  try {
    await db.query(
      'UPDATE app_user SET failed_attempt_count = 0, last_login = NOW() WHERE id = $1',
      [userId]
    );
  } catch (error) {
    logger.error('Failed to reset login attempts:', error);
  }
}

/**
 * Validate user has required permissions
 * @param userId User ID
 * @param requiredPermissions Array of permission codes
 * @returns True if user has all permissions, false otherwise
 */
export async function validateUserPermissions(
  userId: string,
  requiredPermissions: string[]
): Promise<boolean> {
  try {
    // Get user with roles and permissions
    const userQuery = await db.query(
      `SELECT u.id, u.username
      FROM app_user u
      WHERE u.id = $1 AND u.is_enabled = true AND u.is_deleted = false`,
      [userId]
    );
    
    if (userQuery.rowCount === 0) {
      return false;
    }
    
    const user = userQuery.rows[0] as Partial<User>;
    
    // Get user roles
    const rolesQuery = await db.query(
      `SELECT r.id, r.name, r.is_disabled
      FROM role r
      JOIN user_role ur ON r.id = ur.role_id
      WHERE ur.app_user_id = $1 AND r.is_disabled = false`,
      [userId]
    );
    
    const roles = rolesQuery.rows;
    
    // Check for super user role
    if (roles.some(role => role.name === 'Super user')) {
      return true;
    }
    
    // Get all user permissions
    const permQuery = await db.query(
      `SELECT DISTINCT p.code
      FROM permission p
      JOIN role_permission rp ON p.id = rp.permission_id
      JOIN role r ON rp.role_id = r.id
      JOIN user_role ur ON r.id = ur.role_id
      WHERE ur.app_user_id = $1
        AND r.is_disabled = false
        AND p.is_disabled = false`,
      [userId]
    );
    
    const userPermissions = new Set(permQuery.rows.map(p => p.code));
    
    // Check if user has all required permissions
    return requiredPermissions.every(permission => userPermissions.has(permission));
  } catch (error) {
    logger.error('Permission validation error:', error);
    return false;
  }
}