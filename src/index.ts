import { GroupsEndpoint } from './endpoints/groups/index.ts';
import { IntegrationsEndpoint } from './endpoints/integrations/index.ts';
import { OAuthEndpoint } from './endpoints/oauth/index.ts';
import { PersonsEndpoint } from './endpoints/people/index.ts';
import { RequestHandler } from 'core/request-handler.ts';
import { validateConfig } from 'core/utils/index.ts';
import type { XmApiConfig } from 'types/config.ts';

/**
 * Main entry point for the xMatters API client.
 * This class provides access to all API endpoints through its properties.
 */
export class XmApi {
  /** HTTP handler that manages all API requests */
  private readonly http: RequestHandler;

  public readonly groups: GroupsEndpoint;
  public readonly integrations: IntegrationsEndpoint;
  public readonly oauth: OAuthEndpoint;
  public readonly people: PersonsEndpoint;

  constructor(config: XmApiConfig) {
    // Validate config to ensure it's in exactly one valid state
    validateConfig(config);
    this.http = new RequestHandler(config);
    // Initialize endpoints
    this.groups = new GroupsEndpoint(this.http);
    this.integrations = new IntegrationsEndpoint(this.http);
    this.oauth = new OAuthEndpoint(this.http);
    this.people = new PersonsEndpoint(this.http);
  }
}

// Re-export only the types consumers need to implement
// Dependency injection interfaces - consumers implement these
export type { Logger, TokenRefreshCallback } from 'types/config.ts';
export type { HttpClient } from 'types/http.ts';
// Export error class - consumers need to catch and handle these
export { XmApiError } from './core/errors.ts';
// For convenience
export { axiosAdapter } from './core/defaults/index.ts';
