import { ResourceClient } from '../../core/resource-client.ts';
import type {
  CreatePerson,
  GetPersonParams,
  GetPersonsParams,
  Person,
  UpdatePerson,
} from './types.ts';
import type { HttpResponse, PaginatedHttpResponse, PaginatedResponse } from 'types/http.ts';
import type { Options } from 'types/request-building-options.ts';
import type { RequestHandler } from '../../core/request-handler.ts';

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
    options?: Options & { query?: GetPersonsParams },
  ): Promise<PaginatedHttpResponse<Person>> {
    return this.http.get<PaginatedResponse<Person>>(options);
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
    options?: Options & { query?: GetPersonParams },
  ): Promise<HttpResponse<Person>> {
    return this.http.get<Person>({ ...options, path: identifier });
  }

  /**
   * Create a new person or update an existing one
   *
   * @param person The person to create or update
   * @param options Optional request options such as custom headers
   * @returns The HTTP response containing the created or updated person
   * @throws {XmApiError} If the request fails
   */
  save(
    person: CreatePerson | UpdatePerson,
    options?: Options,
  ): Promise<HttpResponse<Person>> {
    return this.http.post<Person>({ ...options, body: person });
  }

  /**
   * Delete a person by ID
   *
   * @param id The ID of the person to delete
   * @param options Optional request options such as custom headers
   * @returns The HTTP response
   * @throws {XmApiError} If the request fails
   */
  delete(
    id: string,
    options?: Options,
  ): Promise<HttpResponse<Person>> {
    return this.http.delete<Person>({ ...options, path: id });
  }
}
