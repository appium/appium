type ResFixtureBody = Record<string, unknown>;

function resFixture(url: string, method: string): [number, ResFixtureBody] {
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

export interface MockRequestOpts {
  url: string;
  method: string;
  json?: unknown;
}

export interface MockRequestResponse {
  status: number;
  headers: Record<string, string>;
  data: ResFixtureBody;
}

export async function request(opts: MockRequestOpts): Promise<MockRequestResponse> {
  const {url, method} = opts;
  if (/badurl$/.test(url)) {
    throw new Error('noworky');
  }

  const [status, data] = resFixture(url, method);
  return {
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
    data,
  };
}
