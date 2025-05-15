/**
 * FetchAuthService
 * Authentication service implementation using the Fetch API for HTTP requests
 * This is suitable for React/Next.js applications
 */

import {
  AuthCredentials,
  AuthMethod,
  AuthToken,
  AuthUser,
  TwoFactorRequest,
  TwoFactorToken,
  AuthState,
  AuthStorage,
  HasuraJwtPayload
} from './models';
import { AuthServiceCore, AuthConfig } from './auth-service';

/**
 * Authentication Service for React/Next.js applications
 * Uses the Fetch API for HTTP requests
 */
export class FetchAuthService extends AuthServiceCore {
  /**
   * Create a new FetchAuthService
   */
  constructor(
    storage: AuthStorage,
    sessionStorage: AuthStorage,
    config: AuthConfig
  ) {
    super(storage, sessionStorage, config);
  }

  /**
   * Authenticate with username and password
   * @param credentials User credentials
   */
  public async authenticate(credentials: AuthCredentials): Promise<AuthState> {
    try {
      this.updateState({ 
        status: 'authenticating',
        rememberMe: !!credentials.rememberMe,
        tenantId: credentials.tenantId || this.state.tenantId
      });

      // Base64 encode credentials for basic auth
      const encodedCredentials = btoa(`${credentials.username}:${credentials.password}`);
      
      // Authenticate with Fineract API
      const response = await fetch(`${this.config.apiUrl}/authentication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encodedCredentials}`,
          'Fineract-Platform-TenantId': this.state.tenantId,
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.defaultUserMessage || 'Authentication failed');
      }

      const authData = await response.json();
      
      // Create user object from response
      const user: AuthUser = {
        id: authData.userId,
        username: credentials.username,
        displayName: authData.username || credentials.username,
        roles: authData.roles || [],
        permissions: authData.permissions || [],
        officeId: authData.officeId,
        officeName: authData.officeName,
        staffId: authData.staffId,
        staffDisplayName: authData.staffDisplayName,
      };

      // Create token object
      const token: AuthToken = {
        accessToken: authData.base64EncodedAuthenticationKey || encodedCredentials,
        tokenType: 'Basic',
        expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours by default
      };

      // Update state with authentication data
      this.updateState({
        status: 'authenticated',
        user,
        token,
        authMethod: 'basic',
        isTwoFactorRequired: authData.isTwoFactorAuthenticationRequired || false,
        isPasswordExpired: authData.shouldRenewPassword || false
      });

      // If Hasura integration is enabled, try to get a JWT token
      if (this.config.hasuraUrl && !this.state.isTwoFactorRequired && !this.state.isPasswordExpired) {
        try {
          await this.generateHasuraToken();
        } catch (error) {
          console.warn('Failed to generate Hasura token:', error);
          // Continue with basic auth even if Hasura token generation fails
        }
      }

      return this.state;

    } catch (error: any) {
      this.updateState({ 
        status: 'failed',
      });
      throw error;
    }
  }

  /**
   * OAuth2 authentication (if configured)
   * @param credentials User credentials
   */
  public async authenticateWithOAuth2(credentials: AuthCredentials): Promise<AuthState> {
    try {
      if (!this.config.oauthConfig?.enabled) {
        throw new Error('OAuth2 is not enabled');
      }

      this.updateState({ 
        status: 'authenticating',
        rememberMe: !!credentials.rememberMe,
        tenantId: credentials.tenantId || this.state.tenantId
      });

      // Prepare form data for OAuth request
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      formData.append('client_id', this.config.oauthConfig.appId);
      formData.append('grant_type', 'password');

      // Get OAuth2 token
      const tokenResponse = await fetch(`${this.config.oauthConfig.serverUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => null);
        throw new Error(errorData?.error_description || 'OAuth authentication failed');
      }

      const tokenData = await tokenResponse.json();

      // Get user details with the token
      const userResponse = await fetch(`${this.config.apiUrl}/userdetails`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Fineract-Platform-TenantId': this.state.tenantId,
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user details');
      }

      const userData = await userResponse.json();

      // Create user object
      const user: AuthUser = {
        id: userData.userId,
        username: credentials.username,
        displayName: userData.username || credentials.username,
        roles: userData.roles || [],
        permissions: userData.permissions || [],
        officeId: userData.officeId,
        officeName: userData.officeName,
        staffId: userData.staffId,
        staffDisplayName: userData.staffDisplayName,
      };

      // Create token object
      const token: AuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope
      };

      // Update state with authentication data
      this.updateState({
        status: 'authenticated',
        user,
        token,
        authMethod: 'oauth2',
        isTwoFactorRequired: userData.isTwoFactorAuthenticationRequired || false,
        isPasswordExpired: userData.shouldRenewPassword || false
      });

      return this.state;

    } catch (error: any) {
      this.updateState({ 
        status: 'failed',
      });
      throw error;
    }
  }

  /**
   * Refresh the current authentication token
   */
  public async refreshToken(): Promise<AuthToken | null> {
    if (!this.state.token) {
      return null;
    }

    try {
      if (this.state.authMethod === 'oauth2' && this.state.token.refreshToken) {
        if (!this.config.oauthConfig?.enabled) {
          throw new Error('OAuth2 is not enabled');
        }

        // Prepare form data for OAuth refresh
        const formData = new URLSearchParams();
        formData.append('refresh_token', this.state.token.refreshToken);
        formData.append('client_id', this.config.oauthConfig.appId);
        formData.append('grant_type', 'refresh_token');

        // Refresh OAuth2 token
        const response = await fetch(`${this.config.oauthConfig.serverUrl}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });

        if (!response.ok) {
          throw new Error('Failed to refresh OAuth token');
        }

        const tokenData = await response.json();

        // Create new token object
        const newToken: AuthToken = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type || 'Bearer',
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
          scope: tokenData.scope
        };

        // Update state with new token
        this.updateState({
          token: newToken,
          status: 'authenticated'
        });

        return newToken;

      } else if (this.state.authMethod === 'jwt') {
        // For JWT auth, try to refresh the token if the API supports it
        try {
          const response = await fetch(`${this.config.apiUrl}/refresh-token`, {
            method: 'POST',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const tokenData = await response.json();
            
            // Create new token object
            const newToken: AuthToken = {
              accessToken: tokenData.token,
              tokenType: 'Bearer',
              expiresAt: tokenData.expiresAt || (Date.now() + (8 * 60 * 60 * 1000))
            };

            // Update state with new token
            this.updateState({
              token: newToken,
              status: 'authenticated'
            });

            return newToken;
          }
        } catch (error) {
          console.error('Error refreshing JWT token:', error);
        }

        // If direct refresh failed, try to generate a fresh Hasura token
        if (this.config.hasuraUrl) {
          return this.generateHasuraToken();
        }
      }

      // For other auth methods or if refresh failed, return null
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Request a two-factor authentication code
   * @param request Two-factor request details
   */
  public async requestTwoFactorCode(request: TwoFactorRequest): Promise<void> {
    if (!this.state.isTwoFactorRequired || !this.state.token) {
      throw new Error('Two-factor authentication is not required');
    }

    // Create query parameters
    const params = new URLSearchParams();
    params.append('deliveryMethod', request.deliveryMethod);
    params.append('extendedToken', request.extendedToken ? 'true' : 'false');

    // Request 2FA code
    const response = await fetch(`${this.config.apiUrl}/twofactor?${params.toString()}`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.defaultUserMessage || 'Failed to request two-factor code');
    }
  }

  /**
   * Validate a two-factor authentication code
   * @param code The 2FA code to validate
   */
  public async validateTwoFactorCode(code: string): Promise<TwoFactorToken> {
    if (!this.state.isTwoFactorRequired || !this.state.token) {
      throw new Error('Two-factor authentication is not required');
    }

    // Create query parameters
    const params = new URLSearchParams();
    params.append('token', code);

    // Validate 2FA code
    const response = await fetch(`${this.config.apiUrl}/twofactor/validate?${params.toString()}`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.defaultUserMessage || 'Invalid two-factor code');
    }

    const tokenData = await response.json();
    
    // Create two-factor token
    const twoFactorToken: TwoFactorToken = {
      token: tokenData.token,
      validTo: tokenData.validTo || (Date.now() + (90 * 24 * 60 * 60 * 1000)) // Default 90 days
    };

    // Update state with two-factor token
    this.updateState({
      twoFactorToken,
      isTwoFactorRequired: false,
      status: 'authenticated'
    });

    // If Hasura integration is enabled and password is not expired, get a Hasura token
    if (this.config.hasuraUrl && !this.state.isPasswordExpired) {
      try {
        await this.generateHasuraToken();
      } catch (error) {
        console.warn('Failed to generate Hasura token after 2FA:', error);
        // Continue even if Hasura token generation fails
      }
    }

    return twoFactorToken;
  }

  /**
   * Reset user password
   * @param userId User ID
   * @param newPassword New password
   * @param confirmPassword Confirm password
   */
  public async resetPassword(userId: string, newPassword: string, confirmPassword: string): Promise<void> {
    if (!this.state.isPasswordExpired || !this.state.token) {
      throw new Error('Password reset is not required');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Password details
    const passwordDetails = {
      password: newPassword,
      repeatPassword: confirmPassword
    };

    // Reset password
    const response = await fetch(`${this.config.apiUrl}/users/${userId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(passwordDetails)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.defaultUserMessage || 'Failed to reset password');
    }

    // Update state
    this.updateState({
      isPasswordExpired: false
    });

    // If 2FA is not required and Hasura integration is enabled, get a Hasura token
    if (!this.state.isTwoFactorRequired && this.config.hasuraUrl) {
      try {
        await this.generateHasuraToken();
      } catch (error) {
        console.warn('Failed to generate Hasura token after password reset:', error);
        // Continue even if Hasura token generation fails
      }
    }
  }

  /**
   * Generate a Hasura-compatible JWT token from the current authentication
   */
  public async generateHasuraToken(): Promise<AuthToken> {
    if (!this.state.user || !this.state.token) {
      throw new Error('Not authenticated');
    }

    try {
      // Get Hasura token from API
      const response = await fetch('/api/hasura-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${this.state.token.tokenType} ${this.state.token.accessToken}`,
          'Fineract-Platform-TenantId': this.state.tenantId
        },
        body: JSON.stringify({
          userId: this.state.user.id,
          username: this.state.user.username,
          officeId: this.state.user.officeId,
          roles: this.state.user.roles
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate Hasura token');
      }

      const tokenData = await response.json();
      
      // Create token object
      const token: AuthToken = {
        accessToken: tokenData.token,
        tokenType: 'Bearer',
        expiresAt: tokenData.expiresAt || (Date.now() + (8 * 60 * 60 * 1000))
      };

      // Update state with JWT token
      this.updateState({
        token,
        authMethod: 'jwt'
      });

      return token;
    } catch (error) {
      console.error('Error generating Hasura token:', error);
      throw error;
    }
  }

  /**
   * Logout the current user
   */
  public async logout(): Promise<void> {
    try {
      if (this.state.twoFactorToken?.token) {
        // Invalidate 2FA token if present
        try {
          await fetch(`${this.config.apiUrl}/twofactor/invalidate`, {
            method: 'POST',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: this.state.twoFactorToken.token })
          });
        } catch (error) {
          console.warn('Failed to invalidate 2FA token:', error);
        }
      }

      if (this.state.authMethod === 'oauth2' && this.state.token?.refreshToken) {
        // Logout OAuth2 session if present
        try {
          const formData = new URLSearchParams();
          formData.append('refresh_token', this.state.token.refreshToken);
          formData.append('client_id', this.config.oauthConfig?.appId || '');

          await fetch(`${this.config.oauthConfig?.serverUrl}/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
          });
        } catch (error) {
          console.warn('Failed to logout OAuth session:', error);
        }
      }
    } finally {
      // Clear auth state regardless of API call success
      this.clearAuth();
    }
  }
}