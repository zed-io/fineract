/**
 * AngularAuthService
 * Authentication service implementation using Angular's HttpClient for HTTP requests
 * This is suitable for Angular applications
 */

import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

import {
  AuthCredentials,
  AuthMethod,
  AuthState,
  AuthToken,
  AuthUser,
  TwoFactorRequest,
  TwoFactorToken,
  AuthStorage
} from './models';
import { AuthServiceCore, AuthConfig } from './auth-service';

/**
 * Angular-specific tokens for DI
 */
export const STORAGE_TOKEN = 'FineractAuthStorage';
export const SESSION_STORAGE_TOKEN = 'FineractAuthSessionStorage';
export const AUTH_CONFIG_TOKEN = 'FineractAuthConfig';

/**
 * Angular wrapper for browser storage
 */
export class BrowserStorage implements AuthStorage {
  constructor(private storage: Storage) {}

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

/**
 * Authentication Service for Angular applications
 * Uses Angular's HttpClient for HTTP requests
 */
@Injectable()
export class AngularAuthService extends AuthServiceCore {
  // Auth state observable that components can subscribe to
  private authStateSubject = new BehaviorSubject<AuthState>(this.state);
  public authState$ = this.authStateSubject.asObservable();

  /**
   * Create a new AngularAuthService
   */
  constructor(
    private http: HttpClient,
    @Inject(STORAGE_TOKEN) storage: AuthStorage,
    @Inject(SESSION_STORAGE_TOKEN) sessionStorage: AuthStorage,
    @Inject(AUTH_CONFIG_TOKEN) config: AuthConfig
  ) {
    super(storage, sessionStorage, config);
    
    // Emit initial state
    this.authStateSubject.next(this.state);
    
    // Set up automatic token refresh
    this.setupAutoRefresh();
  }

  /**
   * Override updateState to emit state changes
   */
  protected override updateState(newState: Partial<AuthState>): void {
    super.updateState(newState);
    this.authStateSubject.next(this.state);
  }

