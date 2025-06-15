import { XmApiError } from '../errors.ts';
import type { XmApiConfig } from '../types/internal/config.ts';

/**
 * Validates that the config is in exactly one valid state.
 * Prevents invalid overlapping configurations and validates data types.
 */
export function validateConfig(config: XmApiConfig): void {
  // 1. Basic existence check
  if (config === null || config === undefined) {
    throw new XmApiError('Invalid config: Configuration object is required');
  }

  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new XmApiError('Invalid config: Expected object');
  }

  // 2. Validate hostname
  if (typeof config.hostname !== 'string') {
    throw new XmApiError('Invalid config: hostname must be a string');
  }

  // 3. Validate maxRetries if provided
  if (config.maxRetries !== undefined) {
    if (
      typeof config.maxRetries !== 'number' || config.maxRetries < 0 ||
      !Number.isInteger(config.maxRetries)
    ) {
      throw new XmApiError('Invalid config: maxRetries must be a non-negative integer');
    }
  }

  // 4. Determine which auth methods are present
  const hasBasicAuth = 'username' in config && 'password' in config;
  const hasAuthCode = 'authorizationCode' in config;
  const hasOAuthTokens = 'accessToken' in config && 'refreshToken' in config;

  const configCount = [hasBasicAuth, hasAuthCode, hasOAuthTokens].filter(Boolean).length;

  // 5. Validate exactly one auth method is provided
  if (configCount === 0) {
    throw new XmApiError(
      'Invalid config: Must provide either basic auth credentials, authorization code, or OAuth tokens',
    );
  }

  if (configCount > 1) {
    throw new XmApiError(
      'Invalid config: Cannot mix basic auth, authorization code, and OAuth token fields',
    );
  }

  // 6. Validate required fields and types for each config type
  if (hasBasicAuth) {
    if (typeof config.username !== 'string' || !config.username) {
      throw new XmApiError('Invalid config: username must be a non-empty string');
    }
    if (typeof config.password !== 'string' || !config.password) {
      throw new XmApiError('Invalid config: password must be a non-empty string');
    }
  }

  if (hasAuthCode) {
    if (typeof config.authorizationCode !== 'string' || !config.authorizationCode) {
      throw new XmApiError('Invalid config: authorizationCode must be a non-empty string');
    }
    if (!('clientId' in config) || typeof config.clientId !== 'string' || !config.clientId) {
      throw new XmApiError('Invalid config: clientId must be a non-empty string');
    }
    // Validate optional clientSecret if provided
    if (
      'clientSecret' in config && config.clientSecret !== undefined &&
      typeof config.clientSecret !== 'string'
    ) {
      throw new XmApiError('Invalid config: clientSecret must be a string');
    }
  }

  if (hasOAuthTokens) {
    if (typeof config.accessToken !== 'string' || !config.accessToken) {
      throw new XmApiError('Invalid config: accessToken must be a non-empty string');
    }
    if (typeof config.refreshToken !== 'string' || !config.refreshToken) {
      throw new XmApiError('Invalid config: refreshToken must be a non-empty string');
    }
    if (!('clientId' in config) || typeof config.clientId !== 'string' || !config.clientId) {
      throw new XmApiError('Invalid config: clientId must be a non-empty string');
    }
    // Validate optional expiresAt if provided
    if (
      'expiresAt' in config && config.expiresAt !== undefined &&
      typeof config.expiresAt !== 'string'
    ) {
      throw new XmApiError('Invalid config: expiresAt must be a string');
    }
  }
}
