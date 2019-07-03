function resFixture (url, method) {
  if (/\/status$/.test(url)) {
    return [200, {status: 0, value: {foo: 'bar'}}];
  }
  if (/\/element\/bad\/text$/.test(url)) {
    return [500, {status: 11, value: {message: 'Invisible element'}}];
  }
  if (/\/element\/200\/text$/.test(url)) {
    return [200, {status: 11, value: {message: 'Invisible element'}}];
  }
  if (/\/element\/200\/value$/.test(url)) {
    return [200, {status: 0, sessionId: 'innersessionid', value: 'foobar'}];
  }
  if (/\/session$/.test(url) && method === 'POST') {
    return [200, {status: 0, sessionId: '123', value: {browserName: 'boo'}}];
  }
  if (/\/nochrome$/.test(url)) {
    return [100, {status: 0, value: {message: 'chrome not reachable'}}];
  }
  throw new Error("Can't handle url " + url);
}

async function request (opts) { // eslint-disable-line require-await
  if (/badurl$/.test(opts.url)) {
    throw new Error('noworky');
  }

  let [statusCode, body] = resFixture(opts.url, opts.method, opts.json);
  let response = {
    statusCode,
    headers: {'content-type': 'application/json; charset=utf-8'},
    body
  };
  return response;
}

export default request;
