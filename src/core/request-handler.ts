import { HttpClient, HttpRequest, HttpResponse } from './types/internal/http.ts';
import {
  BasicAuthCredentials,
  isBasicAuthOptions,
  isOAuthOptions,
  Logger,
  TokenRefreshCallback,
  XmApiOptions,
} from './types/internal/config.ts';
import { DeleteOptions, GetOptions, RequestWithBodyOptions } from './types/internal/methods.ts';
import { XmApiError } from './errors.ts';
import { OAuth2TokenResponse, TokenState } from './types/internal/oauth.ts';
import { RequestBuilder } from './request-builder.ts';
import { DefaultHttpClient, defaultLogger } from './defaults/index.ts';

export class RequestHandler {
  /** HTTP client for making requests */
  private readonly client: HttpClient;
  /** Logger for debug output */
  private readonly logger: Logger;
  /** Current token state if using OAuth */
  private tokenState?: TokenState;
  /** Request builder for creating HTTP requests before sending with the client */
  private readonly requestBuilder: RequestBuilder;
  /** Optional callback for token refresh events */
  private readonly onTokenRefresh?: TokenRefreshCallback;
  /** Maximum number of retry attempts for failed requests */
  private readonly maxRetries: number;

  constructor(
    private readonly options: XmApiOptions,
  ) {
    // Set up internal properties
    this.client = options.httpClient ?? new DefaultHttpClient();
    this.logger = options.logger ?? defaultLogger;
    this.onTokenRefresh = options.onTokenRefresh;
    this.maxRetries = options.maxRetries ?? 3;
    // Create initial token state for OAuth if needed
    if (isOAuthOptions(options)) {
      this.tokenState = {
        accessToken: options.accessToken,
        refreshToken: options.refreshToken,
        clientId: options.clientId,
        // Set a default expiry 5 minutes from now - we'll get the real value on first refresh
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        scopes: [],
      };
    }
    // Create request builder
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.defaultHeaders,
    };
    this.requestBuilder = new RequestBuilder(options.hostname, headers);
  }

  /**
   * Handle newly acquired or refreshed OAuth tokens.
   *
   * This method processes token responses from any source and updates the internal state:
   * - OAuth endpoint responses (password grant, authorization code grant)
   * - Automatic token refresh during request retry
   *
   * The method will:
   * 1. Update the internal token state with new token data
   * 2. Calculate and set the token expiration time
   * 3. Execute the onTokenRefresh callback if provided (with error handling)
   *
   * @param tokenResponse - The token response object from the xMatters API
   * @param clientId - Optional client ID for OAuth2 operations (preserved from current state if not provided)
   */
  async handleNewTokens(
    tokenResponse: OAuth2TokenResponse,
    clientId?: string,
  ): Promise<void> {
    // Use provided clientId or fall back to current state's clientId
    const finalClientId = clientId ?? this.tokenState?.clientId;
    if (!finalClientId) {
      throw new XmApiError('Client ID is required for token handling');
    }

    // Update token state
    this.tokenState = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      clientId: finalClientId,
      expiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
      scopes: tokenResponse.scope?.split(' ') ?? [],
    };
    // Execute callback if provided
    if (this.onTokenRefresh) {
      try {
        await this.onTokenRefresh(tokenResponse.access_token, tokenResponse.refresh_token);
      } catch (error) {
        // Use proper logger instead of console
        this.logger.warn(
          'Error in onTokenRefresh callback, but continuing with refreshed token',
          error,
        );
      }
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokenState) return false;
    const expiresAt = new Date(this.tokenState.expiresAt);
    // Consider token expired if it expires in less than 30 seconds
    return expiresAt.getTime() - Date.now() <= 30 * 1000;
  }

  private async refreshToken(): Promise<void> {
    try {
      if (!this.tokenState) {
        throw new XmApiError('No token state available for token refresh');
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokenState.refreshToken,
        client_id: this.tokenState.clientId,
      });

      const refreshRequest = this.requestBuilder.build({
        method: 'POST',
        path: '/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      const response = await this.client.send(refreshRequest);

      if (response.status < 200 || response.status >= 300) {
        throw new XmApiError('Failed to refresh token', response);
      }

      await this.handleNewTokens(response.body as OAuth2TokenResponse, this.tokenState?.clientId);
    } catch (error) {
      this.logger.error('Failed to refresh token:', error);
      throw error;
    }
  }

  private exponentialBackoff(attempt: number): number {
    // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, capped at 10s
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }

  /**
   * Creates the authorization header value based on the authentication type
   */
  private createAuthHeader(): string | undefined {
    if (isOAuthOptions(this.options)) {
      // For OAuth, get the current access token from token state
      const currentToken = this.tokenState?.accessToken;
      return currentToken ? `Bearer ${currentToken}` : undefined;
    } else if (isBasicAuthOptions(this.options)) {
      // In Deno, we use TextEncoder for proper UTF-8 encoding
      const encoder = new TextEncoder();
      const authString = `${this.options.username}:${this.options.password}`;
      const auth = btoa(String.fromCharCode(...encoder.encode(authString)));
      return `Basic ${auth}`;
    }
    return undefined;
  }

  async send<T>(
    request: {
      path?: string;
      fullUrl?: string;
      method?: HttpRequest['method'];
      headers?: Record<string, string>;
      query?: Record<string, unknown>;
      body?: unknown;
      retryAttempt?: number;
      skipAuth?: boolean;
    },
  ): Promise<HttpResponse<T>> {
    // Check if token refresh is needed before making the request
    if (this.tokenState && this.isTokenExpired()) {
      await this.refreshToken();
    }

    const fullRequest = this.requestBuilder.build(request);

    // Add authorization header unless explicitly skipped
    if (!request.skipAuth) {
      const authHeader = this.createAuthHeader();
      if (authHeader) {
        fullRequest.headers = {
          ...fullRequest.headers,
          Authorization: authHeader,
        };
      }
    }

    try {
      const response = await this.client.send(fullRequest);

      if (response.status >= 400) {
        const currentAttempt = fullRequest.retryAttempt ?? 0;

        // Handle OAuth token expiry/refresh first
        if (
          response.status === 401 &&
          this.tokenState?.refreshToken &&
          currentAttempt === 0
        ) {
          await this.refreshToken();
          // Retry the original request with new token
          return this.send<T>({
            ...request,
            retryAttempt: 1,
          });
        }

        // For rate limits (429) or server errors (5xx), retry with exponential backoff
        if (
          (response.status === 429 || response.status >= 500) &&
          currentAttempt < this.maxRetries
        ) {
          // Calculate delay based on retry attempt
          const delay = this.exponentialBackoff(currentAttempt);

          // Respect Retry-After header for rate limits if present
          let finalDelay = delay;
          if (response.status === 429 && response.headers['retry-after']) {
            const retryAfter = parseInt(response.headers['retry-after'], 10);
            if (!isNaN(retryAfter)) {
              finalDelay = retryAfter * 1000;
            }
          }

          this.logger.debug(
            `Request failed with status ${response.status}, retrying in ${finalDelay}ms (attempt ${
              currentAttempt + 1
            }/${this.maxRetries})`,
          );

          await new Promise((resolve) => setTimeout(resolve, finalDelay));
          return this.send<T>({
            ...request,
            retryAttempt: currentAttempt + 1,
          });
        }
        throw new XmApiError('', response);
      }

      return response as HttpResponse<T>;
    } catch (error) {
      if (error instanceof XmApiError) {
        throw error;
      }
      throw new XmApiError('Request failed', undefined, error);
    }
  }

  get<T>(options: GetOptions): Promise<HttpResponse<T>> {
    return this.send<T>(options);
  }

  post<T>(options: RequestWithBodyOptions): Promise<HttpResponse<T>> {
    return this.send<T>({ ...options, method: 'POST' });
  }

  put<T>(options: RequestWithBodyOptions): Promise<HttpResponse<T>> {
    return this.send<T>({ ...options, method: 'PUT' });
  }

  patch<T>(options: RequestWithBodyOptions): Promise<HttpResponse<T>> {
    return this.send<T>({ ...options, method: 'PATCH' });
  }

  delete<T>(options: DeleteOptions): Promise<HttpResponse<T>> {
    return this.send<T>({ ...options, method: 'DELETE' });
  }

  /**
   * Get basic auth credentials from constructor options if available.
   * This allows endpoints to access these credentials for OAuth token acquisition.
   */
  getBasicAuthCredentials(): BasicAuthCredentials | undefined {
    if (isBasicAuthOptions(this.options)) {
      return {
        username: this.options.username,
        password: this.options.password,
        clientId: this.options.clientId,
      };
    }
    return undefined;
  }
}
