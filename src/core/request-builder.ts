import { XmApiError } from './errors.ts';
import type { Headers, HttpRequest } from './types/internal/http.ts';
import type { QueryParams } from './types/endpoint/query-params.ts';
import type { RequestBuildingOptions } from './types/internal/request-building-options.ts';

export class RequestBuilder {
  private readonly apiVersionPath = '/api/xm/1';

  constructor(
    private readonly baseUrl: string,
    private readonly defaultHeaders: Headers = {},
  ) {}

  /**
   * Builds a query string from query parameters
   * @param query The query parameters to add
   * @param searchParams Optional URLSearchParams instance to add to (defaults to new instance)
   * @returns The query string
   */
  private buildQueryString(query: QueryParams, searchParams = new URLSearchParams()): string {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays by joining with commas
          searchParams.set(key, value.map(String).join(','));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });
    return searchParams.toString();
  }

  build(options: RequestBuildingOptions): HttpRequest {
    let finalUrl: string;
    if (options.fullUrl && options.path) {
      throw new XmApiError(
        'Cannot specify both fullUrl and path. Use fullUrl for external endpoints, path for xMatters API endpoints.',
      );
    }
    if (options.fullUrl) {
      const url = new URL(options.fullUrl);
      if (options.query) {
        // Add new query parameters while preserving existing ones
        this.buildQueryString(options.query, url.searchParams);
      }
      finalUrl = url.toString();
    } else if (options.path) {
      if (!options.path.startsWith('/')) {
        throw new XmApiError('Path must start with a forward slash, e.g. "/people"');
      }
      // Start with the base API URL, then manually append the path to preserve encoding
      // The xMatters API isn't always consistent in its accepting of
      // both encoded and non-encoded identifiers in paths.
      // e.g. xm.groups.getByIdentifier('dc comics') === xm.groups.getByIdentifier('dc%20comics')
      // but xm.people.getByIdentifier('lol@test.com') !== xm.people.getByIdentifier('lol%40test.com')
      // The latter will return a 404 Not Found error.
      // So we always use the path as-is, without encoding it.
      // This means that the caller must ensure the path is properly encoded.
      const url = new URL(this.apiVersionPath, this.baseUrl);
      finalUrl = url.toString() + options.path;
      // Build out query string from parameters separately using URLSearchParams
      if (options.query) {
        const queryString = this.buildQueryString(options.query);
        if (queryString) {
          finalUrl += `?${queryString}`;
        }
      }
    } else {
      throw new XmApiError('Either path or fullUrl must be provided');
    }
    // Build headers by merging default headers with request-specific headers
    const headers: Headers = { ...this.defaultHeaders, ...options.headers };
    const builtRequest: HttpRequest = {
      method: options.method || 'GET',
      url: finalUrl,
      headers,
      body: options.body,
      retryAttempt: options.retryAttempt || 0,
    };
    return builtRequest;
  }
}
