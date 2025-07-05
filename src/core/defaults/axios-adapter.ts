import type { Headers, HttpClient, HttpRequest, HttpResponse } from 'types/http.ts';

// Minimal interface for what we need from an axios instance
interface AxiosLike {
  (config: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    data?: unknown;
    validateStatus?: () => boolean;
  }): Promise<{
    status: number;
    headers: Record<string, unknown>;
    data: unknown;
  }>;
}

/**
 * Creates an HTTP client adapter from an existing axios instance.
 *
 * **Use this adapter ONLY if your project already uses axios.**
 *
 * This function wraps your existing axios instance to work with the xMatters API library.
 * It ensures axios doesn't throw on HTTP error status codes, which would interfere
 * with the library's retry and error handling logic.
 *
 * If your project doesn't already use axios, stick with the default HTTP client
 * (which uses native fetch) - no additional dependencies needed.
 *
 * ## Usage
 *
 * ```typescript
 * import axios from 'axios';
 * import { axiosAdapter, XmApi } from 'xmas';
 *
 * // Create your axios instance with whatever config you need
 * const axiosInstance = axios.create({
 *   timeout: 10000,
 *   proxy: { host: 'proxy.company.com', port: 8080 },
 * });
 *
 * const client = new XmApi({
 *   hostname: 'your-instance.xmatters.com',
 *   username: 'your-username',
 *   password: 'your-password',
 *   httpClient: axiosAdapter(axiosInstance),
 * });
 * ```
 *
 * @param axiosInstance - Your existing axios instance
 * @returns HttpClient that wraps the axios instance
 */
export function axiosAdapter(axiosInstance: AxiosLike): HttpClient {
  return {
    async send(request: HttpRequest): Promise<HttpResponse> {
      const response = await axiosInstance({
        url: request.url,
        method: request.method,
        headers: request.headers,
        data: request.body,
        validateStatus: () => true, // Critical: never throw on HTTP status codes
      });

      const headers: Headers = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        headers[key.toLowerCase()] = String(value);
      });

      return {
        status: response.status,
        headers,
        body: response.data,
      };
    },
  };
}
