function resFixture(url, method, json, opts) {
  if (/\/status$/.test(url)) {
    return [200, {value: {foo: 'bar'}}];
  }
  if (/\/element\/bad\/text$/.test(url)) {
    return [400, {value: {error: 'invalid element state'}}];
  }
  if (/\/element\/200\/text$/.test(url)) {
    return [400, {value: {error: 'invalid element state'}}];
  }
  if (/\/element\/200\/attribute\/value$/.test(url)) {
    return [200, {value: 'foobar'}];
  }
  if (/\/session$/.test(url) && method === 'POST') {
    if (opts.noSessionId) {
      return [200, {value: {browserName: 'boo'}}];
    }
    return [200, {value: {sessionId: '123', browserName: 'boo'}}];
  }
  if (/\/novalue$/.test(url)) {
    return [200, {foo: 'bar'}];
  }
  if (/\/nochrome$/.test(url)) {
    return [500, {value: {error: 'unknown error', message: 'chrome not reachable'}}];
  }
  throw new Error("Can't handle url " + url);
}

// eslint-disable-next-line require-await
async function request(opts, fixtureOpts) {
  const {url, method, json} = opts;
  if (/badurl$/.test(url)) {
    throw new Error('noworky');
  }

  const [status, data] = resFixture(url, method, json, fixtureOpts);
  return {
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
    data,
  };
}

export default request;
