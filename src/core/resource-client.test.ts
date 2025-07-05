import { expect } from 'std/expect/mod.ts';
import { MockHttpClient, MockLogger, TestConstants } from './test-utils.ts';
import { RequestHandler } from './request-handler.ts';
import { ResourceClient } from './resource-client.ts';
import { XmApiError } from './errors.ts';

// Helper to create ResourceClient with mock dependencies
function createResourceClientTestSetup(basePath: string) {
  const mockHttpClient = new MockHttpClient();
  const mockLogger = new MockLogger();
  const requestHandler = new RequestHandler({
    httpClient: mockHttpClient,
    logger: mockLogger,
    ...TestConstants.BASIC_CONFIG,
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
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          body: { success: true },
        },
      }]);
      await client.get({ path: 'members' });
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('uses base path when no path provided', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          body: { success: true },
        },
      }]);
      await client.get({});
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('strips leading slash from provided path', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/members',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          body: { success: true },
        },
      }]);
      await client.get({ path: '/members' });
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
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: { name: 'Test Group' },
        },
        mockedResponse: {
          status: 201,
          body: { id: '123' },
        },
      }]);
      await client.post({
        path: 'new-group',
        body: { name: 'Test Group' },
      });
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('PUT - prepends base path correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'PUT',
          url: 'https://test.xmatters.com/api/xm/1/groups/123',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: { name: 'Updated Group' },
        },
        mockedResponse: {
          body: { id: '123' },
        },
      }]);
      await client.put({
        path: '123',
        body: { name: 'Updated Group' },
      });
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('PATCH - prepends base path correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'PATCH',
          url: 'https://test.xmatters.com/api/xm/1/groups/123',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: { name: 'Patched Group' },
        },
        mockedResponse: {
          body: { id: '123' },
        },
      }]);
      await client.patch({
        path: '123',
        body: { name: 'Patched Group' },
      });
      mockHttpClient.verifyAllRequestsMade();
    });

    await t.step('DELETE - prepends base path correctly', async () => {
      const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
      const client = createResourceClient();
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: 'https://test.xmatters.com/api/xm/1/groups/123',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 204,
        },
      }]);
      await client.delete({ path: '123' });
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
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          body: { success: true },
        },
      }]);
      await client.get({ path: '123/members/456' });
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
            ...TestConstants.BASIC_AUTH_HEADERS,
            'Custom-Header': 'test-value',
          },
        },
        mockedResponse: {
          body: { success: true },
        },
      }]);
      await client.get({
        path: 'members',
        headers: testHeaders,
        query: testQuery,
      });
      mockHttpClient.verifyAllRequestsMade();
    });
  });
});
