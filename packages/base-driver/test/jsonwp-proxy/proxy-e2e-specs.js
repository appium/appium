import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { JWProxy, server, routeConfiguringFunction } from '../..';
import { FakeDriver } from '../protocol/fake-driver';

const should = chai.should();
chai.use(chaiAsPromised);

describe('proxy', function () {
  const jwproxy = new JWProxy();
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
    let [res, resBody] = await jwproxy.proxy('/status', 'GET');
    res.statusCode.should.equal(200);
    resBody.status.should.equal(0);
    resBody.value.should.equal(`I'm fine`);
  });
  it('should proxy status as command', async function () {
    const res = await jwproxy.command('/status', 'GET');
    res.should.eql(`I'm fine`);
  });
  describe('new session', function () {
    afterEach(async function () {
      await jwproxy.command('', 'DELETE');
    });
    it('should start a new session', async function () {
      const caps = {browserName: 'fake'};
      const res = await jwproxy.command('/session', 'POST', {capabilities: {alwaysMatch: caps}});
      res.capabilities.alwaysMatch.should.have.property('browserName');
      jwproxy.sessionId.should.have.length(48);
    });
  });
  describe('delete session', function () {
    beforeEach(async function () {
      await jwproxy.command('/session', 'POST', {desiredCapabilities: {}});
    });
    it('should quit a session', async function () {
      const res = await jwproxy.command('', 'DELETE');
      should.not.exist(res);
    });
  });
});
