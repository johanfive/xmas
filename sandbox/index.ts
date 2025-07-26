// import { XmApi } from './../src/index.ts';
// import config from './config.ts';
// import printError from './scenarios/printError.ts';

// const xm = new XmApi(config.basicAuth);
// // ------------------------------------
// console.log('Edit to test and prototype on the fly - do not commit');
// xm.groups.get({ query: { limit: 1 } })
//   .then((response) => {
//     console.log('Response:', response.status, response.body);
//   })
//   .catch((err) => {
//     printError('Error fetching groups', err);
//   });
// // ------------------------------------

// import testAuth from './scenarios/validateAuth.ts';
// import testServicesCreation from './scenarios/validateSaveMethod/servicesCreation.ts';
// import testServicesUpdate from './scenarios/validateSaveMethod/servicesUpdate.ts';

// async function main() {
//   await testAuth();
//   await testServicesCreation();
//   await testServicesUpdate();
// }

// main();
