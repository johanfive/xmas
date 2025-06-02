import { HttpClient, HttpRequest, HttpResponse, Logger, XmApiError, XmApiOptions } from './types.ts';
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
      send: () => Promise.resolve({ status: 200, headers: {}, body: {} })
    };
    const mockLogger: Logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };
    const mockRequestBuilder = new MockRequestBuilder();
    
    super(mockClient, mockLogger, mockRequestBuilder);
    this.responses = Array.isArray(responses) ? responses : [responses];
  }

  override async send<T>(request: Partial<HttpRequest> & { path: string; method?: HttpRequest['method'] }): Promise<HttpResponse<T>> {
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
    
    const response = this.responses[this.requests.length - 1] || this.responses[this.responses.length - 1];
    
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

export function createMockOptions(options: Partial<XmApiOptions> = {}): XmApiOptions {
  if ('accessToken' in options) {
    return {
      hostname: 'https://example.com',
      accessToken: 'mock-token',
      ...options,
    };
  }
  return {
    hostname: 'https://example.com',
    username: 'mock-user',
    password: 'mock-password',
    ...options,
  };
}

export function createMockResponse<T>(body: T, status = 200, headers: Record<string, string> = {}): HttpResponse<T> {
  return {
    body,
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
}
