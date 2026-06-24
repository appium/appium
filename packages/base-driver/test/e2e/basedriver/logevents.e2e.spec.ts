import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {server, routeConfiguringFunction} from '../../../lib';
import axios from 'axios';
import {createSandbox} from 'sinon';
import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import {MockExecuteDriver} from '../protocol/mock-execute-driver';

chai.use(chaiAsPromised);

describe('Execute Command Test', function () {
  let sandbox: sinon.SinonSandbox;
  let driver: MockExecuteDriver;
  let httpServer: Awaited<ReturnType<typeof server>>;
  let port: number;
  let baseUrl: string;

  beforeEach(async function () {
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

    expect(res.status).to.eql(200);
    expect(res.data).to.have.property('value');
    expect(res.data.value).to.deep.equal({executed: script, args});

    const events = await driver.getLogEvents();
    const command = events.commands[0];

    expect(command).to.have.property('cmd', 'mobileActivateApp');
  });
});
