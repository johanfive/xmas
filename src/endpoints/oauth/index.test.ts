/**
 * Unit tests for OAuth endpoint - Password Grant Flow
 */

import { expect } from 'https://deno.land/std@0.224.0/expect/mod.ts';

import { OAuthEndpoint } from './index.ts';
import { RequestHandler } from '../../core/request-handler.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../../core/types/internal/http.ts';
import type {
  Logger,
  TokenRefreshCallback,
  XmApiConfig,
} from '../../core/types/internal/config.ts';
import type { TokenResponse } from './types.ts';

/**
 * Mock HTTP client for testing OAuth endpoint
 */
class MockHttpClient implements HttpClient {
  private responses: HttpResponse[] = [];
  private callIndex = 0;
  public requests: HttpRequest[] = [];

  constructor(responses: HttpResponse[]) {
    this.responses = responses;
  }

  send<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    this.requests.push({ ...request });

    if (this.callIndex >= this.responses.length) {
      throw new Error('MockHttpClient: No more responses configured');
    }

    const response = this.responses[this.callIndex];
    this.callIndex++;
    return Promise.resolve(response as HttpResponse<T>);
  }
}

/**
 * Helper to create a RequestHandler with mock dependencies for testing
 */
function createTestRequestHandler(options: {
  hostname?: string;
  username?: string;
  password?: string;
  clientId?: string;
  accessToken?: string;
  refreshToken?: string;
  onTokenRefresh?: TokenRefreshCallback;
  responses?: HttpResponse[];
} = {}) {
  const {
    hostname = 'https://test.xmatters.com',
    username,
    password,
    clientId,
    accessToken,
    refreshToken,
    onTokenRefresh,
    responses = [],
  } = options;

  // Create silent mock logger
  const mockLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  const mockHttpClient = new MockHttpClient(responses);

  // Create auth options based on provided parameters
  let mockConfig: XmApiConfig;
  if (accessToken && refreshToken && clientId) {
    // OAuth configuration - all three are required
    mockConfig = {
      hostname,
      accessToken,
      refreshToken,
      clientId,
      onTokenRefresh,
      maxRetries: 3,
      httpClient: mockHttpClient,
      logger: mockLogger,
    };
  } else {
    // Create basic auth options even with missing fields so OAuth endpoint can validate them specifically
    // Use a partial basic auth config to test missing field validation
    mockConfig = {
      hostname,
      username: username!,
      password: password!,
      clientId,
      onTokenRefresh,
      maxRetries: 3,
      httpClient: mockHttpClient,
      logger: mockLogger,
    } as XmApiConfig;
  }

  const requestHandler = new RequestHandler(mockConfig);

  return { requestHandler, mockHttpClient, mockLogger };
}

/**
 * Mock successful token response
 */
const mockTokenResponse: HttpResponse<TokenResponse> = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 900,
    token_type: 'bearer',
    scope: 'read write',
  },
};

