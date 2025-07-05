import { expect } from 'std/expect/mod.ts';
import { OAuthEndpoint } from './index.ts';
import { MockHttpClient, MockLogger, TestConstants } from 'core/test-utils.ts';
import { RequestHandler } from 'core/request-handler.ts';
import { XmApiError } from 'core/errors.ts';
import { AuthType } from 'types/mutable-auth-state.ts';

// Shared test infrastructure - MockHttpClient auto-resets between tests
const mockHttpClient = new MockHttpClient();
const mockLogger = new MockLogger();

// Helper function to create fresh RequestHandlers for each test
function createBasicAuthRequestHandler() {
  return new RequestHandler({
    httpClient: mockHttpClient,
    logger: mockLogger,
    ...TestConstants.BASIC_CONFIG,
  });
}

function createAuthCodeRequestHandler() {
  return new RequestHandler({
    httpClient: mockHttpClient,
    logger: mockLogger,
    hostname: 'https://test.xmatters.com',
    authorizationCode: 'test-auth-code',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  });
}

function createOAuthRequestHandler() {
  return new RequestHandler({
    httpClient: mockHttpClient,
    logger: mockLogger,
    ...TestConstants.OAUTH_CONFIG,
  });
}

const mockOAuth2TokenResponse = {
  access_token: 'new-access-token',
  refresh_token: 'new-refresh-token',
  expires_in: 3600,
  token_type: 'Bearer',
};

