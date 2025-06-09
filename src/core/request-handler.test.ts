/**
 * @fileoverview Test suite for RequestHandler class
 *
 * This test file follows the established patterns from the groups endpoint test:
 * - Uses expect assertions for consistency across the codebase
 * - Implements test setup helpers for creating mock dependencies
 * - Uses try/finally blocks to ensure proper cleanup of stubs
 * - Creates mock data objects for reusable test responses
 * - Follows descriptive test step naming conventions
 * - Tests both success and error scenarios comprehensively
 */

import { expect } from 'https://deno.land/std@0.224.0/expect/mod.ts';
import { FakeTime } from 'https://deno.land/std@0.224.0/testing/time.ts';
import { RequestHandler } from './request-handler.ts';
import type { HttpClient, HttpRequest, HttpResponse } from './types/internal/http.ts';
import type { Logger, XmApiOptions } from './types/internal/config.ts';
import { XmApiError } from './errors.ts';

/**
 * Mock HTTP client that can simulate sequential responses for testing retry logic
 */
class MockHttpClient implements HttpClient {
  private responses: HttpResponse[] = [];
  private callIndex = 0;
  public requests: HttpRequest[] = [];

  constructor(responses: HttpResponse[]) {
    this.responses = responses;
  }

  send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    const response = this.responses[this.callIndex] || this.responses[this.responses.length - 1];
    this.callIndex++;
    return Promise.resolve(response);
  }

  reset() {
    this.callIndex = 0;
    this.requests = [];
  }
}

/**
 * Test helper to create RequestHandler test setup
 */
function createRequestHandlerTestSetup(options: {
  hostname?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  maxRetries?: number;
  responses?: HttpResponse[];
} = {}) {
  const {
    hostname = 'https://example.xmatters.com',
    username = 'testuser',
    password = 'password123',
    accessToken,
    refreshToken,
    clientId,
    maxRetries = 3,
    responses = [mockSuccessResponse],
  } = options;

  // Create silent mock logger
  const mockLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  // Create auth options based on provided parameters
  const mockHttpClient = new MockHttpClient(responses);

  const mockOptions: XmApiOptions = accessToken
    ? {
      hostname,
      accessToken,
      refreshToken,
      clientId,
      maxRetries,
      httpClient: mockHttpClient,
      logger: mockLogger,
    }
    : { hostname, username, password, maxRetries, httpClient: mockHttpClient, logger: mockLogger };

  const requestHandler = new RequestHandler(mockOptions);

  return { mockHttpClient, requestHandler, mockLogger };
}

// Mock response data for tests
const mockSuccessResponse: HttpResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: { success: true },
};

const mockErrorResponse: HttpResponse = {
  status: 400,
  headers: { 'content-type': 'text/plain' },
  body: 'Invalid request',
};

const mockRateLimitResponse: HttpResponse = {
  status: 429,
  headers: { 'retry-after': '1' },
  body: { message: 'Too many requests' },
};

const mockServerErrorResponse: HttpResponse = {
  status: 503,
  headers: {},
  body: { message: 'Service unavailable' },
};

const mockUnauthorizedResponse: HttpResponse = {
  status: 401,
  headers: {},
  body: { message: 'Token expired' },
};

const mockTokenRefreshResponse: HttpResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: {
    access_token: 'new-token',
    refresh_token: 'new-refresh-token',
    expires_in: 3600,
  },
};