  /**
   * Set up automatic token refresh
   */
  private setupAutoRefresh(): void {
    // Check if we need to refresh every minute
    setInterval(() => {
      if (this.isAuthenticated() && this.needsTokenRefresh()) {
        this.refreshToken().catch(err => {
          console.error('Auto token refresh failed:', err);
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Authenticate with username and password
   * @param credentials User credentials
   */
  public authenticate(credentials: AuthCredentials): Observable<AuthState> {
    this.updateState({ 
      status: 'authenticating',
      rememberMe: !!credentials.rememberMe,
      tenantId: credentials.tenantId || this.state.tenantId
    });

    // Use OAuth if enabled
    if (this.config.oauthConfig?.enabled) {
      return this.authenticateWithOAuth2(credentials);
    }

    // Base64 encode credentials for Basic Auth
    const encodedCredentials = btoa(`${credentials.username}:${credentials.password}`);
    
    // Authenticate with Fineract API
    return this.http.post(`${this.config.apiUrl}/authentication`, {
      username: credentials.username,
      password: credentials.password
    }, {
      headers: {
        'Fineract-Platform-TenantId': this.state.tenantId,
      }
    }).pipe(
      map((authData: any) => {
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

        return this.state;
      }),
      catchError((error) => {
        this.updateState({ status: 'failed' });
        return throwError(() => new Error(error.error?.defaultUserMessage || 'Authentication failed'));
      })
    );
  }

  /**
   * OAuth2 authentication (if configured)
   * @param credentials User credentials
   */
  private authenticateWithOAuth2(credentials: AuthCredentials): Observable<AuthState> {
    if (!this.config.oauthConfig?.enabled) {
      return throwError(() => new Error('OAuth2 is not enabled'));
    }

    // Prepare request parameters
    let params = new HttpParams()
      .set('username', credentials.username)
      .set('password', credentials.password)
      .set('client_id', this.config.oauthConfig.appId)
      .set('grant_type', 'password');

    // Set headers
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    // Get OAuth2 token
    return this.http.post(`${this.config.oauthConfig.serverUrl}/token`, 
      params.toString(), 
      { headers }
    ).pipe(
      switchMap((tokenData: any) => {
        // Create token object
        const token: AuthToken = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type || 'Bearer',
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
          scope: tokenData.scope
        };

        // Get user details with the token
        return this.http.get(`${this.config.apiUrl}/userdetails`, {
          headers: new HttpHeaders()
            .set('Authorization', `Bearer ${token.accessToken}`)
            .set('Fineract-Platform-TenantId', this.state.tenantId)
        }).pipe(
          map((userData: any) => {
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

            // Update state with authentication data
            this.updateState({
              status: 'authenticated',
              user,
              token,
              authMethod: 'oauth2',
              isTwoFactorRequired: userData.isTwoFactorAuthenticationRequired || false,
              isPasswordExpired: userData.shouldRenewPassword || false
            });

            // Store OAuth token details separately if not expired
            if (!userData.shouldRenewPassword) {
              const storageToUse = this.state.rememberMe ? 
                localStorage : sessionStorage;
              
              storageToUse.setItem(
                this.config.storageKeys.token, 
                JSON.stringify(tokenData)
              );
            }

            return this.state;
          }),
          catchError((error) => {
            this.updateState({ status: 'failed' });
            return throwError(() => new Error(error.error?.defaultUserMessage || 'Failed to get user details'));
          })
        );
      }),
      catchError((error) => {
        this.updateState({ status: 'failed' });
        return throwError(() => new Error(error.error?.error_description || 'OAuth authentication failed'));
      })
    );
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

        // Prepare parameters
        let params = new HttpParams()
          .set('refresh_token', this.state.token.refreshToken)
          .set('client_id', this.config.oauthConfig.appId)
          .set('grant_type', 'refresh_token');

        // Set headers
        const headers = new HttpHeaders()
          .set('Content-Type', 'application/x-www-form-urlencoded');

        // Refresh OAuth2 token
        const tokenData = await this.http.post(
          `${this.config.oauthConfig.serverUrl}/token`,
          params.toString(),
          { headers }
        ).toPromise() as any;

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
        // For JWT auth, try the refresh endpoint if available
        try {
          const tokenData = await this.http.post(
            `${this.config.apiUrl}/refresh-token`,
            {},
            { headers: this.getHttpHeaders() }
          ).toPromise() as any;
          
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
        } catch (error) {
          console.error('Error refreshing JWT token:', error);
          
          // If refresh fails and Hasura is configured, try to generate a new Hasura token
          if (this.config.hasuraUrl) {
            return this.generateHasuraToken();
          }
        }
      }

      // Return null for other auth methods or if refresh failed
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Generate Angular HTTP headers based on current authentication state
   */
  private getHttpHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const authHeaders = this.getAuthHeaders();
    
    // Add all auth headers
    Object.keys(authHeaders).forEach(key => {
      headers = headers.set(key, authHeaders[key]);
    });
    
    return headers;
  }

  /**
   * Request a two-factor authentication code
   * @param request Two-factor request details
   */
  public requestTwoFactorCode(request: TwoFactorRequest): Observable<void> {
    if (!this.state.isTwoFactorRequired || !this.state.token) {
      return throwError(() => new Error('Two-factor authentication is not required'));
    }

    // Set query parameters
    const params = new HttpParams()
      .set('deliveryMethod', request.deliveryMethod)
      .set('extendedToken', request.extendedToken ? 'true' : 'false');

    // Request 2FA code
    return this.http.post(`${this.config.apiUrl}/twofactor`, {}, {
      headers: this.getHttpHeaders(),
      params
    }).pipe(
      map(() => void 0),
      catchError((error) => {
        return throwError(() => new Error(error.error?.defaultUserMessage || 'Failed to request two-factor code'));
      })
    );
  }

  /**
   * Validate a two-factor authentication code
   * @param code The 2FA code to validate
   */
  public validateTwoFactorCode(code: string): Observable<TwoFactorToken> {
    if (!this.state.isTwoFactorRequired || !this.state.token) {
      return throwError(() => new Error('Two-factor authentication is not required'));
    }

    // Set query parameters
    const params = new HttpParams().set('token', code);

    // Validate 2FA code
    return this.http.post(`${this.config.apiUrl}/twofactor/validate`, {}, {
      headers: this.getHttpHeaders(),
      params
    }).pipe(
      map((tokenData: any) => {
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

        // Store two-factor token
        const storageToUse = this.state.rememberMe ? localStorage : sessionStorage;
        storageToUse.setItem(
          this.config.storageKeys.twoFactor, 
          JSON.stringify(twoFactorToken)
        );

        // If Hasura integration is enabled and password is not expired, try to get a Hasura token
        if (this.config.hasuraUrl && !this.state.isPasswordExpired) {
          this.generateHasuraToken().catch(err => {
            console.warn('Failed to generate Hasura token after 2FA:', err);
          });
        }

        return twoFactorToken;
      }),
      catchError((error) => {
        return throwError(() => new Error(error.error?.defaultUserMessage || 'Invalid two-factor code'));
      })
    );
  }

  /**
   * Reset user password
   * @param userId User ID
   * @param newPassword New password
   * @param confirmPassword Confirm password
   */
  public resetPassword(userId: string, newPassword: string, confirmPassword: string): Observable<void> {
    if (!this.state.isPasswordExpired || !this.state.token) {
      return throwError(() => new Error('Password reset is not required'));
    }

    if (newPassword !== confirmPassword) {
      return throwError(() => new Error('Passwords do not match'));
    }

    // Password details
    const passwordDetails = {
      password: newPassword,
      repeatPassword: confirmPassword
    };

    // Reset password
    return this.http.put(`${this.config.apiUrl}/users/${userId}`, passwordDetails, {
      headers: this.getHttpHeaders()
    }).pipe(
      map(() => {
        // Update state
        this.updateState({
          isPasswordExpired: false
        });

        // If 2FA is not required and Hasura integration is enabled, try to get a Hasura token
        if (!this.state.isTwoFactorRequired && this.config.hasuraUrl) {
          this.generateHasuraToken().catch(err => {
            console.warn('Failed to generate Hasura token after password reset:', err);
          });
        }
      }),
      catchError((error) => {
        return throwError(() => new Error(error.error?.defaultUserMessage || 'Failed to reset password'));
      })
    );
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
      const tokenData = await this.http.post('/api/hasura-token', {
        userId: this.state.user.id,
        username: this.state.user.username,
        officeId: this.state.user.officeId,
        roles: this.state.user.roles
      }, {
        headers: new HttpHeaders()
          .set('Authorization', `${this.state.token.tokenType} ${this.state.token.accessToken}`)
          .set('Fineract-Platform-TenantId', this.state.tenantId)
      }).toPromise() as any;

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
  public logout(): Observable<void> {
    if (this.state.twoFactorToken?.token) {
      // Try to invalidate 2FA token if present
      this.http.post(`${this.config.apiUrl}/twofactor/invalidate`, 
        { token: this.state.twoFactorToken.token },
        { headers: this.getHttpHeaders() }
      ).subscribe({
        error: (err) => console.warn('Failed to invalidate 2FA token:', err)
      });
    }

    if (this.state.authMethod === 'oauth2' && this.state.token?.refreshToken) {
      // Try to logout OAuth2 session if present
      let params = new HttpParams()
        .set('refresh_token', this.state.token.refreshToken)
        .set('client_id', this.config.oauthConfig?.appId || '');

      const headers = new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded');

      this.http.post(`${this.config.oauthConfig?.serverUrl}/logout`,
        params.toString(),
        { headers }
      ).subscribe({
        error: (err) => console.warn('Failed to logout OAuth session:', err)
      });
    }

    // Clear auth state
    this.clearAuth();
    
    // Return success
    return of(void 0);
  }
}