import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {rejectForeignHosts} from '../../../lib/express/middleware';

function fakeRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

function runMiddleware(host: string | undefined, allowed: string[] = []): Promise<{nextCalled: boolean; res: any}> {
  return new Promise((resolve) => {
    const res = fakeRes();
    const mw = rejectForeignHosts(allowed);
    const req: any = {headers: host === undefined ? {} : {host}, url: '/status'};
    void mw(req, res, () => resolve({nextCalled: true, res}));
    setImmediate(() => resolve({nextCalled: false, res}));
  });
}

describe('rejectForeignHosts', function () {
  it('should allow IP-literal hosts', async function () {
    assert.strictEqual((await runMiddleware('127.0.0.1:4723')).nextCalled, true);
    assert.strictEqual((await runMiddleware('192.168.1.10:4723')).nextCalled, true);
    assert.strictEqual((await runMiddleware('[::1]:4723')).nextCalled, true);
  });

  it('should allow loopback names', async function () {
    assert.strictEqual((await runMiddleware('localhost:4723')).nextCalled, true);
    assert.strictEqual((await runMiddleware('foo.localhost:4723')).nextCalled, true);
  });

  it('should allow configured hostnames', async function () {
    assert.strictEqual((await runMiddleware('MyHost.local:4723', ['myhost.local'])).nextCalled, true);
  });

  it('should allow requests without a Host header', async function () {
    assert.strictEqual((await runMiddleware(undefined)).nextCalled, true);
  });

  it('should reject foreign hostnames (DNS rebinding)', async function () {
    const {nextCalled, res} = await runMiddleware('evil.example:4723');
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  it('should reject lookalike hostnames that merely contain an allowed name', async function () {
    const {nextCalled, res} = await runMiddleware('myhost.local.evil.example:4723', ['myhost.local']);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });
});
