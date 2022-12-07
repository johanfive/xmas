const Xmas = require('..');
const config = require('./config.json');

const configUsernamePasswordOnly = {
  hostname: config.hostname,
  username: config.username,
  password: config.password,
  noisy: true
};

// const configAuthorizationCodedOnly = {
//   hostname: config.hostname,
//   authorizationCode: config.authorizationCode,
// };

// const configTokensOnlyWithoutClientId = {
//   hostname: config.hostname,
//   accessToken: config.accessToken,
//   refreshToken: config.refreshToken,
//   onTokensChange: console.log
// };

// const configTokensOnlyWithClientId = {
//   ...configTokensOnlyWithoutClientId,
//   clientId: config.clientId,
// };

const buildHttpClient = (resolve) => ({
  sendRequest: () => {
    return resolve
      ? Promise.resolve({ data: { id: 'uuid' } })
      : Promise.reject({ statusCode: 555, data: { bim: 'badaboom' }});
  },
  successAdapter: (res) => res.data,
  failureAdapter: (e) => { throw { status: e.statusCode, payload: e.data }},
});

const xmas = new Xmas({
  ...configUsernamePasswordOnly,
  httpClient: buildHttpClient(true),
});

// xmas.getOauthTokens.byUsernamePassword()
//   .then(() => xmas.people.get())
//   .catch(console.log);

// const aNuGroup = { targetName: 'someNewGroup' };
// xmas.people.get()
//   .then(() => xmas.groups.create(aNuGroup))
//   .then((newGroup) => xmas.groups.delete(newGroup.id))
//   .then(() => xmas.groups.get({ headers: { total: 'override' }, queryParams: { firstName: 'Bob' } }))
//   .then(() => xmas.people.getDevicesOf('persId', { firstName: 'Bob' }))
//   .then(() => xmas.get({ endpoint: 'copOut' }))
//   .catch(console.log);

xmas.people.get()
  .catch(console.log);
