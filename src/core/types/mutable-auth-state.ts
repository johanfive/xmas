/**
 * Authentication state types used internally by the library.
 * These types define the mutable authentication state that changes during RequestHandler lifetime.
 */

/**
 * Authentication type constants used throughout the library.
 * Centralizes string literals to prevent typos and ensure consistency.
 */
export const AuthType = {
  BASIC: 'basic',
  AUTH_CODE: 'authCode',
  OAUTH: 'oauth',
} as const;

/**
 * Mutable authentication state - the only thing that changes during RequestHandler lifetime.
 * Uses a discriminated union to ensure type-safe access to authentication properties.
 */
export type MutableAuthState =
  | { type: typeof AuthType.BASIC; username: string; password: string }
  | {
    type: typeof AuthType.AUTH_CODE;
    authorizationCode: string;
    clientId: string;
    clientSecret?: string;
  }
  | {
    type: typeof AuthType.OAUTH;
    accessToken: string;
    refreshToken: string;
    clientId: string;
    expiresInSeconds?: number; // Original seconds from API response
    tokenIssuedAtMs?: number; // Date.now() when token was received
  };
