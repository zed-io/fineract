import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import {
  ApiClient,
  AccessToken,
  ApiClientRegistrationRequest,
  ApiClientRegistrationResponse,
  TokenRequest,
  TokenResponse,
  GrantType,
  ApiClientListResponse
} from '../../models/integration/apiClient';

/**
 * Service for managing API client registrations and authentication
 */
export class ApiClientService {
  // Default token expiration times (in seconds)
  private readonly DEFAULT_ACCESS_TOKEN_VALIDITY = 3600;  // 1 hour
  private readonly DEFAULT_REFRESH_TOKEN_VALIDITY = 86400;  // 24 hours
  
  // Secret used for signing JWT tokens - should come from environment variable in production
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fineract-api-jwt-secret-key';
  
  /**
   * Register a new API client
   * 
   * @param request The client registration request
   * @param userId The ID of the user registering the client
   * @returns The registration response with client credentials
   */
  async registerClient(
    request: ApiClientRegistrationRequest, 
    userId?: string
  ): Promise<ApiClientRegistrationResponse> {
    logger.info('Registering API client', { name: request.name });
    
    try {
      return db.transaction(async (client) => {
        // Generate client ID and secret
        const clientId = this.generateClientId();
        const clientSecret = this.generateClientSecret();
        
        // Set default values
        const accessTokenValidity = request.accessTokenValidity || this.DEFAULT_ACCESS_TOKEN_VALIDITY;
        const refreshTokenValidity = request.refreshTokenValidity || this.DEFAULT_REFRESH_TOKEN_VALIDITY;
        const autoApprove = request.autoApprove !== undefined ? request.autoApprove : false;
        
        // Insert client record
        const result = await client.query(
          `INSERT INTO fineract_default.integration_api_client (
            id, name, description, client_id, client_secret, redirect_uris, 
            allowed_grant_types, access_token_validity, refresh_token_validity, 
            scope, auto_approve, is_active, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
           RETURNING id, created_date`,
          [
            uuidv4(),
            request.name,
            request.description,
            clientId,
            clientSecret,
            request.redirectUris || null,
            request.allowedGrantTypes,
            accessTokenValidity,
            refreshTokenValidity,
            request.scope || null,
            autoApprove,
            true,  // is_active
            userId
          ]
        );
        
        const newClient = result.rows[0];
        
        return {
          id: newClient.id,
          name: request.name,
          clientId,
          clientSecret,
          redirectUris: request.redirectUris,
          allowedGrantTypes: request.allowedGrantTypes,
          accessTokenValidity,
          refreshTokenValidity,
          scope: request.scope,
          autoApprove,
          isActive: true,
          createdDate: newClient.created_date
        };
      });
    } catch (error) {
      logger.error('Error registering API client', { error });
      throw new Error(`Failed to register API client: ${error.message}`);
    }
  }
  
