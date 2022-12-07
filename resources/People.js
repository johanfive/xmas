const RequestBuilder = require('../RequestBuilder');

function People(requestor) {
  RequestBuilder.call(this, 'People', requestor);
}

People.prototype = new RequestBuilder();
People.prototype.constructor = RequestBuilder;

People.prototype.getDevicesOf = function(personId, queryParams) {
  return this.get({ pathParams: [personId, 'devices'], queryParams });
};

People.prototype.getGroupsOf = function(personId, queryParams) {
  return this.get({ pathParams: [personId, 'group-memberships'], queryParams });
};

People.prototype.searchByFirstName = function(firstName, queryParams) {
  return this.search(firstName, queryParams);
};

People.prototype.searchByLastName = function(lastName, queryParams) {
  return this.search(lastName, queryParams);
};

People.prototype.searchByTargetName = function(targetName, queryParams) {
  return this.search(targetName, queryParams);
};

People.prototype.searchByWebLogin = function(webLogin, queryParams) {
  return this.search(webLogin, queryParams);
};

People.prototype.searchByPhoneNumber = function(phoneNumber, queryParams) {
  return this.search(phoneNumber, queryParams);
};

People.prototype.searchByEmail = function(emailAddress, queryParams) {
  return this.search(emailAddress, queryParams);
};

module.exports = People;