Deno.test('OAuthEndpoint - getTokensByCredentials() - successful token acquisition', async () => {
  const { requestHandler, mockHttpClient } = createTestRequestHandler({
    username: 'test-user',
    password: 'test-password',
    clientId: 'test-client-id',
    responses: [mockTokenResponse],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);
  const response = await oauthEndpoint.getTokensByCredentials();

  // Verify the request was made correctly
  expect(mockHttpClient.requests).toHaveLength(1);
  const request = mockHttpClient.requests[0];

  expect(request.method).toBe('POST');
  expect(request.url).toBe('https://test.xmatters.com/api/xm/1/oauth2/token');
  expect(request.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
  expect(request.headers?.['Accept']).toBe('application/json');
  // Note: skipAuth is handled by RequestHandler.send() and not passed to the HTTP client
  expect(request.headers?.['Authorization']).toBeUndefined(); // Auth header should be skipped

  // Verify request body contains correct form data
  const expectedBody = new URLSearchParams({
    grant_type: 'password',
    client_id: 'test-client-id',
    username: 'test-user',
    password: 'test-password',
  }).toString();
  expect(request.body).toBe(expectedBody);

  // Verify response structure
  expect(response.status).toBe(200);
  expect(response.body.access_token).toBe('test-access-token');
  expect(response.body.refresh_token).toBe('test-refresh-token');
  expect(response.body.expires_in).toBe(900);
  expect(response.body.token_type).toBe('bearer');
  expect(response.body.scope).toBe('read write');
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - throws error when no constructor credentials', async () => {
  const { requestHandler, mockHttpClient: _ } = createTestRequestHandler({
    // No credentials provided - this will default to basic auth mode but with missing fields
    responses: [],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);

  await expect(oauthEndpoint.getTokensByCredentials()).rejects.toThrow(
    'clientId is required for OAuth token acquisition. Provide it in the XmApi constructor.',
  );

  // Verify no HTTP request was made
  expect(_.requests).toHaveLength(0);
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - throws error when clientId is missing', async () => {
  const { requestHandler, mockHttpClient: _ } = createTestRequestHandler({
    username: 'test-user',
    password: 'test-password',
    // Missing clientId
    responses: [],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);

  await expect(oauthEndpoint.getTokensByCredentials()).rejects.toThrow(
    'clientId is required for OAuth token acquisition. Provide it in the XmApi constructor.',
  );

  expect(_.requests).toHaveLength(0);
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - throws error when username is missing', async () => {
  const { requestHandler, mockHttpClient: _ } = createTestRequestHandler({
    password: 'test-password',
    clientId: 'test-client-id',
    // Missing username
    responses: [],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);

  await expect(oauthEndpoint.getTokensByCredentials()).rejects.toThrow(
    'username is required for OAuth token acquisition. Provide it in the XmApi constructor.',
  );

  expect(_.requests).toHaveLength(0);
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - throws error when password is missing', async () => {
  const { requestHandler, mockHttpClient: _ } = createTestRequestHandler({
    username: 'test-user',
    clientId: 'test-client-id',
    // Missing password
    responses: [],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);

  await expect(oauthEndpoint.getTokensByCredentials()).rejects.toThrow(
    'password is required for OAuth token acquisition. Provide it in the XmApi constructor.',
  );

  expect(_.requests).toHaveLength(0);
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - throws error when API returns non-200 status', async () => {
  const errorResponse: HttpResponse<unknown> = {
    status: 401,
    headers: { 'content-type': 'application/json' },
    body: { error: 'invalid_client', error_description: 'Client authentication failed' },
  };

  const { requestHandler, mockHttpClient } = createTestRequestHandler({
    username: 'test-user',
    password: 'test-password',
    clientId: 'test-client-id',
    responses: [errorResponse],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);

  await expect(oauthEndpoint.getTokensByCredentials()).rejects.toThrow(
    'Request failed with status 401',
  );

  expect(mockHttpClient.requests).toHaveLength(1);
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - calls token refresh callback when provided', async () => {
  let callbackCalled = false;
  let receivedAccessToken = '';
  let receivedRefreshToken = '';

  const { requestHandler, mockHttpClient: _ } = createTestRequestHandler({
    username: 'test-user',
    password: 'test-password',
    clientId: 'test-client-id',
    onTokenRefresh: (accessToken, refreshToken) => {
      callbackCalled = true;
      receivedAccessToken = accessToken;
      receivedRefreshToken = refreshToken;
    },
    responses: [mockTokenResponse],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);
  await oauthEndpoint.getTokensByCredentials();

  // Verify callback was called with correct tokens
  expect(callbackCalled).toBe(true);
  expect(receivedAccessToken).toBe('test-access-token');
  expect(receivedRefreshToken).toBe('test-refresh-token');
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - does not fail if token refresh callback throws error', async () => {
  const { requestHandler, mockHttpClient: _ } = createTestRequestHandler({
    username: 'test-user',
    password: 'test-password',
    clientId: 'test-client-id',
    onTokenRefresh: () => {
      throw new Error('Callback error');
    },
    responses: [mockTokenResponse],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);

  // Should not throw error even though callback fails
  const response = await oauthEndpoint.getTokensByCredentials();
  expect(response.body.access_token).toBe('test-access-token');
});

Deno.test('OAuthEndpoint - getTokensByCredentials() - returns raw API response without field transformation', async () => {
  // Response with actual API field names (snake_case)
  const apiResponse: HttpResponse<TokenResponse> = {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      access_token: 'raw-access-token',
      refresh_token: 'raw-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'api read write',
    },
  };

  const { requestHandler, mockHttpClient: _ } = createTestRequestHandler({
    username: 'test-user',
    password: 'test-password',
    clientId: 'test-client-id',
    responses: [apiResponse],
  });

  const oauthEndpoint = new OAuthEndpoint(requestHandler);
  const response = await oauthEndpoint.getTokensByCredentials();

  // Verify that field names are preserved exactly as returned by API
  expect(response.body.access_token).toBe('raw-access-token');
  expect(response.body.refresh_token).toBe('raw-refresh-token');
  expect(response.body.expires_in).toBe(3600);
  expect(response.body.token_type).toBe('Bearer');
  expect(response.body.scope).toBe('api read write');

  // Verify that the response is the exact same object returned by HTTP client
  expect(response).toBe(apiResponse);
});
