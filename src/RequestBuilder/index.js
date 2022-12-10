const CoreBuilder = require('./CoreBuilder');

/**
 * Generate an object giving access to a collection of methods reusable across all endpoints
 * eg: getById can be used both in xmas.people.getById and xmas.groups.getById
 * @param {String} endpoint The xM API endpoint the request builder should default to.
 * eg: 'people' will produce requests with url: https://eg.xmatters.com/api/xm/1/people
 * @param {Object} requestor A reference to a Requestor initialized with the config before anything
 * @returns {Object} a RequestBuilder with a collection of methods reusable across all endpoints
 */
class RequestBuilder extends CoreBuilder {
  constructor(endpoint, requestor) {
    super(endpoint, requestor);
  }
  getById(id, queryParams) {
    return this.get({ pathParams: [id], queryParams });
  }

  search(searchTerm, queryParams) {
    return this.get({ queryParams: { ...queryParams, search: searchTerm } });
  }

  create(resource) {
    return this.post({ data: resource });
  }

  update(id, resource) {
    return this.post({ data: { ...resource, id } });
  }

  // Common to both people and groups, so it belongs here
  getSupervisorsOf(id, queryParams) {
    return this.get({ pathParams: [id, 'supervisors'], queryParams });
  }
}

module.exports = RequestBuilder;
