class CoreBuilder {
  constructor(endpoint, requestor) {
    this.endpoint = endpoint ? endpoint.toLowerCase() : '';
    this.requestor = requestor;
  }

  send(params) {
    // allow overriding endpoint
    return this.requestor.execute({ endpoint: this.endpoint, ...params });
  }

  get(params) {
    return this.send({ ...params, method: 'GET' });
  }

  post(params) {
    return this.send({ ...params, method: 'POST' });
  }

  delete(id) {
    return this.send({ pathParams: [id], method: 'DELETE' });
  }

  /**
   * With great power comes responsability
   */
  depaginate(ogParams) {
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
  }
}

module.exports = CoreBuilder;
