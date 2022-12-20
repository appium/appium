import {BaseDriver} from '../../../lib';
import {driverE2ETestSuite} from '@appium/driver-test-support';

const DEFAULT_CAPS = {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
};

driverE2ETestSuite(BaseDriver, DEFAULT_CAPS);

/**
 * @typedef {import('@appium/driver-test-support').SessionHelpers} SessionHelpers
 */
