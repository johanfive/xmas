import type { DeleteOptions, GetOptions, HttpRequest, RequestWithBodyOptions } from './types.ts';
import { HttpHandler } from './http.ts';

/**
 * A wrapper around HttpHandler that automatically prepends a base path to all requests.
 * This allows endpoint classes to focus on their specific paths without repeating the base path.
 */
export class EndpointHttpHandler {
  constructor(
    private readonly http: HttpHandler,
    private readonly basePath: string,
  ) {
    if (!basePath.startsWith('/')) {
      throw new Error('Base path must start with a /');
    }
  }

  /**
   * Prepends the base path to the given path
   */
  private buildPath(path?: string): string {
    if (!path) {
      return this.basePath;
    }
    // Strip any leading slash from the path since we'll add it
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.basePath}/${cleanPath}`;
  }

  /**
   * Send a request with custom options.
   * This is a low-level method that bypasses the automatic base path handling.
   * Use this when you need complete control over the request path.
   *
   * @returns The full HTTP response
   */
  send<T>(
    request: Partial<HttpRequest> & { path: string; method: HttpRequest['method'] },
  ) {
    return this.http.send<T>(request);
  }

  get<T>(options: Omit<GetOptions, 'path'> & { path?: string }) {
    return this.http.get<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }

  post<T>(options: Omit<RequestWithBodyOptions, 'path'> & { path?: string }) {
    return this.http.post<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }

  put<T>(options: Omit<RequestWithBodyOptions, 'path'> & { path?: string }) {
    return this.http.put<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }

  patch<T>(options: Omit<RequestWithBodyOptions, 'path'> & { path?: string }) {
    return this.http.patch<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }

  delete<T>(options: Omit<DeleteOptions, 'path'> & { path?: string }) {
    return this.http.delete<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }
}
