# xM API SDK JS

`xmas` for short 🎄

A TypeScript/JavaScript library for interacting with the xMatt// xmApi will now automatically use OAuth tokens for all subsequent requests
const groups = await xmApi.groups.get();
```

The library will automatically start using the OAuth tokens and purge the username & password from memory for security.PI.

- 🎄 **Zero dependencies** - Uses only native fetch API
- 🔒 **Multiple auth methods** - Basic auth, OAuth, and authorization code flow
- 🔧 **Dependency injection** - Bring your own HTTP client and logger
- 📝 **Full TypeScript support** - Complete type safety and IntelliSense
- 🔄 **Automatic token refresh** - Handles OAuth token lifecycle

# Usage

## Basic Authentication

For simple username/password authentication:

```ts
import { XmApi } from '@johanfive/xmas';

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
};

const xmApi = new XmApi(config);

// Create a new group in your xMatters instance:
const group = { targetName: 'API developers' };
const response = await xmApi.groups.save(group);

// Access the HTTP response details:
console.log('Status:', response.status);
console.log('Headers:', response.headers);
console.log('Created group:', response.body);

// Get groups with pagination:
const groupsResponse = await xmApi.groups.get({ 
  query: { offset: 5, limit: 10 } 
});
console.log('Total groups:', groupsResponse.body.total);
groupsResponse.body.data.forEach((group) => {
  console.log('Group:', group.targetName);
});
```

## OAuth Configuration

If you already have OAuth tokens:

```ts
const config = {
  hostname: 'https://yourOrg.xmatters.com',
  accessToken: 'eyJ123...',
  refreshToken: 'eyJ456...',
  clientId: 'your-client-id',
};

const xmApi = new XmApi(config);
```

## Authorization Code Flow

If you have an authorization code from the OAuth flow:

```ts
const config = {
  hostname: 'https://yourOrg.xmatters.com',
  authorizationCode: 'auth_code_from_callback',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret', // Optional for enhanced security
};

const xmApi = new XmApi(config);
// Obtain tokens before making API calls
await xmApi.oauth.obtainTokens();
```

## Obtain OAuth tokens with basic auth

```ts
import { XmApi } from '@johanfive/xmas';

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
  onTokenRefresh: (accessToken, refreshToken) => {
    // Save tokens when they're obtained/refreshed
    saveTokensToDatabase({ accessToken, refreshToken });
  },
};

const xmApi = new XmApi(config);
// Obtain tokens and automatically transition to OAuth
await xmApi.oauth.obtainTokens({ 
  clientId: 'your-client-id' 
});
// xmApi will now automatically use OAuth tokens for all subsequent requests
const groups = await xmApi.groups.get();
```

The library will automatically start using the OAuth tokens and purge the username & password you instantiated it with.

## Dependency injection

The library uses dependency injection to allow you to provide your own implementations for HTTP clients, loggers, and other dependencies.

### Custom HTTP Client

If you want to use your own HTTP client implementation:

```ts
import type { HttpClient, HttpRequest, HttpResponse } from '@johanfive/xmas';

const myHttpClient: HttpClient = {
  async send(request: HttpRequest): Promise<HttpResponse> {
    // Your HTTP client implementation
    const response = await yourHttpLibrary({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
    });

    return {
      status: response.status,
      headers: response.headers,
      body: response.data,
    };
  },
};

// Important: Your HTTP client should NOT throw on HTTP error status codes (4xx, 5xx)
// Instead, return the response normally
// This differs from libraries like Axios that by default throw on error responses
//
// While throwing can feel more natural at first, an HTTP response that contains an error status code is still a response, which is expected behaviour. That is not to say the http client should never throw.
// 
// The library aligns with the Fetch API approach because it enables:
// - Better error message formatting with full response context
// - Smarter retry logic
// - Consistent error handling across all HTTP clients (fetch, axios, custom, etc.)

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
  httpClient: myHttpClient,
};
```

### Custom Logger

The library uses `console` for logging by default, which works well for most applications. You only need to provide a custom logger if you want different behaviors.

**To use your own logging library:**

Most popular logging libraries (Winston, Pino, etc.) should be directly compatible:

```ts
const winston = require('winston');

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
  logger: winston,
};
```

Or if you need a custom wrapper:

```ts
import type { Logger } from '@johanfive/xmas';

