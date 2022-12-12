const nodePath = require('path');
const packageJson = require('../../package.json');

function buildUrl({ hostname, apiPath, endpoint, pathParams, queryParams }) {
  const [protocol, rest] = hostname.split('//');
  const domain = rest || protocol;
  const baseUrl = nodePath.join(domain, apiPath, endpoint);
  const path = pathParams ? pathParams.join('/') : '';
  const query = queryParams ? new URLSearchParams(queryParams).toString() : '';
  let url = baseUrl;
  if (path) {
    url = nodePath.join(baseUrl, path);
  }
  if (query) {
    url += '?' + query;
  }
  return (/^https?:\/\//.test(protocol) ? protocol : 'https://') + url;
}

function buildAuth({ username, password, accessToken }) {
  if (accessToken) {
    return 'Bearer ' + accessToken;
  }
  return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}
function buildUserAgentHeader(params) {
  const { name, version } = params.userAgent;
  const agentVersion = version ? ` (${version})` : '';
  return `${name}${agentVersion} | xmApiSdkJs (${packageJson.version})`;
}

const buildHeaders = (params) => {
  // allow consumer to override default headers with null
  const headers = params.headers !== undefined ? params.headers : {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': buildAuth(params)
  };
  const userAgent = buildUserAgentHeader(params);
  return headers ? { ...headers, 'User-Agent': userAgent } : headers;
};

const shapeRequest = (params) => {
  const req = {
    method: params.method,
    url: buildUrl(params)
  };
  const headers = buildHeaders(params);
  if (headers) {
    req.headers = headers;
  }
  if (params.data) {
    req.data = typeof params.data === 'string'
      ? params.data
      : JSON.stringify(params.data);
  }
  return req;
};

const handleAxiosError = (e) => {
  const humanReadableMessage = e.response
    ? `xM API responded with ${e.response.status} ${e.response.statusText}`
    : 'Something went wrong and no response was received from xM API';
  const error = new Error(humanReadableMessage);
  error.status = e.response?.status;
  error.payload = e.response?.data;
  throw error;
};

const handleAxiosRes = (res) => res.data;

const validateConfig = (config) => {
  if (!config) {
    throw new Error('Missing config');
  }
  const { userAgent, username, password, refreshToken, clientId } = config;
  const requiredFields = ['hostname', 'userAgent'];
  const missing = requiredFields.reduce((missing, k) => {
    return config[k] ? missing : missing.concat(k);
  }, []);
  if (missing.length > 0) {
    throw new Error('config missing ' + missing.join(', '));
  }
  if (!userAgent.name) {
    throw new Error('config.userAgent missing name');
  }
  if (username || password) {
    if (!username || !password) {
      throw new Error('config requires both username and password');
    }
  }
  if (clientId || refreshToken) {
    if (!clientId || !refreshToken) {
      throw new Error('config requires both clientId and refreshToken');
    }
  }
};

module.exports = {
  shapeRequest,
  handleAxiosError,
  handleAxiosRes,
  validateConfig
};
