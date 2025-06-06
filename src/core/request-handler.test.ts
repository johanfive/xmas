import {
  assertEquals,
  assertExists,
  assertRejects,
} from 'https://deno.land/std@0.193.0/testing/asserts.ts';
import { RequestBuilder, RequestHandler } from './request-handler.ts';
import { HttpClient, HttpRequest, HttpResponse, Logger } from './types.ts';
import { XmApiError } from './errors.ts';

class TestHttpClient implements HttpClient {
  public requests: HttpRequest[] = [];
  public responses: HttpResponse[] = [];
  public forceError?: Error;

  async send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    if (this.forceError) {
      throw this.forceError;
    }
    return this.responses[this.requests.length - 1] || this.responses[this.responses.length - 1];
  }
}

const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

Deno.test('RequestHandler', async (t) => {
  await t.step('handles non-JSON response bodies', async () => {
    const client = new TestHttpClient();
    const requestBuilder = new RequestBuilder('https://example.com');
    const handler = new RequestHandler(client, mockLogger, requestBuilder);

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
    const requestBuilder = new RequestBuilder('https://example.com');
    const handler = new RequestHandler(client, mockLogger, requestBuilder);

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
    const requestBuilder = new RequestBuilder('https://example.com');
    const handler = new RequestHandler(client, mockLogger, requestBuilder);

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
    const requestBuilder = new RequestBuilder('https://example.com');
    const handler = new RequestHandler(client, mockLogger, requestBuilder);

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
    const requestBuilder = new RequestBuilder('https://example.com');
    const handler = new RequestHandler(client, mockLogger, requestBuilder);

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

  await t.step('refreshes token on 401 response', async () => {
    const client = new TestHttpClient();
    const requestBuilder = new RequestBuilder('https://example.com');
    const handler = new RequestHandler(
      client,
      mockLogger,
      requestBuilder,
      3,
      undefined,
      {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
      },
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
});
