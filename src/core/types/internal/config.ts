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
 * Base configuration options shared by all authentication methods.
 */
export interface XmApiBaseOptions {
  hostname: string;
  httpClient?: HttpClient;
  logger?: Logger;
  defaultHeaders?: Record<string, string>;
  maxRetries?: number;
}

/**
 * Configuration options for basic authentication.
 */
export interface XmApiBasicAuthOptions extends XmApiBaseOptions {
  username: string;
  password: string;
}

/**
 * Configuration options for OAuth authentication.
 */
export interface XmApiOAuthOptions extends XmApiBaseOptions {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  onTokenRefresh?: (accessToken: string, refreshToken: string) => void | Promise<void>;
}

/**
 * Union type of all possible configuration options.
 */
export type XmApiOptions = XmApiBasicAuthOptions | XmApiOAuthOptions;

/**
 * Type guard to determine if options are for OAuth authentication.
 */
export function isOAuthOptions(options: XmApiOptions): options is XmApiOAuthOptions {
  return 'accessToken' in options;
}
