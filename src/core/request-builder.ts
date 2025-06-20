import type { Headers, HttpRequest } from './types/internal/http.ts';
import { XmApiError } from './errors.ts';

/**
 * Request options for building HTTP requests.
 * Either path or fullUrl must be provided, but not both.
 */
export interface RequestBuildOptions {
  /**
   * The path relative to the API version path.
   * Do not include the API version (/api/xm/1).
   * Must start with a forward slash.
   * @example "/people"
   */
  path?: string;
  /**
   * A fully qualified URL.
   * Use to bypass URL building logic entirely.
   * @example "https://api.external-service.com/v2/endpoint"
   * @example "https://you.xmatters.com/api/integration/1/functions/6358eaf3-6213-42fc-8629-e823cf5739cb/triggers?apiKey=a12bcde3-456f-7g89-123a-b456789cd000"
   */
  fullUrl?: string;
  /** The HTTP method to use for the request */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Optional headers to send with the request */
  headers?: Headers;
  /** Optional query parameters to include in the URL */
  query?: Record<string, unknown>;
  /** Optional request body */
  body?: unknown;
  /** Used internally for retry logic */
  retryAttempt?: number;
  /** Whether to skip adding authentication headers to this request */
  skipAuth?: boolean;
}

export class RequestBuilder {
  private readonly apiVersionPath = '/api/xm/1';

  constructor(
    private readonly baseUrl: string,
    private readonly defaultHeaders: Headers = {},
  ) {}

  build(options: RequestBuildOptions): HttpRequest {
    let url: URL;
    if (options.fullUrl && options.path) {
      throw new XmApiError(
        'Cannot specify both fullUrl and path. Use fullUrl for external endpoints, path for xMatters API endpoints.',
      );
    }
    if (options.fullUrl) {
      url = new URL(options.fullUrl);
    } else if (options.path) {
      if (!options.path.startsWith('/')) {
        throw new XmApiError('Path must start with a forward slash, e.g. "/people"');
      }
      url = new URL(`${this.apiVersionPath}${options.path}`, this.baseUrl);
    } else {
      throw new XmApiError('Either path or fullUrl must be provided');
    }
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    // Build headers by merging default headers with request-specific headers
    const headers: Headers = { ...this.defaultHeaders, ...options.headers };
    const builtRequest: HttpRequest = {
      method: options.method || 'GET',
      url: url.toString(),
      headers,
      body: options.body,
      retryAttempt: options.retryAttempt || 0,
    };
    return builtRequest;
  }
}
