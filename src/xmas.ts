import type { XmasConfig, HttpClient, OAuthTokens, HttpRequestParams, ResourceConstructor } from "./types.ts";
import { createDefaultHttpClient } from "./http/default_client.ts";
import { XmasError } from "./errors.ts";
import { Groups } from "./api/groups/index.ts";

export class Xmas {
  private readonly httpClient: HttpClient;
  private readonly baseUrl: string;
  private readonly config: XmasConfig;
  private accessToken?: string;
  private refreshToken?: string;
  private headers: Record<string, string>;
  
  // Resource instances
  private readonly resources = new Map<ResourceConstructor<unknown>, unknown>();

  constructor(config: XmasConfig) {
    this.validateConfig(config);
    this.config = config;
    this.baseUrl = config.hostname;
    this.httpClient = config.httpClient ?? createDefaultHttpClient();
    
    // Initialize auth tokens if provided
    if (config.accessToken) {
      this.accessToken = config.accessToken;
      this.refreshToken = config.refreshToken;
    }

    // Initialize base headers
    this.headers = {
      "Authorization": this.getAuthHeader(),
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }

  private validateConfig(config: XmasConfig): void {
    if (!config.hostname) {
      throw new XmasError('Configuration must include hostname');
    }
    if (!config.username && !config.password && !config.accessToken) {
      throw new XmasError('Configuration must include either username/password or accessToken');
    }
    if ((config.username && !config.password) || (!config.username && config.password)) {
      throw new XmasError('Both username and password must be provided together');
    }
  }

  private getAuthHeader(): string {
    if (this.accessToken) {
      return `Bearer ${this.accessToken}`;
    }
    if (this.config.username && this.config.password) {
      const encodedCredentials = btoa(`${this.config.username}:${this.config.password}`);
      return `Basic ${encodedCredentials}`;
    }
    throw new XmasError("No valid authentication method available");
  }

  private async request<T>(
    method: string, 
    path: string, 
    data?: unknown, 
    useFullUrl = false
  ): Promise<T> {
    const url = useFullUrl ? path : new URL(path, this.baseUrl).toString();
    const params: HttpRequestParams = {
      method,
      url,
      headers: { ...this.headers },
      data,
    };
    try {
      const response = await this.httpClient.sendRequest(params);
      return this.httpClient.successAdapter(response) as T;
    } catch (error) {
      throw this.httpClient.failureAdapter(error);
    }
  }

  async getOAuthTokens(): Promise<OAuthTokens> {
    if (!this.config.username || !this.config.password) {
      throw new XmasError("Username and password are required for OAuth token exchange");
    }
    const tokens = await this.request<OAuthTokens>("POST", "/api/xm/1/oauth2/token", {
      grant_type: "password",
      username: this.config.username,
      password: this.config.password,
      client_id: this.config.clientId,
    });
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    // Update Authorization header with new token
    this.headers.Authorization = this.getAuthHeader();
    return tokens;
  }

  /** Send a request to a custom URL outside the standard API endpoints */
  sendRequest<T = unknown>(
    url: string, 
    options: {
      method?: string;
      data?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const { method = "GET", data } = options;
    return this.request(method, url, data, true);
  }

  private wrapClient(client: HttpClient): HttpClient {
    return {
      ...client,
      sendRequest: (params: HttpRequestParams) => 
        client.sendRequest({
          ...params,
          headers: { ...this.headers, ...params.headers },
        }),
    };
  }

  private getResource<T>(ResourceClass: ResourceConstructor<T>): T {
    let resource = this.resources.get(ResourceClass) as T | undefined;
    if (!resource) {
      resource = new ResourceClass(
        this.wrapClient(this.httpClient),
        this.baseUrl,
      );
      this.resources.set(ResourceClass, resource);
    }
    return resource;
  }

  get groups(): Groups {
    return this.getResource(Groups);
  }
}
