import { server, routeConfiguringFunction } from '../../../lib';
import { FakeDriver } from '../protocol/fake-driver';
import axios from 'axios';
import {TEST_HOST, getTestPort} from '@appium/driver-test-support';

const DEFAULT_CAPS = {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
};


describe('BaseDriver', function () {
  let port;
  let baseUrl;

  before(async function () {
    const chai = await import('chai');
    const chaisAsPromised = await import('chai-as-promised');
    chai.use(chaisAsPromised.default);
    chai.should();

    port = await getTestPort();
    baseUrl = `http://${TEST_HOST}:${port}`;
  });

  describe('get appium capabilities', function () {
    let driver;
    let sessionId = 'foo';
    let mjsonwpServer;

    before(async function () {
      driver = new FakeDriver();
      driver.sessionId = sessionId;
      mjsonwpServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(driver),
        port,
      });
    });

    after(async function () {
      await mjsonwpServer.close();
    });

    it('should return capabilities', async function () {
      const capabilities = DEFAULT_CAPS;
      driver.caps = capabilities;
      const {data} = await axios({
        url: `${baseUrl}/session/${sessionId}/appium/capabilities`,
        method: 'GET',
      });
      data.should.eql({
        value: {
          capabilities: DEFAULT_CAPS
        },
        sessionId
      });
    });
  });
});
