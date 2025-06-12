# OAuth DX Refactor Plan

## Overview

Implement a new DX approach where configuration determines the authentication flow, and `obtainTokens()` is a single smart method that handles different OAuth flows based on the configuration type.

## New DX Design

### Scenario 1: Basic Auth → OAuth (Password Grant)
```typescript
const xm = new XmApi({
  hostname: 'https://company.xmatters.com',
  username: 'user@company.com',
  password: 'secret'
  // No clientId - this is pure basic auth configuration
});

// Use basic auth for initial API calls
await xm.groups.get();

// Switch to OAuth - auto-discovers clientId
await xm.oauth.obtainTokens();

// Or provide explicit clientId to skip discovery
await xm.oauth.obtainTokens({ clientId: 'my-client-id' });
```

### Scenario 2: Auth Code → OAuth
```typescript
const xm = new XmApi({
  hostname: 'https://company.xmatters.com',
  authCode: 'received-from-redirect',
  clientId: 'web-app-client-id' // Required - no discovery path
});

// Must call obtainTokens() before other API calls
await xm.oauth.obtainTokens();

// Now can make authenticated API calls
await xm.groups.get();
```

### Scenario 3: Pre-existing OAuth Tokens
```typescript
const xm = new XmApi({
  hostname: 'https://company.xmatters.com',
  accessToken: 'existing-token',
  refreshToken: 'existing-refresh',
  clientId: 'client-id'
});

// Already authenticated - can make API calls immediately
await xm.groups.get();
```

## Implementation Tasks

### 1. Type System Rewrite

#### 1.1 New Config Types (`src/core/types/internal/config.ts`)
```typescript
// Base configuration
interface XmApiBaseConfig {
  hostname: string;
  httpClient?: HttpClient;
  logger?: Logger;
  defaultHeaders?: Record<string, string>;
  maxRetries?: number;
  onTokenRefresh?: TokenRefreshCallback;
}

// Basic auth configuration (can transition to OAuth)
interface BasicAuthConfig extends XmApiBaseConfig {
  username: string;
  password: string;
  // No clientId field - this is pure basic auth
}

// Auth code configuration (must call obtainTokens before API calls)
interface AuthCodeConfig extends XmApiBaseConfig {
  authCode: string;
  clientId: string; // Required - no discovery path
}

// OAuth configuration (ready for API calls)
interface OAuthConfig extends XmApiBaseConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
}

// Union type
type XmApiConfig = BasicAuthConfig | AuthCodeConfig | OAuthConfig;
```

#### 1.2 New Type Guards
```typescript
function isBasicAuthConfig(config: XmApiConfig): config is BasicAuthConfig {
  return 'username' in config && 'password' in config;
}

function isAuthCodeConfig(config: XmApiConfig): config is AuthCodeConfig {
  return 'authCode' in config;
}

function isOAuthConfig(config: XmApiConfig): config is OAuthConfig {
  return 'accessToken' in config && 'refreshToken' in config;
}
```

### 2. RequestHandler Updates (`src/core/request-handler.ts`)

#### 2.1 Constructor Updates
- Update constructor to handle new config types
- Initialize token state for OAuth configs
- Store auth code data for auth code configs

#### 2.2 New Helper Methods
```typescript
// Check if this is basic auth configuration
hasBasicAuthConfig(): boolean

// Check if this is auth code configuration  
hasAuthCodeConfig(): boolean

// Check if this is OAuth configuration
hasOAuthConfig(): boolean

// Get auth code data for OAuth endpoint
getAuthCodeData(): { clientId: string; authCode: string } | undefined

// Check if auth code flow is pending (tokens not yet obtained)
isAuthCodePending(): boolean
```

#### 2.3 Enhanced send() Method
Add validation in `send()` method to detect when auth code flow hasn't been completed:

```typescript
async send<T>(request: RequestBuildOptions): Promise<HttpResponse<T>> {
  // Check if auth code flow is pending
  if (this.hasAuthCodeConfig() && this.isAuthCodePending()) {
    throw new XmApiError(
      'Auth code configuration detected. Call xm.oauth.obtainTokens() first to exchange code for tokens.'
    );
  }
  
  // ... rest of existing send logic
}
```

#### 2.4 Update Existing Methods
- Update `getAuthCredentials()` to work with new BasicAuthConfig
- Update `validateBasicAuthFields()` if still needed
- Update `createAuthHeader()` to handle new config types

### 3. OAuth Endpoint Rewrite (`src/endpoints/oauth/index.ts`)

#### 3.1 Smart obtainTokens() Method
```typescript
async obtainTokens(options?: { clientId?: string }): Promise<HttpResponse<TokenResponse>> {
  const flow = this.detectFlow();
  
  switch (flow.type) {
    case 'password':
      return this.handlePasswordFlow(options?.clientId ?? flow.clientId);
    case 'authCode':
      return this.handleAuthCodeFlow(flow.clientId, flow.authCode);
    default:
      throw new XmApiError('obtainTokens() requires basic auth or auth code configuration');
  }
}
```

#### 3.2 Flow Detection Logic
```typescript
private detectFlow(): FlowInfo {
  if (this.http.hasBasicAuthConfig()) {
    const creds = this.http.getAuthCredentials();
    return { 
      type: 'password', 
      username: creds?.username,
      password: creds?.password 
      // No clientId from basic auth config - will be provided or discovered
    };
  }
  
  if (this.http.hasAuthCodeConfig()) {
    const authData = this.http.getAuthCodeData();
    return { 
      type: 'authCode',
      clientId: authData!.clientId,
      authCode: authData!.authCode
    };
  }
  
  return { type: 'invalid' };
}
```

