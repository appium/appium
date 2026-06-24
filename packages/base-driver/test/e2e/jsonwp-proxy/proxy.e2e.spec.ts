import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {JWProxy, server, routeConfiguringFunction} from '../../../lib';
import {FakeDriver} from '../protocol/fake-driver';

chai.use(chaiAsPromised);

describe('proxy', function () {
  const jwproxy = new JWProxy();
  let baseServer: Awaited<ReturnType<typeof server>>;

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
    const [res, resBody] = await jwproxy.proxy('/status', 'GET');
    expect(res.statusCode).to.equal(200);
    expect(resBody.value).to.equal(`I'm fine`);
  });
  it('should proxy status as command', async function () {
    const res = await jwproxy.command('/status', 'GET');
    expect(res).to.eql(`I'm fine`);
  });
  describe('new session', function () {
    afterEach(async function () {
      await jwproxy.command('', 'DELETE');
    });
    it('should start a new session', async function () {
      const caps = {browserName: 'fake'};
      const res = await jwproxy.command('/session', 'POST', {
        capabilities: {alwaysMatch: caps},
      });
      expect(res.capabilities.alwaysMatch).to.have.property('browserName');
      expect(jwproxy.sessionId).to.have.length(48);
    });
  });
  describe('delete session', function () {
    beforeEach(async function () {
      await jwproxy.command('/session', 'POST', {desiredCapabilities: {}});
    });
    it('should quit a session', async function () {
      const res = await jwproxy.command('', 'DELETE');
      expect(res).to.not.exist;
    });
  });
});
