import { expect } from 'https://deno.land/std@0.224.0/expect/mod.ts';
import { RequestBuilder, RequestBuildOptions } from './request-builder.ts';

// Test helper to create RequestBuilder with standard configuration
function createRequestBuilderTestSetup(options: {
  hostname?: string;
  defaultHeaders?: Record<string, string>;
} = {}) {
  const {
    hostname = 'https://example.xmatters.com',
    defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'default-header': 'default-value',
    },
  } = options;

  const builder = new RequestBuilder(hostname, defaultHeaders);

  return { builder };
}

// Mock data for tests
const mockRelativePathOptions: RequestBuildOptions = {
  path: '/people',
  method: 'GET',
  query: { search: 'test', limit: 10 },
};

const mockExternalUrlOptions: RequestBuildOptions = {
  fullUrl: 'https://api.external-service.com/v2/endpoint',
  method: 'POST',
  query: { key: 'value' },
  headers: { 'Authorization': 'Bearer token' },
};

const mockCustomHeadersOptions: RequestBuildOptions = {
  path: '/groups',
  method: 'PUT',
  headers: {
    'custom-header': 'custom-value',
    'default-header': 'overridden-value', // Should override default
  },
  body: { name: 'test-group' },
};

Deno.test('RequestBuilder', async (t) => {
  await t.step('builds request with relative path - verifies correct URL construction', () => {
    const { builder } = createRequestBuilderTestSetup();
    const request = builder.build(mockRelativePathOptions);
    expect(request.url).toBe('https://example.xmatters.com/api/xm/1/people?search=test&limit=10');
    expect(request.path).toBe('/people');
    expect(request.method).toBe('GET');
    expect(request.headers?.['Content-Type']).toBe('application/json');
    expect(request.headers?.['Accept']).toBe('application/json');
    expect(request.headers?.['default-header']).toBe('default-value');
    expect(request.query).toEqual({ search: 'test', limit: 10 });
    expect(request.retryAttempt).toBe(0);
  });

  await t.step('builds request with external URL - bypasses API version path', () => {
    const { builder } = createRequestBuilderTestSetup();
    const request = builder.build(mockExternalUrlOptions);
    expect(request.url).toBe('https://api.external-service.com/v2/endpoint?key=value');
    expect(request.path).toBe('https://api.external-service.com/v2/endpoint');
    expect(request.method).toBe('POST');
    expect(request.headers?.['Content-Type']).toBe('application/json');
    expect(request.headers?.['Accept']).toBe('application/json');
    expect(request.headers?.['Authorization']).toBe('Bearer token');
    expect(request.query).toEqual({ key: 'value' });
  });

  await t.step('preserves existing query parameters in external URLs', () => {
    const { builder } = createRequestBuilderTestSetup();
    const options: RequestBuildOptions = {
      fullUrl: 'https://api.external-service.com/search?existing=param&another=value',
      query: { additional: 'param', new: 'value' },
    };
    const request = builder.build(options);
    const url = new URL(request.url);
    expect(url.searchParams.get('existing')).toBe('param');
    expect(url.searchParams.get('another')).toBe('value');
    expect(url.searchParams.get('additional')).toBe('param');
    expect(url.searchParams.get('new')).toBe('value');
    expect(request.path).toBe(
      'https://api.external-service.com/search?existing=param&another=value',
    );
  });

  await t.step('merges headers correctly - request headers override defaults', () => {
    const { builder } = createRequestBuilderTestSetup();
    const request = builder.build(mockCustomHeadersOptions);
    expect(request.headers?.['Content-Type']).toBe('application/json');
    expect(request.headers?.['Accept']).toBe('application/json');
    expect(request.headers?.['default-header']).toBe('overridden-value'); // Overridden
    expect(request.headers?.['custom-header']).toBe('custom-value'); // Added
    expect(request.method).toBe('PUT');
    expect(request.body).toEqual({ name: 'test-group' });
  });

  await t.step('defaults method to GET when not specified', () => {
    const { builder } = createRequestBuilderTestSetup();
    const options: RequestBuildOptions = {
      path: '/users',
    };
    const request = builder.build(options);
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/users');
    expect(request.url).toBe('https://example.xmatters.com/api/xm/1/users');
  });

  await t.step('handles empty query object', () => {
    const { builder } = createRequestBuilderTestSetup();
    const options: RequestBuildOptions = {
      path: '/devices',
      query: {},
    };
    const request = builder.build(options);
    expect(request.url).toBe('https://example.xmatters.com/api/xm/1/devices');
    expect(request.query).toEqual({});
  });

  await t.step('filters out null and undefined query parameters', () => {
    const { builder } = createRequestBuilderTestSetup();
    const options: RequestBuildOptions = {
      path: '/events',
      query: {
        status: 'active',
        priority: null,
        assignee: undefined,
        limit: 25,
      },
    };
    const request = builder.build(options);
    const url = new URL(request.url);
    expect(url.searchParams.get('status')).toBe('active');
    expect(url.searchParams.get('limit')).toBe('25');
    expect(url.searchParams.has('priority')).toBe(false);
    expect(url.searchParams.has('assignee')).toBe(false);
  });

  await t.step('works with custom hostname configuration', () => {
    const { builder } = createRequestBuilderTestSetup({
      hostname: 'https://custom.xmatters.com',
    });
    const options: RequestBuildOptions = {
      path: '/notifications',
    };
    const request = builder.build(options);
    expect(request.url).toBe('https://custom.xmatters.com/api/xm/1/notifications');
    expect(request.path).toBe('/notifications');
  });

  await t.step('works with empty default headers', () => {
    const { builder } = createRequestBuilderTestSetup({
      defaultHeaders: {},
    });
    const options: RequestBuildOptions = {
      path: '/sites',
      headers: { 'Custom-Header': 'value' },
    };
    const request = builder.build(options);
    expect(request.headers).toEqual({ 'Custom-Header': 'value' });
  });

  await t.step('preserves retry attempt when provided', () => {
    const { builder } = createRequestBuilderTestSetup();
    const options: RequestBuildOptions = {
      path: '/shifts',
      retryAttempt: 2,
    };
    const request = builder.build(options);
    expect(request.retryAttempt).toBe(2);
  });

  await t.step('Error handling - throws when path does not start with slash', () => {
    const { builder } = createRequestBuilderTestSetup();
    let thrownError: unknown;
    try {
      builder.build({ path: 'people' });
    } catch (error) {
      thrownError = error;
    }
    expect(thrownError).toBeInstanceOf(Error);
    const error = thrownError as Error;
    expect(error.message).toBe('Path must start with a forward slash, e.g. "/people"');
  });

  await t.step('Error handling - throws when both path and fullUrl are provided', () => {
    const { builder } = createRequestBuilderTestSetup();
    let thrownError: unknown;
    try {
      builder.build({
        path: '/people',
        fullUrl: 'https://api.external-service.com/v2/endpoint',
      });
    } catch (error) {
      thrownError = error;
    }
    expect(thrownError).toBeInstanceOf(Error);
    const error = thrownError as Error;
    expect(error.message).toBe(
      'Cannot specify both fullUrl and path. Use fullUrl for external endpoints, path for xMatters API endpoints.',
    );
  });

  await t.step('Error handling - throws when neither path nor fullUrl is provided', () => {
    const { builder } = createRequestBuilderTestSetup();
    let thrownError: unknown;
    try {
      builder.build({});
    } catch (error) {
      thrownError = error;
    }
    expect(thrownError).toBeInstanceOf(Error);
    const error = thrownError as Error;
    expect(error.message).toBe('Either path or fullUrl must be provided');
  });

  await t.step('builds complex request with all options', () => {
    const { builder } = createRequestBuilderTestSetup();
    const complexOptions: RequestBuildOptions = {
      path: '/forms/abc123/submissions',
      method: 'PATCH',
      query: {
        status: 'pending',
        priority: 'high',
        assignee: 'user123',
      },
      headers: {
        'Authorization': 'Bearer access-token',
        'X-Custom-Header': 'custom-value',
        'Content-Type': 'application/vnd.api+json', // Override default
      },
      body: {
        data: {
          type: 'form-submission',
          attributes: {
            status: 'reviewed',
            comments: 'Looks good',
          },
        },
      },
      retryAttempt: 1,
    };
    const request = builder.build(complexOptions);
    expect(request.url).toBe(
      'https://example.xmatters.com/api/xm/1/forms/abc123/submissions?status=pending&priority=high&assignee=user123',
    );
    expect(request.path).toBe('/forms/abc123/submissions');
    expect(request.method).toBe('PATCH');
    expect(request.query).toEqual({
      status: 'pending',
      priority: 'high',
      assignee: 'user123',
    });
    expect(request.headers?.['Authorization']).toBe('Bearer access-token');
    expect(request.headers?.['X-Custom-Header']).toBe('custom-value');
    expect(request.headers?.['Content-Type']).toBe('application/vnd.api+json');
    expect(request.headers?.['Accept']).toBe('application/json');
    expect(request.headers?.['default-header']).toBe('default-value');
    expect(request.body).toEqual({
      data: {
        type: 'form-submission',
        attributes: {
          status: 'reviewed',
          comments: 'Looks good',
        },
      },
    });
    expect(request.retryAttempt).toBe(1);
  });
});
