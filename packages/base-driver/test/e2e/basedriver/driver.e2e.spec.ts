import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {BaseDriver, server, routeConfiguringFunction} from '../../../lib';
import {FakeDriver} from '../protocol/fake-driver';
import axios from 'axios';
import {TEST_HOST, getTestPort, driverE2ETestSuite} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

const DEFAULT_CAPS = {
  platformName: 'fake',
  'appium:automationNAme': 'fake',
};

// @ts-expect-error BaseDriver constructor opts differ from DriverClass expectation
driverE2ETestSuite(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
});

describe('BaseDriver', function () {
  let port: number;
  let baseUrl: string;

  before(async function () {
    port = await getTestPort();
    baseUrl = `http://${TEST_HOST}:${port}`;
  });

  describe('get appium capabilities', function () {
    let driver: FakeDriver;
    const sessionId = 'foo';
    let mjsonwpServer: Awaited<ReturnType<typeof server>>;

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
      driver.caps = capabilities as any;
      const {data} = await axios({
        url: `${baseUrl}/session/${sessionId}/appium/capabilities`,
        method: 'GET',
      });
      expect(data.value.capabilities).to.eql(DEFAULT_CAPS);
    });
  });
});