const myCustomLogger: Logger = {
  debug: (message: string, ...args: unknown[]) => myLogLibrary.debug(message, ...args),
  info: (message: string, ...args: unknown[]) => myLogLibrary.info(message, ...args),
  warn: (message: string, ...args: unknown[]) => myLogLibrary.warn(message, ...args),
  error: (message: string, ...args: unknown[]) => myLogLibrary.error(message, ...args),
};
```

**To silence all logging:**

If you prefer to completely disable logging (rather than configuring log levels in your logging library):

```ts
const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
  logger: silentLogger,
};
```

### Token Refresh Callback

To handle OAuth token refresh events:

```ts
import type { TokenRefreshCallback } from '@johanfive/xmas';

const onTokenRefresh: TokenRefreshCallback = async (accessToken, refreshToken) => {
  // Save tokens to your database or secure storage
  await saveTokensToDatabase({ accessToken, refreshToken });
};

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  accessToken: 'current_access_token',
  refreshToken: 'current_refresh_token',
  clientId: 'your-client-id',
  onTokenRefresh,
};
```

## HTTP Client Interface

The `HttpClient` interface that your custom implementation must satisfy:

```ts
interface HttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;              // Fully qualified URL
  headers?: Headers;        // Key-value pairs of HTTP headers
  body?: unknown;          // Request body (will be serialized)
  retryAttempt?: number;   // Current retry attempt for logging
}

interface HttpResponse<T = unknown> {
  body: T;                 // Parsed response body
  status: number;          // HTTP status code
  headers: Headers;        // Response headers
}

interface HttpClient {
  send: (request: HttpRequest) => Promise<HttpResponse>;
}
```

**Note:** The `method` field is restricted to the HTTP methods that this library needs to interact with the xMatters API. Your HTTP client implementation can support additional methods (like `OPTIONS`, `HEAD`, etc.) - this restriction only applies to requests that the library will send to your client.

Your HTTP client receives a fully prepared request with:
- Complete URL (including query parameters)
- All necessary headers (including authentication)
- Serialized request body (if applicable)

The library uses the native `fetch` API by default, so you only need to provide a custom HTTP client if you have specific requirements (like using a different HTTP library or adding custom retry logic).

## Error Handling

The library throws `XmApiError` instances for API-related errors:

```ts
import { XmApiError } from '@johanfive/xmas';

try {
  const response = await xmApi.groups.save(group);
} catch (error) {
  if (error instanceof XmApiError) {
    console.log('API Error:', error.message);
    if (error.response) {
      console.log('Status Code:', error.response.status);
      console.log('Response Body:', error.response.body);
      console.log('Response Headers:', error.response.headers);
    }
    // Access underlying cause if available
    if (error.cause) {
      console.log('Underlying error:', error.cause);
    }
  }
}
```

## Configuration Options

All configuration options:

```ts
interface XmApiConfig {
  // Required
  hostname: string;
  
  // Authentication (one of these sets required)
  username?: string;              // Basic auth
  password?: string;              // Basic auth
  authorizationCode?: string;     // Auth code flow
  accessToken?: string;           // OAuth
  refreshToken?: string;          // OAuth
  clientId?: string;              // OAuth/Auth code
  clientSecret?: string;          // Optional for enhanced security
  
  // Optional dependencies
  httpClient?: HttpClient;        // Custom HTTP implementation
  logger?: Logger;                // Custom logging implementation
  
  // Optional settings
  defaultHeaders?: Headers;       // Additional headers for all requests
  maxRetries?: number;           // Maximum retry attempts
  onTokenRefresh?: TokenRefreshCallback; // Handle token refresh events
}
```
