/**
 * Shared Authentication Service
 * Core implementation that can be used across different front-end frameworks
 */

import {
  AuthMethod,
  AuthStatus,
  AuthUser,
  AuthCredentials,
  AuthToken,
  AuthState,
  TwoFactorRequest,
  TwoFactorToken,
  AuthStorage
} from './models';

// Default configuration
export interface AuthConfig {
  apiUrl: string;
  hasuraUrl?: string;
  oauthConfig?: {
    enabled: boolean;
    serverUrl: string;
    appId: string;
  };
  defaultTenantId: string;
  storageKeys: {
    auth: string;
    token: string;
    twoFactor: string;
  };
  tokenRefreshThreshold: number; // Time in milliseconds before expiry to trigger refresh (default: 5 minutes)
}

/**
 * Core Authentication Service
 * This is a framework-agnostic implementation that can be used by both Angular and React
 */
export class AuthServiceCore {
  private storage: AuthStorage;
  private sessionStorage: AuthStorage;
  private config: AuthConfig;
  
  // Default initial state
  protected state: AuthState = {
    status: 'init',
    user: null,
    token: null,
    twoFactorToken: null,
    tenantId: 'default',
    authMethod: 'none',
    rememberMe: false,
    isTwoFactorRequired: false,
    isPasswordExpired: false
  };

  constructor(
    storage: AuthStorage,
    sessionStorage: AuthStorage,
    config: AuthConfig
  ) {
    this.storage = storage;
    this.sessionStorage = sessionStorage;
    this.config = {
      ...config,
      tokenRefreshThreshold: config.tokenRefreshThreshold || 5 * 60 * 1000 // Default: 5 minutes
    };
    
    // Initialize state from storage
    this.loadStateFromStorage();
  }

  /**
   * Load authentication state from persistent storage
   */
  protected loadStateFromStorage(): void {
    // First check session storage
    let storedAuthData = this.sessionStorage.getItem(this.config.storageKeys.auth);
    
    // If not in session storage, check persistent storage
    if (!storedAuthData) {
      storedAuthData = this.storage.getItem(this.config.storageKeys.auth);
    }
    
    if (storedAuthData) {
      try {
        const parsedAuthData = JSON.parse(storedAuthData);
        this.state = {
          ...this.state,
          ...parsedAuthData,
          // Ensure consistent behavior on load
          status: parsedAuthData.token ? 'authenticated' : 'logged_out'
        };
        
        // Determine storage based on rememberMe flag
        this.storage = this.state.rememberMe ? this.storage : this.sessionStorage;
      } catch (error) {
        console.error('Failed to parse stored auth data:', error);
        this.clearAuth();
      }
    }
    
    // Check if token is expired
    if (this.state.token?.expiresAt && this.state.token.expiresAt <= Date.now()) {
      // Token is expired, attempt to refresh or clear auth
      this.refreshToken().catch(() => this.clearAuth());
    }
  }

  /**
   * Save current state to the appropriate storage
   */
  protected saveStateToStorage(): void {
    const storageToUse = this.state.rememberMe ? this.storage : this.sessionStorage;
    
    // Save auth state without sensitive data
    const stateToSave = {
      ...this.state,
      // Don't persist password or other sensitive data
      password: undefined
    };
    
    storageToUse.setItem(this.config.storageKeys.auth, JSON.stringify(stateToSave));
  }

