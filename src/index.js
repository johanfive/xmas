const RequestBuilder = require('./RequestBuilder');
const Requestor = require('./Requestor');
const Groups = require('./resources/Groups');
const People = require('./resources/People');

class Xmas extends RequestBuilder {
  constructor(config) {
    // There is no getting smart with the requestor
    // the same reference must be used everywhere
    const requestor = new Requestor(config);
    super(null, requestor); // This allows a cop out such as xmas.get(anythingYouWant);
    this.people = new People(requestor);
    this.groups = new Groups(requestor);
    this.getOauthTokens = {
      byUsernamePassword: () => requestor.byUsernamePassword()
    };
  }
}

module.exports = Xmas;
