import { expect } from 'std/expect/mod.ts';
import { XmApi, XmApiError } from './index.ts';
import { createMockLogger, MockHttpClient, withFakeTime } from './core/test-utils.ts';

// Shared mock HTTP client - resets after each test via verifyAllRequestsMade()
const mockHttpClient = new MockHttpClient();

Deno.test('XmApi - Basic Auth Integration', async () => {
  const { mockLogger } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
    httpClient: mockHttpClient,
    logger: mockLogger,
  });

  // Test a simple GET request
  mockHttpClient.setReqRes([{
    expectedRequest: {
      method: 'GET',
      url: 'https://test.xmatters.com/api/xm/1/groups?limit=10',
      headers: {
        'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=', // base64 of testuser:testpass
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'xmas/0.0.1 (Deno)',
      },
    },
    mockedResponse: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { count: 0, total: 0, data: [] },
    },
  }]);

  const response = await api.groups.get({ limit: 10 });
  expect(response.status).toBe(200);
  expect(response.body.count).toBe(0);

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - OAuth Token Integration', async () => {
  const { mockLogger } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    clientId: 'test-client-id',
    httpClient: mockHttpClient,
    logger: mockLogger,
  });

  // Test OAuth Bearer token is used
  mockHttpClient.setReqRes([{
    expectedRequest: {
      method: 'GET',
      url: 'https://test.xmatters.com/api/xm/1/groups',
      headers: {
        'Authorization': 'Bearer test-access-token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'xmas/0.0.1 (Deno)',
      },
    },
    mockedResponse: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { count: 1, total: 1, data: [{ id: '123', targetName: 'Test Group' }] },
    },
  }]);

  const response = await api.groups.get();
  expect(response.status).toBe(200);
  expect(response.body.data).toHaveLength(1);

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - Token Refresh on 401', async () => {
  const { mockLogger } = createMockLogger();
  let tokenRefreshCalled = false;
  let newAccessToken = '';
  let newRefreshToken = '';

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    accessToken: 'expired-token',
    refreshToken: 'valid-refresh-token',
    clientId: 'test-client-id',
    httpClient: mockHttpClient,
    logger: mockLogger,
    onTokenRefresh: (accessToken, refreshToken) => {
      tokenRefreshCalled = true;
      newAccessToken = accessToken;
      newRefreshToken = refreshToken;
    },
  });

  mockHttpClient.setReqRes([
    // First request fails with 401
    {
      expectedRequest: {
        method: 'GET',
        url: 'https://test.xmatters.com/api/xm/1/groups',
        headers: {
          'Authorization': 'Bearer expired-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'xmas/0.0.1 (Deno)',
        },
      },
      mockedResponse: {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Unauthorized' },
      },
    },
    // Token refresh request
    {
      expectedRequest: {
        method: 'POST',
        url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'xmas/0.0.1 (Deno)',
        },
        body: 'grant_type=refresh_token&refresh_token=valid-refresh-token&client_id=test-client-id',
      },
      mockedResponse: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      },
    },
    // Retry original request with new token
    {
      expectedRequest: {
        method: 'GET',
        url: 'https://test.xmatters.com/api/xm/1/groups',
        headers: {
          'Authorization': 'Bearer new-access-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'xmas/0.0.1 (Deno)',
        },
      },
      mockedResponse: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { count: 1, total: 1, data: [{ id: '123', targetName: 'Test Group' }] },
      },
    },
  ]);

  const response = await api.groups.get();
  expect(response.status).toBe(200);
  expect(tokenRefreshCalled).toBe(true);
  expect(newAccessToken).toBe('new-access-token');
  expect(newRefreshToken).toBe('new-refresh-token');

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - Token Refresh Callback Error Handling', async () => {
  const { mockLogger, warnSpy } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    accessToken: 'expired-token',
    refreshToken: 'valid-refresh-token',
    clientId: 'test-client-id',
    httpClient: mockHttpClient,
    logger: mockLogger,
    onTokenRefresh: () => {
      throw new Error('Callback error');
    },
  });

  mockHttpClient.setReqRes([
    // First request fails with 401
    {
      expectedRequest: {
        method: 'GET',
        url: 'https://test.xmatters.com/api/xm/1/groups',
        headers: {
          'Authorization': 'Bearer expired-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'xmas/0.0.1 (Deno)',
        },
      },
      mockedResponse: {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Unauthorized' },
      },
    },
    // Token refresh request
    {
      expectedRequest: {
        method: 'POST',
        url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'xmas/0.0.1 (Deno)',
        },
        body: 'grant_type=refresh_token&refresh_token=valid-refresh-token&client_id=test-client-id',
      },
      mockedResponse: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      },
    },
    // Retry original request with new token
    {
      expectedRequest: {
        method: 'GET',
        url: 'https://test.xmatters.com/api/xm/1/groups',
        headers: {
          'Authorization': 'Bearer new-access-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'xmas/0.0.1 (Deno)',
        },
      },
      mockedResponse: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { count: 0, total: 0, data: [] },
      },
    },
  ]);

  // Should not throw despite callback error
  const response = await api.groups.get();
  expect(response.status).toBe(200);

  // Should log warning about callback error
  expect(warnSpy.calls).toHaveLength(1);
  expect(warnSpy.calls[0].args[0]).toContain('Error in onTokenRefresh callback');

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - Retry Logic for 429 Rate Limit', async () => {
  return await withFakeTime(async (fakeTime) => {
    const { mockLogger, debugSpy } = createMockLogger();

    const api = new XmApi({
      hostname: 'test.xmatters.com',
      username: 'testuser',
      password: 'testpass',
      httpClient: mockHttpClient,
      logger: mockLogger,
      maxRetries: 2,
    });

    mockHttpClient.setReqRes([
      // First request fails with 429
      {
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
          status: 429,
          headers: { 'Retry-After': '1' }, // 1 second
          body: { error: 'Rate limit exceeded' },
        },
      },
      // Second request also fails with 429
      {
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
          status: 429,
          headers: { 'Retry-After': '1' },
          body: { error: 'Rate limit exceeded' },
        },
      },
      // Third request succeeds
      {
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
          headers: { 'Content-Type': 'application/json' },
          body: { count: 0, total: 0, data: [] },
        },
      },
    ]);

    // Start the request but don't await it yet
    const requestPromise = api.groups.get();

    // Advance time to process the retries
    await fakeTime.nextAsync(); // First request + first retry
    await fakeTime.nextAsync(); // Second retry + final success

    const response = await requestPromise;
    expect(response.status).toBe(200);

    // Should log retry attempts
    const debugCalls = debugSpy.calls.filter((call) =>
      call.args[0].includes('Request failed with status 429')
    );
    expect(debugCalls).toHaveLength(2);

    mockHttpClient.verifyAllRequestsMade();
  });
});

