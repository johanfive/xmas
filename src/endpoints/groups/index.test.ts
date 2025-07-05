import { GroupsEndpoint } from './index.ts';
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

const groups = new GroupsEndpoint(requestHandler);

const mockSingleGroupBody = {
  id: 'test-group-id',
  targetName: 'Test Group',
  recipientType: 'GROUP',
  status: 'ACTIVE',
  groupType: 'ON_CALL',
  created: '2025-01-01T00:00:00.000Z',
};

const mockPaginatedGroupsBody = {
  count: 1,
  total: 1,
  data: [mockSingleGroupBody],
  links: {
    self: '/api/xm/1/groups?limit=100&offset=0',
  },
};

Deno.test('GroupsEndpoint', async (t) => {
  await t.step('get() - List Groups', async (t) => {
    await t.step('makes GET request without parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedGroupsBody,
        },
      }]);
      await groups.get();
    });

    await t.step('makes GET request with query parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups?limit=10&status=ACTIVE',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedGroupsBody,
        },
      }]);
      await groups.get({
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
            'https://test.xmatters.com/api/xm/1/groups?search=admin+database&operand=AND&groupType=ON_CALL&embed=supervisors%2Cobservers&fields=NAME&sortBy=NAME&sortOrder=ASCENDING',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedGroupsBody,
        },
      }]);
      await groups.get({
        query: {
          search: 'admin database',
          operand: 'AND',
          groupType: 'ON_CALL',
          embed: ['supervisors', 'observers'],
          fields: 'NAME',
          sortBy: 'NAME',
          sortOrder: 'ASCENDING',
        },
      });
    });

    await t.step('makes GET request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedGroupsBody,
        },
      }]);
      await groups.get({
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
            'https://test.xmatters.com/api/xm/1/groups?members=user1%2Cuser2&sites=site1%2Csite2&supervisors=super1%2Csuper2',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockPaginatedGroupsBody,
        },
      }]);
      await groups.get({
        query: {
          members: ['user1', 'user2'],
          sites: ['site1', 'site2'],
          supervisors: ['super1', 'super2'],
        },
      });
    });
  });

  await t.step('getByIdentifier() - Get Single Group', async (t) => {
    await t.step('makes GET request with ID', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/test-group-id',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleGroupBody,
        },
      }]);
      await groups.getByIdentifier('test-group-id');
    });

    await t.step('makes GET request with targetName containing spaces', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/Oracle Administrators',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleGroupBody,
        },
      }]);
      await groups.getByIdentifier('Oracle Administrators');
    });

    await t.step('makes GET request with embed parameters', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url:
            'https://test.xmatters.com/api/xm/1/groups/test-group-id?embed=supervisors%2Cservices',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleGroupBody,
        },
      }]);
      await groups.getByIdentifier('test-group-id', {
        query: {
          embed: ['supervisors', 'services'],
        },
      });
    });

    await t.step('makes GET request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/test-group-id',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: mockSingleGroupBody,
        },
      }]);
      await groups.getByIdentifier('test-group-id', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });

  await t.step('save() - Create/Update Group', async (t) => {
    await t.step('makes POST request for group creation (no id)', async () => {
      const newGroup = {
        targetName: 'New Group',
        recipientType: 'GROUP',
        status: 'ACTIVE',
        groupType: 'ON_CALL',
        description: 'A new test group',
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: newGroup,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: { ...newGroup, id: 'new-group-id', created: '2025-01-01T00:00:00.000Z' },
        },
      }]);
      await groups.save(newGroup);
    });

    await t.step('makes POST request for group update (with id)', async () => {
      const existingGroup = {
        id: 'existing-group-id',
        targetName: 'Updated Group Name',
        recipientType: 'GROUP',
        status: 'ACTIVE',
        groupType: 'ON_CALL',
        description: 'Updated description',
        created: '2025-01-01T00:00:00.000Z',
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: existingGroup,
        },
        mockedResponse: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: existingGroup,
        },
      }]);
      await groups.save(existingGroup);
    });

    await t.step('makes POST request with minimal group data for creation', async () => {
      const minimalGroup = {
        targetName: mockSingleGroupBody.targetName,
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: minimalGroup,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSingleGroupBody,
        },
      }]);
      await groups.save(minimalGroup);
    });

    await t.step('makes POST request with custom headers', async () => {
      const newGroup = {
        targetName: mockSingleGroupBody.targetName,
        recipientType: mockSingleGroupBody.recipientType,
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
          body: newGroup,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSingleGroupBody,
        },
      }]);
      await groups.save(newGroup, {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    await t.step('makes POST request with dynamic group data', async () => {
      const dynamicGroup = {
        targetName: mockSingleGroupBody.targetName,
        groupType: 'DYNAMIC',
        criteria: {
          operand: 'OR',
          criterion: [{
            criterionType: 'BASIC_FIELD',
            field: 'USER_ID',
            operand: 'EQUALS',
            value: 'MIMTeam1',
          }],
        },
        supervisors: ['9bccb70b-ab35-4746-b9f5-fa6eca0b1450'],
      };
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          headers: TestConstants.BASIC_AUTH_HEADERS,
          body: dynamicGroup,
        },
        mockedResponse: {
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: mockSingleGroupBody,
        },
      }]);
      await groups.save(dynamicGroup);
    });
  });

  await t.step('delete() - Delete Group', async (t) => {
    await t.step('makes DELETE request with group ID', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: 'https://test.xmatters.com/api/xm/1/groups/test-group-id',
          headers: TestConstants.BASIC_AUTH_HEADERS,
        },
        mockedResponse: { status: 204 },
      }]);
      await groups.delete('test-group-id');
    });

    await t.step('makes DELETE request with custom headers', async () => {
      mockHttpClient.setReqRes([{
        expectedRequest: {
          method: 'DELETE',
          url: 'https://test.xmatters.com/api/xm/1/groups/test-group-id',
          headers: {
            ...TestConstants.BASIC_AUTH_HEADERS,
            'X-Custom-Header': 'custom-value',
          },
        },
        mockedResponse: { status: 204 },
      }]);
      await groups.delete('test-group-id', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });
});
