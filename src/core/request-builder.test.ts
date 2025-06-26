import { expect } from 'std/expect/mod.ts';
import { RequestBuilder, type RequestBuildOptions } from './request-builder.ts';
import type { Headers } from './types/internal/http.ts';
import { XmApiError } from './errors.ts';

// Test helper to create RequestBuilder with standard configuration
function createRequestBuilderTestSetup(options: {
  hostname?: string;
  defaultHeaders?: Headers;
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

Deno.test('RequestBuilder', async (t) => {
  // Create shared builder instance for most tests
  const { builder } = createRequestBuilderTestSetup();

  await t.step('URL Construction', async (t) => {
    await t.step('builds request with relative path - verifies correct URL construction', () => {
      const request = builder.build({
        path: '/people',
        method: 'GET',
        query: { search: 'test', limit: 10 },
      });
      expect(request.url).toBe('https://example.xmatters.com/api/xm/1/people?search=test&limit=10');
      expect(request.method).toBe('GET');
      expect(request.headers?.['Content-Type']).toBe('application/json');
      expect(request.headers?.['Accept']).toBe('application/json');
      expect(request.headers?.['default-header']).toBe('default-value');
      expect(request.retryAttempt).toBe(0);
    });

    await t.step('builds request with external URL - bypasses API version path', () => {
      const request = builder.build({
        fullUrl: 'https://api.external-service.com/v2/endpoint',
        method: 'POST',
        query: { key: 'value' },
        headers: { 'Authorization': 'Bearer token' },
      });
      expect(request.url).toBe('https://api.external-service.com/v2/endpoint?key=value');
      expect(request.method).toBe('POST');
      expect(request.headers?.['Content-Type']).toBe('application/json');
      expect(request.headers?.['Accept']).toBe('application/json');
      expect(request.headers?.['Authorization']).toBe('Bearer token');
    });

    await t.step('preserves existing query parameters in external URLs', () => {
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
    });

    await t.step('works with custom hostname configuration', () => {
      // This test needs its own builder with custom hostname
      const { builder: customBuilder } = createRequestBuilderTestSetup({
        hostname: 'https://custom.xmatters.com',
      });
      const options: RequestBuildOptions = {
        path: '/notifications',
      };
      const request = customBuilder.build(options);
      expect(request.url).toBe('https://custom.xmatters.com/api/xm/1/notifications');
    });
  });

  await t.step('Header Management', async (t) => {
    await t.step('merges headers correctly - request headers override defaults', () => {
      const request = builder.build({
        path: '/groups',
        method: 'PUT',
        headers: {
          'custom-header': 'custom-value',
          'default-header': 'overridden-value', // Should override default
        },
        body: { name: 'test-group' },
      });
      expect(request.headers?.['Content-Type']).toBe('application/json');
      expect(request.headers?.['Accept']).toBe('application/json');
      expect(request.headers?.['default-header']).toBe('overridden-value'); // Overridden
      expect(request.headers?.['custom-header']).toBe('custom-value'); // Added
      expect(request.method).toBe('PUT');
      expect(request.body).toEqual({ name: 'test-group' });
    });

    await t.step('works with empty default headers', () => {
      // This test needs its own builder with empty default headers
      const { builder: emptyHeadersBuilder } = createRequestBuilderTestSetup({
        defaultHeaders: {},
      });
      const options: RequestBuildOptions = {
        path: '/sites',
        headers: { 'Custom-Header': 'value' },
      };
      const request = emptyHeadersBuilder.build(options);
      expect(request.headers).toEqual({ 'Custom-Header': 'value' });
    });
  });

  await t.step('Query Parameter Handling', async (t) => {
    await t.step('handles empty query object', () => {
      const options: RequestBuildOptions = {
        path: '/devices',
        query: {},
      };
      const request = builder.build(options);
      expect(request.url).toBe('https://example.xmatters.com/api/xm/1/devices');
    });

    await t.step('filters out null and undefined query parameters', () => {
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

    await t.step('handles array query parameters by joining with commas', () => {
      const options: RequestBuildOptions = {
        path: '/groups/123',
        query: {
          embed: ['supervisors', 'services', 'observers'],
          tags: ['urgent', 'critical'],
          single: 'value',
        },
      };
      const request = builder.build(options);
      const url = new URL(request.url);
      expect(url.searchParams.get('embed')).toBe('supervisors,services,observers');
      expect(url.searchParams.get('tags')).toBe('urgent,critical');
      expect(url.searchParams.get('single')).toBe('value');
    });

    await t.step('handles empty arrays gracefully', () => {
      const options: RequestBuildOptions = {
        path: '/groups',
        query: {
          embed: [],
          normal: 'value',
        },
      };
      const request = builder.build(options);
      const url = new URL(request.url);
      expect(url.searchParams.get('embed')).toBe('');
      expect(url.searchParams.get('normal')).toBe('value');
    });

    await t.step('handles mixed array types by converting to strings', () => {
      const options: RequestBuildOptions = {
        path: '/items',
        query: {
          ids: [1, 2, 3],
          flags: [true, false],
          mixed: ['string', 42, true],
        },
      };
      const request = builder.build(options);
      const url = new URL(request.url);
      expect(url.searchParams.get('ids')).toBe('1,2,3');
      expect(url.searchParams.get('flags')).toBe('true,false');
      expect(url.searchParams.get('mixed')).toBe('string,42,true');
    });
  });

  await t.step('Default Behavior', async (t) => {
    await t.step('defaults method to GET when not specified', () => {
      const options: RequestBuildOptions = {
        path: '/users',
      };
      const request = builder.build(options);
      expect(request.method).toBe('GET');
      expect(request.url).toBe('https://example.xmatters.com/api/xm/1/users');
    });

    await t.step('preserves retry attempt when provided', () => {
      const options: RequestBuildOptions = {
        path: '/shifts',
        retryAttempt: 2,
      };
      const request = builder.build(options);
      expect(request.retryAttempt).toBe(2);
    });
  });

  await t.step('Error Handling', async (t) => {
    await t.step('throws when path does not start with slash', () => {
      let thrownError: XmApiError | undefined;
      expect(() => {
        try {
          builder.build({ path: 'people' });
        } catch (e) {
          thrownError = e as XmApiError;
          throw e; // Re-throw for expect().toThrow()
        }
      }).toThrow();
      expect(thrownError).toBeInstanceOf(XmApiError);
      expect(thrownError?.message).toBe('Path must start with a forward slash, e.g. "/people"');
    });

    await t.step('throws when both path and fullUrl are provided', () => {
      let thrownError: XmApiError | undefined;
      expect(() => {
        try {
          builder.build({
            path: '/people',
            fullUrl: 'https://api.external-service.com/v2/endpoint',
          });
        } catch (e) {
          thrownError = e as XmApiError;
          throw e; // Re-throw for expect().toThrow()
        }
      }).toThrow();
      expect(thrownError).toBeInstanceOf(XmApiError);
      expect(thrownError?.message).toBe(
        'Cannot specify both fullUrl and path. Use fullUrl for external endpoints, path for xMatters API endpoints.',
      );
    });

    await t.step('throws when neither path nor fullUrl is provided', () => {
      let thrownError: XmApiError | undefined;
      expect(() => {
        try {
          builder.build({});
        } catch (e) {
          thrownError = e as XmApiError;
          throw e; // Re-throw for expect().toThrow()
        }
      }).toThrow();
      expect(thrownError).toBeInstanceOf(XmApiError);
      expect(thrownError?.message).toBe('Either path or fullUrl must be provided');
    });
  });

  await t.step('Integration Tests', async (t) => {
    await t.step('builds complex request with all options', () => {
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
      expect(request.method).toBe('PATCH');
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

    await t.step('verifies external URL is correctly passed to HTTP client', () => {
      // This test ensures that when using fullUrl, the complete external URL
      // (not just the path) is properly passed to the underlying HTTP client
      const request = builder.build({
        fullUrl: 'https://api.external-service.com/v2/endpoint',
        query: { test: 'param' },
      });
      // Verify the request.url contains the complete external URL with query params
      expect(request.url).toBe('https://api.external-service.com/v2/endpoint?test=param');
      // This ensures consumers using fullUrl to bypass xMatters API get the complete external URL
      expect(request.url).not.toContain('/api/xm/1'); // Should not contain API version
      expect(request.url).toContain('api.external-service.com'); // Should contain external domain
    });

    await t.step('verifies API path is correctly built with base URL', () => {
      // This test ensures that relative API paths are correctly combined with the base URL
      const request = builder.build({
        path: '/groups',
        query: { search: 'test' },
      });
      // Verify the request.url contains the complete API URL
      expect(request.url).toBe('https://example.xmatters.com/api/xm/1/groups?search=test');
      // This ensures regular API calls get the proper xMatters API URL structure
      expect(request.url).toContain('/api/xm/1'); // Should contain API version
      expect(request.url).toContain('example.xmatters.com'); // Should contain configured hostname
    });
  });
});