Deno.test('XmApi - Retry Logic for 500 Server Error', async () => {
  return await withFakeTime(async (fakeTime) => {
    const { mockLogger } = createMockLogger();

    const api = new XmApi({
      hostname: 'test.xmatters.com',
      username: 'testuser',
      password: 'testpass',
      httpClient: mockHttpClient,
      logger: mockLogger,
      maxRetries: 1,
    });

    mockHttpClient.setReqRes([
      // First request fails with 500
      {
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
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Internal Server Error' },
        },
      },
      // Second request succeeds
      {
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
          headers: { 'Content-Type': 'application/json' },
          body: { count: 0, total: 0, data: [] },
        },
      },
    ]);

    // Start the request but don't await it yet
    const requestPromise = api.groups.get();

    // Advance time to process the retry
    await fakeTime.nextAsync(); // First request + retry with exponential backoff

    const response = await requestPromise;
    expect(response.status).toBe(200);

    mockHttpClient.verifyAllRequestsMade();
  });
});

Deno.test('XmApi - Max Retries Exceeded', async () => {
  return await withFakeTime(async (fakeTime) => {
    const { mockLogger } = createMockLogger();

    const api = new XmApi({
      hostname: 'test.xmatters.com',
      username: 'testuser',
      password: 'testpass',
      httpClient: mockHttpClient,
      logger: mockLogger,
      maxRetries: 1,
    });

    mockHttpClient.setReqRes([
      // First request fails with 500
      {
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
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: { reason: 'Internal Server Error' },
        },
      },
      // Second request also fails with 500
      {
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
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: { reason: 'Internal Server Error' },
        },
      },
    ]);

    // Start the request but don't await it yet
    const requestPromise = api.groups.get().catch((error) => error);

    // Advance time to process all retry attempts
    await fakeTime.nextAsync(); // First request + first retry (both fail)

    const error = await requestPromise;
    expect(error).toBeInstanceOf(XmApiError);
    const apiError = error as XmApiError;
    // Should throw with the extracted error message from the response
    expect(apiError.message).toBe('Internal Server Error');
    expect(apiError.response?.status).toBe(500);

    mockHttpClient.verifyAllRequestsMade();
  });
});

