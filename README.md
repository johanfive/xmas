# xM API SDK JS
`xmas` for short 🎄

# Usage
If your project already relies on the `axios` library,
`xmas` will just use it to send http requests to `xmApi` and handle its responses.

Your instantiation of a new Xmas object will only need your xM hostname and some auth credentials:
```js
const Xmas = require('xmas');

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
};

const xmas = new Xmas(config);

// Create a new group in your xMatters instance:
const group = { targetName: 'API developers' };
xmas.groups.create(group)
  .then(handleSuccess)
  .catch(handleError);
```

Alternative `config` object for **OAuth**
(say when you have already generated tokens and safely stored them in your DB):
```json
{
  "hostname": "https://yourOrg.xmatters.com",
  "accessToken": "eyJ123...",
  "refreshToken": "eyJ456...",
  "clientId": "Your xMatters instance uuid"
}
```

## Obtain OAuth tokens
```js
const Xmas = require('xmas');

const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
};

const xmas = new Xmas(config);
xmas.getOauthTokens.byUsernamePassword()
  .then(({ accessToken, refreshToken }) => saveToDb(accessToken, refreshToken))
  .then(() => xmas.people.search('immediately uses the tokens, not the creds set in config'))
  .catch(handleError);
```
`Xmas` will immediately start using the OAuth tokens and stop using the username & password
you instantiated it with.

## Dependency injection
If your project relies on an **HTTP client** *other* than `axios`,
you will need to pass it in the `config` when you instantiate an Xmas:
```js
const config = {
  hostname: 'https://yourOrg.xmatters.com',
  username: 'authingUserName',
  password: 'authingUserPassword',
  httpClient: {
    sendRequest: yourHttpClient,
    successAdapter: () => {},
    failureAdapter: () => {},
  }
};
```

### httpClient.sendRequet
Should have the following signature:
```js
({ method, url, headers, data }) => Promise
```
Where:
+ `method` will be an HTTP method used to send the request (eg: 'GET', 'POST', 'DELETE')
+ `url` will be the fully qualified url the request will be sent to
(eg: 'https://yourOrg.xmatters.com/api/xm/1/people?firstName=peter&lastName=parker')
+ `headers` will be a typical HTTP request headers object to send to xM API
+ `data` (optional) will be the stringified payload to send to xM API

Your HTTP client should know what to do with those and must return a `promise`.

### httpClient.successAdapter
This is a function that will receive the response
in the exact format your HTTP client usually returns it upon a successful request (2xx).

Think the very first `.then()` called when your HTTP client promise `resolves`.

This function must *only* return the xmApi `payload`/`response body`.

Here is an example of the adapter used for the axios HTTP client under the hood:
```js
const axiosSuccessAdapter = (res) => res.data;
```

### httpClient.failureAdapter
This is a function that will receive the error
in the exact format your HTTP client usually throws it upon a failed request (non 2xx).

Think the `.catch()` called when your HTTP client promise `rejects`.

This function must throw (rethrow, technically) an error object with both a `status` and a `payload` property attached to it.

Here is an example of the adapter used for the axios HTTP client under the hood:
```js
const axiosFailureAdapter = (e) => {
  const humanReadableMessage = e.response
    ? `xM API responded with ${e.response.status} ${e.response.statusText}`
    : 'Something went wrong and no response was received from xM API';
  const error = new Error(humanReadableMessage);
  error.status = e.response?.status;
  error.payload = e.response?.data;
  throw error;
};
```
The human readable message can be omitted and the object thrown doesn't even have to be an Error
instance, these are just nice things.
What is important is that this function `throws`,
and that the object thrown contains a `status` and a `payload` property.
Where:
+ `status` must be an *integer*: the http **status code** of the response
+ `payload` must be the xM API **response body** if one was returned

```sh
# If all of this seems like more trouble than having to manage 1 more dependency in your project,
# then you can simply run:
npm i axios
# and start using the SDK as is.

# We just thought it would be nice not to arbitrarily impose yet another dependency on your project.
```
