/**
 * Types specific to the OAuth endpoint.
 * These types define the request and response structures for OAuth token operations.
 */

/**
 * The response returned when successfully obtaining OAuth tokens.
 * This matches the exact format returned by the xMatters API.
 */
export interface TokenResponse {
  /** The access token to use for authenticated requests */
  access_token: string;
  /** Token to use to get a new access token when it expires */
  refresh_token: string;
  /** How many seconds until the access token expires */
  expires_in: number;
  /** The type of token, typically 'Bearer' */
  token_type: string;
  /** The scopes granted to the token (space-separated string) */
  scope?: string;
}
