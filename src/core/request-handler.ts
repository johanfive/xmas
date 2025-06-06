import {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from './types/internal/http.ts';
import { Logger } from './types/internal/config.ts';
import {
  DeleteOptions,
  GetOptions,
  RequestWithBodyOptions,
} from './types/internal/methods.ts';
import { XmApiError } from './errors.ts';
import { TokenData, TokenState } from './oauth-types.ts';
import { RequestBuilder } from './request-builder.ts';

export class RequestHandler {
  /** Current token state if using OAuth */
  private tokenState?: TokenState;

  /**
   * Helper method to safely convert a response body to a string for error messages
   */
  private stringifyErrorBody(body: unknown): string {
    if (typeof body === 'string') {
      return body;
    }
    if (body && typeof body === 'object') {
      try {
        return JSON.stringify(body);
      } catch {
        return '[Unable to stringify error body]';
      }
    }
    return String(body ?? '[No error details available]');
  }

  /**
   * Helper method to create an error response
   */
  private createErrorResponse(response: HttpResponse): {
    body: string;
    status: number;
    headers: Record<string, string>;
  } {
    return {
      body: this.stringifyErrorBody(response.body),
      status: response.status,
      headers: response.headers,
    };
  }

  constructor(
    private readonly client: HttpClient,
    private readonly logger: Logger,
    private readonly requestBuilder: RequestBuilder,
    private readonly maxRetries: number = 3,
    private readonly onTokenRefresh?: (
      accessToken: string,
      refreshToken: string,
    ) => void | Promise<void>,
    tokenData?: TokenData,
  ) {
    // If we have token data, initialize token state
    if (tokenData) {
      this.tokenState = {
        ...tokenData,
        // Set a default expiry 5 minutes from now - we'll get the real value on first refresh
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        scopes: [],
        clientId: tokenData.clientId,
      };
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
      if (!this.tokenState?.refreshToken) {
        throw new XmApiError('No refresh token available for token refresh');
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokenState.refreshToken,
      });

      // Add client ID if available (required for some OAuth2 servers)
      if (this.tokenState.clientId) {
        params.append('client_id', this.tokenState.clientId);
      }

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

      if (response.status !== 200 || !response.body) {
        throw new XmApiError('Failed to refresh token', this.createErrorResponse(response));
      }

      if (typeof response.body !== 'object' || !response.body) {
        throw new XmApiError(
          'Invalid token response format',
          this.createErrorResponse(response),
        );
      }

      const body = response.body as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };

      if (!body.access_token || !body.refresh_token) {
        throw new XmApiError(
          'Token response missing required fields',
          this.createErrorResponse(response),
        );
      }

      this.tokenState = {
        ...this.tokenState, // Preserve clientId and other fields
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        scopes: body.scope?.split(' ') ?? [],
        expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) * 1000)).toISOString(),
      };

      if (this.onTokenRefresh) {
        try {
          await this.onTokenRefresh(
            this.tokenState.accessToken,
            this.tokenState.refreshToken,
          );
        } catch (error) {
          this.logger.warn(
            'Error in onTokenRefresh callback, but continuing with refreshed token',
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to refresh token:', error);
      throw error;
    }
  }

  private exponentialBackoff(attempt: number): number {
    // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, capped at 10s
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }

  async send<T>(
    request: Partial<HttpRequest> & {
      path?: string;
      fullUrl?: string;
      method?: HttpRequest['method'];
    },
  ): Promise<HttpResponse<T>> {
    // Check if token refresh is needed before making the request
    if (this.tokenState && this.isTokenExpired()) {
      await this.refreshToken();
    }

    const fullRequest = this.requestBuilder.build(request);

    // Add authorization header if we have a token
    if (this.tokenState?.accessToken) {
      fullRequest.headers = {
        ...fullRequest.headers,
        Authorization: `Bearer ${this.tokenState.accessToken}`,
      };
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

        // Try to extract a descriptive message from the response
        let message = `Request failed with status ${response.status}`;
        if (response.body && typeof response.body === 'object' && 'message' in response.body) {
          message = String(response.body.message);
        } else if (typeof response.body === 'string' && response.body.trim()) {
          message = response.body.trim();
        }

        // Add error code if available
        if (response.body && typeof response.body === 'object' && 'code' in response.body) {
          message = `${response.body.code}: ${message}`;
        }

        throw new XmApiError(
          message,
          this.createErrorResponse(response),
        );
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
}
