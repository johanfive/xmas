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

export interface HttpClient {
  send: (request: HttpRequest) => Promise<HttpResponse>;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface XmApiBaseOptions {
  hostname: string;
  httpClient?: HttpClient;
  logger?: Logger;
  defaultHeaders?: Record<string, string>;
  maxRetries?: number;
}

export interface XmApiBasicAuthOptions extends XmApiBaseOptions {
  username: string;
  password: string;
}

export interface XmApiOAuthOptions extends XmApiBaseOptions {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  onTokenRefresh?: (accessToken: string, refreshToken: string) => void | Promise<void>;
}

export type XmApiOptions = XmApiBasicAuthOptions | XmApiOAuthOptions;

export function isOAuthOptions(options: XmApiOptions): options is XmApiOAuthOptions {
  return 'accessToken' in options;
}

/**
 * Base class for all errors thrown by the xMatters API client.
 * Contains information about the failed request and response.
 */
export class XmApiError extends Error {
  /**
   * @param message Human-readable error message
   * @param response Optional response details if the error occurred after receiving a response
   * @param cause Optional underlying error that caused this error
   */
  constructor(
    message: string,
    public readonly response?: {
      /** The response body as a string */
      body: string;
      /** The HTTP status code that triggered this error */
      status: number;
      /** Response headers that may contain additional error context */
      headers: Record<string, string>;
    },
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'XmApiError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, XmApiError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

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

/**
 * Common pagination parameters used across many endpoints
 */
export interface PaginationParams {
  /**
   * The maximum number of records to return
   * @default 100
   */
  limit?: number;

  /**
   * The number of records to skip
   * Used for pagination in combination with limit
   * @default 0
   */
  offset?: number;
}

/**
 * Common search parameters used across many endpoints
 */
export interface SearchParams {
  /**
   * A string used to filter records by matching on names or other searchable fields
   * The search is typically case-insensitive and matches any part of the searchable fields
   */
  search?: string;
}

/**
 * Common sorting parameters used across many endpoints
 */
export interface SortParams {
  /**
   * Field to sort by
   */
  sortBy?: string;

  /**
   * Sort direction
   * @default 'ASC'
   */
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Helper type to add pagination to endpoint parameters
 */
export type WithPagination<T extends Record<string, unknown> = Record<string, never>> =
  & T
  & PaginationParams;

/**
 * Helper type to add search capability to endpoint parameters
 */
export type WithSearch<T extends Record<string, unknown> = Record<string, never>> =
  & T
  & SearchParams;

/**
 * Helper type to add sorting to endpoint parameters
 */
export type WithSort<T extends Record<string, unknown> = Record<string, never>> = T & SortParams;

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
 * Common type utilities for building endpoint parameter types.
 *
 * @example Simple paginated endpoint
 * ```typescript
 * interface DeviceFilters extends Record<string, unknown> {
 *   status?: 'ACTIVE' | 'INACTIVE';
 * }
 *
 * type GetDevicesParams = WithPagination<DeviceFilters>;
 * // Results in:
 * // {
 * //   status?: 'ACTIVE' | 'INACTIVE';
 * //   limit?: number;
 * //   offset?: number;
 * // }
 * ```
 *
 * @example Endpoint with search and pagination
 * ```typescript
 * interface UserFilters extends Record<string, unknown> {
 *   role?: string;
 * }
 *
 * // Compose multiple parameter types
 * type GetUsersParams = WithPagination<WithSearch<UserFilters>>;
 * // Results in:
 * // {
 * //   role?: string;
 * //   search?: string;
 * //   limit?: number;
 * //   offset?: number;
 * // }
 * ```
 *
 * @example Full endpoint type definition
 * ```typescript
 * // 1. Define your resource type
 * interface User {
 *   id: string;
 *   name: string;
 *   // ...other properties
 * }
 *
 * // 2. Define endpoint-specific filters
 * interface UserFilters extends Record<string, unknown> {
 *   role?: string;
 *   status?: 'ACTIVE' | 'INACTIVE';
 * }
 *
 * // 3. Compose parameter types with pagination, search, and sort
 * type GetUsersParams = WithPagination<WithSearch<WithSort<UserFilters>>>;
 *
 * // 4. Use the generic paginated response
 * type GetUsersResponse = PaginatedResponse<User>;
 *
 * // Now you can implement your endpoint:
 * class UsersEndpoint {
 *   async getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
 *     return this.http.get({ path: '/users', query: params });
 *   }
 * }
 * ```
 */
