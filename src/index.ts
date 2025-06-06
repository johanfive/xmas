import { RequestBuilder } from './core/request-builder.ts';
import { RequestHandler } from './core/request-handler.ts';
import { DefaultHttpClient, defaultLogger } from './core/defaults/index.ts';
import { isBasicAuthOptions, isOAuthOptions, XmApiOptions } from './core/types/internal/config.ts';
import { GroupsEndpoint } from './endpoints/groups/index.ts';
import { TokenData } from './core/types/internal/oauth.ts';

/**
 * Main entry point for the xMatters API client.
 * This class provides access to all API endpoints through its properties.
 *
 * @example Basic Authentication
 * ```typescript
 * const xm = new XmApi({
 *   hostname: 'https://example.xmatters.com',
 *   username: 'your-username',
 *   password: 'your-password',
 *   // Optional configurations
 *   httpClient: myCustomHttpClient,
 *   logger: myCustomLogger,
 *   defaultHeaders: { 'Custom-Header': 'value' },
 *   maxRetries: 3,
 * });
 * ```
 *
 * @example OAuth Authentication (with existing tokens)
 * ```typescript
 * const xm = new XmApi({
 *   hostname: 'https://example.xmatters.com',
 *   accessToken: 'your-token',
 *   refreshToken: 'your-refresh-token',
 *   // Optional configurations
 *   httpClient: myCustomHttpClient,
 *   logger: myCustomLogger,
 *   defaultHeaders: { 'Custom-Header': 'value' },
 *   maxRetries: 3,
 *   onTokenRefresh: (accessToken, refreshToken) => {
 *     // Store the new tokens
 *   },
 * });
 * ```
 */
export class XmApi {
  /** HTTP handler that manages all API requests */
  private readonly http: RequestHandler;

  /** Access groups-related endpoints */
  public readonly groups: GroupsEndpoint;

  /**
   * Creates the authorization header value based on the authentication type
   */
  private createAuthorizationHeader(options: XmApiOptions): string {
    if (isOAuthOptions(options)) {
      return `Bearer ${options.accessToken}`;
    } else if (isBasicAuthOptions(options)) {
      // In Deno, we use TextEncoder for proper UTF-8 encoding
      const encoder = new TextEncoder();
      const authString = `${options.username}:${options.password}`;
      const auth = btoa(String.fromCharCode(...encoder.encode(authString)));
      return `Basic ${auth}`;
    } else {
      // No authentication for token generation endpoints
      return '';
    }
  }

  constructor(options: XmApiOptions) {
    const {
      hostname,
      httpClient = new DefaultHttpClient(),
      logger = defaultLogger,
      defaultHeaders = {},
      maxRetries = 3,
    } = options;

    // Set up default headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...defaultHeaders,
    };

    // Add authorization header if we can determine it now
    const authHeader = this.createAuthorizationHeader(options);
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const requestBuilder = new RequestBuilder(hostname, headers);

    // Get onTokenRefresh callback and token data if using OAuth
    let onTokenRefresh:
      | ((accessToken: string, refreshToken: string) => void | Promise<void>)
      | undefined;
    let tokenData: TokenData | undefined;

    if (isOAuthOptions(options)) {
      onTokenRefresh = options.onTokenRefresh;
      tokenData = {
        accessToken: options.accessToken,
        refreshToken: options.refreshToken || '',
        clientId: options.clientId,
      };
    }

    this.http = new RequestHandler(
      httpClient,
      logger,
      requestBuilder,
      maxRetries,
      onTokenRefresh,
      tokenData,
    );

    // Initialize endpoints
    this.groups = new GroupsEndpoint(this.http);
  }
}

// Re-export types
export * from './core/types/internal/config.ts';
export * from './core/types/internal/http.ts';
export * from './core/types/internal/oauth.ts';
export * from './core/types/endpoint/response.ts';
export * from './core/types/endpoint/composers.ts';
export * from './core/types/endpoint/params.ts';
export * from './endpoints/groups/types.ts';