  /**
   * Update an existing API client
   * 
   * @param clientId The ID of the client to update
   * @param request The update request
   * @param userId The ID of the user updating the client
   * @returns Success indicator
   */
  async updateClient(
    clientId: string,
    request: Partial<ApiClientRegistrationRequest>,
    userId?: string
  ): Promise<boolean> {
    logger.info('Updating API client', { clientId });
    
    try {
      return db.transaction(async (client) => {
        // Check if client exists
        const existingQuery = await client.query(
          `SELECT id FROM fineract_default.integration_api_client 
           WHERE id = $1`,
          [clientId]
        );
        
        if (existingQuery.rows.length === 0) {
          throw new Error(`API client with ID ${clientId} not found`);
        }
        
        // Build update fields
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        if (request.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(request.name);
        }
        
        if (request.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(request.description);
        }
        
        if (request.redirectUris !== undefined) {
          updates.push(`redirect_uris = $${paramIndex++}`);
          values.push(request.redirectUris);
        }
        
        if (request.allowedGrantTypes !== undefined) {
          updates.push(`allowed_grant_types = $${paramIndex++}`);
          values.push(request.allowedGrantTypes);
        }
        
        if (request.accessTokenValidity !== undefined) {
          updates.push(`access_token_validity = $${paramIndex++}`);
          values.push(request.accessTokenValidity);
        }
        
        if (request.refreshTokenValidity !== undefined) {
          updates.push(`refresh_token_validity = $${paramIndex++}`);
          values.push(request.refreshTokenValidity);
        }
        
        if (request.scope !== undefined) {
          updates.push(`scope = $${paramIndex++}`);
          values.push(request.scope);
        }
        
        if (request.autoApprove !== undefined) {
          updates.push(`auto_approve = $${paramIndex++}`);
          values.push(request.autoApprove);
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
        values.push(clientId);
        await client.query(
          `UPDATE fineract_default.integration_api_client 
           SET ${updates.join(', ')} 
           WHERE id = $${paramIndex}`,
          values
        );
        
        return true;
      });
    } catch (error) {
      logger.error('Error updating API client', { error, clientId });
      throw new Error(`Failed to update API client: ${error.message}`);
    }
  }
  
  /**
   * Delete an API client
   * 
   * @param clientId The ID of the client to delete
   * @returns Success indicator
   */
  async deleteClient(clientId: string): Promise<boolean> {
    logger.info('Deleting API client', { clientId });
    
    try {
      return db.transaction(async (client) => {
        // Check if client exists
        const existingQuery = await client.query(
          `SELECT id FROM fineract_default.integration_api_client 
           WHERE id = $1`,
          [clientId]
        );
        
        if (existingQuery.rows.length === 0) {
          throw new Error(`API client with ID ${clientId} not found`);
        }
        
        // Delete access tokens first
        await client.query(
          `DELETE FROM fineract_default.integration_access_token 
           WHERE client_id = $1`,
          [clientId]
        );
        
        // Delete client
        await client.query(
          `DELETE FROM fineract_default.integration_api_client 
           WHERE id = $1`,
          [clientId]
        );
        
        return true;
      });
    } catch (error) {
      logger.error('Error deleting API client', { error, clientId });
      throw new Error(`Failed to delete API client: ${error.message}`);
    }
  }
  
  /**
   * Get an API client by ID
   * 
   * @param clientId The ID of the client to retrieve
   * @returns The client configuration
   */
  async getClient(clientId: string): Promise<ApiClient> {
    logger.info('Getting API client', { clientId });
    
    try {
      const result = await db.query(
        `SELECT 
          id, name, description, client_id, client_secret, redirect_uris, 
          allowed_grant_types, access_token_validity, refresh_token_validity, 
          scope, auto_approve, is_active, created_by, created_date, 
          updated_by, updated_date
         FROM fineract_default.integration_api_client 
         WHERE id = $1`,
        [clientId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`API client with ID ${clientId} not found`);
      }
      
      const client = result.rows[0];
      
      return {
        id: client.id,
        name: client.name,
        description: client.description,
        clientId: client.client_id,
        clientSecret: client.client_secret,
        redirectUris: client.redirect_uris,
        allowedGrantTypes: client.allowed_grant_types,
        accessTokenValidity: client.access_token_validity,
        refreshTokenValidity: client.refresh_token_validity,
        scope: client.scope,
        autoApprove: client.auto_approve,
        isActive: client.is_active,
        createdBy: client.created_by,
        createdDate: client.created_date,
        updatedBy: client.updated_by,
        updatedDate: client.updated_date
      };
    } catch (error) {
      logger.error('Error getting API client', { error, clientId });
      throw new Error(`Failed to get API client: ${error.message}`);
    }
  }
  
  /**
   * Get an API client by client ID (not UUID)
   * 
   * @param clientId The client ID string
   * @returns The client configuration
   */
  async getClientByClientId(clientId: string): Promise<ApiClient> {
    logger.info('Getting API client by client ID', { clientId });
    
    try {
      const result = await db.query(
        `SELECT 
          id, name, description, client_id, client_secret, redirect_uris, 
          allowed_grant_types, access_token_validity, refresh_token_validity, 
          scope, auto_approve, is_active, created_by, created_date, 
          updated_by, updated_date
         FROM fineract_default.integration_api_client 
         WHERE client_id = $1`,
        [clientId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`API client with client ID ${clientId} not found`);
      }
      
      const client = result.rows[0];
      
      return {
        id: client.id,
        name: client.name,
        description: client.description,
        clientId: client.client_id,
        clientSecret: client.client_secret,
        redirectUris: client.redirect_uris,
        allowedGrantTypes: client.allowed_grant_types,
        accessTokenValidity: client.access_token_validity,
        refreshTokenValidity: client.refresh_token_validity,
        scope: client.scope,
        autoApprove: client.auto_approve,
        isActive: client.is_active,
        createdBy: client.created_by,
        createdDate: client.created_date,
        updatedBy: client.updated_by,
        updatedDate: client.updated_date
      };
    } catch (error) {
      logger.error('Error getting API client by client ID', { error, clientId });
      throw new Error(`Failed to get API client by client ID: ${error.message}`);
    }
  }
  
  /**
   * List all API clients with pagination
   * 
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @param activeOnly Whether to only return active clients
   * @returns List of clients with pagination info
   */
  async listClients(
    page: number = 1, 
    pageSize: number = 20, 
    activeOnly?: boolean
  ): Promise<ApiClientListResponse> {
    logger.info('Listing API clients', { page, pageSize, activeOnly });
    
    try {
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (activeOnly !== undefined) {
        whereClause = `WHERE is_active = $${paramIndex++}`;
        params.push(activeOnly);
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM fineract_default.integration_api_client 
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);
      
      // Calculate pagination
      const offset = (page - 1) * pageSize;
      
      // Get clients
      const query = `
        SELECT 
          id, name, description, client_id, client_secret, redirect_uris, 
          allowed_grant_types, access_token_validity, refresh_token_validity, 
          scope, auto_approve, is_active, created_by, created_date, 
          updated_by, updated_date
        FROM fineract_default.integration_api_client 
        ${whereClause}
        ORDER BY created_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(pageSize, offset);
      
      const result = await db.query(query, params);
      
      const clients = result.rows.map(client => ({
        id: client.id,
        name: client.name,
        description: client.description,
        clientId: client.client_id,
        clientSecret: client.client_secret,
        redirectUris: client.redirect_uris,
        allowedGrantTypes: client.allowed_grant_types,
        accessTokenValidity: client.access_token_validity,
        refreshTokenValidity: client.refresh_token_validity,
        scope: client.scope,
        autoApprove: client.auto_approve,
        isActive: client.is_active,
        createdBy: client.created_by,
        createdDate: client.created_date,
        updatedBy: client.updated_by,
        updatedDate: client.updated_date
      }));
      
      return {
        clients,
        total
      };
    } catch (error) {
      logger.error('Error listing API clients', { error });
      throw new Error(`Failed to list API clients: ${error.message}`);
    }
  }
  
  /**
   * Generate access token (OAuth2 token endpoint)
   * 
   * @param request The token request
   * @returns The token response
   */
  async generateToken(request: TokenRequest): Promise<TokenResponse> {
    logger.info('Generating token', { grantType: request.grant_type, clientId: request.client_id });
    
    try {
      // Validate client credentials
      const clientQuery = await db.query(
        `SELECT 
          id, client_id, client_secret, allowed_grant_types, 
          access_token_validity, refresh_token_validity, scope, is_active
         FROM fineract_default.integration_api_client 
         WHERE client_id = $1 AND client_secret = $2`,
        [request.client_id, request.client_secret]
      );
      
      if (clientQuery.rows.length === 0) {
        throw new Error('Invalid client credentials');
      }
      
      const client = clientQuery.rows[0];
      
      // Check if client is active
      if (!client.is_active) {
        throw new Error('Client is inactive');
      }
      
      // Check if grant type is allowed
      if (!client.allowed_grant_types.includes(request.grant_type)) {
        throw new Error(`Grant type '${request.grant_type}' not allowed for this client`);
      }
      
      // Handle different grant types
      let userId: string | undefined;
      let userAuth: any | undefined;
      let tokenScopes: string[] | undefined = request.scope ? request.scope.split(' ') : client.scope;
      
      switch (request.grant_type) {
        case GrantType.CLIENT_CREDENTIALS:
          // Client credentials grant - no user authentication
          break;
          
        case GrantType.PASSWORD:
          // Password grant - validate user credentials
          if (!request.username || !request.password) {
            throw new Error('Username and password required for password grant');
          }
          
          const userQuery = await db.query(
            `SELECT 
              id, username, password_never_expires, account_non_expired, 
              account_non_locked, is_deleted
             FROM fineract_default.m_appuser 
             WHERE username = $1`,
            [request.username]
          );
          
          if (userQuery.rows.length === 0) {
            throw new Error('Invalid username or password');
          }
          
          const user = userQuery.rows[0];
          
          // Would normally validate password hash here
          // For this example, we'll skip actual password validation
          
          // Check user account status
          if (user.is_deleted) {
            throw new Error('User account is deleted');
          }
          
          if (!user.account_non_expired) {
            throw new Error('User account has expired');
          }
          
          if (!user.account_non_locked) {
            throw new Error('User account is locked');
          }
          
          userId = user.id;
          userAuth = {
            username: request.username,
            authorities: [],  // Would load from database
            authenticated: true
          };
          break;
          
        case GrantType.REFRESH_TOKEN:
          // Refresh token grant - validate refresh token
          if (!request.refresh_token) {
            throw new Error('Refresh token required for refresh_token grant');
          }
          
          const tokenQuery = await db.query(
            `SELECT 
              client_id, user_id, authentication, scope
             FROM fineract_default.integration_access_token 
             WHERE refresh_token = $1 AND expires_at > NOW()`,
            [request.refresh_token]
          );
          
          if (tokenQuery.rows.length === 0) {
            throw new Error('Invalid or expired refresh token');
          }
          
          const tokenData = tokenQuery.rows[0];
          
          // Check that refresh token belongs to this client
          if (tokenData.client_id !== client.id) {
            throw new Error('Refresh token was not issued to this client');
          }
          
          userId = tokenData.user_id;
          userAuth = tokenData.authentication ? tokenData.authentication : undefined;
          tokenScopes = tokenData.scope;
          break;
          
        case GrantType.AUTHORIZATION_CODE:
          // For this example, we'll skip authorization code implementation
          throw new Error('Authorization code grant not implemented in this example');
          
        default:
          throw new Error(`Unsupported grant type: ${request.grant_type}`);
      }
      
      // Generate token data
      const accessTokenExpiresIn = client.access_token_validity;
      const expiresAt = new Date(Date.now() + (accessTokenExpiresIn * 1000));
      
      // Generate JWT token
      const tokenPayload = {
        sub: userId || client.client_id,
        aud: client.client_id,
        exp: Math.floor(expiresAt.getTime() / 1000),
        iat: Math.floor(Date.now() / 1000),
        scope: tokenScopes,
        client_id: client.client_id,
        jti: uuidv4()
      };
      
      const accessToken = jwt.sign(tokenPayload, this.JWT_SECRET);
      
      // Generate refresh token if needed
      let refreshToken: string | undefined;
      
      if (request.grant_type !== GrantType.CLIENT_CREDENTIALS) {
        refreshToken = this.generateRefreshToken();
      }
      
      // Store token in database
      await db.query(
        `INSERT INTO fineract_default.integration_access_token (
          id, client_id, user_id, token, authentication, refresh_token,
          token_type, scope, expires_at, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          uuidv4(),
          client.id,
          userId,
          accessToken,
          userAuth ? JSON.stringify(userAuth) : null,
          refreshToken,
          'Bearer',
          tokenScopes,
          expiresAt
        ]
      );
      
      // Return token response
      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: accessTokenExpiresIn,
        refresh_token: refreshToken,
        scope: tokenScopes ? tokenScopes.join(' ') : undefined
      };
    } catch (error) {
      logger.error('Error generating token', { error, grantType: request.grant_type });
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }
  
