import { XmApi } from '../src/index.ts';
import config from './config.ts';

const xm = new XmApi(config.basicAuth);

xm.groups
  .get({
    limit: 10,
    offset: 0,
  })
  .then((response) => {
    const { body, status, headers } = response;
    console.log('Response Status:', status);
    console.log('Response Headers:', headers);
    console.log(`Total Groups: ${body.total}`);
    console.log(`Groups Count: ${body.count}`);
    console.log('-------------------------');
    body.data.forEach((group) => {
      console.log('Group ID: ', group.id);
      console.log('Group Name: ', group.targetName);
      group.description && console.log('Group Description: ', group.description);
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
    console.log('\n\n🚨 Troubleshooting checklist:');
    console.log('1. Is the .env file configured correctly?');
    console.log('2. Are the credentials correct?');
    console.log('3. Is the API version compatible?');
  });
