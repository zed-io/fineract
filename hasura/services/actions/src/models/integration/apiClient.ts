/**
 * API Client integration models for Fineract
 */

/**
 * OAuth2 grant types
 */
export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
  PASSWORD = 'password',
  REFRESH_TOKEN = 'refresh_token'
}

/**
 * API Client registration
 */
export interface ApiClient {
  id?: string;
  name: string;
  description?: string;
  clientId: string;
  clientSecret: string;
  redirectUris?: string[];
  allowedGrantTypes: GrantType[];
  accessTokenValidity: number;  // in seconds
  refreshTokenValidity: number;  // in seconds
  scope?: string[];
  autoApprove: boolean;
  isActive: boolean;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * API Access Token
 */
export interface AccessToken {
  id?: string;
  clientId: string;
  userId?: string;
  token: string;
  authentication?: any;
  refreshToken?: string;
  tokenType: string;
  scope?: string[];
  expiresAt: Date;
  createdDate?: Date;
}

/**
 * API Client registration request
 */
export interface ApiClientRegistrationRequest {
  name: string;
  description?: string;
  redirectUris?: string[];
  allowedGrantTypes: GrantType[];
  accessTokenValidity?: number;
  refreshTokenValidity?: number;
  scope?: string[];
  autoApprove?: boolean;
}

/**
 * API Client registration response
 */
export interface ApiClientRegistrationResponse {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUris?: string[];
  allowedGrantTypes: GrantType[];
  accessTokenValidity: number;
  refreshTokenValidity: number;
  scope?: string[];
  autoApprove: boolean;
  isActive: boolean;
  createdDate: Date;
}

/**
 * OAuth2 token request
 */
export interface TokenRequest {
  grant_type: GrantType;
  client_id: string;
  client_secret: string;
  code?: string;
  redirect_uri?: string;
  username?: string;
  password?: string;
  refresh_token?: string;
  scope?: string;
}

/**
 * OAuth2 token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * API Client list response
 */
export interface ApiClientListResponse {
  clients: ApiClient[];
  total: number;
}