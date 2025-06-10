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
 * Represents a fully-prepared HTTP request ready to be sent.
 * This interface is designed to work with any HTTP client implementation.
 * All URL construction, query parameter handling, and header preparation has been completed.
 */
export interface HttpRequest {
  /** The HTTP method to use for the request */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** The complete, fully-qualified URL ready for the HTTP client to use */
  url: string;
  /** Headers to send with the request (includes auth, content-type, etc.) */
  headers?: Record<string, string>;
  /** Optional request body (injected HTTP client should handle serialization) */
  body?: unknown;
  /** Current retry attempt number (for logging/debugging by HTTP clients) */
  retryAttempt?: number;
}

/**
 * Interface that HTTP clients must implement to be used with this library.
 * This allows consumers to inject their own HTTP implementation.
 */
export interface HttpClient {
  send: (request: HttpRequest) => Promise<HttpResponse>;
}
