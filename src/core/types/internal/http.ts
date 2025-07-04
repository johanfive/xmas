/**
 * Core HTTP types used internally by the library.
 * These types define the shape of requests and responses handled by the HTTP layer.
 */

/**
 * HTTP headers as key-value pairs
 */
export type Headers = Record<string, string>;

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
  headers?: Headers;
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
  headers?: Headers;
  /** Optional request body (injected HTTP client should handle serialization) */
  body?: unknown;
  /** Current retry attempt number (used by retry mechanism; available for logging/debugging in HTTP clients) */
  retryAttempt?: number;
}

/**
 * Interface that HTTP clients must implement to be used with this library.
 *
 * This allows consumers to inject their own HTTP implementation.
 *
 * HTTP client implementations **MUST**:
 * - Return responses for all HTTP status codes (do NOT throw on 4xx/5xx errors)
 * - Handle redirects (3xx) according to HTTP standards (typically automatically)
 * - Normalize response headers to lowercase keys for consistency
 * - Parse JSON response bodies when Content-Type indicates JSON
 *
 * Network/connectivity errors (DNS resolution, connection refused, timeouts, etc.)
 * should be allowed to bubble up as-is - the library will catch and wrap them in
 * XmApiError instances with appropriate context.
 */
export interface HttpClient {
  /**
   * Sends an HTTP request and returns the response.
   *
   * @param request - The HTTP request to send
   * @returns Promise that resolves to the HTTP response
   * @throws May throw for network/connectivity errors (DNS, connection, timeout, etc.)
   *         but MUST NOT throw for HTTP error status codes (4xx, 5xx)
   */
  send: (request: HttpRequest) => Promise<HttpResponse>;
}
