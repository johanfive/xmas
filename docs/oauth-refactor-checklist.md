# OAuth DX Refactor Implementation Checklist

## 🎯 Goal

Implement refactor as scoped out in [oauth-dx-refactor-plan.md](./oauth-dx-refactor-plan.md)

## 📋 Implementation Phases

### Phase 1: Type System Rewrite ⏳

- [ ] **1.1** Update `src/core/types/internal/config.ts`
  - [ ] Create `XmApiBaseConfig` interface
  - [ ] Create `BasicAuthConfig` interface (username + password only)
  - [ ] Create `AuthCodeConfig` interface (authCode + clientId)
  - [ ] Create `OAuthConfig` interface (accessToken + refreshToken + clientId)
  - [ ] Create `XmApiConfig` union type
  - [ ] Export all new types
- [ ] **1.2** Add type guards to config.ts
  - [ ] `isBasicAuthConfig()` function
  - [ ] `isAuthCodeConfig()` function
  - [ ] `isOAuthConfig()` function
  - [ ] Export type guards
- [ ] **1.3** Update `src/core/types/internal/oauth.ts`
  - [ ] Add `AuthCodeData` interface
  - [ ] Add `FlowType` type
  - [ ] Add `FlowInfo` interface
  - [ ] Update `BasicAuthCredentials` type (remove clientId)
- [ ] **1.4** Verify types build without errors
  - [ ] Run `deno check src/index.ts`
  - [ ] Fix any type errors

### Phase 2: RequestHandler Updates ⏳

- [ ] **2.1** Update constructor in `src/core/request-handler.ts`
  - [ ] Update config parameter type to `XmApiConfig`
  - [ ] Add logic to handle different config types
  - [ ] Store auth code data if present
  - [ ] Initialize OAuth token state if present
- [ ] **2.2** Add new helper methods
  - [ ] `hasBasicAuthConfig(): boolean`
  - [ ] `hasAuthCodeConfig(): boolean`
  - [ ] `hasOAuthConfig(): boolean`
  - [ ] `getAuthCodeData(): { clientId: string; authCode: string } | undefined`
  - [ ] `isAuthCodePending(): boolean`
  - [ ] Ensure congruency between `getAuthCredentials()` and `getAuthCodeData()`
    - [ ] Both return a typed object or `undefined` (never throw)
    - [ ] Both are instance methods on `RequestHandler`
    - [ ] Both have parallel naming and documentation
    - [ ] Both types (`BasicAuthCredentials`, `AuthCodeData`) are defined in
          `src/core/types/internal/oauth.ts`
    - [ ] Both are used in parallel in flow detection and endpoint logic
    - [ ] Do not explicitly use `return undefined;` in either method—if a value is not present,
          simply allow implicit undefined, or if unavoidable, use `return null;` instead.
- [ ] **2.3** Update existing methods
  - [ ] Update `getAuthCredentials()` for new BasicAuthConfig
  - [ ] Update `createAuthHeader()` for new config types
  - [ ] Review and update `validateBasicAuthFields()` if needed
- [ ] **2.4** Verify RequestHandler builds
  - [ ] Run `deno check src/core/request-handler.ts`
  - [ ] Fix any compilation errors

### Phase 3: Auth Code Validation in send() ⏳

- [ ] **3.1** Update `send()` method in RequestHandler
  - [ ] Add auth code pending check at start of method
  - [ ] Throw clear error if auth code flow not completed
  - [ ] Ensure existing logic still works
- [ ] **3.2** Test validation logic
  - [ ] Create minimal test to verify error is thrown
  - [ ] Ensure existing tests still pass

### Phase 4: OAuth Endpoint Rewrite ⏳

- [ ] **4.1** Update `src/endpoints/oauth/index.ts` - Smart obtainTokens()
  - [ ] Replace existing methods with `obtainTokens(options?: { clientId?: string })`
  - [ ] Add flow detection logic (`detectFlow()` private method)
  - [ ] Add password flow handler (`handlePasswordFlow()` private method)
  - [ ] Add auth code flow handler (`handleAuthCodeFlow()` private method)
  - [ ] Add client ID discovery stub (`discoverClientId()` private method)
- [ ] **4.2** Update OAuth endpoint exports
  - [ ] Ensure new method is properly exported
  - [ ] Add deprecated aliases if backward compatibility needed
- [ ] **4.3** Update OAuth types in `src/endpoints/oauth/types.ts`
  - [ ] Add any new types needed for the methods
  - [ ] Update existing types if necessary
