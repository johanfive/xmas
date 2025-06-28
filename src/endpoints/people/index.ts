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
import type { GetPersonParams, GetPersonsParams, GetPersonsResponse, Person } from './types.ts';

/**
 * Provides access to the people endpoints of the xMatters API.
 * Use this class to manage people, including listing, creating, updating, and deleting people.
 */
export class PersonsEndpoint {
  private readonly http: ResourceClient;

  constructor(http: RequestHandler) {
    this.http = new ResourceClient(http, '/people');
  }

  /**
   * Get a list of people from xMatters.
   * The results can be filtered and paginated using the options object.
   *
   * @param options Optional parameters including query filters, headers, and other request options
   * @returns The HTTP response containing a paginated list of people
   * @throws {XmApiError} If the request fails
   */
  get(
    options?: Omit<GetOptions, 'path'> & { path?: string; query?: GetPersonsParams },
  ): Promise<PaginatedHttpResponse<Person>> {
    return this.http.get<GetPersonsResponse>(options);
  }

  /**
   * Get a person by its ID or targetName.
   *
   * @param identifier The ID or targetName of the person to retrieve
   * @param options Optional request options including embed parameters and headers
   * @returns The HTTP response containing the person
   * @throws {XmApiError} If the request fails
   */
  getByIdentifier(
    identifier: string,
    options?: Omit<GetOptions, 'path'> & { query?: GetPersonParams },
  ): Promise<HttpResponse<Person>> {
    return this.http.get<Person>({ ...options, path: identifier });
  }

  /**
   * Create a new person or update an existing one
   *
   * @param person The person to create or update
   * @param overrides Optional request overrides like custom headers
   * @returns The HTTP response containing the created or updated person
   * @throws {XmApiError} If the request fails
   */
  save(
    person: Partial<Person>,
    overrides?: Omit<RequestWithBodyOptions, 'path'>,
  ): Promise<HttpResponse<Person>> {
    return this.http.post<Person>({ ...overrides, body: person });
  }

  /**
   * Delete a person by ID
   *
   * @param id The ID of the person to delete
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
