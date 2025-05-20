import { Xmas } from '../mod.ts';
import config from './credentials.ts';

const xmas = new Xmas(config.basicAuth);

xmas.groups
  .find()
  .then((res) => {
    console.log(`Total Groups: ${res.total}`);
    console.log(`Groups Count: ${res.count}`);
    console.log('-------------------------');
    return res.data.forEach((group) => {
      console.log(`Group ID: ${group.id}`);
      console.log(`Group Name: ${group.targetName}`);
      console.log(`Group Description: ${group.description}`);
      console.log('-------------------------');
      console.log(`RAWDOG: ${JSON.stringify(group, null, 2)}`);
      console.log('-------------------------');
    });
  }
).catch((err) => {
  console.error('Error fetching groups:', err);
});
