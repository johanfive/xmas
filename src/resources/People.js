const RequestBuilder = require('../RequestBuilder');

class People extends RequestBuilder {
  constructor(requestor) {
    super('People', requestor);
  }

  getDevicesOf(personId, queryParams) {
    return this.get({ pathParams: [personId, 'devices'], queryParams });
  }

  getGroupsOf(personId, queryParams) {
    return this.get({ pathParams: [personId, 'group-memberships'], queryParams });
  }

  searchByFirstName(firstName, queryParams = {}) {
    return this.get({ queryParams: { firstName, ...queryParams } });
  }

  searchByLastName(lastName, queryParams = {}) {
    return this.get({ queryParams: { lastName, ...queryParams } });
  }

  searchByTargetName(targetName, queryParams = {}) {
    return this.get({ queryParams: { targetName, ...queryParams } });
  }

  searchByWebLogin(webLogin, queryParams = {}) {
    return this.get({ queryParams: { webLogin, ...queryParams } });
  }

  searchByPhoneNumber(phoneNumber, queryParams = {}) {
    return this.get({ queryParams: { phoneNumber, ...queryParams } });
  }

  searchByEmail(emailAddress, queryParams = {}) {
    return this.get({ queryParams: { emailAddress, ...queryParams } });
  }
}

module.exports = People;
