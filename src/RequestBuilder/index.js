const CoreBuilder = require('./CoreBuilder');

/**
 * Generate an object giving access to a collection of methods reusable across all endpoints
 * eg: getById can be used both in xmas.people.getById and xmas.groups.getById
 * @param {String} endpoint The xM API endpoint the request builder should default to.
 * eg: 'people' will produce requests with url: https://eg.xmatters.com/api/xm/1/people
 * @param {Object} requestor A reference to a Requestor initialized with the config before anything
 * @returns {Object} a RequestBuilder with a collection of methods reusable across all endpoints
 */
function RequestBuilder(endpoint, requestor) {
  CoreBuilder.call(this, endpoint, requestor);
}

RequestBuilder.prototype = new CoreBuilder();
RequestBuilder.prototype.constructor = CoreBuilder;

RequestBuilder.prototype.getById = function(id, queryParams) {
  return this.get({ pathParams: [id], queryParams });
};

RequestBuilder.prototype.search = function(searchTerm, queryParams) {
  return this.get({ queryParams: { ...queryParams, search: searchTerm } });
};

RequestBuilder.prototype.create = function(resource) {
  return this.post({ data: resource });
};

RequestBuilder.prototype.update = function(id, resource) {
  return this.post({ data: { ...resource, id } });
};

// Common to both people and groups, so it belongs here
RequestBuilder.prototype.getSupervisorsOf = function(id, queryParams) {
  return this.get({ pathParams: [id, 'supervisors'], queryParams });
};

module.exports = RequestBuilder;
