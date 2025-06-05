import {
  assertEquals,
  assertExists,
  assertObjectMatch,
  assertStringIncludes,
} from 'https://deno.land/std@0.193.0/testing/asserts.ts';
import { GroupsEndpoint } from './index.ts';
import { GetGroupsResponse } from './types.ts';
import { createMockResponse, MockRequestHandler } from '../../core/test-utils.ts';
import { XmApiError } from '../../core/types.ts';

const mockGroup = {
  id: '123',
  targetName: 'Test Group',
  recipientType: 'GROUP' as const,
  status: 'ACTIVE' as const,
  groupType: 'ON_CALL' as const,
  created: '2025-05-31T00:00:00Z',
  description: 'Test group description',
  supervisors: ['user1'],
  externallyOwned: false,
  allowDuplicates: true,
  useDefaultDevices: true,
  observedByAll: true,
  links: {
    self: '/api/xm/1/groups/123',
  },
};

const mockGroupsResponse: GetGroupsResponse = {
  count: 1,
  total: 1,
  data: [mockGroup],
  links: {
    self: 'https://example.com/api/xm/1/groups',
  },
};

Deno.test('GroupsEndpoint', async (t) => {
  await t.step('getGroups without parameters', async () => {
    const mockResponse = createMockResponse({
      body: mockGroupsResponse,
      headers: {
        'content-type': 'application/json',
      },
    });
    const mockHttp = new MockRequestHandler(mockResponse);
    const endpoint = new GroupsEndpoint(mockHttp);

    const response = await endpoint.getGroups();

    assertEquals(response.body, mockGroupsResponse);
    assertEquals(mockHttp.requests.length, 1);

    const request = mockHttp.requests[0];
    assertEquals(request.method, 'GET');
    assertEquals(request.path, '/groups');
    assertEquals(request.query, undefined);
  });

  await t.step('getGroups with parameters', async () => {
    const mockResponse = createMockResponse({
      body: mockGroupsResponse,
      headers: {
        'content-type': 'application/json',
      },
    });
    const mockHttp = new MockRequestHandler(mockResponse);
    const endpoint = new GroupsEndpoint(mockHttp);

    const params = { limit: 10, offset: 0, search: 'test' };
    const response = await endpoint.getGroups(params);

    assertEquals(response.body, mockGroupsResponse);
    assertEquals(mockHttp.requests.length, 1);

    const request = mockHttp.requests[0];
    assertEquals(request.method, 'GET');
    assertEquals(request.path, '/groups');
    assertExists(request.query);
    assertObjectMatch(request.query, params);
  });

  await t.step('getGroups handles errors', async () => {
    const errorResponse = createMockResponse({
      body: { message: 'Not Found' },
      status: 404,
      headers: {
        'content-type': 'application/json',
      },
    });
    const mockHttp = new MockRequestHandler(errorResponse);
    const endpoint = new GroupsEndpoint(mockHttp);

    try {
      await endpoint.getGroups();
      throw new Error('Expected error to be thrown');
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error('Expected XmApiError but got: ' + String(error));
      }
      assertEquals(error.name, 'XmApiError');
      assertEquals(error.message, 'Not Found');
      // Type assertion since we know it's an XmApiError
      const xmError = error as XmApiError;
      assertExists(xmError.response);
      assertEquals(xmError.response.status, 404);
    }
  });
});

Deno.test('GroupsEndpoint error handling', async (t) => {
  await t.step('retries on rate limit with Retry-After', async () => {
    const rateLimitResponse = createMockResponse({
      body: { message: 'Too many requests' },
      status: 429,
      headers: {
        'retry-after': '2',
        'content-type': 'application/json',
      },
    });
    const successResponse = createMockResponse({
      body: mockGroupsResponse,
      headers: {
        'content-type': 'application/json',
      },
    });

    const mockHttp = new MockRequestHandler([rateLimitResponse, successResponse]);
    const endpoint = new GroupsEndpoint(mockHttp);

    const response = await endpoint.getGroups();
    assertEquals(response.body, mockGroupsResponse);
    assertEquals(mockHttp.requests.length, 2);

    // Verify retry was attempted
    const [firstRequest, retryRequest] = mockHttp.requests;
    assertEquals(firstRequest.retryAttempt, 0);
    assertEquals(retryRequest.retryAttempt, 1);
  });

  await t.step('handles detailed error responses', async () => {
    const errorResponse = createMockResponse({
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [
          { field: 'targetName', message: 'Must not be empty' },
        ],
      },
      status: 400,
      headers: {
        'content-type': 'application/json',
        'request-id': 'test-123',
      },
    });
    const mockHttp = new MockRequestHandler(errorResponse);
    const endpoint = new GroupsEndpoint(mockHttp);

    try {
      await endpoint.getGroups();
      throw new Error('Expected error to be thrown');
    } catch (error) {
      assertExists(error);
      assertEquals(error instanceof XmApiError, true);
      const xmError = error as XmApiError;

      // Verify error message has all the context
      assertEquals(xmError.message, 'VALIDATION_ERROR: Invalid input');

      // Verify response is preserved
      assertExists(xmError.response);
      assertEquals(xmError.response.status, 400);
      assertEquals(xmError.response.headers['request-id'], 'test-123');
    }
  });

  await t.step('handles errors without response body', async () => {
    const errorResponse = createMockResponse({
      body: '', // Empty response body
      status: 502,
      headers: {
        'content-type': 'text/plain',
      },
    });
    const mockHttp = new MockRequestHandler(errorResponse);
    const endpoint = new GroupsEndpoint(mockHttp);

    try {
      await endpoint.getGroups();
      throw new Error('Expected error to be thrown');
    } catch (error) {
      assertExists(error);
      assertEquals(error instanceof XmApiError, true);
      const xmError = error as XmApiError;

      // Verify fallback error message
      assertStringIncludes(xmError.message, '502');
      assertExists(xmError.response);
      assertEquals(xmError.response.status, 502);
      assertEquals(xmError.response.body, '');
    }
  });

  await t.step('handles network errors', async () => {
    const mockHttp = new MockRequestHandler({
      status: 0, // No status indicates network error
      headers: {},
      body: undefined,
    });
    mockHttp.forceError = new Error('Network error');

    const endpoint = new GroupsEndpoint(mockHttp);

    try {
      await endpoint.getGroups();
      throw new Error('Expected error to be thrown');
    } catch (error) {
      assertExists(error);
      assertEquals(error instanceof XmApiError, true);
      const xmError = error as XmApiError;

      assertEquals(xmError.message, 'Request failed');
      assertEquals(xmError.response, undefined);
      assertEquals(xmError.cause instanceof Error, true);
      assertStringIncludes((xmError.cause as Error).message, 'Network error');
    }
  });
});
