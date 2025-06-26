import { expect } from 'std/expect/mod.ts';
import { ResourceClient } from './resource-client.ts';
import { RequestHandler } from './request-handler.ts';
import { XmApiError } from './errors.ts';
import { MockHttpClient, MockLogger } from './test-utils.ts';

// Helper to create ResourceClient with mock dependencies
function createResourceClientTestSetup(basePath: string) {
  const mockHttpClient = new MockHttpClient();
  const mockLogger = new MockLogger();
  const requestHandler = new RequestHandler({
    httpClient: mockHttpClient,
    logger: mockLogger,
    hostname: 'https://test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
  });
  return {
    mockHttpClient,
    requestHandler,
    createResourceClient: () => new ResourceClient(requestHandler, basePath),
  };
}

Deno.test('ResourceClient', async (t) => {
  await t.step('Constructor Validation', async (t) => {
    await t.step('throws XmApiError when base path does not start with slash', () => {
      const { requestHandler } = createResourceClientTestSetup('/valid');
      let thrownError: unknown;
      try {
        new ResourceClient(requestHandler, 'invalid-path');
      } catch (error) {
        thrownError = error;
      }
      expect(thrownError).toBeInstanceOf(XmApiError);
      const error = thrownError as XmApiError;
      expect(error.message).toBe('Base path must start with a /');
      expect(error.response).toBeUndefined(); // This is a validation error, not an HTTP error
    });

    await t.step('accepts valid base path starting with slash', () => {
      const { createResourceClient } = createResourceClientTestSetup('/groups');
      expect(() => createResourceClient()).not.toThrow();
    });
  });

  await t.step('GET Requests', async (t) => {
    await t.step('prepends base path to relative path', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      // Mock successful response
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/members',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { success: true },
        },
      }]);
      await client.get({ path: 'members' });
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe(
        'https://test.xmatters.com/api/xm/1/groups/members',
      );
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('uses base path when no path provided', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { success: true },
        },
      }]);
      await client.get({});
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups');
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('strips leading slash from provided path', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/members',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { success: true },
        },
      }]);
      await client.get({ path: '/members' });
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe(
        'https://test.xmatters.com/api/xm/1/groups/members',
      );
      mockHttpClient.verifyAllRequestsMade();
    });
  });

  await t.step('HTTP Method Support', async (t) => {
    await t.step('POST - prepends base path correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups/new-group',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
          body: { name: 'Test Group' },
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: { id: '123' },
        },
      }]);
      await client.post({
        path: 'new-group',
        body: { name: 'Test Group' },
      });
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe(
        'https://test.xmatters.com/api/xm/1/groups/new-group',
      );
      expect(mockHttpClient.requests[0].method).toBe('POST');
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('PUT - prepends base path correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'PUT',
          url: 'https://test.xmatters.com/api/xm/1/groups/123',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
          body: { name: 'Updated Group' },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { id: '123' },
        },
      }]);
      await client.put({
        path: '123',
        body: { name: 'Updated Group' },
      });
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/123');
      expect(mockHttpClient.requests[0].method).toBe('PUT');
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('PATCH - prepends base path correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'PATCH',
          url: 'https://test.xmatters.com/api/xm/1/groups/123',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
          body: { name: 'Patched Group' },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { id: '123' },
        },
      }]);
      await client.patch({
        path: '123',
        body: { name: 'Patched Group' },
      });
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/123');
      expect(mockHttpClient.requests[0].method).toBe('PATCH');
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('DELETE - prepends base path correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: 'https://test.xmatters.com/api/xm/1/groups/123',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
        },
        mockedResponse: {
          status: 204,
          headers: {},
          body: '',
        },
      }]);
      await client.delete({ path: '123' });
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/123');
      expect(mockHttpClient.requests[0].method).toBe('DELETE');
      mockHttpClient.verifyAllRequestsMade();
    });
  });

  await t.step('Advanced Path Handling', async (t) => {
    await t.step('handles nested paths correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/123/members/456',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { success: true },
        },
      }]);
      await client.get({ path: '123/members/456' });
      expect(mockHttpClient.requests).toHaveLength(1);
      expect(mockHttpClient.requests[0].url).toBe(
        'https://test.xmatters.com/api/xm/1/groups/123/members/456',
      );
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('passes through all other options unchanged', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      const testHeaders = { 'Custom-Header': 'test-value' };
      const testQuery = { page: '1', limit: '10' };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/members?page=1&limit=10',
          headers: {
            'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'xmas/0.0.1 (Deno)',
            'Custom-Header': 'test-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { success: true },
        },
      }]);
      await client.get({
        path: 'members',
        headers: testHeaders,
        query: testQuery,
      });
      expect(mockHttpClient.requests).toHaveLength(1);
      // Check that custom headers are included
      expect(mockHttpClient.requests[0].headers?.['Custom-Header']).toBe('test-value');
      expect(mockHttpClient.requests[0].url).toBe(
        'https://test.xmatters.com/api/xm/1/groups/members?page=1&limit=10',
      );
      mockHttpClient.verifyAllRequestsMade();
    });
  });
});
