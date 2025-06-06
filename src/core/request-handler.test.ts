import {
  assertEquals,
  assertExists,
  assertRejects,
} from 'https://deno.land/std@0.193.0/testing/asserts.ts';
import { RequestHandler } from './request-handler.ts';
import { HttpClient, HttpRequest, HttpResponse } from './types/internal/http.ts';
import { XmApiError } from './errors.ts';

class TestHttpClient implements HttpClient {
  public requests: HttpRequest[] = [];
  public responses: HttpResponse[] = [];
  public forceError?: Error;

  send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    if (this.forceError) {
      return Promise.reject(this.forceError);
    }
    return Promise.resolve(
      this.responses[this.requests.length - 1] || this.responses[this.responses.length - 1],
    );
  }
}

const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const basicOptions = {
  hostname: 'https://example.com',
  username: 'testuser',
  password: 'password123',
  defaultHeaders: {},
};

const oauthOptions = {
  hostname: 'https://example.com',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  clientId: 'client-id',
  defaultHeaders: {},
};

Deno.test('RequestHandler', async (t) => {
  await t.step('handles non-JSON response bodies', async () => {
    const client = new TestHttpClient();
    const handler = new RequestHandler(client, mockLogger, basicOptions, 3);

    client.responses = [{
      status: 400,
      headers: { 'content-type': 'text/plain' },
      body: 'Invalid request',
    }];

    await assertRejects(
      async () => await handler.get({ path: '/test' }),
      XmApiError,
      'Invalid request',
    );
  });

  await t.step('retries on rate limit with Retry-After', async () => {
    const client = new TestHttpClient();
    const handler = new RequestHandler(client, mockLogger, basicOptions, 3);

    client.responses = [
      {
        status: 429,
        headers: { 'retry-after': '1' },
        body: { message: 'Too many requests' },
      },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { success: true },
      },
    ];

    const response = await handler.get({ path: '/test' });
    assertEquals(response.status, 200);
    assertEquals(client.requests.length, 2);
    assertEquals(client.requests[1].retryAttempt, 1);
  });

  await t.step('retries with exponential backoff on server error', async () => {
    const client = new TestHttpClient();
    const handler = new RequestHandler(client, mockLogger, basicOptions, 3);

    client.responses = [
      {
        status: 503,
        headers: {},
        body: { message: 'Service unavailable' },
      },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { success: true },
      },
    ];

    const response = await handler.get({ path: '/test' });
    assertEquals(response.status, 200);
    assertEquals(client.requests.length, 2);
    assertEquals(client.requests[1].retryAttempt, 1);
  });

  await t.step('stops retrying after max attempts', async () => {
    const client = new TestHttpClient();
    const handler = new RequestHandler(client, mockLogger, basicOptions, 3);

    client.responses = Array(5).fill({
      status: 503,
      headers: {},
      body: { message: 'Service unavailable' },
    });

    await assertRejects(
      async () => await handler.get({ path: '/test' }),
      XmApiError,
      'Service unavailable',
    );

    assertEquals(client.requests.length, 4); // Initial + 3 retries
  });

  await t.step('handles network errors', async () => {
    const client = new TestHttpClient();
    const handler = new RequestHandler(client, mockLogger, basicOptions, 3);

    client.forceError = new Error('Network error');

    try {
      await handler.get({ path: '/test' });
      throw new Error('Expected error to be thrown');
    } catch (error: unknown) {
      assertExists(error);
      assertEquals(error instanceof XmApiError, true);
      const xmError = error as XmApiError;
      assertEquals(xmError.message, 'Request failed');
      assertEquals(xmError.response, undefined);
      assertEquals(xmError.cause instanceof Error, true);
      assertEquals((xmError.cause as Error).message, 'Network error');
    }
  });

  await t.step('adds Basic Auth header to requests', async () => {
    const client = new TestHttpClient();
    const handler = new RequestHandler(client, mockLogger, basicOptions, 3);

    client.responses = [{
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true },
    }];

    await handler.get({ path: '/test' });

    assertEquals(client.requests.length, 1);
    const request = client.requests[0];
    assertExists(request.headers?.Authorization);

    // Verify it's Basic auth
    const [authType] = request.headers.Authorization.split(' ');
    assertEquals(authType, 'Basic');
  });

  await t.step('adds OAuth Bearer token to requests', async () => {
    const client = new TestHttpClient();
    const initialTokenState = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      clientId: 'client-id',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      scopes: [],
    };
    const handler = new RequestHandler(
      client,
      mockLogger,
      oauthOptions,
      3,
      undefined,
      initialTokenState,
    );

    client.responses = [{
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true },
    }];

    await handler.get({ path: '/test' });

    assertEquals(client.requests.length, 1);
    const request = client.requests[0];
    assertEquals(request.headers?.Authorization, 'Bearer test-access-token');
  });

  await t.step('refreshes token on 401 response', async () => {
    const client = new TestHttpClient();
    const initialTokenState = {
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      scopes: [],
    };
    const handler = new RequestHandler(
      client,
      mockLogger,
      oauthOptions,
      3,
      undefined,
      initialTokenState,
    );

    client.responses = [
      // Initial request fails with 401
      {
        status: 401,
        headers: {},
        body: { message: 'Token expired' },
      },
      // Token refresh succeeds
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          access_token: 'new-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      },
      // Original request succeeds with new token
      {
        status: 200,
        headers: {},
        body: { success: true },
      },
    ];

    const response = await handler.get({ path: '/test' });
    assertEquals(response.status, 200);
    assertEquals(client.requests.length, 3);

    // Verify token refresh request
    const refreshRequest = client.requests[1];
    assertEquals(refreshRequest.path, '/oauth2/token');
    assertEquals(refreshRequest.headers?.['Content-Type'], 'application/x-www-form-urlencoded');
    assertExists(refreshRequest.body);
    const params = new URLSearchParams(refreshRequest.body as string);
    assertEquals(params.get('grant_type'), 'refresh_token');
    assertEquals(params.get('refresh_token'), 'refresh-token');
    assertEquals(params.get('client_id'), 'client-id');

    // Verify retried request uses new token
    const retriedRequest = client.requests[2];
    assertEquals(retriedRequest.headers?.Authorization, 'Bearer new-token');
  });

  await t.step('skips auth headers when skipAuth is true', async () => {
    const client = new TestHttpClient();
    const handler = new RequestHandler(client, mockLogger, basicOptions, 3);

    client.responses = [{
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true },
    }];

    await handler.send({ path: '/oauth2/token', skipAuth: true });

    assertEquals(client.requests.length, 1);
    const request = client.requests[0];
    assertEquals(request.headers?.Authorization, undefined);
  });
});
