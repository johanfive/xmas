import { HttpRequest } from './types.ts';

/**
 * Request options for building HTTP requests.
 * Either path or fullUrl must be provided, but not both.
 */
export interface RequestBuildOptions extends Partial<HttpRequest> {
  /**
   * The path relative to the API version path.
   * Do not include the API version (/api/xm/1).
   * Must start with a forward slash.
   * @example "/people"
   */
  path?: string;

  /**
   * A complete URL to an external endpoint.
   * Use this when you need to bypass the xMatters API completely.
   * @example "https://api.external-service.com/v2/endpoint"
   */
  fullUrl?: string;
}

export class RequestBuilder {
  private readonly apiVersionPath = '/api/xm/1';

  constructor(
    private readonly baseUrl: string,
    private readonly defaultHeaders: Record<string, string> = {},
  ) {}

  build(options: RequestBuildOptions): HttpRequest {
    let url: URL;

    if (options.fullUrl && options.path) {
      throw new Error(
        'Cannot specify both fullUrl and path. Use fullUrl for external endpoints, path for xMatters API endpoints.',
      );
    }

    if (options.fullUrl) {
      url = new URL(options.fullUrl);
    } else if (options.path) {
      if (!options.path.startsWith('/')) {
        throw new Error('Path must start with a forward slash, e.g. "/people"');
      }
      url = new URL(`${this.apiVersionPath}${options.path}`, this.baseUrl);
    } else {
      throw new Error('Either path or fullUrl must be provided');
    }

    // Add query parameters if present in the options
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const builtRequest: HttpRequest = {
      method: options.method || 'GET',
      // For the path property, use the actual path provided or extract it from fullUrl
      path: options.path || options.fullUrl || '',
      url: url.toString(),
      query: options.query,
      headers: { ...this.defaultHeaders, ...options.headers },
      body: options.body,
      retryAttempt: options.retryAttempt || 0,
    };

    return builtRequest;
  }
}
