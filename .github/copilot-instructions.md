This typescript project built with deno is meant to be a library for javascript developers to
consume the xMatters API (AKA xmApi).

The priorities for this project are:

1. **Consistency**: Both from the library developer's perspective and the library consumer's
   perspective, code should be consistent in style, structure, and behavior. This includes
   consistent naming conventions, error handling, and response structures.
2. **Zero Dependencies**: The library should not depend on any other libraries, except for Deno's
   standard library and even then, only for unit testing.
3. **Dependency Injection**: The consumer should be able to inject their own HTTP client, logger,
   and other dependencies.
4. **Type Safety**: The library should be fully type-safe, leveraging TypeScript's capabilities to
   ensure that consumers get the best developer experience.
5. **Documentation**: The library should be well-documented, with clear examples and usage
   instructions.

We need to implement something that will make it extremely easy for the maintainers to add more
endpoints in the future. The core logic of how a request is built and sent should be abstracted away
from the endpoint implementations.

For iterative development, you can make use of the /sandbox/index.ts file to test your code. This
file is not part of the library and is meant for quick prototyping and testing. Do not modify the
sandbox unless explicitly instructed to do so.

The following code snippet, highly imperfect as it is, serves as _inspiration_ for some aspects of
the dependency injections.

It contains some good ideas, but certainly has many shortcomings that we should avoid in our
implementation.

```javascript
const nodePath = require('path');

const urlBuilder = (baseUrl) => ({ url = '', pathParams = [], queryParams = {} } = {}) => {
  let finalUrl;
  try {
    // check if consumer intends to pass a full url (thereby ignoring baseUrl for this request)
    const reqUrl = new URL(url);
    finalUrl = new URL(nodePath.join(reqUrl.href, ...pathParams));
  } catch (e) {
    // check if consumer passed a url without a protocol (e.g. 'google.com')
    if (/\.([a-z]{2,})$/i.test(url)) {
      console.warn(
        "Did you intend to pass a full url? Make sure to include 'http://' or 'https://'.",
      );
    }
    // if consumer did not pass a full url, use baseUrl and assume url is a relative path
    const base = new URL(baseUrl || 'about:blank');
    finalUrl = new URL(nodePath.join(base.href, url, ...pathParams));
  }
  Object.entries(queryParams).forEach(([key, value]) => finalUrl.searchParams.set(key, value));
  return finalUrl.toString();
};

const headersBuilder = (
  setDefaultHeaders,
  setFixedHeaders,
) =>
({ headers } = {}) => {
  // Allow setting headers as null to send headerless requests
  if (setDefaultHeaders && headers === undefined) {
    headers = setDefaultHeaders();
  }
  if (setFixedHeaders) {
    if (headers) {
      // Allow overriding fixedHeaders on a per-request basis
      headers = { ...setFixedHeaders(), ...headers };
      // TODO: think some more about this. There may or may not be value in pushing consumers
      // to pass a setDefaultHeaders
    } else if (headers === undefined) {
      headers = setFixedHeaders();
    }
  }
  return headers;
};

const reqBuilder = (buildUrl, buildHeaders) => (reqElements = {}) => {
  const req = {
    method: reqElements.method ? reqElements.method.toUpperCase() : 'GET',
    url: buildUrl(reqElements),
    headers: buildHeaders(reqElements),
    attemptNumber: reqElements.attemptNumber || 1,
  };
  if (reqElements.data) {
    const { data } = reqElements;
    req.data = typeof data === 'string' ? data : JSON.stringify(data);
  }
  return req;
};

const getBuilder = ({
  requestAdapter,
  responseAdapter,
  errorAdapter,
} = {}) =>
({
  baseUrl,
  successHandler,
  failureHandler,
  setDefaultHeaders,
  setFixedHeaders,
} = {}) => {
  const buildUrl = urlBuilder(baseUrl);
  const buildHeaders = headersBuilder(setDefaultHeaders, setFixedHeaders);
  const buildReq = reqBuilder(buildUrl, buildHeaders);
  const send = (reqElements) => {
    const req = buildReq(reqElements);
    return requestAdapter(req)
      .then(responseAdapter)
      .catch(errorAdapter)
      .then((res) => successHandler ? successHandler(res, req) : res)
      .catch((err) => {
        if (failureHandler) {
          return failureHandler(err, req);
        }
        throw err;
      });
  };
  return {
    send,
    get: (url, { queryParams, pathParams, headers } = {}) =>
      send({ url, queryParams, pathParams, headers }),
    post: (url, data, { pathParams, headers } = {}) =>
      send({ method: 'post', url, pathParams, headers, data }),
    put: (url, data, { pathParams, headers } = {}) =>
      send({ method: 'put', url, pathParams, headers, data }),
    patch: (url, data, { pathParams, headers } = {}) =>
      send({ method: 'patch', url, pathParams, headers, data }),
    delete: (url, { pathParams, headers } = {}) =>
      send({ method: 'delete', url, pathParams, headers }),
    options: (url, { pathParams, headers } = {}) =>
      send({ method: 'options', url, pathParams, headers }),
  };
};

module.exports = getBuilder;
```

