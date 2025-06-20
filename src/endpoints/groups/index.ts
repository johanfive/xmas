import { ResourceClient } from '../../core/resource-client.ts';
import type { RequestHandler } from '../../core/request-handler.ts';
import type { HttpResponse } from '../../core/types/internal/http.ts';
import type { HttpMethodBaseOptions } from '../../core/types/internal/http-methods.ts';
import type {
  EmptyHttpResponse,
  PaginatedHttpResponse,
} from '../../core/types/endpoint/response.ts';
import type { GetGroupsParams, GetGroupsResponse, Group } from './types.ts';

/**
 * Provides access to the groups endpoints of the xMatters API.
 * Use this class to manage groups, including listing, creating, updating, and deleting groups.
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
   * @param overrides Optional request overrides like custom headers
   * @returns The HTTP response containing a paginated list of groups
   * @throws {XmApiError} If the request fails
   */
  get(
    params?: GetGroupsParams,
    overrides?: Pick<HttpMethodBaseOptions, 'headers'>,
  ): Promise<PaginatedHttpResponse<Group>> {
    return this.http.get<GetGroupsResponse>({ ...overrides, query: params });
  }

  /**
   * Get a group by ID
   *
   * @param id The ID of the group to retrieve
   * @param overrides Optional request overrides like custom headers
   * @returns The HTTP response containing the group
   * @throws {XmApiError} If the request fails
   */
  getById(
    id: string,
    overrides?: Pick<HttpMethodBaseOptions, 'headers'>,
  ): Promise<HttpResponse<Group>> {
    return this.http.get<Group>({ ...overrides, path: id });
  }

  /**
   * Create a new group or update an existing one
   *
   * @param group The group to create or update
   * @param overrides Optional request overrides like custom headers
   * @returns The HTTP response containing the created or updated group
   * @throws {XmApiError} If the request fails
   */
  save(
    group: Partial<Group>,
    overrides?: Pick<HttpMethodBaseOptions, 'headers'>,
  ): Promise<HttpResponse<Group>> {
    return this.http.post<Group>({ ...overrides, body: group });
  }

  /**
   * Delete a group by ID
   *
   * @param id The ID of the group to delete
   * @param overrides Optional request overrides like custom headers
   * @returns The HTTP response
   * @throws {XmApiError} If the request fails
   */
  delete(
    id: string,
    overrides?: Pick<HttpMethodBaseOptions, 'headers'>,
  ): Promise<EmptyHttpResponse> {
    return this.http.delete<void>({ ...overrides, path: id });
  }
}
