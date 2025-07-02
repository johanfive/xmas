import { ResourceClient } from '../../core/resource-client.ts';
import type { RequestHandler } from '../../core/request-handler.ts';
import type { HttpResponse } from '../../core/types/internal/http.ts';
import type {
  PaginatedHttpResponse,
  PaginatedResponse,
} from '../../core/types/endpoint/response.ts';
import type {
  DeleteOptions,
  GetOptions,
  RequestWithBodyOptions,
} from '../../core/types/internal/http-methods.ts';
import type { GetGroupParams, GetGroupsParams, Group, GroupQuotas } from './types.ts';
import type { Person } from '../people/types.ts';

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
    return this.http.get<PaginatedResponse<Group>>(options);
  }

  /**
   * Get a paginated list of supervisors for a group by its ID or targetName.
   *
   * @param groupId The ID or targetName of the group
   * @param options Optional request options (query, headers, etc)
   * @returns The HTTP response containing a paginated list of supervisors (Person objects)
   * @throws {XmApiError} If the request fails
   */
  getSupervisors(
    groupId: string,
    options?: Omit<GetOptions, 'path'>,
  ): Promise<PaginatedHttpResponse<Person>> {
    return this.http.get<PaginatedResponse<Person>>({ ...options, path: `${groupId}/supervisors` });
  }

  /**
   * Get a paginated list of recipients for a group by its ID or targetName.
   *
   * @param groupId The ID or targetName of the group
   * @param options Optional request options (query, headers, etc)
   * @returns The HTTP response containing a paginated list of recipients (Person objects)
   * @throws {XmApiError} If the request fails
   */
  getRecipients(
    groupId: string,
    options?: Omit<GetOptions, 'path'>,
  ): Promise<PaginatedHttpResponse<Person>> {
    return this.http.get<PaginatedResponse<Person>>({ ...options, path: `${groupId}/recipients` });
  }

  /**
   * Get the group license quotas for your company.
   *
   * @param options Optional request options (headers, etc)
   * @returns The HTTP response containing the group license quotas
   * @throws {XmApiError} If the request fails
   */
  getLicenseQuotas(options?: Omit<GetOptions, 'path'>): Promise<HttpResponse<GroupQuotas>> {
    return this.http.get<GroupQuotas>({ ...options, path: 'license-quotas' });
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
  delete(id: string, overrides?: Omit<DeleteOptions, 'path'>): Promise<HttpResponse<Group>> {
    return this.http.delete<Group>({ ...overrides, path: id });
  }
}
