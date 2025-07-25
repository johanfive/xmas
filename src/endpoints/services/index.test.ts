import { MockHttpClient, MockLogger, TestConstants } from 'core/test-utils.ts';
import { ServicesEndpoint } from './index.ts';
import { RequestHandler } from 'core/request-handler.ts';

// Shared test infrastructure - MockHttpClient auto-resets between tests
const mockHttpClient = new MockHttpClient();
const mockLogger = new MockLogger();

const requestHandler = new RequestHandler({
  httpClient: mockHttpClient,
  logger: mockLogger,
  ...TestConstants.BASIC_CONFIG,
});

const services = new ServicesEndpoint(requestHandler);

const mockSingleServiceBody = {
  id: 'b421ba14-57bb-474a-8e0e-614d97f26612',
  targetName: 'API',
  recipientType: 'SERVICE',
  description: 'West Coast API servers',
  serviceType: 'TECHNICAL',
  serviceTier: 'GOLD',
  ownedBy: {
    id: '460e6099-bbac-4bf0-a403-e8dbc0f46526',
    targetName: 'API Admins',
    recipientType: 'GROUP',
    links: {
      self: '/api/xm/1/groups/460e6099-bbac-4bf0-a403-e8dbc0f46526',
    },
  },
  links: {
    self: '/api/xm/1/services/b421ba14-57bb-474a-8e0e-614d97f26612',
  },
};

const mockPaginatedServicesBody = {
  count: 1,
  total: 1,
  data: [mockSingleServiceBody],
  links: {
    self: '/api/xm/1/services?limit=100&offset=0',
  },
};

Deno.test('ServicesEndpoint', async (t) => {
  await t.step('get() - List Services', async (t) => {
    await t.step('makes GET request without parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/services',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedServicesBody,
        },
      }]);
      await services.get();
    });

    await t.step('makes GET request with query parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/services?limit=10&offset=5',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedServicesBody,
        },
      }]);
      await services.get({
        query: {
          limit: 10,
          offset: 5,
        },
      });
    });

    await t.step('makes GET request with complex query parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url:
            'https://test.xmatters.com/api/xm/1/services?search=api+server&operand=AND&fields=DESCRIPTION&serviceTier=GOLD&serviceType=TECHNICAL',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedServicesBody,
        },
      }]);
      await services.get({
        query: {
          search: 'api server',
          operand: 'AND',
          fields: 'DESCRIPTION',
          serviceTier: 'GOLD',
          serviceType: 'TECHNICAL',
        },
      });
    });

    await t.step('makes GET request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/services',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedServicesBody,
        },
      }]);
      await services.get({
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });

  await t.step('getByIdentifier() - Get Single Service', async (t) => {
    await t.step('makes GET request with ID', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: `https://test.xmatters.com/api/xm/1/services/${mockSingleServiceBody.id}`,
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleServiceBody,
        },
      }]);
      await services.getByIdentifier(mockSingleServiceBody.id);
    });

    await t.step('makes GET request with targetName', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: `https://test.xmatters.com/api/xm/1/services/${mockSingleServiceBody.targetName}`,
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleServiceBody,
        },
      }]);
      await services.getByIdentifier(mockSingleServiceBody.targetName);
    });

    await t.step('makes GET request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: `https://test.xmatters.com/api/xm/1/services/${mockSingleServiceBody.id}`,
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleServiceBody,
        },
      }]);
      await services.getByIdentifier(mockSingleServiceBody.id, {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });

  await t.step('save() - Create/Update Service', async (t) => {
    await t.step('makes POST request for service creation (no id)', async () => {
      const newService = {
        targetName: 'New Service',
        description: 'A new test service',
        serviceType: 'APPLICATION' as const,
        serviceTier: 'BRONZE' as const,
        ownedBy: { targetName: 'Client Services' },
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/services',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: newService,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: {
            ...newService,
            id: 'new-service-id',
            recipientType: 'SERVICE',
            ownedBy: mockSingleServiceBody.ownedBy,
          },
        },
      }]);
      await services.save(newService);
    });

    await t.step('makes POST request for service update (with id)', async () => {
      const existingService = {
        id: 'existing-service-id',
        targetName: 'Updated Service Name',
        description: 'Updated description',
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/services',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: existingService,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { ...mockSingleServiceBody, ...existingService },
        },
      }]);
      await services.save(existingService);
    });

    await t.step('makes POST request with minimal service data for creation', async () => {
      const minimalService = {
        targetName: mockSingleServiceBody.targetName,
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/services',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: minimalService,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSingleServiceBody,
        },
      }]);
      await services.save(minimalService);
    });

    await t.step('makes POST request with custom headers', async () => {
      const newService = {
        targetName: mockSingleServiceBody.targetName,
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/services',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
          body: newService,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSingleServiceBody,
        },
      }]);
      await services.save(newService, {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });

  await t.step('delete() - Delete Service', async (t) => {
    await t.step('makes DELETE request with service ID', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: `https://test.xmatters.com/api/xm/1/services/${mockSingleServiceBody.id}`,
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleServiceBody,
        },
      }]);
      await services.delete(mockSingleServiceBody.id);
    });

    await t.step('makes DELETE request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: `https://test.xmatters.com/api/xm/1/services/${mockSingleServiceBody.id}`,
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleServiceBody,
        },
      }]);
      await services.delete(mockSingleServiceBody.id, {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });
});
