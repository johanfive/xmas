import { XmApiError } from './errors.ts';
import type { RequestHandler } from './request-handler.ts';
import type { ResourceOptions } from 'types/request-building-options.ts';

/**
 * A wrapper around RequestHandler that automatically prepends a base path to all requests.
 * Each API resource (endpoint) gets its own instance of this client to handle resource-specific paths.
 * This allows endpoint classes to focus on their specific paths without repeating the base path.
 */
export class ResourceClient {
  constructor(
    private readonly http: RequestHandler,
    private readonly basePath: string,
  ) {
    if (!basePath.startsWith('/')) {
      throw new XmApiError('Base path must start with a /');
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

  get<T>(options?: ResourceOptions) {
    return this.http.get<T>({
      ...options,
      path: this.buildPath(options?.path),
    });
  }

  post<T>(options: ResourceOptions) {
    return this.http.post<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }

  put<T>(options: ResourceOptions) {
    return this.http.put<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }

  patch<T>(options: ResourceOptions) {
    return this.http.patch<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }

  delete<T>(options: ResourceOptions) {
    return this.http.delete<T>({
      ...options,
      path: this.buildPath(options.path),
    });
  }
}
