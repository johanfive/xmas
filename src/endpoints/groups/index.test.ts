import {
  assertEquals,
  assertExists,
  assertObjectMatch,
} from "https://deno.land/std@0.193.0/testing/asserts.ts";
import { GroupsEndpoint } from "./index.ts";
import { GetGroupsResponse } from "./types.ts";
import { MockHttpHandler, createMockResponse } from "../../core/test-utils.ts";

const mockGroup = {
  id: "123",
  targetName: "Test Group",
  recipientType: "GROUP" as const,
  status: "ACTIVE" as const,
  groupType: "ON_CALL" as const,
  created: "2025-05-31T00:00:00Z",
  description: "Test group description",
  supervisors: ["user1"],
  externallyOwned: false,
  allowDuplicates: true,
  useDefaultDevices: true,
  observedByAll: true,
  links: {
    self: "/api/xm/1/groups/123"
  },
};

const mockGroupsResponse: GetGroupsResponse = {
  count: 1,
  total: 1,
  data: [mockGroup],
  links: {
    self: "https://example.com/api/xm/1/groups",
  },
};

Deno.test("GroupsEndpoint", async (t) => {
  await t.step("getGroups without parameters", async () => {
    const mockHttp = new MockHttpHandler(createMockResponse(mockGroupsResponse));
    const endpoint = new GroupsEndpoint(mockHttp);

    const response = await endpoint.getGroups();

    assertEquals(response, mockGroupsResponse);
    assertEquals(mockHttp.requests.length, 1);
    
    const request = mockHttp.requests[0];
    assertEquals(request.method, "GET");
    assertEquals(request.path, "/groups");
    assertEquals(request.query, undefined);
  });

  await t.step("getGroups with parameters", async () => {
    const mockHttp = new MockHttpHandler(createMockResponse(mockGroupsResponse));
    const endpoint = new GroupsEndpoint(mockHttp);
    
    const params = { limit: 10, offset: 0, search: "test" };
    const response = await endpoint.getGroups(params);

    assertEquals(response, mockGroupsResponse);
    assertEquals(mockHttp.requests.length, 1);
    
    const request = mockHttp.requests[0];
    assertEquals(request.method, "GET");
    assertEquals(request.path, "/groups");
    assertExists(request.query);
    assertObjectMatch(request.query, params);
  });

  await t.step("getGroups handles errors", async () => {
    const errorResponse = createMockResponse({ message: "Not Found" }, 404);
    const mockHttp = new MockHttpHandler(errorResponse);
    const endpoint = new GroupsEndpoint(mockHttp);

    try {
      await endpoint.getGroups();
      throw new Error("Expected error to be thrown");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error("Expected XmApiError but got: " + String(error));
      }
      assertEquals(error.name, "XmApiError");
      assertEquals(error.message, "Request failed with status 404");
      // Type assertion since we know it's an XmApiError
      const xmError = error as { response?: { status: number } };
      assertExists(xmError.response);
      assertEquals(xmError.response.status, 404);
    }
  });
});
