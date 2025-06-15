import { RequestHandler } from '../../core/request-handler.ts';
import { OAuth2TokenResponse } from '../../core/types/internal/oauth.ts';
import { HttpResponse } from '../../core/types/internal/http.ts';
import { XmApiError } from '../../core/errors.ts';

export class OAuthEndpoint {
  constructor(
    private readonly http: RequestHandler,
  ) {}

  /**
   * Smart method to obtain OAuth tokens based on the current configuration.
   *
   * Since config validation guarantees exactly one valid state, we can
   * determine the flow directly without any convoluted credential checks.
   *
   * @param options - Optional parameters for token acquisition
   * @param options.clientId - Client ID for password grant (skips discovery)
   * @param options.clientSecret - Client secret for enhanced security (required for non-org clients)
   * @returns Promise resolving to token response
   */
  async obtainTokens(
    options: { clientId?: string; clientSecret?: string } = {},
  ): Promise<HttpResponse<OAuth2TokenResponse>> {
    const { clientId, clientSecret } = options;
    const authState = this.http.getCurrentAuthState();
    switch (authState.type) {
      case 'basic': {
        return await this.getOAuthTokenByPassword({
          username: authState.username,
          password: authState.password,
          clientId,
          clientSecret,
        });
      }
      case 'authCode': {
        const resolvedClientSecret = clientSecret || authState.clientSecret;
        return await this.getOAuthTokenByAuthorizationCode({
          authorizationCode: authState.authorizationCode,
          clientId: authState.clientId,
          clientSecret: resolvedClientSecret,
        });
      }
      case 'oauth': {
        throw new XmApiError('Already have OAuth tokens - no need to call obtainTokens()');
      }
      default: {
        // This should never happen due to config validation, but TypeScript requires it
        throw new XmApiError('Invalid configuration type for token acquisition');
      }
    }
  }

  /**
   * Base method for making OAuth token requests.
   * All OAuth flows use this common method.
   *
   * @param options - Token request options
   * @param options.payload - Form-encoded payload for the token request
   * @param options.clientId - Client ID for config transition
   * @returns Promise resolving to token response
   */
  private async getOAuthToken(
    options: { payload: string; clientId: string },
  ): Promise<HttpResponse<OAuth2TokenResponse>> {
    const { payload, clientId } = options;
    const response = await this.http.post<OAuth2TokenResponse>({
      path: '/oauth2/token',
      body: payload,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      skipAuth: true, // Don't add auth header for token requests
    });
    // If successful, handle the new OAuth tokens (this also executes the token refresh callback)
    await this.http.handleNewOAuthTokens(response.body, clientId);
    return response;
  }

  /**
   * Performs OAuth2 password grant flow using basic auth credentials.
   * Following the pattern: grant_type=password&client_id=...&username=...&password=...&client_secret=...
   *
   * @param options - Password grant options
   * @param options.username - Username for authentication
   * @param options.password - Password for authentication
   * @param options.clientId - Client ID (if not provided, discovery would be attempted)
   * @param options.clientSecret - Optional client secret for enhanced security
   * @returns Promise resolving to token response
   */
  private async getOAuthTokenByPassword(
    options: {
      username: string;
      password: string;
      clientId?: string;
      clientSecret?: string;
    },
  ): Promise<HttpResponse<OAuth2TokenResponse>> {
    const { username, password, clientId, clientSecret } = options;
    if (!clientId) {
      throw new XmApiError(
        'Client ID discovery not yet implemented - please provide explicit clientId',
      );
    }
    let payload =
      `grant_type=password&client_id=${clientId}&username=${username}&password=${password}`;
    if (clientSecret) {
      payload += `&client_secret=${clientSecret}`;
    }
    return await this.getOAuthToken({ payload, clientId });
  }

  /**
   * Performs OAuth2 authorization code flow.
   * Following the pattern: grant_type=authorization_code&authorization_code=...&client_secret=...
   *
   * @param options - Authorization code grant options
   * @param options.authorizationCode - Authorization code from the auth flow
   * @param options.clientId - Client ID for the application
   * @param options.clientSecret - Optional client secret (from config or obtainTokens params)
   * @returns Promise resolving to token response
   */
  private async getOAuthTokenByAuthorizationCode(
    options: {
      authorizationCode: string;
      clientId: string;
      clientSecret?: string;
    },
  ): Promise<HttpResponse<OAuth2TokenResponse>> {
    const { authorizationCode, clientId, clientSecret } = options;
    let payload = `grant_type=authorization_code&authorization_code=${authorizationCode}`;
    if (clientSecret) {
      payload += `&client_secret=${clientSecret}`;
    }
    return await this.getOAuthToken({ payload, clientId });
  }
}
