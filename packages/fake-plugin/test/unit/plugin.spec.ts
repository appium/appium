import assert from 'node:assert';
import {describe, it} from 'node:test';

import {type DriverLike, FakePlugin as _FakePlugin} from '../../lib/plugin';

interface MockResponse {
  send: (body: string) => void;
}

// Let's not use the actual FakePlugin because it runs a timer and we don't want to worry about
// needing to clean up timers so that unit test processes can exit!
class FakePlugin extends _FakePlugin {
  _clockRunning = false;
}

class FakeExpress {
  routes: Record<string, (req: unknown, res: MockResponse) => void> = {};

  all(route: string, handler: (req: unknown, res: MockResponse) => void): void {
    this.routes[route] = handler;
  }

  async get(route: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      try {
        const res = {
          send: resolve,
        };
        this.routes[route]({}, res);
      } catch (e) {
        reject(e);
      }
    });
  }
}

describe('fake plugin', function () {
  it('should exist', function () {
    assert.ok(FakePlugin);
  });

  it('should update an express app with a fake route', async function () {
    const app = new FakeExpress();
    assert.rejects(() => app.get('/fake'));
    await FakePlugin.updateServer(app as any, {} as any, {});
    assert.strictEqual(await app.get('/fake'), JSON.stringify({fake: 'fakeResponse'}));
  });

  it('should wrap find element', async function () {
    const p = new FakePlugin('fake');
    assert.deepStrictEqual(
      await p.findElement(() => Promise.resolve({el: 'fakeEl'}), {} as DriverLike, 'arg1', 'arg2'),
      {
        el: 'fakeEl',
        fake: true,
      },
    );
  });

  it('should handle page source', async function () {
    const p = new FakePlugin('fake');
    assert.strictEqual(
      await p.getPageSource(() => Promise.resolve(''), {} as DriverLike, 'arg1', 'arg2'),
      '<Fake>["arg1","arg2"]</Fake>',
    );
  });

  it('should handle getFakeSessionData', async function () {
    const p = new FakePlugin('fake');
    assert.strictEqual(
      await p.getFakeSessionData(() => Promise.resolve(null), {fakeSessionData: 'hi'} as DriverLike),
      'hi',
    );
    assert.strictEqual(await p.getFakeSessionData(() => Promise.resolve(null), {} as DriverLike), null);
  });

  it('should handle setFakeSessionData', async function () {
    const p = new FakePlugin('fake');
    const driver = {} as DriverLike;
    assert.strictEqual(await p.setFakeSessionData(() => Promise.resolve(null), driver, 'foobar'), null);
    assert.strictEqual(await p.getFakeSessionData(() => Promise.resolve(null), driver), 'foobar');
  });
});
