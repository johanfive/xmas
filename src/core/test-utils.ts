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
  public forceError?: Error;

  constructor(responses: HttpResponse | HttpResponse[]) {
    // Create minimal implementations for required dependencies
    const mockClient: HttpClient = {
      send: async () => ({ status: 200, headers: {}, body: {} }),
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

  override async send<T>(
    request: Partial<HttpRequest> & { path: string; method?: HttpRequest['method'] },
  ): Promise<HttpResponse<T>> {
    try {
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

      // If forceError is set, throw it as an XmApiError
      if (this.forceError) {
        throw new XmApiError('Request failed', undefined, this.forceError);
      }

      const currentAttempt = fullRequest.retryAttempt ?? 0;
      const currentResponse = this.responses[currentAttempt];
      if (!currentResponse) {
        throw new XmApiError('No mock response available for request');
      }

      // For retryable responses (429 or 5xx), check if we have a next response
      if (
        (currentResponse.status === 429 ||
          (currentResponse.status >= 500 && currentResponse.status < 600)) &&
        this.responses[currentAttempt + 1]
      ) {
        // For rate limits, respect the Retry-After header
        if (currentResponse.status === 429 && currentResponse.headers['retry-after']) {
          const retryAfter = parseInt(currentResponse.headers['retry-after'], 10);
          if (!isNaN(retryAfter)) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          }
        }

        // Retry the request with the next response
        return this.send<T>({
          ...request,
          retryAttempt: currentAttempt + 1,
        });
      }

      // For non-retryable errors or if we're out of responses, throw an error
      if (currentResponse.status >= 400) {
        let message = `Request failed with status ${currentResponse.status}`;
        if (
          currentResponse.body && typeof currentResponse.body === 'object' &&
          'message' in currentResponse.body
        ) {
          message = String(currentResponse.body.message);
        } else if (typeof currentResponse.body === 'string' && currentResponse.body.trim()) {
          message = currentResponse.body.trim();
        }

        if (
          currentResponse.body && typeof currentResponse.body === 'object' &&
          'code' in currentResponse.body
        ) {
          message = `${currentResponse.body.code}: ${message}`;
        }

        throw new XmApiError(
          message,
          {
            status: currentResponse.status,
            headers: currentResponse.headers,
            body: typeof currentResponse.body === 'string'
              ? currentResponse.body
              : JSON.stringify(currentResponse.body),
          },
        );
      }

      return currentResponse as HttpResponse<T>;
    } catch (error) {
      if (error instanceof XmApiError) {
        throw error;
      }
      throw new XmApiError('Request failed', undefined, error);
    }
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