Deno.test('XmApi - Error Response Structure', async () => {
  const { mockLogger } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
    httpClient: mockHttpClient,
    logger: mockLogger,
  });

  const errorResponse = {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
    body: { error: 'Group not found', code: 'GROUP_NOT_FOUND' },
  };

  mockHttpClient.setReqRes([{
    expectedRequest: {
      method: 'GET',
      url: 'https://test.xmatters.com/api/xm/1/groups/nonexistent',
      headers: {
        'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'xmas/0.0.1 (Deno)',
      },
    },
    mockedResponse: errorResponse,
  }]);

  try {
    await api.groups.getById('nonexistent');
    throw new Error('Should have thrown XmApiError');
  } catch (error) {
    expect(error).toBeInstanceOf(XmApiError);
    const apiError = error as XmApiError;
    expect(apiError.response).toBeDefined();
    expect(apiError.response?.status).toBe(404);
    expect(apiError.response?.body).toEqual({ error: 'Group not found', code: 'GROUP_NOT_FOUND' });
    expect(apiError.response?.headers).toEqual({ 'Content-Type': 'application/json' });
  }

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - Network Error Handling', async () => {
  const { mockLogger } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
    httpClient: mockHttpClient,
    logger: mockLogger,
  });

  // Use mockedError to simulate network connection failure
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
    mockedError: new Error('Network connection failed'),
  }]);

  try {
    await api.groups.get();
    throw new Error('Should have thrown XmApiError');
  } catch (error) {
    expect(error).toBeInstanceOf(XmApiError);
    const apiError = error as XmApiError;
    expect(apiError.message).toBe('Request failed');
    expect(apiError.response).toBeNull();
    expect((apiError.cause as Error)?.message).toBe('Network connection failed');
  }

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - Custom Headers Integration', async () => {
  const { mockLogger } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
    httpClient: mockHttpClient,
    logger: mockLogger,
    defaultHeaders: {
      'X-Custom-Header': 'custom-value',
      'X-Client-Version': '1.0.0',
    },
  });

  mockHttpClient.setReqRes([{
    expectedRequest: {
      method: 'GET',
      url: 'https://test.xmatters.com/api/xm/1/groups',
      headers: {
        'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'xmas/0.0.1 (Deno)',
        'X-Custom-Header': 'custom-value',
        'X-Client-Version': '1.0.0',
      },
    },
    mockedResponse: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { count: 0, total: 0, data: [] },
    },
  }]);

  const response = await api.groups.get();
  expect(response.status).toBe(200);

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - OAuth Token Acquisition', async () => {
  const { mockLogger } = createMockLogger();
  let tokenRefreshCalled = false;

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
    httpClient: mockHttpClient,
    logger: mockLogger,
    onTokenRefresh: (accessToken, refreshToken) => {
      tokenRefreshCalled = true;
      expect(accessToken).toBe('obtained-access-token');
      expect(refreshToken).toBe('obtained-refresh-token');
    },
  });

  // We'll validate the URL params more flexibly since URLSearchParams order can vary
  mockHttpClient.setReqRes([{
    expectedRequest: {
      method: 'POST',
      url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'xmas/0.0.1 (Deno)',
      },
      body: 'grant_type=password&client_id=test-client&username=testuser&password=testpass',
    },
    mockedResponse: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        access_token: 'obtained-access-token',
        refresh_token: 'obtained-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
      },
    },
  }]);

  const response = await api.oauth.obtainTokens({ clientId: 'test-client' });
  expect(response.status).toBe(200);
  expect(response.body.access_token).toBe('obtained-access-token');
  expect(tokenRefreshCalled).toBe(true);

  // Validate that the request body contains the expected parameters
  const request = mockHttpClient.requests[0];
  const bodyString = request.body as string;
  expect(bodyString).toContain('grant_type=password');
  expect(bodyString).toContain('username=testuser');
  expect(bodyString).toContain('password=testpass');
  expect(bodyString).toContain('client_id=test-client');

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - User-Agent Header', async () => {
  const { mockLogger } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
    httpClient: mockHttpClient,
    logger: mockLogger,
  });

  mockHttpClient.setReqRes([{
    expectedRequest: {
      method: 'GET',
      url: 'https://test.xmatters.com/api/xm/1/groups',
      headers: {
        'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'xmas/0.0.1 (Deno)', // Should match version in deno.json
      },
    },
    mockedResponse: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { count: 0, total: 0, data: [] },
    },
  }]);

  const response = await api.groups.get();
  expect(response.status).toBe(200);

  mockHttpClient.verifyAllRequestsMade();
});

