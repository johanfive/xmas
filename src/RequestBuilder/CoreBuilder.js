function CoreBuilder(endpoint, requestor) {
  this.endpoint = endpoint ? endpoint.toLowerCase() : '';
  this.requestor = requestor;
}

CoreBuilder.prototype.send = function send(params) {
  // allow overriding endpoint
  return this.requestor.execute({ endpoint: this.endpoint, ...params });
};

CoreBuilder.prototype.get = function(params) {
  return this.send({ ...params, method: 'GET' });
};

CoreBuilder.prototype.post = function(params) {
  return this.send({ ...params, method: 'POST' });
};

CoreBuilder.prototype.delete = function(id) {
  return this.send({ pathParams: [id], method: 'DELETE' });
};

/**
 * With great power comes responsability
 */
CoreBuilder.prototype.depaginatedGet = function(ogParams) {
  const that = this;
  const response = {
    count: 0,
    total: 0,
    data: []
  };
  function depaginate(params) {
    return that.get(params)
      .then(xmRes => {
        response.total = xmRes.total;
        response.count = xmRes.total;
        response.data.push(...xmRes.data);
        if (xmRes.data.links.next) {
          const { next } = xmRes.data.links;
          const resQueryString = next.split('?')[1];
          const resQueryParams = new URLSearchParams(resQueryString);
          const resOffset = resQueryParams.get('offset');
          const nextParams = {
            ...params,
            queryString: {
              ...params.queryString,
              limit: 1000,
              offset: resOffset
            }
          };
          return depaginate(nextParams);
        }
        return response;
      });
  }
  return depaginate(ogParams);
};

module.exports = CoreBuilder;