Deno.test('RequestHandler', async (t) => {
  await t.step('handles non-JSON response bodies', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
      responses: [mockErrorResponse],
    });

    try {
      let thrownError: unknown;
      try {
        await requestHandler.get({ path: '/test' });
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(XmApiError);
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Invalid request');
      expect(mockHttpClient.requests.length).toBe(1);
    } finally {
      mockHttpClient.reset();
    }
  });

  await t.step('retries on rate limit with Retry-After', async () => {
    const fakeTime = new FakeTime();
    try {
      const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
        responses: [mockRateLimitResponse, mockSuccessResponse],
      });

      const requestPromise = requestHandler.get({ path: '/test' });

      // Allow the first request to complete and set up the timer
      await fakeTime.nextAsync();
      // Now advance time to trigger the retry
      await fakeTime.nextAsync();

      const response = await requestPromise;

      expect(response.status).toBe(200);
      expect(mockHttpClient.requests.length).toBe(2);

      // Verify first request
      const firstRequest = mockHttpClient.requests[0];
      expect(firstRequest.path).toBe('/test');
      expect(firstRequest.retryAttempt).toBe(0);

      // Verify retry request
      const retryRequest = mockHttpClient.requests[1];
      expect(retryRequest.path).toBe('/test');
      expect(retryRequest.retryAttempt).toBe(1);
    } finally {
      fakeTime.restore();
    }
  });

  await t.step('retries with exponential backoff on server error', async () => {
    const fakeTime = new FakeTime();
    try {
      const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
        responses: [mockServerErrorResponse, mockSuccessResponse],
      });

      const requestPromise = requestHandler.get({ path: '/test' });

      // Allow the first request to complete and set up the timer
      await fakeTime.nextAsync();
      // Now advance time to trigger the retry
      await fakeTime.nextAsync();

      const response = await requestPromise;

      expect(response.status).toBe(200);
      expect(mockHttpClient.requests.length).toBe(2);

      // Verify retry attempt increments
      const retryRequest = mockHttpClient.requests[1];
      expect(retryRequest.retryAttempt).toBe(1);
    } finally {
      fakeTime.restore();
    }
  });

  await t.step('stops retrying after max attempts', async () => {
    const fakeTime = new FakeTime();
    try {
      const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
        maxRetries: 3, // Use full retry count to properly test the behavior
        responses: [mockServerErrorResponse], // Will repeat the error response
      });

      let thrownError: unknown;
      const requestPromise = requestHandler.get({ path: '/test' }).catch((error) => {
        thrownError = error;
      });

      // Allow all request attempts and retries to complete
      // The pattern is: request -> setTimeout -> retry -> setTimeout -> retry -> etc.
      await fakeTime.nextAsync(); // First request completes, setTimeout for retry 1
      await fakeTime.nextAsync(); // Retry 1 completes, setTimeout for retry 2
      await fakeTime.nextAsync(); // Retry 2 completes, setTimeout for retry 3
      await fakeTime.nextAsync(); // Retry 3 completes, should throw error

      await requestPromise;

      expect(thrownError).toBeInstanceOf(XmApiError);
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Service unavailable');
      expect(mockHttpClient.requests.length).toBe(4); // Initial + 3 retries (maxRetries=3)

      // Verify each request has the correct retry attempt number
      expect(mockHttpClient.requests[0].retryAttempt).toBe(0);
      expect(mockHttpClient.requests[1].retryAttempt).toBe(1);
      expect(mockHttpClient.requests[2].retryAttempt).toBe(2);
      expect(mockHttpClient.requests[3].retryAttempt).toBe(3);

      mockHttpClient.reset();
    } finally {
      fakeTime.restore();
    }
  });

  await t.step('handles network errors', async () => {
    const { mockHttpClient: _mockHttpClient } = createRequestHandlerTestSetup();

    // Create a separate mock client that throws network errors
    const mockHttpClient: HttpClient = {
      send: () => Promise.reject(new Error('Network error')),
    };

    const networkRequestHandler = new RequestHandler({
      hostname: 'https://example.xmatters.com',
      username: 'test',
      password: 'test',
      maxRetries: 3,
      httpClient: mockHttpClient,
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    });

    try {
      let thrownError: unknown;
      try {
        await networkRequestHandler.get({ path: '/test' });
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(XmApiError);
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Request failed');
      expect(xmError.response).toBeUndefined();
      expect(xmError.cause).toBeInstanceOf(Error);
      expect((xmError.cause as Error).message).toBe('Network error');
    } finally {
      // No cleanup needed for this test
    }
  });

  await t.step('adds Basic Auth header to requests', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup();

    try {
      await requestHandler.get({ path: '/test' });

      expect(mockHttpClient.requests.length).toBe(1);
      const sentRequest = mockHttpClient.requests[0];
      expect(sentRequest.headers?.Authorization).toBeDefined();

      // Verify it's Basic auth
      const authHeader = sentRequest.headers!.Authorization!;
      const [authType] = authHeader.split(' ');
      expect(authType).toBe('Basic');
    } finally {
      mockHttpClient.reset();
    }
  });

  await t.step('adds OAuth Bearer token to requests', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      clientId: 'client-id',
    });

    try {
      await requestHandler.get({ path: '/test' });

      expect(mockHttpClient.requests.length).toBe(1);
      const sentRequest = mockHttpClient.requests[0];
      expect(sentRequest.headers?.Authorization).toBe('Bearer test-access-token');
    } finally {
      mockHttpClient.reset();
    }
  });

  await t.step('refreshes token on 401 response', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
      responses: [mockUnauthorizedResponse, mockTokenRefreshResponse, mockSuccessResponse],
    });

    try {
      const response = await requestHandler.get({ path: '/test' });

      expect(response.status).toBe(200);
      expect(mockHttpClient.requests.length).toBe(3);

      // Verify token refresh request
      const refreshRequest = mockHttpClient.requests[1];
      expect(refreshRequest.path).toBe('/oauth2/token');
      expect(refreshRequest.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(refreshRequest.body).toBeDefined();

      const params = new URLSearchParams(refreshRequest.body as string);
      expect(params.get('grant_type')).toBe('refresh_token');
      expect(params.get('refresh_token')).toBe('refresh-token');
      expect(params.get('client_id')).toBe('client-id');

      // Verify retried request uses new token
      const retriedRequest = mockHttpClient.requests[2];
      expect(retriedRequest.headers?.Authorization).toBe('Bearer new-token');
    } finally {
      mockHttpClient.reset();
    }
  });

  await t.step('skips auth headers when skipAuth is true', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup();

    try {
      await requestHandler.send({ path: '/oauth2/token', skipAuth: true });

      expect(mockHttpClient.requests.length).toBe(1);
      const sentRequest = mockHttpClient.requests[0];
      expect(sentRequest.headers?.Authorization).toBeUndefined();
    } finally {
      mockHttpClient.reset();
    }
  });
});