Features:

- http client injection with adapters for request, response, and error handling
- use fetch as the default HTTP client (but even then fetch should be injectable and come with
  adapters)
- logger injection
- use console as the default logger
- when a request fails with a response, there should be retry logic that:
  - retries the request up to a configurable maximum number of attempts
  - if it's a 401 Unauthorized error, it should retry the request after refreshing the access token
- perfectly consistant errors for the consumer
  - the error should be a subclass of Error as to always have a message property populated
  - the error should have a response property that is either undefined or an object with the
    following properties:
    - body: the response body as a string
    - status: the HTTP status code of the response
    - headers: an object containing the response headers
  - Because consumers can inject their own HTTP client:
    - the error should not contain any information about the HTTP client used
    - the consumers should be able to specify when the error is thrown. Most likely in their http
      client adapters. For eg: the Slack API almost never responds with a 4xx or 5xx status code, so
      the consumer should be able to specify that the error should be thrown on 200 status code when
      the response body contains the `ok` property set to `false`.
- For maintainers:
  - the code should be easy to extend with new endpoints
    - each new endpoint should have access to the same request building logic (e.g. url building,
      headers building, etc. and reusable request sending logic via get, post, put, patch, delete
      methods)
    - We should make it easy for maintainers not to have to repeat themselves when adding new
      endpoints
      - for example, if adding a new /people endpoint, which would have methods such as
        `getDevices`, the maintainers should not have to specify "/people/devices" when "/devices"
        would suffice and the library should automatically prepend "/people" to the path
  - the code should be easy to test
    - the unit test should not send actual HTTP requests over the network
    - the unit test should be based around something such as
      "expect(sendRequest).toHaveBeenCalledWith(httpRequest)" so that the test is not dependent on
      the actual HTTP client used
  - each endpoint will be defined in its own directory inside the `endpoints` directory
    - `types.ts` file that exports the endpoint's types
    - `index.ts` file that exports the endpoint's methods
    - `index.test.ts` file that contains the unit tests for the endpoint
- For consumers:
  - they should always be able to provide a params object which is to be used to build a query
    string
    - if maintainers have relied on a params object to implement and endpoint, when consumers
      provide a params object it should be merged with the default params for that endpoint
    - it should be possible for the maintainers to make some of the params overrideable by the
      consumer, while others should be fixed
      - for example, if the endpoint is `/people/{id}/devices`, the `id` param should be fixed and
        not overrideable by the consumer, while the `type` param should be overrideable by the
        consumer
  - they should be able to provide a headers object:
    - as a config option to specify default headers for all requests
    - as a per-request option to override the default headers
      - the headers should be merged with the default headers, with the per-request headers taking
        precedence
      - If headers are not provided, the default headers should be used, but if they're explicitly
        set to `null`, no headers should be sent
  - they should be able to provide a function that will be called when oauth tokens get refreshed
    - this function should be called with the new access token and the refresh token as arguments
    - the function should only be called if it was provided by the consumer
    - the function should be wrapped in a try-catch block to ensure that any errors thrown by the
      function do not crash the library

Do not make any changes until you have 95% confidence that you know what to build. Ask me follow up
questions until you have that confidence.
