import { ResourceClient } from '../../core/resource-client.ts';
import type { RequestHandler } from '../../core/request-handler.ts';
import type { HttpResponse } from '../../core/types/internal/http.ts';
import type {
  DeleteOptions,
  GetOptions,
  RequestWithBodyOptions,
} from '../../core/types/internal/http-methods.ts';
import type {
  EmptyHttpResponse,
  PaginatedHttpResponse,
} from '../../core/types/endpoint/response.ts';
import type { GetGroupParams, GetGroupsParams, GetGroupsResponse, Group } from './types.ts';

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
   * The results can be filtered and paginated using the options object.
   *
   * @param options Optional parameters including query filters, headers, and other request options
   * @returns The HTTP response containing a paginated list of groups
   * @throws {XmApiError} If the request fails
   */
  get(
    options?: Omit<GetOptions, 'path'> & { path?: string; query?: GetGroupsParams },
  ): Promise<PaginatedHttpResponse<Group>> {
    return this.http.get<GetGroupsResponse>(options);
  }

  /**
   * Get a group by its ID or targetName.
   *
   * @param identifier The ID or targetName of the group to retrieve
   * @param options Optional request options including embed parameters and headers
   * @returns The HTTP response containing the group
   * @throws {XmApiError} If the request fails
   */
  getByIdentifier(
    identifier: string,
    options?: Omit<GetOptions, 'path'> & { query?: GetGroupParams },
  ): Promise<HttpResponse<Group>> {
    return this.http.get<Group>({ ...options, path: identifier });
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
    overrides?: Omit<RequestWithBodyOptions, 'path'>,
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
    overrides?: Omit<DeleteOptions, 'path'>,
  ): Promise<EmptyHttpResponse> {
    return this.http.delete<void>({ ...overrides, path: id });
  }
}
