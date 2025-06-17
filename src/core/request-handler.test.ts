/**
 * @fileoverview Test suite for RequestHandler class
 *
 * This test file follows the established patterns from the groups endpoint test:
 * - Uses expect assertions for consistency across the codebase
 * - Implements test setup helpers for creating mock dependencies
 * - Uses try/finally blocks to ensure proper cleanup of stubs
 * - Creates mock data objects for reusable test responses
 * - Follows descriptive test step naming conventions
 * - Test  await t.step('logs error when token refresh fails', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      clientId: 'test-client-id',
      responses: [
        mockUnauthorizedResponse,
        { status: 400, headers: {}, body: { error: 'invalid_grant' } },
      ],
    });cess and error scenarios comprehensively
 */

import { expect } from 'std/expect/mod.ts';
import { FakeTime } from 'std/testing/time.ts';
import { stub } from 'std/testing/mock.ts';
import { RequestHandler } from './request-handler.ts';
import type { HttpClient, HttpRequest, HttpResponse } from './types/internal/http.ts';
import type { Logger, XmApiConfig } from './types/internal/config.ts';
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

  let mockConfig: XmApiConfig;
  if (accessToken && refreshToken && clientId) {
    // OAuth configuration - all three are required
    mockConfig = {
      hostname,
      accessToken,
      refreshToken,
      clientId,
      maxRetries,
      httpClient: mockHttpClient,
      logger: mockLogger,
    };
  } else {
    // Basic auth configuration
    mockConfig = {
      hostname,
      username,
      password,
      maxRetries,
      httpClient: mockHttpClient,
      logger: mockLogger,
    };
  }

  const requestHandler = new RequestHandler(mockConfig);

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

      // Start the async request but DON'T await it yet
      // This begins the async chain but allows us to control timing with FakeTime
      const requestPromise = requestHandler.get({ path: '/test' });

      // Allow the first request to complete and set up the timer
      // This advances fake time to let the setTimeout callback fire
      await fakeTime.nextAsync();
      // Verify the first request completed and retry was triggered
      // At this point: initial request failed → setTimeout set → timeout fired → retry executed
      expect(mockHttpClient.requests.length).toBe(2);
      expect(mockHttpClient.requests[0].retryAttempt).toBe(0);
      expect(mockHttpClient.requests[1].retryAttempt).toBe(1);
      // Now advance time to trigger any additional timers (should be none)
      await fakeTime.nextAsync();

      // Finally await the original promise to get the result
      // By now all async operations have completed thanks to our time control
      const response = await requestPromise;

      expect(response.status).toBe(200);
      expect(mockHttpClient.requests.length).toBe(2);

      // Verify first request
      const firstRequest = mockHttpClient.requests[0];
      expect(firstRequest.retryAttempt).toBe(0);

      // Verify retry request
      const retryRequest = mockHttpClient.requests[1];
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

      // Start the async request but DON'T await it yet
      // This begins the async chain but allows us to control timing with FakeTime
      const requestPromise = requestHandler.get({ path: '/test' });

      // Allow the first request to complete and set up the timer
      // This advances fake time to let the setTimeout callback fire
      await fakeTime.nextAsync();
      // Verify the first request completed and retry was triggered
      // At this point: initial request failed → setTimeout set → timeout fired → retry executed
      expect(mockHttpClient.requests.length).toBe(2);
      expect(mockHttpClient.requests[0].retryAttempt).toBe(0);
      expect(mockHttpClient.requests[1].retryAttempt).toBe(1);
      // Now advance time to trigger any additional timers (should be none)
      await fakeTime.nextAsync();

      // Finally await the original promise to get the result
      // By now all async operations have completed thanks to our time control
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
      expect(xmError.response).toBeNull();
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
      clientId: 'test-client-id',
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
      clientId: 'test-client-id',
      responses: [mockUnauthorizedResponse, mockTokenRefreshResponse, mockSuccessResponse],
    });

    try {
      const response = await requestHandler.get({ path: '/test' });

      expect(response.status).toBe(200);
      expect(mockHttpClient.requests.length).toBe(3);

      // Verify token refresh request
      const refreshRequest = mockHttpClient.requests[1];
      expect(refreshRequest.url).toBe('https://example.xmatters.com/api/xm/1/oauth2/token');
      expect(refreshRequest.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(refreshRequest.body).toBeDefined();

      const params = new URLSearchParams(refreshRequest.body as string);
      expect(params.get('grant_type')).toBe('refresh_token');
      expect(params.get('refresh_token')).toBe('refresh-token');
      expect(params.get('client_id')).toBe('test-client-id');

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

  await t.step('logs debug message when retrying requests', async () => {
    const fakeTime = new FakeTime();
    try {
      const { mockHttpClient, requestHandler, mockLogger } = createRequestHandlerTestSetup({
        responses: [mockRateLimitResponse, mockSuccessResponse],
      });

      // Stub the debug method to capture calls
      const debugStub = stub(mockLogger, 'debug', () => {});

      try {
        // Start the async request but DON'T await it yet
        // This begins the async chain but allows us to control timing with FakeTime
        const requestPromise = requestHandler.get({ path: '/test' });

        // Allow the first request to complete and set up the timer
        // This advances fake time to let the setTimeout callback fire
        await fakeTime.nextAsync();
        // Verify the first request completed and retry was triggered
        // At this point: initial request failed → setTimeout set → timeout fired → retry executed
        expect(mockHttpClient.requests.length).toBe(2);
        expect(mockHttpClient.requests[0].retryAttempt).toBe(0);
        expect(mockHttpClient.requests[1].retryAttempt).toBe(1);
        // Now advance time to trigger any additional timers (should be none)
        await fakeTime.nextAsync();

        // Finally await the original promise to get the response
        // By now all async operations have completed thanks to our time control
        const response = await requestPromise;

        expect(response.status).toBe(200);
        expect(mockHttpClient.requests.length).toBe(2);

        // Verify debug logger was called with correct retry message
        // Should be: initial request log + retry message + retry request log = 3 calls
        expect(debugStub.calls.length).toBe(3);
        expect(debugStub.calls[1].args[0]).toBe(
          'DEBUG: Request failed with status 429, retrying in 1000ms (attempt 1/3)',
        );
      } finally {
        debugStub.restore();
      }
    } finally {
      fakeTime.restore();
    }
  });

  await t.step('logs error when token refresh fails', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      clientId: 'test-client-id',
      responses: [
        mockUnauthorizedResponse,
        { status: 400, headers: {}, body: { error: 'invalid_grant' } },
      ],
    });

    try {
      let thrownError: unknown;
      try {
        await requestHandler.get({ path: '/test' });
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(XmApiError);
      expect(mockHttpClient.requests.length).toBe(2); // Initial 401 + failed token refresh

      // Verify error details are correct
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Failed to refresh token');
      expect(xmError.response?.status).toBe(400);
    } finally {
      mockHttpClient.reset();
    }
  });

  await t.step('logs warning when onTokenRefresh callback throws error', async () => {
    const throwingCallback = () => {
      throw new Error('Callback error');
    };

    const { mockHttpClient, mockLogger } = createRequestHandlerTestSetup({
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      clientId: 'test-client-id',
      responses: [mockUnauthorizedResponse, mockTokenRefreshResponse, mockSuccessResponse],
    });

    // Override the options to include the throwing callback
    const requestHandlerWithCallback = new RequestHandler({
      hostname: 'https://example.xmatters.com',
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      clientId: 'test-client-id',
      maxRetries: 3,
      httpClient: mockHttpClient,
      logger: mockLogger,
      onTokenRefresh: throwingCallback,
    });

    // Stub the warn method to capture calls
    const warnStub = stub(mockLogger, 'warn', () => {});

    try {
      const response = await requestHandlerWithCallback.get({ path: '/test' });

      expect(response.status).toBe(200);
      expect(mockHttpClient.requests.length).toBe(3); // Initial 401 + token refresh + retry

      // Verify warning logger was called
      expect(warnStub.calls.length).toBe(1);
      expect(warnStub.calls[0].args[0]).toBe(
        'Error in onTokenRefresh callback, but continuing with refreshed token',
      );
      expect(warnStub.calls[0].args[1]).toBeInstanceOf(Error);
      expect((warnStub.calls[0].args[1] as Error).message).toBe('Callback error');
    } finally {
      warnStub.restore();
      mockHttpClient.reset();
    }
  });

  await t.step('throws error when token refresh returns non-200 status', async () => {
    const { mockHttpClient, requestHandler } = createRequestHandlerTestSetup({
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      clientId: 'test-client-id',
      responses: [
        mockUnauthorizedResponse,
        { status: 401, headers: {}, body: { error: 'invalid_client' } },
      ],
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
      expect(xmError.message).toBe('Failed to refresh token');
      expect(xmError.response?.status).toBe(401);
    } finally {
      mockHttpClient.reset();
    }
  });

  await t.step('logs debug message with exponential backoff delay on server errors', async () => {
    const fakeTime = new FakeTime();
    try {
      const { mockHttpClient, requestHandler, mockLogger } = createRequestHandlerTestSetup({
        responses: [mockServerErrorResponse, mockSuccessResponse],
      });

      // Stub the debug method to capture calls
      const debugStub = stub(mockLogger, 'debug', () => {});

      try {
        // Start the async request but DON'T await it yet
        // This begins the async chain but allows us to control timing with FakeTime
        const requestPromise = requestHandler.get({ path: '/test' });

        // Allow the first request to complete and set up the timer
        // This advances fake time to let the setTimeout callback fire
        await fakeTime.nextAsync();
        // Verify the first request completed and retry was triggered
        // At this point: initial request failed → setTimeout set → timeout fired → retry executed
        expect(mockHttpClient.requests.length).toBe(2);
        expect(mockHttpClient.requests[0].retryAttempt).toBe(0);
        expect(mockHttpClient.requests[1].retryAttempt).toBe(1);
        // Now advance time to trigger any additional timers (should be none)
        await fakeTime.nextAsync();

        // Finally await the original promise to get the result
        // By now all async operations have completed thanks to our time control
        const response = await requestPromise;

        expect(response.status).toBe(200);
        expect(mockHttpClient.requests.length).toBe(2);

        // Verify debug logger was called with exponential backoff message
        // Should be: initial request log + retry message + retry request log = 3 calls
        expect(debugStub.calls.length).toBe(3);
        expect(debugStub.calls[1].args[0]).toBe(
          'DEBUG: Request failed with status 503, retrying in 1000ms (attempt 1/3)',
        );
      } finally {
        debugStub.restore();
      }
    } finally {
      fakeTime.restore();
    }
  });

  await t.step('respects Retry-After header and logs correct delay', async () => {
    const fakeTime = new FakeTime();
    try {
      const customRateLimitResponse: HttpResponse = {
        status: 429,
        headers: { 'retry-after': '5' }, // 5 seconds
        body: { message: 'Too many requests' },
      };

      const { mockHttpClient, requestHandler, mockLogger } = createRequestHandlerTestSetup({
        responses: [customRateLimitResponse, mockSuccessResponse],
      });

      // Stub the debug method to capture calls
      const debugStub = stub(mockLogger, 'debug', () => {});

      try {
        const requestPromise = requestHandler.get({ path: '/test' });

        // Allow the first request to complete and set up the timer
        await fakeTime.nextAsync();
        // Verify the first request completed and retry was triggered
        expect(mockHttpClient.requests.length).toBe(2);
        expect(mockHttpClient.requests[0].retryAttempt).toBe(0);
        expect(mockHttpClient.requests[1].retryAttempt).toBe(1);
        // Now advance time to trigger any additional timers (should be none)
        await fakeTime.nextAsync();

        const response = await requestPromise;

        expect(response.status).toBe(200);
        expect(mockHttpClient.requests.length).toBe(2);

        // Verify debug logger was called with Retry-After header value
        // Should be: initial request log + retry message + retry request log = 3 calls
        expect(debugStub.calls.length).toBe(3);
        expect(debugStub.calls[1].args[0]).toBe(
          'DEBUG: Request failed with status 429, retrying in 5000ms (attempt 1/3)',
        );
      } finally {
        debugStub.restore();
      }
    } finally {
      fakeTime.restore();
    }
  });

  await t.step(
    'integration - verifies external URL is passed correctly to HTTP client',
    async () => {
      // This test ensures that when using fullUrl, the external URL is properly passed
      // to the HTTP client, not the xMatters API URL
      const mockHttpClient = new MockHttpClient([mockSuccessResponse]);

      const requestHandler = new RequestHandler({
        hostname: 'https://company.xmatters.com',
        username: 'testuser',
        password: 'testpass',
        httpClient: mockHttpClient,
        logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      });

      try {
        await requestHandler.send({
          fullUrl: 'https://api.external-service.com/v2/endpoint',
          query: { test: 'param' },
          method: 'GET',
        });

        // Verify that the HTTP client received the correct external URL
        expect(mockHttpClient.requests.length).toBe(1);
        const sentRequest = mockHttpClient.requests[0];

        // The key assertion: HTTP client should receive the external URL, not the xMatters API URL
        expect(sentRequest.url).toBe('https://api.external-service.com/v2/endpoint?test=param');
        expect(sentRequest.url).not.toContain('company.xmatters.com'); // Should not contain xMatters hostname
        expect(sentRequest.url).not.toContain('/api/xm/1'); // Should not contain API version
      } finally {
        mockHttpClient.reset();
      }
    },
  );

  await t.step('integration - verifies API path is passed correctly to HTTP client', async () => {
    // This test ensures that relative API paths result in correct xMatters API URLs
    // being passed to the HTTP client
    const mockHttpClient = new MockHttpClient([mockSuccessResponse]);

    const requestHandler = new RequestHandler({
      hostname: 'https://company.xmatters.com',
      username: 'testuser',
      password: 'testpass',
      httpClient: mockHttpClient,
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    });

    try {
      await requestHandler.send({
        path: '/groups',
        query: { search: 'test' },
        method: 'GET',
      });

      // Verify that the HTTP client received the correct xMatters API URL
      expect(mockHttpClient.requests.length).toBe(1);
      const sentRequest = mockHttpClient.requests[0];

      // The key assertion: HTTP client should receive the full xMatters API URL
      expect(sentRequest.url).toBe('https://company.xmatters.com/api/xm/1/groups?search=test');
      expect(sentRequest.url).toContain('company.xmatters.com'); // Should contain xMatters hostname
      expect(sentRequest.url).toContain('/api/xm/1'); // Should contain API version
    } finally {
      mockHttpClient.reset();
    }
  });
});
