# Endpoint Implementation Patterns

This guide shows the recommended patterns for implementing new endpoints in the xMatters API library.

## Directory Structure

Each endpoint should be implemented in its own directory under `src/endpoints/`:

```
src/endpoints/my-endpoint/
├── index.ts        # Endpoint implementation
├── types.ts        # Type definitions
└── index.test.ts   # Unit tests
```

## Type Definitions (`types.ts`)

Follow this pattern for defining endpoint types:

```typescript
import { PaginatedResponse } from '../../core/types/endpoint/response.ts';
import { WithPagination, WithSearch, WithSort } from '../../core/types/endpoint/composers.ts';

/**
 * 1. Define your main resource type
 */
export interface MyResource {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created: string;
  // ...other properties
}

/**
 * 2. Define endpoint-specific filters (if needed)
 * Filters are query parameters that narrow down results beyond pagination and search.
 * Only add if your endpoint supports filtering by specific field values.
 */
export interface MyResourceFilters extends Record<string, unknown> {
  status?: 'ACTIVE' | 'INACTIVE';
  category?: string;
}

/**
 * 3. Compose parameter types using composers
 */
export type GetMyResourcesParams = WithPagination<WithSearch<WithSort<MyResourceFilters>>>;

/**
 * 4. Define response body types for maintainers to use (if using paginated responses)
 * This represents what the API returns. Use as the generic type parameter for this.http.get<T>.
 * Not to be confused with the consumer-facing method return type
 * which should be Promise<PaginatedHttpResponse<Resource>>.
 */
export type GetMyResourcesResponse = PaginatedResponse<MyResource>;
```

## Endpoint Implementation (`index.ts`)

Follow this pattern for implementing the endpoint class:

```typescript
import { ResourceClient } from '../../core/resource-client.ts';
import { RequestHandler } from '../../core/request-handler.ts';
import type { HttpResponse } from '../../core/types/internal/http.ts';
import type {
  EmptyHttpResponse,
  PaginatedHttpResponse,
  PaginatedResponse,
} from '../../core/types/endpoint/response.ts';
import { GetMyResourcesParams, GetMyResourcesResponse, MyResource } from './types.ts';

/**
 * Provides access to the my-resources endpoints of the xMatters API.
 * Use this class to manage resources, including listing, creating, updating, and deleting.
 * 
 * @example
 * ```typescript
 * const xm = new XmApi({
 *   hostname: 'https://example.xmatters.com',
 *   accessToken: 'your-token'
 * });
 * 
 * // Get all resources
 * const { body: resources } = await xm.myResources.getMyResources();
 * 
 * // Get resources with pagination
 * const { body: pagedResources } = await xm.myResources.getMyResources({
 *   limit: 10,
 *   offset: 0
 * });
 * 
 * // Search for resources
 * const { body: searchedResources } = await xm.myResources.getMyResources({
 *   search: 'keyword'
 * });
 * ```
 */
export class MyResourcesEndpoint {
  private readonly http: ResourceClient;

  constructor(http: RequestHandler) {
    // The base path will be automatically prepended to all requests
    this.http = new ResourceClient(http, '/my-resources');
  }

  /**
   * Get a list of resources from xMatters.
   * The results can be filtered and paginated using the params object.
   *
   * @param params Optional parameters to filter and paginate the results
   * @returns The HTTP response containing a paginated list of resources
   * @throws {XmApiError} If the request fails
   */
  getMyResources(params?: GetMyResourcesParams): Promise<PaginatedHttpResponse<MyResource>> {
    return this.http.get<GetMyResourcesResponse>({ query: params });
  }

  /**
   * Get a resource by ID
   *
   * @param id The ID of the resource to retrieve
   * @returns The HTTP response containing the resource
   * @throws {XmApiError} If the request fails
   */
  getById(id: string): Promise<HttpResponse<MyResource>> {
    return this.http.get<MyResource>({ path: id });
  }

  /**
   * Create a new resource or update an existing one
   *
   * @param resource The resource data to create or update
   * @returns The HTTP response containing the created or updated resource
   * @throws {XmApiError} If the request fails
   */
  save(resource: Partial<MyResource>): Promise<HttpResponse<MyResource>> {
    return this.http.post<MyResource>({ body: resource });
  }

  /**
   * Delete a resource by ID
   *
   * @param id The ID of the resource to delete
   * @returns The HTTP response
   * @throws {XmApiError} If the request fails
   */
  delete(id: string): Promise<EmptyHttpResponse> {
    return this.http.delete<void>({ path: id });
  }
}
```

