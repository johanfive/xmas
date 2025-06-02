import { HttpHandler } from '../../core/http.ts';
import { GetGroupsParams, GetGroupsResponse } from './types.ts';

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
 * const groups = await xm.groups.getGroups();
 *
 * // Get groups with pagination
 * const pagedGroups = await xm.groups.getGroups({
 *   limit: 10,
 *   offset: 0
 * });
 *
 * // Search for groups
 * const searchedGroups = await xm.groups.getGroups({
 *   search: 'oncall'
 * });
 * ```
 */
export class GroupsEndpoint {
  /** Base path for all groups endpoints */
  private readonly basePath = '/groups';

  constructor(private readonly http: HttpHandler) {}

  /**
   * Get a list of groups from xMatters.
   * The results can be filtered and paginated using the params object.
   *
   * @param options.params Optional parameters to filter and paginate the results
   * @returns A paginated list of groups matching the filter criteria
   * @throws {XmApiError} If the request fails
   */
  getGroups(params?: GetGroupsParams): Promise<GetGroupsResponse> {
    return this.http.get<GetGroupsResponse>({
      path: this.basePath,
      query: params ? { ...params } : undefined,
    });
  }
}
