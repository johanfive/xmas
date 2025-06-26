import { expect } from 'std/expect/mod.ts';
import { validateConfig } from './config-validation.ts';
import { XmApiError } from '../errors.ts';

Deno.test('validateConfig', async (t) => {
  await t.step('Input Validation', async (t) => {
    await t.step('rejects null/undefined config', () => {
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(null)).toThrow(XmApiError);
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(null)).toThrow('Configuration object is required');
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(undefined)).toThrow(XmApiError);
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(undefined)).toThrow('Configuration object is required');
    });

    await t.step('rejects non-object config', () => {
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig('string')).toThrow(XmApiError);
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig('string')).toThrow('Expected object');
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(123)).toThrow(XmApiError);
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(123)).toThrow('Expected object');
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(true)).toThrow(XmApiError);
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(true)).toThrow('Expected object');
    });

    await t.step('rejects array config', () => {
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig([])).toThrow(XmApiError);
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig([])).toThrow('Expected object');
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(['test'])).toThrow(XmApiError);
      // @ts-ignore - Testing invalid input types
      expect(() => validateConfig(['test'])).toThrow('Expected object');
    });
  });

  await t.step('Hostname Validation', async (t) => {
    await t.step('rejects invalid hostname types', () => {
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ hostname: 123 })).toThrow(XmApiError);
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ hostname: 123 })).toThrow(
        'Invalid config: hostname must be a valid xMatters hostname (*.xmatters.com or *.xmatters.com.au)',
      );
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ hostname: null })).toThrow(XmApiError);
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ hostname: null })).toThrow(
        'Invalid config: hostname must be a valid xMatters hostname (*.xmatters.com or *.xmatters.com.au)',
      );
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ hostname: undefined })).toThrow(XmApiError);
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ hostname: undefined })).toThrow(
        'Invalid config: hostname must be a valid xMatters hostname (*.xmatters.com or *.xmatters.com.au)',
      );
    });

    await t.step('rejects empty hostname', () => {
      // @ts-ignore - Testing invalid configuration
      expect(() => validateConfig({ hostname: '' })).toThrow(XmApiError);
      // @ts-ignore - Testing invalid configuration
      expect(() => validateConfig({ hostname: '' })).toThrow(
        'Invalid config: hostname must be a valid xMatters hostname (*.xmatters.com or *.xmatters.com.au)',
      );
    });

    await t.step('rejects invalid xMatters hostnames', () => {
      const invalidHostnames = [
        'google.com',
        'example.org',
        'xmatters.com', // Missing subdomain
        'test.xmatters.co', // Wrong TLD
        'test.xmatters.net',
        'test.xmatters.com.uk', // Wrong country code
        'xmatters.com.au', // Missing subdomain
        'sub.domain.example.com',
        'localhost',
        '192.168.1.1',
        'test.xmatters.comm', // Typo in domain
        'testxmatters.com', // Missing dot before xmatters
      ];

      invalidHostnames.forEach((hostname) => {
        // @ts-ignore - Testing invalid configuration
        expect(() => validateConfig({ hostname })).toThrow(XmApiError);
        // @ts-ignore - Testing invalid configuration
        expect(() => validateConfig({ hostname })).toThrow(
          'Invalid config: hostname must be a valid xMatters hostname (*.xmatters.com or *.xmatters.com.au)',
        );
      });
    });

    await t.step('accepts valid xMatters hostnames', () => {
      const validHostnames = [
        'company.xmatters.com',
        'test.xmatters.com',
        'my-org.xmatters.com',
        'company.xmatters.com.au',
        'test.xmatters.com.au',
        'my-org.xmatters.com.au',
        'sub.domain.xmatters.com',
        'sub.domain.xmatters.com.au',
      ];

      validHostnames.forEach((hostname) => {
        // Need valid auth config to pass full validation
        const config = { hostname, username: 'user', password: 'pass' };
        expect(() => validateConfig(config)).not.toThrow();
      });
    });
  });

  await t.step('MaxRetries Validation', async (t) => {
    await t.step('rejects invalid maxRetries', () => {
      const baseConfig = { hostname: 'test.xmatters.com', username: 'user', password: 'pass' };
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ ...baseConfig, maxRetries: 'invalid' })).toThrow(XmApiError);
      // @ts-ignore - Testing invalid property types
      expect(() => validateConfig({ ...baseConfig, maxRetries: 'invalid' })).toThrow(
        'maxRetries must be a non-negative integer',
      );
      expect(() => validateConfig({ ...baseConfig, maxRetries: -1 })).toThrow(XmApiError);
      expect(() => validateConfig({ ...baseConfig, maxRetries: -1 })).toThrow(
        'maxRetries must be a non-negative integer',
      );
      expect(() => validateConfig({ ...baseConfig, maxRetries: 1.5 })).toThrow(XmApiError);
      expect(() => validateConfig({ ...baseConfig, maxRetries: 1.5 })).toThrow(
        'maxRetries must be a non-negative integer',
      );
    });

    await t.step('accepts valid maxRetries', () => {
      const baseConfig = { hostname: 'test.xmatters.com', username: 'user', password: 'pass' };
      expect(() => validateConfig({ ...baseConfig, maxRetries: 0 })).not.toThrow();
      expect(() => validateConfig({ ...baseConfig, maxRetries: 3 })).not.toThrow();
      expect(() => validateConfig({ ...baseConfig, maxRetries: 10 })).not.toThrow();
    });
  });

  await t.step('Authentication Validation', async (t) => {
    await t.step('General Auth Requirements', async (t) => {
      await t.step('rejects config with no auth method', () => {
        // @ts-ignore - Testing incomplete config
        const config = { hostname: 'test.xmatters.com' };
        // @ts-ignore - Testing incomplete config
        expect(() => validateConfig(config)).toThrow(XmApiError);
        // @ts-ignore - Testing incomplete config
        expect(() => validateConfig(config)).toThrow(
          'Must provide either basic auth credentials, authorization code, or OAuth tokens',
        );
      });

      await t.step('rejects config with multiple auth methods', () => {
        // @ts-ignore - Testing invalid config combination
        const config = {
          hostname: 'test.xmatters.com',
          username: 'user',
          password: 'pass',
          authorizationCode: 'code',
          clientId: 'client',
        };
        expect(() => validateConfig(config)).toThrow(XmApiError);
        expect(() => validateConfig(config)).toThrow(
          'Cannot mix basic auth, authorization code, and OAuth token fields',
        );
      });
    });

    await t.step('Basic Auth Validation', async (t) => {
      await t.step('rejects invalid basic auth credentials', () => {
        const baseConfig = { hostname: 'test.xmatters.com' };
        // Invalid username types
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: 123, password: 'pass' })).toThrow(
          XmApiError,
        );
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: 123, password: 'pass' })).toThrow(
          'username must be a non-empty string',
        );
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: null, password: 'pass' })).toThrow(
          XmApiError,
        );
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: null, password: 'pass' })).toThrow(
          'username must be a non-empty string',
        );
        // Empty username
        expect(() => validateConfig({ ...baseConfig, username: '', password: 'pass' })).toThrow(
          XmApiError,
        );
        expect(() => validateConfig({ ...baseConfig, username: '', password: 'pass' })).toThrow(
          'username must be a non-empty string',
        );
        // Invalid password types
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: 'user', password: 123 })).toThrow(
          XmApiError,
        );
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: 'user', password: 123 })).toThrow(
          'password must be a non-empty string',
        );
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: 'user', password: null })).toThrow(
          XmApiError,
        );
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, username: 'user', password: null })).toThrow(
          'password must be a non-empty string',
        );
        // Empty password
        expect(() => validateConfig({ ...baseConfig, username: 'user', password: '' })).toThrow(
          XmApiError,
        );
        expect(() => validateConfig({ ...baseConfig, username: 'user', password: '' })).toThrow(
          'password must be a non-empty string',
        );
      });

      await t.step('accepts valid basic auth', () => {
        const config = {
          hostname: 'test.xmatters.com',
          username: 'user',
          password: 'pass',
        };
        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    await t.step('Authorization Code Validation', async (t) => {
      await t.step('rejects invalid auth code configuration', () => {
        const baseConfig = { hostname: 'test.xmatters.com' };
        // Invalid authorizationCode types
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 123, clientId: 'client' }))
          .toThrow(XmApiError);
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 123, clientId: 'client' }))
          .toThrow('authorizationCode must be a non-empty string');

        // Empty authorizationCode
        expect(() => validateConfig({ ...baseConfig, authorizationCode: '', clientId: 'client' }))
          .toThrow(XmApiError);
        expect(() => validateConfig({ ...baseConfig, authorizationCode: '', clientId: 'client' }))
          .toThrow('authorizationCode must be a non-empty string');
        // Missing clientId
        // @ts-ignore - Testing incomplete config
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 'code' })).toThrow(
          XmApiError,
        );
        // @ts-ignore - Testing incomplete config
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 'code' })).toThrow(
          'clientId must be a non-empty string',
        );
        // Invalid clientId types
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 'code', clientId: 123 }))
          .toThrow(
            XmApiError,
          );
        // @ts-ignore - Testing invalid property types
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 'code', clientId: 123 }))
          .toThrow(
            'clientId must be a non-empty string',
          );
        // Empty clientId
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 'code', clientId: '' }))
          .toThrow(
            XmApiError,
          );
        expect(() => validateConfig({ ...baseConfig, authorizationCode: 'code', clientId: '' }))
          .toThrow(
            'clientId must be a non-empty string',
          );
        // Invalid clientSecret type (when provided)
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            authorizationCode: 'code',
            clientId: 'client',
            // @ts-ignore - Testing invalid property types
            clientSecret: 123,
          })
        ).toThrow(XmApiError);
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            authorizationCode: 'code',
            clientId: 'client',
            // @ts-ignore - Testing invalid property types
            clientSecret: 123,
          })
        ).toThrow('clientSecret must be a string');
      });

      await t.step('accepts valid auth code configuration', () => {
        const config = {
          hostname: 'test.xmatters.com',
          authorizationCode: 'code',
          clientId: 'client',
        };
        expect(() => validateConfig(config)).not.toThrow();
        // With optional clientSecret
        const configWithSecret = {
          ...config,
          clientSecret: 'secret',
        };
        expect(() => validateConfig(configWithSecret)).not.toThrow();
      });
    });

    await t.step('OAuth Tokens Validation', async (t) => {
      await t.step('rejects invalid OAuth token configuration', () => {
        const baseConfig = { hostname: 'test.xmatters.com' };
        // Invalid accessToken types
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            // @ts-ignore - Testing invalid property types
            accessToken: 123,
            refreshToken: 'refresh',
            clientId: 'client',
          })
        ).toThrow(XmApiError);
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            // @ts-ignore - Testing invalid property types
            accessToken: 123,
            refreshToken: 'refresh',
            clientId: 'client',
          })
        ).toThrow('accessToken must be a non-empty string');
        // Empty accessToken
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: '',
            refreshToken: 'refresh',
            clientId: 'client',
          })
        ).toThrow(XmApiError);
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: '',
            refreshToken: 'refresh',
            clientId: 'client',
          })
        ).toThrow('accessToken must be a non-empty string');
        // Invalid refreshToken types
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            // @ts-ignore - Testing invalid property types
            refreshToken: 123,
            clientId: 'client',
          })
        ).toThrow(XmApiError);
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            // @ts-ignore - Testing invalid property types
            refreshToken: 123,
            clientId: 'client',
          })
        ).toThrow('refreshToken must be a non-empty string');
        // Empty refreshToken
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            refreshToken: '',
            clientId: 'client',
          })
        ).toThrow(XmApiError);
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            refreshToken: '',
            clientId: 'client',
          })
        ).toThrow('refreshToken must be a non-empty string');
        // Missing clientId
        // @ts-ignore - Testing incomplete config
        expect(() =>
          // @ts-ignore - Testing incomplete config
          validateConfig({ ...baseConfig, accessToken: 'access', refreshToken: 'refresh' })
        )
          .toThrow(XmApiError);
        // @ts-ignore - Testing incomplete config
        expect(() =>
          // @ts-ignore - Testing incomplete config
          validateConfig({ ...baseConfig, accessToken: 'access', refreshToken: 'refresh' })
        )
          .toThrow('clientId must be a non-empty string');
        // Invalid clientId types
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            refreshToken: 'refresh',
            // @ts-ignore - Testing invalid property types
            clientId: 123,
          })
        ).toThrow(XmApiError);
        // @ts-ignore - Testing invalid property types
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            refreshToken: 'refresh',
            // @ts-ignore - Testing invalid property types
            clientId: 123,
          })
        ).toThrow('clientId must be a non-empty string');
        // Empty clientId
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            refreshToken: 'refresh',
            clientId: '',
          })
        ).toThrow(XmApiError);
        expect(() =>
          validateConfig({
            ...baseConfig,
            accessToken: 'access',
            refreshToken: 'refresh',
            clientId: '',
          })
        ).toThrow('clientId must be a non-empty string');
      });

      await t.step('accepts valid OAuth tokens configuration', () => {
        const config = {
          hostname: 'test.xmatters.com',
          accessToken: 'access',
          refreshToken: 'refresh',
          clientId: 'client',
        };
        expect(() => validateConfig(config)).not.toThrow();
      });
    });
  });

  await t.step('Edge Cases', async (t) => {
    await t.step('handles undefined optional fields', () => {
      // maxRetries undefined should be fine
      const config = {
        hostname: 'test.xmatters.com',
        username: 'user',
        password: 'pass',
        maxRetries: undefined,
      };
      expect(() => validateConfig(config)).not.toThrow();
      // clientSecret undefined should be fine
      const authCodeConfig = {
        hostname: 'test.xmatters.com',
        authorizationCode: 'code',
        clientId: 'client',
        clientSecret: undefined,
      };
      expect(() => validateConfig(authCodeConfig)).not.toThrow();
    });
  });
});
