import { RequestHandler } from '../../core/request-handler.ts';
import { XmApiError } from '../../core/errors.ts';
import { TokenResponse } from './types.ts';
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
   * The username and password must be provided in the XmApi constructor.
   * The clientId must be provided as a parameter to this method.
   *
   * @param options - Options for token acquisition
   * @param options.clientId - OAuth client ID for token acquisition
   * @returns Promise resolving to HTTP response containing token information
   *
   * @example
   * ```typescript
   * const xm = new XmApi({
   *   hostname: 'https://example.xmatters.com',
   *   username: 'your-username',
   *   password: 'your-password'
   * });
   *
   * const { body: tokens } = await xm.oauth.obtainTokens({
   *   clientId: 'your-client-id'
   * });
   * ```
   */
  async obtainTokens(options: { clientId: string }): Promise<HttpResponse<TokenResponse>> {
    const { clientId } = options;

    // Get constructor credentials from RequestHandler
    const constructorCredentials = this.http.getAuthCredentials();
    if (!constructorCredentials) {
      // Check if this is basic auth config with missing fields for more specific error messages
      const validation = this.http.validateBasicAuthFields();
      if (validation.hasBasicAuth) {
        if (validation.missingField === 'username') {
          throw new XmApiError(
            'username is required for OAuth token acquisition. Provide it in the XmApi constructor.',
          );
        }
        if (validation.missingField === 'password') {
          throw new XmApiError(
            'password is required for OAuth token acquisition. Provide it in the XmApi constructor.',
          );
        }
      }
      throw new XmApiError(
        'XmApi must be initialized with basic auth credentials (username, password) to acquire OAuth tokens.',
      );
    }
    const { username, password } = constructorCredentials;

    // Validate that we have all required credentials
    if (!clientId) {
      throw new XmApiError(
        'clientId is required for OAuth token acquisition. Provide it as a parameter to obtainTokens().',
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
}
