import { RequestHandler } from '../../core/request-handler.ts';
import { XmApiError } from '../../core/errors.ts';
import { TokenByAuthCodeParams, TokenResponse } from './types.ts';
import type { HttpResponse } from '../../core/types/internal/http.ts';

export class OAuthEndpoint {
  constructor(
    private readonly http: RequestHandler,
  ) {}

  /**
   * Obtain OAuth tokens using username and password from constructor, then automatically switch to OAuth mode.
   * After calling this method, all subsequent API calls will use the acquired OAuth tokens.
   * This is the "password" grant type in OAuth2 terminology.
   *
   * The username, password, and clientId must be provided in the XmApi constructor.
   *
   * @returns Promise resolving to HTTP response containing token information
   *
   * @example
   * ```typescript
   * const xm = new XmApi({
   *   hostname: 'https://example.xmatters.com',
   *   username: 'your-username',
   *   password: 'your-password',
   *   clientId: 'your-client-id'
   * });
   *
   * const { body: tokens } = await xm.oauth.getTokensByCredentials();
   * ```
   */
  async getTokensByCredentials(): Promise<HttpResponse<TokenResponse>> {
    // Get constructor credentials from RequestHandler
    const constructorCredentials = this.http.getBasicAuthCredentials();
    if (!constructorCredentials) {
      throw new XmApiError(
        'XmApi must be initialized with basic auth credentials (username, password, clientId) to acquire OAuth tokens.',
      );
    }
    const { clientId, username, password } = constructorCredentials;
    // Validate that we have all required credentials
    if (!clientId) {
      throw new XmApiError(
        'clientId is required for OAuth token acquisition. Provide it in the XmApi constructor.',
      );
    }
    if (!username) {
      throw new XmApiError(
        'username is required for OAuth token acquisition. Provide it in the XmApi constructor.',
      );
    }
    if (!password) {
      throw new XmApiError(
        'password is required for OAuth token acquisition. Provide it in the XmApi constructor.',
      );
    }
    const requestBody = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      username,
      password,
    });
    const response = await this.http.send<TokenResponse>({
      method: 'POST',
      path: '/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: requestBody.toString(),
      skipAuth: true, // Don't add auth headers for token acquisition
    });
    const tokenData = response.body;

    // Handle the newly acquired tokens
    await this.http.handleNewTokens(tokenData, clientId);

    return response;
  }

  /**
   * Obtain OAuth tokens using authorization code, then automatically switch to OAuth mode.
   * After calling this method, all subsequent API calls will use the acquired OAuth tokens.
   * This is the "authorization_code" grant type in OAuth2 terminology.
   *
   * @param params - The authorization code, client ID, and related parameters
   * @returns Promise resolving to HTTP response containing token information
   *
   * @example
   * ```typescript
   * const xm = new XmApi({
   *   hostname: 'https://example.xmatters.com',
   * });
   *
   * const { body: tokens } = await xm.oauth.getTokensByAuthCode({
   *   clientId: 'your-client-id',
   *   code: 'authorization-code-from-callback',
   *   redirectUri: 'https://your-app.com/callback'
   * });
   *
   * // Now all subsequent API calls use OAuth
   * const groups = await xm.groups.get();
   * ```
   */
  async getTokensByAuthCode(params: TokenByAuthCodeParams): Promise<HttpResponse<TokenResponse>> {
    // untested WIP
    const { clientId, code, redirectUri, codeVerifier } = params;

    const requestParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
    });

    if (redirectUri) {
      requestParams.append('redirect_uri', redirectUri);
    }

    if (codeVerifier) {
      requestParams.append('code_verifier', codeVerifier);
    }

    const response = await this.http.send<TokenResponse>({
      method: 'POST',
      path: '/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: requestParams.toString(),
      skipAuth: true, // Don't add auth headers for token acquisition
    });

    const tokenData = response.body;

    // Handle the newly acquired tokens
    await this.http.handleNewTokens(tokenData, clientId);

    // Return the full HTTP response with raw token data (no transformation)
    return response;
  }
}
