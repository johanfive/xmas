const { shapeRequest, handleAxiosError, handleAxiosRes } = require('./utils');

class Requestor {
  constructor(config) {
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

  debug(...args) {
    if (this.noisy) {
      console.log(...args);
    }
  }

  send(request) {
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
  }

  execute(params) {
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
  }

  getRetryOrRethrow(ogParams) {
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
    };
  }

  handleTokensChange(oAuthXmApiResponse) {
    const { access_token: accessToken, refresh_token: refreshToken } = oAuthXmApiResponse;
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
    if (typeof this.onTokensChange === 'function') {
      try {
        this.onTokensChange({
          accessToken: this.getAccessToken(),
          refreshToken: this.getRefreshToken()
        });
      } catch (error) {
        // people don't read doc, so maybe always log?
        this.debug('Provided onTokensChange function must catch and handle its own errors');
        this.debug(error);
      }
    }
    return { ...oAuthXmApiResponse, clientId: this.getClientId() };
  }

  getOauthTokens(oauthPayload) {
    return this.execute({
      method: 'POST',
      endpoint: 'oauth2',
      pathParams: ['token'],
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: oauthPayload
    })
      .then((oAuthXmApiResponse) => this.handleTokensChange(oAuthXmApiResponse));
    // ".then" doesn't work well with "this"
    // can't do .then(this.handleTokensChange)
  }

  refreshTokens() {
    // Might be useful to throw some:
    // "you're attempting to refresh OAuth tokens but you did not initiate xmas with a refreshToken"
    const oauthPayload = new URLSearchParams({
      // eslint-disable-next-line camelcase
      grant_type: 'refresh_token',
      // eslint-disable-next-line camelcase
      client_id: this.getClientId(),
      // eslint-disable-next-line camelcase
      refresh_token: this.getRefreshToken()
    }).toString();
    return this.getOauthTokens(oauthPayload);
  }

  fetchClientId() {
    return this.execute({ method: 'GET', endpoint: 'organization' })
      .then(({ customerId }) => this.setClientId(customerId));
  }

  byUsernamePassword() {
    return this.getClientId() ? Promise.resolve() : this.fetchClientId()
      .then(() => {
        const oauthPayload = new URLSearchParams({
          // eslint-disable-next-line camelcase
          grant_type: 'password',
          // eslint-disable-next-line camelcase
          client_id: this.getClientId(),
          username: this.username,
          password: this.password
        }).toString();
        return this.getOauthTokens(oauthPayload);
      });
  }

  // GETTERS and SETTERS (only for properties that get modified on the fly)
  // eg: hostname comes from the config and is read only, so no need
  // but the clientId might not be provided in the config and might be dynamically loaded so... need

  setClientId(clientId) {
    this.clientId = clientId;
    return clientId;
  }

  getClientId() {
    return this.clientId;
  }

  setAccessToken(accessToken) {
    this.accessToken = accessToken;
    return accessToken;
  }

  getAccessToken() {
    return this.accessToken;
  }

  setRefreshToken(refreshToken) {
    this.refreshToken = refreshToken;
    return refreshToken;
  }

  getRefreshToken() {
    return this.refreshToken;
  }
}


module.exports = Requestor;
