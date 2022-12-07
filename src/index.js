const RequestBuilder = require('./RequestBuilder');
const Requestor = require('./Requestor');
const Groups = require('./resources/Groups');
const People = require('./resources/People');

function Xmas(config) {
  // There is no getting smart with the requestor
  // the same reference must be used everywhere
  const requestor = new Requestor(config);
  this.people = new People(requestor);
  this.groups = new Groups(requestor);
  this.getOauthTokens = {
    byUsernamePassword: () => requestor.byUsernamePassword()
  };
  // This allows a cop out such as xmas.get(anythingYouWant);
  RequestBuilder.call(this, null, requestor);
}

Xmas.prototype = new RequestBuilder();
Xmas.prototype.constructor = RequestBuilder;

module.exports = Xmas;
