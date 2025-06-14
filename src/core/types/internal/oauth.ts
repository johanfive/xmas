/**
 * OAuth2-related types used internally by the library.
 * These types handle OAuth2 token responses, state management, and authentication flows.
 */

/**
 * Response from the OAuth2 token endpoint.
 * Contains only the fields our library actually needs to function.
 */
export interface OAuth2TokenResponse {
  /** The access token to use for authenticated requests */
  access_token: string;
  /** Token to use to get a new access token when it expires */
  refresh_token: string;
  /** How many seconds until the access token expires */
  expires_in: number;
  /** The type of token, typically 'Bearer' */
  token_type: 'Bearer' | string;
}

/**
 * Basic token data required for OAuth2 authentication.
 */
interface TokenData {
  /** Token to use for authenticating requests */
  accessToken: string;
  /** Token to use for getting a new access token */
  refreshToken: string;
  /** Client ID used for OAuth2 server authentication */
  clientId: string;
}

/**
 * Data structure for managing OAuth2 tokens with metadata and helper methods.
 */
export interface TokenState extends TokenData {
  /** ISO timestamp when the access token expires */
  expiresAt: string;
  /** Scopes granted to the token */
  scopes: string[];
}
