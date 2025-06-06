/**
 * HTTP method option types used internally by the request handling layer.
 * These types define the shape of options passed to HTTP method calls.
 */

/**
 * Base interface for all HTTP method options
 */
export interface HttpMethodOptions {
  /** The path portion of the URL, relative to the API version path */
  path: string;
  /** Optional headers to send with the request */
  headers?: Record<string, string>;
}

/**
 * Options for GET requests
 */
export interface GetOptions extends HttpMethodOptions {
  /** Optional query parameters */
  query?: Record<string, unknown>;
}

/**
 * Options for POST, PUT, and PATCH requests
 */
export interface RequestWithBodyOptions extends HttpMethodOptions {
  /** The request body */
  body?: unknown;
}

/**
 * Options for DELETE requests
 */
export type DeleteOptions = HttpMethodOptions;
