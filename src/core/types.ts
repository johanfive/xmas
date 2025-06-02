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

export class XmApiError extends Error {
  constructor(
    message: string,
    public readonly response?: {
      body: string;
      status: number;
      headers: Record<string, string>;
    }
  ) {
    super(message);
    this.name = 'XmApiError';
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
