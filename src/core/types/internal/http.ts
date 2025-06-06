/**
 * Core HTTP types used internally by the library.
 * These types define the shape of requests and responses handled by the HTTP layer.
 */

/**
 * Represents an HTTP response from the xMatters API.
 * @template T The expected type of the response body
 */
export interface HttpResponse<T = unknown> {
  /** The parsed response body */
  body: T;
  /** The HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Represents an HTTP request to be sent to the xMatters API.
 */
export interface HttpRequest {
  /** The HTTP method to use for the request */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** The complete URL for the request */
  url: string;
  /** The path portion of the URL, used for testing and debugging */
  path: string;
  /** Optional headers to send with the request */
  headers?: Record<string, string>;
  /** Optional query parameters to include in the URL */
  query?: Record<string, unknown>;
  /** Optional request body */
  body?: unknown;
  /** Used internally for retry logic */
  retryAttempt?: number;
}

/**
 * Interface that HTTP clients must implement to be used with this library.
 * This allows consumers to inject their own HTTP implementation.
 */
export interface HttpClient {
  send: (request: HttpRequest) => Promise<HttpResponse>;
}
