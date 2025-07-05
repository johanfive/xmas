import type { QueryParams } from '../endpoint/query-params.ts';
import type { Headers } from './http.ts';

/**
 * Request options for building HTTP requests.
 * Either path or fullUrl must be provided, but not both.
 */
export interface RequestBuildingOptions {
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
  query?: QueryParams;
  /** Optional request body */
  body?: unknown;
  /** Used internally for retry logic */
  retryAttempt?: number;
  /** Whether to skip adding authentication headers to this request */
  skipAuth?: boolean;
}

// Used internally for the request-handler convenience http methods (get, post, put, patch, delete)
export type RequestOptions = Omit<RequestBuildingOptions, 'method' | 'retryAttempt'>;
// Used internally for resource client convenience methods (get, post, put, patch, delete)
export type ResourceOptions = Omit<RequestOptions, 'fullUrl'>;
// Consumer-facing type for use in endpoint methods.
// Body is omitted because Options is meant to be used for consumer-facing methods
// and typically methods that require a body (like POST/PUT) will have a dedicated payload argument
export type Options = Omit<ResourceOptions, 'skipAuth' | 'body'>;
