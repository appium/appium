import {WDProxy, server, routeConfiguringFunction} from '../../../lib';
import {FakeDriver} from '../protocol/fake-driver';

describe('proxy', function () {
  const wdproxy = new WDProxy();
  let baseServer;
  before(async function () {
    baseServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(new FakeDriver()),
      port: 4444,
    });
  });
  after(async function () {
    await baseServer.close();
  });

  it('should proxy status straight', async function () {
    let {status, data} = await wdproxy.proxy('/status', 'GET');
    status.should.equal(200);
    data.value.should.equal(`I'm fine`);
  });
  it('should proxy status as command', async function () {
    const res = await wdproxy.command('/status', 'GET');
    res.should.eql(`I'm fine`);
  });
  describe('new session', function () {
    afterEach(async function () {
      await wdproxy.command('', 'DELETE');
    });
    it('should start a new session', async function () {
      const caps = {browserName: 'fake'};
      const res = await wdproxy.command('/session', 'POST', {
        capabilities: {alwaysMatch: caps},
      });
      res.capabilities.alwaysMatch.should.have.property('browserName');
      wdproxy.sessionId.should.have.length(48);
    });
  });
  describe('delete session', function () {
    beforeEach(async function () {
      await wdproxy.command('/session', 'POST', {capabilities: {alwaysMatch: {}}});
    });
    it('should quit a session', async function () {
      const res = await wdproxy.command('', 'DELETE');
      should.not.exist(res);
    });
  });
});
