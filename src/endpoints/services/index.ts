import { ResourceClient } from 'core/resource-client.ts';
import type { CreateService, GetServicesParams, Service, UpdateService } from './types.ts';
import type { HttpResponse, PaginatedHttpResponse, PaginatedResponse } from 'types/http.ts';
import type { Options } from 'types/request-building-options.ts';
import type { RequestHandler } from 'core/request-handler.ts';

/**
 * Provides access to the services endpoints of the xMatters API.
 * Use this class to manage services, including listing, creating, updating, and deleting services.
 */
export class ServicesEndpoint {
  private readonly http: ResourceClient;

  constructor(http: RequestHandler) {
    this.http = new ResourceClient(http, '/services');
  }

  /**
   * Get a list of services from xMatters.
   * The results can be filtered and paginated using the options object.
   *
   * @param options Optional parameters including query filters, headers, and other request options
   * @returns The HTTP response containing a paginated list of services
   * @throws {XmApiError} If the request fails
   */
  get(
    options?: Options & { query?: GetServicesParams },
  ): Promise<PaginatedHttpResponse<Service>> {
    return this.http.get<PaginatedResponse<Service>>(options);
  }

  /**
   * Get a service by its ID or targetName.
   *
   * @param identifier The ID or targetName of the service to retrieve
   * @param options Optional request options including embed parameters and headers
   * @returns The HTTP response containing the service
   * @throws {XmApiError} If the request fails
   */
  getByIdentifier(
    identifier: string,
    options?: Options,
  ): Promise<HttpResponse<Service>> {
    return this.http.get<Service>({ ...options, path: identifier });
  }

  /**
   * Create a new service or update an existing one
   *
   * @param service The service to create or update
   * @param options Optional request options such as custom headers
   * @returns The HTTP response containing the created or updated service
   * @throws {XmApiError} If the request fails
   */
  save(
    service: CreateService | UpdateService,
    options?: Options,
  ): Promise<HttpResponse<Service>> {
    return this.http.post<Service>({ ...options, body: service });
  }

  /**
   * Delete a service by ID
   *
   * @param id The ID of the service to delete
   * @param options Optional request options such as custom headers
   * @returns The HTTP response
   * @throws {XmApiError} If the request fails
   */
  delete(id: string, options?: Options): Promise<HttpResponse<Service>> {
    return this.http.delete<Service>({ ...options, path: id });
  }
}
