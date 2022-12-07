const nodePath = require('path');

function buildUrl({ hostname, apiPath, endpoint, pathParams, queryParams }) {
  const baseUrl = hostname + nodePath.join(apiPath, endpoint);
  const path = pathParams ? pathParams.join('/') : '';
  const query = queryParams ? new URLSearchParams(queryParams).toString() : '';
  let url = baseUrl;
  if (path) {
    url = nodePath.join(baseUrl, path);
  }
  if (query) {
    url += '?' + query;
  }
  return url;
}

function buildAuth({ username, password, accessToken }) {
  if (accessToken) {
    return 'Bearer ' + accessToken;
  }
  return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}

const buildHeaders = (params) => {
  // allow consumer to override default headers with null
  const headers = params.headers !== undefined ? params.headers : {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': buildAuth(params)
  };
  return headers ? { ...headers, 'User-Agent': 'xmas(Johan)' } : headers;
};

const shapeRequest = (params) => {
  const req = {
    headers: buildHeaders(params),
    method: params.method,
    url: buildUrl(params)
  };
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

module.exports = {
  shapeRequest,
  handleAxiosError,
  handleAxiosRes
};
