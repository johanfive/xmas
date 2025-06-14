import { XmApiError } from '../errors.ts';
import type { XmApiConfig } from '../types/internal/config.ts';

/**
 * Validates that the config is in exactly one valid state.
 * Prevents invalid overlapping configurations.
 */
export function validateConfig(config: XmApiConfig): void {
  const hasBasicAuth = 'username' in config && 'password' in config;
  const hasAuthCode = 'authorizationCode' in config;
  const hasOAuthTokens = 'accessToken' in config && 'refreshToken' in config;

  const configCount = [hasBasicAuth, hasAuthCode, hasOAuthTokens].filter(Boolean).length;

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

  // Validate required fields for each config type
  if (hasBasicAuth && (!config.username || !config.password)) {
    throw new XmApiError('Invalid config: Basic auth requires both username and password');
  }

  if (hasAuthCode && !config.authorizationCode) {
    throw new XmApiError('Invalid config: Auth code flow requires authorizationCode');
  }

  if (hasAuthCode && !config.clientId) {
    throw new XmApiError('Invalid config: Auth code flow requires clientId');
  }

  if (hasOAuthTokens && (!config.accessToken || !config.refreshToken || !config.clientId)) {
    throw new XmApiError(
      'Invalid config: OAuth config requires accessToken, refreshToken, and clientId',
    );
  }
}