- [ ] **4.4** Verify OAuth endpoint builds
  - [ ] Run `deno check src/endpoints/oauth/index.ts`
  - [ ] Fix any compilation errors

### Phase 5: Test Updates ⏳

- [ ] **5.1** Update RequestHandler tests (`src/core/request-handler.test.ts`)
  - [ ] Update test helpers to use new config types
  - [ ] Add tests for new helper methods
  - [ ] Add tests for auth code pending validation in send()
  - [ ] Update existing authentication tests
  - [ ] Ensure all tests pass: `deno test src/core/request-handler.test.ts`
- [ ] **5.2** Update OAuth endpoint tests (`src/endpoints/oauth/index.test.ts`)
  - [ ] Update `createTestRequestHandler()` helper for new config types
  - [ ] Add tests for smart `obtainTokens()` method
  - [ ] Add tests for flow detection logic
  - [ ] Add tests for password flow handler
  - [ ] Add tests for auth code flow handler
  - [ ] Add tests for error cases (invalid config, auth code pending, etc.)
  - [ ] Update existing tests to work with new API
  - [ ] Ensure all tests pass: `deno test src/endpoints/oauth/index.test.ts`
- [ ] **5.3** Run full test suite
  - [ ] Run `deno test` and ensure all tests pass
  - [ ] Fix any failing tests

### Phase 6: Integration & Validation ⏳

- [ ] **6.1** Update main exports (`src/index.ts`)
  - [ ] Ensure new config types are exported
  - [ ] Ensure new OAuth API is exported
  - [ ] Verify no breaking changes to public API
- [ ] **6.2** Test scenarios in sandbox
  - [ ] Test Scenario 1: Basic Auth → OAuth (Password Grant)
  - [ ] Test Scenario 2: Auth Code → OAuth
  - [ ] Test Scenario 3: Pre-existing OAuth Tokens
  - [ ] Test error cases and edge cases
- [ ] **6.3** Final validation
  - [ ] Run full test suite: `deno test`
  - [ ] Run type checking: `deno check src/index.ts`
  - [ ] Test build process works
  - [ ] Verify no runtime errors in sandbox

### Phase 7: Documentation & Cleanup ⏳

- [ ] **7.1** Update JSDoc comments
  - [ ] Update `obtainTokens()` method documentation
  - [ ] Add examples for all three scenarios
  - [ ] Document flow detection behavior
  - [ ] Update other affected method docs
- [ ] **7.2** Update sandbox examples
  - [ ] Update `sandbox/index.ts` with new API examples
  - [ ] Test examples work correctly
- [ ] **7.3** Final cleanup
  - [ ] Remove any old unused code
  - [ ] Clean up console.log or debug statements
  - [ ] Ensure code follows project style guidelines

## 🚨 Critical Checkpoints

### Before Phase 2

- [ ] All new types are properly defined and exported
- [ ] Type guards work correctly
- [ ] No TypeScript compilation errors

### Before Phase 4

- [ ] RequestHandler properly handles all three config types
- [ ] Auth code validation in send() works correctly
- [ ] All RequestHandler tests pass

### Before Phase 6

- [ ] OAuth endpoint smart method works for all flows
- [ ] All OAuth endpoint tests pass
- [ ] No breaking changes to existing working code

### Before Phase 7

- [ ] All three scenarios work end-to-end
- [ ] Full test suite passes
- [ ] No TypeScript errors
- [ ] Sandbox examples work

## 🐛 Common Issues to Watch For

- [ ] Type guard functions must be precise (no false positives)
- [ ] Auth code pending check must not interfere with basic auth or OAuth flows
- [ ] Token state management between flows
- [ ] Error messages must be clear and actionable
- [ ] Backward compatibility with existing working code
- [ ] Test mocks must align with new config types

## 📝 Implementation Notes

- **Current Status**: Not started
- **Last Updated**: [Date when work begins]
- **Blockers**: None currently identified
- **Next Action**: Begin Phase 1.1 - Update config types

## 🔄 Resume Instructions

1. Check the last completed checkbox above
2. Read the "Next Action" note
3. Review any "Blockers" or implementation notes
4. Continue from the next unchecked item
5. Update "Last Updated" when making progress

## ✅ Success Criteria Verification

- [ ] All three scenarios work as designed
- [ ] Type safety prevents invalid configurations
- [ ] Clear error messages guide users to correct usage
- [ ] All tests pass (`deno test`)
- [ ] No TypeScript errors (`deno check src/index.ts`)
- [ ] Documentation is clear and comprehensive
- [ ] Code is maintainable and extensible

---

_This checklist tracks the OAuth DX refactor implementation. Update status as work progresses._
