import B from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {FakePlugin as _FakePlugin, type DriverLike} from '../../lib/plugin';

const {expect} = chai;
chai.use(chaiAsPromised);

// Let's not use the actual FakePlugin because it runs a timer and we don't want to worry about
// needing to clean up timers so that unit test processes can exit!
class FakePlugin extends _FakePlugin {
  _clockRunning = false;
}

interface MockResponse {
  send: (body: string) => void;
}

class FakeExpress {
  routes: Record<string, (req: unknown, res: MockResponse) => void> = {};

  all(route: string, handler: (req: unknown, res: MockResponse) => void): void {
    this.routes[route] = handler;
  }

  async get(route: string): Promise<string> {
    return await new B<string>((resolve, reject) => {
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
    expect(FakePlugin).to.exist;
  });

  it('should update an express app with a fake route', async function () {
    const app = new FakeExpress();
    await expect(app.get('/fake')).to.be.rejected;
    await FakePlugin.updateServer(app as any, {} as any, {});
    await expect(app.get('/fake')).to.eventually.eql(
      JSON.stringify({fake: 'fakeResponse'})
    );
  });

  it('should wrap find element', async function () {
    const p = new FakePlugin('fake');
    await expect(
      p.findElement(() => Promise.resolve({el: 'fakeEl'}), {} as DriverLike, 'arg1', 'arg2')
    ).to.eventually.eql({
      el: 'fakeEl',
      fake: true,
    });
  });

  it('should handle page source', async function () {
    const p = new FakePlugin('fake');
    await expect(
      p.getPageSource(() => Promise.resolve(''), {} as DriverLike, 'arg1', 'arg2')
    ).to.eventually.eql('<Fake>["arg1","arg2"]</Fake>');
  });

  it('should handle getFakeSessionData', async function () {
    const p = new FakePlugin('fake');
    await expect(
      p.getFakeSessionData(() => Promise.resolve(null), {fakeSessionData: 'hi'} as DriverLike)
    ).to.eventually.eql('hi');
    await expect(p.getFakeSessionData(() => Promise.resolve(null), {} as DriverLike)).to
      .eventually.eql(null);
  });

  it('should handle setFakeSessionData', async function () {
    const p = new FakePlugin('fake');
    const driver = {} as DriverLike;
    await expect(
      p.setFakeSessionData(() => Promise.resolve(null), driver, 'foobar')
    ).to.eventually.eql(null);
    await expect(
      p.getFakeSessionData(() => Promise.resolve(null), driver)
    ).to.eventually.eql('foobar');
  });
});
