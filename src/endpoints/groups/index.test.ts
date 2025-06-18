/**
 * Comprehensive test suite for GroupsEndpoint using Deno's standard testing library.
 *
 * Testing Philosophy:
 * - Only mock the HttpClient to prevent actual network calls
 * - All other library code runs real implementation
 * - Verify exact HTTP requests sent by inspecting stub call arguments
 * - Test all endpoint methods
 * - Test both Basic Auth and OAuth authentication
 * - Test error scenarios (HTTP errors and network failures)
 * - Test parameter handling and URL construction
 * - Test different configuration options (hostname, auth methods)
 *
 * This approach ensures:
 * - High confidence that real library code works correctly
 * - Fast test execution (no network I/O)
 * - Clear verification of what HTTP requests are actually sent
 * - Easy maintenance as it focuses on the interface contract
 */

import { expect } from 'std/expect/mod.ts';
import { stub } from 'std/testing/mock.ts';
import { FakeTime } from 'std/testing/time.ts';

import { GroupsEndpoint } from './index.ts';
import { RequestHandler } from '../../core/request-handler.ts';
import type { HttpClient, HttpRequest } from '../../core/types/internal/http.ts';
import type { Logger, XmApiConfig } from '../../core/types/internal/config.ts';
import type { Group } from './types.ts';
import { XmApiError } from '../../core/errors.ts';

// Test helper to create mock setup
function createEndpointTestSetup(options: {
  hostname?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  maxRetries?: number;
  onTokenRefresh?: (accessToken: string, refreshToken: string) => Promise<void>;
  expiredToken?: boolean;
} = {}) {
  const {
    hostname = 'https://example.xmatters.com',
    username = 'test-user',
    password = 'test-password',
    accessToken,
    refreshToken,
    clientId,
    maxRetries = 3,
    onTokenRefresh,
  } = options;

  // Create silent mock logger
  const mockLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  // Create auth options based on provided parameters
  const mockHttpClient: HttpClient = {
    send: () => Promise.resolve({ status: 200, headers: {}, body: {} }),
  };

  let mockConfig: XmApiConfig;
  if (accessToken && refreshToken && clientId) {
    // OAuth configuration - all three are required
    mockConfig = {
      hostname,
      accessToken,
      refreshToken,
      clientId,
      onTokenRefresh,
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
      onTokenRefresh,
      maxRetries,
      httpClient: mockHttpClient,
      logger: mockLogger,
    };
  }

  const requestHandler = new RequestHandler(mockConfig);
  const endpoint = new GroupsEndpoint(requestHandler);

  return { mockHttpClient, endpoint, mockLogger };
}

// Mock data for tests
const mockGroup: Group = {
  id: 'test-group-123',
  targetName: 'Test Group',
  recipientType: 'GROUP',
  status: 'ACTIVE',
  groupType: 'ON_CALL',
  created: '2024-01-01T00:00:00Z',
  description: 'Test group for unit tests',
};

const mockGroupsList: Group[] = [
  mockGroup,
  {
    id: 'test-group-456',
    targetName: 'Another Group',
    recipientType: 'GROUP',
    status: 'ACTIVE',
    groupType: 'BROADCAST',
    created: '2024-01-02T00:00:00Z',
  },
];

const mockPaginatedResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: {
    count: 2,
    total: 10,
    data: mockGroupsList,
  },
};

const mockSingleGroupResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: mockGroup,
};

const mockEmptyResponse = {
  status: 204,
  headers: {},
  body: undefined,
};

