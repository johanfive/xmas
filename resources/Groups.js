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
function Groups(requestor) {
  RequestBuilder.call(this, 'Groups', requestor);
}

Groups.prototype = new RequestBuilder();
Groups.prototype.constructor = RequestBuilder;

module.exports = Groups;