## Adding to Main API Class

Don't forget to add your new endpoint to the main `XmApi` class:

```typescript
// In src/index.ts
import { MyResourcesEndpoint } from './endpoints/my-resources/index.ts';

export class XmApi {
  /** HTTP handler that manages all API requests */
  private readonly http: RequestHandler;

  /** Access groups-related endpoints */
  public readonly groups: GroupsEndpoint;
  
  /** Access my-resources-related endpoints */
  public readonly myResources: MyResourcesEndpoint;

  constructor(options: XmApiOptions) {
    // ...existing code...

    // Initialize endpoints
    this.groups = new GroupsEndpoint(this.http);
    this.myResources = new MyResourcesEndpoint(this.http); // Add this line
  }
}

// Also export the types
export * from './endpoints/my-resources/types.ts';
```

## Key Benefits of This Pattern

1. **Consistent Return Types**: All methods return `Promise<HttpResponse<T>>` for predictable handling
2. **Type Safety**: Full TypeScript support with proper generics
3. **Reusable Components**: Use type composers for common patterns (pagination, search, etc.)
4. **Easy Testing**: MockRequestHandler provides consistent testing patterns
5. **Automatic Path Management**: ResourceClient handles base path automatically
6. **Comprehensive Documentation**: Clear JSDoc comments for all methods
7. **Zero Dependencies**: Uses only Deno standard library and internal utilities

## Response Type Guidelines

- **Paginated responses**: Use `PaginatedHttpResponse<T>` - provides semantic meaning for lists
- **Single resources**: Use `HttpResponse<T>` directly - clear and explicit
- **Empty responses**: Use `EmptyHttpResponse` - adds semantic meaning for void operations

## Response Type Examples

### For Consumers

```typescript
// Get groups with full HTTP response access
const response = await xm.groups.getGroups({ limit: 10 });

// Access response metadata
console.log('Status:', response.status);
console.log('Headers:', response.headers);

// Access response body
console.log('Total groups:', response.body.total);
response.body.data.forEach(group => {
  console.log('Group:', group.targetName);
});
```

### For Error Handling

```typescript
try {
  const response = await xm.groups.getGroups();
  // Handle success
} catch (error) {
  if (error instanceof XmApiError) {
    console.log('Error message:', error.message);
    if (error.response) {
      console.log('HTTP status:', error.response.status);
      console.log('Response body:', error.response.body);
    }
  }
}
```

## Testing Patterns

The library uses `MockRequestHandler` for consistent testing:

```typescript
// Create mock response
const mockResponse = createMockResponse({
  body: { /* your response data */ },
  status: 200,
  headers: { 'content-type': 'application/json' }
});

// Create mock HTTP handler
const mockHttp = new MockRequestHandler(mockResponse);
const endpoint = new MyResourcesEndpoint(mockHttp);

// Call endpoint method
const response = await endpoint.getMyResources();

// Assert on response
assertEquals(response.body, expectedBody);

// Assert on request that was made
const request = mockHttp.requests[0];
assertEquals(request.method, 'GET');
assertEquals(request.path, '/my-resources');
```

This pattern ensures consistency across all endpoints while maintaining flexibility for consumers to access both response data and HTTP metadata when needed.
