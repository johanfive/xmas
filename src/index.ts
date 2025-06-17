import { RequestHandler } from './core/request-handler.ts';
import { validateConfig } from './core/utils/index.ts';
import type { XmApiConfig } from './core/types/internal/config.ts';
import { GroupsEndpoint } from './endpoints/groups/index.ts';
import { OAuthEndpoint } from './endpoints/oauth/index.ts';

/**
 * Main entry point for the xMatters API client.
 * This class provides access to all API endpoints through its properties.
 */
export class XmApi {
  /** HTTP handler that manages all API requests */
  private readonly http: RequestHandler;
  /** Access groups-related endpoints */
  public readonly groups: GroupsEndpoint;
  /** Access OAuth-related endpoints for token acquisition */
  public readonly oauth: OAuthEndpoint;

  constructor(config: XmApiConfig) {
    // Validate config to ensure it's in exactly one valid state
    validateConfig(config);
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
export * from './core/types/internal/auth-state.ts';
export * from './core/types/endpoint/response.ts';
export * from './core/types/endpoint/composers.ts';
export * from './core/types/endpoint/params.ts';
export * from './endpoints/groups/types.ts';
export { XmApiError } from './core/errors.ts';