  /**
   * Validate an access token
   * 
   * @param token The token to validate
   * @returns The token information if valid
   */
  async validateToken(token: string): Promise<{
    clientId: string;
    userId?: string;
    scope?: string[];
    expiresAt: Date;
  }> {
    logger.info('Validating token');
    
    try {
      // Check token in database
      const tokenQuery = await db.query(
        `SELECT 
          client_id, user_id, scope, expires_at
         FROM fineract_default.integration_access_token 
         WHERE token = $1 AND expires_at > NOW()`,
        [token]
      );
      
      if (tokenQuery.rows.length === 0) {
        throw new Error('Invalid or expired token');
      }
      
      const tokenData = tokenQuery.rows[0];
      
      // Verify JWT token
      try {
        jwt.verify(token, this.JWT_SECRET);
      } catch (error) {
        throw new Error('Invalid token signature');
      }
      
      return {
        clientId: tokenData.client_id,
        userId: tokenData.user_id,
        scope: tokenData.scope,
        expiresAt: tokenData.expires_at
      };
    } catch (error) {
      logger.error('Error validating token', { error });
      throw new Error(`Failed to validate token: ${error.message}`);
    }
  }
  
  /**
   * Revoke an access token
   * 
   * @param token The token to revoke
   * @returns Success indicator
   */
  async revokeToken(token: string): Promise<boolean> {
    logger.info('Revoking token');
    
    try {
      // Delete token from database
      const result = await db.query(
        `DELETE FROM fineract_default.integration_access_token 
         WHERE token = $1
         RETURNING id`,
        [token]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error revoking token', { error });
      throw new Error(`Failed to revoke token: ${error.message}`);
    }
  }
  
  /**
   * Generate a client ID
   * 
   * @returns A new client ID
   */
  private generateClientId(): string {
    return `fineract-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }
  
  /**
   * Generate a client secret
   * 
   * @returns A new client secret
   */
  private generateClientSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Generate a refresh token
   * 
   * @returns A new refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Create and export singleton instance
export const apiClientService = new ApiClientService();