import { expect } from 'std/expect/mod.ts';
import { IntegrationsEndpoint } from './index.ts';
import { MockHttpClient, MockLogger, TestConstants } from 'core/test-utils.ts';
import { RequestHandler } from 'core/request-handler.ts';

// Shared test infrastructure - MockHttpClient auto-resets between tests
const mockHttpClient = new MockHttpClient();
const mockLogger = new MockLogger();

const requestHandler = new RequestHandler({
  httpClient: mockHttpClient,
  logger: mockLogger,
  ...TestConstants.BASIC_CONFIG,
});

const integrations = new IntegrationsEndpoint(requestHandler);

const mockTriggerResponseBody = {
  requestId: 'test-request-id-12345',
};

// Integration headers (no auth since skipAuth: true)
const INTEGRATION_HEADERS = {
  'Content-Type': TestConstants.BASIC_AUTH_HEADERS['Content-Type'],
  'Accept': TestConstants.BASIC_AUTH_HEADERS['Accept'],
  'User-Agent': TestConstants.BASIC_AUTH_HEADERS['User-Agent'],
} as const;

Deno.test('IntegrationsEndpoint', async (t) => {
  await t.step('trigger() - Trigger Integration', async (t) => {
    await t.step('makes POST request with payload', async () => {
      const integrationUrl =
        'https://test.xmatters.com/api/integration/1/functions/test-function-id/triggers';
      const payload = {
        properties: {
          subject: 'Test Alert',
          body: 'This is a test integration trigger',
          priority: 'HIGH',
        },
        recipients: ['test-user@example.com'],
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: integrationUrl,
          headers: INTEGRATION_HEADERS,
          body: payload,
        },
        mockedResponse: {
          status: 202,
          headers: { 'content-type': 'application/json' },
          body: mockTriggerResponseBody,
        },
      }]);
      const response = await integrations.trigger(integrationUrl, payload);
      expect(response.status).toBe(202);
      expect(response.body.requestId).toBe('test-request-id-12345');
    });

    await t.step('makes POST request with apiKey in URL', async () => {
      const integrationUrl =
        'https://test.xmatters.com/api/integration/1/functions/test-function-id/triggers?apiKey=test-api-key';
      const payload = {
        message: 'Simple notification',
        timestamp: '2025-01-01T12:00:00Z',
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: integrationUrl,
          headers: INTEGRATION_HEADERS,
          body: payload,
        },
        mockedResponse: {
          status: 202,
          headers: { 'content-type': 'application/json' },
          body: mockTriggerResponseBody,
        },
      }]);
      await integrations.trigger(integrationUrl, payload);
    });

    await t.step('makes POST request with custom headers', async () => {
      const integrationUrl =
        'https://test.xmatters.com/api/integration/1/functions/test-function-id/triggers';
      const payload = { data: 'test' };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: integrationUrl,
          headers: {
            ...INTEGRATION_HEADERS,
            'X-Custom-Header': 'custom-value',
            'X-Source-System': 'monitoring-tool',
          },
          body: payload,
        },
        mockedResponse: {
          status: 202,
          headers: { 'content-type': 'application/json' },
          body: mockTriggerResponseBody,
        },
      }]);
      await integrations.trigger(integrationUrl, payload, {
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Source-System': 'monitoring-tool',
        },
      });
    });

    await t.step('makes POST request with empty payload', async () => {
      const integrationUrl =
        'https://test.xmatters.com/api/integration/1/functions/test-function-id/triggers';
      const payload = {};
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: integrationUrl,
          headers: INTEGRATION_HEADERS,
          body: payload,
        },
        mockedResponse: {
          status: 202,
          headers: { 'content-type': 'application/json' },
          body: mockTriggerResponseBody,
        },
      }]);
      await integrations.trigger(integrationUrl, payload);
    });

    await t.step('makes POST request with string payload', async () => {
      const integrationUrl =
        'https://test.xmatters.com/api/integration/1/functions/test-function-id/triggers';
      const payload = 'simple string payload';
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: integrationUrl,
          headers: INTEGRATION_HEADERS,
          body: payload,
        },
        mockedResponse: {
          status: 202,
          headers: { 'content-type': 'application/json' },
          body: mockTriggerResponseBody,
        },
      }]);
      await integrations.trigger(integrationUrl, payload);
    });

    await t.step('makes POST request with array payload', async () => {
      const integrationUrl =
        'https://test.xmatters.com/api/integration/1/functions/test-function-id/triggers';
      const payload = [
        { id: 1, message: 'First item' },
        { id: 2, message: 'Second item' },
      ];
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: integrationUrl,
          headers: INTEGRATION_HEADERS,
          body: payload,
        },
        mockedResponse: {
          status: 202,
          headers: { 'content-type': 'application/json' },
          body: mockTriggerResponseBody,
        },
      }]);
      await integrations.trigger(integrationUrl, payload);
    });
  });
});
