import {
  HttpClient,
  HttpRequest,
  HttpResponse,
  Logger,
  XmApiError,
  XmApiOptions,
} from './types.ts';
import { HttpHandler, RequestBuilder } from './http.ts';

class MockRequestBuilder extends RequestBuilder {
  constructor() {
    super('https://example.com');
  }

  override build(request: Partial<HttpRequest> & { path: string }): HttpRequest {
    return {
      method: request.method || 'GET',
      path: request.path,
      url: `https://example.com${request.path}`,
      query: request.query,
      headers: request.headers || {},
      body: request.body,
      retryAttempt: request.retryAttempt || 0,
    };
  }
}

export class MockHttpHandler extends HttpHandler {
  public readonly requests: HttpRequest[] = [];
  private readonly responses: HttpResponse[];

  constructor(responses: HttpResponse | HttpResponse[]) {
    // Create minimal implementations for required dependencies
    const mockClient: HttpClient = {
      send: () => Promise.resolve({ status: 200, headers: {}, body: {} }),
    };
    const mockLogger: Logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    const mockRequestBuilder = new MockRequestBuilder();

    super(mockClient, mockLogger, mockRequestBuilder);
    this.responses = Array.isArray(responses) ? responses : [responses];
  }

  // deno-lint-ignore require-await
  override async send<T>(
    request: Partial<HttpRequest> & { path: string; method?: HttpRequest['method'] },
  ): Promise<HttpResponse<T>> {
    const fullRequest: HttpRequest = {
      method: request.method || 'GET',
      path: request.path,
      url: request.url || `https://example.com${request.path}`,
      query: request.query,
      headers: request.headers,
      body: request.body,
      retryAttempt: request.retryAttempt || 0,
    };

    this.requests.push(fullRequest);

    const response = this.responses[this.requests.length - 1] ||
      this.responses[this.responses.length - 1];

    // If status >= 400, throw an XmApiError
    if (response.status >= 400) {
      throw new XmApiError(
        `Request failed with status ${response.status}`,
        {
          status: response.status,
          headers: response.headers,
          body: typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
        },
      );
    }

    return response as HttpResponse<T>;
  }
}

export interface CreateMockResponseOptions<T> {
  /** The response body */
  body: T;
  /** The HTTP status code */
  status?: number;
  /** Response headers */
  headers?: Record<string, string>;
}

export function createMockResponse<T>(options: CreateMockResponseOptions<T>): HttpResponse<T> {
  return {
    body: options.body,
    status: options.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  };
}

export interface CreateMockOptionsConfig {
  /** Optional base URL for the mock API. Defaults to https://example.com */
  mockBaseUrl?: string;
  /** OAuth configuration */
  oauth?: {
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
  };
  /** Basic Auth configuration */
  basicAuth?: {
    username?: string;
    password?: string;
  };
}

export function createMockOptions(config: CreateMockOptionsConfig = {}): XmApiOptions {
  const { mockBaseUrl = 'https://example.com' } = config;

  if (config.oauth) {
    return {
      hostname: mockBaseUrl,
      accessToken: config.oauth.accessToken ?? 'mock-token',
      refreshToken: config.oauth.refreshToken,
      clientId: config.oauth.clientId,
    };
  }
  return {
    hostname: mockBaseUrl,
    username: config.basicAuth?.username ?? 'mock-user',
    password: config.basicAuth?.password ?? 'mock-password',
  };
}
