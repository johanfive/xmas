import {
  DeleteOptions,
  GetOptions,
  HttpClient,
  HttpRequest,
  HttpResponse,
  Logger,
  RequestWithBodyOptions,
  XmApiError,
} from './types.ts';

export class DefaultHttpClient implements HttpClient {
  async send(request: HttpRequest): Promise<HttpResponse> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body: unknown;
    const contentType = headers['content-type'];
    if (contentType?.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    return {
      status: response.status,
      headers,
      body,
    };
  }
}

export const defaultLogger: Logger = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

export class RequestBuilder {
  private readonly apiVersionPath = '/api/xm/1';

  constructor(
    private readonly baseUrl: string,
    private readonly defaultHeaders: Record<string, string> = {},
  ) {}

  build(request: Partial<HttpRequest> & { path: string }): HttpRequest {
    const fullPath = `${this.apiVersionPath}${request.path}`;
    const url = new URL(fullPath, this.baseUrl);
    // Add query parameters if present in the request
    if (request.query) {
      Object.entries(request.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return {
      method: request.method || 'GET',
      path: request.path,
      url: url.toString(),
      query: request.query,
      headers: { ...this.defaultHeaders, ...request.headers },
      body: request.body,
      retryAttempt: request.retryAttempt || 0,
    };
  }
}

export class HttpHandler {
  constructor(
    private readonly client: HttpClient,
    private readonly logger: Logger,
    private readonly requestBuilder: RequestBuilder,
    private readonly maxRetries: number = 3,
    private readonly onTokenRefresh?: (
      accessToken: string,
      refreshToken: string,
    ) => void | Promise<void>,
  ) {}

  private async refreshToken(): Promise<void> {
    // TODO: Implement token refresh logic
    return Promise.reject(new Error('Token refresh not implemented'));
  }

  async send<T>(
    request: Partial<HttpRequest> & {
      path: string;
      method?: HttpRequest['method'];
    },
  ): Promise<HttpResponse<T>> {
    const req = this.requestBuilder.build(request);

    try {
      this.logger.debug('Sending request', { request: req });
      const response = await this.client.send(req);
      this.logger.debug('Received response', { response });

      if (
        response.status === 401 && this.onTokenRefresh && req.retryAttempt === 0
      ) {
        await this.refreshToken();
        return this.send({ ...request, retryAttempt: 1 });
      }

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
    } catch (error) {
      if (error instanceof XmApiError) {
        throw error;
      }

      const attempt = req.retryAttempt || 0;
      if (attempt < this.maxRetries) {
        this.logger.warn('Request failed, retrying', { error, attempt });
        return this.send({ ...request, retryAttempt: attempt + 1 });
      }

      if (error instanceof Error) {
        throw new XmApiError(`Request failed: ${error.message}`);
      }
      throw new XmApiError(`Request failed: ${String(error)}`);
    }
  }

  async get<T>(options: GetOptions): Promise<T> {
    const response = await this.send<T>(options);
    return response.body;
  }

  async post<T>(options: RequestWithBodyOptions): Promise<T> {
    const response = await this.send<T>({ ...options, method: 'POST' });
    return response.body;
  }

  async put<T>(options: RequestWithBodyOptions): Promise<T> {
    const response = await this.send<T>({ ...options, method: 'PUT' });
    return response.body;
  }

  async patch<T>(options: RequestWithBodyOptions): Promise<T> {
    const response = await this.send<T>({ ...options, method: 'PATCH' });
    return response.body;
  }

  async delete<T>(options: DeleteOptions): Promise<T> {
    const response = await this.send<T>({ ...options, method: 'DELETE' });
    return response.body;
  }
}
