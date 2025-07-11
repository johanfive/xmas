/**
 * HTTP headers as key-value pairs
 */
export type Headers = Record<string, string>;

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
  /** Current retry attempt number (used by retry mechanism; available in HTTP clients for logging/debugging) */
  retryAttempt?: number;
}

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

/**
 * Response wrapper types for endpoint implementations.
 * These provide standardized response shapes that endpoints can use.
 */

/**
 * Common response wrapper for paginated lists
 */
export interface PaginatedResponse<T> {
  /** Number of items in this response */
  count: number;
  /** Total number of items available */
  total: number;
  /** The items for this page */
  data: T[];
  /** HAL links for navigation */
  links?: {
    /** URL to current page */
    self: string;
    /** URL to next page, if available */
    next?: string;
    /** URL to previous page, if available */
    prev?: string;
  };
}

/**
 * Type alias for HTTP responses containing paginated data.
 * Use this for endpoint methods that return paginated lists.
 *
 * @template T The type of items in the paginated response
 *
 * @example
 * ```typescript
 * // Mind the difference between:
 * // Promise<PaginatedResponse<Group>> and Promise<PaginatedHttpResponse<Group>>
 * get(): Promise<PaginatedHttpResponse<Group>> {
 *   return this.http.get<PaginatedResponse<Group>>();
 * }
 * ```
 */
export type PaginatedHttpResponse<T> = HttpResponse<PaginatedResponse<T>>;

// Note: For single resource responses, use HttpResponse<T> directly
// Example: Promise<HttpResponse<Group>> instead of creating an unnecessary alias

/**
 * Type alias for HTTP responses that don't return a body (like delete operations).
 * Use this for endpoint methods that perform actions without returning data.
 *
 * @example
 * ```typescript
 * // Mind the difference between:
 * // Promise<void> and Promise<EmptyHttpResponse>
 * delete(id: string): Promise<EmptyHttpResponse> {
 *   return this.http.delete<void>({ path: id });
 * }
 * ```
 */
export type EmptyHttpResponse = HttpResponse<void>;
