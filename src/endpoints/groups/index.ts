import { ResourceClient } from '../../core/resource-client.ts';
import { RequestHandler } from '../../core/request-handler.ts';
import type { HttpResponse } from '../../core/types.ts';
import { GetGroupsParams, GetGroupsResponse, Group } from './types.ts';

/**
 * Provides access to the groups endpoints of the xMatters API.
 * Use this class to manage groups, including listing, creating, updating, and deleting groups.
 *
 * @example
 * ```typescript
 * const xm = new XmApi({
 *   baseUrl: 'https://example.xmatters.com',
 *   accessToken: 'your-token'
 * });
 *
 * // Get all groups
 * const { body: groups } = await xm.groups.getGroups();
 *
 * // Get groups with pagination
 * const { body: pagedGroups } = await xm.groups.getGroups({
 *   limit: 10,
 *   offset: 0
 * });
 *
 * // Search for groups
 * const { body: searchedGroups } = await xm.groups.getGroups({
 *   search: 'oncall'
 * });
 * ```
 */
export class GroupsEndpoint {
  private readonly http: ResourceClient;

  constructor(http: RequestHandler) {
    this.http = new ResourceClient(http, '/groups');
  }

  /**
   * Get a list of groups from xMatters.
   * The results can be filtered and paginated using the params object.
   *
   * @param params Optional parameters to filter and paginate the results
   * @returns The HTTP response containing a paginated list of groups
   * @throws {XmApiError} If the request fails
   */
  getGroups(params?: GetGroupsParams): Promise<HttpResponse<GetGroupsResponse>> {
    return this.http.get<GetGroupsResponse>({ query: params });
  }

  /**
   * Get a group by ID
   *
   * @param id The ID of the group to retrieve
   * @returns The HTTP response containing the group
   * @throws {XmApiError} If the request fails
   */
  getById(id: string): Promise<HttpResponse<Group>> {
    return this.http.get<Group>({ path: id });
  }

  /**
   * Create a new group or update an existing one
   *
   * @param group The group to create or update
   * @returns The HTTP response containing the created or updated group
   * @throws {XmApiError} If the request fails
   */
  save(group: Partial<Group>): Promise<HttpResponse<Group>> {
    return this.http.post<Group>({ body: group });
  }

  /**
   * Delete a group by ID
   *
   * @param id The ID of the group to delete
   * @returns The HTTP response
   * @throws {XmApiError} If the request fails
   */
  delete(id: string): Promise<HttpResponse<void>> {
    return this.http.delete<void>({ path: id });
  }
}
