import type { HttpClient } from "../types.ts";

export abstract class BaseApi {
  private static readonly API_VERSION = "/api/xm/1";
  
  constructor(
    private readonly client: HttpClient,
    private readonly baseUrl: string,
    private readonly resourcePath: string,
  ) {
    if (!resourcePath.startsWith("/")) {
      throw new Error("Resource path must start with '/'");
    }
  }

  private buildPath(pathOrParams?: string | Record<string, string>): string {
    // If it's search params or no path, return base resource path
    if (!pathOrParams || typeof pathOrParams !== 'string') {
      return `${BaseApi.API_VERSION}${this.resourcePath}`;
    }
    // Otherwise append the path segment
    return `${BaseApi.API_VERSION}${this.resourcePath}/${pathOrParams}`;
  }

  protected async request<T>(
    method: string,
    path: string,
    data?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(this.buildPath(path), this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value);
        }
      });
    }
    try {
      const response = await this.client.sendRequest({
        method,
        url: url.toString(),
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        data: data ? JSON.stringify(data) : undefined,
      });
      return this.client.successAdapter(response) as T;
    } catch (error) {
      throw this.client.failureAdapter(error);
    }
  }

  protected get<T>(): Promise<T>;
  protected get<T>(params: Record<string, string>): Promise<T>;
  protected get<T>(path: string): Promise<T>;
  protected get<T>(path: string, params: Record<string, string>): Promise<T>;
  protected get<T>(pathOrParams?: string | Record<string, string>, params?: Record<string, string>): Promise<T> {
    if (typeof pathOrParams === 'object') {
      return this.request("GET", "", null, pathOrParams);
    }
    return this.request("GET", pathOrParams || "", null, params);
  }

  protected post<T>(pathOrData?: string | unknown, data?: unknown): Promise<T> {
    const [path, payload] = typeof pathOrData === 'string'
      ? [pathOrData, data]
      : ['', pathOrData];
    return this.request("POST", path, payload);
  }

  protected put<T>(pathOrData?: string | unknown, data?: unknown): Promise<T> {
    const [path, payload] = typeof pathOrData === 'string'
      ? [pathOrData, data]
      : ['', pathOrData];
    return this.request("PUT", path, payload);
  }

  protected delete(path: string): Promise<void> {
    return this.request("DELETE", path);
  }
}