Deno.test('GroupsEndpoint', async (t) => {
  await t.step('get() - sends correct HTTP request with no params', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.get();
      // Verify HTTP client was called exactly once
      expect(sendStub.calls.length).toBe(1);
      // Verify the request details
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toBeUndefined();
      // Verify response is returned correctly
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('get() - sends correct HTTP request with pagination params', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.get({ limit: 10, offset: 20 });
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe(
        'https://example.xmatters.com/api/xm/1/groups?limit=10&offset=20',
      );
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('get() - sends correct HTTP request with search params', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.get({ search: 'oncall', limit: 5 });
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe(
        'https://example.xmatters.com/api/xm/1/groups?search=oncall&limit=5',
      );
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('getById() - sends correct HTTP request', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockSingleGroupResponse));
    try {
      const response = await endpoint.getById('test-group-123');
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups/test-group-123');
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockSingleGroupResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('save() - sends correct HTTP request for creating group', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockSingleGroupResponse));
    const newGroup = {
      targetName: 'New Group',
      groupType: 'BROADCAST' as const,
      description: 'A new test group',
    };
    try {
      const response = await endpoint.save(newGroup);
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('POST');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toEqual(newGroup);
      expect(response).toEqual(mockSingleGroupResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('delete() - sends correct HTTP request', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockEmptyResponse));
    try {
      const response = await endpoint.delete('test-group-123');
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('DELETE');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups/test-group-123');
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockEmptyResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('OAuth authentication - sends correct Authorization header', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      clientId: 'test-client-id',
      hostname: 'https://oauth.xmatters.com',
    });
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.get();
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe('https://oauth.xmatters.com/api/xm/1/groups');
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']).toBe('Bearer test-access-token');
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('Error handling - throws XmApiError on HTTP error', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const errorResponse = {
      status: 404,
      headers: { 'content-type': 'application/json' },
      body: { message: 'Group not found' },
    };
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(errorResponse));
    try {
      let thrownError: unknown;
      try {
        await endpoint.getById('non-existent-group');
      } catch (error) {
        thrownError = error;
      }
      expect(thrownError).toBeInstanceOf(XmApiError);
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Group not found'); // Uses the message from response body
      expect(xmError.response?.status).toBe(404);
      expect(xmError.response?.body).toEqual({ message: 'Group not found' });
    } finally {
      sendStub.restore();
    }
  });

  await t.step('Error handling - throws XmApiError on network error', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const networkError = new Error('Network connection failed');
    const sendStub = stub(mockHttpClient, 'send', () => Promise.reject(networkError));
    try {
      let thrownError: unknown;
      try {
        await endpoint.get();
      } catch (error) {
        thrownError = error;
      }
      expect(thrownError).toBeInstanceOf(XmApiError);
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Request failed'); // Generic message for network errors
      expect(xmError.response).toBeNull(); // No response for network errors
    } finally {
      sendStub.restore();
    }
  });

  await t.step('Custom hostname - uses correct base URL', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup({
      hostname: 'https://custom.xmatters.com',
    });
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.get();
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe('https://custom.xmatters.com/api/xm/1/groups');
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('Basic auth - sends correct Authorization header', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup({
      username: 'testuser',
      password: 'testpass',
    });
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.get();
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      // Verify the basic auth header
      expect(sentRequest.headers?.['Authorization']).toBeDefined();
      expect(sentRequest.headers?.['Authorization']).toBe('Basic ' + btoa('testuser:testpass'));
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      // Verify the basic auth encoding
      const authPart = sentRequest.headers?.['Authorization']?.split(' ')[1];
      const decoded = atob(authPart!);
      expect(decoded).toBe('testuser:testpass');
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('save() with full group object - sends all fields correctly', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockSingleGroupResponse));
    const fullGroup: Partial<Group> = {
      id: 'existing-group-123',
      targetName: 'Updated Group',
      recipientType: 'GROUP',
      status: 'ACTIVE',
      groupType: 'ON_CALL',
      description: 'Updated test group',
      supervisors: ['user1', 'user2'],
    };
    try {
      const response = await endpoint.save(fullGroup);
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('POST');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toEqual(fullGroup);
      expect(response).toEqual(mockSingleGroupResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('get() with all possible parameters', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    const params = {
      limit: 25,
      offset: 50,
      search: 'test search',
      // Add other params that might exist in GetGroupsParams
    };
    try {
      const response = await endpoint.get(params);
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.url).toBe(
        'https://example.xmatters.com/api/xm/1/groups?limit=25&offset=50&search=test+search',
      );
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('retries on rate limit with Retry-After', async () => {
    const fakeTime = new FakeTime();
    try {
      const { mockHttpClient, mockLogger, endpoint } = createEndpointTestSetup();
      const rateLimitResponse = {
        status: 429,
        headers: { 'retry-after': '2', 'content-type': 'application/json' },
        body: { message: 'Too many requests' },
      };
      const successResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { count: 2, total: 10, data: mockGroupsList },
      };
      let callCount = 0;
      const sendStub = stub(mockHttpClient, 'send', () => {
        callCount++;
        return callCount === 1
          ? Promise.resolve(rateLimitResponse)
          : Promise.resolve(successResponse);
      });
      const debugStub = stub(mockLogger, 'debug', () => {});
      try {
        // Start the async request but DON'T await it yet
        // This begins the async chain but allows us to control timing with FakeTime
        const requestPromise = endpoint.get();

        // Allow the first request to complete and set up the timer
        // This advances fake time to let the setTimeout callback fire
        await fakeTime.nextAsync();

        // Verify the first request completed and retry was triggered
        // At this point: initial request failed → setTimeout set → timeout fired → retry executed
        expect(sendStub.calls.length).toBe(2);
        expect(sendStub.calls[0].args[0].method).toBe('GET');
        expect(sendStub.calls[0].args[0].url).toBe('https://example.xmatters.com/api/xm/1/groups');
        expect(sendStub.calls[1].args[0].method).toBe('GET');
        expect(sendStub.calls[1].args[0].url).toBe('https://example.xmatters.com/api/xm/1/groups');

        // Now advance time to trigger any additional timers (should be none)
        await fakeTime.nextAsync();

        // Finally await the original promise to get the result
        // By now all async operations have completed thanks to our time control
        const response = await requestPromise;
        expect(response.body).toEqual(successResponse.body);
        expect(sendStub.calls.length).toBe(2);
        // Verify both calls were GET requests to /groups
        const firstRequest: HttpRequest = sendStub.calls[0].args[0];
        expect(firstRequest.method).toBe('GET');
        expect(firstRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
        const retryRequest: HttpRequest = sendStub.calls[1].args[0];
        expect(retryRequest.method).toBe('GET');
        expect(retryRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
        // Should be:
        // initial request -->
        // + initial request <--
        // + retry message
        // + retry request -->
        // + retry request <--
        // = 5 calls
        expect(debugStub.calls.length).toBe(5);
        expect(debugStub.calls[2].args[0]).toBe(
          'Request failed with status 429, retrying in 2000ms (attempt 1/3)',
        );
      } finally {
        sendStub.restore();
        debugStub.restore();
      }
    } finally {
      fakeTime.restore();
    }
  });

  await t.step('retries on server error with debug logging', async () => {
    const fakeTime = new FakeTime();
    try {
      const { mockHttpClient, mockLogger, endpoint } = createEndpointTestSetup();
      const serverErrorResponse = {
        status: 503,
        headers: { 'content-type': 'application/json' },
        body: { message: 'Service unavailable' },
      };
      const successResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { count: 1, total: 1, data: [mockGroup] },
      };
      let callCount = 0;
      const sendStub = stub(mockHttpClient, 'send', () => {
        callCount++;
        return callCount === 1
          ? Promise.resolve(serverErrorResponse)
          : Promise.resolve(successResponse);
      });
      const debugStub = stub(mockLogger, 'debug', () => {});
      try {
        // Start the async request but DON'T await it yet
        // This begins the async chain but allows us to control timing with FakeTime
        const requestPromise = endpoint.get();

        // Allow the first request to complete and set up the timer
        // This advances fake time to let the setTimeout callback fire
        await fakeTime.nextAsync();

        // Verify the first request completed and retry was triggered
        // At this point: initial request failed → setTimeout set → timeout fired → retry executed
        expect(sendStub.calls.length).toBe(2);
        expect(sendStub.calls[0].args[0].method).toBe('GET');
        expect(sendStub.calls[0].args[0].url).toBe('https://example.xmatters.com/api/xm/1/groups');
        expect(sendStub.calls[1].args[0].method).toBe('GET');
        expect(sendStub.calls[1].args[0].url).toBe('https://example.xmatters.com/api/xm/1/groups');

        // Now advance time to trigger any additional timers (should be none)
        await fakeTime.nextAsync();

        // Finally await the original promise to get the result
        // By now all async operations have completed thanks to our time control
        const response = await requestPromise;
        expect(response.body).toEqual(successResponse.body);
        expect(sendStub.calls.length).toBe(2);
        // Verify debug logger was called with correct retry message
        // Should be:
        // initial request -->
        // + initial request <--
        // + retry message
        // + retry request -->
        // + retry request <--
        // = 5 calls
        expect(debugStub.calls.length).toBe(5);
        expect(debugStub.calls[2].args[0]).toBe(
          'Request failed with status 503, retrying in 1000ms (attempt 1/3)',
        );
      } finally {
        sendStub.restore();
        debugStub.restore();
      }
    } finally {
      fakeTime.restore();
    }
  });

  await t.step('logs warning when onTokenRefresh callback throws error', async () => {
    // Create a RequestHandler with an onTokenRefresh callback that throws
    const throwingCallback = () => {
      throw new Error('Callback error');
    };
    const { mockHttpClient, mockLogger, endpoint } = createEndpointTestSetup({
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      clientId: 'test-client-id',
      onTokenRefresh: throwingCallback,
      expiredToken: true,
    });
    const unauthorizedResponse = {
      status: 401,
      headers: { 'content-type': 'application/json' },
      body: { message: 'Token expired' },
    };

    const tokenRefreshResponse = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      },
    };

    const successResponse = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { count: 1, total: 1, data: [mockGroup] },
    };

    let callCount = 0;
    const sendStub = stub(mockHttpClient, 'send', (request: HttpRequest) => {
      callCount++;
      // Check if this is a token refresh request
      if (request.url?.includes('/oauth2/token') || request.url?.includes('/oauth2/token')) {
        return Promise.resolve(tokenRefreshResponse);
      }
      // Otherwise it's the main API request
      if (callCount === 1) return Promise.resolve(unauthorizedResponse);
      return Promise.resolve(successResponse);
    });
    const warnStub = stub(mockLogger, 'warn', () => {});
    try {
      const response = await endpoint.get();
      expect(response.status).toBe(200);
      expect(sendStub.calls.length).toBe(3); // initial request (401), token refresh, retry request
      expect(warnStub.calls.length).toBe(1);
      expect(warnStub.calls[0].args[0]).toBe(
        'Error in onTokenRefresh callback, but continuing with refreshed token',
      );
      expect(warnStub.calls[0].args[1]).toBeInstanceOf(Error);
      expect((warnStub.calls[0].args[1] as Error).message).toBe('Callback error');
    } finally {
      sendStub.restore();
      warnStub.restore();
    }
  });

  await t.step('logs error when token refresh fails', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup({
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      clientId: 'test-client-id',
      expiredToken: true,
    });

    const unauthorizedResponse = {
      status: 401,
      headers: { 'content-type': 'application/json' },
      body: { message: 'Token expired' },
    };

    const tokenRefreshErrorResponse = {
      status: 400,
      headers: { 'content-type': 'application/json' },
      body: { error: 'invalid_grant', error_description: 'Invalid refresh token' },
    };

    let callCount = 0;
    const sendStub = stub(mockHttpClient, 'send', (request: HttpRequest) => {
      callCount++;
      // Check if this is a token refresh request
      if (request.url?.includes('/oauth2/token') || request.url?.includes('/oauth2/token')) {
        return Promise.resolve(tokenRefreshErrorResponse);
      }
      // Otherwise it's the main API request
      return Promise.resolve(unauthorizedResponse);
    });

    try {
      let thrownError: unknown;
      try {
        await endpoint.get();
      } catch (error) {
        thrownError = error;
      }
      expect(thrownError).toBeInstanceOf(XmApiError);
      expect(sendStub.calls.length).toBe(2); // initial request (401), failed token refresh

      // Verify error details are correct
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Failed to refresh token');
      expect(xmError.response?.status).toBe(400);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('handles errors without response body', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const errorResponse = {
      status: 400, // Use 400 instead of 502 to avoid retry logic
      headers: { 'content-type': 'text/plain' },
      body: '', // Empty response body
    };
    const sendStub = stub(mockHttpClient, 'send', () => {
      return Promise.resolve(errorResponse);
    });
    try {
      let thrownError: unknown;
      try {
        await endpoint.get();
      } catch (error) {
        thrownError = error;
      }
      // Verify it was called only once (no retries for 400)
      expect(sendStub.calls.length).toBe(1);
      expect(thrownError).toBeInstanceOf(XmApiError);
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Request failed with status 400');
      expect(xmError.response?.status).toBe(400);
      expect(xmError.response?.body).toBe('');
    } finally {
      sendStub.restore();
    }
  });
});
