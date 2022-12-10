const RequestBuilder = require('../RequestBuilder');

// technically this whole file is useless
// because there are no methods unique to groups
// xmas could build its this.groups with: new RequestBuilder('groups', requestor)
// Having this here is an attempt at futureproofing
// It's better to have other contributors copy-paste a tried-and-true pattern

/**
 * Generate an object giving access to a collection of methods strictly specific to group resources
 * @param {Object} requestor A reference to a Requestor initialized with the config before anything
 */
class Groups extends RequestBuilder {
  constructor(requestor) {
    super('Groups', requestor);
  }
}

module.exports = Groups;
