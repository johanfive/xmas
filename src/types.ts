export interface HttpClient {
  sendRequest: (params: HttpRequestParams) => Promise<unknown>;
  successAdapter: (response: unknown) => unknown;
  failureAdapter: (error: unknown) => never;
}

export interface HttpRequestParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: unknown;
}

export interface XmasConfig {
  hostname: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  httpClient?: HttpClient;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type ResourceConstructor<T> = new (client: HttpClient, baseUrl: string) => T;
