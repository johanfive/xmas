import { expect } from 'std/expect/mod.ts';
import { ResourceClient } from './resource-client.ts';
import { RequestHandler } from './request-handler.ts';
import { XmApiError } from './errors.ts';
import type { HttpRequest, HttpResponse } from './types/internal/http.ts';

// Mock HTTP client for testing
class MockHttpClient {
  private responses: HttpResponse[] = [];
  private requestHistory: HttpRequest[] = [];
  addResponse(response: HttpResponse) {
    this.responses.push(response);
  }
  getRequestHistory(): HttpRequest[] {
    return this.requestHistory;
  }
  send(request: HttpRequest): Promise<HttpResponse> {
    this.requestHistory.push(request);
    if (this.responses.length === 0) {
      throw new Error('MockHttpClient: No more responses configured');
    }
    return Promise.resolve(this.responses.shift()!);
  }
}

// Helper to create ResourceClient with mock dependencies
function createResourceClientTestSetup(basePath: string) {
  const mockHttpClient = new MockHttpClient();
  const requestHandler = new RequestHandler({
    httpClient: mockHttpClient,
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
  await t.step(
    'Constructor validation - throws XmApiError when base path does not start with slash',
    () => {
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
    },
  );

  await t.step('Constructor validation - accepts valid base path starting with slash', () => {
    const { createResourceClient } = createResourceClientTestSetup('/groups');
    expect(() => createResourceClient()).not.toThrow();
  });

  await t.step('get() - prepends base path to relative path', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    // Mock successful response
    mockHttpClient.addResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });
    await client.get({ path: 'members' });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/members');
  });

  await t.step('get() - uses base path when no path provided', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });
    await client.get({});
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups');
  });

  await t.step('get() - strips leading slash from provided path', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });
    await client.get({ path: '/members' });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/members');
  });

  await t.step('post() - prepends base path correctly', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 201,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '123' }),
    });
    await client.post({
      path: 'new-group',
      body: { name: 'Test Group' },
    });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/new-group');
    expect(requests[0].method).toBe('POST');
  });

  await t.step('put() - prepends base path correctly', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '123' }),
    });
    await client.put({
      path: '123',
      body: { name: 'Updated Group' },
    });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/123');
    expect(requests[0].method).toBe('PUT');
  });
  await t.step('patch() - prepends base path correctly', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '123' }),
    });
    await client.patch({
      path: '123',
      body: { name: 'Patched Group' },
    });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/123');
    expect(requests[0].method).toBe('PATCH');
  });

  await t.step('delete() - prepends base path correctly', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 204,
      headers: {},
      body: '',
    });
    await client.delete({ path: '123' });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/123');
    expect(requests[0].method).toBe('DELETE');
  });

  await t.step('Complex path building - handles nested paths correctly', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });
    await client.get({ path: '123/members/456' });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://test.xmatters.com/api/xm/1/groups/123/members/456');
  });

  await t.step('Passes through all other options unchanged', async () => {
    const { mockHttpClient, createResourceClient } = createResourceClientTestSetup('/groups');
    const client = createResourceClient();
    mockHttpClient.addResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });
    const testHeaders = { 'Custom-Header': 'test-value' };
    const testQuery = { page: '1', limit: '10' };
    await client.get({
      path: 'members',
      headers: testHeaders,
      query: testQuery,
    });
    const requests = mockHttpClient.getRequestHistory();
    expect(requests).toHaveLength(1);
    // Check that custom headers are included
    expect(requests[0].headers?.['Custom-Header']).toBe('test-value');
    expect(requests[0].url).toBe(
      'https://test.xmatters.com/api/xm/1/groups/members?page=1&limit=10',
    );
  });
});
