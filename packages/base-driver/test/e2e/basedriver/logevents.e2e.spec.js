import {server, routeConfiguringFunction} from '../../../lib';
import axios from 'axios';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import {MockExecuteDriver} from '../protocol/mock-execute-driver';

let port, baseUrl;

describe('Execute Command Test', function () {
  let sandbox;
  let driver;
  let httpServer;

  beforeEach(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    sandbox = createSandbox();
    port = await getTestPort();
    baseUrl = `http://${TEST_HOST}:${port}`;
    driver = new MockExecuteDriver();
    driver.sessionId = 'foo';

    httpServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver),
      port,
    });
  });

  afterEach(async function () {
    sandbox.restore();
    await httpServer.close();
  });

  it('should rename extended command and log it in event history', async function () {
    const script = 'mobile: activateApp';
    const args = [{appId: 'io.appium.TestApp'}];

    const res = await axios.post(`${baseUrl}/session/foo/execute/sync`, {
      script,
      args,
    });

    res.status.should.eql(200);
    res.data.should.have.property('value');
    res.data.value.should.deep.equal({executed: script, args});

    const events = await driver.getLogEvents();
    const command = events.commands[0];

    command.should.have.property('cmd', 'activateApp');
  });
});
