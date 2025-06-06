import { RequestBuilder } from './core/request-builder.ts';
import { RequestHandler } from './core/request-handler.ts';
import { DefaultHttpClient, defaultLogger } from './core/defaults/index.ts';
import { XmApiOptions } from './core/types/internal/config.ts';
import { GroupsEndpoint } from './endpoints/groups/index.ts';

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
 * @example OAuth Authentication
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
    if ('accessToken' in options) {
      return `Bearer ${options.accessToken}`;
    } else {
      // In Deno, we use TextEncoder for proper UTF-8 encoding
      const encoder = new TextEncoder();
      const authString = `${options.username}:${options.password}`;
      const auth = btoa(String.fromCharCode(...encoder.encode(authString)));
      return `Basic ${auth}`;
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

    // Set up default headers with auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...defaultHeaders,
      'Authorization': this.createAuthorizationHeader(options),
    };

    const requestBuilder = new RequestBuilder(hostname, headers);

    // Get onTokenRefresh callback if using OAuth
    const onTokenRefresh = 'onTokenRefresh' in options ? options.onTokenRefresh : undefined;

    this.http = new RequestHandler(httpClient, logger, requestBuilder, maxRetries, onTokenRefresh);

    // Initialize endpoints
    this.groups = new GroupsEndpoint(this.http);
  }
}

// Re-export types
export * from './core/types/internal/config.ts';
export * from './core/types/internal/http.ts';
export * from './core/types/endpoint/response.ts';
export * from './core/types/endpoint/composers.ts';
export * from './core/types/endpoint/params.ts';
export * from './endpoints/groups/types.ts';
