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
export interface XmApiBaseOptions {
  hostname: string;
  httpClient?: HttpClient;
  logger?: Logger;
  defaultHeaders?: Record<string, string>;
  maxRetries?: number;
  onTokenRefresh?: TokenRefreshCallback; // Optional callback for when OAuth tokens are acquired/refreshed
}

/**
 * Configuration options for basic authentication.
 */
export interface XmApiBasicAuthOptions extends XmApiBaseOptions {
  username: string;
  password: string;
  clientId?: string; // Optional for OAuth token acquisition
}

/**
 * Basic authentication credentials structure.
 * Used when extracting credentials for OAuth token acquisition.
 * This is a subset of XmApiBasicAuthOptions containing only the auth fields.
 */
export type BasicAuthCredentials = Pick<
  XmApiBasicAuthOptions,
  'username' | 'password' | 'clientId'
>;

/**
 * Configuration options for OAuth authentication with existing tokens.
 */
export interface XmApiOAuthOptions extends XmApiBaseOptions {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
}

/**
 * Union type of all possible configuration options.
 */
export type XmApiOptions = XmApiBasicAuthOptions | XmApiOAuthOptions;

/**
 * Type guard to determine if options are for OAuth authentication with existing tokens.
 */
export function isOAuthOptions(options: XmApiOptions): options is XmApiOAuthOptions {
  return 'accessToken' in options;
}

/**
 * Type guard to determine if options are for basic authentication.
 */
export function isBasicAuthOptions(options: XmApiOptions): options is XmApiBasicAuthOptions {
  return 'username' in options && 'password' in options;
}
