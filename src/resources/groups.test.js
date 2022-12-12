jest.mock('axios');
jest.mock('../../package.json', () => ({ version: '8.8.8' }));
const { default: axios } = require('axios');
const Xmas = require('..');

const config = {
  hostname: 'https://test.xmatters.com',
  userAgent: { name: 'Unit tests', version: '5.5.5' },
  username: 'unit',
  password: 'test',
  noisy: false // default, but it's handy to have it togglable right here when drafting tests
};

const xmas = new Xmas(config);

const buildExpectedRequest = ({ headers, method, url, data }) => ({
  headers: headers || {
    'Content-Type': 'application/json; charset=utf-8',
    Authorization: 'Basic dW5pdDp0ZXN0',
    'User-Agent': 'Unit tests (5.5.5) | xmApiSdkJs (8.8.8)'
  },
  method,
  url,
  data
});

const xmApiRes = { no: 'nock', jest: 'ftw' };
const queryParams = { anything: 'goes' };
const nuGroup = { targetName: ' let them shoot themselves in the feet ' };

beforeEach(() => {
  axios.mockClear();
  axios.mockImplementation(() => Promise.resolve({ data: xmApiRes }));
});

describe('Xmas', () => {
  describe('groups', () => {
    test('get', () => xmas.groups.get({ queryParams })
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups?anything=goes'
        }));
      })
    );
    test('getById', () => xmas.groups.getById('groupId', queryParams)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/groupId?anything=goes'
        }));
      })
    );
    test('search', () => xmas.groups.search('term', queryParams)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups?anything=goes&search=term'
        }));
      })
    );
    test('getSupervisorsOf', () => xmas.groups.getSupervisorsOf('groupId', queryParams)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups/groupId/supervisors?anything=goes'
        }));
      })
    );
    test('post', () => xmas.groups.post({ data: nuGroup })
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          data: JSON.stringify(nuGroup)
        }));
      })
    );
    test('create', () => xmas.groups.create(nuGroup)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          data: JSON.stringify(nuGroup)
        }));
      })
    );
    test('update', () => xmas.groups.update('someId', { more: 'things' })
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'POST',
          url: 'https://test.xmatters.com/api/xm/1/groups',
          data: JSON.stringify({ more: 'things', id: 'someId' })
        }));
      })
    );
    test('delete', () => xmas.groups.delete(nuGroup.targetName)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          method: 'DELETE',
          url: 'https://test.xmatters.com/api/xm/1/groups/ let them shoot themselves in the feet '
        }));
      })
    );
    describe('On errors', () => {
      test('when xmApi responded, the sdk returns the api response', () => {
        const axiosTypicalErrorResponse = {
          response: { status: 404, data: xmApiRes }
        };
        axios.mockImplementation(() => Promise.reject(axiosTypicalErrorResponse));
        return xmas.groups.getById('groupId', queryParams)
          .catch(e => {
            expect(e).toBe(xmApiRes);
            expect(axios).toHaveBeenCalledTimes(3);
            expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
              method: 'GET',
              url: 'https://test.xmatters.com/api/xm/1/groups/groupId?anything=goes'
            }));
          });
      });
      test('when xmApi did not respond, the sdk returns the error', () => {
        axios.mockImplementation(() => Promise.reject('anything'));
        return xmas.groups.getById('groupId', queryParams)
          .catch(e => {
            expect(e).toStrictEqual(new Error('Something went wrong and no response was received from xM API'));
            expect(axios).toHaveBeenCalledTimes(3);
            expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
              method: 'GET',
              url: 'https://test.xmatters.com/api/xm/1/groups/groupId?anything=goes'
            }));
          });
      });
    });
  });
  test('send', () => {
    const params = {
      endpoint: 'override',
      method: 'everything',
      pathParams: ['however'],
      queryParams: { we: 'like'},
      hostname: 'andImean',
      apiPath: 'really/anything',
      accessToken: 'weWant'
    };
    return xmas.send(params)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: 'Bearer weWant',
            'User-Agent': 'Unit tests (5.5.5) | xmApiSdkJs (8.8.8)'
          },
          method: params.method,
          url: 'https://andImean/really/anything/override/however?we=like'
        }));
      });
  });
  test('Auto add userAgent when consumer overrides them with an object', () => {
    const params = {
      headers: { custom: 'heddaz' }
    };
    return xmas.groups.get(params)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(buildExpectedRequest({
          headers: {
            'User-Agent': 'Unit tests (5.5.5) | xmApiSdkJs (8.8.8)',
            ...params.headers
          },
          method: 'GET',
          url: 'https://test.xmatters.com/api/xm/1/groups'
        }));
      });
  });
  test('Allow requests with NO headers', () => {
    const params = {
      headers: null
    };
    const expectedReq = buildExpectedRequest({
      method: 'GET',
      url: 'https://test.xmatters.com/api/xm/1/groups'
    });
    delete expectedReq.headers;
    return xmas.groups.get(params)
      .then((res) => {
        expect(res).toBe(xmApiRes);
        expect(axios).toHaveBeenCalledWith(expectedReq);
      });
  });
});
