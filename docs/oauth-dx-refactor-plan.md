# OAuth DX

### Scenario 1: Basic Auth → OAuth (Password Grant)

```typescript
const xm = new XmApi({
  hostname: 'https://company.xmatters.com',
  username: 'user@company.com',
  password: 'secret',
});

// Use basic auth for initial API calls
await xm.groups.get();

// Switch to OAuth - auto-discovers clientId
await xm.oauth.obtainTokens();

// Or provide explicit clientId to skip discovery
await xm.oauth.obtainTokens({ clientId: 'my-client-id' });

// Subsequent API calls are now oauth authenticated
await xm.groups.get();
```

### Scenario 2: Auth Code → OAuth

```typescript
const xm = new XmApi({
  hostname: 'https://company.xmatters.com',
  authCode: 'received-from-redirect',
  clientId: 'web-app-client-id', // Required - no discovery path
});

// Must call obtainTokens() before other API calls
await xm.oauth.obtainTokens();

// Subsequent API calls are now oauth authenticated
await xm.groups.get();
```

### Scenario 3: Pre-existing OAuth Tokens

```typescript
const xm = new XmApi({
  hostname: 'https://company.xmatters.com',
  accessToken: 'existing-token',
  refreshToken: 'existing-refresh',
  clientId: 'client-id',
});

// Already authenticated - can make API calls immediately
await xm.groups.get();
```
