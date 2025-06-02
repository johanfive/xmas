import { XmApi } from '../src/index.ts';
import config from './credentials.ts';

// Create API client using basic auth
const xm = new XmApi({
  hostname: config.basicAuth.hostname,
  username: config.basicAuth.username,
  password: config.basicAuth.password,
});

xm.groups
  .getGroups({
    limit: 10,
    offset: 0,
  })
  .then((response) => {
    console.log(`Total Groups: ${response.total}`);
    console.log(`Groups Count: ${response.count}`);
    console.log('-------------------------');
    response.data.forEach((group) => {
      console.log(`Group ID: ${group.id}`);
      console.log(`Group Name: ${group.targetName}`);
      console.log(`Group Description: ${group.description}`);
      console.log('-------------------------');
      console.log('Raw Response:', JSON.stringify(group, null, 2));
      console.log('-------------------------');
    });
  })
  .catch((error) => {
    console.log('Error fetching groups:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Headers:', error.response.headers);
      console.log('Response Body:', error.response.body);
    }
  });
