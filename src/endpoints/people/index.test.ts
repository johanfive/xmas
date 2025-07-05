import { MockHttpClient, MockLogger, TestConstants } from '../../core/test-utils.ts';
import { PersonsEndpoint } from './index.ts';
import { RequestHandler } from '../../core/request-handler.ts';

// Shared test infrastructure - MockHttpClient auto-resets between tests
const mockHttpClient = new MockHttpClient();
const mockLogger = new MockLogger();

const requestHandler = new RequestHandler({
  httpClient: mockHttpClient,
  logger: mockLogger,
  ...TestConstants.BASIC_CONFIG,
});

const people = new PersonsEndpoint(requestHandler);

const mockSinglePersonBody = {
  id: 'test-person-id',
  targetName: 'jsmith',
  recipientType: 'PERSON',
  status: 'ACTIVE',
  firstName: 'John',
  lastName: 'Smith',
  language: 'en',
  timezone: 'US/Eastern',
  webLogin: 'jsmith',
  externallyOwned: false,
  site: {
    id: 'site-id',
    name: 'Default Site',
    links: {
      self: '/api/xm/1/sites/site-id',
    },
  },
  licenseType: 'FULL_USER',
  links: {
    self: '/api/xm/1/people/test-person-id',
  },
};

const mockPaginatedPeopleBody = {
  count: 1,
  total: 1,
  data: [mockSinglePersonBody],
  links: {
    self: '/api/xm/1/people?limit=100&offset=0',
  },
};