  /**
   * Get HTTP headers based on current authentication state
   */
  public getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Fineract-Platform-TenantId': this.state.tenantId
    };
    
    if (!this.state.token?.accessToken) {
      return headers;
    }
    
    switch (this.state.authMethod) {
      case 'jwt':
      case 'oauth2':
        headers['Authorization'] = `Bearer ${this.state.token.accessToken}`;
        break;
      case 'basic':
        headers['Authorization'] = `Basic ${this.state.token.accessToken}`;
        break;
      case 'firebase':
        headers['Authorization'] = `Bearer ${this.state.token.accessToken}`;
        break;
    }
    
    // Add two-factor token if available
    if (this.state.twoFactorToken?.token) {
      headers['Fineract-TwoFactorToken'] = this.state.twoFactorToken.token;
    }
    
    return headers;
  }
  
  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return (
      this.state.status === 'authenticated' && 
      !!this.state.token?.accessToken &&
      (!this.state.token.expiresAt || this.state.token.expiresAt > Date.now()) &&
      this.isTwoFactorValid()
    );
  }
  
  /**
   * Check if two-factor token is valid
   */
  public isTwoFactorValid(): boolean {
    // If 2FA is not required, it's valid
    if (!this.state.isTwoFactorRequired) {
      return true;
    }
    
    // If required but no token, it's invalid
    if (!this.state.twoFactorToken) {
      return false;
    }
    
    // Check if token is expired
    return this.state.twoFactorToken.validTo > Date.now();
  }
  
  /**
   * Check if token needs refreshing
   */
  public needsTokenRefresh(): boolean {
    if (!this.state.token?.expiresAt) {
      return false;
    }
    
    // Check if token will expire soon (within threshold)
    return this.state.token.expiresAt - Date.now() < this.config.tokenRefreshThreshold;
  }

  /**
   * Authenticate with username and password
   * This method should be implemented by platform-specific extensions
   * to handle HTTP requests appropriately
   */
  public async authenticate(credentials: AuthCredentials): Promise<AuthState> {
    throw new Error('authenticate() must be implemented by subclasses');
  }

  /**
   * Refresh the current authentication token
   * This method should be implemented by platform-specific extensions
   */
  public async refreshToken(): Promise<AuthToken | null> {
    throw new Error('refreshToken() must be implemented by subclasses');
  }

  /**
   * Request a two-factor authentication code
   * This method should be implemented by platform-specific extensions
   */
  public async requestTwoFactorCode(request: TwoFactorRequest): Promise<void> {
    throw new Error('requestTwoFactorCode() must be implemented by subclasses');
  }

  /**
   * Validate a two-factor authentication code
   * This method should be implemented by platform-specific extensions
   */
  public async validateTwoFactorCode(code: string): Promise<TwoFactorToken> {
    throw new Error('validateTwoFactorCode() must be implemented by subclasses');
  }

  /**
   * Reset user password
   * This method should be implemented by platform-specific extensions
   */
  public async resetPassword(userId: string, newPassword: string, confirmPassword: string): Promise<void> {
    throw new Error('resetPassword() must be implemented by subclasses');
  }

  /**
   * Generate a Hasura-compatible JWT token from the current authentication
   * This method should be implemented by platform-specific extensions
   */
  public async generateHasuraToken(): Promise<AuthToken> {
    throw new Error('generateHasuraToken() must be implemented by subclasses');
  }

  /**
   * Logout the current user and clear the authentication state
   */
  public clearAuth(): void {
    // Clear state
    this.state = {
      status: 'logged_out',
      user: null,
      token: null,
      twoFactorToken: null,
      tenantId: this.config.defaultTenantId,
      authMethod: 'none',
      rememberMe: false,
      isTwoFactorRequired: false,
      isPasswordExpired: false
    };
    
    // Clear storage
    this.storage.removeItem(this.config.storageKeys.auth);
    this.storage.removeItem(this.config.storageKeys.token);
    this.storage.removeItem(this.config.storageKeys.twoFactor);
    
    this.sessionStorage.removeItem(this.config.storageKeys.auth);
    this.sessionStorage.removeItem(this.config.storageKeys.token);
    this.sessionStorage.removeItem(this.config.storageKeys.twoFactor);
  }
  
  /**
   * Get the current authentication state
   */
  public getState(): AuthState {
    return this.state;
  }
  
  /**
   * Update the authentication state
   */
  protected updateState(newState: Partial<AuthState>): void {
    this.state = {
      ...this.state,
      ...newState
    };
    
    // If rememberMe changed, update storage type
    if (newState.rememberMe !== undefined) {
      this.storage = newState.rememberMe ? this.storage : this.sessionStorage;
    }
    
    // Save to storage
    this.saveStateToStorage();
  }
  
  /**
   * Set the tenant ID for multi-tenant environments
   */
  public setTenantId(tenantId: string): void {
    this.updateState({ tenantId });
  }
  
  /**
   * Get the current user
   */
  public getUser(): AuthUser | null {
    return this.state.user || null;
  }
  
  /**
   * Get the current token
   */
  public getToken(): AuthToken | null {
    return this.state.token || null;
  }
}