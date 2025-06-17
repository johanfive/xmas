/**
 * Authentication state types used internally by the library.
 * These types define the mutable authentication state that changes during RequestHandler lifetime.
 */

/**
 * Mutable authentication state - the only thing that changes during RequestHandler lifetime.
 * Uses a discriminated union to ensure type-safe access to authentication properties.
 */
export type MutableAuthState =
  | { type: 'basic'; username: string; password: string }
  | { type: 'authCode'; authorizationCode: string; clientId: string; clientSecret?: string }
  | {
    type: 'oauth';
    accessToken: string;
    refreshToken: string;
    clientId: string;
    expiresInSeconds?: number; // Original seconds from API response
    tokenIssuedAtMs?: number; // Date.now() when token was received
  };
