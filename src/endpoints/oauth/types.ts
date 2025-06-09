/**
 * Types specific to the OAuth endpoint.
 * These types define the request and response structures for OAuth token operations.
 */

/**
 * Request parameters for obtaining OAuth tokens using authorization code grant.
 *
 * All parameters required for the authorization code flow, including those
 * generated during the OAuth authorization process.
 */
export interface TokenByAuthCodeParams {
  /** The client ID for the OAuth application */
  clientId: string;
  /** Authorization code received from the authorization server */
  code: string;
  /** Redirect URI that was used in the authorization request */
  redirectUri?: string;
  /** Code verifier for PKCE (Proof Key for Code Exchange) */
  codeVerifier?: string;
}

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
