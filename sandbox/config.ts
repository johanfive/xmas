const {
  HOSTNAME,
  USERNAME,
  PASSWORD,
  CLIENT_ID,
  EXPIRED_ACCESS_TOKEN,
  REFRESH_TOKEN,
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
    accessToken: EXPIRED_ACCESS_TOKEN,
    refreshToken: REFRESH_TOKEN,
  },
};

export default { basicAuth, oauth };
