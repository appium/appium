import type { Constraints, Driver, DriverCaps } from '@appium/types';
import axios from 'axios';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { after, before, describe, it } from 'node:test';
import { createServer } from '../../helpers';
import { FakeDriver } from '../protocol/fake-driver';

chai.use(chaiAsPromised);

describe('BaseDriver', function() {
  const DEFAULT_CAPS = {
    platformName: 'fake',
    'appium:automationNAme': 'fake',
  };

  describe('get appium capabilities', function() {
    let driver: FakeDriver;
    const sessionId = 'foo';
    let teardown: () => Promise<void> | undefined;
    let baseUrl: string;

    before(async function() {
      driver = new FakeDriver();
      driver.sessionId = sessionId;
      const {
        setup,
        teardown: teardownFn,
        baseUrl: baseUrlStr,
      } = await createServer(driver as unknown as Driver<Constraints>);
      baseUrl = baseUrlStr;
      teardown = teardownFn;
      await setup();
    });

    after(async function() {
      await teardown?.();
    });

    it('should return capabilities', async function() {
      const capabilities = DEFAULT_CAPS;
      driver.caps = capabilities as unknown as DriverCaps<Constraints>;
      const { data } = await axios({
        url: `${baseUrl}/session/${sessionId}/appium/capabilities`,
        method: 'GET',
      });
      expect(data.value.capabilities).to.eql(DEFAULT_CAPS);
    });
  });
});
