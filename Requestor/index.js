const { shapeRequest, handleAxiosError, handleAxiosRes } = require('./utils');

function Requestor(config) {
  this.httpClient = config.httpClient;
  this.hostname = config.hostname;
  this.apiPath = '/api/xm/1';
  this.username = config.username;
  this.password = config.password;
  this.maxAttempts = config.maxAttempts || 3;
  this.clientId = config.clientId;
  this.refreshToken = config.refreshToken;
  this.accessToken = config.accessToken;
  this.onTokensChange = config.onTokensChange;
  this.noisy = config.noisy;
}

Requestor.prototype.debug = function(...args) {
  if (this.noisy) {
    console.log(...args);
  }
};

Requestor.prototype.send = function(request) {
  this.debug(request);
  if (this.httpClient) {
    return this.httpClient.sendRequest(request)
      .then(this.httpClient.successAdapter)
      .catch(this.httpClient.failureAdapter);
  }
  const { default: axios } = require('axios');
  return axios(request)
    .then(handleAxiosRes)
    .catch(handleAxiosError);
};

Requestor.prototype.execute = function(params) {
  const request = shapeRequest({
    hostname: this.hostname,
    apiPath: this.apiPath,
    username: this.username,
    password: this.password,
    accessToken: this.getAccessToken(),
    ...params // allow overriding anything
  });
  params.attemptNumber = params.attemptNumber ? (params.attemptNumber + 1) : 1;
  return this.send(request)
    .then(res => {
      this.debug(res);
      return res;
    })
    .catch(this.getRetryOrRethrow(params));
};

Requestor.prototype.getRetryOrRethrow = function(ogParams) {
  const that = this;
  return function retryOrRethrow(e) {
    that.debug(e, { attemptNumber: ogParams.attemptNumber });
    if (ogParams.attemptNumber < that.maxAttempts) {
      if (e.status === 401 && !that.getRefreshToken()) {
        throw e.payload || e;
      }
      // TODO: xmApi doesn't invalidate previous tokens on refresh so we're good here
      // but it'd be nice one of these days to figure out a way for 2 concurrent requests NOT to
      // initiate a refresh at the same time
      // For example: when the accessToken is expired and
      // the consumer does Promise.all([xmas.people.getAll(), xmas.groups.getAll()])
      const reAuthIfNecessary = (e.status === 401) ? that.refreshTokens() : Promise.resolve();
      return reAuthIfNecessary
        .then(() => that.execute(ogParams));
    }
    // e.payload is a clean and predictable error from the actual API response
    // e is a failsafe for any unforseen errors. Likely development errors or network issues
    throw e.payload || e;
  }
};

Requestor.prototype.handleTokensChange = function(oAuthXmApiResponse) {
  const { access_token: accessToken, refresh_token: refreshToken } = oAuthXmApiResponse;
  this.setAccessToken(accessToken);
  this.setRefreshToken(refreshToken);
  if (typeof this.onTokensChange === 'function') {
    try {
      this.onTokensChange({
        accessToken: this.getAccessToken(),
        refreshToken: this.getRefreshToken(),
      });
    } catch (error) {
      // people don't read doc, so maybe always log?
      this.debug('Provided onTokensChange function must catch and handle its own errors');
      this.debug(error);
    }
  }
  return { ...oAuthXmApiResponse, clientId: this.getClientId() };
};

Requestor.prototype.getOauthTokens = function(oauthPayload) {
  return this.execute({
    method: 'POST',
    endpoint: 'oauth2',
    pathParams: ['token'],
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: oauthPayload,
  })
    .then((oAuthXmApiResponse) => this.handleTokensChange(oAuthXmApiResponse));
    // ".then" doesn't work well with "this"
    // can't do .then(this.handleTokensChange)
};

Requestor.prototype.refreshTokens = function() {
  // Might be useful to throw some:
  // "you're attempting to refresh OAuth tokens but you did not initiate xmas with a refreshToken"
  const oauthPayload = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: this.getClientId(),
    refresh_token: this.getRefreshToken(),
  }).toString();
  return this.getOauthTokens(oauthPayload);
};

Requestor.prototype.fetchClientId = function() {
  return this.execute({ method: 'GET', endpoint: 'organization' })
    .then(({ customerId }) => this.setClientId(customerId));
};

Requestor.prototype.byUsernamePassword = function() {
  return this.getClientId() ? Promise.resolve() : this.fetchClientId()
    .then(() => {
      const oauthPayload = new URLSearchParams({
        grant_type: 'password',
        client_id: this.getClientId(),
        username: this.username,
        password: this.password,
      }).toString();
      return this.getOauthTokens(oauthPayload);
    });
};

// GETTERS and SETTERS (only for properties that get modified on the fly)
// eg: hostname comes from the config and is read only, so no need
// but the clientId might not be provided in the config and might be dynamically loaded so... need

Requestor.prototype.setClientId = function(clientId) {
  this.clientId = clientId;
  return clientId;
};

Requestor.prototype.getClientId = function() {
  return this.clientId;
};

Requestor.prototype.setAccessToken = function(accessToken) {
  this.accessToken = accessToken;
  return accessToken;
};

Requestor.prototype.getAccessToken = function() {
  return this.accessToken;
};

Requestor.prototype.setRefreshToken = function(refreshToken) {
  this.refreshToken = refreshToken;
  return refreshToken;
};

Requestor.prototype.getRefreshToken = function() {
  return this.refreshToken;
};

module.exports = Requestor;
