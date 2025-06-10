const {
  HOSTNAME,
  USERNAME,
  PASSWORD,
  CLIENT_ID,
} = Deno.env.toObject();

// Various configuration options to initiate the SDK with

const basicAuth = {
  hostname: HOSTNAME,
  username: USERNAME,
  password: PASSWORD,
};

const oauth = {
  // Acquire OAuth tokens using basic authentication
  // then auto-switch to OAuth for subsequent requests
  byUsernamePassword: {
    ...basicAuth,
    clientId: CLIENT_ID, // Add clientId for OAuth token acquisition
  },
  byRefreshToken: {
    hostname: HOSTNAME,
    clientId: CLIENT_ID,
    accessToken: 'TODO',
    refreshToken: 'TODO',
  },
};

export default { basicAuth, oauth };
