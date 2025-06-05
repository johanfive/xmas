# Potential Improvements

## HTTP Handler Retry Strategy

Currently, the HttpHandler implements a built-in retry strategy. Here are the potential improvements
to consider with detailed implementation notes.

### Option 1: Keep Built-in Strategy but Make it More Configurable

Implementation details:

1. Add a RetryConfig interface to `src/core/types.ts`:

```typescript
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 10000) */
  maxDelay?: number;
  /** Which status codes should trigger a retry (default: [429, 500-599]) */
  retryableStatuses?: number[];
  /** Custom function to determine if a response should be retried */
  shouldRetry?: (response: HttpResponse, attempt: number) => boolean | Promise<boolean>;
  /** Custom function to calculate delay between retries */
  getDelay?: (response: HttpResponse, attempt: number) => number | Promise<number>;
}
```

2. Update HttpHandler constructor to accept this config:

```typescript
constructor(
  client: HttpClient,
  logger: Logger,
  requestBuilder: RequestBuilder,
  retryConfig?: RetryConfig,
  onTokenRefresh?: (accessToken: string, refreshToken: string) => void | Promise<void>,
  tokenData?: TokenData,
)
```

3. Implement custom retry logic in send() method using these options

### Option 2: Move Retry Logic to Adapters

Implementation details:

1. Add RetryingHttpClient class to `src/core/http-client.ts`:

```typescript
export class RetryingHttpClient implements HttpClient {
  constructor(
    innerClient: HttpClient,
    config: RetryConfig,
    logger: Logger,
  );
}
```

2. Move all retry-related code from HttpHandler to this class
3. Update DefaultHttpClient to optionally wrap itself with RetryingHttpClient
4. Add examples in README showing how to implement custom retry strategies

### Option 3: Hybrid Approach

Implementation details:

1. Keep basic retry logic in HttpHandler but only for token refresh
2. Allow wrapping any HttpClient with retry behavior:

```typescript
const client = new DefaultHttpClient();
const retryingClient = new RetryingHttpClient(client, {
  maxRetries: 3,
  shouldRetry: (res) => res.status === 429
});
const handler = new HttpHandler(retryingClient, ...);
```

3. Provide common retry strategies as utilities:

```typescript
export const retryStrategies = {
  exponentialBackoff: (baseDelay: number, maxDelay: number) => {...},
  fixedDelay: (delay: number) => {...},
  httpStatusBased: (statusCodes: number[]) => {...}
};
```

## Current Recommendation

Keep the current implementation but create a new branch implementing Option 1. This provides:

- Better configurability for power users
- Same great defaults for simple use cases
- No breaking changes
- Clear path to Option 3 if needed later

The minimal first step would be to extract retry configuration while keeping current behavior as the
default:

```typescript
// Default config matching current behavior
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [429, ...Array.from({ length: 100 }, (_, i) => 500 + i)],
  shouldRetry: (res) => res.status === 429 || res.status >= 500,
  getDelay: (res, attempt) => {
    if (res.status === 429 && res.headers['retry-after']) {
      const retryAfter = parseInt(res.headers['retry-after'], 10);
      if (!isNaN(retryAfter)) return retryAfter * 1000;
    }
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  },
};
```

## Testing Considerations

Any chosen implementation must:

1. Be fully testable without real network calls
2. Have predictable timing in tests (mock setTimeout)
3. Allow verification of retry attempts
4. Support testing of custom retry strategies
5. Maintain current test coverage levels

## Migration Strategy

1. Create new interfaces/configs without breaking changes
2. Add new functionality behind feature flags or as opt-in
3. Update documentation with examples
4. Consider creating utilities to help migrate between approaches
