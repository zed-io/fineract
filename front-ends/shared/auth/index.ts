/**
 * Unified Authentication Module for Fineract Front-end Applications
 * Exports shared authentication functionality for both Angular and React/Next.js
 */

// Core models and interfaces
export * from './models';
export * from './auth-service';

// Angular implementation
export * from './angular-auth-service';
export * from './angular-auth.interceptor';
export * from './angular-auth.guard';
export * from './angular-auth.module';

// React/Next.js implementation
export * from './fetch-auth-service';
export * from './use-auth';

// Default config
export const DEFAULT_AUTH_CONFIG = {
  apiUrl: '/fineract-provider/api/v1',
  hasuraUrl: '/graphql',
  defaultTenantId: 'default',
  storageKeys: {
    auth: 'fineract_auth',
    token: 'fineract_token',
    twoFactor: 'fineract_2fa_token'
  },
  tokenRefreshThreshold: 5 * 60 * 1000 // 5 minutes
};