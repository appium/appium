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

type ResFixtureBody = Record<string, unknown>;

export async function request(opts: MockRequestOpts): Promise<MockRequestResponse> {
  const {url, method} = opts;
  if (url.endsWith('badurl')) {
    throw new Error('noworky');
  }

  const [status, data] = resFixture(url, method);
  return {
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
    data,
  };
}

function resFixture(url: string, method: string): [number, ResFixtureBody] {
  if (url.endsWith('/status')) {
    return [200, {value: {foo: 'bar'}}];
  }
  if (url.endsWith('/element/bad/text')) {
    return [500, {value: {error: 'element not visible', message: 'Invisible element'}}];
  }
  if (url.endsWith('/element/200/value')) {
    return [200, {status: 0, sessionId: 'innersessionid', value: 'foobar'}];
  }
  if (url.endsWith('/session') && method === 'POST') {
    return [200, {value: {sessionId: '123', capabilities: {browserName: 'boo'}}}];
  }
  if (url.endsWith('/nochrome')) {
    return [100, {value: {message: 'chrome not reachable'}}];
  }
  throw new Error("Can't handle url " + url);
}