Deno.test('OAuthEndpoint', async (t) => {
  await t.step('obtainTokens() - From Basic Auth', async (t) => {
    await t.step('performs password grant flow with clientId', async () => {
      const oauth = new OAuthEndpoint(createBasicAuthRequestHandler());
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body: 'grant_type=password&client_id=test-client-id&username=testuser&password=testpass',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      await oauth.obtainTokens({ clientId: 'test-client-id' });
    });

    await t.step('performs password grant flow with clientId and clientSecret', async () => {
      const oauth = new OAuthEndpoint(createBasicAuthRequestHandler());
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body:
            'grant_type=password&client_id=test-client-id&username=testuser&password=testpass&client_secret=test-client-secret',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      await oauth.obtainTokens({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });
    });

    await t.step('throws error when clientId is not provided (no request attempted)', async () => {
      const oauth = new OAuthEndpoint(createBasicAuthRequestHandler());
      try {
        await oauth.obtainTokens();
        // If no error is thrown, this is a failure
        throw new Error('Expected error to be thrown');
      } catch (error) {
        if (error instanceof XmApiError) {
          expect(error.message).toBe(
            'Client ID discovery not yet implemented - please provide explicit clientId',
          );
        } else {
          throw error;
        }
      }
    });
  });

  await t.step('obtainTokens() - From Auth Code', async (t) => {
    await t.step('performs authorization code flow with client secret from config', async () => {
      const oauth = new OAuthEndpoint(createAuthCodeRequestHandler());
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body:
            'grant_type=authorization_code&authorization_code=test-auth-code&client_secret=test-client-secret',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      await oauth.obtainTokens();
    });

    await t.step('performs authorization code flow with client secret from params', async () => {
      const oauth = new OAuthEndpoint(createAuthCodeRequestHandler());
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body:
            'grant_type=authorization_code&authorization_code=test-auth-code&client_secret=override-client-secret',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      await oauth.obtainTokens({ clientSecret: 'override-client-secret' });
    });

    await t.step('performs authorization code flow without client secret', async () => {
      // Create auth code handler without client secret
      const authCodeRequestHandlerNoSecret = new RequestHandler({
        httpClient: mockHttpClient,
        logger: mockLogger,
        hostname: 'https://test.xmatters.com',
        authorizationCode: 'test-auth-code',
        clientId: 'test-client-id',
      });
      const oauthNoSecret = new OAuthEndpoint(authCodeRequestHandlerNoSecret);
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body: 'grant_type=authorization_code&authorization_code=test-auth-code',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      await oauthNoSecret.obtainTokens();
    });
  });

  await t.step('obtainTokens() - From OAuth', async (t) => {
    await t.step('throws error when already have OAuth tokens (No request attempted)', async () => {
      const oauth = new OAuthEndpoint(createOAuthRequestHandler());
      try {
        await oauth.obtainTokens();
        // If no error is thrown, this is a failure
        throw new Error('Expected error to be thrown');
      } catch (error) {
        if (error instanceof XmApiError) {
          expect(error.message).toBe('Already have OAuth tokens - no need to call obtainTokens()');
        } else {
          throw error;
        }
      }
    });
  });

  await t.step('Token Request Handling', async (t) => {
    await t.step('handles successful token response', async () => {
      const oauth = new OAuthEndpoint(createBasicAuthRequestHandler());
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body: 'grant_type=password&client_id=test-client-id&username=testuser&password=testpass',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      const response = await oauth.obtainTokens({ clientId: 'test-client-id' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOAuth2TokenResponse);
    });

    await t.step('handles HTTP error responses', async () => {
      const oauth = new OAuthEndpoint(createBasicAuthRequestHandler());
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body: 'grant_type=password&client_id=invalid-client&username=testuser&password=testpass',
        },
        mockedResponse: {
          status: 400,
          headers: { 'content-type': 'application/json' },
          body: {
            error: 'invalid_client',
            error_description: 'Client authentication failed',
          },
        },
      }]);
      try {
        await oauth.obtainTokens({ clientId: 'invalid-client' });
        // If no error is thrown, this is a failure
        throw new Error('Expected XmApiError to be thrown');
      } catch (error) {
        if (error instanceof XmApiError) {
          expect(error.response?.status).toBe(400);
          expect((error.response?.body as unknown as { error: string })?.error).toBe(
            'invalid_client',
          );
        } else {
          throw error;
        }
      }
    });

    await t.step('handles network errors', async () => {
      const oauth = new OAuthEndpoint(createBasicAuthRequestHandler());
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body: 'grant_type=password&client_id=test-client-id&username=testuser&password=testpass',
        },
        mockedError: new Error('Network connection failed'),
      }]);
      try {
        await oauth.obtainTokens({ clientId: 'test-client-id' });
        // If no error is thrown, this is a failure
        throw new Error('Expected XmApiError to be thrown');
      } catch (error) {
        if (error instanceof XmApiError) {
          expect(error.message).toBe('Request failed');
          expect((error.cause as Error)?.message).toBe('Network connection failed');
        } else {
          throw error;
        }
      }
    });
  });

  await t.step('Form Data Building', async (t) => {
    await t.step('properly encodes special characters in form data', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body:
            'grant_type=password&client_id=test%40client&username=user%2Bname&password=pass%26word',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      // Create a request handler with special characters
      const specialCharsRequestHandler = new RequestHandler({
        httpClient: mockHttpClient,
        logger: mockLogger,
        hostname: 'https://test.xmatters.com',
        username: 'user+name',
        password: 'pass&word',
      });
      const specialCharsOauth = new OAuthEndpoint(specialCharsRequestHandler);
      await specialCharsOauth.obtainTokens({ clientId: 'test@client' });
    });
  });

  await t.step('Integration with RequestHandler', async (t) => {
    await t.step('calls handleNewOAuthTokens after successful response', async () => {
      const requestHandler = createBasicAuthRequestHandler();
      const oauth = new OAuthEndpoint(requestHandler);
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/oauth2/token',
          headers: TestConstants.TOKEN_REQUEST_HEADERS,
          body: 'grant_type=password&client_id=test-client-id&username=testuser&password=testpass',
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockOAuth2TokenResponse,
        },
      }]);
      // This will internally call handleNewOAuthTokens which transitions auth state
      await oauth.obtainTokens({ clientId: 'test-client-id' });
      // Verify that the auth state was properly updated by checking the current state
      const currentState = requestHandler.getCurrentAuthState();
      expect(currentState.type).toBe(AuthType.OAUTH);
      if (currentState.type === AuthType.OAUTH) {
        expect(currentState.accessToken).toBe(mockOAuth2TokenResponse.access_token);
        expect(currentState.refreshToken).toBe(mockOAuth2TokenResponse.refresh_token);
        expect(currentState.clientId).toBe('test-client-id');
      }
    });
  });
});
