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

import { expect } from 'https://deno.land/std@0.224.0/expect/mod.ts';
import { stub } from 'https://deno.land/std@0.224.0/testing/mock.ts';
import { FakeTime } from 'https://deno.land/std@0.224.0/testing/time.ts';

import { GroupsEndpoint } from './index.ts';
import { RequestHandler } from '../../core/request-handler.ts';
import type { HttpClient, HttpRequest } from '../../core/types/internal/http.ts';
import type { Logger, XmApiOptions } from '../../core/types/internal/config.ts';
import type { Group } from './types.ts';
import type { TokenState } from '../../core/types/internal/oauth.ts';
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
} = {}) {
  const {
    hostname = 'https://example.xmatters.com',
    username = 'test-user',
    password = 'test-password',
    accessToken,
    refreshToken,
    clientId,
    maxRetries = 3,
  } = options;

  // Create silent mock logger
  const mockLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  // Create auth options based on provided parameters
  const mockOptions: XmApiOptions = accessToken
    ? { hostname, accessToken, refreshToken, clientId }
    : { hostname, username, password };

  const mockHttpClient: HttpClient = {
    send: () => Promise.resolve({ status: 200, headers: {}, body: {} }),
  };

  // Create token state for OAuth options if needed
  let tokenState: TokenState | undefined;
  if (accessToken) {
    tokenState = {
      accessToken,
      refreshToken: refreshToken || '',
      clientId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      scopes: [],
    };
  }

  const requestHandler = new RequestHandler(
    mockHttpClient,
    mockLogger,
    mockOptions,
    maxRetries,
    undefined, // onTokenRefresh callback
    tokenState,
  );
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
  await t.step('getGroups() - sends correct HTTP request with no params', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.getGroups();
      // Verify HTTP client was called exactly once
      expect(sendStub.calls.length).toBe(1);
      // Verify the request details
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.query).toBeUndefined();
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

  await t.step('getGroups() - sends correct HTTP request with pagination params', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.getGroups({ limit: 10, offset: 20 });
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe(
        'https://example.xmatters.com/api/xm/1/groups?limit=10&offset=20',
      );
      expect(sentRequest.query).toEqual({ limit: 10, offset: 20 });
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockPaginatedResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('getGroups() - sends correct HTTP request with search params', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.getGroups({ search: 'oncall', limit: 5 });
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe(
        'https://example.xmatters.com/api/xm/1/groups?search=oncall&limit=5',
      );
      expect(sentRequest.query).toEqual({ search: 'oncall', limit: 5 });
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
      expect(sentRequest.path).toBe('/groups/test-group-123');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups/test-group-123');
      expect(sentRequest.query).toBeUndefined();
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
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.query).toBeUndefined();
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
      expect(sentRequest.path).toBe('/groups/test-group-123');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups/test-group-123');
      expect(sentRequest.query).toBeUndefined();
      expect(sentRequest.body).toBeUndefined();
      expect(response).toEqual(mockEmptyResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('OAuth authentication - sends correct Authorization header', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup({
      accessToken: 'test-access-token',
      hostname: 'https://oauth.xmatters.com',
    });
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    try {
      const response = await endpoint.getGroups();
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe('https://oauth.xmatters.com/api/xm/1/groups');
      expect(sentRequest.query).toBeUndefined();
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
      expect(xmError.response?.body).toBe('{"message":"Group not found"}');
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
        await endpoint.getGroups();
      } catch (error) {
        thrownError = error;
      }
      expect(thrownError).toBeInstanceOf(XmApiError);
      const xmError = thrownError as XmApiError;
      expect(xmError.message).toBe('Request failed'); // Generic message for network errors
      expect(xmError.response).toBeUndefined(); // No response for network errors
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
      const response = await endpoint.getGroups();
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe('https://custom.xmatters.com/api/xm/1/groups');
      expect(sentRequest.query).toBeUndefined();
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
      const response = await endpoint.getGroups();
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.query).toBeUndefined();
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
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe('https://example.xmatters.com/api/xm/1/groups');
      expect(sentRequest.query).toBeUndefined();
      expect(sentRequest.headers?.['Content-Type']).toBe('application/json');
      expect(sentRequest.headers?.['Accept']).toBe('application/json');
      expect(sentRequest.headers?.['Authorization']?.startsWith('Basic ')).toBe(true);
      expect(sentRequest.body).toEqual(fullGroup);
      expect(response).toEqual(mockSingleGroupResponse);
    } finally {
      sendStub.restore();
    }
  });

  await t.step('getGroups() with all possible parameters', async () => {
    const { mockHttpClient, endpoint } = createEndpointTestSetup();
    const sendStub = stub(mockHttpClient, 'send', () => Promise.resolve(mockPaginatedResponse));
    const params = {
      limit: 25,
      offset: 50,
      search: 'test search',
      // Add other params that might exist in GetGroupsParams
    };
    try {
      const response = await endpoint.getGroups(params);
      expect(sendStub.calls.length).toBe(1);
      const sentRequest: HttpRequest = sendStub.calls[0].args[0];
      expect(sentRequest.method).toBe('GET');
      expect(sentRequest.path).toBe('/groups');
      expect(sentRequest.url).toBe(
        'https://example.xmatters.com/api/xm/1/groups?limit=25&offset=50&search=test+search',
      );
      expect(sentRequest.query).toEqual(params);
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
      const loggerStub = stub(mockLogger, 'debug', () => {});
      try {
        // Start the request
        const requestPromise = endpoint.getGroups();
        // Allow the first request to complete and set up the timer
        await fakeTime.nextAsync();
        // Now advance time to trigger the retry
        await fakeTime.nextAsync();
        const response = await requestPromise;
        expect(response.body).toEqual(successResponse.body);
        expect(sendStub.calls.length).toBe(2);
        // Verify both calls were GET requests to /groups
        const firstRequest: HttpRequest = sendStub.calls[0].args[0];
        expect(firstRequest.method).toBe('GET');
        expect(firstRequest.path).toBe('/groups');
        const retryRequest: HttpRequest = sendStub.calls[1].args[0];
        expect(retryRequest.method).toBe('GET');
        expect(retryRequest.path).toBe('/groups');
        expect(loggerStub.calls.length).toBe(1);
        expect(loggerStub.calls[0].args[0]).toBe(
          'Request failed with status 429, retrying in 2000ms (attempt 1/3)',
        );
      } finally {
        sendStub.restore();
      }
    } finally {
      fakeTime.restore();
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
        await endpoint.getGroups();
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
