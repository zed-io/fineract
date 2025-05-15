/**
 * useAuth - React Hook for Authentication
 * For use in React/Next.js applications with the FetchAuthService
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { FetchAuthService } from './fetch-auth-service';
import { AuthConfig } from './auth-service';
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

/**
 * Browser storage implementation
 */
class BrowserStorage implements AuthStorage {
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
 * Authentication Context interface
 */
interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  user: AuthUser | null;
  authState: AuthState;
  loading: boolean;
  error: string | null;
  
  // Auth methods
  login: (credentials: AuthCredentials) => Promise<void>;
  loginWithOAuth2: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthToken | null>;
  
  // Two-factor methods
  requestTwoFactorCode: (request: TwoFactorRequest) => Promise<void>;
  validateTwoFactorCode: (code: string) => Promise<void>;
  
  // Password reset
  resetPassword: (userId: string, newPassword: string, confirmPassword: string) => Promise<void>;
  
  // Hasura/JWT
  generateHasuraToken: () => Promise<AuthToken>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider component for React applications
 */
export function AuthProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: AuthConfig;
}) {
  // Create storage instances
  const localStorage = new BrowserStorage(window.localStorage);
  const sessionStorage = new BrowserStorage(window.sessionStorage);
  
  // Create the auth service
  const [authService] = useState(() => new FetchAuthService(
    localStorage,
    sessionStorage,
    config
  ));
  
  // Auth state
  const [authState, setAuthState] = useState<AuthState>(authService.getState());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update auth state from service
  const updateAuthState = useCallback(() => {
    setAuthState(authService.getState());
  }, [authService]);
  
  // Check auth on mount
  useEffect(() => {
    updateAuthState();
    
    // Set up auto refresh
    const refreshInterval = setInterval(() => {
      if (authService.isAuthenticated() && authService.needsTokenRefresh()) {
        refreshToken();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(refreshInterval);
  }, [authService, updateAuthState]);
  
  /**
   * Log in with username and password
   */
  const login = useCallback(async (credentials: AuthCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.authenticate(credentials);
      updateAuthState();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService, updateAuthState]);
  
  /**
   * Log in with OAuth2
   */
  const loginWithOAuth2 = useCallback(async (credentials: AuthCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.authenticateWithOAuth2(credentials);
      updateAuthState();
    } catch (err: any) {
      setError(err.message || 'OAuth authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService, updateAuthState]);
  
  /**
   * Log out
   */
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.logout();
      updateAuthState();
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService, updateAuthState]);
  
  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      const token = await authService.refreshToken();
      updateAuthState();
      return token;
    } catch (err: any) {
      console.error('Token refresh failed:', err);
      return null;
    }
  }, [authService, updateAuthState]);
  
  /**
   * Request two-factor code
   */
  const requestTwoFactorCode = useCallback(async (request: TwoFactorRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.requestTwoFactorCode(request);
    } catch (err: any) {
      setError(err.message || 'Failed to request two-factor code');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService]);
  
  /**
   * Validate two-factor code
   */
  const validateTwoFactorCode = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.validateTwoFactorCode(code);
      updateAuthState();
    } catch (err: any) {
      setError(err.message || 'Invalid two-factor code');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService, updateAuthState]);
  
  /**
   * Reset password
   */
  const resetPassword = useCallback(async (userId: string, newPassword: string, confirmPassword: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.resetPassword(userId, newPassword, confirmPassword);
      updateAuthState();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService, updateAuthState]);
  
  /**
   * Generate Hasura token
   */
  const generateHasuraToken = useCallback(async () => {
    try {
      const token = await authService.generateHasuraToken();
      updateAuthState();
      return token;
    } catch (err: any) {
      console.error('Failed to generate Hasura token:', err);
      throw err;
    }
  }, [authService, updateAuthState]);
  
  // Auth context value
  const value: AuthContextType = {
    isAuthenticated: authService.isAuthenticated(),
    user: authState.user || null,
    authState,
    loading,
    error,
    
    login,
    loginWithOAuth2,
    logout,
    refreshToken,
    
    requestTwoFactorCode,
    validateTwoFactorCode,
    
    resetPassword,
    generateHasuraToken,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use the authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}