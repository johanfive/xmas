import { assertEquals, assertThrows } from 'https://deno.land/std@0.193.0/testing/asserts.ts';
import { RequestBuilder } from './request-builder.ts';

Deno.test('RequestBuilder', async (t) => {
  const builder = new RequestBuilder('https://example.com', {
    'default-header': 'value',
  });

  await t.step('builds request with relative path', () => {
    const request = builder.build({
      path: '/people',
      method: 'GET',
      query: { search: 'test' },
    });

    assertEquals(request.url, 'https://example.com/api/xm/1/people?search=test');
    assertEquals(request.path, '/people');
    assertEquals(request.method, 'GET');
    assertEquals(request.headers?.['default-header'], 'value');
  });

  await t.step('builds request with external URL', () => {
    const request = builder.build({
      fullUrl: 'https://api.external-service.com/v2/endpoint',
      method: 'POST',
      query: { key: 'value' },
    });

    assertEquals(request.url, 'https://api.external-service.com/v2/endpoint?key=value');
    assertEquals(request.path, 'https://api.external-service.com/v2/endpoint');
    assertEquals(request.method, 'POST');
    assertEquals(request.headers?.['default-header'], 'value');
  });

  await t.step('preserves query parameters in external URLs', () => {
    const request = builder.build({
      fullUrl: 'https://api.external-service.com/search?existing=param',
      query: { additional: 'param' },
    });

    const url = new URL(request.url);
    assertEquals(url.searchParams.get('existing'), 'param');
    assertEquals(url.searchParams.get('additional'), 'param');
  });

  await t.step('throws when path does not start with slash', () => {
    assertThrows(
      () => builder.build({ path: 'people' }),
      Error,
      'Path must start with a forward slash',
    );
  });

  await t.step('throws when both path and fullUrl are provided', () => {
    assertThrows(
      () =>
        builder.build({
          path: '/people',
          fullUrl: 'https://api.external-service.com/v2/endpoint',
        }),
      Error,
      'Cannot specify both fullUrl and path',
    );
  });

  await t.step('throws when neither path nor fullUrl is provided', () => {
    assertThrows(
      () => builder.build({}),
      Error,
      'Either path or fullUrl must be provided',
    );
  });

  await t.step('merges headers correctly', () => {
    const request = builder.build({
      path: '/people',
      headers: {
        'custom-header': 'custom-value',
        'default-header': 'overridden-value', // Should override default
      },
    });

    assertEquals(request.headers?.['default-header'], 'overridden-value');
    assertEquals(request.headers?.['custom-header'], 'custom-value');
  });
});
