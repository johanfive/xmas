/**
 * Configuration and logging types used internally by the library.
 * These types define how the library is configured and how it handles logging.
 */

import type { HttpClient } from './http.ts';

/**
 * Interface that loggers must implement to be used with this library.
 * This allows consumers to inject their own logging implementation.
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * Callback function type for token refresh events.
 * Called when OAuth tokens are refreshed or initially acquired.
 */
export type TokenRefreshCallback = (
  accessToken: string,
  refreshToken: string,
) => void | Promise<void>;

/**
 * Base configuration options shared by all authentication methods.
 */
export interface XmApiBaseConfig {
  hostname: string;
  httpClient?: HttpClient;
  logger?: Logger;
  defaultHeaders?: Record<string, string>;
  maxRetries?: number;
  onTokenRefresh?: TokenRefreshCallback;
}

/**
 * Basic auth configuration (can transition to OAuth).
 * No clientId field - this is pure basic auth.
 */
export interface BasicAuthConfig extends XmApiBaseConfig {
  username: string;
  password: string;
}

/**
 * Auth code configuration (must call obtainTokens before API calls).
 * ClientId is required - no discovery path.
 */
export interface AuthCodeConfig extends XmApiBaseConfig {
  authorizationCode: string; // Changed from authCode to match xMatters API
  clientId: string;
  clientSecret?: string; // Optional client secret for enhanced security
}

/**
 * OAuth configuration (ready for API calls).
 * All OAuth fields are required.
 */
export interface OAuthConfig extends XmApiBaseConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  expiresAt?: string; // ISO timestamp when the access token expires
}

/**
 * Union type of all possible configuration options.
 */
export type XmApiConfig = BasicAuthConfig | AuthCodeConfig | OAuthConfig;

/**
 * Type guard to determine if config is for basic authentication.
 */
export function isBasicAuthConfig(config: XmApiConfig): config is BasicAuthConfig {
  return 'username' in config && 'password' in config;
}

/**
 * Type guard to determine if config is for auth code flow.
 */
export function isAuthCodeConfig(config: XmApiConfig): config is AuthCodeConfig {
  return 'authorizationCode' in config;
}

/**
 * Type guard to determine if config is for OAuth with existing tokens.
 */
export function isOAuthConfig(config: XmApiConfig): config is OAuthConfig {
  return 'accessToken' in config && 'refreshToken' in config;
}
