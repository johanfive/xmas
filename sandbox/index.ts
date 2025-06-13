import { XmApi } from '../src/index.ts';
import config from './config.ts';

async function testBasicAuthOnly() {
  console.log('\n=== Scenario 1: Basic Auth Only (no clientId) ===');
  const { hostname, username, password } = config.basicAuth;
  if (!hostname || !username || !password) {
    console.warn('[WARNING] Basic Auth Only: Skipped (missing hostname, username, or password)');
    return;
  }
  try {
    const xm = new XmApi(config.basicAuth);
    const response = await xm.groups.get({ limit: 1 });
    console.log('[SUCCESS] Basic Auth Only:', response.status, response.body);
  } catch (err) {
    printError('[ERROR] Basic Auth Only:', err);
  }
}

// Scenario 2: Oauth through Basic Auth with explicit clientId (no discovery)
let lastAccessToken = '';
let lastRefreshToken = '';
async function testOauthViaBasicAuthWithExplicitClientId() {
  console.log('\n=== Scenario 2: Basic Auth with explicit clientId (no discovery) ===');
  const { hostname, username, password, clientId } = config.oauth.byUsernamePassword;
  if (!hostname || !username || !password || !clientId) {
    console.warn('[WARNING] Basic Auth with explicit clientId: Skipped (missing required fields)');
    return;
  }
  try {
    const xm = new XmApi(config.oauth.byUsernamePassword);
    const tokenResp = await xm.oauth.obtainTokens({ clientId });
    console.log(
      '[SUCCESS-1] Basic Auth (explicit clientId): Token Response:',
      tokenResp.status,
      tokenResp.body,
    );
    // Save tokens for scenario 4
    lastAccessToken = tokenResp.body.access_token;
    lastRefreshToken = tokenResp.body.refresh_token;
    const response = await xm.groups.get({ limit: 1 });
    console.log(
      '[SUCCESS-2] Basic Auth (explicit clientId): API Call Response:',
      response.status,
      response.body,
    );
  } catch (err) {
    printError('[ERROR] Basic Auth (explicit clientId)', err);
  }
}

async function testPasswordGrantWithDiscovery() {
  console.log('\n=== Scenario 3: Password Grant with clientId discovery (should error) ===');
  const { hostname, username, password } = config.basicAuth;
  if (!hostname || !username || !password) {
    console.warn('[WARNING] Password Grant with discovery: Skipped (missing required fields)');
    return;
  }
  try {
    const xm = new XmApi(config.basicAuth);
    await xm.oauth.obtainTokens();
    console.error(
      '[ERROR - for now] Password Grant with discovery: Unexpected success (should have errored)',
    );
  } catch (err) {
    printError('[SUCCESS - for now] Password Grant with discovery', err);
  }
}

async function testPreExistingOAuthTokens() {
  console.log('\n=== Scenario 4: Pre-existing OAuth Tokens ===');
  // Use tokens from scenario 2 if available, else fall back to config
  const accessToken = lastAccessToken || config.oauth.byRefreshToken.accessToken;
  const refreshToken = lastRefreshToken || config.oauth.byRefreshToken.refreshToken;
  const { clientId, hostname } = config.oauth.byRefreshToken;
  if (!hostname || !accessToken || !refreshToken || !clientId) {
    console.warn('[WARNING] Pre-existing OAuth Tokens: Skipped (missing required fields)');
    return;
  }
  try {
    const xm = new XmApi({ hostname, accessToken, refreshToken, clientId });
    const response = await xm.groups.get({ limit: 1 });
    console.log(
      '[SUCCESS] Pre-existing OAuth Tokens: API Call Response:',
      response.status,
      response.body,
    );
  } catch (err) {
    printError('[ERROR] Pre-existing OAuth Tokens', err);
  }
}

// Run all scenarios sequentially
await testBasicAuthOnly();
await testOauthViaBasicAuthWithExplicitClientId();
await testPasswordGrantWithDiscovery();
await testPreExistingOAuthTokens();

function printError(context: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`${context}: Error:`, err.message);
  } else {
    console.error(`${context}: Error:`, err);
  }
}
