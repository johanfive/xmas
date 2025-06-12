import { RequestHandler } from './core/request-handler.ts';
import { XmApiConfig } from './core/types/internal/config.ts';
import { GroupsEndpoint } from './endpoints/groups/index.ts';
import { OAuthEndpoint } from './endpoints/oauth/index.ts';

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
 *   accessToken: 'your-access-token',
 *   refreshToken: 'your-refresh-token',
 *   clientId: 'your-client-id',
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
  /** Access OAuth-related endpoints for token acquisition */
  public readonly oauth: OAuthEndpoint;

  constructor(config: XmApiConfig) {
    this.http = new RequestHandler(config);
    // Initialize endpoints
    this.groups = new GroupsEndpoint(this.http);
    this.oauth = new OAuthEndpoint(this.http);
  }
}

// Re-export types and errors
export * from './core/types/internal/config.ts';
export * from './core/types/internal/http.ts';
export * from './core/types/internal/oauth.ts';
export * from './core/types/endpoint/response.ts';
export * from './core/types/endpoint/composers.ts';
export * from './core/types/endpoint/params.ts';
export * from './endpoints/groups/types.ts';
export * from './endpoints/oauth/types.ts';
export { XmApiError } from './core/errors.ts';