Deno.test('XmApi - Logging Integration', async () => {
  const { mockLogger, debugSpy } = createMockLogger();

  const api = new XmApi({
    hostname: 'test.xmatters.com',
    username: 'testuser',
    password: 'testpass',
    httpClient: mockHttpClient,
    logger: mockLogger,
  });

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
      headers: { 'Content-Type': 'application/json' },
      body: { count: 0, total: 0, data: [] },
    },
  }]);

  await api.groups.get();

  // Should log request and response
  const requestLog = debugSpy.calls.find((call) =>
    call.args[0].includes('--> GET https://test.xmatters.com/api/xm/1/groups')
  );
  const responseLog = debugSpy.calls.find((call) => call.args[0].includes('<-- 200'));

  expect(requestLog).toBeDefined();
  expect(responseLog).toBeDefined();

  mockHttpClient.verifyAllRequestsMade();
});

/*

1. Authentication Integration:
  + Basic Auth with proper header encoding
  + OAuth Bearer token authentication
  + Token refresh on 401 responses
  + Token refresh callback handling with error safety

2. HTTP Client Integration:
  + Request building and sending through injected HTTP client
  + Custom headers merging (default + per-request)
  + User-Agent header generation from deno.json version

3. Retry Logic:
  + 429 rate limit retries with Retry-After header respect
  + 500 server error retries with exponential backoff
  + Maximum retry attempts enforcement
  + Proper error handling after max retries exceeded

4. Logging Integration:
  + Request/response logging through injected logger
  + Debug logging for retry attempts
  + Warning logging for token refresh callback errors

5. Error Handling:
  + Proper XmApiError instances with response details
  + Network error handling with cause preservation
  + Consistent error structure for consumers

6. OAuth Token Management:
  + Token acquisition from basic auth credentials
  + Token refresh callback execution
  + Error handling in token refresh callbacks

*/
