/**
 * HTTP method option types used internally by the request handling layer.
 * These types define the shape of options passed to HTTP method calls.
 */

import type { Headers } from './http.ts';

/**
 * Base interface for all HTTP method options
 */
interface HttpMethodBaseOptions {
  /** The path portion of the URL, relative to the API version path */
  path: string;
  /** Optional headers to send with the request */
  headers?: Headers;
  /** Whether to skip adding authentication headers */
  skipAuth?: boolean;
}

/**
 * Options for GET requests
 */
export interface GetOptions extends HttpMethodBaseOptions {
  /** Optional query parameters */
  query?: Record<string, unknown>;
}

/**
 * Options for POST, PUT, and PATCH requests
 */
export interface RequestWithBodyOptions extends HttpMethodBaseOptions {
  /** The request body */
  body?: unknown;
}

/**
 * Options for DELETE requests
 */
export type DeleteOptions = HttpMethodBaseOptions;
