import { RequestHandler } from './core/request-handler.ts';
import { DefaultHttpClient, defaultLogger } from './core/defaults/index.ts';
import { isOAuthOptions, XmApiOptions } from './core/types/internal/config.ts';
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

  constructor(private readonly options: XmApiOptions) {
    const {
      httpClient = new DefaultHttpClient(),
      logger = defaultLogger,
      maxRetries = 3,
    } = options;

    // Create initial token state for OAuth if needed
    let initialTokenState;
    if (isOAuthOptions(options)) {
      initialTokenState = {
        accessToken: options.accessToken,
        refreshToken: options.refreshToken || '',
        clientId: options.clientId,
        // Set a default expiry 5 minutes from now - we'll get the real value on first refresh
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        scopes: [],
      };
    }

    this.http = new RequestHandler(
      httpClient,
      logger,
      options,
      maxRetries,
      isOAuthOptions(options) ? options.onTokenRefresh : undefined,
      initialTokenState,
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