#### 3.3 Flow Handler Methods
```typescript
private async handlePasswordFlow(clientId?: string): Promise<HttpResponse<TokenResponse>> {
  // Get credentials from RequestHandler
  const creds = this.http.getAuthCredentials();
  if (!creds) {
    throw new XmApiError('Basic auth credentials required for password flow');
  }
  
  // Use provided clientId or discover it
  const finalClientId = clientId ?? await this.discoverClientId();
  
  // Make password grant request
  const requestBody = new URLSearchParams({
    grant_type: 'password',
    client_id: finalClientId,
    username: creds.username,
    password: creds.password,
  });
  
  // ... rest of implementation
}

private async handleAuthCodeFlow(clientId: string, authCode: string): Promise<HttpResponse<TokenResponse>> {
  // Make auth code exchange request
  const requestBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code: authCode,
    // redirect_uri might be needed depending on xMatters API
  });
  
  // ... rest of implementation
}

private async discoverClientId(): Promise<string> {
  // TODO: Implement clientId discovery via another endpoint
  throw new XmApiError('Client ID discovery not yet implemented. Please provide clientId parameter.');
}
```

### 4. Test Updates

#### 4.1 OAuth Endpoint Tests (`src/endpoints/oauth/index.test.ts`)
- Update test helper `createTestRequestHandler()` to use new config types
- Add tests for auth code flow
- Update existing password flow tests
- Add tests for flow detection logic
- Add tests for error cases (auth code pending, invalid config, etc.)

#### 4.2 RequestHandler Tests (`src/core/request-handler.test.ts`)
- Update tests to use new config types
- Add tests for new helper methods
- Add tests for auth code pending validation in send()
- Update existing authentication tests

#### 4.3 Integration Tests
- Test complete flows end-to-end
- Test config validation
- Test error scenarios

### 5. Supporting Type Updates

#### 5.1 OAuth Types (`src/core/types/internal/oauth.ts`)
```typescript
// Add auth code related types
interface AuthCodeData {
  authCode: string;
  clientId: string;
}

// Flow detection types
type FlowType = 'password' | 'authCode' | 'invalid';

interface FlowInfo {
  type: FlowType;
  clientId?: string;
  username?: string;
  password?: string;
  authCode?: string;
}
```

#### 5.2 Update BasicAuthCredentials
```typescript
// Update to match new BasicAuthConfig (no clientId)
export type BasicAuthCredentials = Pick<
  BasicAuthConfig,
  'username' | 'password'
>;
```

### 6. Documentation Updates

#### 6.1 Update Method Documentation
- Update JSDoc for `obtainTokens()` method
- Add examples for all three scenarios
- Document the flow detection behavior

#### 6.2 Update README and Examples
- Update usage examples in README
- Update sandbox examples
- Create migration guide from old API

### 7. Migration Strategy

#### 7.1 Backward Compatibility (Optional)
Consider keeping old method names as deprecated aliases:
```typescript
// Deprecated alias
async getTokensByCredentials(): Promise<HttpResponse<TokenResponse>> {
  console.warn('getTokensByCredentials() is deprecated. Use obtainTokens() instead.');
  return this.obtainTokens();
}
```

#### 7.2 Breaking Changes
- Constructor parameter types change
- Some config validation behavior changes
- Error messages may change

### 8. Implementation Order

1. **Phase 1**: Update type system and type guards
2. **Phase 2**: Update RequestHandler with new helper methods
3. **Phase 3**: Implement auth code pending validation in send()
4. **Phase 4**: Rewrite OAuth endpoint with smart obtainTokens()
5. **Phase 5**: Update all tests
6. **Phase 6**: Add auth code flow implementation
7. **Phase 7**: Implement clientId discovery (future)

### 9. Key Validation Points

#### 9.1 Config Validation
- BasicAuthConfig: require username + password only (no clientId)
- AuthCodeConfig: require authCode + clientId
- OAuthConfig: require all three fields

#### 9.2 Runtime Validation
- Auth code flow: must call obtainTokens() before other API calls
- Password flow: can use basic auth immediately, obtainTokens() switches to OAuth
- OAuth flow: can make API calls immediately

#### 9.3 Error Scenarios
- Calling API methods with pending auth code
- Invalid config combinations
- Missing required fields
- Network errors during token exchange

### 10. Future Enhancements

#### 10.1 ClientId Discovery
Implement endpoint to discover clientId for password flow users.

#### 10.2 Additional OAuth Flows
- Device code flow
- Client credentials flow
- PKCE support for auth code flow

#### 10.3 Token Management
- Automatic token refresh
- Token persistence
- Token validation

## Success Criteria

- ✅ All three scenarios work as designed
- ✅ Type safety prevents invalid configurations
- ✅ Clear error messages guide users to correct usage
- ✅ All tests pass
- ✅ Documentation is clear and comprehensive
- ✅ Code is maintainable and extensible

## Notes

- The auth code flow detection in `send()` prevents users from forgetting to call `obtainTokens()`
- ClientId discovery can be implemented later without breaking the API
- The flow detection pattern makes it easy to add new OAuth flows in the future
- Type system ensures compile-time validation of configuration validity