Deno.test('PersonsEndpoint', async (t) => {
  await t.step('get() - List People', async (t) => {
    await t.step('makes GET request without parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/people',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedPeopleBody,
        },
      }]);
      await people.get();
    });

    await t.step('makes GET request with query parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/people?limit=10&status=ACTIVE',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedPeopleBody,
        },
      }]);
      await people.get({
        query: {
          limit: 10,
          status: 'ACTIVE',
        },
      });
    });

    await t.step('makes GET request with complex query parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url:
            'https://test.xmatters.com/api/xm/1/people?search=john+smith&fields=FIRST_NAME%2CLAST_NAME&licenseType=FULL_USER&embed=roles%2Cdevices&sortBy=FIRST_LAST_NAME&sortOrder=ASCENDING',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedPeopleBody,
        },
      }]);
      await people.get({
        query: {
          search: 'john smith',
          fields: ['FIRST_NAME', 'LAST_NAME'],
          licenseType: 'FULL_USER',
          embed: ['roles', 'devices'],
          sortBy: 'FIRST_LAST_NAME',
          sortOrder: 'ASCENDING',
        },
      });
    });

    await t.step('makes GET request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/people',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedPeopleBody,
        },
      }]);
      await people.get({
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    await t.step('makes GET request with array parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url:
            'https://test.xmatters.com/api/xm/1/people?groups=group1%2Cgroup2&site=site1%2Csite2&supervisors=super1%2Csuper2',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedPeopleBody,
        },
      }]);
      await people.get({
        query: {
          groups: ['group1', 'group2'],
          site: ['site1', 'site2'],
          supervisors: ['super1', 'super2'],
        },
      });
    });

    await t.step('makes GET request with device filter parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url:
            'https://test.xmatters.com/api/xm/1/people?devices.exists=true&devices.email.exists=true&devices.status=ACTIVE',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedPeopleBody,
        },
      }]);
      await people.get({
        query: {
          'devices.exists': true,
          'devices.email.exists': true,
          'devices.status': 'ACTIVE',
        },
      });
    });

    await t.step('makes GET request with property filter parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url:
            'https://test.xmatters.com/api/xm/1/people?propertyNames=department%2Clocation&propertyValues=IT%2CNYC',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedPeopleBody,
        },
      }]);
      await people.get({
        query: {
          propertyNames: ['department', 'location'],
          propertyValues: ['IT', 'NYC'],
        },
      });
    });
  });

  await t.step('getByIdentifier() - Get Single Person', async (t) => {
    await t.step('makes GET request with ID', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/people/test-person-id',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSinglePersonBody,
        },
      }]);
      await people.getByIdentifier('test-person-id');
    });

    await t.step('makes GET request with targetName containing special characters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/people/john.smith@example.com',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSinglePersonBody,
        },
      }]);
      await people.getByIdentifier('john.smith@example.com');
    });

    await t.step('makes GET request with embed parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/people/test-person-id?embed=roles%2Cdevices',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSinglePersonBody,
        },
      }]);
      await people.getByIdentifier('test-person-id', {
        query: {
          embed: ['roles', 'devices'],
        },
      });
    });

    await t.step('makes GET request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/people/test-person-id',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSinglePersonBody,
        },
      }]);
      await people.getByIdentifier('test-person-id', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });

  await t.step('save() - Create/Update Person', async (t) => {
    await t.step('makes POST request for person creation (no id)', async () => {
      const newPerson = {
        targetName: 'newuser',
        firstName: 'New',
        lastName: 'User',
        recipientType: 'PERSON',
        status: 'ACTIVE',
        language: 'en',
        timezone: 'US/Eastern',
        webLogin: 'newuser',
        site: {
          id: 'site-id',
          name: 'Default Site',
          links: {
            self: '/api/xm/1/sites/site-id',
          },
        },
        roles: ['STANDARD_USER'],
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/people',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: newPerson,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: { ...newPerson, id: 'new-person-id', externallyOwned: false },
        },
      }]);
      await people.save(newPerson);
    });

    await t.step('makes POST request for person update (with id)', async () => {
      const existingPerson = {
        id: 'existing-person-id',
        targetName: 'jsmith',
        firstName: 'John',
        lastName: 'Smith Updated',
        recipientType: 'PERSON',
        status: 'ACTIVE',
        language: 'en',
        timezone: 'US/Pacific',
        webLogin: 'jsmith',
        externallyOwned: false,
        site: {
          id: 'site-id',
          name: 'Default Site',
          links: {
            self: '/api/xm/1/sites/site-id',
          },
        },
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/people',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: existingPerson,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: existingPerson,
        },
      }]);
      await people.save(existingPerson);
    });

    await t.step('makes POST request with minimal person data for creation', async () => {
      const minimalPerson = {
        targetName: mockSinglePersonBody.targetName,
        firstName: mockSinglePersonBody.firstName,
        lastName: mockSinglePersonBody.lastName,
        roles: ['STANDARD_USER'],
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/people',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: minimalPerson,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSinglePersonBody,
        },
      }]);
      await people.save(minimalPerson);
    });

    await t.step('makes POST request with custom headers', async () => {
      const newPerson = {
        targetName: mockSinglePersonBody.targetName,
        firstName: mockSinglePersonBody.firstName,
        lastName: mockSinglePersonBody.lastName,
        recipientType: mockSinglePersonBody.recipientType,
        roles: ['STANDARD_USER'],
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/people',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
          body: newPerson,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSinglePersonBody,
        },
      }]);
      await people.save(newPerson, {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    await t.step('makes POST request with person properties', async () => {
      const personWithProperties = {
        targetName: mockSinglePersonBody.targetName,
        firstName: mockSinglePersonBody.firstName,
        lastName: mockSinglePersonBody.lastName,
        roles: ['STANDARD_USER'],
        properties: {
          department: 'Engineering',
          location: 'New York',
          employeeId: '12345',
        },
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/people',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: personWithProperties,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSinglePersonBody,
        },
      }]);
      await people.save(personWithProperties);
    });
  });

  await t.step('delete() - Delete Person', async (t) => {
    await t.step('makes DELETE request with person ID', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: 'https://test.xmatters.com/api/xm/1/people/test-person-id',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: { status: 204 },
      }]);
      await people.delete('test-person-id');
    });

    await t.step('makes DELETE request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: 'https://test.xmatters.com/api/xm/1/people/test-person-id',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: { status: 204 },
      }]);
      await people.delete('test-person-id', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });
});
