import { HttpClient, HttpResponse } from './types/internal/http.ts';
import {
  isAuthCodeConfig,
  isBasicAuthConfig,
  isOAuthConfig,
  Logger,
  TokenRefreshCallback,
  XmApiConfig,
} from './types/internal/config.ts';
import type { MutableAuthState } from './types/internal/auth-state.ts';
import { DeleteOptions, GetOptions, RequestWithBodyOptions } from './types/internal/methods.ts';
import { XmApiError } from './errors.ts';
import { OAuth2TokenResponse } from './types/internal/oauth.ts';
import { RequestBuilder, RequestBuildOptions } from './request-builder.ts';
import { DefaultHttpClient, defaultLogger } from './defaults/index.ts';

export class RequestHandler {
  /** HTTP client for making requests */
  private readonly client: HttpClient;
  /** Logger for debug output */
  private readonly logger: Logger;
  /** Request builder for creating HTTP requests before sending with the client */
  private readonly requestBuilder: RequestBuilder;
  /** Optional callback for token refresh events */
  private readonly onTokenRefresh?: TokenRefreshCallback;
  /** Maximum number of retry attempts for failed requests */
  private readonly maxRetries: number;
  /** Mutable authentication state - the only property that changes during OAuth transitions */
  private mutableAuthState: MutableAuthState;

  constructor(
    initialConfig: XmApiConfig,
  ) {
    // Extract and cache immutable properties
    this.client = initialConfig.httpClient ?? new DefaultHttpClient();
    this.logger = initialConfig.logger ?? defaultLogger;
    this.onTokenRefresh = initialConfig.onTokenRefresh;
    this.maxRetries = initialConfig.maxRetries ?? 3;
    // Initialize mutable auth state based on config type
    if (isBasicAuthConfig(initialConfig)) {
      this.mutableAuthState = {
        type: 'basic',
        username: initialConfig.username,
        password: initialConfig.password,
      };
    } else if (isOAuthConfig(initialConfig)) {
      this.mutableAuthState = {
        type: 'oauth',
        accessToken: initialConfig.accessToken,
        refreshToken: initialConfig.refreshToken,
        clientId: initialConfig.clientId,
        expiresAt: initialConfig.expiresAt,
      };
    } else if (isAuthCodeConfig(initialConfig)) {
      this.mutableAuthState = {
        type: 'authCode',
        authorizationCode: initialConfig.authorizationCode,
        clientId: initialConfig.clientId,
        clientSecret: initialConfig.clientSecret,
      };
    } else {
      throw new XmApiError('Invalid configuration type');
    }
    // Create request builder with immutable properties
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...initialConfig.defaultHeaders,
    };
    this.requestBuilder = new RequestBuilder(initialConfig.hostname, headers);
  }

  /**
   * Execute the onTokenRefresh callback if provided (with error handling)
   */
  private async executeTokenRefreshCallback(
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    if (this.onTokenRefresh) {
      try {
        await this.onTokenRefresh(accessToken, refreshToken);
      } catch (error) {
        this.logger.warn(
          'Error in onTokenRefresh callback, but continuing with refreshed token',
          error,
        );
      }
    }
  }

  private isTokenExpired(): boolean {
    if (this.mutableAuthState.type !== 'oauth') return false;
    // If there's no expiration info, assume it's valid
    if (!this.mutableAuthState.expiresAt) return false;
    const expiresAt = new Date(this.mutableAuthState.expiresAt);
    // Consider token expired if it expires in less than 30 seconds
    return expiresAt.getTime() - Date.now() <= 30 * 1000;
  }

  private async refreshToken(): Promise<void> {
    try {
      if (this.mutableAuthState.type !== 'oauth') {
        throw new XmApiError('No OAuth configuration available for token refresh');
      }
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.mutableAuthState.refreshToken,
        client_id: this.mutableAuthState.clientId,
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
      const tokenResponse = response.body as OAuth2TokenResponse;
      await this.handleNewOAuthTokens(tokenResponse, this.mutableAuthState.clientId);
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
    if (this.mutableAuthState.type === 'oauth') {
      return `Bearer ${this.mutableAuthState.accessToken}`;
    } else if (this.mutableAuthState.type === 'basic') {
      // In Deno, we use TextEncoder for proper UTF-8 encoding
      const encoder = new TextEncoder();
      const authString = `${this.mutableAuthState.username}:${this.mutableAuthState.password}`;
      const auth = btoa(String.fromCharCode(...encoder.encode(authString)));
      return `Basic ${auth}`;
    }
    return undefined;
  }

  async send<T>(
    request: RequestBuildOptions,
  ): Promise<HttpResponse<T>> {
    // Check if token refresh is needed before making the request
    if (this.mutableAuthState.type === 'oauth' && this.isTokenExpired()) {
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
      this.logger.debug(`DEBUG: Sending request: ${fullRequest.method} ${fullRequest.url}`);
      const response = await this.client.send(fullRequest);
      if (response.status >= 400) {
        const currentAttempt = fullRequest.retryAttempt ?? 0;
        // Handle OAuth token expiry/refresh first
        if (
          response.status === 401 &&
          this.mutableAuthState.type === 'oauth' &&
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
   * Handles newly acquired or refreshed OAuth tokens.
   * This method processes token responses from any source and updates the authentication state:
   * - OAuth endpoint responses (password grant, authorization code grant)
   * - Automatic token refresh during request retry
   *
   * @param tokenResponse - The OAuth token response from the xMatters API
   * @param clientId - The client ID used for token acquisition
   */
  async handleNewOAuthTokens(tokenResponse: OAuth2TokenResponse, clientId: string): Promise<void> {
    this.mutableAuthState = {
      type: 'oauth',
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      clientId: clientId,
      expiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
    };
    await this.executeTokenRefreshCallback(tokenResponse.access_token, tokenResponse.refresh_token);
  }

  /**
   * Gets the current mutable authentication state.
   * Callers can use the `type` property to determine the authentication method
   * and access the appropriate properties in a type-safe manner.
   */
  getCurrentAuthState(): MutableAuthState {
    return this.mutableAuthState;
  }
}
